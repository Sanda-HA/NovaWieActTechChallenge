"""Store the learner's onboarding preferences."""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision = "13f9c07ce21a"
down_revision = "7d3e9a41c2b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("learner_profiles", sa.Column("presentation", sa.String(10), nullable=True))
    op.add_column(
        "learner_profiles",
        sa.Column("enabled_tools", JSONB, nullable=False, server_default=sa.text("""'["guided", "feynman"]'::jsonb""")),
    )


def downgrade() -> None:
    op.drop_column("learner_profiles", "enabled_tools")
    op.drop_column("learner_profiles", "presentation")
