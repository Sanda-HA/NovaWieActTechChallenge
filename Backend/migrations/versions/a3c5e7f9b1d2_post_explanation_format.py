"""Record the explanation format a room post used."""

import sqlalchemy as sa
from alembic import op


revision = "a3c5e7f9b1d2"
down_revision = "77eb4723c40c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("room_posts", sa.Column("explanation_format", sa.String(12)))
    op.create_check_constraint(
        "ck_room_posts_explanation_format", "room_posts",
        "explanation_format IS NULL OR explanation_format IN ('step_by_step', 'examples', 'visual', 'analogy')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_room_posts_explanation_format", "room_posts", type_="check")
    op.drop_column("room_posts", "explanation_format")
