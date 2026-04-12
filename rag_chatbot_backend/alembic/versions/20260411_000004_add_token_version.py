"""add token_version to users

Revision ID: 20260411_000004
Revises: 20260411_000003
Create Date: 2026-04-11
"""

import sqlalchemy as sa
from alembic import op

revision = "20260411_000004"
down_revision = "20260411_000003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_column("users", "token_version")
