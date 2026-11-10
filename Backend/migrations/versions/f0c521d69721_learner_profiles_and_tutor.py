"""learner profiles, chat sessions and chat turns

Revision ID: f0c521d69721
Revises: b35d0198ac82
Create Date: 2026-11-07 23:06:32.684460

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'f0c521d69721'
down_revision: Union[str, Sequence[str], None] = 'b35d0198ac82'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('chat_sessions',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('topic', sa.String(length=200), nullable=True),
    sa.Column('turn_count', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_sessions_user_id'), 'chat_sessions', ['user_id'], unique=False)
    op.create_table('learner_profiles',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('level', sa.String(length=20), nullable=False),
    sa.Column('subjects', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('preferred_format', sa.String(length=20), nullable=False),
    sa.Column('diagnostic_score', sa.Integer(), nullable=True),
    sa.Column('city', sa.String(length=50), nullable=True),
    sa.Column('grade', sa.String(length=40), nullable=False),
    sa.Column('section', sa.String(length=40), nullable=False),
    sa.Column('subject', sa.String(length=40), nullable=False),
    sa.Column('reply_language', sa.String(length=2), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )
    op.create_table('chat_turns',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('session_id', sa.Uuid(), nullable=False),
    sa.Column('response_id', sa.String(length=64), nullable=False),
    sa.Column('badge', sa.String(length=40), nullable=True),
    sa.Column('topic', sa.String(length=200), nullable=True),
    sa.Column('latency_ms', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['session_id'], ['chat_sessions.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_chat_turns_response_id'), 'chat_turns', ['response_id'], unique=False)
    op.create_index(op.f('ix_chat_turns_session_id'), 'chat_turns', ['session_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_chat_turns_session_id'), table_name='chat_turns')
    op.drop_index(op.f('ix_chat_turns_response_id'), table_name='chat_turns')
    op.drop_table('chat_turns')
    op.drop_table('learner_profiles')
    op.drop_index(op.f('ix_chat_sessions_user_id'), table_name='chat_sessions')
    op.drop_table('chat_sessions')
