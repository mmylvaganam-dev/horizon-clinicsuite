from app.db.session import SessionLocal


def get_system_health_summary() -> dict:
    return {
        "modules": {
            "backend": {
                "status": "ready",
                "detail": "FastAPI backend is running",
            },
            "firebase_auth": {
                "status": "ready",
                "detail": "Firebase bearer-token verification is scaffolded",
            },
            "firebase_storage": {
                "status": "partial",
                "detail": "Firebase Storage upload test exists; live writes depend on Storage rules",
            },
            "protected_routes": {
                "status": "ready",
                "detail": "Firebase-protected backend routes are available",
            },
            "postgres_orm": {
                "status": "partial" if SessionLocal is None else "ready",
                "detail": (
                    "ORM models are defined; live database is not connected"
                    if SessionLocal is None
                    else "ORM models are available with a configured session"
                ),
            },
            "profile_module": {
                "status": "ready",
                "detail": "Independent profile load/update scaffold is available",
            },
            "organization_admin": {
                "status": "ready",
                "detail": "Organization and role scaffold is available",
            },
            "rbac": {
                "status": "ready",
                "detail": "Role checks support admin, provider, staff, and viewer",
            },
            "document_metadata": {
                "status": "ready",
                "detail": "Document metadata registration/listing scaffold is available",
            },
            "audit_logging": {
                "status": "ready",
                "detail": "Audit log model, helper, and admin list route are available",
            },
            "base44_migration_status": {
                "status": "partial",
                "detail": "Base44 remains active while independent modules are isolated",
            },
        }
    }
