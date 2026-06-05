import os

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

from app.db.models import (
    PatientTransition,
    PatientVisitTransition,
    PharmacyProduct,
    PharmacySale,
    PharmacySaleItem,
)
from app.db.session import engine


def create_staging_pharmacy_tables(seed_token: str | None) -> dict:
    _require_staging_environment()
    _require_seed_token(seed_token)

    if engine is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured",
        )

    try:
        PharmacyProduct.__table__.create(bind=engine, checkfirst=True)
        PharmacySale.__table__.create(bind=engine, checkfirst=True)
        PharmacySaleItem.__table__.create(bind=engine, checkfirst=True)
        PatientTransition.__table__.create(bind=engine, checkfirst=True)
        PatientVisitTransition.__table__.create(bind=engine, checkfirst=True)
        return {
            "created": True,
            "environment": _app_environment(),
            "tables": [
                "pharmacy_products",
                "pharmacy_sales_live",
                "pharmacy_sale_items_live",
                "patients_transition",
                "patient_visits_transition",
            ],
            "mode": "staging_only_create_missing_tables",
        }
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Pharmacy table setup failed: {exc.__class__.__name__}",
        ) from exc


def _app_environment() -> str:
    return (os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "development").lower()


def _require_staging_environment() -> None:
    if _app_environment() != "staging":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def _require_seed_token(seed_token: str | None) -> None:
    expected_token = os.getenv("STAGING_ADMIN_SEED_TOKEN")
    if not expected_token:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    if not seed_token or seed_token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid staging admin seed token",
        )
