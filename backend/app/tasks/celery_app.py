"""Celery application + Beat schedule."""

from celery import Celery
from celery.schedules import crontab

from app.core.config import settings

celery_app = Celery(
    "ngx_saas",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "app.tasks.prices",
        "app.tasks.news",
        "app.tasks.alerts",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Africa/Lagos",
    enable_utc=True,
    task_track_started=True,
)

celery_app.conf.beat_schedule = {
    "collect-prices-5min": {
        "task": "app.tasks.prices.collect_prices",
        "schedule": 300.0,
    },
    "collect-historical-daily": {
        "task": "app.tasks.prices.collect_historical",
        # 18:00 WAT, ~2h after NGX close (16:00 WAT)
        "schedule": crontab(hour=18, minute=0),
    },
    "collect-profiles-daily": {
        "task": "app.tasks.prices.collect_profiles",
        "schedule": crontab(hour=7, minute=0),
    },
    "collect-news-hourly": {
        "task": "app.tasks.news.collect_news",
        "schedule": 3600.0,
    },
    "check-alerts-1min": {
        "task": "app.tasks.alerts.check_alerts",
        "schedule": 60.0,
    },
}
