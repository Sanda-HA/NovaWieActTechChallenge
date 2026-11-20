"""Use 6-character invite codes for study rooms."""

import secrets
from uuid import uuid4

from alembic import op
import sqlalchemy as sa

revision = "d4b81f6e3a57"
down_revision = "c2e4a7129f08"
branch_labels = None
depends_on = None

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _swap(new_type, make_value) -> None:
    bind = op.get_bind()
    op.add_column("study_rooms", sa.Column("invite_code_new", new_type, nullable=True))
    seen: set = set()
    for (room_id,) in bind.execute(sa.text("SELECT id FROM study_rooms")).all():
        value = make_value()
        while value in seen:
            value = make_value()
        seen.add(value)
        bind.execute(
            sa.text("UPDATE study_rooms SET invite_code_new = :v WHERE id = :id"), {"v": value, "id": room_id}
        )
    op.drop_column("study_rooms", "invite_code")
    op.alter_column("study_rooms", "invite_code_new", new_column_name="invite_code", nullable=False)
    op.create_unique_constraint("study_rooms_invite_code_key", "study_rooms", ["invite_code"])


def upgrade() -> None:
    _swap(sa.String(6), lambda: "".join(secrets.choice(ALPHABET) for _ in range(6)))


def downgrade() -> None:
    _swap(sa.Uuid(), uuid4)
