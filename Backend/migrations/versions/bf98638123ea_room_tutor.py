"""Add opt-in room tutor settings and durable tutor requests."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "bf98638123ea"
down_revision = "9bf225216df8"
branch_labels = None
depends_on = None

_CONSENT_FIELDS = ("allow_ai_text", "allow_solo_context", "allow_personalization", "allow_group_insights")


def upgrade() -> None:
    op.execute("DELETE FROM room_posts WHERE kind = 'prompt'")
    op.execute("""
        UPDATE room_sessions
        SET notes = '[]'::jsonb, last_active = '{}'::jsonb, prompted = '{}'::jsonb
        WHERE notes <> '[]'::jsonb OR last_active <> '{}'::jsonb OR prompted <> '{}'::jsonb
    """)
    for field in ("tutor_enabled", "tutor_round_prompts"):
        op.add_column("study_rooms", sa.Column(field, sa.Boolean(), server_default=sa.false(), nullable=False))
    op.add_column("study_rooms", sa.Column("tutor_version", sa.Integer(), server_default="0", nullable=False))
    for field in _CONSENT_FIELDS:
        op.add_column(
            "study_room_members", sa.Column(field, sa.Boolean(), server_default=sa.false(), nullable=False)
        )
    op.add_column("study_room_members", sa.Column("ai_text_consented_at", sa.DateTime(timezone=True)))
    op.add_column("room_sessions", sa.Column("ended_at", sa.DateTime(timezone=True)))
    op.add_column("room_sessions", sa.Column("tutor_routine_count", sa.Integer(), server_default="0", nullable=False))
    op.add_column("room_posts", sa.Column("ai_text_eligible", sa.Boolean(), server_default=sa.false(), nullable=False))
    op.create_table(
        "room_tutor_jobs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("room_id", sa.Uuid(), sa.ForeignKey("study_rooms.id", ondelete="CASCADE"), nullable=False),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("room_sessions.id", ondelete="CASCADE")),
        sa.Column("duel_id", sa.Uuid()),
        sa.Column("requester_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("source_post_id", sa.Integer(), sa.ForeignKey("room_posts.id", ondelete="SET NULL")),
        sa.Column("source_key", sa.String(120)),
        sa.Column("idempotency_key", sa.String(64)),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("state", sa.String(10), nullable=False),
        sa.Column("topic", sa.String(40), nullable=False),
        sa.Column("language", sa.String(2), nullable=False),
        sa.Column("concepts", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("dispatched_at", sa.DateTime(timezone=True)),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("lease_token", sa.Uuid()),
        sa.Column("payload_digest", sa.String(64)),
        sa.Column("retrieve_permitted_at", sa.DateTime(timezone=True)),
        sa.Column("infer_permitted_at", sa.DateTime(timezone=True)),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
        sa.Column("used_private_context", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("result_text", sa.String(420)),
        sa.Column("result_post_id", sa.Integer(), sa.ForeignKey("room_posts.id", ondelete="SET NULL")),
        sa.UniqueConstraint("room_id", "version", "source_key", name="uq_room_tutor_source"),
        sa.UniqueConstraint("room_id", "version", "idempotency_key", name="uq_room_tutor_idempotency"),
        sa.CheckConstraint("state IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')", name="ck_room_tutor_state"),
        sa.CheckConstraint(
            "kind IN ('explain', 'hint', 'round_end', 'session_summary', 'duel_debrief')", name="ck_room_tutor_kind"
        ),
    )
    for field in ("room_id", "session_id", "duel_id"):
        op.create_index(f"ix_room_tutor_jobs_{field}", "room_tutor_jobs", [field])
    op.create_index("ix_room_tutor_dispatch", "room_tutor_jobs", ["state", "created_at"])
    op.create_index(
        "uq_room_tutor_running", "room_tutor_jobs", ["room_id"],
        unique=True, postgresql_where=sa.text("state = 'running'"),
    )


def downgrade() -> None:
    op.execute("DELETE FROM room_posts WHERE kind = 'tutor_reply'")
    op.drop_table("room_tutor_jobs")
    op.drop_column("room_posts", "ai_text_eligible")
    op.drop_column("room_sessions", "tutor_routine_count")
    op.drop_column("room_sessions", "ended_at")
    op.drop_column("study_room_members", "ai_text_consented_at")
    for field in reversed(_CONSENT_FIELDS):
        op.drop_column("study_room_members", field)
    for field in ("tutor_version", "tutor_round_prompts", "tutor_enabled"):
        op.drop_column("study_rooms", field)
