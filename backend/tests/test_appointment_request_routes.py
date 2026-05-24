from fastapi.testclient import TestClient

from main import app


client = TestClient(app)

APP_USER_ID = "11111111-1111-4111-8111-111111111111"
PROVIDER_USER_ID = "22222222-2222-4222-8222-222222222222"


def patch_appointment_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "appointment-token"
        return {
            "uid": "firebase-appointment-user",
            "email": "staff@example.com",
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
            "id": APP_USER_ID,
            "primary_organization_id": None,
            "email": "staff@example.com",
        },
        "roles": roles,
        "source": "test",
    }


def appointment_payload():
    return {
        "patient_name": "Test Patient",
        "patient_email": "test.patient@example.com",
        "requested_provider_user_id": PROVIDER_USER_ID,
        "requested_date": "2026-06-01",
        "requested_time": "09:30",
        "request_reason": "Appointment request scaffold test",
    }


def test_appointment_request_create_requires_bearer_token():
    response = client.post("/appointments/request", json=appointment_payload())

    assert response.status_code == 401


def test_appointment_request_create_rejects_viewer(monkeypatch):
    patch_appointment_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.post(
        "/appointments/request",
        headers={"Authorization": "Bearer appointment-token"},
        json=appointment_payload(),
    )

    assert response.status_code == 403


def test_appointment_request_create_allows_staff_placeholder(monkeypatch):
    patch_appointment_auth(monkeypatch)
    monkeypatch.setattr("app.services.appointment_request_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles, **kwargs: rbac_context(["staff"]))

    response = client.post(
        "/appointments/request",
        headers={"Authorization": "Bearer appointment-token"},
        json=appointment_payload(),
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["created"] is True
    assert payload["source"] == "placeholder"
    assert payload["appointment_request"]["patient_name"] == "Test Patient"
    assert payload["appointment_request"]["status"] == "pending"
    assert payload["availability_lookup"]["lookup"] == "provider_availability_read_only"


def test_appointment_request_create_allows_admin_placeholder(monkeypatch):
    patch_appointment_auth(monkeypatch)
    monkeypatch.setattr("app.services.appointment_request_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles, **kwargs: rbac_context(["admin"]))

    response = client.post(
        "/appointments/request",
        headers={"Authorization": "Bearer appointment-token"},
        json=appointment_payload(),
    )

    assert response.status_code == 200
    assert response.json()["created"] is True


def test_appointment_request_create_allows_provider_placeholder(monkeypatch):
    patch_appointment_auth(monkeypatch)
    monkeypatch.setattr("app.services.appointment_request_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles, **kwargs: rbac_context(["provider"]))

    response = client.post(
        "/appointments/request",
        headers={"Authorization": "Bearer appointment-token"},
        json=appointment_payload(),
    )

    assert response.status_code == 200
    assert response.json()["created"] is True


def test_appointment_request_list_allows_viewer_read_only(monkeypatch):
    patch_appointment_auth(monkeypatch)
    monkeypatch.setattr("app.services.appointment_request_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles, **kwargs: rbac_context(["viewer"]))

    response = client.get(
        "/appointments/list",
        headers={"Authorization": "Bearer appointment-token"},
    )

    assert response.status_code == 200
    assert response.json()["source"] == "placeholder"
    assert response.json()["appointment_requests"][0]["status"] == "pending"


def test_appointment_request_status_rejects_viewer(monkeypatch):
    patch_appointment_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.patch(
        "/appointments/status",
        headers={"Authorization": "Bearer appointment-token"},
        json={"id": "placeholder-appointment-request", "status": "confirmed"},
    )

    assert response.status_code == 403


def test_appointment_request_status_allows_provider_placeholder(monkeypatch):
    patch_appointment_auth(monkeypatch)
    monkeypatch.setattr("app.services.appointment_request_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles, **kwargs: rbac_context(["provider"]))

    response = client.patch(
        "/appointments/status",
        headers={"Authorization": "Bearer appointment-token"},
        json={"id": "placeholder-appointment-request", "status": "confirmed"},
    )

    payload = response.json()

    assert response.status_code == 200
    assert payload["updated"] is True
    assert payload["appointment_request"]["status"] == "confirmed"


def test_appointment_request_status_rejects_invalid_status(monkeypatch):
    patch_appointment_auth(monkeypatch)
    monkeypatch.setattr("app.services.appointment_request_service.SessionLocal", None)
    monkeypatch.setattr("main.require_any_role", lambda firebase_user, roles, **kwargs: rbac_context(["admin"]))

    response = client.patch(
        "/appointments/status",
        headers={"Authorization": "Bearer appointment-token"},
        json={"id": "placeholder-appointment-request", "status": "booked"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "status must be pending, confirmed, cancelled, or completed"
    )
