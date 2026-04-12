"""add users and conversation owner fk

Revision ID: 20260411_000003
Revises: 20260408_000002
Create Date: 2026-04-11
"""

import uuid

import bcrypt

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "20260411_000003"
down_revision = "20260408_000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("username", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)

    admin_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode("utf-8")
    op.execute(
        sa.text(
            """
            INSERT INTO users (id, username, email, hashed_password, role, is_active)
            VALUES (:id, :username, :email, :hashed_password, :role, true)
            ON CONFLICT (id) DO NOTHING
            """
        ).bindparams(
            id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
            username="admin",
            email="admin@company.com",
            hashed_password=admin_hash,
            role="admin",
        )
    )

    op.create_foreign_key(
        "fk_conversations_user_id_users",
        "conversations",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_conversations_user_id_users", "conversations", type_="foreignkey")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_table("users")
