import os
from typing import Optional

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
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


engine: Optional[Engine] = (
    create_engine(DATABASE_URL, **_engine_options()) if DATABASE_URL else None
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None


def get_database_status() -> dict[str, str]:
    return {"database": "configured_not_connected"}


def get_db():
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL is not configured")

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
