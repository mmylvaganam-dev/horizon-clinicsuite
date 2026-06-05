import os
from typing import Optional

from dotenv import load_dotenv
from sqlalchemy import text
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker


load_dotenv()

APP_ENV = os.getenv("APP_ENV") or os.getenv("ENVIRONMENT") or "development"
DATABASE_URL = os.getenv("HCS_DATABASE_URL") or os.getenv("DATABASE_URL")
DATABASE_SSL = os.getenv("DATABASE_SSL", "false").lower() == "true"
DATABASE_POOL_MIN = int(os.getenv("DATABASE_POOL_MIN", "1"))
DATABASE_POOL_MAX = int(os.getenv("DATABASE_POOL_MAX", "5"))
DATABASE_CONNECTION_TIMEOUT_MS = int(
    os.getenv("DATABASE_CONNECTION_TIMEOUT_MS", "10000")
)
DATABASE_STATEMENT_TIMEOUT_MS = int(os.getenv("DATABASE_STATEMENT_TIMEOUT_MS", "30000"))


def _engine_options() -> dict:
    connect_args = {
        "connect_timeout": max(1, DATABASE_CONNECTION_TIMEOUT_MS // 1000),
        "options": f"-c statement_timeout={DATABASE_STATEMENT_TIMEOUT_MS}",
    }

    if DATABASE_SSL:
        connect_args["sslmode"] = "require"

    options = {
        "connect_args": connect_args,
        "pool_pre_ping": True,
    }

    options["pool_size"] = DATABASE_POOL_MIN
    options["max_overflow"] = max(0, DATABASE_POOL_MAX - DATABASE_POOL_MIN)

    return options


def _create_engine() -> tuple[Optional[Engine], Optional[Exception]]:
    if not DATABASE_URL:
        return None, None

    try:
        return create_engine(DATABASE_URL, **_engine_options()), None
    except Exception as exc:
        return None, exc


engine, engine_creation_error = _create_engine()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None


def _is_staging_like_environment() -> bool:
    return APP_ENV.lower() in {"development", "dev", "local", "staging", "test"}


def _safe_error_detail(error: Exception) -> str:
    detail = str(error).replace("\n", " ")
    return detail[:500]


def _database_error_payload(error: Exception, stage: str) -> dict[str, str]:
    payload = {
        "database": "configured_not_connected",
        "database_url_configured": "true",
        "database_engine": "sqlalchemy",
        "database_check": stage,
        "database_error_type": error.__class__.__name__,
    }

    if _is_staging_like_environment():
        payload["database_error_detail"] = _safe_error_detail(error)

    return payload


def get_database_status() -> dict[str, str]:
    if engine is None:
        if engine_creation_error is not None:
            return _database_error_payload(engine_creation_error, "engine_creation")

        return {
            "database": "configured_not_connected",
            "database_url_configured": "false",
            "database_check": "not_configured",
        }

    try:
        with engine.connect() as connection:
            connection.execute(text("select 1"))
    except SQLAlchemyError as exc:
        return _database_error_payload(exc, "connection")
    except Exception as exc:
        return _database_error_payload(exc, "connection")

    return {
        "database": "connected",
        "database_url_configured": "true",
        "database_engine": "sqlalchemy",
        "database_driver": engine.dialect.driver,
        "database_check": "select_1_passed",
    }


def get_db():
    if SessionLocal is None:
        raise RuntimeError("HCS_DATABASE_URL is not configured")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
