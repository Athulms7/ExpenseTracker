from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash

from .config import JWT_SECRET_KEY, SESSION_MAX_AGE_SECONDS

password_hash = PasswordHash.recommended()
_DUMMY_PASSWORD_HASH = password_hash.hash("not-a-real-user-password")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        return password_hash.verify(password, stored_hash)
    except (ValueError, TypeError):
        return False


def verify_unknown_user_password(password: str) -> None:
    # Keep unknown-user logins close to the cost of a real password check.
    verify_password(password, _DUMMY_PASSWORD_HASH)


def create_session_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(seconds=SESSION_MAX_AGE_SECONDS),
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")


def read_session_user_id(token: str) -> int | None:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        subject = payload.get("sub")
        if not isinstance(subject, str) or not subject.isdecimal():
            return None
        return int(subject)
    except (InvalidTokenError, TypeError, ValueError):
        return None
