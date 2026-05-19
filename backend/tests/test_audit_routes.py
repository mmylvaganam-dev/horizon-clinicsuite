from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def patch_audit_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "audit-token"
        return {
            "uid": "firebase-audit-user",
            "email": "audit@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )


def test_audit_logs_requires_bearer_token():
    response = client.get("/audit/logs")

    assert response.status_code == 401


def test_audit_logs_rejects_non_admin(monkeypatch):
    patch_audit_auth(monkeypatch)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "viewer@example.com"},
            "roles": ["viewer"],
            "source": "test",
        },
    )

    response = client.get(
        "/audit/logs",
        headers={"Authorization": "Bearer audit-token"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have the required role"


def test_audit_logs_allows_admin_placeholder(monkeypatch):
    patch_audit_auth(monkeypatch)
    monkeypatch.setattr("app.services.audit_service.SessionLocal", None)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "admin@example.com"},
            "roles": ["admin"],
            "source": "test",
        },
    )

    response = client.get(
        "/audit/logs",
        headers={"Authorization": "Bearer audit-token"},
    )

    assert response.status_code == 200
    assert response.json()["source"] == "placeholder"
    assert response.json()["audit_logs"][0]["action_type"] == "scaffold_viewed"
