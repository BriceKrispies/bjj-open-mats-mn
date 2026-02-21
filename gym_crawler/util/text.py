"""Text parsing helpers for schedule extraction."""

from __future__ import annotations

import re

DAYS_OF_WEEK = [
    "monday", "tuesday", "wednesday", "thursday",
    "friday", "saturday", "sunday",
]

DAY_ABBREVS: dict[str, str] = {
    "mon": "monday", "tue": "tuesday", "tues": "tuesday",
    "wed": "wednesday", "thu": "thursday", "thur": "thursday",
    "thurs": "thursday", "fri": "friday", "sat": "saturday",
    "sun": "sunday",
}

# Match times like 9:00 AM, 9:00am, 09:00, 9am, 9:30 PM, etc.
TIME_PATTERN = re.compile(
    r"(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?",
    re.IGNORECASE,
)

# Match time ranges like "9:00 AM - 10:30 AM" or "9-10:30am"
TIME_RANGE_PATTERN = re.compile(
    r"(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?"
    r"\s*[-–—to]+\s*"
    r"(\d{1,2}):?(\d{2})?\s*(am|pm|a\.m\.|p\.m\.)?",
    re.IGNORECASE,
)


def normalize_day(text: str) -> str:
    """Normalize a day name to lowercase full name."""
    text = text.strip().lower().rstrip("s.")  # "mondays" -> "monday"
    if text in DAYS_OF_WEEK:
        return text
    return DAY_ABBREVS.get(text, "")


def find_day_in_text(text: str) -> str:
    """Find the first day-of-week mention in text."""
    text_lower = text.lower()
    for day in DAYS_OF_WEEK:
        if day in text_lower:
            return day
    for abbrev, day in DAY_ABBREVS.items():
        if re.search(rf"\b{abbrev}\b", text_lower):
            return day
    return ""


def parse_time(raw: str) -> str:
    """Parse a time string into HH:MM 24h format. Returns '' on failure."""
    raw = raw.strip()
    m = TIME_PATTERN.search(raw)
    if not m:
        return ""

    hour = int(m.group(1))
    minute = int(m.group(2)) if m.group(2) else 0
    ampm = (m.group(3) or "").lower().replace(".", "")

    if ampm == "pm" and hour < 12:
        hour += 12
    elif ampm == "am" and hour == 12:
        hour = 0

    if hour > 23 or minute > 59:
        return ""

    return f"{hour:02d}:{minute:02d}"


def parse_time_range(text: str) -> tuple[str, str]:
    """Extract start and end time from a range string. Returns ('', '') on failure."""
    m = TIME_RANGE_PATTERN.search(text)
    if not m:
        # Try a single time
        single = parse_time(text)
        return (single, "") if single else ("", "")

    start_h = int(m.group(1))
    start_m = int(m.group(2)) if m.group(2) else 0
    start_ampm = (m.group(3) or "").lower().replace(".", "")

    end_h = int(m.group(4))
    end_m = int(m.group(5)) if m.group(5) else 0
    end_ampm = (m.group(6) or "").lower().replace(".", "")

    # If only end has ampm, infer start
    if end_ampm and not start_ampm:
        # If start hour is bigger, it's probably also pm, or same period
        if start_h <= end_h or end_ampm == "pm":
            start_ampm = end_ampm
        # Edge case: 11-1pm means 11am-1pm
        if start_h > end_h and end_ampm == "pm":
            start_ampm = "am"

    for ampm, h_val in [(start_ampm, start_h), (end_ampm, end_h)]:
        pass  # validation only

    if start_ampm == "pm" and start_h < 12:
        start_h += 12
    elif start_ampm == "am" and start_h == 12:
        start_h = 0

    if end_ampm == "pm" and end_h < 12:
        end_h += 12
    elif end_ampm == "am" and end_h == 12:
        end_h = 0

    if start_h > 23 or end_h > 23 or start_m > 59 or end_m > 59:
        return ("", "")

    return (f"{start_h:02d}:{start_m:02d}", f"{end_h:02d}:{end_m:02d}")
