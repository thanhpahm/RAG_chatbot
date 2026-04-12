import uuid
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy import select

from app.dependencies import get_current_admin, get_db
from app.models import DocumentChunk, User
from app.schemas.document import ChunkResponse, DocumentResponse, DocumentUploadResponse
from app.services.document_service import create_pending_document, delete_document, get_document, list_documents_by_kb
from app.workers.document_processor import process_document


router = APIRouter(tags=["documents"])


@router.post(
    "/knowledge-bases/{kb_id}/documents",
    response_model=DocumentUploadResponse,
)
async def upload_document(
    kb_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    document = await create_pending_document(db, kb_id, file)
    background_tasks.add_task(process_document, document.id)
    return document


@router.get(
    "/knowledge-bases/{kb_id}/documents",
    response_model=list[DocumentResponse],
)
async def list_kb_documents(
    kb_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    return await list_documents_by_kb(db, kb_id)


@router.get("/documents/{doc_id}", response_model=DocumentResponse)
async def get_document_detail(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    document = await get_document(db, doc_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.get("/documents/{doc_id}/chunks", response_model=list[ChunkResponse])
async def get_document_chunks(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    document = await get_document(db, doc_id)
    if not document:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    result = await db.execute(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == doc_id)
        .order_by(DocumentChunk.chunk_index.asc())
    )
    chunks = result.scalars().all()
    return [
        ChunkResponse(
            id=c.id,
            document_id=c.document_id,
            chunk_index=c.chunk_index,
            content=c.content,
            has_embedding=c.embedding is not None,
        )
        for c in chunks
    ]

@router.delete("/documents/{doc_id}", status_code=204)
async def remove_document(
    doc_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    await delete_document(db, doc_id)
