"""Smoke tests for the HealthTrack API scaffold."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_check() -> None:
    """Verify the /api/health endpoint returns HTTP 200 and expected payload."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "healthtrack-api"}
