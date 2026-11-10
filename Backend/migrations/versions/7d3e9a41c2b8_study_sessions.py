"""study sessions

Revision ID: 7d3e9a41c2b8
Revises: f0c521d69721
Create Date: 2026-11-07 23:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7d3e9a41c2b8'
down_revision: Union[str, Sequence[str], None] = 'f0c521d69721'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('study_sessions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_study_sessions_user_id'), 'study_sessions', ['user_id'], unique=False)
    op.create_index('uq_study_sessions_open', 'study_sessions', ['user_id'], unique=True, postgresql_where=sa.text('ended_at IS NULL'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('uq_study_sessions_open', table_name='study_sessions', postgresql_where=sa.text('ended_at IS NULL'))
    op.drop_index(op.f('ix_study_sessions_user_id'), table_name='study_sessions')
    op.drop_table('study_sessions')
