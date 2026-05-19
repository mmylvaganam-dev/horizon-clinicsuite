from typing import Optional

from sqlalchemy import or_, select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import User
from app.db.session import SessionLocal


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
        "email": user.email,
        "name": user.name,
        "status": user.status,
        "primary_organization_id": (
            str(user.primary_organization_id)
            if user.primary_organization_id
            else None
        ),
    }


def find_user_by_firebase_identity(firebase_user: dict) -> Optional[User]:
    if SessionLocal is None:
        return None

    uid = firebase_user.get("uid")
    email = firebase_user.get("email")

    if not uid and not email:
        return None

    clauses = []
    if uid:
        clauses.append(User.firebase_uid == uid)
    if email:
        clauses.append(User.email == email)

    try:
        with SessionLocal() as db:
            statement = select(User).where(or_(*clauses)).limit(1)
            return db.execute(statement).scalars().first()
    except SQLAlchemyError:
        return None


def build_protected_profile_response(firebase_user: dict) -> dict:
    app_user = find_user_by_firebase_identity(firebase_user)

    return {
        "firebase_user": build_firebase_user_payload(firebase_user),
        "app_user": build_app_user_payload(app_user) if app_user else None,
        "profile_status": "linked" if app_user else "not_linked",
    }
