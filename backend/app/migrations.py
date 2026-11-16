from sqlalchemy import inspect, text

from . import models  # noqa: F401 - register every table before create_all
from .database import Base, engine


def initialize_database() -> None:
    """Create fresh tables and apply the one-time local ownership upgrade."""
    Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:
        expense_columns = {
            column["name"]
            for column in inspect(connection).get_columns("expenses")
        }
        if "user_id" not in expense_columns:
            connection.execute(
                text(
                    "ALTER TABLE expenses ADD COLUMN user_id INTEGER "
                    "REFERENCES users(id) ON DELETE CASCADE"
                )
            )

        connection.execute(
            text("CREATE INDEX IF NOT EXISTS ix_expenses_user_id ON expenses (user_id)")
        )
