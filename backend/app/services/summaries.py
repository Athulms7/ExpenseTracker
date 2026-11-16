from calendar import monthrange
from datetime import date

from sqlalchemy.orm import Session

from ..repositories import summaries as summary_repository
from ..schemas import CategoryTotal, MonthlySummary


def monthly_summary(
    db: Session,
    user_id: int,
    *,
    year: int | None,
    month: int | None,
) -> MonthlySummary:
    today = date.today()
    selected_year = year if year is not None else today.year
    selected_month = month if month is not None else today.month
    start = date(selected_year, selected_month, 1)
    end = date(selected_year, selected_month, monthrange(selected_year, selected_month)[1])

    total, count = summary_repository.get_month_totals(db, user_id, start, end)
    rows = summary_repository.get_category_totals(db, user_id, start, end)
    categories = [
        CategoryTotal(category=category, total=amount, count=category_count)
        for category, amount, category_count in rows
    ]
    return MonthlySummary(
        month=f"{selected_year:04d}-{selected_month:02d}",
        total=total,
        count=count,
        categories=categories,
    )
