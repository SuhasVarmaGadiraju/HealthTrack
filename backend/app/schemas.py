"""Pydantic v2 request and response schemas for symptom tracking."""

from datetime import datetime, timezone
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_serializer, field_validator


def _validate_non_empty_trimmed(value: str, field_name: str, max_length: int) -> str:
    """Trim surrounding whitespace and enforce non-empty and max-length constraints."""
    trimmed = value.strip()
    if not trimmed:
        raise ValueError(f"{field_name} must not be empty or whitespace-only.")
    if len(trimmed) > max_length:
        raise ValueError(f"{field_name} must be at most {max_length} characters.")
    return trimmed


class SymptomCreate(BaseModel):
    """Request payload for logging a new symptom."""

    patient_id: str = Field(..., description="Synthetic patient identifier (1-100 chars).")
    description: str = Field(..., description="Symptom description (1-1000 chars).")
    severity: Annotated[
        StrictInt,
        Field(ge=1, le=10, description="Strict integer severity rating from 1 to 10."),
    ]

    @field_validator("patient_id")
    @classmethod
    def validate_patient_id(cls, value: str) -> str:
        return _validate_non_empty_trimmed(value, "patient_id", 100)

    @field_validator("description")
    @classmethod
    def validate_description(cls, value: str) -> str:
        return _validate_non_empty_trimmed(value, "description", 1000)


class SymptomResponse(BaseModel):
    """Serialized symptom log record returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: str
    description: str
    severity: int
    timestamp: datetime

    @field_serializer("timestamp")
    def serialize_timestamp(self, value: datetime) -> str:
        """Serialize timestamp as ISO 8601 UTC with explicit Z suffix."""
        utc_dt = value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc)
        return utc_dt.isoformat().replace("+00:00", "Z")


class SymptomCreateResponse(BaseModel):
    """Response envelope returned after successfully creating a symptom log."""

    message: str
    data: SymptomResponse


class DailySeverityTrend(BaseModel):
    """Daily aggregated symptom severity metric for a single UTC calendar date."""

    date: str
    average_severity: float | None
    symptom_count: int
