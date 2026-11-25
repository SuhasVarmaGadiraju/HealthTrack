"""Smoke tests for the HealthTrack health endpoint."""

from fastapi.testclient import TestClient


def test_health_check(client: TestClient) -> None:
    """Verify the /api/health endpoint returns HTTP 200 and expected payload."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "healthtrack-api"}
