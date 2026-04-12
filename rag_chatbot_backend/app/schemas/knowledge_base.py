from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class KnowledgeBaseCreate(BaseModel):
    name: str
    description: str | None = None


class KnowledgeBaseResponse(BaseModel):
    id: UUID
    name: str
    description: str | None = None
    created_at: datetime
    doc_count: int = 0

    model_config = {"from_attributes": True}
