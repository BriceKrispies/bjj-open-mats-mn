"""Aura Schedule adapter — extracts from `.aura-schedule__class-*` markup.

Detected on pages from gym sites using the Aura scheduling widget (e.g.
The Cellar Gym). Class rows carry CSS classes like:

    .aura-schedule__class-text
    .aura-schedule__class-time
    .aura-schedule__class-duration
    .aura-schedule__class-title      ("BJJ")
    .aura-schedule__class-focus      ("Open Mat", "Fighter Flow", etc.)
    .aura-schedule__class-level      ("All-Levels")
    .aura-schedule__class-coach-title
"""

from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup, Tag

from ..models import Gym, RawEvent
from ..util.log import get_logger
from ..util.text import find_day_in_text, normalize_day, parse_time

log = get_logger("extract.aura")

_DETECT_SELECTOR = ".aura-schedule__class-text"

# Patterns that indicate member-gated classes
_MEMBERS_ONLY_PATTERNS = re.compile(
    r"\bmembers?\s*only\b", re.IGNORECASE,
)

_DURATION_PATTERN = re.compile(r"(\d+)\s*min", re.IGNORECASE)


class AuraScheduleAdapter:
    """Provider-specific adapter for Aura Schedule widgets."""

    @property
    def name(self) -> str:
        return "aura_schedule"

    def detect(self, html: str, url: str) -> bool:
        return "aura-schedule__class-text" in html

    def extract(
        self, html: str, url: str, gym: Gym | None = None
    ) -> list[RawEvent]:
        soup = BeautifulSoup(html, "lxml")
        events: list[RawEvent] = []

        # Attempt to find day context from page structure.
        # Aura pages sometimes group classes under day headings.
        current_day = ""

        # Walk through all elements in document order to track day context
        for el in soup.descendants:
            if not isinstance(el, Tag):
                continue

            # Day headings: look for heading tags or special Aura day elements
            if el.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
                day = _extract_day(el.get_text(strip=True))
                if day:
                    current_day = day
                    continue

            # Also check for Aura-specific day containers
            el_classes = " ".join(el.get("class", []))
            if "aura-schedule__day" in el_classes:
                day_text = ""
                day_header = el.find(class_=re.compile(r"aura-schedule__day-(title|name|header)"))
                if day_header:
                    day_text = day_header.get_text(strip=True)
                else:
                    day_text = el.get_text(strip=True)[:30]
                day = _extract_day(day_text)
                if day:
                    current_day = day

            # Process class rows
            if "aura-schedule__class-text" not in el_classes:
                continue

            event = _parse_class_row(el, url, current_day)
            if event:
                events.append(event)

        log.info("Aura adapter extracted %d events", len(events))
        return events


def _extract_day(text: str) -> str:
    """Try to extract a day of week from text."""
    day = normalize_day(text)
    if day:
        return day
    return find_day_in_text(text)


def _parse_class_row(el: Tag, source_url: str, day: str) -> RawEvent | None:
    """Parse a single .aura-schedule__class-text element into a RawEvent."""

    def _text(cls: str) -> str:
        child = el.find(class_=cls)
        return child.get_text(strip=True) if child else ""

    time_raw = _text("aura-schedule__class-time")
    duration_raw = _text("aura-schedule__class-duration")
    title = _text("aura-schedule__class-title")
    focus = _text("aura-schedule__class-focus")
    level = _text("aura-schedule__class-level")

    # Coaches (may be multiple)
    coaches: list[str] = []
    for coach_el in el.find_all(class_="aura-schedule__class-coach-title"):
        name = coach_el.get_text(strip=True)
        if name:
            coaches.append(name)

    # Parse time
    start_time = parse_time(time_raw) if time_raw else ""

    # Parse duration -> compute end time
    end_time = ""
    duration_minutes = 0
    dm = _DURATION_PATTERN.search(duration_raw)
    if dm:
        duration_minutes = int(dm.group(1))
    if start_time and duration_minutes:
        end_time = _add_minutes(start_time, duration_minutes)

    # Build display title: "Title Focus" (e.g. "BJJ Open Mat")
    display_parts = [p for p in (title, focus) if p]
    display_title = " ".join(display_parts) if display_parts else title or focus or ""

    if not display_title and not start_time:
        return None

    # Check for members-only gating in the full row text
    full_text = el.get_text(" ", strip=True)
    members_only = bool(_MEMBERS_ONLY_PATTERNS.search(full_text))

    raw_data = {
        "adapter": "aura_schedule",
        "title": title,
        "focus": focus,
        "level": level,
        "coaches": coaches,
        "duration_minutes": duration_minutes,
        "members_only": members_only,
        "time_raw": time_raw,
        "duration_raw": duration_raw,
    }

    return RawEvent(
        title=display_title,
        day_of_week=day,
        start_time=start_time,
        end_time=end_time,
        source_url=source_url,
        raw_json=json.dumps(raw_data),
        confidence=0.7,
    )


def _add_minutes(time_24h: str, minutes: int) -> str:
    """Add minutes to a HH:MM string and return HH:MM."""
    parts = time_24h.split(":")
    h, m = int(parts[0]), int(parts[1])
    total = h * 60 + m + minutes
    return f"{(total // 60) % 24:02d}:{total % 60:02d}"
