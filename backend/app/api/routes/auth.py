from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from ... import models
from ...config import (
    COOKIE_SECURE,
    SESSION_COOKIE_NAME,
    SESSION_COOKIE_SAMESITE,
    SESSION_MAX_AGE_SECONDS,
)
from ...database import get_db
from ...schemas import Credentials, Registration, UserOut
from ...security import create_session_token
from ...services import auth as auth_service
from ..dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["authentication"])


def set_session_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=create_session_token(user_id),
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=SESSION_COOKIE_SAMESITE,
        path="/api",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(
    payload: Registration,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        user = auth_service.register_user(
            db,
            username=payload.user_id,
            password=payload.password.get_secret_value(),
        )
    except auth_service.DuplicateUserId as error:
        raise HTTPException(status_code=409, detail="That user ID is already registered.") from error

    set_session_cookie(response, user.id)
    return user


@router.post("/login", response_model=UserOut)
def login(
    payload: Credentials,
    response: Response,
    db: Session = Depends(get_db),
):
    try:
        user = auth_service.authenticate_user(
            db,
            username=payload.user_id,
            password=payload.password.get_secret_value(),
        )
    except auth_service.InvalidCredentials as error:
        raise HTTPException(status_code=401, detail="Invalid user ID or password.") from error

    set_session_cookie(response, user.id)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/api",
        secure=COOKIE_SECURE,
        httponly=True,
        samesite=SESSION_COOKIE_SAMESITE,
    )
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=UserOut)
def who_am_i(current_user: models.User = Depends(get_current_user)):
    return current_user
