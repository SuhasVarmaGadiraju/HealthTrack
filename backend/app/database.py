"""SQLAlchemy 2.x database engine, session management, and FastAPI dependency."""

from collections.abc import Generator

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    """Declarative base class for all SQLAlchemy ORM models."""


def _create_engine(database_url: str) -> Engine:
    """Create a SQLAlchemy engine configured for SQLite when applicable."""
    connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
    return create_engine(database_url, connect_args=connect_args)


engine = _create_engine(settings.resolved_database_url)
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


def init_db(target_engine: Engine = engine) -> None:
    """Create all database tables if they do not already exist."""
    import app.models  # noqa: F401 - ensure models are registered on Base.metadata

    Base.metadata.create_all(bind=target_engine)


def get_db() -> Generator[Session, None, None]:
    """Provide a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
