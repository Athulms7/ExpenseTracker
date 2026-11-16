import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from .api.routes import auth, expenses, summary
from .config import APP_ORIGINS
from .database import engine, get_db
from .migrations import initialize_database

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Docker health checks help order services, while this retry also tolerates
    # manually starting the API before PostgreSQL is ready.
    for attempt in range(30):
        try:
            await asyncio.to_thread(initialize_database)
            break
        except SQLAlchemyError:
            if attempt == 29:
                logger.exception("Database did not become available during startup")
                raise
            await asyncio.sleep(1)
    yield
    engine.dispose()


app = FastAPI(title="Expense Tracker API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(APP_ORIGINS),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type"],
)
app.include_router(auth.router)
app.include_router(expenses.router)
app.include_router(summary.router)


@app.middleware("http")
async def validate_request_origin(request: Request, call_next):
    if request.method in {"POST", "PUT", "PATCH", "DELETE"} and request.url.path.startswith("/api/"):
        origin = request.headers.get("origin")
        if origin and origin not in APP_ORIGINS:
            return JSONResponse(status_code=403, content={"detail": "Request origin is not allowed."})
    return await call_next(request)


@app.exception_handler(SQLAlchemyError)
async def database_error_handler(_: Request, exc: SQLAlchemyError):
    logger.error("Database operation failed: %s", exc, exc_info=(type(exc), exc, exc.__traceback__))
    return JSONResponse(
        status_code=503,
        content={"detail": "The database is temporarily unavailable. Please try again."},
    )


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/api/health/ready", tags=["health"])
def readiness(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ready", "database": "connected"}
