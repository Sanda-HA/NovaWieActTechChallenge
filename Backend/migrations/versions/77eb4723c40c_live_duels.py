"""Persist live duel state, answer snapshots, and consented concept evidence."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


revision = "77eb4723c40c"
down_revision = "bf98638123ea"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "duels",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("study_rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("room_sessions.id", ondelete="SET NULL")),
        sa.Column("creator_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("invitee_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("invite_digest", sa.String(64)),
        sa.Column("status", sa.String(12), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("invite_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("starts_at", sa.DateTime(timezone=True)),
        sa.Column("deadline_at", sa.DateTime(timezone=True)),
        sa.Column("terminal_at", sa.DateTime(timezone=True)),
        sa.Column("result", postgresql.JSONB()),
        sa.UniqueConstraint("room_id", "invite_digest", name="uq_duels_code"),
        sa.CheckConstraint(
            "status IN ('invited', 'lobby', 'scheduled', 'finished', 'expired', 'cancelled')", name="ck_duels_status",
        ),
    )
    op.create_index(
        "uq_duels_open_room", "duels", ["room_id"], unique=True,
        postgresql_where=sa.text("status IN ('invited', 'lobby', 'scheduled')"),
    )
    op.create_index(
        "ix_duels_deadline", "duels", ["due_at"], postgresql_where=sa.text("terminal_at IS NULL"),
    )
    op.create_index("ix_duels_room_id", "duels", ["room_id"])
    op.create_index("ix_duels_invitee_id", "duels", ["invitee_id"])
    op.create_index("ix_duels_terminal_at", "duels", ["terminal_at"])
    op.create_table(
        "duel_exams",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("duel_id", sa.Uuid(), sa.ForeignKey("duels.id", ondelete="CASCADE"), unique=True, nullable=False),
        sa.Column("blueprint_id", sa.String(80), nullable=False),
        sa.Column("topic", sa.String(40), nullable=False),
        sa.Column("language", sa.String(2), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("snapshot", postgresql.JSONB(), nullable=False),
    )
    op.create_table(
        "duel_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("duel_id", sa.Uuid(), sa.ForeignKey("duels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("slot", sa.Integer(), nullable=False),
        sa.Column("ready_at", sa.DateTime(timezone=True)),
        sa.Column("locked_at", sa.DateTime(timezone=True)),
        sa.Column("lock_reason", sa.String(12)),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("answered_count", sa.Integer(), nullable=False),
        sa.Column("answers", postgresql.JSONB(), nullable=False),
        sa.Column("grades", postgresql.JSONB(), nullable=False),
        sa.UniqueConstraint("duel_id", "slot", name="uq_duel_attempt_slot"),
        sa.UniqueConstraint("duel_id", "user_id", name="uq_duel_attempt_user"),
        sa.CheckConstraint("slot IN (1, 2)", name="ck_duel_attempt_slot"),
    )
    op.create_index("ix_duel_attempts_user_id", "duel_attempts", ["user_id"])
    op.create_table(
        "duel_mutations",
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("study_rooms.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("key", sa.String(128), primary_key=True),
        sa.Column("duel_id", sa.Uuid(), sa.ForeignKey("duels.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("response", postgresql.JSONB(), nullable=False),
    )
    op.create_index("ix_duel_mutations_duel_id", "duel_mutations", ["duel_id"])
    op.create_table(
        "duel_code_attempts",
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("study_rooms.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("window_started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("count", sa.Integer(), nullable=False),
    )
    op.create_table(
        "group_concept_evidence",
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("study_rooms.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("activity", sa.String(50), primary_key=True),
        sa.Column("concept", sa.String(40), primary_key=True),
        sa.Column("signal", sa.String(16), primary_key=True),
        sa.Column("topic", sa.String(40), nullable=False),
        sa.Column("explanation_format", sa.String(12)),
        sa.Column("count", sa.Integer(), nullable=False),
        sa.Column("personal", sa.Boolean(), nullable=False),
        sa.Column("shared", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_group_concept_evidence_user_id", "group_concept_evidence", ["user_id"])
    op.create_index("ix_group_concept_evidence_created_at", "group_concept_evidence", ["created_at"])
    op.create_index("ix_group_concept_lookup", "group_concept_evidence", ["topic", "concept", "signal", "created_at"])
    op.create_foreign_key(
        "fk_room_tutor_duel", "room_tutor_jobs", "duels", ["duel_id"], ["id"], ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint("fk_room_tutor_duel", "room_tutor_jobs", type_="foreignkey")
    op.drop_table("group_concept_evidence")
    op.drop_table("duel_code_attempts")
    op.drop_table("duel_mutations")
    op.drop_table("duel_attempts")
    op.drop_table("duel_exams")
    op.drop_table("duels")
