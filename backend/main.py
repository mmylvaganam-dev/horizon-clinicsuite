from fastapi import FastAPI
from fastapi import Header
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from app.db.session import get_database_status
from app.services import firebase_auth_service
from app.services.protected_profile_service import build_protected_profile_response
from app.services.storage_service import (
    get_migration_storage_status,
    get_storage_status,
)

app = FastAPI(
    title="Horizon Clinical Suite Backend",
    version="0.1.0",
    description="Independent backend API for Horizon Clinical Suite migration away from Base44."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "horizon-clinicsuite-backend"}


@app.get("/db/status")
def database_status():
    return get_database_status()


@app.get("/storage/status")
def storage_status():
    return get_storage_status()


@app.get("/auth/firebase-test")
def firebase_auth_test(authorization: Optional[str] = Header(default=None)):
    return {
        "firebase_auth": "verified",
        "user": firebase_auth_service.get_current_user_from_token(authorization),
    }


@app.get("/auth/protected-me")
def protected_me(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)

    return {
        "auth": "firebase",
        "protected": True,
        "user": {
            "uid": firebase_user.get("uid"),
            "email": firebase_user.get("email"),
            "email_verified": firebase_user.get("email_verified", False),
            "firebase": firebase_user.get("firebase", {}),
        },
    }


@app.get("/auth/protected-profile")
def protected_profile(authorization: Optional[str] = Header(default=None)):
    firebase_user = firebase_auth_service.get_current_user_from_token(authorization)
    return build_protected_profile_response(firebase_user)


@app.get("/migration/status")
def migration_status():
    return {
        "migration": "in_progress",
        "base44": "active",
        **get_database_status(),
        **get_migration_storage_status(),
    }
