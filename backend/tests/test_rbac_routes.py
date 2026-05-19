from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def patch_rbac_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "rbac-token"
        return {
            "uid": "firebase-rbac-user",
            "email": "rbac@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )


def test_rbac_me_requires_bearer_token():
    response = client.get("/rbac/me")

    assert response.status_code == 401


def test_rbac_me_returns_placeholder_viewer_without_database(monkeypatch):
    patch_rbac_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.get(
        "/rbac/me",
        headers={"Authorization": "Bearer rbac-token"},
    )

    assert response.status_code == 200
    assert response.json()["roles"] == ["viewer"]
    assert response.json()["source"] == "placeholder"


def test_rbac_admin_test_returns_403_without_admin_role(monkeypatch):
    patch_rbac_auth(monkeypatch)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "rbac@example.com"},
            "roles": ["viewer"],
            "source": "test",
        },
    )

    response = client.get(
        "/rbac/admin-test",
        headers={"Authorization": "Bearer rbac-token"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have the required role"


def test_rbac_admin_test_authorizes_admin_role(monkeypatch):
    patch_rbac_auth(monkeypatch)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "admin@example.com"},
            "roles": ["admin"],
            "source": "test",
        },
    )

    response = client.get(
        "/rbac/admin-test",
        headers={"Authorization": "Bearer rbac-token"},
    )

    assert response.status_code == 200
    assert response.json()["authorized"] is True
    assert response.json()["roles"] == ["admin"]


def test_rbac_provider_test_authorizes_provider_role(monkeypatch):
    patch_rbac_auth(monkeypatch)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "provider@example.com"},
            "roles": ["provider"],
            "source": "test",
        },
    )

    response = client.get(
        "/rbac/provider-test",
        headers={"Authorization": "Bearer rbac-token"},
    )

    assert response.status_code == 200
    assert response.json()["authorized"] is True
    assert response.json()["roles"] == ["provider"]
