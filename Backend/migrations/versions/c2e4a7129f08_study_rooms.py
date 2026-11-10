"""Add shared study rooms and membership."""

from alembic import op
import sqlalchemy as sa

revision = "c2e4a7129f08"
down_revision = "a9d7b312f4c1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "study_rooms",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("owner_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("invite_code", sa.Uuid(), nullable=False, unique=True),
    )
    op.create_index("ix_study_rooms_owner_id", "study_rooms", ["owner_id"])
    op.create_table(
        "study_room_members",
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("study_rooms.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_index("ix_study_room_members_user_id", "study_room_members", ["user_id"])


def downgrade() -> None:
    op.drop_table("study_room_members")
    op.drop_table("study_rooms")
