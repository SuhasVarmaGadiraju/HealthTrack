"""Persistence and analytics service functions for symptom logs."""

from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import SymptomLog, utc_now
from app.schemas import DailySeverityTrend, SymptomCreate


def create_symptom_log(db: Session, payload: SymptomCreate) -> SymptomLog:
    """Persist a new symptom log with a monotonically unique server-generated UTC timestamp."""
    candidate_ts = utc_now()
    latest_ts = db.scalar(
        select(SymptomLog.timestamp)
        .where(SymptomLog.patient_id == payload.patient_id)
        .order_by(SymptomLog.timestamp.desc())
        .limit(1)
    )
    if latest_ts is not None:
        latest_utc = latest_ts.astimezone(timezone.utc)
        if candidate_ts <= latest_utc:
            candidate_ts = latest_utc + timedelta(microseconds=1)

    log = SymptomLog(
        patient_id=payload.patient_id,
        description=payload.description,
        severity=payload.severity,
        timestamp=candidate_ts,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def get_patient_symptoms(db: Session, patient_id: str) -> list[SymptomLog]:
    """Retrieve all symptom logs for a patient sorted chronologically."""
    stmt = (
        select(SymptomLog)
        .where(SymptomLog.patient_id == patient_id)
        .order_by(SymptomLog.timestamp.asc(), SymptomLog.id.asc())
    )
    return list(db.scalars(stmt).all())


def list_distinct_patients(db: Session) -> list[str]:
    """Return distinct synthetic patient IDs sorted alphabetically."""
    stmt = select(SymptomLog.patient_id).distinct().order_by(SymptomLog.patient_id.asc())
    return list(db.scalars(stmt).all())


def get_patient_severity_trends(
    db: Session,
    patient_id: str,
    days: int = 30,
    reference_time: datetime | None = None,
) -> list[DailySeverityTrend]:
    """Compute daily average severity over a 30-calendar-day UTC window including today.

    Records older than (today_utc - 29 days) or with timestamps after reference_time
    are excluded. Days without logs return average_severity=None and symptom_count=0.
    """
    now_utc = (reference_time or utc_now()).astimezone(timezone.utc)
    today_utc = now_utc.date()
    start_date = today_utc - timedelta(days=days - 1)
    window_start = datetime.combine(start_date, time.min, tzinfo=timezone.utc)

    stmt = (
        select(SymptomLog)
        .where(
            SymptomLog.patient_id == patient_id,
            SymptomLog.timestamp >= window_start,
            SymptomLog.timestamp <= now_utc,
        )
        .order_by(SymptomLog.timestamp.asc(), SymptomLog.id.asc())
    )
    logs = db.scalars(stmt).all()

    severities_by_date: dict[date, list[int]] = defaultdict(list)
    for log in logs:
        log_date = log.timestamp.astimezone(timezone.utc).date()
        severities_by_date[log_date].append(log.severity)

    trends: list[DailySeverityTrend] = []
    for offset in range(days):
        current_date = start_date + timedelta(days=offset)
        day_severities = severities_by_date.get(current_date, [])
        if day_severities:
            avg = round(sum(day_severities) / len(day_severities), 2)
            count = len(day_severities)
        else:
            avg = None
            count = 0

        trends.append(
            DailySeverityTrend(
                date=current_date.isoformat(),
                average_severity=avg,
                symptom_count=count,
            )
        )

    return trends
