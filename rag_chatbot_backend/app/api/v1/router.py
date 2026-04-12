from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.conversations import router as conversations_router
from app.api.v1.documents import router as documents_router
from app.api.v1.knowledge_bases import router as knowledge_bases_router
from app.api.v1.messages import router as messages_router
from app.api.v1.stats import router as stats_router
from app.api.v1.users import router as users_router


api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(knowledge_bases_router)
api_router.include_router(documents_router)
api_router.include_router(conversations_router)
api_router.include_router(messages_router)
api_router.include_router(stats_router)
