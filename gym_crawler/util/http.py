"""HTTP client with polite rate limiting."""

from __future__ import annotations

import time
from typing import Any

import httpx

from .log import get_logger

log = get_logger("http")

USER_AGENT = (
    "GymCrawler/0.1 (+https://github.com/bjj-open-mats; polite bot)"
)

# Per-domain last-request timestamps for rate limiting
_domain_timestamps: dict[str, float] = {}
_RATE_LIMIT_SECONDS = 0.5


def _rate_limit(domain: str) -> None:
    last = _domain_timestamps.get(domain, 0.0)
    elapsed = time.monotonic() - last
    if elapsed < _RATE_LIMIT_SECONDS:
        time.sleep(_RATE_LIMIT_SECONDS - elapsed)
    _domain_timestamps[domain] = time.monotonic()


def get_client() -> httpx.Client:
    return httpx.Client(
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
        timeout=15.0,
    )


def fetch(url: str, client: httpx.Client | None = None) -> httpx.Response | None:
    """Fetch a URL with rate limiting. Returns None on error."""
    from urllib.parse import urlparse

    domain = urlparse(url).netloc
    _rate_limit(domain)

    own_client = client is None
    if own_client:
        client = get_client()

    try:
        log.debug("GET %s", url)
        resp = client.get(url)
        resp.raise_for_status()
        return resp
    except httpx.HTTPError as e:
        log.warning("HTTP error fetching %s: %s", url, e)
        return None
    finally:
        if own_client:
            client.close()
