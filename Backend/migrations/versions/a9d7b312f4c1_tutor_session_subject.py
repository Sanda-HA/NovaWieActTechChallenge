"""Record an optional subject for tutor sessions without storing transcripts."""

import sqlalchemy as sa
from alembic import op

revision = "a9d7b312f4c1"
down_revision = "13f9c07ce21a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("chat_sessions", sa.Column("subject", sa.String(40), nullable=True))


def downgrade() -> None:
    op.drop_column("chat_sessions", "subject")
