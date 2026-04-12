import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Conversation, Message, MessageCitation, User
from app.schemas.message import MessageCreate
from app.services.rag_service import (
    build_context_prompt,
    embed_query,
    find_similar_chunks,
    generate_conversation_title,
    stream_chat_answer,
)

settings = get_settings()

_DEFAULT_CONVERSATION_TITLES = {
    "new conversation",
    "hội thoại mới",
    "hoi thoai moi",
}


def _is_default_title(title: str | None) -> bool:
    if title is None:
        return True
    normalized = " ".join(title.strip().lower().split())
    return not normalized or normalized in _DEFAULT_CONVERSATION_TITLES


def _fallback_title_from_message(content: str) -> str:
    cleaned = " ".join(content.strip().split())
    if not cleaned:
        return "New conversation"
    words = cleaned.split()
    title = " ".join(words[:8])
    return title[:255]

async def create_conversation(db: AsyncSession, user_id: uuid.UUID, title: str | None) -> dict:
    conv = Conversation(user_id=user_id, title=title or "New conversation")
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return {
        "id": conv.id,
        "user_id": conv.user_id,
        "title": conv.title,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
        "message_count": 0,
    }


async def delete_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    current_user: User,
) -> None:
    conv = await db.scalar(select(Conversation).where(Conversation.id == conversation_id))
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if current_user.role != "admin" and conv.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    await db.delete(conv)
    await db.commit()


async def list_conversations(db: AsyncSession, current_user: User, include_all: bool = False) -> list[dict]:
    stmt = (
        select(Conversation, func.count(Message.id).label("message_count"))
        .outerjoin(Message, Message.conversation_id == Conversation.id)
        .group_by(Conversation.id)
        .order_by(Conversation.created_at.desc())
    )
    if include_all and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    if not include_all:
        stmt = stmt.where(Conversation.user_id == current_user.id)
    rows = (await db.execute(stmt)).all()
    return [
        {
            "id": conv.id,
            "user_id": conv.user_id,
            "title": conv.title,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "message_count": count,
        }
        for conv, count in rows
    ]


async def list_messages(db: AsyncSession, conversation_id: uuid.UUID, current_user: User) -> list[Message]:
    conv = await db.scalar(select(Conversation).where(Conversation.id == conversation_id))
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if current_user.role != "admin" and conv.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    result = await db.execute(
        select(Message).where(Message.conversation_id == conversation_id).order_by(Message.created_at.asc())
    )
    return result.scalars().all()


async def stream_rag_answer(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    current_user: User,
):
    conv = await db.scalar(select(Conversation).where(Conversation.id == conversation_id))
    if not conv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if current_user.role != "admin" and conv.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    has_default_title = _is_default_title(conv.title)

    user_message = Message(
        conversation_id=conversation_id,
        sender_type="USER",
        content=payload.content,
    )
    db.add(user_message)
    await db.commit()
    await db.refresh(user_message)

    query_embedding = await asyncio.to_thread(embed_query, payload.content)
    chunks_with_scores = await find_similar_chunks(
        db=db,
        query_embedding=query_embedding,
        top_k=settings.top_k_chunks,
    )
    prompt = build_context_prompt(payload.content, [chunk.content for chunk, _ in chunks_with_scores])

    bot_tokens: list[str] = []
    async for token in stream_chat_answer(prompt):
        bot_tokens.append(token)
        yield token

    bot_message = Message(
        conversation_id=conversation_id,
        sender_type="BOT",
        content="".join(bot_tokens).strip(),
    )
    db.add(bot_message)

    if has_default_title:
        try:
            generated_title = await asyncio.to_thread(
                generate_conversation_title,
                payload.content,
            )
            if generated_title and not _is_default_title(generated_title):
                conv.title = generated_title
            else:
                conv.title = _fallback_title_from_message(payload.content)
        except Exception:
            conv.title = _fallback_title_from_message(payload.content)

    conv.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(bot_message)

    for chunk, score in chunks_with_scores:
        db.add(
            MessageCitation(
                message_id=bot_message.id,
                chunk_id=chunk.id,
                relevance_score=score,
            )
        )
    await db.commit()
