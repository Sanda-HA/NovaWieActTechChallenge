from sqlalchemy import select

from src.auth.models import User
from src.auth.services import password_hash


def test_registration_defaults_to_french(client):
    response = client.post("/auth/register", json={"pseudo": "frdefault", "password": "motdepasse-test"})
    assert response.status_code == 201
    assert response.json()["language"] == "fr"


def test_direct_user_creation_defaults_to_french(db):
    db.add(User(pseudo="directdefault", password_hash=password_hash.hash("motdepasse-test")))
    db.commit()
    assert db.scalar(select(User)).language == "fr"
