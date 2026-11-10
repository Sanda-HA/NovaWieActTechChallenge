from tests.conftest import register


def test_room_lifecycle_and_membership(client, auth, agent):
    guest = register(client, "invited")
    stranger = register(client, "stranger")
    base = "/groups/rooms"
    assert client.get(base).status_code == 401
    assert client.post(base, headers=auth, json={"name": " "}).status_code == 422
    created = client.post(base, headers=auth, json={"name": "  Révisions  "})
    assert created.status_code == 201
    room = created.json()
    assert room["name"] == "Révisions"
    assert room["members"] == ["eleve01"]
    detail = f"{base}/{room['id']}"
    assert client.get(detail, headers=stranger).status_code == 404
    assert client.get(base, headers=guest).json() == []
    assert client.post(detail + "/check", headers=guest, json={"explanation": "Un exemple."}).status_code == 404
    assert not agent.calls
    assert client.post(base + "/join", headers=guest, json={"code": room["id"]}).status_code == 404
    for _ in range(2):
        joined = client.post(base + "/join", headers=guest, json={"code": room["invite_code"]})
        assert joined.status_code == 200
        assert joined.json()["members"] == ["eleve01", "invited"]
        assert joined.json()["invite_code"] is None
    assert client.get(base, headers=guest).json() == [joined.json()]
    assert client.post(detail + "/check", headers=guest, json={"explanation": "Un exemple."}).status_code == 200
    assert client.delete(detail, headers=guest).status_code == 204
    assert client.get(detail, headers=guest).status_code == 404
    assert client.get(detail, headers=auth).json()["members"] == ["eleve01"]
    assert client.delete(detail, headers=auth).status_code == 204
    assert client.post(base + "/join", headers=guest, json={"code": room["invite_code"]}).status_code == 404
