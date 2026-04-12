import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.dependencies import get_current_user, get_db
from app.models import Conversation, Document, DocumentChunk, Message, MessageCitation, User
from app.schemas.message import MessageCitationResponse, MessageCreate, MessageFeedbackUpdate
from app.services.chat_service import stream_rag_answer


router = APIRouter(tags=["messages"])


@router.post("/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    async def event_generator():
        try:
            async for token in stream_rag_answer(db, conversation_id, payload, current_user):
                yield {"event": "token", "data": token}
            yield {"event": "done", "data": "[DONE]"}
        except Exception as exc:
            yield {
                "event": "error",
                "data": json.dumps({"message": str(exc)}),
            }

    return EventSourceResponse(event_generator())


@router.get("/messages/{message_id}/citations", response_model=list[MessageCitationResponse])
async def get_message_citations(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = await db.scalar(select(Message).where(Message.id == message_id))
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    conversation = await db.scalar(select(Conversation).where(Conversation.id == message.conversation_id))
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if current_user.role != "admin" and conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    result = await db.execute(
        select(MessageCitation, DocumentChunk, Document)
        .join(DocumentChunk, MessageCitation.chunk_id == DocumentChunk.id)
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(MessageCitation.message_id == message_id)
    )
    rows = result.all()
    return [
        MessageCitationResponse(
            id=citation.id,
            message_id=citation.message_id,
            chunk_id=citation.chunk_id,
            relevance_score=citation.relevance_score,
            chunk_content=chunk.content,
            document_name=document.filename,
        )
        for citation, chunk, document in rows
    ]


@router.patch("/messages/{message_id}/feedback")
async def update_message_feedback(
    message_id: uuid.UUID,
    payload: MessageFeedbackUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    message = await db.scalar(select(Message).where(Message.id == message_id))
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    conversation = await db.scalar(select(Conversation).where(Conversation.id == message.conversation_id))
    if not conversation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    if current_user.role != "admin" and conversation.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    message.rating = payload.rating
    message.feedback_text = payload.feedback_text
    await db.commit()
    return {"ok": True}
