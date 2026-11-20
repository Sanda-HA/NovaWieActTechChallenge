from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select

from src.auth.models import User
from src.learning.models import LearnerProfile
from src.study import services as study
from src.study.models import StudySession
from src.tutor.models import ChatSession, ChatTurn
from src.utils import learner_pseudonym


def test_start_stop_summary(client, auth):
    started = client.post("/study/start", headers=auth).json()
    assert client.post("/study/start", headers=auth).json()["id"] == started["id"]
    running = client.get("/study/summary", headers=auth).json()
    assert running["in_progress"] is True
    assert running["started_at"] == started["started_at"]
    stopped = client.post("/study/stop", headers=auth).json()
    assert stopped["id"] == started["id"] and stopped["ended_at"] is not None
    summary = client.get("/study/summary", headers=auth).json()
    assert summary == {"minutes_today": 0, "minutes_week": 0, "streak_days": 1, "in_progress": False,
                       "started_at": None, "planned_end": None}


def test_countdown_session_reports_its_planned_end(client, auth):
    started = client.post("/study/start", headers=auth, json={"minutes": 25}).json()
    assert started["planned_end"] is not None
    summary = client.get("/study/summary", headers=auth).json()
    assert summary["in_progress"] is True and summary["planned_end"] == started["planned_end"]
    assert client.post("/study/start", headers=auth, json={"minutes": 0}).status_code == 422


def test_abandoned_countdown_closes_at_its_planned_end(client, auth, db):
    user = db.scalar(select(User))
    now = datetime(2026, 11, 7, 10, 0, tzinfo=timezone.utc)
    study.start(db, user, now - timedelta(hours=3), minutes=25)
    summary = study.summary(db, user, now)
    assert summary["in_progress"] is False and summary["minutes_today"] == 25
    session = db.scalar(select(StudySession))
    assert session.ended_at == session.planned_end
    assert client.post("/study/stop", headers=auth).status_code == 409


def test_paused_countdown_counts_only_the_time_studied(db, client, auth):
    user = db.scalar(select(User))
    now = datetime(2026, 11, 7, 10, 0, tzinfo=timezone.utc)
    study.start(db, user, now, minutes=25)
    study.stop(db, user, now + timedelta(minutes=10))
    study.start(db, user, now + timedelta(minutes=30), minutes=15)
    assert study.summary(db, user, now + timedelta(minutes=35))["minutes_today"] == 15


def test_history_lists_finished_sessions_newest_first(client, auth, db):
    user = db.scalar(select(User))
    now = datetime.now(timezone.utc)
    for hours, minutes in ((5, 20), (2, 45)):
        start = now - timedelta(hours=hours)
        db.add(StudySession(user_id=user.id, started_at=start, ended_at=start + timedelta(minutes=minutes)))
    db.commit()
    client.post("/study/start", headers=auth)
    history = client.get("/study/sessions", headers=auth).json()
    assert [row["minutes"] for row in history] == [45, 20]


def test_stop_without_start_is_409(client, auth):
    assert client.post("/study/stop", headers=auth).status_code == 409


def test_summary_minutes_and_streak(client, auth, db):
    user = db.scalar(select(User))
    now = datetime(2026, 11, 7, 10, 0, tzinfo=timezone.utc)  # a Saturday

    def add(start, minutes):
        db.add(StudySession(user_id=user.id, started_at=start, ended_at=start + timedelta(minutes=minutes)))

    add(now - timedelta(hours=2), 30)  # today
    add(now - timedelta(days=1), 45)  # Friday
    add(now - timedelta(days=2), 20)  # Thursday
    add(now - timedelta(days=4), 10)  # Tuesday: gap on Wednesday breaks the streak
    add(now - timedelta(days=9), 60)  # last week
    db.commit()

    assert study.summary(db, user, now) == {
        "minutes_today": 30,
        "minutes_week": 105,
        "streak_days": 3,
        "in_progress": False,
        "started_at": None,
        "planned_end": None,
    }
    study.start(db, user, now - timedelta(minutes=15))
    assert study.summary(db, user, now)["minutes_today"] == 45
    # no study yet today: the streak still counts up to yesterday
    assert study.summary(db, user, now + timedelta(days=1, hours=-9))["streak_days"] == 3


def test_delete_account_removes_everything(client, auth, db):
    client.put("/me/profile", headers=auth, json={"reply_language": "en"})
    sid = client.post("/tutor/sessions", headers=auth).json()["id"]
    client.post(f"/tutor/sessions/{sid}/messages", headers=auth, json={"message": "Bonjour"})
    client.post("/study/start", headers=auth)
    for model in (User, LearnerProfile, ChatSession, ChatTurn, StudySession):
        assert db.scalar(select(func.count()).select_from(model)) == 1

    assert client.delete("/auth/me", headers=auth).status_code == 204
    for model in (User, LearnerProfile, ChatSession, ChatTurn, StudySession):
        assert db.scalar(select(func.count()).select_from(model)) == 0
    assert client.get("/auth/me", headers=auth).status_code == 401


def test_delete_account_purges_agent_profile_and_sessions(client, auth, agent, db):
    user = db.scalar(select(User))
    pseudonym = learner_pseudonym(user.id)
    sid = client.post("/tutor/sessions", headers=auth).json()["id"]
    assert client.delete("/auth/me", headers=auth).status_code == 204
    calls = [(method, path) for method, path, _ in agent.calls]
    assert ("DELETE", f"/learner/{pseudonym}") in calls
    assert any(sid in str(request) for request in agent.calls)


UTC = timezone.utc


def add_session(db, user, start, minutes):
    db.add(StudySession(user_id=user.id, started_at=start, ended_at=start + timedelta(minutes=minutes)))
    db.commit()


def test_session_after_local_midnight_counts_for_the_new_day(client, auth, db):
    user = db.scalar(select(User))
    now = datetime(2026, 11, 18, 23, 30, tzinfo=UTC)  # 00:30 on 19 Nov in Tunis
    add_session(db, user, datetime(2026, 11, 18, 23, 10, tzinfo=UTC), 15)  # 00:10 local, today
    add_session(db, user, datetime(2026, 11, 18, 22, 30, tzinfo=UTC), 20)  # 23:30 local, yesterday
    assert study.summary(db, user, now)["minutes_today"] == 15


def test_streak_uses_local_days(client, auth, db):
    user = db.scalar(select(User))
    now = datetime(2026, 11, 19, 20, 0, tzinfo=UTC)
    add_session(db, user, datetime(2026, 11, 18, 23, 30, tzinfo=UTC), 10)  # 19 Nov local
    add_session(db, user, datetime(2026, 11, 18, 10, 0, tzinfo=UTC), 10)  # 18 Nov local
    assert study.summary(db, user, now)["streak_days"] == 2  # UTC sees one day (18 Nov): 1


def test_week_starts_on_local_monday(client, auth, db):
    user = db.scalar(select(User))
    now = datetime(2026, 11, 22, 23, 30, tzinfo=UTC)  # Sunday UTC = Monday 23 Nov 00:30 local
    add_session(db, user, datetime(2026, 11, 22, 22, 0, tzinfo=UTC), 30)  # Sunday 23:00 local
    add_session(db, user, datetime(2026, 11, 22, 23, 5, tzinfo=UTC), 10)  # Monday 00:05 local
    assert study.summary(db, user, now)["minutes_week"] == 10


def test_session_crossing_local_midnight_is_split(client, auth, db):
    user = db.scalar(select(User))
    now = datetime(2026, 11, 18, 23, 30, tzinfo=UTC)
    add_session(db, user, datetime(2026, 11, 18, 22, 50, tzinfo=UTC), 30)  # 23:50 to 00:20 local
    assert study.summary(db, user, now)["minutes_today"] == 20
