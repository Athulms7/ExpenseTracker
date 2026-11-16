from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from .. import models


def get_by_username(db: Session, username: str) -> models.User | None:
    statement = select(models.User).where(models.User.username == username)
    return db.scalar(statement)


def get_by_id(db: Session, user_id: int) -> models.User | None:
    return db.get(models.User, user_id)


def count_users(db: Session) -> int:
    return db.scalar(select(func.count(models.User.id))) or 0


def lock_account_creation(db: Session) -> None:
    """Serialize registrations while deciding who claims legacy expenses."""
    db.execute(text("LOCK TABLE users IN EXCLUSIVE MODE"))


def add_user(db: Session, user: models.User) -> None:
    db.add(user)


def assign_unowned_expenses(db: Session, user_id: int) -> None:
    statement = (
        update(models.Expense)
        .where(models.Expense.user_id.is_(None))
        .values(user_id=user_id)
    )
    db.execute(statement)
