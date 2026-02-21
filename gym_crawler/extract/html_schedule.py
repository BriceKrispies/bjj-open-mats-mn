"""Extract schedule events from plain HTML pages.

Handles common patterns:
- Tables with day/time/class columns
- Day-header sections with class lists underneath
- Card/list layouts with time + class name
"""

from __future__ import annotations

import json
import re

from bs4 import BeautifulSoup, Tag

from ..models import RawEvent
from ..util.log import get_logger
from ..util.text import DAYS_OF_WEEK, find_day_in_text, normalize_day, parse_time_range

log = get_logger("extract.html")


def extract_from_html(html: str, source_url: str = "") -> list[RawEvent]:
    """Try multiple strategies to extract events from HTML."""
    soup = BeautifulSoup(html, "lxml")
    events: list[RawEvent] = []

    # Strategy 1: Tables
    events = _try_tables(soup, source_url)
    if events:
        log.info("Extracted %d events via table strategy", len(events))
        return events

    # Strategy 2: Day-header sections
    events = _try_day_sections(soup, source_url)
    if events:
        log.info("Extracted %d events via day-section strategy", len(events))
        return events

    # Strategy 3: Generic text scan
    events = _try_text_scan(soup, source_url)
    if events:
        log.info("Extracted %d events via text-scan strategy", len(events))
        return events

    log.warning("No events extracted from HTML")
    return []


def _try_tables(soup: BeautifulSoup, source_url: str) -> list[RawEvent]:
    """Look for schedule tables with day/time/class columns."""
    events: list[RawEvent] = []

    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue

        # Try to detect header row
        header_row = rows[0]
        headers = [
            th.get_text(strip=True).lower()
            for th in header_row.find_all(["th", "td"])
        ]

        day_col = _find_col(headers, ["day", "date"])
        time_col = _find_col(headers, ["time", "hour", "when"])
        class_col = _find_col(
            headers,
            ["class", "program", "event", "name", "description", "activity"],
        )

        # Try day-column layout if headers contain day names
        day_col_events = _try_day_column_table(table, rows, headers, source_url)
        if day_col_events:
            events.extend(day_col_events)
            continue

        if class_col is None and time_col is None:
            continue

        for row in rows[1:]:
            cells = [td.get_text(strip=True) for td in row.find_all(["td", "th"])]
            if not cells:
                continue

            title = cells[class_col] if class_col is not None and class_col < len(cells) else ""
            time_text = cells[time_col] if time_col is not None and time_col < len(cells) else ""
            day_text = cells[day_col] if day_col is not None and day_col < len(cells) else ""

            if not title and not time_text:
                continue

            day = normalize_day(day_text) or find_day_in_text(day_text)
            start, end = parse_time_range(time_text)

            events.append(RawEvent(
                title=title,
                day_of_week=day,
                start_time=start,
                end_time=end,
                source_url=source_url,
                raw_json=json.dumps({"cells": cells}),
            ))

    return events


def _try_day_column_table(
    table: Tag, rows: list[Tag], headers: list[str], source_url: str
) -> list[RawEvent]:
    """Handle tables where each column is a day of the week."""
    events: list[RawEvent] = []

    # Map column index to day
    col_days: dict[int, str] = {}
    for i, h in enumerate(headers):
        day = normalize_day(h) or find_day_in_text(h)
        if day:
            col_days[i] = day

    if not col_days:
        return []

    for row in rows[1:]:
        cells = row.find_all(["td", "th"])
        for col_idx, day in col_days.items():
            if col_idx >= len(cells):
                continue
            cell_text = cells[col_idx].get_text(strip=True)
            if not cell_text or cell_text == "-":
                continue
            # Try to parse "9:00 AM Class Name" or just "Class Name"
            start, end = parse_time_range(cell_text)
            # Remove time from title
            title = re.sub(
                r"\d{1,2}:?\d{0,2}\s*(am|pm|a\.m\.|p\.m\.)?",
                "", cell_text, flags=re.IGNORECASE,
            ).strip(" -–—")
            title = re.sub(r"\s+", " ", title).strip()

            events.append(RawEvent(
                title=title or cell_text,
                day_of_week=day,
                start_time=start,
                end_time=end,
                source_url=source_url,
            ))

    return events


def _try_day_sections(soup: BeautifulSoup, source_url: str) -> list[RawEvent]:
    """Look for headers like 'Monday' followed by class listings."""
    events: list[RawEvent] = []

    for heading in soup.find_all(["h1", "h2", "h3", "h4", "h5", "h6", "strong", "b"]):
        text = heading.get_text(strip=True)
        day = normalize_day(text) or find_day_in_text(text)
        if not day:
            continue

        # Look at siblings after this heading
        sibling = heading.find_next_sibling()
        while sibling:
            # Stop at next day heading
            if sibling.name in ("h1", "h2", "h3", "h4", "h5", "h6"):
                sib_text = sibling.get_text(strip=True)
                sib_day = normalize_day(sib_text) or find_day_in_text(sib_text)
                if sib_day:
                    break

            items = []
            if sibling.name in ("ul", "ol"):
                items = [li.get_text(strip=True) for li in sibling.find_all("li")]
            elif sibling.name == "p":
                items = [sibling.get_text(strip=True)]
            elif sibling.name == "div":
                # Cards or list items
                inner = sibling.find_all(["p", "li", "span", "div"], recursive=False)
                if inner:
                    items = [el.get_text(strip=True) for el in inner]
                else:
                    text_content = sibling.get_text(strip=True)
                    if text_content:
                        items = [text_content]

            for item in items:
                if not item:
                    continue
                start, end = parse_time_range(item)
                title = re.sub(
                    r"\d{1,2}:?\d{0,2}\s*(am|pm|a\.m\.|p\.m\.)?",
                    "", item, flags=re.IGNORECASE,
                ).strip(" -–—:|\t")
                title = re.sub(r"\s+", " ", title).strip()

                if title or start:
                    events.append(RawEvent(
                        title=title or item,
                        day_of_week=day,
                        start_time=start,
                        end_time=end,
                        source_url=source_url,
                    ))

            sibling = sibling.find_next_sibling()

    return events


def _try_text_scan(soup: BeautifulSoup, source_url: str) -> list[RawEvent]:
    """Last resort: scan all text for day + time + class-like patterns."""
    events: list[RawEvent] = []
    body = soup.find("body") or soup
    text = body.get_text(separator="\n")

    current_day = ""
    for line in text.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Check if this line is a day header
        day = normalize_day(line) or (
            find_day_in_text(line) if len(line) < 30 else ""
        )
        if day and len(line.split()) <= 3:
            current_day = day
            continue

        # Check if line has a time
        start, end = parse_time_range(line)
        if start and current_day:
            title = re.sub(
                r"\d{1,2}:?\d{0,2}\s*(am|pm|a\.m\.|p\.m\.)?",
                "", line, flags=re.IGNORECASE,
            ).strip(" -–—:|\t")
            title = re.sub(r"\s+", " ", title).strip()
            events.append(RawEvent(
                title=title or line,
                day_of_week=current_day,
                start_time=start,
                end_time=end,
                source_url=source_url,
                confidence=0.6,  # lower confidence for text scan
            ))

    return events


def _find_col(headers: list[str], keywords: list[str]) -> int | None:
    for i, h in enumerate(headers):
        for kw in keywords:
            if kw in h:
                return i
    return None
