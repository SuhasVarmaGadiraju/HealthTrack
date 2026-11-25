"""Pytest fixtures providing an isolated temporary SQLite database per test."""

from collections.abc import Generator
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def db_session_factory(tmp_path: Path) -> Generator[sessionmaker[Session], None, None]:
    """Create an isolated SQLite database and session factory for each test."""
    test_db_path = tmp_path / "test_healthtrack.db"
    test_engine = create_engine(
        f"sqlite:///{test_db_path.as_posix()}",
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(
        bind=test_engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    Base.metadata.create_all(bind=test_engine)

    try:
        yield TestingSessionLocal
    finally:
        Base.metadata.drop_all(bind=test_engine)
        test_engine.dispose()


@pytest.fixture()
def db_session(db_session_factory: sessionmaker[Session]) -> Generator[Session, None, None]:
    """Provide a SQLAlchemy session bound to the isolated test database."""
    with db_session_factory() as session:
        yield session


@pytest.fixture()
def client(db_session_factory: sessionmaker[Session]) -> Generator[TestClient, None, None]:
    """Provide a FastAPI TestClient wired to the isolated test database."""

    def override_get_db() -> Generator[Session, None, None]:
        db = db_session_factory()
        try:
            yield db
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
