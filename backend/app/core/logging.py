"""Centralized logging for Vortex backend.

Usage (module scope):
    from app.core.logging import get_logger
    logger = get_logger(__name__)

Log level is controlled by the LOG_LEVEL env variable (default: info).
"""

import logging
import sys


_LEVEL_MAP: dict[str, int] = {
    "debug":    logging.DEBUG,
    "info":     logging.INFO,
    "warning":  logging.WARNING,
    "error":    logging.ERROR,
    "critical": logging.CRITICAL,
}

_DEV_FMT  = "%(asctime)s [%(levelname)-8s] %(name)s: %(message)s"
_PROD_FMT = "%(asctime)s [%(levelname)-8s] %(name)s %(funcName)s:%(lineno)d: %(message)s"

# Noisy third-party loggers — always silenced below WARNING
_QUIET_LOGGERS = [
    "yfinance", "peewee", "urllib3", "httpx", "httpcore",
    "celery.utils.functional", "multipart",
]


def configure_logging(level: str = "info", environment: str = "development") -> None:
    """Boot-time logger configuration. Call once in main.py lifespan."""
    log_level = _LEVEL_MAP.get(level.lower(), logging.INFO)
    fmt = _DEV_FMT if environment == "development" else _PROD_FMT

    logging.basicConfig(
        stream=sys.stdout,
        level=log_level,
        format=fmt,
        datefmt="%Y-%m-%dT%H:%M:%S",
        force=True,
    )

    for name in _QUIET_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    """Return a named logger. Typical usage: logger = get_logger(__name__)."""
    return logging.getLogger(name)
