from datetime import date

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .. import models
from ..repositories import expenses as expense_repository
from ..schemas import ExpenseInput, ExpensePage


class ExpenseNotFound(Exception):
    pass


class InvalidDateRange(Exception):
    pass


def list_expenses(
    db: Session,
    user_id: int,
    *,
    category: str | None,
    date_from: date | None,
    date_to: date | None,
    title: str | None,
    limit: int,
    offset: int,
) -> ExpensePage:
    if date_from and date_to and date_from > date_to:
        raise InvalidDateRange("date_from must be on or before date_to")
    items, total = expense_repository.list_for_user(
        db,
        user_id,
        category=category,
        date_from=date_from,
        date_to=date_to,
        title=title,
        limit=limit,
        offset=offset,
    )
    return ExpensePage(items=items, total=total, limit=limit, offset=offset)


def create_expense(db: Session, user_id: int, payload: ExpenseInput) -> models.Expense:
    expense = models.Expense(**payload.model_dump(), user_id=user_id)
    expense_repository.add(db, expense)
    _commit(db)
    return expense


def update_expense(
    db: Session,
    user_id: int,
    expense_id: int,
    payload: ExpenseInput,
) -> models.Expense:
    expense = expense_repository.get_for_user(db, expense_id, user_id)
    if expense is None:
        raise ExpenseNotFound

    for field_name, value in payload.model_dump().items():
        setattr(expense, field_name, value)
    _commit(db)
    return expense


def delete_expense(db: Session, user_id: int, expense_id: int) -> None:
    expense = expense_repository.get_for_user(db, expense_id, user_id)
    if expense is None:
        raise ExpenseNotFound
    expense_repository.remove(db, expense)
    _commit(db)


def _commit(db: Session) -> None:
    try:
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        raise
