# Spendly — Personal Expense Tracker

A local expense tracker with a React + Vite frontend, a FastAPI JSON API, and PostgreSQL running in Docker Compose. Users can create accounts with a user ID and password; each account has private expenses. Deployment is not configured.

## Requirements

- Docker Desktop with Docker Compose v2
- Python 3.10 or newer
- Node.js 20 or newer and npm

## Environment files

Each `.env` belongs to a different process:

| File | Read by | Purpose | Secret? |
| --- | --- | --- | --- |
| Root `.env` (optional; copy from root `.env.example`) | Docker Compose | Supplies `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, and host port substitutions when starting PostgreSQL. Compose already has local defaults if this file is absent. | Yes: keep passwords local and uncommitted. |
| `backend/.env` (copy from `backend/.env.example`) | FastAPI via `python-dotenv` | Supplies `DATABASE_URL`, `JWT_SECRET_KEY`, cookie settings, and allowed app origins. The database credentials are repeated inside `DATABASE_URL` so the API can connect to the container through the host port. Keep these values consistent with root `.env` when customized. | Yes: database password and signing key. Git ignores this file. Process environment variables take precedence. |
| `frontend/.env.local` (optional; copy from `frontend/.env.example`) | Vite | Supplies `VITE_API_URL`. This value is included in browser code, so use it only for public configuration; never put passwords or signing keys here. | No, if it contains only the API URL. |

Compose does not automatically pass its root `.env` values into the separately run FastAPI process. That is why the backend has its own connection URL. In a deployed setup, provide backend secrets through the host's environment/secret manager; Vite's `VITE_` values are public client configuration.

## Run locally (Windows PowerShell)

Open three PowerShell terminals in the project folder (`C:\Users\athul\Desktop\ExpenseTracker`). Start Docker Desktop first.

### 1. Start PostgreSQL and the database viewer

```powershell
docker compose up -d db adminer
docker compose ps
```

Wait until the `db` service reports healthy. Compose creates a persistent `postgres_data` volume. The default credentials are in `compose.yaml`. To customize Compose credentials or the host port, first copy the root `.env.example` to `.env` and edit it. The backend has its own `DATABASE_URL` setting, which must use matching credentials and port.

### View database tables in a browser

Open [http://localhost:8080](http://localhost:8080). Log in with:

| Field | Value |
| --- | --- |
| System | PostgreSQL |
| Server | `db` |
| Username | `expense_user` (or `POSTGRES_USER` from root `.env`) |
| Password | `expense_local_password` (or `POSTGRES_PASSWORD` from root `.env`) |
| Database | `expense_tracker` (or `POSTGRES_DB` from root `.env`) |

Select a table such as `expenses` or `users` to browse rows, or use Adminer's SQL command page for queries such as `SELECT * FROM expenses ORDER BY date DESC;`. The viewer is bound to `127.0.0.1`, so it is only exposed on this computer. Adminer can edit or delete database rows; use it carefully. The official Adminer image supports PostgreSQL and the `ADMINER_DEFAULT_SERVER` setting used here ([Docker Hub documentation](https://hub.docker.com/_/adminer)).

### 2. Start the API

```powershell
cd backend
Copy-Item .env.example .env
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Copy the template only the first time. It contains a placeholder `JWT_SECRET_KEY`; generate a strong local value with `python -c "import secrets; print(secrets.token_urlsafe(48))"` and replace the placeholder in `backend/.env`. Edit the existing file if you need to change the connection. If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass` in that terminal, then activate again.

The backend reads `DATABASE_URL` and `JWT_SECRET_KEY` from `backend/.env`. That local file is ignored by Git. When deploying, provide these as process/container environment variables through the hosting platform's secret manager; process environment values override the local `.env` file. Set `COOKIE_SECURE=true` for HTTPS, and set `APP_ORIGINS` to the exact frontend and backend origins. Never commit real credentials.

The API waits for PostgreSQL at startup, creates missing tables, and adds the ownership column to an existing expenses table without deleting its rows. Interactive API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs). Liveness check: [http://localhost:8000/api/health](http://localhost:8000/api/health); database readiness check: [http://localhost:8000/api/health/ready](http://localhost:8000/api/health/ready).

### 3. Start the frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally [http://localhost:5173](http://localhost:5173)). The frontend uses port `8000` on the same host for its API. To override that, copy `frontend/.env.example` to `frontend/.env.local`, edit `VITE_API_URL`, and restart Vite. Keep API and database running while using the app.

## What is implemented

- Create expenses with title, positive amount, category, date, and optional note.
- Register with a user ID and password, log in, and log out. User IDs are case-insensitive and use 3–32 letters, numbers, underscores, or hyphens; passwords require at least 8 characters.
- Each expense and monthly total is scoped to the signed-in account. Passwords are Argon2 hashed; sessions use a signed, HTTP-only cookie that expires after 12 hours.
- List expenses newest date first, 10 at a time with Previous/Next navigation; edit and delete individual entries. Pagination applies only to the visible list; monthly totals still aggregate all matching account expenses for that month.
- Show the current month's total and transaction count, daily average, top category, and totals for each category.
- Filter the list by category, inclusive date range, and case-insensitive partial title match. Title search updates as you type with a short debounce. Combining filters narrows results. Invalid reversed date ranges and invalid categories return a validation error. Title search treats `%` and `_` as ordinary characters.
- Handle loading, empty, API error, and form validation states. The API trims titles and notes, rejects blank titles, unknown categories, non-positive amounts, and malformed fields. Network failures, database unavailability, and invalid form data produce readable messages.
- Responsive layout for desktop and mobile. Amounts are displayed in INR (₹), with two decimal places.

## API overview

Authentication and expense requests use JSON; successful logout and delete return an empty response. Login and registration set an HTTP-only session cookie, which the browser sends automatically.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check |
| `GET` | `/api/health/ready` | Database readiness check |
| `POST` | `/api/auth/register` | Create an account and start a session |
| `POST` | `/api/auth/login` | Log in and start a session |
| `POST` | `/api/auth/logout` | End the browser session |
| `GET` | `/api/auth/me` | Return the signed-in account |
| `GET` | `/api/expenses` | List newest first in pages; optional `category`, `date_from`, `date_to`, `title`, `limit` (default 10, max 100), and `offset` (default 0) query parameters. Returns `items`, `total`, `limit`, and `offset`. |
| `POST` | `/api/expenses` | Create an expense |
| `PUT` | `/api/expenses/{id}` | Replace an expense's editable fields |
| `DELETE` | `/api/expenses/{id}` | Delete an expense |
| `GET` | `/api/summary/monthly` | Current-month summary; optional `year` and `month` parameters |

Allowed categories: `Food`, `Transport`, `Shopping`, `Bills`, `Entertainment`, `Other`. Dates use ISO format (`YYYY-MM-DD`). Amounts are positive decimals with at most two fractional digits. See `/docs` for request and response schemas.

Registration and login both accept `{"user_id":"alex_01","password":"your-password"}`. On success, the API sets an HTTP-only cookie; the frontend does not store the session token in local storage.

## Data and stack choices

- **React + Vite:** a small interactive UI with quick local startup and a straightforward build toolchain.
- **FastAPI + Pydantic:** typed request validation and generated API docs make the contract easy to inspect. `pwdlib` hashes passwords with Argon2; PyJWT signs expiring session cookies.
- **SQLAlchemy + PostgreSQL:** users and expenses are persisted relationally; expense ownership is enforced by the API, monetary values use `NUMERIC(12,2)`, dates use `DATE`, database constraints protect positive amounts, nonblank titles, and allowed categories, and category/date are indexed. Case-insensitive substring search is kept simple for this small dataset; a larger dataset could add a PostgreSQL trigram index. PostgreSQL is isolated in Docker; the API and Vite dev server run directly on the laptop.
- **Adminer:** an optional-in-practice local web database viewer started with Compose at `http://localhost:8080`.
- **Single currency:** INR display is intentional for this local tracker; conversion and multi-currency accounting are out of scope.

## Backend request and data flow

Routes are the HTTP boundary: they declare `Depends(get_db)` and `Depends(get_current_user)`, translate service errors into HTTP status codes, and return response schemas. Service functions receive `Session` and `user_id` as ordinary arguments, so they can be called directly without FastAPI. Repository functions contain the SQLAlchemy statements. `models.py` contains table definitions and constraints, not query methods. FastAPI reuses the same `get_db` dependency within a request, including the authenticated-user dependency.

## Persistence and reset

Expense data remains in the Docker volume when containers stop. Stop PostgreSQL while keeping data with:

```powershell
docker compose down
```

To permanently erase the local database and all recorded expenses:

```powershell
docker compose down -v
```

Then start it again with `docker compose up -d db`.

## Deliberate omissions and rough edges

- No password reset, email verification, user administration, or login rate limiting. Add rate limiting and account recovery before exposing registration publicly.
- Logout clears the browser cookie; signed tokens cannot be revoked server-side and expire after 12 hours. A production deployment needing immediate revocation should use server-side sessions or a token denylist.
- The first account registered after this update automatically receives any existing expenses that had no owner. New accounts only see their own expenses; other accounts cannot read, edit, or delete them.
- No deployment configuration or automated test suite.
- The API creates tables at startup and applies the current ownership-column upgrade for this local app. A production system should use versioned migrations (for example Alembic), managed secrets, and stronger operational checks.
- The transaction view fetches 10 rows at a time; there is no export or jump-to-page control. API callers can request up to 100 rows per page.
- INR is fixed in the UI; there is no configurable currency or locale preference. The database stores a decimal amount without a currency column.
- Deletion uses an in-app confirmation dialog. There is no undo or restore flow.
- If the database is unavailable at API startup, the API retries its connection for up to 30 seconds. Database failures after startup return HTTP 503; restart PostgreSQL and retry the request.

## Potential improvements

- Add an AI support assistant that can explain the app and answer questions about the signed-in user's own spending history. Keep all queries scoped to that user, and require explicit confirmation before any assistant-triggered changes to expense data. This is a future idea; no AI provider or assistant is currently integrated.
- Add password recovery, email verification, login rate limiting, and server-side session revocation before making account registration public.
- Add automated tests, versioned migrations, pagination jump controls, and data export as the app grows.

## Repository layout

```text
backend/app/
  api/routes/       Thin HTTP handlers for expenses, summary, and auth
  api/dependencies.py Request-bound database/user dependencies
  repositories/     Explicit SQLAlchemy read/write queries
  services/         Expense, summary, and auth rules using explicit sessions
  config.py         Environment-backed database, session, and origin settings
  security.py       Argon2 password hashing and signed session tokens
  database.py       SQLAlchemy engine, session factory, and request session
  migrations.py     Startup schema creation and local ownership upgrade
  .env.example      Local backend configuration template
  models.py         SQLAlchemy table definitions only
  schemas.py        Pydantic request and response validation
  main.py           FastAPI setup, startup, health checks, and error handling
frontend/src/
  components/       Reusable expense form dialog
  features/auth/    Login and account registration screen
  features/expenses/ Category metadata and expense table
  lib/              API client and date/currency formatting helpers
  App.jsx           Dashboard composition and UI state
compose.yaml        Local PostgreSQL service and persistent volume
                    plus localhost-only Adminer database viewer
```
