"""Comprehensive tests for symptom creation, validation, retrieval, and reliability."""

import time
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.database import get_db
from app.main import app
from app.models import SymptomLog


def test_create_symptom_success(client: TestClient) -> None:
    """Valid symptom creation returns HTTP 201 and all required fields."""
    payload = {
        "patient_id": "  PAT001  ",
        "description": "  Headache and fatigue  ",
        "severity": 7,
    }
    response = client.post("/api/symptoms", json=payload)
    assert response.status_code == 201

    body = response.json()
    assert body["message"] == "Symptom logged successfully"
    data = body["data"]
    assert isinstance(data["id"], int)
    assert data["patient_id"] == "PAT001"
    assert data["description"] == "Headache and fatigue"
    assert data["severity"] == 7
    assert data["timestamp"].endswith("Z")
    parsed_ts = datetime.fromisoformat(data["timestamp"].replace("Z", "+00:00"))
    assert parsed_ts.tzinfo == timezone.utc


@pytest.mark.parametrize("severity", [1, 10])
def test_create_symptom_boundary_severities(client: TestClient, severity: int) -> None:
    """Boundary severity values 1 and 10 are accepted."""
    response = client.post(
        "/api/symptoms",
        json={"patient_id": "PAT001", "description": "Boundary test", "severity": severity},
    )
    assert response.status_code == 201
    assert response.json()["data"]["severity"] == severity


def test_five_logs_unique_timestamps_and_persistence(
    client: TestClient, db_session_factory: sessionmaker[Session]
) -> None:
    """Five logs for one patient have unique timestamps and persist across sessions."""
    for idx in range(5):
        if idx > 0:
            time.sleep(0.02)
        resp = client.post(
            "/api/symptoms",
            json={
                "patient_id": "PAT001",
                "description": f"Symptom entry {idx + 1}",
                "severity": (idx % 10) + 1,
            },
        )
        assert resp.status_code == 201

    get_resp = client.get("/api/symptoms", params={"patient_id": "PAT001"})
    assert get_resp.status_code == 200
    items = get_resp.json()
    assert len(items) == 5

    timestamps = [item["timestamp"] for item in items]
    assert len(set(timestamps)) == 5

    # Verify persistence in a brand-new database session
    with db_session_factory() as fresh_db:
        persisted = fresh_db.query(SymptomLog).filter(SymptomLog.patient_id == "PAT001").all()
        assert len(persisted) == 5


def test_chronological_and_deterministic_id_ordering(
    client: TestClient, db_session: Session
) -> None:
    """Records inserted out of order sort by timestamp ascending, then id ascending."""
    base = datetime(2026, 11, 20, 12, 0, 0, 123456, tzinfo=timezone.utc)
    t_latest = base + timedelta(hours=2)
    t_earliest = base - timedelta(hours=2)
    t_tied = base

    # Insert out of chronological order, including two records with identical timestamps
    db_session.add_all(
        [
            SymptomLog(patient_id="PAT001", description="Latest", severity=5, timestamp=t_latest),
            SymptomLog(patient_id="PAT001", description="Tied first", severity=3, timestamp=t_tied),
            SymptomLog(patient_id="PAT001", description="Earliest", severity=2, timestamp=t_earliest),
            SymptomLog(patient_id="PAT001", description="Tied second", severity=4, timestamp=t_tied),
        ]
    )
    db_session.commit()

    response = client.get("/api/symptoms", params={"patient_id": "PAT001"})
    assert response.status_code == 200
    descriptions = [item["description"] for item in response.json()]
    assert descriptions == ["Earliest", "Tied first", "Tied second", "Latest"]


@pytest.mark.parametrize(
    "payload",
    [
        {"patient_id": "PAT001", "description": "", "severity": 5},
        {"patient_id": "PAT001", "description": "   \t\n ", "severity": 5},
        {"patient_id": "", "description": "Headache", "severity": 5},
        {"patient_id": "   ", "description": "Headache", "severity": 5},
        {"patient_id": "PAT001", "description": "Headache"},
        {"patient_id": "PAT001", "severity": 5},
        {"description": "Headache", "severity": 5},
        {"patient_id": "PAT001", "description": "Headache", "severity": 0},
        {"patient_id": "PAT001", "description": "Headache", "severity": 11},
        {"patient_id": "PAT001", "description": "Headache", "severity": -3},
        {"patient_id": "PAT001", "description": "Headache", "severity": 5.5},
        {"patient_id": "PAT001", "description": "Headache", "severity": 5.0},
        {"patient_id": "PAT001", "description": "Headache", "severity": True},
        {"patient_id": "PAT001", "description": "Headache", "severity": False},
        {"patient_id": "PAT001", "description": "Headache", "severity": "5"},
        {"patient_id": "PAT001", "description": "Headache", "severity": None},
        {"patient_id": "PAT001", "description": "x" * 1001, "severity": 5},
        {"patient_id": "p" * 101, "description": "Headache", "severity": 5},
    ],
)
def test_create_symptom_validation_rejections(
    client: TestClient, payload: dict[str, object]
) -> None:
    """Invalid payloads are rejected with HTTP 422."""
    response = client.post("/api/symptoms", json=payload)
    assert response.status_code == 422


def test_patient_isolation_and_unknown_patient(client: TestClient) -> None:
    """Patient records are isolated and unknown patients receive an empty list."""
    client.post(
        "/api/symptoms",
        json={"patient_id": "PAT001", "description": "PAT001 headache", "severity": 6},
    )
    client.post(
        "/api/symptoms",
        json={"patient_id": "PAT002", "description": "PAT002 nausea", "severity": 4},
    )

    pat1 = client.get("/api/symptoms", params={"patient_id": "PAT001"}).json()
    pat2 = client.get("/api/symptoms", params={"patient_id": "PAT002"}).json()
    unknown = client.get("/api/symptoms", params={"patient_id": "PAT999"}).json()

    assert len(pat1) == 1
    assert pat1[0]["patient_id"] == "PAT001"
    assert len(pat2) == 1
    assert pat2[0]["patient_id"] == "PAT002"
    assert unknown == []


@pytest.mark.parametrize("params", [{}, {"patient_id": "   "}])
def test_get_symptoms_requires_valid_patient_id(
    client: TestClient, params: dict[str, str]
) -> None:
    """Missing or whitespace-only patient_id query parameter returns HTTP 422."""
    response = client.get("/api/symptoms", params=params)
    assert response.status_code == 422


@pytest.mark.parametrize(
    "bad_log",
    [
        SymptomLog(patient_id="PAT001", description="Invalid low", severity=0),
        SymptomLog(patient_id="PAT001", description="Invalid high", severity=11),
        SymptomLog(patient_id="PAT001", description="   ", severity=5),
        SymptomLog(patient_id="   ", description="Valid", severity=5),
    ],
)
def test_database_check_constraints_reject_invalid_direct_inserts(
    db_session: Session, bad_log: SymptomLog
) -> None:
    """SQLite CHECK constraints reject invalid records even on direct ORM inserts."""
    db_session.add(bad_log)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_database_error_returns_safe_500() -> None:
    """Unexpected SQLAlchemy errors return HTTP 500 without leaking internal details."""
    broken_db = MagicMock(spec=Session)
    broken_db.commit.side_effect = SQLAlchemyError("sqlite3.OperationalError: secret internal path")

    app.dependency_overrides[get_db] = lambda: broken_db
    try:
        with TestClient(app) as broken_client:
            response = broken_client.post(
                "/api/symptoms",
                json={"patient_id": "PAT001", "description": "Headache", "severity": 5},
            )
        assert response.status_code == 500
        detail = response.json()["detail"]
        assert "sqlite3" not in detail
        assert "secret internal path" not in detail
        broken_db.rollback.assert_called_once()
    finally:
        app.dependency_overrides.clear()
