from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator


Category = Literal["Food", "Transport", "Shopping", "Bills", "Entertainment", "Other"]


class ExpenseInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    amount: Decimal = Field(gt=0, max_digits=12, decimal_places=2)
    category: Category
    date: date
    note: str | None = Field(default=None, max_length=2000)

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank")
        return value

    @field_validator("note")
    @classmethod
    def clean_note(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None


class ExpenseOut(ExpenseInput):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ExpensePage(BaseModel):
    items: list[ExpenseOut]
    total: int
    limit: int
    offset: int


class CategoryTotal(BaseModel):
    category: Category
    total: Decimal
    count: int


class MonthlySummary(BaseModel):
    month: str
    total: Decimal
    count: int
    categories: list[CategoryTotal]


class Credentials(BaseModel):
    user_id: str = Field(min_length=3, max_length=32, pattern=r"^[A-Za-z0-9_-]+$")
    password: SecretStr = Field(min_length=1, max_length=128)

    @field_validator("user_id", mode="before")
    @classmethod
    def normalize_user_id(cls, value: str) -> str:
        return value.strip().lower() if isinstance(value, str) else value


class Registration(Credentials):
    password: SecretStr = Field(min_length=8, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
