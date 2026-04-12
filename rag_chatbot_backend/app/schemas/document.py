from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    id: UUID
    knowledge_base_id: UUID
    filename: str
    file_type: str | None = None
    file_url: str | None = None
    upload_status: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


DocumentResponse = DocumentUploadResponse


class ChunkResponse(BaseModel):
    id: UUID
    document_id: UUID
    chunk_index: int | None = None
    content: str
    has_embedding: bool

    model_config = {"from_attributes": True}
