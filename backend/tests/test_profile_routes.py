from contextlib import contextmanager

from fastapi.testclient import TestClient

from app.db.models import User
from main import app


client = TestClient(app)


class FakeDb:
    def __init__(self):
        self.committed = False
        self.refreshed_user = None

    def commit(self):
        self.committed = True

    def refresh(self, user):
        self.refreshed_user = user


def session_factory(fake_db):
    @contextmanager
    def session_context():
        yield fake_db

    return session_context


def firebase_user():
    return {
        "uid": "firebase-profile-user",
        "email": "profile@example.com",
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"},
    }


def app_user():
    return User(
        firebase_uid="firebase-profile-user",
        auth_provider="firebase",
        email="profile@example.com",
        first_name="Profile",
        last_name="User",
        name="Profile User",
        mobile_number="555-0100",
        specialty_or_program="Family Medicine",
        practice_address="100 Clinic Road",
        status="active",
    )


def patch_profile_dependencies(monkeypatch, user):
    fake_db = FakeDb()

    def fake_verify_firebase_token(token):
        assert token == "profile-token"
        return firebase_user()

    def fake_get_or_create_user_from_firebase_in_session(db, decoded_user):
        assert db is fake_db
        assert decoded_user["uid"] == "firebase-profile-user"
        return user

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )
    monkeypatch.setattr(
        "app.services.profile_service.SessionLocal",
        session_factory(fake_db),
    )
    monkeypatch.setattr(
        "app.services.profile_service.get_or_create_user_from_firebase_in_session",
        fake_get_or_create_user_from_firebase_in_session,
    )
    return fake_db


def test_profile_me_requires_bearer_token():
    response = client.get("/profile/me")

    assert response.status_code == 401


def test_profile_me_returns_linked_profile(monkeypatch):
    user = app_user()
    patch_profile_dependencies(monkeypatch, user)

    response = client.get(
        "/profile/me",
        headers={"Authorization": "Bearer profile-token"},
    )

    assert response.status_code == 200
    assert response.json()["profile_status"] == "linked"
    assert response.json()["firebase_user"]["uid"] == "firebase-profile-user"
    assert response.json()["app_user"]["email"] == "profile@example.com"
    assert response.json()["app_user"]["first_name"] == "Profile"


def test_profile_me_updates_safe_fields(monkeypatch):
    user = app_user()
    fake_db = patch_profile_dependencies(monkeypatch, user)

    response = client.patch(
        "/profile/me",
        headers={"Authorization": "Bearer profile-token"},
        json={
            "first_name": "Updated",
            "last_name": "Owner",
            "mobile_number": "555-0101",
            "specialty_or_program": "Clinic Leadership",
            "practice_address": "200 Horizon Way",
            "email": "ignored@example.com",
            "status": "inactive",
        },
    )

    assert response.status_code == 200
    assert response.json()["profile_status"] == "linked"
    assert response.json()["app_user"]["first_name"] == "Updated"
    assert response.json()["app_user"]["last_name"] == "Owner"
    assert response.json()["app_user"]["mobile_number"] == "555-0101"
    assert response.json()["app_user"]["specialty_or_program"] == "Clinic Leadership"
    assert response.json()["app_user"]["practice_address"] == "200 Horizon Way"
    assert response.json()["app_user"]["email"] == "profile@example.com"
    assert response.json()["app_user"]["status"] == "active"
    assert response.json()["app_user"]["name"] == "Updated Owner"
    assert fake_db.committed is True
    assert fake_db.refreshed_user is user
