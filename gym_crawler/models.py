"""Data models for the gym crawler pipeline."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, time
from enum import Enum
from typing import Any


class Provider(str, Enum):
    HTML = "html"
    GOOGLE_CALENDAR = "google_calendar"
    MINDBODY = "mindbody"
    ZENPLANNER = "zenplanner"
    MARIANA_TEK = "mariana_tek"
    PIKE13 = "pike13"
    TEAMUP = "teamup"
    UNKNOWN = "unknown"


class CrawlStatus(str, Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"


class ExtractionStatus(str, Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PENDING = "pending"


@dataclass
class Gym:
    name: str
    city: str
    state: str
    homepage: str = ""
    notes: str = ""
    id: int | None = None


@dataclass
class UrlCandidate:
    url: str
    kind: str  # "schedule", "calendar", "iframe", "nav_link"
    score: float = 0.0
    gym_id: int | None = None


@dataclass
class ScheduleSource:
    url: str
    provider: Provider = Provider.UNKNOWN
    selected: bool = False
    status: ExtractionStatus = ExtractionStatus.PENDING
    error: str = ""
    adapter: str = ""  # which adapter extracted events (e.g. "aura_schedule")
    gym_id: int | None = None


@dataclass
class RawEvent:
    title: str
    day_of_week: str = ""  # "monday", "tuesday", etc.
    start_time: str = ""   # "HH:MM" 24h format
    end_time: str = ""     # "HH:MM" 24h format
    timezone: str = ""
    location: str = ""
    raw_json: str = ""
    confidence: float = 1.0
    source_url: str = ""
    gym_id: int | None = None
    id: int | None = None
    labels_json: str | None = None
    labels_model: str | None = None
    labels_version: int = 1
    labeled_at: str | None = None


@dataclass
class OpenMatEvent:
    day_of_week: str
    start_time: str = ""
    end_time: str = ""
    timezone: str = ""
    title: str = ""
    confidence: float = 0.0
    source_url: str = ""
    gym_id: int | None = None
