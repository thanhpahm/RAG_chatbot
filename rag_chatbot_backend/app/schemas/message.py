from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    content: str = Field(min_length=1)
    knowledge_base_id: UUID | None = None


class MessageResponse(BaseModel):
    id: UUID
    conversation_id: UUID
    sender_type: str
    content: str
    rating: int | None = None
    feedback_text: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCitationResponse(BaseModel):
    id: UUID
    message_id: UUID
    chunk_id: UUID
    relevance_score: float | None = None
    chunk_content: str | None = None
    document_name: str | None = None


class MessageFeedbackUpdate(BaseModel):
    rating: int | None = None
    feedback_text: str | None = None
