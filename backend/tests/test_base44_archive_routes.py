import json

from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def patch_archive_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "archive-token"
        return {
            "uid": "firebase-archive-admin",
            "email": "admin@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )
    monkeypatch.setattr(
        "main.require_any_role",
        lambda firebase_user, roles, **kwargs: {
            "app_user": {"id": "app-user-1"},
            "roles": ["admin"],
            "source": "test",
        },
    )


def archive_payload():
    return {
        "export_date": "2026-06-03",
        "app": "Test Base44 Archive",
        "total_entities": 3,
        "data": {
            "Patient": [
                {
                    "id": "patient-1",
                    "full_name": "Sample Person",
                    "email": "sample@example.test",
                    "phone": "555-0101",
                    "status": "active",
                }
            ],
            "PharmacyStock": [
                {
                    "id": "stock-1",
                    "medicine_name": "Test Medicine",
                    "current_stock": 12,
                    "selling_price": 5.5,
                }
            ],
            "Appointment": [],
        },
    }


def test_base44_archive_upload_requires_bearer_token():
    response = client.post(
        "/base44-archive/upload",
        json={"file_name": "archive.json", "content": "{}"},
    )

    assert response.status_code == 401


def test_base44_archive_upload_list_and_search(monkeypatch, tmp_path):
    patch_archive_auth(monkeypatch)
    monkeypatch.setattr("app.services.base44_archive_service.ARCHIVE_STORAGE_DIR", tmp_path)

    response = client.post(
        "/base44-archive/upload",
        headers={"Authorization": "Bearer archive-token"},
        json={
            "file_name": "base44_test_archive.json",
            "content": json.dumps(archive_payload()),
        },
    )

    assert response.status_code == 200
    upload_payload = response.json()
    assert upload_payload["uploaded"] is True
    assert upload_payload["entity_counts"]["Patient"] == 1
    assert upload_payload["safety"]["read_only"] is True

    list_response = client.get(
        "/base44-archive/list",
        headers={"Authorization": "Bearer archive-token"},
    )

    assert list_response.status_code == 200
    assert list_response.json()["count"] == 1

    search_response = client.get(
        "/base44-archive/search",
        headers={"Authorization": "Bearer archive-token"},
        params={
            "archive_id": upload_payload["archive_id"],
            "entity": "patients",
            "query": "sample",
        },
    )

    assert search_response.status_code == 200
    assert search_response.json()["returned"] == 1
    assert search_response.json()["results"][0]["name"] == "Sample Person"

    stock_response = client.get(
        "/base44-archive/search",
        headers={"Authorization": "Bearer archive-token"},
        params={
            "archive_id": upload_payload["archive_id"],
            "entity": "pharmacy_stock",
            "query": "medicine",
        },
    )

    assert stock_response.status_code == 200
    assert stock_response.json()["returned"] == 1
    assert stock_response.json()["results"][0]["item_name"] == "Test Medicine"


def test_base44_archive_upload_rejects_invalid_json(monkeypatch, tmp_path):
    patch_archive_auth(monkeypatch)
    monkeypatch.setattr("app.services.base44_archive_service.ARCHIVE_STORAGE_DIR", tmp_path)

    response = client.post(
        "/base44-archive/upload",
        headers={"Authorization": "Bearer archive-token"},
        json={"file_name": "broken.json", "content": "not json"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Uploaded file is not valid JSON"
