"""FastAPI application entrypoint."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.exceptions import VortexAPIError, vortex_exception_handler
from app.core.logging import configure_logging, get_logger
from app.core.rate_limit import limiter
from app.core.redis import redis_client
from app.core.security_headers import SecurityHeadersMiddleware
from app.core.simulator import run_price_simulator

# Configure logging as early as possible so all subsequent imports see it.
configure_logging(level=settings.LOG_LEVEL, environment=settings.ENVIRONMENT)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify Redis connectivity (non-fatal in dev).
    try:
        await redis_client.ping()
        logger.info("Redis connection OK")
    except Exception as exc:  # noqa: BLE001
        logger.warning("Redis not reachable at startup: %s", exc)

    # Dev-only: stream simulated live ticks so the realtime UI is demonstrable.
    stop = asyncio.Event()
    sim_task: asyncio.Task | None = None
    if settings.ENVIRONMENT == "development":
        sim_task = asyncio.create_task(run_price_simulator(stop))
        logger.info("Price simulator started (development mode)")

    logger.info("Vortex API started — environment=%s", settings.ENVIRONMENT)
    yield

    # Shutdown
    stop.set()
    if sim_task is not None:
        await asyncio.gather(sim_task, return_exceptions=True)
    await redis_client.aclose()
    logger.info("Vortex API shut down cleanly")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="0.1.0",
    docs_url="/docs",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# ─── Middleware (order matters: outermost first) ─────────────────────────

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Application-level errors → uniform JSON envelope
app.add_exception_handler(VortexAPIError, vortex_exception_handler)  # type: ignore[arg-type]

# Session middleware is required by authlib for the OAuth state/nonce.
app.add_middleware(SessionMiddleware, secret_key=settings.JWT_SECRET_KEY)

# Security headers (CSP, HSTS, X-Frame-Options, etc.)
app.add_middleware(SecurityHeadersMiddleware)

# CORS
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
