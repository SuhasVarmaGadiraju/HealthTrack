"""SQLAlchemy ORM models for HealthTrack."""

from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, String, TypeDecorator
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utc_now() -> datetime:
    """Return the current UTC timestamp with microsecond precision."""
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator[datetime]):
    """Store datetimes in UTC and restore UTC tzinfo when reading from SQLite."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect: object) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)

    def process_result_value(self, value: datetime | None, dialect: object) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class SymptomLog(Base):
    """Persistent record of a patient's reported symptom and severity."""

    __tablename__ = "symptom_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str] = mapped_column(String(1000), nullable=False)
    severity: Mapped[int] = mapped_column(Integer, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False, default=utc_now)

    __table_args__ = (
        CheckConstraint("severity >= 1 AND severity <= 10", name="ck_symptom_logs_severity_range"),
        CheckConstraint("length(trim(patient_id)) > 0", name="ck_symptom_logs_patient_id_non_empty"),
        CheckConstraint("length(trim(description)) > 0", name="ck_symptom_logs_description_non_empty"),
        Index("ix_symptom_logs_patient_timestamp_id", "patient_id", "timestamp", "id"),
    )
