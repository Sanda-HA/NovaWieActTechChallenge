"""Store private, source-backed chapter mind maps."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "149d49f2eb76"
down_revision = "c88d11a2e504"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "mind_maps",
        sa.Column("user_id", sa.Uuid(), primary_key=True),
        sa.Column("grade", sa.String(40), primary_key=True),
        sa.Column("section", sa.String(40), primary_key=True),
        sa.Column("subject", sa.String(40), primary_key=True),
        sa.Column("topic", sa.String(40), primary_key=True),
        sa.Column("reply_language", sa.String(2), primary_key=True),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("source_revision", sa.Integer(), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("artifact", JSONB(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], name="fk_mind_maps_user", ondelete="CASCADE"),
    )


def downgrade() -> None:
    op.drop_table("mind_maps")
