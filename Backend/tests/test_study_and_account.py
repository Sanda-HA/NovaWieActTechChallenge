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
    assert summary == {"minutes_today": 0, "minutes_week": 0, "streak_days": 1, "in_progress": False, "started_at": None}


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
