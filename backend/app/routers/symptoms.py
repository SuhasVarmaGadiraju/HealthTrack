"""REST API endpoints for symptom logging, retrieval, and trends.

Note: patient_id filtering is for demonstration scoping only and is not
an authentication or authorization mechanism.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import DailySeverityTrend, SymptomCreate, SymptomCreateResponse, SymptomResponse
from app.services.symptoms import (
    create_symptom_log,
    get_patient_severity_trends,
    get_patient_symptoms,
)

router = APIRouter(prefix="/api/symptoms", tags=["Symptoms"])


def validate_patient_id_query(
    patient_id: str = Query(..., description="Synthetic patient identifier (1-100 chars)."),
) -> str:
    """Validate and normalize the required patient_id query parameter."""
    trimmed = patient_id.strip()
    if not trimmed:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=[
                {
                    "type": "value_error",
                    "loc": ["query", "patient_id"],
                    "msg": "patient_id must not be empty or whitespace-only.",
                }
            ],
        )
    if len(trimmed) > 100:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=[
                {
                    "type": "string_too_long",
                    "loc": ["query", "patient_id"],
                    "msg": "patient_id must be at most 100 characters.",
                }
            ],
        )
    return trimmed


@router.post(
    "",
    response_model=SymptomCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log a new patient symptom",
)
def log_symptom(
    payload: SymptomCreate,
    db: Session = Depends(get_db),
) -> SymptomCreateResponse:
    """Validate and persist a new symptom log for a patient."""
    try:
        record = create_symptom_log(db, payload)
        return SymptomCreateResponse(
            message="Symptom logged successfully",
            data=SymptomResponse.model_validate(record),
        )
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to save symptom log due to a database error.",
        ) from exc


@router.get(
    "",
    response_model=list[SymptomResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve chronological symptom logs for a patient",
)
def list_symptoms(
    patient_id: str = Depends(validate_patient_id_query),
    db: Session = Depends(get_db),
) -> list[SymptomResponse]:
    """Return all symptom logs for the given patient sorted by timestamp and ID ascending."""
    try:
        records = get_patient_symptoms(db, patient_id)
        return [SymptomResponse.model_validate(record) for record in records]
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve symptom logs due to a database error.",
        ) from exc


@router.get(
    "/trends",
    response_model=list[DailySeverityTrend],
    status_code=status.HTTP_200_OK,
    summary="Retrieve 30-day daily average severity trends for a patient",
)
def list_symptom_trends(
    patient_id: str = Depends(validate_patient_id_query),
    db: Session = Depends(get_db),
) -> list[DailySeverityTrend]:
    """Return 30-day daily average severity metrics in ascending UTC date order."""
    try:
        return get_patient_severity_trends(db, patient_id)
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to compute symptom trends due to a database error.",
        ) from exc
