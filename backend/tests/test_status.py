from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def test_db_status_is_configured_not_connected():
    response = client.get("/db/status")

    assert response.status_code == 200
    assert response.json()["database"] == "configured_not_connected"
    assert "database_url_configured" in response.json()


def test_migration_status_includes_database_status():
    response = client.get("/migration/status")

    assert response.status_code == 200
    assert response.json()["database"] == "configured_not_connected"


def test_storage_status_is_firebase_scaffold():
    response = client.get("/storage/status")

    assert response.status_code == 200
    assert response.json() == {
        "storage": "firebase_storage_scaffold_created",
        "provider": "firebase_storage",
        "connected": False,
    }


def test_migration_status_includes_storage_status():
    response = client.get("/migration/status")

    assert response.status_code == 200
    assert response.json()["storage_provider"] == "firebase_storage"
    assert response.json()["storage_connected"] is False


def test_firebase_auth_test_requires_bearer_token():
    response = client.get("/auth/firebase-test")

    assert response.status_code == 401


def test_firebase_auth_test_returns_decoded_user(monkeypatch):
    def fake_verify_firebase_token(token):
      assert token == "test-token"
      return {
          "uid": "firebase-user-1",
          "email": "test@example.com",
          "email_verified": True,
          "firebase": {"sign_in_provider": "password"},
      }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )

    response = client.get(
        "/auth/firebase-test",
        headers={"Authorization": "Bearer test-token"},
    )

    assert response.status_code == 200
    assert response.json()["firebase_auth"] == "verified"
    assert response.json()["user"]["uid"] == "firebase-user-1"
    assert response.json()["user"]["email"] == "test@example.com"


def test_protected_me_requires_bearer_token():
    response = client.get("/auth/protected-me")

    assert response.status_code == 401


def test_protected_me_returns_firebase_user(monkeypatch):
    def fake_verify_firebase_token(token):
      assert token == "protected-token"
      return {
          "uid": "firebase-user-2",
          "email": "protected@example.com",
          "email_verified": True,
          "firebase": {"sign_in_provider": "password"},
      }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )

    response = client.get(
        "/auth/protected-me",
        headers={"Authorization": "Bearer protected-token"},
    )

    assert response.status_code == 200
    assert response.json()["auth"] == "firebase"
    assert response.json()["protected"] is True
    assert response.json()["user"]["uid"] == "firebase-user-2"
    assert response.json()["user"]["email"] == "protected@example.com"


def test_protected_profile_requires_bearer_token():
    response = client.get("/auth/protected-profile")

    assert response.status_code == 401


def test_protected_profile_returns_not_linked_without_database(monkeypatch):
    def fake_verify_firebase_token(token):
      assert token == "profile-token"
      return {
          "uid": "firebase-user-3",
          "email": "profile@example.com",
          "email_verified": True,
          "firebase": {"sign_in_provider": "password"},
      }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )
    monkeypatch.setattr(
        "app.services.user_link_service.SessionLocal",
        None,
    )

    response = client.get(
        "/auth/protected-profile",
        headers={"Authorization": "Bearer profile-token"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "firebase_user": {
            "uid": "firebase-user-3",
            "email": "profile@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        },
        "app_user": None,
        "profile_status": "not_linked",
    }
