import threading

from fastapi.testclient import TestClient

from src.main import app
from tests.conftest import register


def open_room(client, auth):
    return client.post("/groups/rooms", headers=auth, json={"name": "Révisions"}).json()


def join(client, headers, code):
    return client.post("/groups/rooms/join", headers=headers, json={"code": code})


def fill(client, room, count, prefix="m"):
    members = []
    for i in range(count):
        headers = register(client, f"{prefix}{i:03d}")
        assert join(client, headers, room["invite_code"]).status_code == 200
        members.append(headers)
    return members


def test_ninth_member_is_refused(client, auth):
    room = open_room(client, auth)
    fill(client, room, 7)
    late = join(client, register(client, "late01"), room["invite_code"])
    assert late.status_code == 409 and late.json()["detail"] == {"error": "room_full"}


def test_member_rejoining_full_room_is_not_refused(client, auth):
    room = open_room(client, auth)
    members = fill(client, room, 7)
    again = join(client, members[0], room["invite_code"])
    assert again.status_code == 200 and again.json()["already_member"] is True


def test_room_cap_holds_under_concurrent_joins(client, auth):
    room = open_room(client, auth)
    fill(client, room, 6)
    racers = [register(client, f"race{i}") for i in range(2)]
    codes = []

    def race(headers):
        with TestClient(app) as other:
            codes.append(join(other, headers, room["invite_code"]).status_code)

    threads = [threading.Thread(target=race, args=(h,)) for h in racers]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert sorted(codes) == [200, 409]


def test_owner_removes_member_and_code_changes(client, auth):
    room = open_room(client, auth)
    guest = fill(client, room, 1, prefix="guest")[0]
    removed = client.delete(f"/groups/rooms/{room['id']}/members/guest000", headers=auth)
    assert removed.status_code == 200
    assert "guest000" not in removed.json()["members"]
    new_code = removed.json()["invite_code"]
    assert new_code != room["invite_code"]
    gone = client.get(f"/groups/rooms/{room['id']}", headers=guest)
    assert gone.status_code == 404 and gone.json()["detail"] == {"error": "room_not_found"}
    assert join(client, guest, room["invite_code"]).json()["detail"] == {"error": "invite_not_found"}
    assert join(client, guest, new_code).status_code == 200


def test_only_owner_can_remove_or_transfer(client, auth):
    room = open_room(client, auth)
    guest = fill(client, room, 2, prefix="guest")[0]
    base = f"/groups/rooms/{room['id']}"
    assert client.delete(base + "/members/guest001", headers=guest).json()["detail"] == {"error": "not_room_owner"}
    assert client.post(base + "/owner", headers=guest, json={"pseudo": "guest001"}).status_code == 403


def test_owner_cannot_remove_self(client, auth):
    room = open_room(client, auth)
    r = client.delete(f"/groups/rooms/{room['id']}/members/eleve01", headers=auth)
    assert r.status_code == 409 and r.json()["detail"] == {"error": "cannot_remove_owner"}


def test_remove_unknown_member_is_404(client, auth):
    room = open_room(client, auth)
    r = client.delete(f"/groups/rooms/{room['id']}/members/nobody01", headers=auth)
    assert r.status_code == 404 and r.json()["detail"] == {"error": "member_not_found"}


def test_transfer_makes_the_member_owner(client, auth):
    room = open_room(client, auth)
    guest = fill(client, room, 1, prefix="guest")[0]
    base = f"/groups/rooms/{room['id']}"
    moved = client.post(base + "/owner", headers=auth, json={"pseudo": "guest000"})
    assert moved.status_code == 200 and moved.json()["owner"] is False
    assert moved.json()["owner_pseudo"] == "guest000"
    assert client.get(base, headers=guest).json()["owner"] is True
    assert client.delete(base, headers=auth).status_code == 204
    listed = client.get("/groups/rooms", headers=guest).json()
    assert [r["members"] for r in listed] == [["guest000"]]


def test_transfer_to_unknown_member_is_404(client, auth):
    room = open_room(client, auth)
    r = client.post(f"/groups/rooms/{room['id']}/owner", headers=auth, json={"pseudo": "nobody01"})
    assert r.status_code == 404 and r.json()["detail"] == {"error": "member_not_found"}


def test_older_posts_page(client, auth):
    room = open_room(client, auth)
    url = f"/groups/rooms/{room['id']}/posts"
    for i in range(60):
        assert client.post(url, headers=auth, json={"kind": "question", "text": f"q{i}"}).status_code == 201
    first = client.get(url, headers=auth).json()
    assert len(first) == 50 and first[0]["text"] == "q59"
    older = client.get(url, headers=auth, params={"before": first[-1]["id"]}).json()
    assert [p["text"] for p in older] == [f"q{i}" for i in range(9, -1, -1)]


def test_before_must_be_positive(client, auth):
    room = open_room(client, auth)
    assert client.get(f"/groups/rooms/{room['id']}/posts?before=0", headers=auth).status_code == 422
