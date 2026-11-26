"""Tests for the GET /api/patients listing endpoint."""

from unittest.mock import MagicMock

from fastapi.testclient import TestClient
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.main import app


def test_list_patients_empty_database(client: TestClient) -> None:
    """Empty database returns HTTP 200 and an empty array."""
    response = client.get("/api/patients")
    assert response.status_code == 200
    assert response.json() == []


def test_list_patients_unique_and_alphabetical(client: TestClient) -> None:
    """Distinct patient IDs are returned once each in deterministic alphabetical order."""
    for pid, desc, sev in [
        ("PAT003", "Cough", 4),
        ("PAT001", "Headache", 5),
        ("PAT001", "Fatigue", 3),
        ("PAT002", "Nausea", 6),
        ("PAT003", "Fever", 7),
    ]:
        res = client.post(
            "/api/symptoms",
            json={"patient_id": pid, "description": desc, "severity": sev},
        )
        assert res.status_code == 201

    response = client.get("/api/patients")
    assert response.status_code == 200
    assert response.json() == [
        {"patient_id": "PAT001"},
        {"patient_id": "PAT002"},
        {"patient_id": "PAT003"},
    ]


def test_newly_created_patient_appears_in_list(client: TestClient) -> None:
    """Creating a symptom for a new patient immediately adds them to /api/patients."""
    assert client.get("/api/patients").json() == []

    res = client.post(
        "/api/symptoms",
        json={"patient_id": "PAT_NEW_01", "description": "Mild ache", "severity": 2},
    )
    assert res.status_code == 201

    assert client.get("/api/patients").json() == [{"patient_id": "PAT_NEW_01"}]


def test_list_patients_database_error_returns_safe_500() -> None:
    """Database errors on /api/patients return HTTP 500 without leaking internals."""
    broken_db = MagicMock(spec=Session)
    broken_db.scalars.side_effect = SQLAlchemyError("sqlite3 internal error")

    app.dependency_overrides[get_db] = lambda: broken_db
    try:
        with TestClient(app) as broken_client:
            response = broken_client.get("/api/patients")
        assert response.status_code == 500
        assert "sqlite3" not in response.json()["detail"]
    finally:
        app.dependency_overrides.clear()
