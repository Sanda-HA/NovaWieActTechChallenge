"""Create and seed the versioned room quiz and exam question bank."""

import json

import sqlalchemy as sa
from alembic import context, op
from sqlalchemy.dialects import postgresql

from src.learning.exam_seed import blueprints_v1, questions_v1


revision = "9bf225216df8"
down_revision = "75211b3cc4e2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "exam_question_fills",
        sa.Column("key", sa.String(64), primary_key=True),
        sa.Column("request", postgresql.JSONB, nullable=False),
        sa.Column("state", sa.String(12), nullable=False),
        sa.Column("attempts", sa.Integer, nullable=False),
        sa.Column("lease_until", sa.DateTime(timezone=True)),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True)),
        sa.Column("inserted", sa.Integer, nullable=False, server_default="0"),
        sa.Column("error", sa.String(40)),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("state IN ('running', 'succeeded', 'failed')", name="ck_exam_fills_state"),
        sa.CheckConstraint("attempts BETWEEN 1 AND 3", name="ck_exam_fills_attempts"),
    )
    questions = op.create_table(
        "exam_questions",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("topic", sa.String(40), nullable=False),
        sa.Column("language", sa.String(2), nullable=False),
        sa.Column("grade", sa.String(40), nullable=False),
        sa.Column("section", sa.String(40), nullable=False),
        sa.Column("subject", sa.String(40), nullable=False),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("pool", sa.String(12), nullable=False),
        sa.Column("review_state", sa.String(12), nullable=False),
        sa.Column("fingerprint", sa.String(64), nullable=False),
        sa.Column("concept", sa.String(50), nullable=False),
        sa.Column("difficulty", sa.Integer, nullable=False),
        sa.Column("points", sa.Integer, nullable=False),
        sa.Column("kind", sa.String(12), nullable=False),
        sa.Column("prompt", sa.String, nullable=False),
        sa.Column("choices", postgresql.JSONB, nullable=False),
        sa.Column("answer", postgresql.JSONB, nullable=False),
        sa.Column("explanation", sa.String, nullable=False),
        sa.Column("source", postgresql.JSONB(none_as_null=True)),
        sa.Column("fill_key", sa.String(64), sa.ForeignKey("exam_question_fills.key")),
        sa.Column("reviewed_by", sa.String(100)),
        sa.Column("reviewed_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("grade", "section", "subject", "topic", "language", "fingerprint", name="uq_exam_question_prompt"),
        sa.CheckConstraint("pool IN ('competitive', 'practice')", name="ck_exam_questions_pool"),
        sa.CheckConstraint("review_state IN ('pending', 'published', 'rejected')", name="ck_exam_questions_state"),
        sa.CheckConstraint("kind IN ('choice', 'number', 'text')", name="ck_exam_questions_kind"),
        sa.CheckConstraint("difficulty BETWEEN 1 AND 3 AND points > 0 AND version > 0", name="ck_exam_questions_scale"),
        sa.CheckConstraint("language IN ('fr', 'en', 'ar')", name="ck_exam_questions_language"),
        sa.CheckConstraint("fill_key IS NULL OR pool = 'practice'", name="ck_exam_questions_generated_pool"),
        sa.CheckConstraint(
            "fill_key IS NULL OR review_state = 'pending' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)",
            name="ck_exam_questions_reviewer",
        ),
    )
    op.create_index(
        "ix_exam_questions_practice", "exam_questions",
        ["grade", "section", "subject", "topic", "language", "pool", "review_state"],
    )
    blueprints = op.create_table(
        "exam_blueprints",
        sa.Column("id", sa.String(80), primary_key=True),
        sa.Column("topic", sa.String(40), nullable=False),
        sa.Column("language", sa.String(2), nullable=False),
        sa.Column("grade", sa.String(40), nullable=False),
        sa.Column("section", sa.String(40), nullable=False),
        sa.Column("subject", sa.String(40), nullable=False),
        sa.Column("version", sa.Integer, nullable=False),
        sa.Column("duration_seconds", sa.Integer, nullable=False),
        sa.Column("slots", postgresql.JSONB, nullable=False),
        sa.CheckConstraint("version > 0 AND duration_seconds > 0", name="ck_exam_blueprints_scale"),
        sa.CheckConstraint("language IN ('fr', 'en', 'ar')", name="ck_exam_blueprints_language"),
    )
    _seed(questions, questions_v1())
    _seed(blueprints, blueprints_v1())

    op.execute("""
        CREATE FUNCTION ednova_guard_exam_blueprint() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
            RAISE EXCEPTION 'Published exam blueprints are immutable' USING ERRCODE = '23514';
        END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER guard_exam_blueprint BEFORE UPDATE OR DELETE ON exam_blueprints
        FOR EACH ROW EXECUTE FUNCTION ednova_guard_exam_blueprint()
    """)
    op.execute("""
        CREATE FUNCTION ednova_guard_exam_question() RETURNS trigger LANGUAGE plpgsql AS $$
        DECLARE
            review_fields text[] := ARRAY['review_state', 'reviewed_by', 'reviewed_at'];
        BEGIN
            IF TG_OP = 'DELETE' THEN
                IF OLD.review_state = 'pending' THEN
                    RETURN OLD;
                END IF;
            ELSIF OLD.review_state = 'pending' AND NEW.review_state IN ('published', 'rejected')
                AND (to_jsonb(OLD) - review_fields) = (to_jsonb(NEW) - review_fields) THEN
                RETURN NEW;
            END IF;
            RAISE EXCEPTION 'Exam questions are immutable outside pending review decisions' USING ERRCODE = '23514';
        END;
        $$
    """)
    op.execute("""
        CREATE TRIGGER guard_exam_question BEFORE UPDATE OR DELETE ON exam_questions
        FOR EACH ROW EXECUTE FUNCTION ednova_guard_exam_question()
    """)


def _seed(table: sa.Table, rows: list[dict]) -> None:
    if context.is_offline_mode():
        rows = [
            {key: op.inline_literal(json.dumps(value)) if isinstance(value, (list, dict)) else value
             for key, value in row.items()}
            for row in rows
        ]
    op.bulk_insert(table, rows, multiinsert=False if context.is_offline_mode() else True)


def downgrade() -> None:
    op.drop_table("exam_blueprints")
    op.drop_table("exam_questions")
    op.drop_table("exam_question_fills")
    op.execute("DROP FUNCTION ednova_guard_exam_blueprint()")
    op.execute("DROP FUNCTION ednova_guard_exam_question()")
