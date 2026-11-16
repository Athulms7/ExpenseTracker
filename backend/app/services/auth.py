from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from .. import models
from ..repositories import users as user_repository
from ..security import hash_password, verify_password, verify_unknown_user_password


class DuplicateUserId(Exception):
    pass


class InvalidCredentials(Exception):
    pass


def register_user(db: Session, username: str, password: str) -> models.User:
    # Hash before acquiring the registration lock so other signups aren't held
    # up by Argon2's intentionally expensive password hashing.
    password_digest = hash_password(password)

    try:
        user_repository.lock_account_creation(db)
        first_user = user_repository.count_users(db) == 0
        if user_repository.get_by_username(db, username) is not None:
            raise DuplicateUserId

        user = models.User(username=username, password_hash=password_digest)
        user_repository.add_user(db, user)
        db.flush()

        if first_user:
            user_repository.assign_unowned_expenses(db, user.id)

        db.commit()
        return user
    except DuplicateUserId:
        db.rollback()
        raise
    except IntegrityError as error:
        db.rollback()
        raise DuplicateUserId from error
    except SQLAlchemyError:
        db.rollback()
        raise


def authenticate_user(db: Session, username: str, password: str) -> models.User:
    user = user_repository.get_by_username(db, username)
    if user is None:
        verify_unknown_user_password(password)
        raise InvalidCredentials
    if not verify_password(password, user.password_hash):
        raise InvalidCredentials
    return user
