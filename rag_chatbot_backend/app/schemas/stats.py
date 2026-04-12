from pydantic import BaseModel


class StatsResponse(BaseModel):
    total_users: int
    total_knowledge_bases: int
    total_documents: int
    total_conversations: int
    total_messages: int
