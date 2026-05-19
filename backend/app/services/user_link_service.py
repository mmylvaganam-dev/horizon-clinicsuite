from typing import Optional

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import User
from app.db.session import SessionLocal


def get_or_create_user_from_firebase(firebase_user: dict) -> Optional[User]:
    if SessionLocal is None:
        return None

    firebase_uid = firebase_user.get("uid")
    email = firebase_user.get("email")

    if not firebase_uid and not email:
        return None

    try:
        with SessionLocal() as db:
            app_user = _find_user_by_firebase_uid(db, firebase_uid)
            if app_user:
                return app_user

            app_user = _find_user_by_email(db, email)
            if app_user:
                if firebase_uid and not app_user.firebase_uid:
                    app_user.firebase_uid = firebase_uid
                if not app_user.auth_provider:
                    app_user.auth_provider = "firebase"
                db.commit()
                db.refresh(app_user)
                return app_user

            if not email:
                return None

            app_user = User(
                firebase_uid=firebase_uid,
                auth_provider="firebase",
                email=email,
                name=firebase_user.get("name") or email,
                status="active",
                metadata_json={
                    "created_from": "firebase_protected_profile",
                    "email_verified": firebase_user.get("email_verified", False),
                    "firebase": firebase_user.get("firebase", {}),
                },
            )
            db.add(app_user)
            db.commit()
            db.refresh(app_user)
            return app_user
    except SQLAlchemyError:
        return None


def _find_user_by_firebase_uid(db, firebase_uid: Optional[str]) -> Optional[User]:
    if not firebase_uid:
        return None

    statement = select(User).where(User.firebase_uid == firebase_uid).limit(1)
    return db.execute(statement).scalars().first()


def _find_user_by_email(db, email: Optional[str]) -> Optional[User]:
    if not email:
        return None

    statement = select(User).where(User.email == email).limit(1)
    return db.execute(statement).scalars().first()
