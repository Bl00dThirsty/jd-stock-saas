"""Custom exception hierarchy + FastAPI handlers.

Usage in endpoints:
    from app.core.exceptions import NotFoundError
    raise NotFoundError(f"Symbol '{symbol}' not found")

Register in main.py:
    app.add_exception_handler(VortexAPIError, vortex_exception_handler)
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse


class VortexAPIError(Exception):
    """Base class for all application-level errors.

    Subclasses set their own status_code and error_code at class level;
    instances carry the human-readable detail message.
    """

    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    error_code: str = "internal_error"

    def __init__(self, detail: str, *, error_code: str | None = None) -> None:
        self.detail = detail
        if error_code:
            self.error_code = error_code
        super().__init__(detail)


class NotFoundError(VortexAPIError):
    """Requested resource does not exist."""

    status_code = status.HTTP_404_NOT_FOUND
    error_code = "not_found"


class ConflictError(VortexAPIError):
    """Resource already exists or unique constraint violated."""

    status_code = status.HTTP_409_CONFLICT
    error_code = "conflict"


class LimitExceededError(VortexAPIError):
    """User has hit a per-account resource limit (watchlists, alerts…)."""

    status_code = status.HTTP_400_BAD_REQUEST
    error_code = "limit_exceeded"


class ValidationError(VortexAPIError):
    """Business-rule validation failed (distinct from Pydantic schema errors)."""

    status_code = 422  # Unprocessable Content
    error_code = "validation_error"


class ExternalServiceError(VortexAPIError):
    """Third-party scraper / API failure — non-fatal for the platform."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "external_service_unavailable"


# ── FastAPI handler ───────────────────────────────────────────────────────────


async def vortex_exception_handler(request: Request, exc: VortexAPIError) -> JSONResponse:
    """Convert any VortexAPIError into a uniform JSON error envelope."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"error_code": exc.error_code, "detail": exc.detail},
    )
