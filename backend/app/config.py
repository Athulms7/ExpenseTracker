import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BACKEND_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Create backend/.env from backend/.env.example "
        "or provide DATABASE_URL in the process environment."
    )

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if (
    not JWT_SECRET_KEY
    or len(JWT_SECRET_KEY) < 32
    or JWT_SECRET_KEY.startswith("replace-with-")
):
    raise RuntimeError(
        "JWT_SECRET_KEY must be set to at least 32 characters. "
        "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
    )

COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").strip().lower() == "true"
SESSION_MAX_AGE_SECONDS = 60 * 60 * 12
SESSION_COOKIE_NAME = "expense_session"
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "lax").strip().lower()
if SESSION_COOKIE_SAMESITE not in {"lax", "strict", "none"}:
    raise RuntimeError("SESSION_COOKIE_SAMESITE must be lax, strict, or none.")
if SESSION_COOKIE_SAMESITE == "none" and not COOKIE_SECURE:
    raise RuntimeError("SESSION_COOKIE_SAMESITE=none requires COOKIE_SECURE=true.")
APP_ORIGINS = tuple(
    origin.strip()
    for origin in os.getenv(
        "APP_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if origin.strip()
)
