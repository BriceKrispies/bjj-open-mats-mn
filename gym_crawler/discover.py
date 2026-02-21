"""URL discovery: crawl a gym's homepage neighborhood to find schedule pages."""

from __future__ import annotations

from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from .models import Gym, UrlCandidate
from .util.http import fetch, get_client
from .util.log import get_logger
from .util.urls import (
    detect_provider,
    is_same_domain,
    is_schedule_iframe,
    normalize_url,
    score_url,
)

log = get_logger("discover")

MAX_PAGES = 10


def discover(gym: Gym, client: httpx.Client | None = None) -> list[UrlCandidate]:
    """Discover schedule-related URLs starting from gym.homepage.

    Crawls the homepage and up to MAX_PAGES internal pages, collecting
    links and iframes that look schedule-related.
    """
    if not gym.homepage:
        log.warning("No homepage for %s, cannot discover URLs", gym.name)
        return []

    own_client = client is None
    if own_client:
        client = get_client()

    try:
        return _crawl_neighborhood(gym.homepage, client)
    finally:
        if own_client:
            client.close()


def _crawl_neighborhood(
    homepage: str, client: httpx.Client
) -> list[UrlCandidate]:
    candidates: dict[str, UrlCandidate] = {}
    visited: set[str] = set()
    to_visit: list[str] = [homepage]
    pages_crawled = 0

    while to_visit and pages_crawled < MAX_PAGES:
        url = to_visit.pop(0)
        norm = normalize_url(url)
        if norm in visited:
            continue
        visited.add(norm)

        resp = fetch(norm, client)
        if resp is None:
            continue
        pages_crawled += 1

        content_type = resp.headers.get("content-type", "")
        if "text/html" not in content_type:
            continue

        soup = BeautifulSoup(resp.text, "lxml")
        page_candidates, page_links = _extract_from_page(soup, norm, homepage)

        for c in page_candidates:
            existing = candidates.get(c.url)
            if existing is None or c.score > existing.score:
                candidates[c.url] = c

        # Queue internal links for further crawling
        for link in page_links:
            if link not in visited and is_same_domain(link, homepage):
                to_visit.append(link)

    result = sorted(candidates.values(), key=lambda c: c.score, reverse=True)
    log.info(
        "Discovered %d candidate URLs across %d pages", len(result), pages_crawled
    )
    return result


def _extract_from_page(
    soup: BeautifulSoup, page_url: str, homepage: str
) -> tuple[list[UrlCandidate], list[str]]:
    """Extract schedule candidates and internal nav links from a page."""
    candidates: list[UrlCandidate] = []
    internal_links: list[str] = []

    # Check all <a> tags
    for a in soup.find_all("a", href=True):
        href = a["href"]
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue

        full_url = normalize_url(href, page_url)
        text = a.get_text(strip=True)
        url_score = score_url(full_url, text)

        if is_same_domain(full_url, homepage):
            internal_links.append(full_url)

        if url_score > 0:
            kind = "schedule"
            provider = detect_provider(full_url)
            if provider:
                kind = f"provider:{provider}"
            candidates.append(
                UrlCandidate(url=full_url, kind=kind, score=url_score)
            )

    # Check iframes for embedded schedule providers
    for iframe in soup.find_all("iframe", src=True):
        src = iframe["src"]
        if is_schedule_iframe(src):
            full_url = normalize_url(src, page_url)
            provider = detect_provider(full_url) or "iframe"
            candidates.append(
                UrlCandidate(
                    url=full_url,
                    kind=f"iframe:{provider}",
                    score=15.0,  # iframes are strong signals
                )
            )

    return candidates, internal_links
