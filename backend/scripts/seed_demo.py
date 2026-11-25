"""Manually executable script to seed synthetic demo symptom logs.

Usage (from backend/):
    .\\.venv\\Scripts\\python.exe -m scripts.seed_demo
"""

from datetime import datetime, time, timedelta, timezone

from sqlalchemy import select

from app.database import SessionLocal, init_db
from app.models import SymptomLog


def build_demo_records(reference_utc: datetime) -> list[tuple[str, str, int, datetime]]:
    """Build deterministic synthetic symptom records across the last 30 UTC days."""
    today = reference_utc.astimezone(timezone.utc).date()

    def at_day(days_ago: int, hour: int, minute: int, microsecond: int = 0) -> datetime:
        target_date = today - timedelta(days=days_ago)
        return datetime.combine(target_date, time(hour, minute, 0, microsecond), tzinfo=timezone.utc)

    return [
        # PAT001: 12 synthetic logs across the last 30 days, including multi-log days
        ("PAT001", "Mild morning sinus congestion", 3, at_day(26, 8, 15, 100000)),
        ("PAT001", "Tension headache after screen work", 5, at_day(22, 16, 40, 200000)),
        ("PAT001", "Persistent lower back stiffness", 6, at_day(18, 9, 10, 300000)),
        ("PAT001", "Afternoon fatigue and drowsiness", 4, at_day(14, 14, 25, 400000)),
        ("PAT001", "Dry cough and mild throat irritation", 5, at_day(10, 11, 5, 500000)),
        ("PAT001", "Worsening cough in the evening", 7, at_day(10, 20, 30, 600000)),
        ("PAT001", "Dizziness upon standing", 6, at_day(6, 10, 0, 150000)),
        ("PAT001", "Sharp migraine with light sensitivity", 9, at_day(3, 13, 45, 250000)),
        ("PAT001", "Residual headache following rest", 5, at_day(3, 19, 20, 350000)),
        ("PAT001", "Mild joint ache in knees", 3, at_day(1, 8, 50, 450000)),
        ("PAT001", "Morning neck stiffness", 4, at_day(0, 7, 30, 120000)),
        ("PAT001", "Moderate afternoon headache", 6, at_day(0, 15, 10, 240000)),
        # PAT002: 3 synthetic logs for patient-isolation verification
        ("PAT002", "Seasonal allergy sneezing", 2, at_day(12, 9, 0, 110000)),
        ("PAT002", "Mild wrist soreness", 4, at_day(5, 17, 15, 220000)),
        ("PAT002", "Occasional heartburn after dinner", 5, at_day(1, 21, 5, 330000)),
    ]


def seed_demo_data() -> None:
    """Insert synthetic demo records idempotently without deleting existing data."""
    init_db()
    records = build_demo_records(datetime.now(timezone.utc))
    inserted_counts: dict[str, int] = {}
    skipped_counts: dict[str, int] = {}

    with SessionLocal() as db:
        for patient_id, description, severity, timestamp in records:
            existing = db.scalar(
                select(SymptomLog.id).where(
                    SymptomLog.patient_id == patient_id,
                    SymptomLog.description == description,
                    SymptomLog.severity == severity,
                    SymptomLog.timestamp == timestamp,
                )
            )
            if existing is not None:
                skipped_counts[patient_id] = skipped_counts.get(patient_id, 0) + 1
                continue

            db.add(
                SymptomLog(
                    patient_id=patient_id,
                    description=description,
                    severity=severity,
                    timestamp=timestamp,
                )
            )
            inserted_counts[patient_id] = inserted_counts.get(patient_id, 0) + 1

        db.commit()

    total_inserted = sum(inserted_counts.values())
    total_skipped = sum(skipped_counts.values())
    print(f"Seed complete: {total_inserted} inserted, {total_skipped} already present.")
    for patient_id in sorted(set(inserted_counts) | set(skipped_counts)):
        print(
            f"  - {patient_id}: {inserted_counts.get(patient_id, 0)} inserted, "
            f"{skipped_counts.get(patient_id, 0)} skipped"
        )


if __name__ == "__main__":
    seed_demo_data()
