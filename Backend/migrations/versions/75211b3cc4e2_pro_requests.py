"""Track pilot Pro access requests."""

import sqlalchemy as sa
from alembic import op

revision = "75211b3cc4e2"
down_revision = "68bedea51b9c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("learner_profiles", sa.Column("pro_requested", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("learner_profiles", "pro_requested")
