"""Extract events from Google Calendar embeds or ICS feeds."""

from __future__ import annotations

import re
from datetime import datetime, timedelta

from ..models import RawEvent
from ..util.log import get_logger
from ..util.text import DAYS_OF_WEEK

log = get_logger("extract.gcal")

# Match ICS VEVENT blocks
VEVENT_PATTERN = re.compile(
    r"BEGIN:VEVENT(.*?)END:VEVENT", re.DOTALL
)

ICS_FIELD_PATTERN = re.compile(r"^([A-Z\-;]+):(.*)$", re.MULTILINE)


def extract_from_ics(ics_text: str, source_url: str = "") -> list[RawEvent]:
    """Parse an ICS/iCalendar feed into RawEvent list."""
    events: list[RawEvent] = []

    for match in VEVENT_PATTERN.finditer(ics_text):
        block = match.group(1)
        fields = _parse_ics_fields(block)

        summary = fields.get("SUMMARY", "")
        dtstart_raw = fields.get("DTSTART", "")
        dtend_raw = fields.get("DTEND", "")

        if not summary:
            continue

        day, start_time = _parse_ics_datetime(dtstart_raw)
        _, end_time = _parse_ics_datetime(dtend_raw)
        location = fields.get("LOCATION", "")

        events.append(RawEvent(
            title=summary,
            day_of_week=day,
            start_time=start_time,
            end_time=end_time,
            location=location,
            source_url=source_url,
        ))

    log.info("Extracted %d events from ICS feed", len(events))
    return events


def detect_google_calendar_url(html: str) -> str | None:
    """Look for Google Calendar embed URLs or ICS feed links in HTML."""
    # Look for calendar embed iframe
    iframe_match = re.search(
        r'src=["\']([^"\']*calendar\.google\.com[^"\']*)["\']',
        html, re.IGNORECASE,
    )
    if iframe_match:
        return iframe_match.group(1)

    # Look for ICS links
    ics_match = re.search(
        r'href=["\']([^"\']*\.ics)["\']', html, re.IGNORECASE
    )
    if ics_match:
        return ics_match.group(1)

    return None


def _parse_ics_fields(block: str) -> dict[str, str]:
    """Parse ICS fields, handling line continuations."""
    # Unfold continuation lines
    unfolded = re.sub(r"\r?\n[ \t]", "", block)
    fields: dict[str, str] = {}
    for m in ICS_FIELD_PATTERN.finditer(unfolded):
        key = m.group(1).split(";")[0]  # strip params like DTSTART;VALUE=DATE
        fields[key] = m.group(2).strip()
    return fields


def _parse_ics_datetime(raw: str) -> tuple[str, str]:
    """Parse ICS datetime into (day_of_week, HH:MM). Returns ('', '') on failure."""
    if not raw:
        return ("", "")

    # Strip timezone ID prefix like TZID=America/Chicago:
    if ":" in raw:
        raw = raw.split(":")[-1]

    # Format: 20240115T093000 or 20240115T093000Z
    raw = raw.replace("Z", "").strip()
    try:
        if "T" in raw:
            dt = datetime.strptime(raw, "%Y%m%dT%H%M%S")
            day = DAYS_OF_WEEK[dt.weekday()]
            time_str = f"{dt.hour:02d}:{dt.minute:02d}"
            return (day, time_str)
        else:
            # Date only, no time
            dt = datetime.strptime(raw, "%Y%m%d")
            day = DAYS_OF_WEEK[dt.weekday()]
            return (day, "")
    except ValueError:
        return ("", "")
