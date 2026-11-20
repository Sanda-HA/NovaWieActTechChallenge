import httpx
import pytest

from src.manage import main
from tests.conftest import register

LIST = "/learning/mind-maps"
MAP = LIST + "/derivabilite"
PROFILE = {"section": "sciences_experimentales", "reply_language": "en"}


def map_artifact(document, title):
    sources = [{"chunk_id": f"{document}_chunk_{i:03}", "source": "Demo course",
                "page": i, "language": "fr", "excerpt": "A course excerpt."} for i in range(1, 4)]
    return {
        "root": {"id": "root", "label": title, "summary": None, "source_ids": [], "children": [
            {"id": f"b{i}", "label": f"Concept {i}", "summary": "Explanation.", "source_ids": [source["chunk_id"]],
             "children": []} for i, source in enumerate(sources, 1)
        ]},
        "sources": sources,
    }


ARTIFACT = map_artifact("math_4eme_se_002", "Differentiability")


def test_maps_require_the_profile_scope_and_generation_requires_pro(client, auth, agent):
    assert client.get(LIST).status_code == 401
    assert client.get(LIST, headers=auth).json()["chapters"] == []
    assert client.get(MAP, headers=auth).status_code == 404
    client.put("/me/profile", headers=auth, json=PROFILE)
    chapters = client.get(LIST, headers=auth).json()["chapters"]
    assert [chapter for chapter in chapters if chapter["subject"] == "svt"] == [
        {"topic": "immunite", "subject": "svt", "title": "Immunity"},
    ]
    assert client.get(MAP, headers=auth).json() == {"map": None, "update_available": False}
    assert client.post(MAP, headers=auth).json()["detail"]["feature"] == "mind_map"
    assert not agent.calls


@pytest.mark.parametrize(("topic", "document", "title", "subject"), [
    ("derivabilite", "math_4eme_se_002", "Differentiability", "math"),
    ("immunite", "svt_4eme_se_101", "Immunity", "svt"),
])
def test_map_is_saved_once_scoped_to_owner_and_language_and_cascades(client, auth, agent, db, topic, document, title, subject):
    from sqlalchemy import text

    path = f"{LIST}/{topic}"
    artifact = map_artifact(document, title)
    client.put("/me/profile", headers=auth, json=PROFILE)
    assert main(["set-plan", "eleve01", "pro"]) == 0
    agent.responses["/mind-map"] = httpx.Response(200, json=artifact)
    first = client.post(path, headers=auth)
    assert first.status_code == 200
    assert first.json()["map"]["root"] == artifact["root"]
    payload = agent.last("/mind-map")
    assert (payload["reply_language"], payload["subject"], payload["document_id"]) == ("en", subject, document)
    assert client.post(path, headers=auth).json() == first.json()
    assert len(agent.calls) == 1

    other = register(client, "eleve02")
    client.put("/me/profile", headers=other, json=PROFILE)
    assert client.get(path, headers=other).json()["map"] is None
    client.put("/me/profile", headers=auth, json={"reply_language": "fr"})
    assert client.get(path, headers=auth).json()["map"] is None
    client.put("/me/profile", headers=auth, json=PROFILE)
    assert main(["set-plan", "eleve01", "free"]) == 0
    assert client.get(path, headers=auth).json() == first.json()
    assert client.delete("/auth/me", headers=auth).status_code == 204
    assert db.scalar(text("SELECT count(*) FROM mind_maps")) == 0


def test_invalid_agent_response_does_not_save(client, auth, agent):
    client.put("/me/profile", headers=auth, json=PROFILE)
    assert main(["set-plan", "eleve01", "pro"]) == 0
    agent.responses["/mind-map"] = httpx.Response(200, json={"root": ARTIFACT["root"], "sources": []})
    assert client.post(MAP, headers=auth).status_code == 502
    assert client.get(MAP, headers=auth).json()["map"] is None


def test_update_failure_keeps_snapshot_and_concurrent_success_has_one_winner(client, auth, agent, monkeypatch):
    import asyncio
    from concurrent.futures import ThreadPoolExecutor
    from copy import deepcopy
    from dataclasses import replace
    from threading import Barrier

    from src.ai.interface import AgentClient
    from src.learning.mind_maps import CHAPTERS

    client.put("/me/profile", headers=auth, json=PROFILE)
    assert main(["set-plan", "eleve01", "pro"]) == 0
    agent.responses["/mind-map"] = httpx.Response(200, json=ARTIFACT)
    original = client.post(MAP, headers=auth).json()["map"]
    assert original["source_revision"] == 1
    monkeypatch.setitem(CHAPTERS, "derivabilite", replace(CHAPTERS["derivabilite"], source_revision=2))
    agent.responses["/mind-map"] = httpx.Response(503, json={"detail": {"retry_after": 10}})
    failure = client.post(MAP, headers=auth)
    assert failure.status_code == 503 and failure.headers["Retry-After"] == "10"
    assert client.get(MAP, headers=auth).json() == {"map": original, "update_available": True}

    both_generating = Barrier(2)

    async def generated(self, payload):
        index = await asyncio.to_thread(both_generating.wait, 10)
        result = deepcopy(ARTIFACT)
        result["root"]["children"][0]["summary"] = f"New explanation {index}."
        return result

    monkeypatch.setattr(AgentClient, "mind_map", generated)
    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(lambda _: client.post(MAP, headers=auth), range(2)))
    assert [response.status_code for response in responses] == [200, 200]
    assert responses[0].json() == responses[1].json()
    updated = responses[0].json()
    assert updated["map"]["source_revision"] == 2
    assert updated["update_available"] is False
    assert client.get(MAP, headers=auth).json() == updated
