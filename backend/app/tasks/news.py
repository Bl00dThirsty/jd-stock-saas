"""News-collection task — pulls headlines via yfinance per ticker.

yfinance exposes a ``.news`` attribute per Ticker. This task upserts items
keyed by URL so re-runs don't duplicate rows.
"""

from datetime import UTC, datetime

import yfinance as yf
from sqlalchemy import select

from app.core.logging import get_logger
from app.core.sync_db import SyncSessionLocal
from app.models.news import News
from app.models.stock import Stock
from app.scrapers.yahoo import to_yahoo
from app.tasks.celery_app import celery_app

logger = get_logger(__name__)

# Keep the per-run scope small to respect rate limits.
NEWS_BATCH = 15


@celery_app.task(name="app.tasks.news.collect_news")
def collect_news() -> dict:
    with SyncSessionLocal() as db:
        stocks = db.scalars(select(Stock).limit(NEWS_BATCH)).all()
        existing_urls = set(db.scalars(select(News.url)).all())

        added = 0
        for stock in stocks:
            try:
                items = yf.Ticker(to_yahoo(stock.symbol)).news or []
            except Exception:  # noqa: BLE001
                continue

            for item in items:
                content = item.get("content", item)
                url = (
                    content.get("canonicalUrl", {}).get("url")
                    or content.get("clickThroughUrl", {}).get("url")
                    or item.get("link")
                )
                title = content.get("title") or item.get("title")
                if not url or not title or url in existing_urls:
                    continue

                published = content.get("pubDate") or item.get("providerPublishTime")
                published_at = _parse_published(published)

                db.add(
                    News(
                        stock_id=stock.id,
                        title=title[:512],
                        url=url[:1024],
                        source=(content.get("provider", {}) or {}).get("displayName"),
                        summary=content.get("summary"),
                        published_at=published_at,
                    )
                )
                existing_urls.add(url)
                added += 1

        db.commit()
        logger.info("collect_news: %d articles added", added)
        return {"added": added}


def _parse_published(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=UTC)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
