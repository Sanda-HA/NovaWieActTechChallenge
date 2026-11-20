"""persist learning quiz answer keys

Revision ID: c88d11a2e504
Revises: a3c5e7f9b1d2
Create Date: 2026-11-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "c88d11a2e504"
down_revision: Union[str, Sequence[str], None] = "a3c5e7f9b1d2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "learning_quizzes",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("quiz", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_learning_quizzes_user_id", "learning_quizzes", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_learning_quizzes_user_id", table_name="learning_quizzes")
    op.drop_table("learning_quizzes")
