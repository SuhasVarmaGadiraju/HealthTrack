"""REST API endpoint for listing existing synthetic patients.

Note: patient_id listing is for demonstration scoping only and is not
an authentication or authorization mechanism.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import PatientSummary
from app.services.symptoms import list_distinct_patients

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get(
    "",
    response_model=list[PatientSummary],
    status_code=status.HTTP_200_OK,
    summary="List distinct synthetic patients",
)
def list_patients(db: Session = Depends(get_db)) -> list[PatientSummary]:
    """Return all distinct patient IDs from symptom logs in alphabetical order."""
    try:
        patient_ids = list_distinct_patients(db)
        return [PatientSummary(patient_id=pid) for pid in patient_ids]
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to retrieve patient list due to a database error.",
        ) from exc
