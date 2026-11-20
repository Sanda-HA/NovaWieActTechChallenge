"""Persist room posts and group sessions, and record when members were last seen."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "f7a3d2c8e914"
down_revision = "e5c1a9b27d40"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("study_room_members", sa.Column("last_seen", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "room_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("study_rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("topic", sa.String(40), nullable=False),
        sa.Column("goal", sa.String(300), nullable=False),
        sa.Column("lang", sa.String(2), nullable=False),
        sa.Column("round", sa.String(10), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", postgresql.JSONB(), nullable=False),
        sa.Column("last_active", postgresql.JSONB(), nullable=False),
        sa.Column("prompted", postgresql.JSONB(), nullable=False),
    )
    op.create_index("ix_room_sessions_room_id", "room_sessions", ["room_id"])
    op.create_index("uq_room_sessions_running", "room_sessions", ["room_id"], unique=True,
                    postgresql_where=sa.text("round <> 'ended'"))
    op.create_table(
        "room_posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("study_rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("room_sessions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("author_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
        sa.Column("kind", sa.String(12), nullable=False),
        sa.Column("text", sa.String(1000), nullable=False),
        sa.Column("author", sa.String(64), nullable=True),
        sa.Column("verdict", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_room_posts_room_id", "room_posts", ["room_id"])
    op.create_index("ix_room_posts_author_id", "room_posts", ["author_id"])


def downgrade() -> None:
    op.drop_table("room_posts")
    op.drop_table("room_sessions")
    op.drop_column("study_room_members", "last_seen")
