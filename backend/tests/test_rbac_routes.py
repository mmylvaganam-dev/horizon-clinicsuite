from fastapi.testclient import TestClient
from types import SimpleNamespace

from main import app
from main import _require_test_page_role
from app.services.rbac_service import (
    get_user_role_codes,
    require_any_role,
    require_test_module_role,
)


client = TestClient(app)


def patch_rbac_auth(monkeypatch):
    def fake_verify_firebase_token(token):
        assert token == "rbac-token"
        return {
            "uid": "firebase-rbac-user",
            "email": "rbac@example.com",
            "email_verified": True,
            "firebase": {"sign_in_provider": "password"},
        }

    monkeypatch.setattr(
        "app.services.firebase_auth_service.verify_firebase_token",
        fake_verify_firebase_token,
    )


def test_rbac_me_requires_bearer_token():
    response = client.get("/rbac/me")

    assert response.status_code == 401


def test_rbac_me_returns_placeholder_viewer_without_database(monkeypatch):
    patch_rbac_auth(monkeypatch)
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    response = client.get(
        "/rbac/me",
        headers={"Authorization": "Bearer rbac-token"},
    )

    assert response.status_code == 200
    assert response.json()["roles"] == ["viewer"]
    assert response.json()["source"] == "placeholder"


def test_rbac_admin_test_returns_403_without_admin_role(monkeypatch):
    patch_rbac_auth(monkeypatch)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "rbac@example.com"},
            "roles": ["viewer"],
            "source": "test",
        },
    )

    response = client.get(
        "/rbac/admin-test",
        headers={"Authorization": "Bearer rbac-token"},
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "User does not have the required role"


def test_rbac_admin_test_authorizes_admin_role(monkeypatch):
    patch_rbac_auth(monkeypatch)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "admin@example.com"},
            "roles": ["admin"],
            "source": "test",
        },
    )

    response = client.get(
        "/rbac/admin-test",
        headers={"Authorization": "Bearer rbac-token"},
    )

    assert response.status_code == 200
    assert response.json()["authorized"] is True
    assert response.json()["roles"] == ["admin"]


def test_rbac_provider_test_authorizes_provider_role(monkeypatch):
    patch_rbac_auth(monkeypatch)
    monkeypatch.setattr(
        "app.services.rbac_service.get_rbac_context",
        lambda firebase_user: {
            "app_user": {"email": "provider@example.com"},
            "roles": ["provider"],
            "source": "test",
        },
    )

    response = client.get(
        "/rbac/provider-test",
        headers={"Authorization": "Bearer rbac-token"},
    )

    assert response.status_code == 200
    assert response.json()["authorized"] is True
    assert response.json()["roles"] == ["provider"]


class _ScalarResult:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


class _ExecuteResult:
    def __init__(self, values):
        self.values = values

    def scalars(self):
        return _ScalarResult(self.values)


class _RoleDb:
    def __init__(self, *result_sets):
        self.result_sets = list(result_sets)

    def execute(self, statement):
        return _ExecuteResult(self.result_sets.pop(0))


def test_rbac_reads_user_role_relationships():
    db = _RoleDb(["admin"], [])
    app_user = SimpleNamespace(
        id="app-user-id",
        primary_organization_id="organization-id",
    )

    assert get_user_role_codes(db, app_user) == ["admin"]


def test_rbac_reads_active_organization_member_roles():
    db = _RoleDb([], ["staff"])
    app_user = SimpleNamespace(
        id="app-user-id",
        primary_organization_id="organization-id",
    )

    assert get_user_role_codes(db, app_user) == ["staff"]


def test_rbac_combines_user_role_and_organization_member_roles():
    db = _RoleDb(["provider"], ["admin"])
    app_user = SimpleNamespace(
        id="app-user-id",
        primary_organization_id="organization-id",
    )

    assert get_user_role_codes(db, app_user) == ["admin", "provider"]


def test_staging_fallback_allows_test_user_only_in_staging(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    context = require_any_role(
        {
            "uid": "9q7CTtPwd4V2D8BccggxmYv8hsi1",
            "email": "firebase-auth-test-1779380527677@example.com",
        },
        ["admin", "provider", "staff"],
        allow_staging_test_user=True,
    )

    assert context["source"] == "staging_test_route_bypass"
    assert set(context["roles"]) == {"admin", "provider", "staff"}


def test_staging_fallback_does_not_run_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    try:
        require_any_role(
            {
                "uid": "9q7CTtPwd4V2D8BccggxmYv8hsi1",
                "email": "firebase-auth-test-1779380527677@example.com",
            },
            ["admin", "provider", "staff"],
            allow_staging_test_user=True,
        )
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 403
    else:
        raise AssertionError("staging fallback should not run in production")


def test_unrelated_active_user_without_role_is_denied(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    try:
        require_any_role(
            {"uid": "unrelated-user", "email": "unrelated@example.com"},
            ["admin", "provider", "staff"],
            allow_staging_test_user=True,
        )
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 403
    else:
        raise AssertionError("unrelated users without roles should be denied")


def test_test_module_role_bypasses_appointment_route_for_staging_user(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    context = require_test_module_role(
        "/appointments/list",
        {
            "uid": "9q7CTtPwd4V2D8BccggxmYv8hsi1",
            "email": "firebase-auth-test-1779380527677@example.com",
        },
        ["admin", "provider", "staff", "viewer"],
    )

    assert context["source"] == "staging_test_route_bypass"
    assert set(context["roles"]) == {"admin", "provider", "staff"}


def test_test_module_role_logs_denied_access(monkeypatch, caplog):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setattr("app.services.rbac_service.SessionLocal", None)

    try:
        require_test_module_role(
            "/appointments/list",
            {"uid": "other-uid", "email": "other@example.com"},
            ["admin", "provider", "staff"],
        )
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 403
    else:
        raise AssertionError("unrelated users without roles should be denied")

    assert "endpoint=/appointments/list" in caplog.text
    assert "email=other@example.com" in caplog.text
    assert "firebase_uid=other-uid" in caplog.text
    assert "resolved_roles=['viewer']" in caplog.text


def test_main_route_direct_bypass_allows_staging_test_user(monkeypatch):
    monkeypatch.setenv("APP_ENV", "staging")
    monkeypatch.setattr("main.get_rbac_context", lambda firebase_user: {
        "app_user": {"email": "firebase-auth-test-1779380527677@example.com"},
        "roles": ["viewer"],
        "source": "test",
    })

    context = _require_test_page_role(
        "/appointments/list",
        {
            "uid": "9q7CTtPwd4V2D8BccggxmYv8hsi1",
            "email": "firebase-auth-test-1779380527677@example.com",
        },
        ["admin", "provider", "staff", "viewer"],
    )

    assert context["source"] == "main_route_staging_bypass"
    assert set(context["roles"]) == {"admin", "provider", "staff"}


def test_main_route_direct_bypass_denies_test_user_in_production(monkeypatch):
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setattr("main.get_rbac_context", lambda firebase_user: {
        "app_user": {"email": "firebase-auth-test-1779380527677@example.com"},
        "roles": ["viewer"],
        "source": "test",
    })

    try:
        _require_test_page_role(
            "/appointments/list",
            {
                "uid": "9q7CTtPwd4V2D8BccggxmYv8hsi1",
                "email": "firebase-auth-test-1779380527677@example.com",
            },
            ["admin", "provider", "staff"],
        )
    except Exception as exc:
        assert getattr(exc, "status_code", None) == 403
    else:
        raise AssertionError("main route bypass should not run in production")
