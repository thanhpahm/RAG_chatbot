from __future__ import annotations

import re
from pathlib import Path
from typing import Sequence

import httpx
from markitdown import MarkItDown
from google import genai
from google.genai.types import GenerateContentConfig
from langchain_core.embeddings import Embeddings
from langchain_experimental.text_splitter import SemanticChunker
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import DocumentChunk


settings = get_settings()

_text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=settings.chunk_size,
    chunk_overlap=settings.chunk_overlap,
)
_genai_client = genai.Client(api_key=settings.gemini_api_key)


_md_converter = MarkItDown()
_sentence_boundary_pattern = re.compile(r"(?<=[.!?])\s+")


def parse_document(file_path: str) -> str:
    path = Path(file_path)
    if path.suffix.lower() == ".txt":
        return path.read_text(encoding="utf-8", errors="ignore")

    return _md_converter.convert(str(path)).text_content


def _normalize_text(text: str) -> str:
    return text.replace("\r\n", "\n").replace("\r", "\n").strip()


def _apply_overlap(chunks: list[str], overlap_chars: int) -> list[str]:
    if overlap_chars <= 0 or len(chunks) < 2:
        return chunks

    overlapped: list[str] = [chunks[0]]
    for idx in range(1, len(chunks)):
        prefix = chunks[idx - 1][-overlap_chars:].strip()
        current = chunks[idx]
        if prefix and not current.startswith(prefix):
            overlapped.append(f"{prefix}\n{current}".strip())
        else:
            overlapped.append(current)
    return overlapped


def _enforce_chunk_size(chunks: Sequence[str]) -> list[str]:
    resized: list[str] = []
    for chunk in chunks:
        if len(chunk) <= settings.chunk_size:
            resized.append(chunk)
            continue
        resized.extend(_text_splitter.split_text(chunk))
    return [chunk.strip() for chunk in resized if chunk.strip()]


def _merge_tiny_chunks(chunks: Sequence[str], min_sentences: int) -> list[str]:
    if min_sentences <= 1:
        return [chunk.strip() for chunk in chunks if chunk.strip()]

    merged: list[str] = []
    for chunk in chunks:
        cleaned = chunk.strip()
        if not cleaned:
            continue

        sentence_count = len([s for s in _sentence_boundary_pattern.split(cleaned) if s.strip()])
        if merged and sentence_count < min_sentences:
            candidate = f"{merged[-1]} {cleaned}".strip()
            if len(candidate) <= settings.chunk_size:
                merged[-1] = candidate
            else:
                merged.append(cleaned)
        else:
            merged.append(cleaned)

    return merged


class GeminiLangChainEmbeddings(Embeddings):
    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return embed_texts(texts)

    def embed_query(self, text: str) -> list[float]:
        return embed_query(text)


def split_text(text: str) -> list[str]:
    normalized = _normalize_text(text)
    if not normalized:
        return []

    if not settings.semantic_chunking_enabled:
        chunks = _text_splitter.split_text(normalized)
        return [chunk.strip() for chunk in chunks if chunk.strip()]

    threshold = min(max(settings.semantic_similarity_threshold, 0.0), 1.0)
    percentile = min(max(int((1.0 - threshold) * 100), 1), 99)
    min_sentences = max(1, settings.semantic_min_sentences_per_chunk)

    try:
        semantic_splitter = SemanticChunker(
            embeddings=GeminiLangChainEmbeddings(),
            sentence_split_regex=r"(?<=[.!?])\s+",
            breakpoint_threshold_type="percentile",
            breakpoint_threshold_amount=percentile,
        )
        chunks = semantic_splitter.split_text(normalized)
    except Exception:
        chunks = _text_splitter.split_text(normalized)

    chunks = _merge_tiny_chunks(chunks, min_sentences)
    chunks = _enforce_chunk_size(chunks)
    return _apply_overlap(chunks, settings.chunk_overlap)


_EMBED_BATCH_LIMIT = 100
_OLLAMA_TIMEOUT = httpx.Timeout(120.0, connect=10.0)
_OLLAMA_MAX_RETRIES = 3

# Will be set to "batch" or "single" after first successful call.
_ollama_embed_mode: str | None = None


def _ollama_request_with_retry(
    url: str, payload: dict,
) -> httpx.Response:
    """POST to Ollama with retry + exponential backoff."""
    import logging
    import time

    logger = logging.getLogger(__name__)
    last_exc: Exception | None = None

    for attempt in range(1, _OLLAMA_MAX_RETRIES + 1):
        try:
            response = httpx.post(url, json=payload, timeout=_OLLAMA_TIMEOUT)
            response.raise_for_status()
            return response
        except (httpx.ConnectError, httpx.ReadTimeout) as exc:
            last_exc = exc
            wait = 2 ** attempt
            logger.warning(
                "Ollama request attempt %d/%d failed (%s), retrying in %ds…",
                attempt, _OLLAMA_MAX_RETRIES, exc, wait,
            )
            time.sleep(wait)

    raise RuntimeError(
        f"Ollama request failed after {_OLLAMA_MAX_RETRIES} attempts"
    ) from last_exc


def _ollama_embed_batch(texts: list[str]) -> list[list[float]]:
    """Try /api/embed (batch), fall back to /api/embeddings (one-by-one)."""
    global _ollama_embed_mode

    base = settings.ollama_base_url
    model = settings.ollama_embed_model

    # ── Try batch endpoint first (/api/embed) ──
    if _ollama_embed_mode != "single":
        try:
            resp = httpx.post(
                f"{base}/api/embed",
                json={"model": model, "input": texts},
                timeout=_OLLAMA_TIMEOUT,
            )
            resp.raise_for_status()
            _ollama_embed_mode = "batch"
            return resp.json()["embeddings"]
        except httpx.HTTPStatusError as exc:
            if exc.response.status_code == 404:
                _ollama_embed_mode = "single"
            else:
                raise

    # ── Fallback: /api/embeddings (one text at a time) ──
    results: list[list[float]] = []
    for text in texts:
        resp = _ollama_request_with_retry(
            f"{base}/api/embeddings",
            {"model": model, "prompt": text},
        )
        results.append(resp.json()["embedding"])
    return results


def embed_texts(texts: Sequence[str]) -> list[list[float]]:
    all_embeddings: list[list[float]] = []
    texts_list = list(texts)
    for i in range(0, len(texts_list), _EMBED_BATCH_LIMIT):
        batch = texts_list[i : i + _EMBED_BATCH_LIMIT]
        all_embeddings.extend(_ollama_embed_batch(batch))
    return all_embeddings


def embed_query(query: str) -> list[float]:
    return _ollama_embed_batch([query])[0]


async def find_similar_chunks(
    db: AsyncSession,
    query_embedding: list[float],
    top_k: int,
) -> list[tuple[DocumentChunk, float]]:
    query_dims = len(query_embedding)
    distance_expr = DocumentChunk.embedding.cosine_distance(query_embedding)
    stmt = (
        select(DocumentChunk, distance_expr.label("distance"))
        .where(DocumentChunk.embedding.is_not(None))
        .where(func.vector_dims(DocumentChunk.embedding) == query_dims)
        .order_by(distance_expr.asc())
        .limit(top_k)
    )
    rows = (await db.execute(stmt)).all()
    return [
        (chunk, 1.0 - float(distance if distance is not None else 1.0))
        for chunk, distance in rows
    ]


def build_context_prompt(question: str, chunk_texts: Sequence[str]) -> str:
    context = "\n\n".join(f"[Chunk {idx + 1}]\n{text}" for idx, text in enumerate(chunk_texts))
    return (
        "You are a helpful AI assistant. Answer strictly using the provided context. "
        "If the user question is just some simple question like 'What is the capital of France?' you can answer it directly without using the context. add 'no context' to the end of the answer "
        "If the context's content is not related to the user question, you should not use the context to answer also include the flag 'no context' in the end of the answer."
        "If the context is not enough, explicitly say you don't have enough information.\n\n"
        f"Context:\n{context}\n\n"
        f"User Question:\n{question}\n\n"
        "Answer:"
    )


async def stream_chat_answer(prompt: str):
    async for chunk in await _genai_client.aio.models.generate_content_stream(
        model=settings.gemini_chat_model,
        contents=prompt,
        config=GenerateContentConfig(temperature=0),
    ):
        token = chunk.text or ""
        if token:
            yield token


def generate_conversation_title(first_user_message: str) -> str:
    prompt = (
        "Generate a concise conversation title for the user's first message. "
        "Return only the title text, no quotes, no punctuation at the end, max 8 words.\n\n"
        f"User message:\n{first_user_message}"
    )
    response = _genai_client.models.generate_content(
        model=settings.gemini_title_model,
        contents=prompt,
        config=GenerateContentConfig(temperature=0),
    )
    title = (response.text or "").strip().strip('"\'').strip()
    title = " ".join(title.split())

    if not title:
        return "New conversation"

    words = title.split()
    if len(words) > 8:
        title = " ".join(words[:8])

    return title[:255]
