from fastapi.testclient import TestClient

from main import app


client = TestClient(app)


def patch_document_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "document-token"
        return {
            "uid": "firebase-document-user",
            "email": "documents@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )


def document_payload():
    return {
        "file_name": "storage-test.txt",
        "storage_path": "document-test-uploads/storage-test.txt",
        "download_url": "https://example.com/storage-test.txt",
        "mime_type": "text/plain",
        "file_size": 34,
    }


def test_documents_list_requires_bearer_token():
    response = client.get("/documents/list")

    assert response.status_code == 401


def test_documents_list_allows_viewer_placeholder(monkeypatch):
    patch_document_auth(monkeypatch)
    monkeypatch.setattr("app.services.document_service.SessionLocal", None)
    monkeypatch.setattr("main.get_rbac_context", lambda firebase_user: {
        "roles": ["viewer"],
        "source": "placeholder",
    })

    response = client.get(
        "/documents/list",
        headers={"Authorization": "Bearer document-token"},
    )

    assert response.status_code == 200
    assert response.json()["source"] == "placeholder"
    assert response.json()["documents"][0]["file_name"] == "storage-test.txt"


def test_documents_register_rejects_viewer(monkeypatch):
    patch_document_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.post(
        "/documents/register-upload",
        headers={"Authorization": "Bearer document-token"},
        json=document_payload(),
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have the required role"


def test_documents_register_allows_staff_placeholder(monkeypatch):
    audit_calls = []
    patch_document_auth(monkeypatch)
    monkeypatch.setattr("app.services.document_service.SessionLocal", None)
    monkeypatch.setattr("app.services.document_service.log_audit_event", lambda **kwargs: audit_calls.append(kwargs))
    monkeypatch.setattr("main.require_test_module_role", lambda endpoint_path, firebase_user, roles, **kwargs: {
        "app_user": {"id": "app-user-1", "primary_organization_id": None},
        "roles": ["staff"],
        "source": "test",
    })

    response = client.post(
        "/documents/register-upload",
        headers={"Authorization": "Bearer document-token"},
        json=document_payload(),
    )

    assert response.status_code == 200
    assert response.json()["registered"] is True
    assert response.json()["source"] == "placeholder"
    assert response.json()["document"]["file_name"] == "storage-test.txt"
    assert response.json()["document"]["storage_path"] == (
        "document-test-uploads/storage-test.txt"
    )
    assert audit_calls[0]["action_type"] == "document_metadata_registered"
    assert audit_calls[0]["resource_type"] == "document_metadata"
