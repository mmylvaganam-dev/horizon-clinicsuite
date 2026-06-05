from fastapi.testclient import TestClient

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


def test_staging_admin_seed_accepts_custom_identity(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setenv("STAGING_ADMIN_SEED_TOKEN", "seed-token")

    captured = {}

    def fake_seed(token, **kwargs):
        captured["token"] = token
        captured.update(kwargs)
        return {
            "seeded": True,
            "email": kwargs["email"],
            "firebase_uid": kwargs["firebase_uid"],
        }

    monkeypatch.setattr("main.seed_staging_admin_user", fake_seed)

    response = client.post(
        "/management/staging/seed-admin",
        headers={"X-Admin-Seed-Token": "seed-token"},
        json={
            "email": "owner@example.test",
            "firebase_uid": "firebase-uid-123",
            "first_name": "Owner",
            "last_name": "Admin",
            "name": "Owner Admin",
        },
    )

    assert response.status_code == 200
    assert response.json()["seeded"] is True
    assert captured == {
        "token": "seed-token",
        "firebase_uid": "firebase-uid-123",
        "email": "owner@example.test",
        "first_name": "Owner",
        "last_name": "Admin",
        "name": "Owner Admin",
    }


def test_staging_admin_seed_rollback_hidden_outside_staging(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("STAGING_ADMIN_SEED_TOKEN", "seed-token")

    response = client.post(
        "/management/staging/seed-admin/rollback",
        headers={"X-Admin-Seed-Token": "seed-token"},
    )

    assert response.status_code == 404
