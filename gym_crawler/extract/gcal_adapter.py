"""Google Calendar adapter — detects gcal embeds/ICS links."""

from __future__ import annotations

from ..models import Gym, RawEvent
from .google_calendar import detect_google_calendar_url, extract_from_ics
from .html_schedule import extract_from_html


class GoogleCalendarAdapter:

    @property
    def name(self) -> str:
        return "google_calendar"

    def detect(self, html: str, url: str) -> bool:
        if "calendar.google.com" in url:
            return True
        if "text/calendar" in html[:200] or html.strip().startswith("BEGIN:VCALENDAR"):
            return True
        return detect_google_calendar_url(html) is not None

    def extract(self, html: str, url: str, gym: Gym | None = None) -> list[RawEvent]:
        # Pure ICS content
        if html.strip().startswith("BEGIN:VCALENDAR"):
            return extract_from_ics(html, url)

        # Try to find a gcal embed URL and parse any ICS from it
        gcal_url = detect_google_calendar_url(html)
        if gcal_url:
            # We can't fetch the ICS here (no client), but we can try
            # parsing the embed page HTML for events.
            return extract_from_html(html, gcal_url)

        return extract_from_html(html, url)
