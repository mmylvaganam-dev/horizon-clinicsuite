from app.db.models import User
from app.services.user_link_service import get_or_create_user_from_firebase


def build_firebase_user_payload(firebase_user: dict) -> dict:
    return {
        "uid": firebase_user.get("uid"),
        "email": firebase_user.get("email"),
        "email_verified": firebase_user.get("email_verified", False),
        "firebase": firebase_user.get("firebase", {}),
    }


def build_app_user_payload(user: User) -> dict:
    return {
        "id": str(user.id),
        "base44_id": user.base44_id,
        "firebase_uid": user.firebase_uid,
        "auth_provider": user.auth_provider,
        "email": user.email,
        "name": user.name,
        "status": user.status,
        "primary_organization_id": (
            str(user.primary_organization_id)
            if user.primary_organization_id
            else None
        ),
    }


def build_protected_profile_response(firebase_user: dict) -> dict:
    app_user = get_or_create_user_from_firebase(firebase_user)

    return {
        "firebase_user": build_firebase_user_payload(firebase_user),
        "app_user": build_app_user_payload(app_user) if app_user else None,
        "profile_status": "linked" if app_user else "not_linked",
    }
