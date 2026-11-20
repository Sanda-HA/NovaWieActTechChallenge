"""Let countdown study sessions record their planned end."""

from alembic import op
import sqlalchemy as sa

revision = "e5c1a9b27d40"
down_revision = "d4b81f6e3a57"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("study_sessions", sa.Column("planned_end", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("study_sessions", "planned_end")
