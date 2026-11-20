from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from threading import Barrier

import pytest
from sqlalchemy import text

from src.manage import main
from tests.conftest import register


BLUEPRINT = "derivabilite-fr-v1"


def keyed(headers, key):
    return {**headers, "Idempotency-Key": key}


@pytest.fixture
def players(client, auth):
    guest = register(client, "eleve02")
    spectator = register(client, "eleve03")
    for pseudo in ("eleve01", "eleve02", "eleve03"):
        assert main(["set-plan", pseudo, "pro"]) == 0
    room = client.post("/groups/rooms", headers=auth, json={"name": "Duel"}).json()
    for player in (guest, spectator):
        response = client.post("/groups/rooms/join", headers=player, json={"code": room["invite_code"]})
        assert response.status_code == 200
    return f"/groups/rooms/{room['id']}/duels", auth, guest, spectator


def invite(client, players, key="invite", named=True):
    path, owner, _, _ = players
    body = {"blueprint_id": BLUEPRINT}
    if named:
        body["opponent_pseudo"] = "eleve02"
    response = client.post(path, headers=keyed(owner, key), json=body)
    assert response.status_code == 201, response.text
    return response.json()


def start(client, players, key="invite"):
    path, owner, guest, _ = players
    created = invite(client, players, key)
    duel_path = f"{path}/{created['duel_id']}"
    assert client.post(f"{duel_path}/accept", headers=keyed(guest, f"accept:{key}")).status_code == 200
    for headers in (owner, guest):
        response = client.put(f"{duel_path}/ready", headers=keyed(headers, f"ready:{key}"), json={"ready": True})
        assert response.status_code == 200, response.text
    return duel_path, response.json()


@pytest.fixture
def now(monkeypatch):
    from src.groups import duel_services

    stamps = [datetime(2026, 12, 1, 12, tzinfo=UTC)]
    monkeypatch.setattr(duel_services, "server_now", lambda db: stamps[0])

    def advance(seconds):
        stamps[0] += timedelta(seconds=seconds)

    return advance


def save(client, path, headers, question_id, answer, revision, key="answer"):
    return client.put(
        f"{path}/attempt/answers/{question_id}",
        headers=keyed(headers, key),
        json={"answer": answer, "expected_revision": revision},
    )


def submit(client, path, headers, revision, key="submit"):
    return client.post(f"{path}/attempt/submit", headers=keyed(headers, key), json={"expected_revision": revision})


def test_named_invite_is_discoverable_only_to_invitee(client, players):
    path, owner, guest, spectator = players
    created = invite(client, players)
    assert created["status"] == "invited"
    assert created.get("invite_code") is None
    assert client.get(path, headers=guest).json()["items"][0]["duel_id"] == created["duel_id"]
    assert client.get(path, headers=spectator).json()["items"] == []
    assert client.get(f"{path}/{created['duel_id']}", headers=spectator).status_code == 404
    replay = invite(client, players)
    assert replay == created
    duplicate = client.post(path, headers=keyed(owner, "other"), json={"blueprint_id": BLUEPRINT})
    assert duplicate.status_code == 409


def test_live_players_share_questions_progress_and_final_result(client, db, players, now, agent):
    _, owner, guest, spectator = players
    path, scheduled = start(client, players)
    assert scheduled["status"] == "scheduled"
    start_at = datetime.fromisoformat(scheduled["starts_at"])
    deadline = datetime.fromisoformat(scheduled["deadline_at"])
    assert deadline - start_at == timedelta(seconds=180)
    assert client.get(f"{path}/exam", headers=owner).status_code == 409
    assert client.get(f"{path}/exam", headers=spectator).status_code == 404
    now(5)
    exam_response = client.get(f"{path}/exam", headers=owner)
    assert exam_response.status_code == 200, exam_response.text
    exam = exam_response.json()
    assert exam == client.get(f"{path}/exam", headers=guest).json()
    assert len(exam["questions"]) == 5
    assert all(set(q) <= {"id", "kind", "prompt", "choices", "points"} for q in exam["questions"])
    snapshot = db.scalar(text("SELECT snapshot FROM duel_exams WHERE duel_id = :id"), {"id": scheduled["duel_id"]})
    item = snapshot["items"][0]
    correct = item["answer"]
    wrong = (
        {"choice_id": next(c["id"] for c in item["choices"] if c["id"] != correct["choice_id"])}
        if item["kind"] == "choice" else {"value": "-9876543"}
    )
    answer = save(client, path, owner, item["id"], correct, 0)
    assert answer.status_code == 200, answer.text
    assert answer.json()["revision"] == 1
    assert save(client, path, owner, item["id"], correct, 0).json() == answer.json()
    assert save(client, path, owner, item["id"], wrong, 0, "stale").status_code == 409
    peer = client.get(path, headers=guest).json()["players"][0]
    assert peer["answered_count"] == 1
    assert set(peer) == {"slot", "pseudo", "ready", "answered_count", "submission_state"}
    assert client.get(f"{path}/attempt", headers=guest).json()["answers"] == {}
    assert client.get(f"{path}/attempt", headers=owner).json()["answers"] == {item["id"]: correct}
    first = submit(client, path, owner, 1)
    assert first.status_code == 200 and first.json().get("result") is None
    assert client.get(f"{path}/result", headers=owner).status_code == 202
    assert save(client, path, owner, item["id"], wrong, 1, "locked").status_code == 409
    assert save(client, path, guest, item["id"], wrong, 0).status_code == 200
    assert submit(client, path, guest, 1).json()["result"]["winner_slot"] == 1
    assert submit(client, path, owner, 1).json() == first.json()
    guest_result = client.get(f"{path}/result", headers=guest).json()
    assert guest_result["outcome"] == "win"
    assert guest_result["scores"] == {"1": item["points"], "2": 0}
    correction = next(x for x in guest_result["my_corrections"] if x["question_id"] == item["id"])
    assert correction["correct"] is False
    assert client.get(f"{path}/result", headers=spectator).status_code == 404
    assert agent.calls == []


def test_deadline_finalizes_unsubmitted_drafts_without_polling(client, db, players, now):
    from src.groups import duel_services

    _, owner, guest, _ = players
    path, state = start(client, players)
    now(5)
    snapshot = db.scalar(text("SELECT snapshot FROM duel_exams WHERE duel_id = :id"), {"id": state["duel_id"]})
    item = snapshot["items"][0]
    db.rollback()
    assert save(client, path, owner, item["id"], item["answer"], 0).status_code == 200
    now(180)
    assert duel_services.sweep_deadlines(db) == 1
    assert duel_services.sweep_deadlines(db) == 0
    assert save(client, path, guest, item["id"], item["answer"], 0).status_code == 409
    final = client.get(f"{path}/result", headers=guest).json()
    assert final["winner_slot"] == 1
    assert final["scores"] == {"1": item["points"], "2": 0}


def test_single_use_code_and_expiration(client, players, now):
    path, _, guest, spectator = players
    first = invite(client, players, named=False)
    code = first["invite_code"]
    assert invite(client, players, named=False)["invite_code"] == code
    now(301)
    expired = client.post(f"{path}/join", headers=keyed(guest, "expired"), json={"code": code})
    assert expired.status_code == 410
    second = invite(client, players, key="second", named=False)
    body = {"code": second["invite_code"]}
    joined = client.post(f"{path}/join", headers=keyed(guest, "join"), json=body)
    assert joined.status_code == 200, joined.text
    assert client.post(f"{path}/join", headers=keyed(guest, "join"), json=body).json() == joined.json()
    assert client.post(f"{path}/join", headers=keyed(spectator, "join"), json=body).status_code == 404


def test_invite_code_is_kept_for_creator_only_while_open(client, players, now):
    path, owner, guest, spectator = players
    created = invite(client, players, named=False)
    code = created["invite_code"]
    detail = f"{path}/{created['duel_id']}"
    assert client.get(detail, headers=owner).json()["invite_code"] == code
    assert client.get(path, headers=owner).json()["items"][0]["invite_code"] == code
    assert client.get(detail, headers=spectator).status_code == 404
    assert client.get(path, headers=spectator).json()["items"] == []
    joined = client.post(f"{path}/join", headers=keyed(guest, "join"), json={"code": code})
    assert joined.status_code == 200
    assert joined.json().get("invite_code") is None
    assert client.get(detail, headers=guest).json().get("invite_code") is None
    assert client.get(path, headers=guest).json()["items"][0].get("invite_code") is None
    assert client.get(detail, headers=owner).json().get("invite_code") is None


def test_named_invite_never_exposes_a_code(client, players):
    path, owner, guest, _ = players
    created = invite(client, players)
    assert client.get(f"{path}/{created['duel_id']}", headers=owner).json().get("invite_code") is None
    assert client.get(path, headers=guest).json()["items"][0].get("invite_code") is None


def test_removing_a_player_releases_the_live_room(client, players, now):
    base, owner, guest, _ = players
    path, _ = start(client, players)
    now(5)
    room_path = base.removesuffix("/duels")
    assert client.delete(f"{room_path}/members/eleve02", headers=owner).status_code == 200
    assert client.get(path, headers=guest).status_code == 404
    assert client.get(path, headers=owner).json()["status"] == "cancelled"
    assert invite(client, players, key="next", named=False)["status"] == "invited"


def test_group_review_uses_only_callers_opted_in_evidence(client, db, players, now, agent):
    base, owner, guest, _ = players
    room_path = base.removesuffix("/duels")
    assert client.patch(f"{room_path}/consent", headers=owner, json={"allow_personalization": True}).status_code == 200
    path, state = start(client, players)
    now(5)
    snapshot = db.scalar(text("SELECT snapshot FROM duel_exams WHERE duel_id = :id"), {"id": state["duel_id"]})
    item = snapshot["items"][0]
    assert save(client, path, guest, item["id"], item["answer"], 0).status_code == 200
    assert submit(client, path, owner, 0).status_code == 200
    assert submit(client, path, guest, 1).status_code == 200
    agent.unreachable = True
    review = client.get("/learning/group-review", headers=owner)
    assert review.status_code == 200
    assert review.json()["items"][0]["topic"] == "derivabilite"
    assert client.get("/learning/group-review", headers=guest).json() == {"items": []}
    assert client.patch(f"{room_path}/consent", headers=owner, json={"allow_personalization": False}).status_code == 200
    assert client.get("/learning/group-review", headers=owner).json() == {"items": []}


def test_concurrent_submissions_publish_one_result(client, db, players, now):
    _, owner, guest, _ = players
    path, state = start(client, players)
    now(5)
    snapshot = db.scalar(text("SELECT snapshot FROM duel_exams WHERE duel_id = :id"), {"id": state["duel_id"]})
    item = snapshot["items"][0]
    db.rollback()
    for headers in (owner, guest):
        assert save(client, path, headers, item["id"], item["answer"], 0).status_code == 200

    barrier = Barrier(2, timeout=5)

    def finish(headers):
        barrier.wait()
        return submit(client, path, headers, 1)

    with ThreadPoolExecutor(max_workers=2) as pool:
        receipts = list(pool.map(finish, (owner, guest)))
    assert all(response.status_code == 200 for response in receipts)
    assert sum(response.json()["result"] is not None for response in receipts) == 1
    result = client.get(f"{path}/result", headers=owner).json()
    assert result["outcome"] == "draw"
    assert result["winner_slot"] is None
    assert result["scores"] == {"1": item["points"], "2": item["points"]}


def test_account_deletion_scrubs_opponent_attempt_and_result(client, db, players, now):
    _, owner, guest, _ = players
    path, state = start(client, players)
    now(5)
    snapshot = db.scalar(text("SELECT snapshot FROM duel_exams WHERE duel_id = :id"), {"id": state["duel_id"]})
    item = snapshot["items"][0]
    for headers in (owner, guest):
        assert save(client, path, headers, item["id"], item["answer"], 0).status_code == 200
        assert submit(client, path, headers, 1).status_code == 200

    assert client.delete("/auth/me", headers=guest).status_code == 204
    result = client.get(f"{path}/result", headers=owner).json()
    assert result["scores"] == {"1": item["points"]}
    assert result["winner_slot"] is None
    assert client.get(path, headers=owner).json()["players"][1]["pseudo"] is None
    purged = db.execute(
        text("SELECT user_id, answers, grades FROM duel_attempts WHERE duel_id = :id AND slot = 2"),
        {"id": state["duel_id"]},
    ).one()
    assert tuple(purged) == (None, {}, {})


def test_member_removal_at_deadline_keeps_saved_scores(client, db, players, now):
    base, owner, guest, _ = players
    path, state = start(client, players)
    now(5)
    snapshot = db.scalar(text("SELECT snapshot FROM duel_exams WHERE duel_id = :id"), {"id": state["duel_id"]})
    item = snapshot["items"][0]
    assert save(client, path, owner, item["id"], item["answer"], 0).status_code == 200
    now(180)

    assert client.delete(f"{base.removesuffix('/duels')}/members/eleve02", headers=owner).status_code == 200
    result = client.get(f"{path}/result", headers=owner)
    assert result.status_code == 200, result.text
    assert result.json()["scores"] == {"1": item["points"], "2": 0}
    assert client.get(f"{path}/result", headers=guest).status_code == 404


def test_rematch_uses_fresh_ids_and_corrections_keep_bank_keys_private(client, db, players, now, monkeypatch):
    from src.groups import duel_services

    monkeypatch.setattr(duel_services.secrets, "randbits", lambda bits: 23)
    _, owner, guest, _ = players
    path, state = start(client, players)
    now(5)
    first = client.get(f"{path}/exam", headers=owner).json()["questions"]
    item = db.scalar(text("SELECT snapshot FROM duel_exams WHERE duel_id = :id"), {"id": state["duel_id"]})["items"][0]
    assert save(client, path, owner, item["id"], item["answer"], 0).status_code == 200
    assert submit(client, path, owner, 1).status_code == 200
    assert submit(client, path, guest, 0).status_code == 200
    result = client.get(f"{path}/result", headers=owner).json()
    assert all(set(row) == {"question_id", "concept", "correct", "points", "max_points"}
               for row in result["my_corrections"])

    path, _ = start(client, players, key="rematch")
    now(5)
    second = client.get(f"{path}/exam", headers=owner).json()["questions"]
    assert [q["prompt"] for q in first] == [q["prompt"] for q in second]
    assert {q["id"] for q in first}.isdisjoint(q["id"] for q in second)
    assert {c["id"] for q in first for c in q["choices"]}.isdisjoint(c["id"] for q in second for c in q["choices"])
