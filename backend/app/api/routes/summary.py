from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ... import models
from ...database import get_db
from ...schemas import MonthlySummary
from ...services import summaries as summary_service
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/summary", tags=["summary"])


@router.get("/monthly", response_model=MonthlySummary)
def monthly_summary(
    year: int | None = Query(default=None, ge=2000, le=2100),
    month: int | None = Query(default=None, ge=1, le=12),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return summary_service.monthly_summary(
        db,
        current_user.id,
        year=year,
        month=month,
    )
