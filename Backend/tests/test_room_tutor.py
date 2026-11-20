import asyncio
import json
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import httpx
import pytest
from sqlalchemy import select, text

from src.ai.interface import AgentClient
from src.manage import main
from tests.conftest import register
from tests.test_room_sessions import post, room, start  # noqa: F401


def change_settings(client, room, headers, **settings):
    return client.patch(room["url"] + "/settings", headers=headers, json=settings)


def consent(client, room, headers, **flags):
    return client.patch(room["url"] + "/consent", headers=headers, json=flags)


def ask(client, room, headers, *, key=None, **body):
    headers = dict(headers)
    if key is not None:
        headers["Idempotency-Key"] = key
    return client.post(
        room["url"] + "/session/tutor/requests", headers=headers, json={"kind": "hint", **body}
    )


def status(client, room, headers, job_id):
    return client.get(room["url"] + f"/session/tutor/requests/{job_id}", headers=headers)


def process(agent):
    from src.groups.room_tutor import run_one_job

    async def work():
        external = AgentClient("http://agent", transport=httpx.MockTransport(agent))
        try:
            return await run_one_job(external)
        finally:
            await external.aclose()

    return asyncio.run(work())


def tutor_posts(client, room, headers):
    return [p for p in client.get(room["url"] + "/posts", headers=headers).json() if p["kind"] == "tutor_reply"]


def good_response(agent):
    agent.responses["/room/tutor"] = httpx.Response(200, json={
        "text": "Compare les pentes à gauche et à droite.", "status": "generated",
    })


def prepare_remote_dispatch(client, room, auth):
    from src.groups import room_tutor

    queued = ask(client, room, auth)
    assert queued.status_code == 202
    dispatch = room_tutor._reserve()
    assert str(dispatch.job_id) == queued.json()["id"]
    assert room_tutor._preflight(dispatch) is not None
    return {"job_id": str(dispatch.job_id), "lease_token": str(dispatch.token)}


def permit(client, lease, phase):
    return client.post("/internal/room-tutor/permit", json={**lease, "phase": phase})


def test_room_worker_permits_each_phase_once_with_the_current_lease(client, auth, room):
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    lease = prepare_remote_dispatch(client, room, auth)
    assert "/internal/room-tutor/permit" not in client.get("/openapi.json").json()["paths"]
    assert permit(client, {**lease, "lease_token": str(uuid4())}, "retrieve").status_code == 403
    assert permit(client, lease, "infer").status_code == 403
    assert permit(client, lease, "retrieve").status_code == 204
    assert permit(client, lease, "retrieve").status_code == 403
    assert permit(client, lease, "infer").status_code == 204
    assert permit(client, lease, "infer").status_code == 403


def test_provider_permit_is_denied_after_consent_withdrawal_in_another_request(
    client, auth, agent, room, monkeypatch,
):
    monkeypatch.setenv("ROOM_TUTOR_ALLOW_RAW_TEXT", "true")
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    assert consent(client, room, auth, allow_ai_text=True).status_code == 200
    assert post(client, auth, room, "question", "Pourquoi la pente change-t-elle ?").status_code == 201
    lease = prepare_remote_dispatch(client, room, auth)
    assert permit(client, lease, "retrieve").status_code == 204
    assert consent(client, room, auth, allow_ai_text=False).status_code == 200
    assert permit(client, lease, "infer").status_code == 403
    assert status(client, room, auth, lease["job_id"]).json()["state"] == "cancelled"
    assert agent.calls == []


def test_remote_permit_rechecks_the_handed_off_payload_without_storing_text(client, auth, room, monkeypatch, db):
    from src.groups.models import RoomTutorJob

    monkeypatch.setenv("ROOM_TUTOR_ALLOW_RAW_TEXT", "true")
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    assert consent(client, room, auth, allow_ai_text=True).status_code == 200
    assert post(client, auth, room, "question", "Quelle pente comparer ?").status_code == 201
    lease = prepare_remote_dispatch(client, room, auth)
    fingerprint = db.get(RoomTutorJob, UUID(lease["job_id"])).payload_digest
    assert len(bytes.fromhex(fingerprint)) == 32
    db.rollback()
    monkeypatch.delenv("ROOM_TUTOR_ALLOW_RAW_TEXT")
    assert permit(client, lease, "retrieve").status_code == 403


def test_tutor_settings_default_off_and_follow_the_current_owner(client, auth, room):
    guest = room["guest"]
    initial = client.get(room["url"], headers=auth).json()
    assert initial["tutor_enabled"] is False
    assert initial["tutor_round_prompts"] is False
    assert change_settings(client, room, guest, tutor_enabled=True).status_code == 403
    enabled = change_settings(client, room, auth, tutor_enabled=True)
    assert enabled.status_code == 200 and enabled.json()["tutor_enabled"] is True
    assert enabled.json()["tutor_version"] > initial["tutor_version"]
    assert client.post(room["url"] + "/owner", headers=auth, json={"pseudo": "invited"}).status_code == 200
    assert change_settings(client, room, auth, tutor_enabled=False).status_code == 403
    assert change_settings(client, room, guest, tutor_enabled=False).json()["tutor_enabled"] is False


def test_consents_are_independent_member_choices(client, auth, room, monkeypatch):
    monkeypatch.delenv("ROOM_TUTOR_ALLOW_RAW_TEXT", raising=False)
    fields = ("allow_ai_text", "allow_solo_context", "allow_personalization", "allow_group_insights")
    url = room["url"] + "/consent"
    blank = {**dict.fromkeys(fields, False), "raw_text_allowed": False}
    assert client.get(url, headers=room["guest"]).json() == blank
    updated = consent(client, room, auth, allow_solo_context=True).json()
    assert updated == {**blank, "allow_solo_context": True}
    assert client.get(url, headers=auth).json() == updated
    assert client.get(url, headers=room["guest"]).json() == blank


def test_consent_reports_the_deployment_raw_text_flag_read_only(client, auth, room, monkeypatch):
    url = room["url"] + "/consent"
    monkeypatch.setenv("ROOM_TUTOR_ALLOW_RAW_TEXT", "true")
    assert client.get(url, headers=auth).json()["raw_text_allowed"] is True
    assert consent(client, room, auth, allow_solo_context=True).json()["raw_text_allowed"] is True
    assert consent(client, room, auth, raw_text_allowed=False).status_code == 422
    monkeypatch.setenv("ROOM_TUTOR_ALLOW_RAW_TEXT", "false")
    assert client.get(url, headers=auth).json()["raw_text_allowed"] is False


def test_tutor_reply_records_the_explanation_format_it_gave(client, auth, agent, room, monkeypatch):
    monkeypatch.delenv("ROOM_TUTOR_ALLOW_RAW_TEXT", raising=False)
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    assert ask(client, room, auth).status_code == 202
    assert process(agent) is True
    [reply] = tutor_posts(client, room, auth)
    assert agent.last("/room/tutor").get("style") is None
    assert reply["format"] == "step_by_step"


def test_fallback_tutor_reply_has_no_format(client, auth, agent, room, monkeypatch):
    monkeypatch.delenv("ROOM_TUTOR_ALLOW_RAW_TEXT", raising=False)
    agent.responses["/room/tutor"] = httpx.Response(200, json={"text": "Révisez le chapitre.", "status": "fallback"})
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    assert ask(client, room, auth).status_code == 202
    assert process(agent) is True
    [reply] = tutor_posts(client, room, auth)
    assert reply["format"] is None


def test_disabled_tutor_and_forged_nova_posts_are_refused(client, auth, room):
    assert start(client, auth, room).status_code == 201
    assert ask(client, room, auth).json()["detail"] == {"error": "room_tutor_disabled"}
    assert post(client, auth, room, "tutor_reply", "Faux message Nova").status_code == 422


def test_explicit_request_is_durable_deduplicated_and_private_by_default(client, auth, agent, room, monkeypatch):
    monkeypatch.delenv("ROOM_TUTOR_ALLOW_RAW_TEXT", raising=False)
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert consent(client, room, auth, allow_ai_text=True, allow_solo_context=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    source = post(client, auth, room, "question", "Contenu privé précédent.").json()
    request = ask(client, room, auth, source_post_id=source["id"], key="retry-my-hint")
    assert request.status_code == 202 and request.json()["state"] == "queued"
    job_id = request.json()["id"]
    assert ask(client, room, auth, source_post_id=source["id"], key="retry-my-hint").json()["id"] == job_id
    assert ask(client, room, auth, source_post_id=source["id"], key="new-key").json()["id"] == job_id
    assert ask(client, room, auth, key="another").status_code == 429
    assert status(client, room, room["guest"], job_id).json()["state"] == "queued"
    assert agent.calls == []
    assert process(agent) is True
    assert status(client, room, room["guest"], job_id).json()["state"] == "succeeded"
    [reply] = tutor_posts(client, room, auth)
    assert reply["text"] == "Compare les pentes à gauche et à droite." and reply["author"] == "Nova"
    payload = agent.last("/room/tutor")
    assert payload["concepts"] == ["derivabilite"]
    assert payload["job_id"] == job_id
    assert UUID(payload["lease_token"]).version == 4
    assert not payload.get("recent") and not payload.get("question")
    assert room["url"].split("/")[-1] not in json.dumps(payload)
    assert process(agent) is False


def test_raw_opt_in_excludes_older_and_unconsented_authors_posts(client, auth, agent, room, monkeypatch):
    monkeypatch.setenv("ROOM_TUTOR_ALLOW_RAW_TEXT", "true")
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    post(client, auth, room, "explanation", "Préconsentement.")
    assert consent(client, room, auth, allow_ai_text=True).status_code == 200
    post(client, room["guest"], room, "question", "Question de l'invité.")
    post(client, auth, room, "question", "Adresse: math@example.com")
    source = post(client, auth, room, "question", "Pourquoi les pentes diffèrent ?").json()
    assert ask(client, room, auth, source_post_id=source["id"]).status_code == 202
    assert process(agent)
    payload = agent.last("/room/tutor")
    assert payload["question"] == "Pourquoi les pentes diffèrent ?"
    assert payload.get("recent", []) == []


def test_withdrawing_consent_purges_only_existing_contextual_replies(client, auth, agent, room, monkeypatch):
    from src.groups import room_tutor

    monkeypatch.setenv("ROOM_TUTOR_ALLOW_RAW_TEXT", "true")
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    first = ask(client, room, auth, key="concept-only").json()["id"]
    assert process(agent)
    assert consent(client, room, auth, allow_ai_text=True).status_code == 200
    source = post(client, auth, room, "question", "Où la pente devient-elle nulle ?").json()
    future = datetime.now(UTC) + timedelta(seconds=31)
    monkeypatch.setattr(room_tutor, "_now", lambda: future)
    second = ask(client, room, auth, source_post_id=source["id"]).json()["id"]
    assert process(agent)
    assert agent.last("/room/tutor")["question"] == source["text"]
    assert len(tutor_posts(client, room, auth)) == 2
    assert consent(client, room, auth, allow_ai_text=False).status_code == 200
    retained = status(client, room, auth, first).json()
    withdrawn = status(client, room, auth, second).json()
    assert retained["state"] == "succeeded"
    assert withdrawn["state"] == "cancelled" and withdrawn["result_post_id"] is None
    assert [int(reply["id"]) for reply in tutor_posts(client, room, auth)] == [retained["result_post_id"]]


def test_personalization_requires_three_opted_in_contributors_per_bucket(client, auth, agent, room, monkeypatch):
    from src.groups import room_tutor

    guest = room["guest"]
    third = register(client, "third01")
    assert main(["set-plan", "third01", "pro"]) == 0
    invite = client.get(room["url"], headers=auth).json()["invite_code"]
    assert client.post("/groups/rooms/join", headers=third, json={"code": invite}).status_code == 200
    for headers in (auth, guest, third):
        assert client.put("/me/profile", headers=headers, json={
            "preferred_format": "steps", "level": "advanced", "city": "Tunis",
        }).status_code == 200
        assert consent(client, room, headers, allow_personalization=True).status_code == 200
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    for headers in (auth, guest, third):
        post(client, headers, room, "explanation", "J'ai comparé les pentes.")
    now = datetime.now(UTC)
    monkeypatch.setattr(room_tutor, "_now", lambda: now)
    assert ask(client, room, auth, key="separate-consent").status_code == 202 and process(agent)
    payload = agent.last("/room/tutor")
    assert "style" not in payload and "level" not in payload
    for headers in (auth, guest):
        assert consent(client, room, headers, allow_solo_context=True).status_code == 200
    now += timedelta(seconds=31)
    assert ask(client, room, auth, key="two-participants").status_code == 202 and process(agent)
    payload = agent.last("/room/tutor")
    assert "style" not in payload and "level" not in payload
    assert consent(client, room, third, allow_solo_context=True).status_code == 200
    now += timedelta(seconds=31)
    assert ask(client, room, auth, key="three-participants").status_code == 202 and process(agent)
    payload = agent.last("/room/tutor")
    assert payload["style"] == "step_by_step" and payload["level"] == "solide"
    assert "Tunis" not in json.dumps(payload)


def test_curated_child_concept_can_be_requested_under_the_room_topic(client, auth, agent, room):
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    assert ask(client, room, auth, concepts=["variables_aleatoires"]).status_code == 422
    assert ask(client, room, auth, concepts=["chain_rule"]).status_code == 202 and process(agent)
    payload = agent.last("/room/tutor")
    assert payload["topic"] == "derivabilite" and payload["concepts"] == ["chain_rule"]


def test_tutor_adds_threshold_qualified_curriculum_concepts_and_purges_them_on_withdrawal(
    client, auth, agent, room, db,
):
    from src.auth.models import User
    from src.groups.group_memory_models import GroupConceptEvidence

    third = register(client, "third01")
    assert main(["set-plan", "third01", "pro"]) == 0
    invite = client.get(room["url"], headers=auth).json()["invite_code"]
    assert client.post("/groups/rooms/join", headers=third, json={"code": invite}).status_code == 200
    for headers in (auth, room["guest"], third):
        assert consent(client, room, headers, allow_group_insights=True).status_code == 200
    room_id = UUID(room["url"].split("/")[-1])
    for user_id in db.scalars(select(User.id)):
        for concept in ("chain_rule", "unrelated_concept"):
            db.add(GroupConceptEvidence(
                room_id=room_id, user_id=user_id, activity="sample-duel", concept=concept,
                signal="missed", topic="derivabilite", count=1, personal=False, shared=True,
                created_at=datetime.now(UTC),
            ))
    db.commit()
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    job_id = ask(client, room, auth).json()["id"]
    assert process(agent)
    assert agent.last("/room/tutor")["concepts"] == ["derivabilite", "chain_rule"]
    assert consent(client, room, third, allow_group_insights=False).status_code == 200
    assert status(client, room, auth, job_id).json()["state"] == "cancelled"
    assert tutor_posts(client, room, auth) == []


def test_disabling_invalidates_a_queued_request_even_after_reenable(client, auth, agent, room):
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    job_id = ask(client, room, auth).json()["id"]
    assert change_settings(client, room, auth, tutor_enabled=False).status_code == 200
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert status(client, room, auth, job_id).json()["state"] == "cancelled"
    assert process(agent) is False
    assert tutor_posts(client, room, auth) == [] and agent.calls == []


def test_free_participant_request_is_sponsored_by_the_pro_host(client, auth, agent, room):
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    assert main(["set-plan", "invited", "free"]) == 0
    job_id = ask(client, room, room["guest"]).json()["id"]
    assert process(agent)
    assert status(client, room, room["guest"], job_id).json()["state"] == "succeeded"


def test_queued_tutor_job_is_cancelled_when_neither_requester_nor_host_is_pro(client, auth, agent, room):
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    job_id = ask(client, room, room["guest"]).json()["id"]
    assert main(["set-plan", "invited", "free"]) == 0
    assert main(["set-plan", "eleve01", "free"]) == 0
    process(agent)
    assert main(["set-plan", "eleve01", "pro"]) == 0
    assert status(client, room, auth, job_id).json()["state"] == "cancelled"
    assert agent.calls == []


def test_round_prompts_require_opt_in_and_never_use_the_discussion(client, auth, agent, room):
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True, tutor_round_prompts=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    post(client, auth, room, "explanation", "Un texte personnel.")
    for _ in range(3):
        assert client.get(room["url"] + "/session", headers=room["guest"]).status_code == 200
    assert process(agent) is False
    assert client.post(room["url"] + "/session/next", headers=auth).status_code == 200
    assert agent.calls == []
    assert process(agent)
    assert tutor_posts(client, room, auth)[0]["text"].startswith("Compare")
    payload = agent.last("/room/tutor")
    assert payload["kind"] == "round_end"
    assert not payload.get("recent") and "personnel" not in json.dumps(payload)


@pytest.mark.parametrize("reply", [
    {"text": "@invited", "status": "blocked"},
    {"text": "@invited", "status": "generated"},
    {"text": "", "status": "generated"},
    {"text": "Nul\x00byte", "status": "generated"},
])
def test_blocked_or_invalid_output_does_not_become_a_room_post(client, auth, agent, room, reply):
    agent.responses["/room/tutor"] = httpx.Response(200, json=reply)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    job_id = ask(client, room, auth).json()["id"]
    assert process(agent)
    assert status(client, room, auth, job_id).json()["state"] == "failed"
    assert tutor_posts(client, room, auth) == []


def test_disabling_during_inference_cancels_publication(client, auth, room):
    from src.groups.room_tutor import run_one_job

    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    job_id = ask(client, room, auth).json()["id"]

    async def race():
        inference_started = asyncio.Event()
        release = asyncio.Event()

        async def respond(request):
            inference_started.set()
            await release.wait()
            return httpx.Response(200, json={"text": "Une réponse tardive.", "status": "generated"})

        external = AgentClient("http://agent", transport=httpx.MockTransport(respond))
        try:
            job = asyncio.create_task(run_one_job(external))
            await asyncio.wait_for(inference_started.wait(), 5)
            assert (await asyncio.to_thread(change_settings, client, room, auth, tutor_enabled=False)).status_code == 200
            release.set()
            assert await asyncio.wait_for(job, 5)
        finally:
            await external.aclose()

    asyncio.run(race())
    assert status(client, room, auth, job_id).json()["state"] == "cancelled"
    assert tutor_posts(client, room, auth) == []


def test_end_summary_is_reserved_with_concept_only_context(client, auth, agent, room):
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True, tutor_round_prompts=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    post(client, auth, room, "explanation", "Texte à ne pas résumer.")
    assert client.post(room["url"] + "/session/end", headers=auth).status_code == 200
    assert agent.calls == [] and process(agent)
    payload = agent.last("/room/tutor")
    assert payload["kind"] == "session_summary" and payload["concepts"] == ["derivabilite"]
    assert not payload.get("recent") and not payload.get("question")


def test_cooldown_and_routine_budget_leave_the_end_summary_available(client, auth, agent, room, monkeypatch, db):
    from src.groups import group_memory, room_tutor

    now = datetime.now(UTC)
    monkeypatch.setattr(room_tutor, "_now", lambda: now)
    good_response(agent)
    assert change_settings(client, room, auth, tutor_enabled=True, tutor_round_prompts=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    for i in range(12):
        assert ask(client, room, auth, key=f"request-{i}").status_code == 202
        assert process(agent)
        assert ask(client, room, auth, key="try-during-cooldown").status_code == 429
        now += timedelta(seconds=31)
    assert ask(client, room, auth, key="one-too-many").status_code == 429
    group_memory.expire(db, now + timedelta(days=31))
    assert ask(client, room, auth, key="after-expiry-cleanup").status_code == 429
    assert client.post(room["url"] + "/session/end", headers=auth).status_code == 200
    assert process(agent)
    assert agent.last("/room/tutor")["kind"] == "session_summary"


def test_expired_reservation_is_terminal_without_replaying_the_model(client, auth, agent, room, monkeypatch):
    from src.groups import room_tutor

    now = datetime.now(UTC)
    monkeypatch.setattr(room_tutor, "_now", lambda: now)
    assert change_settings(client, room, auth, tutor_enabled=True).status_code == 200
    assert start(client, auth, room).status_code == 201
    job_id = ask(client, room, auth).json()["id"]
    room_tutor._reserve()  # Simulate a worker stopping immediately after persisting its lease.
    assert status(client, room, auth, job_id).json()["state"] == "running"
    assert process(agent) is False
    now += timedelta(minutes=2)
    assert process(agent) is True
    assert status(client, room, auth, job_id).json()["state"] == "failed"
    assert agent.calls == []


def test_upgrade_removes_legacy_nudges_and_notes_and_preserves_student_posts(client, auth, room, db):
    from alembic import command
    from alembic.config import Config

    from src.auth.models import User
    from tests.conftest import ALEMBIC_INI

    room_id = UUID(room["url"].split("/")[-1])
    author = db.scalar(select(User.id).where(User.pseudo == "eleve01"))
    db.rollback()
    cfg = Config(str(ALEMBIC_INI))
    command.downgrade(cfg, "9bf225216df8")
    try:
        session_id = db.scalar(text("""
            INSERT INTO room_sessions (room_id, topic, goal, lang, round, started_at, notes, last_active, prompted)
            VALUES (:room, 'derivabilite', 'Réviser les dérivées.', 'fr', 'ended', now(),
                CAST(:notes AS jsonb), CAST(:stamps AS jsonb), CAST(:stamps AS jsonb))
            RETURNING id
        """), {"room": room_id, "notes": json.dumps(["Ancien résumé confidentiel."]),
               "stamps": json.dumps({str(author): datetime.now(UTC).isoformat()})})
        db.execute(text("""
            INSERT INTO room_posts (room_id, session_id, kind, text, author, author_id, created_at)
            VALUES (:room, :session, 'prompt', '@eleve01, parle-nous de la dérivée.', 'Nova', NULL, now()),
                   (:room, :session, 'explanation', 'Une explication à conserver.', 'eleve01', :author, now())
        """), {"room": room_id, "session": session_id, "author": author})
        db.commit()
    finally:
        db.rollback()
        command.upgrade(cfg, "head")
    session = client.get(room["url"] + "/session", headers=auth).json()
    assert session["notes"] == []
    assert [(p["kind"], p["text"]) for p in client.get(room["url"] + "/posts", headers=auth).json()] == [
        ("explanation", "Une explication à conserver."),
    ]
    assert db.execute(text("SELECT last_active, prompted FROM room_sessions WHERE id = :id"),
                      {"id": session_id}).one() == ({}, {})
