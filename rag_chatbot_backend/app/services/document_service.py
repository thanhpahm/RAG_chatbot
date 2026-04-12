import shutil
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Document, DocumentChunk, KnowledgeBase


settings = get_settings()


async def create_pending_document(
    db: AsyncSession,
    knowledge_base_id: uuid.UUID,
    file: UploadFile,
) -> Document:
    kb = await db.scalar(select(KnowledgeBase).where(KnowledgeBase.id == knowledge_base_id))
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found")

    document = Document(
        knowledge_base_id=knowledge_base_id,
        filename=file.filename or "uploaded_file",
        file_type=Path(file.filename or "").suffix.lstrip(".").lower() or None,
        upload_status="PENDING",
    )
    db.add(document)
    await db.flush()

    base_storage = Path(settings.storage_dir)
    target_dir = base_storage / str(knowledge_base_id)
    target_dir.mkdir(parents=True, exist_ok=True)
    target_path = target_dir / f"{document.id}_{document.filename}"

    with target_path.open("wb") as out:
        shutil.copyfileobj(file.file, out)

    document.file_url = str(target_path)
    await db.commit()
    await db.refresh(document)
    return document


async def get_document(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> Document | None:
    stmt = select(Document).where(Document.id == document_id)
    return await db.scalar(stmt)


async def list_documents_by_kb(
    db: AsyncSession,
    knowledge_base_id: uuid.UUID,
) -> list[Document]:
    kb = await db.scalar(select(KnowledgeBase).where(KnowledgeBase.id == knowledge_base_id))
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found")
    result = await db.execute(
        select(Document)
        .where(Document.knowledge_base_id == knowledge_base_id)
        .order_by(Document.created_at.desc())
    )
    return result.scalars().all()


async def delete_document(
    db: AsyncSession,
    document_id: uuid.UUID,
) -> None:
    document = await get_document(db, document_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    await db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document.id))
    await db.delete(document)
    await db.commit()

    if document.file_url:
        path = Path(document.file_url)
        if path.exists():
            path.unlink()
