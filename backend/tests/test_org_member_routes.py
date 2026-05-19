from fastapi.testclient import TestClient

from main import app


client = TestClient(app)

ADMIN_USER_ID = "11111111-1111-4111-8111-111111111111"
MEMBER_USER_ID = "22222222-2222-4222-8222-222222222222"


def patch_org_member_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "org-member-token"
        return {
            "uid": "firebase-org-member-user",
            "email": "admin@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )


def rbac_context(roles):
    return {
        "app_user": {
            "id": ADMIN_USER_ID,
            "primary_organization_id": None,
            "email": "admin@example.com",
        },
        "roles": roles,
        "source": "test",
    }


def member_payload():
    return {
        "user_id": MEMBER_USER_ID,
        "role": "staff",
        "status": "active",
    }


def test_org_members_list_requires_bearer_token():
    response = client.get("/org-members/list")

    assert response.status_code == 401


def test_org_members_list_allows_viewer_placeholder(monkeypatch):
    patch_org_member_auth(monkeypatch)
    monkeypatch.setattr("app.services.org_member_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: rbac_context(["viewer"]))

    response = client.get(
        "/org-members/list",
        headers={"Authorization": "Bearer org-member-token"},
    )

    assert response.status_code == 200
    assert response.json()["source"] == "placeholder"
    assert response.json()["members"][0]["role"] == "admin"


def test_org_members_add_rejects_non_admin(monkeypatch):
    patch_org_member_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.post(
        "/org-members/add",
        headers={"Authorization": "Bearer org-member-token"},
        json=member_payload(),
    )

    assert response.status_code == 403


def test_org_members_add_allows_admin_placeholder(monkeypatch):
    patch_org_member_auth(monkeypatch)
    monkeypatch.setattr("app.services.org_member_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: rbac_context(["admin"]))

    response = client.post(
        "/org-members/add",
        headers={"Authorization": "Bearer org-member-token"},
        json=member_payload(),
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["added"] is True
    assert payload["source"] == "placeholder"
    assert payload["member"]["user_id"] == MEMBER_USER_ID
    assert payload["member"]["role"] == "staff"
    assert payload["member"]["status"] == "active"


def test_org_members_status_rejects_non_admin(monkeypatch):
    patch_org_member_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.patch(
        "/org-members/status",
        headers={"Authorization": "Bearer org-member-token"},
        json={"id": "placeholder-org-member-admin", "status": "inactive"},
    )

    assert response.status_code == 403


def test_org_members_status_allows_admin_placeholder(monkeypatch):
    patch_org_member_auth(monkeypatch)
    monkeypatch.setattr("app.services.org_member_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: rbac_context(["admin"]))

    response = client.patch(
        "/org-members/status",
        headers={"Authorization": "Bearer org-member-token"},
        json={"id": "placeholder-org-member-admin", "status": "inactive"},
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["updated"] is True
    assert payload["member"]["status"] == "inactive"
