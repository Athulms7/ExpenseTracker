from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from .. import models
from ..config import SESSION_COOKIE_NAME
from ..database import get_db
from ..repositories import users as user_repository
from ..security import read_session_user_id


def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User:
    token = request.cookies.get(SESSION_COOKIE_NAME)
    user_id = read_session_user_id(token) if token else None
    user = user_repository.get_by_id(db, user_id) if user_id is not None else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Please log in to continue.",
        )
    return user
