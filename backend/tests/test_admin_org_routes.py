from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def patch_admin_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "admin-token"
        return {
            "uid": "firebase-admin-user",
            "email": "admin@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )


def test_admin_organizations_requires_bearer_token():
    response = client.get("/admin/organizations")

    assert response.status_code == 401


def test_admin_organizations_returns_placeholder_without_database(monkeypatch):
    patch_admin_auth(monkeypatch)
    monkeypatch.setattr("app.services.admin_org_service.SessionLocal", None)

    response = client.get(
        "/admin/organizations",
        headers={"Authorization": "Bearer admin-token"},
    )

    assert response.status_code == 200
    assert response.json()["source"] == "placeholder"
    assert response.json()["organizations"][0]["name"] == "Horizon Test Organization"


def test_admin_create_organization_returns_placeholder_without_database(monkeypatch):
    audit_calls = []
    patch_admin_auth(monkeypatch)
    monkeypatch.setattr("app.services.admin_org_service.SessionLocal", None)
    monkeypatch.setattr("app.services.admin_org_service.log_audit_event", lambda **kwargs: audit_calls.append(kwargs))

    response = client.post(
        "/admin/organizations",
        headers={"Authorization": "Bearer admin-token"},
        json={
            "name": "Created Test Organization",
            "slug": "created-test-organization",
        },
    )

    assert response.status_code == 200
    assert response.json()["created"] is True
    assert response.json()["source"] == "placeholder"
    assert response.json()["organization"]["name"] == "Created Test Organization"
    assert response.json()["organization"]["slug"] == "created-test-organization"
    assert audit_calls[0]["action_type"] == "organization_created"
    assert audit_calls[0]["resource_type"] == "organization"


def test_admin_roles_returns_placeholder_without_database(monkeypatch):
    patch_admin_auth(monkeypatch)
    monkeypatch.setattr("app.services.admin_org_service.SessionLocal", None)

    response = client.get(
        "/admin/roles",
        headers={"Authorization": "Bearer admin-token"},
    )

    assert response.status_code == 200
    assert response.json()["source"] == "placeholder"
    assert response.json()["roles"][0]["code"] == "OWNER"
