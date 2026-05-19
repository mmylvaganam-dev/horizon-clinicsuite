from contextlib import contextmanager

from app.db.models import User
from app.services import user_link_service


class FakeScalarResult:
    def __init__(self, user):
        self.user = user

    def first(self):
        return self.user


class FakeResult:
    def __init__(self, user):
        self.user = user

    def scalars(self):
        return FakeScalarResult(self.user)


class FakeDb:
    def __init__(self, firebase_user=None, email_user=None):
        self.firebase_user = firebase_user
        self.email_user = email_user
        self.added_user = None
        self.committed = False
        self.refreshed_user = None
        self.execute_calls = 0

    def execute(self, statement):
        self.execute_calls += 1
        if self.execute_calls == 1:
            return FakeResult(self.firebase_user)
        return FakeResult(self.email_user)

    def add(self, user):
        self.added_user = user

    def commit(self):
        self.committed = True

    def refresh(self, user):
        self.refreshed_user = user


def session_factory(fake_db):
    @contextmanager
    def session_context():
        yield fake_db

    return session_context


def firebase_token(uid="firebase-uid", email="user@example.com"):
    return {
        "uid": uid,
        "email": email,
        "email_verified": True,
        "firebase": {"sign_in_provider": "password"},
    }


def test_get_or_create_user_from_firebase_existing_firebase_uid(monkeypatch):
    existing_user = User(
        firebase_uid="firebase-uid",
        auth_provider="firebase",
        email="user@example.com",
        name="Existing User",
    )
    fake_db = FakeDb(firebase_user=existing_user)
    monkeypatch.setattr(user_link_service, "SessionLocal", session_factory(fake_db))

    app_user = user_link_service.get_or_create_user_from_firebase(firebase_token())

    assert app_user is existing_user
    assert fake_db.added_user is None


def test_get_or_create_user_from_firebase_email_fallback(monkeypatch):
    existing_user = User(
        email="user@example.com",
        name="Email User",
    )
    fake_db = FakeDb(email_user=existing_user)
    monkeypatch.setattr(user_link_service, "SessionLocal", session_factory(fake_db))

    app_user = user_link_service.get_or_create_user_from_firebase(firebase_token())

    assert app_user is existing_user
    assert app_user.firebase_uid == "firebase-uid"
    assert app_user.auth_provider == "firebase"
    assert fake_db.committed is True


def test_get_or_create_user_from_firebase_creates_placeholder(monkeypatch):
    fake_db = FakeDb()
    monkeypatch.setattr(user_link_service, "SessionLocal", session_factory(fake_db))

    app_user = user_link_service.get_or_create_user_from_firebase(firebase_token())

    assert app_user is fake_db.added_user
    assert app_user.firebase_uid == "firebase-uid"
    assert app_user.auth_provider == "firebase"
    assert app_user.email == "user@example.com"
    assert app_user.status == "active"
    assert app_user.metadata_json["created_from"] == "firebase_protected_profile"
    assert fake_db.committed is True
