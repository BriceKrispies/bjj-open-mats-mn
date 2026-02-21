"""URL helpers for crawling and scoring."""

from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

# Keywords that indicate a schedule/calendar page
SCHEDULE_KEYWORDS = [
    "schedule", "calendar", "classes", "class-schedule",
    "open-mat", "openmat", "open_mat", "events", "timetable",
    "weekly-schedule", "class-times",
]

# Path segments that strongly indicate THE schedule page (not just schedule-related)
TOP_SCHEDULE_SEGMENTS = {
    "schedule", "calendar", "class-schedule", "weekly-schedule",
    "class-times", "timetable",
}

# Keywords that indicate pages to avoid
NEGATIVE_KEYWORDS = [
    "pricing", "price", "rates", "cost", "membership",
    "contact", "about", "staff", "instructor", "team",
    "blog", "news", "shop", "store", "cart", "checkout",
    "login", "signup", "register", "account", "privacy",
    "terms", "waiver", "faq", "gallery", "photos",
    "testimonial", "review",
]

# Provider URL patterns
PROVIDER_PATTERNS: dict[str, list[str]] = {
    "mindbody": ["mindbodyonline.com", "healcode.com"],
    "zenplanner": ["zenplanner.com"],
    "mariana_tek": ["marianatek.com"],
    "pike13": ["pike13.com"],
    "google_calendar": ["calendar.google.com", "accounts.google.com/ServiceLogin"],
    "teamup": ["teamup.com"],
}


def is_same_domain(url: str, base_url: str) -> bool:
    """Check if url is on the same domain as base_url."""
    try:
        return urlparse(url).netloc == urlparse(base_url).netloc
    except Exception:
        return False


def normalize_url(url: str, base_url: str = "") -> str:
    """Resolve relative URLs and strip fragments."""
    if base_url:
        url = urljoin(base_url, url)
    parsed = urlparse(url)
    # Strip fragment
    return parsed._replace(fragment="").geturl()


def score_url(url: str, anchor_text: str = "") -> float:
    """Score a URL for schedule-relevance. Higher = more likely schedule page."""
    score = 0.0
    url_lower = url.lower()
    text_lower = anchor_text.lower()

    for kw in SCHEDULE_KEYWORDS:
        if kw in url_lower:
            score += 10.0
        if kw in text_lower:
            score += 5.0

    for kw in NEGATIVE_KEYWORDS:
        if kw in url_lower:
            score -= 8.0
        if kw in text_lower:
            score -= 4.0

    # Boost for shorter paths (likely top-level schedule pages)
    path = urlparse(url).path.strip("/")
    segments = path.split("/") if path else []
    depth = len(segments)
    if depth <= 2:
        score += 2.0
    if depth > 2:
        score -= 3.0 * (depth - 2)

    # Big boost when an entire path segment is a top-level schedule keyword
    # e.g. /schedule or /classes/calendar, NOT /programs/preschool-classes-ages-3
    for seg in segments:
        if seg.lower() in TOP_SCHEDULE_SEGMENTS:
            score += 10.0
            break

    return score


def detect_provider(url: str) -> str | None:
    """Detect a known schedule provider from a URL."""
    url_lower = url.lower()
    for provider, patterns in PROVIDER_PATTERNS.items():
        for pat in patterns:
            if pat in url_lower:
                return provider
    return None


def is_schedule_iframe(src: str) -> bool:
    """Check if an iframe src looks like a schedule embed."""
    if not src:
        return False
    src_lower = src.lower()
    # Check known providers
    if detect_provider(src):
        return True
    # Check schedule keywords
    return any(kw in src_lower for kw in SCHEDULE_KEYWORDS)
