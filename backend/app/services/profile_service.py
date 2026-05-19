from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import User
from app.db.session import SessionLocal
from app.services.protected_profile_service import build_firebase_user_payload
from app.services.user_link_service import get_or_create_user_from_firebase_in_session


EDITABLE_PROFILE_FIELDS = {
    "first_name",
    "last_name",
    "mobile_number",
    "specialty_or_program",
    "practice_address",
}


def get_my_profile(firebase_user: dict) -> dict:
    app_user = _resolve_linked_user(firebase_user)
    return build_profile_response(firebase_user, app_user)


def update_my_profile(firebase_user: dict, updates: dict) -> dict:
    safe_updates = {
        key: value
        for key, value in updates.items()
        if key in EDITABLE_PROFILE_FIELDS
    }

    try:
        with _session() as db:
            app_user = get_or_create_user_from_firebase_in_session(db, firebase_user)
            if not app_user:
                raise _profile_unavailable()

            for field, value in safe_updates.items():
                setattr(app_user, field, value)

            app_user.name = _build_display_name(app_user)
            db.commit()
            db.refresh(app_user)
            return build_profile_response(firebase_user, app_user)
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise _profile_unavailable() from error


def build_profile_response(firebase_user: dict, app_user: User) -> dict:
    return {
        "profile_status": "linked",
        "firebase_user": build_firebase_user_payload(firebase_user),
        "app_user": build_app_profile_payload(app_user),
    }


def build_app_profile_payload(user: User) -> dict:
    return {
        "id": str(user.id),
        "firebase_uid": user.firebase_uid,
        "auth_provider": user.auth_provider,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "name": user.name,
        "mobile_number": user.mobile_number,
        "specialty_or_program": user.specialty_or_program,
        "practice_address": user.practice_address,
        "status": user.status,
    }


def _resolve_linked_user(firebase_user: dict) -> User:
    try:
        with _session() as db:
            app_user = get_or_create_user_from_firebase_in_session(db, firebase_user)
            if not app_user:
                raise _profile_unavailable()
            return app_user
    except HTTPException:
        raise
    except SQLAlchemyError as error:
        raise _profile_unavailable() from error


def _session():
    if SessionLocal is None:
        raise _profile_unavailable()
    return SessionLocal()


def _profile_unavailable() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="PostgreSQL app user profile is not available",
    )


def _build_display_name(user: User) -> Optional[str]:
    parts = [user.first_name, user.last_name]
    name = " ".join(part.strip() for part in parts if part and part.strip())
    return name or user.name
