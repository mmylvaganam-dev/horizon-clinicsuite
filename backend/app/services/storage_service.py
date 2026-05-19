import os

from dotenv import load_dotenv


load_dotenv()

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_STORAGE_BUCKET = os.getenv("FIREBASE_STORAGE_BUCKET")
FIREBASE_SERVICE_ACCOUNT_JSON_PATH = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON_PATH")

# Firebase Storage is the preferred storage provider for migrated file storage.
# This file intentionally avoids initializing Firebase credentials or uploading
# files until the migration plan approves package installation and real secrets.
PREFERRED_STORAGE_PROVIDER = "firebase_storage"


def get_storage_status() -> dict:
    return {
        "storage": "firebase_storage_scaffold_created",
        "provider": PREFERRED_STORAGE_PROVIDER,
        "connected": False,
    }


def get_migration_storage_status() -> dict:
    return {
        "storage_provider": PREFERRED_STORAGE_PROVIDER,
        "storage_connected": False,
    }
