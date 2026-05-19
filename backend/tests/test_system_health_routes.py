from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def patch_system_health_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "system-health-token"
        return {
            "uid": "firebase-system-health-user",
            "email": "system-health@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )


def test_system_health_summary_requires_bearer_token():
    response = client.get("/system/health-summary")

    assert response.status_code == 401


def test_system_health_summary_rejects_non_admin(monkeypatch):
    patch_system_health_auth(monkeypatch)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "viewer@example.com"},
            "roles": ["viewer"],
            "source": "test",
        },
    )

    response = client.get(
        "/system/health-summary",
        headers={"Authorization": "Bearer system-health-token"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have the required role"


def test_system_health_summary_returns_expected_modules_for_admin(monkeypatch):
    patch_system_health_auth(monkeypatch)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "admin@example.com"},
            "roles": ["admin"],
            "source": "test",
        },
    )

    response = client.get(
        "/system/health-summary",
        headers={"Authorization": "Bearer system-health-token"},
    )

    assert response.status_code == 200
    modules = response.json()["modules"]
    assert modules["backend"]["status"] == "ready"
    assert modules["firebase_auth"]["status"] == "ready"
    assert modules["firebase_storage"]["status"] == "partial"
    assert modules["protected_routes"]["status"] == "ready"
    assert modules["postgres_orm"]["status"] in {"ready", "partial"}
    assert modules["profile_module"]["status"] == "ready"
    assert modules["organization_admin"]["status"] == "ready"
    assert modules["rbac"]["status"] == "ready"
    assert modules["document_metadata"]["status"] == "ready"
    assert modules["audit_logging"]["status"] == "ready"
    assert modules["base44_migration_status"]["status"] == "partial"
