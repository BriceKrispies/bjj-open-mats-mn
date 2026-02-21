"""Strategy router: fetch a schedule page and dispatch to the right adapter."""

from __future__ import annotations

import httpx

from ..models import (
    ExtractionStatus,
    Gym,
    Provider,
    RawEvent,
    ScheduleSource,
    UrlCandidate,
)
from ..util.http import fetch, get_client
from ..util.log import get_logger
from ..util.urls import detect_provider
from .adapter import select_adapter
from .google_calendar import detect_google_calendar_url, extract_from_ics

log = get_logger("extract.router")


def select_schedule_source(candidates: list[UrlCandidate]) -> ScheduleSource | None:
    """Choose the best schedule source from discovered candidates."""
    if not candidates:
        return None

    # Already sorted by score (highest first)
    best = candidates[0]
    provider = _detect_provider_from_candidate(best)

    log.info(
        "Selected schedule source: %s (score=%.1f, provider=%s)",
        best.url, best.score, provider.value,
    )
    return ScheduleSource(
        url=best.url,
        provider=provider,
        selected=True,
        status=ExtractionStatus.PENDING,
    )


def extract(
    source: ScheduleSource,
    client: httpx.Client | None = None,
    gym: Gym | None = None,
) -> tuple[list[RawEvent], ScheduleSource]:
    """Fetch and extract events from the selected schedule source.

    Uses the adapter registry to select the best extractor for the page
    content. Returns (events, updated_source).
    """
    own_client = client is None
    if own_client:
        client = get_client()

    try:
        resp = fetch(source.url, client)
        if resp is None:
            source.status = ExtractionStatus.FAILED
            source.error = "Failed to fetch URL"
            return [], source

        content_type = resp.headers.get("content-type", "")
        body = resp.text
        events: list[RawEvent] = []

        # --- ICS content (before adapter dispatch) ---
        if "text/calendar" in content_type or body.strip().startswith("BEGIN:VCALENDAR"):
            events = extract_from_ics(body, source.url)
            source.adapter = "ics_feed"
        else:
            # --- Check for embedded Google Calendar ICS feed ---
            if source.provider == Provider.GOOGLE_CALENDAR:
                events = _try_google_calendar_ics(body, source.url, client)
                if events:
                    source.adapter = "google_calendar"

            # --- Adapter dispatch ---
            if not events:
                adapter = select_adapter(body, source.url)
                if adapter:
                    log.info("Using adapter: %s", adapter.name)
                    source.adapter = adapter.name
                    events = adapter.extract(body, source.url, gym)
                else:
                    source.adapter = "none"

        if events:
            source.status = ExtractionStatus.SUCCESS
            log.info(
                "Extracted %d events via adapter '%s' from %s",
                len(events), source.adapter, source.url,
            )
        else:
            source.status = ExtractionStatus.FAILED
            source.error = "No events found in page content"

        return events, source

    except Exception as e:
        source.status = ExtractionStatus.FAILED
        source.error = str(e)
        log.error("Extraction error for %s: %s", source.url, e)
        return [], source
    finally:
        if own_client:
            client.close()


def _detect_provider_from_candidate(candidate: UrlCandidate) -> Provider:
    """Determine provider type from a URL candidate."""
    provider_name = detect_provider(candidate.url)
    if provider_name:
        try:
            return Provider(provider_name)
        except ValueError:
            pass

    if "google_calendar" in candidate.kind:
        return Provider.GOOGLE_CALENDAR

    for p in Provider:
        if p.value in candidate.kind:
            return p

    return Provider.HTML


def _try_google_calendar_ics(
    html: str, gcal_url: str, client: httpx.Client
) -> list[RawEvent]:
    """Try to fetch the ICS feed from a Google Calendar embed."""
    import re
    from urllib.parse import unquote

    m = re.search(r"[?&]src=([^&]+)", gcal_url)
    if m:
        cal_id = unquote(m.group(1))
        ics_url = f"https://calendar.google.com/calendar/ical/{cal_id}/public/basic.ics"
        resp = fetch(ics_url, client)
        if resp and "BEGIN:VCALENDAR" in resp.text:
            return extract_from_ics(resp.text, ics_url)
    return []
