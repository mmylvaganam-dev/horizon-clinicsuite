from fastapi.testclient import TestClient

from main import app


client = TestClient(app)

PROVIDER_USER_ID = "11111111-1111-4111-8111-111111111111"
OTHER_PROVIDER_USER_ID = "22222222-2222-4222-8222-222222222222"


def patch_availability_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "availability-token"
        return {
            "uid": "firebase-availability-user",
            "email": "provider@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )


def provider_context():
    return {
        "app_user": {
            "id": PROVIDER_USER_ID,
            "primary_organization_id": None,
            "email": "provider@example.com",
        },
        "roles": ["provider"],
        "source": "test",
    }


def admin_context():
    return {
        "app_user": {
            "id": "33333333-3333-4333-8333-333333333333",
            "primary_organization_id": None,
            "email": "admin@example.com",
        },
        "roles": ["admin"],
        "source": "test",
    }


def availability_payload(provider_user_id=PROVIDER_USER_ID):
    return {
        "provider_user_id": provider_user_id,
        "weekday": 1,
        "start_time": "09:00",
        "end_time": "17:00",
        "timezone": "America/Toronto",
        "is_available": True,
    }


def test_availability_list_requires_bearer_token():
    response = client.get("/availability/list")

    assert response.status_code == 401


def test_availability_list_rejects_viewer(monkeypatch):
    patch_availability_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.get(
        "/availability/list",
        headers={"Authorization": "Bearer availability-token"},
    )

    assert response.status_code == 403


def test_availability_create_allows_provider_own_placeholder(monkeypatch):
    patch_availability_auth(monkeypatch)
    monkeypatch.setattr("app.services.availability_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: provider_context())

    response = client.post(
        "/availability/create",
        headers={"Authorization": "Bearer availability-token"},
        json=availability_payload(),
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["created"] is True
    assert payload["source"] == "placeholder"
    assert payload["availability"]["provider_user_id"] == PROVIDER_USER_ID
    assert payload["availability"]["weekday"] == 1


def test_availability_create_rejects_provider_for_other_provider(monkeypatch):
    patch_availability_auth(monkeypatch)
    monkeypatch.setattr("app.services.availability_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: provider_context())

    response = client.post(
        "/availability/create",
        headers={"Authorization": "Bearer availability-token"},
        json=availability_payload(OTHER_PROVIDER_USER_ID),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "Providers can only manage their own availability"


def test_availability_create_allows_admin_for_other_provider(monkeypatch):
    patch_availability_auth(monkeypatch)
    monkeypatch.setattr("app.services.availability_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: admin_context())

    response = client.post(
        "/availability/create",
        headers={"Authorization": "Bearer availability-token"},
        json=availability_payload(OTHER_PROVIDER_USER_ID),
    )

    assert response.status_code == 200
    assert response.json()["availability"]["provider_user_id"] == OTHER_PROVIDER_USER_ID


def test_availability_list_allows_admin_placeholder(monkeypatch):
    patch_availability_auth(monkeypatch)
    monkeypatch.setattr("app.services.availability_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: admin_context())

    response = client.get(
        "/availability/list",
        headers={"Authorization": "Bearer availability-token"},
    )

    assert response.status_code == 200
    assert response.json()["source"] == "placeholder"
    assert response.json()["availability"][0]["weekday"] == 1


def test_availability_update_allows_provider_own_placeholder(monkeypatch):
    patch_availability_auth(monkeypatch)
    monkeypatch.setattr("app.services.availability_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles: provider_context())

    response = client.patch(
        "/availability/update",
        headers={"Authorization": "Bearer availability-token"},
        json={
            "id": "placeholder-availability-monday",
            "provider_user_id": PROVIDER_USER_ID,
            "start_time": "10:00",
            "end_time": "16:00",
            "is_available": False,
        },
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["updated"] is True
    assert payload["availability"]["start_time"] == "10:00"
    assert payload["availability"]["end_time"] == "16:00"
    assert payload["availability"]["is_available"] is False
