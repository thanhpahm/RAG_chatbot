"""remove created_by from knowledge_bases

Revision ID: 20260408_000002
Revises: 20260407_000001
Create Date: 2026-04-08
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260408_000002"
down_revision = "20260407_000001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index(op.f("ix_knowledge_bases_created_by"), table_name="knowledge_bases")
    op.drop_column("knowledge_bases", "created_by")


def downgrade() -> None:
    op.add_column(
        "knowledge_bases",
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_index(op.f("ix_knowledge_bases_created_by"), "knowledge_bases", ["created_by"], unique=False)
