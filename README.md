# NGX Stock SaaS — Bourse Africaine (Nigerian Exchange)

A real-time stock-market intelligence SaaS for the **Nigerian Exchange (NGX)**.
Track ~146 NGX-listed equities, build portfolios, set price alerts, and read
market news — with near-real-time prices pushed over WebSocket.

> Data is collected from **Yahoo Finance** (`.LAGOS` suffix) with a
> **NGXPulse** fallback, refreshed every 5 minutes during market hours.
> This is *not* tick-by-tick streaming (see [Limitations](#limitations)).

---

## Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI · Python 3.12 · SQLAlchemy (async) · Alembic |
| Frontend | React 19 · TypeScript · Vite · Tailwind CSS v4 · Recharts |
| Database | PostgreSQL 16 |
| Cache / Realtime | Redis 7 · WebSocket (FastAPI native) |
| Auth | Google OAuth (authlib) + JWT (python-jose) |
| Scheduled jobs | Celery + Celery Beat (Redis broker) |
| Market data | yfinance + NGXPulse API |
| Infra | Docker + docker-compose |

---

## Project layout

```
ngx-stock-saas/
├── backend/            # FastAPI application
│   ├── app/
│   │   ├── api/v1/      # HTTP + WebSocket route handlers
│   │   ├── core/        # config, db engine, security, deps, redis
│   │   ├── models/      # SQLAlchemy ORM models
│   │   ├── schemas/     # Pydantic request/response models
│   │   ├── services/    # business logic
│   │   ├── scrapers/    # market-data collectors (yahoo, ngxpulse)
│   │   ├── tasks/       # Celery app + scheduled tasks
│   │   └── data/        # NGX ticker universe seed
│   ├── alembic/         # database migrations
│   └── tests/
├── frontend/           # React + Vite SPA
│   └── src/
│       ├── components/  # UI primitives + feature components
│       ├── pages/       # route-level screens
│       ├── hooks/       # useAuth, useWebSocket, useStockData
│       ├── services/    # axios API client
│       ├── store/       # zustand stores
│       └── lib/         # design tokens, helpers
├── docker-compose.yml
└── .env.example
```

---

## Quick start

### 1. Configure environment

```bash
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET and a JWT_SECRET_KEY
```

Generate a JWT secret:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

### 2. Run with Docker (recommended)

```bash
docker compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |

### 3. Apply migrations & seed tickers

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.data.seed
```

### 4. (Optional) Try it without Google — demo mode

When `ENVIRONMENT=development`, you can skip Google OAuth entirely:

```bash
# Fill the board with plausible random-walk data so the UI looks alive:
docker compose exec backend python -m app.data.seed_demo
```

Then open http://localhost:5173 and click **"Enter demo mode (no Google)"**
on the login screen. It signs you in as a demo investor via the
development-only `POST /api/v1/auth/dev-login` endpoint (disabled outside
development).

---

## Local development (without Docker)

**Backend**

```bash
cd backend
uv sync                 # or: pip install -e .
alembic upgrade head
uvicorn app.main:app --reload
celery -A app.tasks.celery_app worker --loglevel=info
celery -A app.tasks.celery_app beat --loglevel=info
```

**Frontend**

```bash
cd frontend
npm install
npm run dev
```

---

## Google OAuth setup

In [Google Cloud Console](https://console.cloud.google.com/apis/credentials):

- **Authorized JavaScript origins:** `http://localhost:5173`
- **Authorized redirect URIs:** `http://localhost:8000/api/v1/auth/google/callback`

Copy the Client ID + Secret into `.env`.

---

## Limitations

- The "real-time" feed is a 5-minute scrape, **not** tick-by-tick. True
  live NGX data requires a paid official feed (~$500–2000/mo).
- yfinance is unofficial; NGXPulse is the fallback for profiles/fundamentals.
- WebSocket only broadcasts collected prices — no exchange-grade streaming.

---

## License

MIT — for educational / MVP purposes.
