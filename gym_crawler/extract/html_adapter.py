"""Generic HTML schedule adapter — fallback for pages with no provider-specific markup."""

from __future__ import annotations

from ..models import Gym, RawEvent
from .html_schedule import extract_from_html


class GenericHtmlAdapter:
    """Lowest-priority adapter. Tries table / day-section / text-scan strategies."""

    @property
    def name(self) -> str:
        return "html_generic"

    def detect(self, html: str, url: str) -> bool:
        # Always willing to try — this is the fallback.
        return True

    def extract(self, html: str, url: str, gym: Gym | None = None) -> list[RawEvent]:
        return extract_from_html(html, url)
