"""Tests for the 30-day daily average severity trends endpoint and service."""

from datetime import datetime, time, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import SymptomLog
from app.services.symptoms import get_patient_severity_trends


def test_trends_30_day_window_averages_and_exclusions(
    client: TestClient, db_session: Session
) -> None:
    """Trends endpoint returns 30 ordered UTC dates, accurate averages, and excludes out-of-window logs."""
    now_utc = datetime.now(timezone.utc)
    today_utc = now_utc.date()
    oldest_included_date = today_utc - timedelta(days=29)

    # Same-day multiple logs for today: (4 + 7) / 2 = 5.5
    t_today_1 = datetime.combine(today_utc, time(0, 1, 0), tzinfo=timezone.utc)
    t_today_2 = now_utc - timedelta(seconds=5)

    # Multi-log day 5 days ago with non-terminating decimal: (3 + 4 + 6) / 3 = 4.33
    d_five_ago = today_utc - timedelta(days=5)
    t_5_1 = datetime.combine(d_five_ago, time(8, 0, 0), tzinfo=timezone.utc)
    t_5_2 = datetime.combine(d_five_ago, time(12, 0, 0), tzinfo=timezone.utc)
    t_5_3 = datetime.combine(d_five_ago, time(18, 0, 0), tzinfo=timezone.utc)

    # Exact lower boundary (29 days ago at 00:00:00Z) -> included
    t_boundary_in = datetime.combine(oldest_included_date, time(0, 0, 0), tzinfo=timezone.utc)

    # 30 days ago at 23:59:59.999999Z -> excluded
    t_too_old = datetime.combine(
        today_utc - timedelta(days=30), time(23, 59, 59, 999999), tzinfo=timezone.utc
    )

    # Future timestamp -> excluded
    t_future = now_utc + timedelta(days=1)

    # Another patient's log today -> excluded from PAT001
    db_session.add_all(
        [
            SymptomLog(patient_id="PAT001", description="Today 1", severity=4, timestamp=t_today_1),
            SymptomLog(patient_id="PAT001", description="Today 2", severity=7, timestamp=t_today_2),
            SymptomLog(patient_id="PAT001", description="5d 1", severity=3, timestamp=t_5_1),
            SymptomLog(patient_id="PAT001", description="5d 2", severity=4, timestamp=t_5_2),
            SymptomLog(patient_id="PAT001", description="5d 3", severity=6, timestamp=t_5_3),
            SymptomLog(
                patient_id="PAT001", description="Boundary in", severity=8, timestamp=t_boundary_in
            ),
            SymptomLog(patient_id="PAT001", description="Too old", severity=10, timestamp=t_too_old),
            SymptomLog(patient_id="PAT001", description="Future", severity=10, timestamp=t_future),
            SymptomLog(patient_id="PAT002", description="Other pat", severity=9, timestamp=t_today_1),
        ]
    )
    db_session.commit()

    response = client.get("/api/symptoms/trends", params={"patient_id": "PAT001"})
    assert response.status_code == 200
    trends = response.json()

    assert len(trends) == 30
    dates = [item["date"] for item in trends]
    assert dates == sorted(dates)
    assert dates[0] == oldest_included_date.isoformat()
    assert dates[-1] == today_utc.isoformat()

    by_date = {item["date"]: item for item in trends}
    assert by_date[today_utc.isoformat()] == {
        "date": today_utc.isoformat(),
        "average_severity": 5.5,
        "symptom_count": 2,
    }
    assert by_date[d_five_ago.isoformat()] == {
        "date": d_five_ago.isoformat(),
        "average_severity": 4.33,
        "symptom_count": 3,
    }
    assert by_date[oldest_included_date.isoformat()] == {
        "date": oldest_included_date.isoformat(),
        "average_severity": 8.0,
        "symptom_count": 1,
    }

    # Verify missing dates use None (never 0) and symptom_count 0
    empty_day = (today_utc - timedelta(days=10)).isoformat()
    assert by_date[empty_day] == {
        "date": empty_day,
        "average_severity": None,
        "symptom_count": 0,
    }


def test_trends_patient_with_no_records(client: TestClient) -> None:
    """A patient with no records still receives 30 dates with null averages and zero counts."""
    response = client.get("/api/symptoms/trends", params={"patient_id": "PAT_EMPTY"})
    assert response.status_code == 200
    trends = response.json()
    assert len(trends) == 30
    assert all(item["average_severity"] is None and item["symptom_count"] == 0 for item in trends)


def test_trends_date_boundary_with_fixed_reference_time(db_session: Session) -> None:
    """Verify exact UTC date boundary behavior with a deterministic reference timestamp."""
    ref_time = datetime(2026, 11, 25, 12, 0, 0, tzinfo=timezone.utc)
    # 29 days before 2026-11-25 is 2026-10-27
    in_window = datetime(2026, 10, 27, 0, 0, 0, tzinfo=timezone.utc)
    just_before = datetime(2026, 10, 26, 23, 59, 59, 999999, tzinfo=timezone.utc)
    just_after = datetime(2026, 11, 25, 12, 0, 0, 1, tzinfo=timezone.utc)

    db_session.add_all(
        [
            SymptomLog(patient_id="PAT001", description="In", severity=2, timestamp=in_window),
            SymptomLog(patient_id="PAT001", description="Before", severity=9, timestamp=just_before),
            SymptomLog(patient_id="PAT001", description="After", severity=9, timestamp=just_after),
        ]
    )
    db_session.commit()

    trends = get_patient_severity_trends(db_session, "PAT001", days=30, reference_time=ref_time)
    assert len(trends) == 30
    assert trends[0].date == "2026-10-27"
    assert trends[0].average_severity == 2.0
    assert trends[0].symptom_count == 1
    assert trends[-1].date == "2026-11-25"
    assert trends[-1].average_severity is None
    assert trends[-1].symptom_count == 0
