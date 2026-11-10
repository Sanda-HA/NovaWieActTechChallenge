from datetime import datetime, time, timedelta, timezone
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from .exceptions import NoStudyInProgress
from .models import StudySession

# Days and weeks are counted in UTC.


def _now():
    return datetime.now(timezone.utc)


def _open_session(db, user):
    return db.scalar(
        select(StudySession).where(StudySession.user_id == user.id, StudySession.ended_at.is_(None))
    )


def start(db, user, now=None):
    if s := _open_session(db, user):
        return s
    s = StudySession(user_id=user.id, started_at=now or _now())
    db.add(s)
    try:
        db.commit()
    except IntegrityError:  # a concurrent start won the unique "one open session" index
        db.rollback()
        return _open_session(db, user)
    db.refresh(s)
    return s


def stop(db, user, now=None):
    s = _open_session(db, user)
    if not s:
        raise NoStudyInProgress()
    s.ended_at = now or _now()
    db.commit()
    db.refresh(s)
    return s


def _minutes(sessions, since, now):
    seconds = sum(
        max(0.0, (min(s.ended_at or now, now) - max(s.started_at, since)).total_seconds()) for s in sessions
    )
    return int(seconds // 60)


def summary(db, user, now=None):
    now = now or _now()
    today_start = datetime.combine(now.date(), time.min, tzinfo=timezone.utc)
    week_start = today_start - timedelta(days=now.weekday())
    sessions = db.scalars(select(StudySession).where(StudySession.user_id == user.id)).all()

    days = {s.started_at.astimezone(timezone.utc).date() for s in sessions}
    day = now.date() if now.date() in days else now.date() - timedelta(days=1)
    streak = 0
    while day in days:
        streak += 1
        day -= timedelta(days=1)

    active = next((s for s in sessions if s.ended_at is None), None)
    return {
        "started_at": active.started_at if active else None,
        "minutes_today": _minutes(sessions, today_start, now),
        "minutes_week": _minutes(sessions, week_start, now),
        "streak_days": streak,
        "in_progress": any(s.ended_at is None for s in sessions),
    }
