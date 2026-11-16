from datetime import date

from sqlalchemy import select
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
) -> list[models.Expense]:
    """Return a user's expenses with optional filters, newest date first."""
    statement = select(models.Expense).where(models.Expense.user_id == user_id)

    if category:
        statement = statement.where(models.Expense.category == category)
    if date_from:
        statement = statement.where(models.Expense.date >= date_from)
    if date_to:
        statement = statement.where(models.Expense.date <= date_to)
    if title and title.strip():
        escaped_title = _escape_like_text(title.strip())
        statement = statement.where(
            models.Expense.title.ilike(f"%{escaped_title}%", escape="\\")
        )

    statement = statement.order_by(models.Expense.date.desc(), models.Expense.id.desc())
    return list(db.scalars(statement).all())


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
