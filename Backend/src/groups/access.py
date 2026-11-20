from ..auth.services import CurrentUser
from ..Database.core import DbSession
from ..learning.services import student_plan_for
from ..student_plans import require_pro


def require_group_pro(db, user_id) -> None:
    require_pro(student_plan_for(db, user_id), "group_sessions")


def authorize_group_sessions(user: CurrentUser, db: DbSession) -> None:
    require_group_pro(db, user.id)


def can_join_session(db, user_id, room) -> bool:
    """Joining a Nova-led session is Free when the room's owner hosts it with Pro."""
    return student_plan_for(db, user_id) == "pro" or student_plan_for(db, room.owner_id) == "pro"


def require_session_participation(db, user_id, room) -> None:
    if not can_join_session(db, user_id, room):
        require_group_pro(db, user_id)
