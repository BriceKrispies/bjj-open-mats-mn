"""Adapter protocol and registry for schedule extractors.

To add a new adapter:
1. Create a module in gym_crawler/extract/ implementing ScheduleAdapter.
2. Add an instance to ADAPTER_REGISTRY in this file (ordered by specificity).
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from ..models import Gym, RawEvent


@runtime_checkable
class ScheduleAdapter(Protocol):
    """Interface for schedule extraction adapters.

    Adapters are tried in registry order. The first whose detect() returns
    True is used for extraction.
    """

    @property
    def name(self) -> str:
        """Short identifier for this adapter (e.g. "aura_schedule", "html_generic")."""
        ...

    def detect(self, html: str, url: str) -> bool:
        """Return True if this adapter can handle the given page."""
        ...

    def extract(self, html: str, url: str, gym: Gym | None = None) -> list[RawEvent]:
        """Extract schedule events from the HTML."""
        ...


# Filled at import time by _build_registry() below.
ADAPTER_REGISTRY: list[ScheduleAdapter] = []


def _build_registry() -> list[ScheduleAdapter]:
    """Build the ordered adapter list. Most specific first, generic last."""
    from .aura_schedule import AuraScheduleAdapter
    from .gcal_adapter import GoogleCalendarAdapter
    from .html_adapter import GenericHtmlAdapter

    return [
        AuraScheduleAdapter(),
        GoogleCalendarAdapter(),
        GenericHtmlAdapter(),  # fallback — always last
    ]


def get_registry() -> list[ScheduleAdapter]:
    """Return the adapter registry, building it on first call."""
    global ADAPTER_REGISTRY
    if not ADAPTER_REGISTRY:
        ADAPTER_REGISTRY = _build_registry()
    return ADAPTER_REGISTRY


def select_adapter(html: str, url: str) -> ScheduleAdapter | None:
    """Pick the first matching adapter for the given HTML + URL."""
    for adapter in get_registry():
        if adapter.detect(html, url):
            return adapter
    return None
