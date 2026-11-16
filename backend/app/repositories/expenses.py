from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models


def list_for_user(
    db: Session,
    user_id: int,
    *,
    category: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    title: str | None = None,
    limit: int = 10,
    offset: int = 0,
) -> tuple[list[models.Expense], int]:
    """Return a filtered page and matching row count, newest date first."""
    conditions = [models.Expense.user_id == user_id]

    if category:
        conditions.append(models.Expense.category == category)
    if date_from:
        conditions.append(models.Expense.date >= date_from)
    if date_to:
        conditions.append(models.Expense.date <= date_to)
    if title and title.strip():
        escaped_title = _escape_like_text(title.strip())
        conditions.append(
            models.Expense.title.ilike(f"%{escaped_title}%", escape="\\")
        )

    total_statement = select(func.count(models.Expense.id)).where(*conditions)
    total = db.scalar(total_statement) or 0

    page_statement = (
        select(models.Expense)
        .where(*conditions)
        .order_by(models.Expense.date.desc(), models.Expense.id.desc())
        .limit(limit)
        .offset(offset)
    )
    items = list(db.scalars(page_statement).all())
    return items, total


def get_for_user(db: Session, expense_id: int, user_id: int) -> models.Expense | None:
    """Find an expense only when it belongs to the requesting user."""
    statement = select(models.Expense).where(
        models.Expense.id == expense_id,
        models.Expense.user_id == user_id,
    )
    return db.scalar(statement)


def add(db: Session, expense: models.Expense) -> None:
    db.add(expense)


def remove(db: Session, expense: models.Expense) -> None:
    db.delete(expense)


def _escape_like_text(value: str) -> str:
    """Make SQL LIKE wildcards literal within a user-provided search term."""
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
