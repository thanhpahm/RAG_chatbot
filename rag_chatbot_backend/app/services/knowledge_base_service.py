import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Document, KnowledgeBase
from app.schemas.knowledge_base import KnowledgeBaseCreate


async def create_knowledge_base(
    db: AsyncSession,
    payload: KnowledgeBaseCreate,
) -> dict:
    kb = KnowledgeBase(
        name=payload.name,
        description=payload.description,
    )
    db.add(kb)
    await db.commit()
    await db.refresh(kb)
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "created_at": kb.created_at,
        "doc_count": 0,
    }


async def list_knowledge_bases(db: AsyncSession) -> list[dict]:
    stmt = (
        select(KnowledgeBase, func.count(Document.id).label("doc_count"))
        .outerjoin(Document, Document.knowledge_base_id == KnowledgeBase.id)
        .group_by(KnowledgeBase.id)
        .order_by(KnowledgeBase.created_at.desc())
    )
    rows = (await db.execute(stmt)).all()
    result = []
    for kb, doc_count in rows:
        data = {
            "id": kb.id,
            "name": kb.name,
            "description": kb.description,
            "created_at": kb.created_at,
            "doc_count": doc_count,
        }
        result.append(data)
    return result


async def get_knowledge_base(db: AsyncSession, kb_id: uuid.UUID) -> dict | None:
    stmt = (
        select(KnowledgeBase, func.count(Document.id).label("doc_count"))
        .outerjoin(Document, Document.knowledge_base_id == KnowledgeBase.id)
        .where(KnowledgeBase.id == kb_id)
        .group_by(KnowledgeBase.id)
    )
    row = (await db.execute(stmt)).first()
    if not row:
        return None
    kb, doc_count = row
    return {
        "id": kb.id,
        "name": kb.name,
        "description": kb.description,
        "created_at": kb.created_at,
        "doc_count": doc_count,
    }


async def delete_knowledge_base(db: AsyncSession, kb_id: uuid.UUID) -> None:
    kb = await db.scalar(select(KnowledgeBase).where(KnowledgeBase.id == kb_id))
    if not kb:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Knowledge base not found")
    await db.delete(kb)
    await db.commit()
