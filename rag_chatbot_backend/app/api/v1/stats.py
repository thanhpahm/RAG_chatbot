from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_admin, get_db
from app.models import Conversation, Document, KnowledgeBase, Message, User
from app.schemas.stats import StatsResponse


router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("", response_model=StatsResponse)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    user_count = await db.scalar(select(func.count(User.id))) or 0
    kb_count = await db.scalar(select(func.count(KnowledgeBase.id))) or 0
    doc_count = await db.scalar(select(func.count(Document.id))) or 0
    conv_count = await db.scalar(select(func.count(Conversation.id))) or 0
    msg_count = await db.scalar(select(func.count(Message.id))) or 0
    return StatsResponse(
        total_users=user_count,
        total_knowledge_bases=kb_count,
        total_documents=doc_count,
        total_conversations=conv_count,
        total_messages=msg_count,
    )
