"""FastAPI application entrypoint."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.redis import redis_client
from app.core.simulator import run_price_simulator


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify Redis connectivity (non-fatal in dev).
    try:
        await redis_client.ping()
    except Exception:  # noqa: BLE001
        pass

    # Dev-only: stream simulated live ticks so the realtime UI is demonstrable.
    stop = asyncio.Event()
    sim_task: asyncio.Task | None = None
    if settings.ENVIRONMENT == "development":
        sim_task = asyncio.create_task(run_price_simulator(stop))

    yield

    # Shutdown
    stop.set()
    if sim_task is not None:
        await asyncio.gather(sim_task, return_exceptions=True)
    await redis_client.aclose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Session middleware is required by authlib for the OAuth state/nonce.
app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET_KEY)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.PROJECT_NAME}
