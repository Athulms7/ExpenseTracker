from sqlalchemy import inspect, text

from . import models  # noqa: F401 - register every table before create_all
from .database import Base, engine


def initialize_database() -> None:
    """Create fresh tables and apply safe local schema upgrades."""
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

        # Update the allowed-category constraint on existing databases too.
        # Only run DDL when the category list is old or the check is missing.
        constraints = inspect(connection).get_check_constraints("expenses")
        category_constraint = next(
            (
                constraint
                for constraint in constraints
                if constraint["name"] == "ck_expenses_category_allowed"
            ),
            None,
        )
        category_check_sql = category_constraint.get("sqltext", "") if category_constraint else ""
        if "'Health'" not in category_check_sql:
            # Replacing this check does not change or delete expense rows.
            connection.execute(
                text(
                    "ALTER TABLE expenses DROP CONSTRAINT IF EXISTS ck_expenses_category_allowed"
                )
            )
            connection.execute(
                text(
                    "ALTER TABLE expenses ADD CONSTRAINT ck_expenses_category_allowed "
                    "CHECK (category IN ('Food', 'Transport', 'Shopping', 'Bills', "
                    "'Entertainment', 'Health', 'Other'))"
                )
            )
