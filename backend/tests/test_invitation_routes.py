from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def patch_invitation_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "invitation-token"
        return {
            "uid": "firebase-invitation-user",
            "email": "invited@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )


def invitation_payload():
    return {
        "invited_email": "invited@example.com",
        "invited_role": "staff",
    }


def admin_context():
    return {
        "app_user": {
            "id": "app-admin-1",
            "primary_organization_id": None,
            "email": "admin@example.com",
        },
        "roles": ["admin"],
        "source": "test",
    }


def test_invitations_create_requires_bearer_token():
    response = client.post("/invitations/create", json=invitation_payload())

    assert response.status_code == 401


def test_invitations_create_rejects_non_admin(monkeypatch):
    patch_invitation_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.post(
        "/invitations/create",
        headers={"Authorization": "Bearer invitation-token"},
        json=invitation_payload(),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have the required role"


def test_invitations_create_allows_admin_placeholder(monkeypatch):
    audit_calls = []
    patch_invitation_auth(monkeypatch)
    monkeypatch.setattr("app.services.invitation_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: admin_context())
    monkeypatch.setattr(
        "app.services.invitation_service.log_audit_event",
        lambda **kwargs: audit_calls.append(kwargs),
    )

    response = client.post(
        "/invitations/create",
        headers={"Authorization": "Bearer invitation-token"},
        json=invitation_payload(),
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["created"] is True
    assert payload["source"] == "placeholder"
    assert payload["invitation"]["invited_email"] == "invited@example.com"
    assert payload["invitation"]["invited_role"] == "staff"
    assert payload["invitation"]["status"] == "pending"
    assert payload["invitation"]["token"]
    assert audit_calls[0]["action_type"] == "invitation_created"
    assert audit_calls[0]["resource_type"] == "invitation"


def test_invitations_list_requires_admin(monkeypatch):
    patch_invitation_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.get(
        "/invitations/list",
        headers={"Authorization": "Bearer invitation-token"},
    )

    assert response.status_code == 403


def test_invitations_list_allows_admin_placeholder(monkeypatch):
    patch_invitation_auth(monkeypatch)
    monkeypatch.setattr("app.services.invitation_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: admin_context())

    response = client.get(
        "/invitations/list",
        headers={"Authorization": "Bearer invitation-token"},
    )

    assert response.status_code == 200
    assert response.json()["source"] == "placeholder"
    assert response.json()["invitations"][0]["token"] == "placeholder-invitation-token"


def test_invitations_accept_requires_bearer_token():
    response = client.post(
        "/invitations/accept",
        json={"token": "placeholder-invitation-token"},
    )

    assert response.status_code == 401


def test_invitations_accept_allows_invited_user_placeholder(monkeypatch):
    audit_calls = []
    patch_invitation_auth(monkeypatch)
    monkeypatch.setattr("app.services.invitation_service.SessionLocal", None)
    monkeypatch.setattr(
        "app.services.invitation_service.log_audit_event",
        lambda **kwargs: audit_calls.append(kwargs),
    )

    response = client.post(
        "/invitations/accept",
        headers={"Authorization": "Bearer invitation-token"},
        json={"token": "placeholder-invitation-token"},
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["accepted"] is True
    assert payload["source"] == "placeholder"
    assert payload["invitation"]["status"] == "accepted"
    assert payload["invitation"]["invited_email"] == "invited@example.com"
    assert audit_calls[0]["action_type"] == "invitation_accepted"
