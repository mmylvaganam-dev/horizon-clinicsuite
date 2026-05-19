import os
from typing import Optional

import firebase_admin
import jwt
import requests
from cryptography.x509 import load_pem_x509_certificate
from fastapi import HTTPException, status
from firebase_admin import auth, credentials


FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_SERVICE_ACCOUNT_JSON_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON_PATH")
FIREBASE_CERTS_URL = (
    "https://www.googleapis.com/robot/v1/metadata/x509/"
    "securetoken@system.gserviceaccount.com"
)


def _initialize_firebase_admin():
    if firebase_admin._apps:
        return firebase_admin.get_app()

    options = {}
    if FIREBASE_PROJECT_ID:
        options["projectId"] = FIREBASE_PROJECT_ID

    if FIREBASE_SERVICE_ACCOUNT_JSON_PATH:
        credential = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_JSON_PATH)
        return firebase_admin.initialize_app(credential, options)

    return firebase_admin.initialize_app(options=options or None)


def verify_firebase_token(token: str) -> dict:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Firebase bearer token",
        )

    try:
        if not FIREBASE_SERVICE_ACCOUNT_JSON_PATH:
            return _verify_token_with_public_certs(token)

        _initialize_firebase_admin()
        return auth.verify_id_token(token, check_revoked=False)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Firebase token verification failed: {error}",
        ) from error


def _verify_token_with_public_certs(token: str) -> dict:
    if not FIREBASE_PROJECT_ID:
        raise ValueError("FIREBASE_PROJECT_ID is required to verify Firebase tokens")

    header = jwt.get_unverified_header(token)
    key_id = header.get("kid")
    if not key_id:
        raise ValueError("Firebase token is missing key id")

    certs_response = requests.get(FIREBASE_CERTS_URL, timeout=10)
    certs_response.raise_for_status()
    cert = certs_response.json().get(key_id)
    if not cert:
        raise ValueError("Firebase token key id was not found in Google certs")

    public_key = load_pem_x509_certificate(cert.encode("utf-8")).public_key()

    decoded_token = jwt.decode(
        token,
        public_key,
        algorithms=["RS256"],
        audience=FIREBASE_PROJECT_ID,
        issuer=f"https://securetoken.google.com/{FIREBASE_PROJECT_ID}",
    )

    decoded_token["uid"] = decoded_token.get("sub")
    return decoded_token


def get_current_user_from_token(authorization: Optional[str]) -> dict:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must use Bearer token",
        )

    decoded_token = verify_firebase_token(token)

    return {
        "uid": decoded_token.get("uid"),
        "email": decoded_token.get("email"),
        "email_verified": decoded_token.get("email_verified", False),
        "firebase": decoded_token.get("firebase", {}),
        "decoded": decoded_token,
    }
