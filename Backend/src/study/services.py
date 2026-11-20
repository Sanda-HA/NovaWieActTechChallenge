from datetime import datetime, time, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from .exceptions import NoStudyInProgress
from .models import StudySession

# Tunisia has used UTC+1 without daylight saving time since 2009. A fixed offset avoids zoneinfo,
# which needs the tzdata package on Windows.
LOCAL_TZ = timezone(timedelta(hours=1), "Africa/Tunis")
HISTORY_LIMIT = 20


def _now():
    return datetime.now(timezone.utc)


def _end(s, now):
    if s.ended_at is not None:
        return s.ended_at
    return min(s.planned_end, now) if s.planned_end is not None else now


def _open_session(db, user, now):
    s = db.scalar(
        select(StudySession).where(StudySession.user_id == user.id, StudySession.ended_at.is_(None))
    )
    if s is not None and s.planned_end is not None and s.planned_end <= now:
        s.ended_at = s.planned_end
        db.commit()
        return None
    return s


def start(db, user, now=None, minutes=None):
    now = now or _now()
    if s := _open_session(db, user, now):
        return s
    planned_end = now + timedelta(minutes=minutes) if minutes else None
    s = StudySession(user_id=user.id, started_at=now, planned_end=planned_end)
    db.add(s)
    try:
        db.commit()
    except IntegrityError:  # a concurrent start won the unique "one open session" index
        db.rollback()
        return _open_session(db, user, now)
    db.refresh(s)
    return s


def stop(db, user, now=None):
    now = now or _now()
    s = _open_session(db, user, now)
    if not s:
        raise NoStudyInProgress()
    s.ended_at = now
    db.commit()
    db.refresh(s)
    return s


def _minutes(sessions, since, now):
    seconds = sum(
        max(0.0, (min(_end(s, now), now) - max(s.started_at, since)).total_seconds()) for s in sessions
    )
    return int(seconds // 60)


def summary(db, user, now=None):
    now = now or _now()
    active = _open_session(db, user, now)
    local_now = now.astimezone(LOCAL_TZ)
    today_start = datetime.combine(local_now.date(), time.min, tzinfo=LOCAL_TZ)
    week_start = today_start - timedelta(days=local_now.weekday())
    sessions = db.scalars(select(StudySession).where(StudySession.user_id == user.id)).all()

    days = {s.started_at.astimezone(LOCAL_TZ).date() for s in sessions}
    today = local_now.date()
    day = today if today in days else today - timedelta(days=1)
    streak = 0
    while day in days:
        streak += 1
        day -= timedelta(days=1)

    return {
        "started_at": active.started_at if active else None,
        "planned_end": active.planned_end if active else None,
        "minutes_today": _minutes(sessions, today_start, now),
        "minutes_week": _minutes(sessions, week_start, now),
        "streak_days": streak,
        "in_progress": active is not None,
    }


def history(db, user, now=None):
    _open_session(db, user, now or _now())
    sessions = db.scalars(
        select(StudySession)
        .where(StudySession.user_id == user.id, StudySession.ended_at.is_not(None))
        .order_by(StudySession.started_at.desc())
        .limit(HISTORY_LIMIT)
    ).all()
    return [
        {"id": s.id, "started_at": s.started_at, "ended_at": s.ended_at,
         "minutes": int((s.ended_at - s.started_at).total_seconds() // 60)}
        for s in sessions
    ]
