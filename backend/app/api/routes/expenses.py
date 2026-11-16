from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from ... import models
from ...database import get_db
from ...schemas import Category, ExpenseInput, ExpenseOut, ExpensePage
from ...services import expenses as expense_service
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/expenses", tags=["expenses"])


@router.get("", response_model=ExpensePage)
def list_expenses(
    category: Category | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    title: str | None = Query(default=None, max_length=160),
    limit: int = Query(default=10, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return expense_service.list_expenses(
            db,
            current_user.id,
            category=category,
            date_from=date_from,
            date_to=date_to,
            title=title,
            limit=limit,
            offset=offset,
        )
    except expense_service.InvalidDateRange as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@router.post("", response_model=ExpenseOut, status_code=status.HTTP_201_CREATED)
def create_expense(
    payload: ExpenseInput,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return expense_service.create_expense(db, current_user.id, payload)


@router.put("/{expense_id}", response_model=ExpenseOut)
def update_expense(
    expense_id: int,
    payload: ExpenseInput,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        return expense_service.update_expense(db, current_user.id, expense_id, payload)
    except expense_service.ExpenseNotFound as error:
        raise HTTPException(status_code=404, detail="Expense not found") from error


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    expense_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        expense_service.delete_expense(db, current_user.id, expense_id)
    except expense_service.ExpenseNotFound as error:
        raise HTTPException(status_code=404, detail="Expense not found") from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
