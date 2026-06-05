from fastapi.testclient import TestClient

from app.services import staging_admin_seed_service
from main import app


client = TestClient(app)


def test_staging_admin_seed_hidden_outside_staging(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("STAGING_ADMIN_SEED_TOKEN", "seed-token")

    response = client.post(
        "/management/staging/seed-admin",
        headers={"X-Admin-Seed-Token": "seed-token"},
    )

    assert response.status_code == 404


def test_staging_admin_seed_requires_token(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setenv("STAGING_ADMIN_SEED_TOKEN", "seed-token")

    response = client.post("/management/staging/seed-admin")

    assert response.status_code == 403
    assert response.json()["detail"] == "Invalid staging admin seed token"


def test_staging_admin_seed_requires_database(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setenv("STAGING_ADMIN_SEED_TOKEN", "seed-token")
    monkeypatch.setattr("app.services.staging_admin_seed_service.SessionLocal", None)

    response = client.post(
        "/management/staging/seed-admin",
        headers={"X-Admin-Seed-Token": "seed-token"},
    )

    assert response.status_code == 503
    assert response.json()["detail"] == "Database is not configured"


def test_staging_admin_seed_identity_can_come_from_environment(monkeypatch):
    monkeypatch.setenv("STAGING_ADMIN_SEED_EMAIL", "owner@example.test")
    monkeypatch.delenv("STAGING_ADMIN_SEED_FIREBASE_UID", raising=False)

    identity = staging_admin_seed_service._seed_identity(None, None, None, None, None)

    assert identity["email"] == "owner@example.test"
    assert identity["firebase_uid"] is None


def test_staging_admin_seed_rollback_hidden_outside_staging(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("STAGING_ADMIN_SEED_TOKEN", "seed-token")

    response = client.post(
        "/management/staging/seed-admin/rollback",
        headers={"X-Admin-Seed-Token": "seed-token"},
    )

    assert response.status_code == 404
