"""Persist the current student plan."""

import sqlalchemy as sa
from alembic import op

revision = "68bedea51b9c"
down_revision = "f7a3d2c8e914"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("learner_profiles", sa.Column("student_plan", sa.String(4), nullable=False, server_default="free"))
    op.create_check_constraint(
        "ck_learner_profiles_student_plan", "learner_profiles", "student_plan IN ('free', 'pro')"
    )


def downgrade() -> None:
    op.drop_constraint("ck_learner_profiles_student_plan", "learner_profiles", type_="check")
    op.drop_column("learner_profiles", "student_plan")
