import asyncio
import logging
import uuid
from pathlib import Path

from sqlalchemy import delete, select

from app.database import AsyncSessionLocal
from app.models import Document, DocumentChunk
from app.services.rag_service import (
    embed_texts,
    parse_document,
    split_text,
)

logger = logging.getLogger(__name__)


def _cleanup_file(file_url: str | None) -> None:
    if file_url:
        path = Path(file_url)
        if path.exists():
            path.unlink()


async def process_document(document_id: uuid.UUID) -> None:
    async with AsyncSessionLocal() as db:
        document = await db.scalar(select(Document).where(Document.id == document_id))
        if not document:
            return

        try:
            document.upload_status = "PROCESSING"
            await db.commit()

            text = await asyncio.to_thread(
                parse_document, document.file_url or ""
            )
            chunks = await asyncio.to_thread(split_text, text)
            embeddings = await asyncio.to_thread(embed_texts, chunks) if chunks else []

            await db.execute(
                delete(DocumentChunk).where(DocumentChunk.document_id == document.id)
            )
            for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                db.add(
                    DocumentChunk(
                        document_id=document.id,
                        content=chunk,
                        embedding=embedding,
                        chunk_index=idx,
                    )
                )

            document.upload_status = "COMPLETED"
            await db.commit()
            _cleanup_file(document.file_url)
        except Exception:
            logger.exception("Document processing failed for %s", document_id)
            document.upload_status = "FAILED"
            await db.commit()
            _cleanup_file(document.file_url)
