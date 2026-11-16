from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models


def get_month_totals(
    db: Session, user_id: int, start: date, end: date
) -> tuple[Decimal, int]:
    statement = (
        select(
            func.coalesce(func.sum(models.Expense.amount), 0),
            func.count(models.Expense.id),
        )
        .where(
            models.Expense.user_id == user_id,
            models.Expense.date >= start,
            models.Expense.date <= end,
        )
    )
    total, count = db.execute(statement).one()
    return total, count


def get_category_totals(db: Session, user_id: int, start: date, end: date):
    statement = (
        select(
            models.Expense.category,
            func.sum(models.Expense.amount),
            func.count(models.Expense.id),
        )
        .where(
            models.Expense.user_id == user_id,
            models.Expense.date >= start,
            models.Expense.date <= end,
        )
        .group_by(models.Expense.category)
        .order_by(models.Expense.category)
    )
    return db.execute(statement).all()
