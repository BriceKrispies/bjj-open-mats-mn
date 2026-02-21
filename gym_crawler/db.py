"""SQLite database layer with schema migrations and query helpers."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import (
    CrawlStatus,
    ExtractionStatus,
    Gym,
    OpenMatEvent,
    Provider,
    RawEvent,
    ScheduleSource,
    UrlCandidate,
)

SCHEMA_VERSION = 3

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS gyms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL DEFAULT '',
    state TEXT NOT NULL DEFAULT '',
    homepage TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS crawl_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id INTEGER NOT NULL REFERENCES gyms(id),
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    error TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS discovered_urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id INTEGER NOT NULL REFERENCES gyms(id),
    url TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT '',
    score REAL NOT NULL DEFAULT 0.0,
    discovered_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    UNIQUE(gym_id, url)
);

CREATE TABLE IF NOT EXISTS schedule_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id INTEGER NOT NULL REFERENCES gyms(id),
    url TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'unknown',
    selected INTEGER NOT NULL DEFAULT 0,
    selected_at TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT NOT NULL DEFAULT '',
    UNIQUE(gym_id, url)
);

CREATE TABLE IF NOT EXISTS raw_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id INTEGER NOT NULL REFERENCES gyms(id),
    source_url TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    day_of_week TEXT NOT NULL DEFAULT '',
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT NOT NULL DEFAULT '',
    timezone TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    raw_json TEXT NOT NULL DEFAULT '',
    confidence REAL NOT NULL DEFAULT 1.0,
    extracted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS open_mat_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gym_id INTEGER NOT NULL REFERENCES gyms(id),
    source_url TEXT NOT NULL DEFAULT '',
    day_of_week TEXT NOT NULL DEFAULT '',
    start_time TEXT NOT NULL DEFAULT '',
    end_time TEXT NOT NULL DEFAULT '',
    timezone TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL DEFAULT '',
    confidence REAL NOT NULL DEFAULT 0.0,
    derived_at TEXT NOT NULL
);
"""


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Database:
    def __init__(self, db_path: str | Path = "gym_crawler.db") -> None:
        self.path = Path(db_path)
        self.conn = sqlite3.connect(str(self.path))
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")
        self._migrate()

    def _migrate(self) -> None:
        self.conn.executescript(SCHEMA_SQL)
        row = self.conn.execute(
            "SELECT version FROM schema_version LIMIT 1"
        ).fetchone()
        current = row["version"] if row else 0
        if current == 0:
            self.conn.execute(
                "INSERT INTO schema_version (version) VALUES (?)",
                (SCHEMA_VERSION,),
            )
        if current < 2:
            # v2: add adapter column to schedule_sources
            try:
                self.conn.execute(
                    "ALTER TABLE schedule_sources ADD COLUMN adapter TEXT NOT NULL DEFAULT ''"
                )
            except sqlite3.OperationalError:
                pass  # column already exists
        if current < 3:
            # v3: add LLM labeling columns to raw_events
            for col_sql in [
                "ALTER TABLE raw_events ADD COLUMN labels_json TEXT",
                "ALTER TABLE raw_events ADD COLUMN labels_model TEXT",
                "ALTER TABLE raw_events ADD COLUMN labels_version INTEGER NOT NULL DEFAULT 1",
                "ALTER TABLE raw_events ADD COLUMN labeled_at TEXT",
            ]:
                try:
                    self.conn.execute(col_sql)
                except sqlite3.OperationalError:
                    pass  # column already exists
        if current < SCHEMA_VERSION:
            self.conn.execute(
                "UPDATE schema_version SET version = ?", (SCHEMA_VERSION,)
            )
        self.conn.commit()

    def close(self) -> None:
        self.conn.close()

    # --- Gyms ---

    def upsert_gym(self, gym: Gym) -> int:
        self.conn.execute(
            """INSERT INTO gyms (name, city, state, homepage, notes)
               VALUES (?, ?, ?, ?, ?)
               ON CONFLICT(name) DO UPDATE SET
                 city=excluded.city, state=excluded.state,
                 homepage=excluded.homepage, notes=excluded.notes""",
            (gym.name, gym.city, gym.state, gym.homepage, gym.notes),
        )
        self.conn.commit()
        row = self.conn.execute(
            "SELECT id FROM gyms WHERE name = ?", (gym.name,)
        ).fetchone()
        return row["id"]

    def get_gym_by_name(self, name: str) -> Gym | None:
        row = self.conn.execute(
            "SELECT * FROM gyms WHERE LOWER(name) = LOWER(?)", (name,)
        ).fetchone()
        if row is None:
            return None
        return Gym(
            id=row["id"],
            name=row["name"],
            city=row["city"],
            state=row["state"],
            homepage=row["homepage"],
            notes=row["notes"],
        )

    # --- Crawl Runs ---

    def start_crawl_run(self, gym_id: int) -> int:
        cur = self.conn.execute(
            "INSERT INTO crawl_runs (gym_id, started_at, status) VALUES (?, ?, ?)",
            (gym_id, _now(), CrawlStatus.RUNNING.value),
        )
        self.conn.commit()
        return cur.lastrowid  # type: ignore[return-value]

    def finish_crawl_run(
        self, run_id: int, status: CrawlStatus, error: str = ""
    ) -> None:
        self.conn.execute(
            "UPDATE crawl_runs SET finished_at=?, status=?, error=? WHERE id=?",
            (_now(), status.value, error, run_id),
        )
        self.conn.commit()

    # --- Discovered URLs ---

    def upsert_discovered_url(self, gym_id: int, candidate: UrlCandidate) -> None:
        now = _now()
        self.conn.execute(
            """INSERT INTO discovered_urls (gym_id, url, kind, score, discovered_at, last_seen_at)
               VALUES (?, ?, ?, ?, ?, ?)
               ON CONFLICT(gym_id, url) DO UPDATE SET
                 kind=excluded.kind, score=excluded.score, last_seen_at=excluded.last_seen_at""",
            (gym_id, candidate.url, candidate.kind, candidate.score, now, now),
        )
        self.conn.commit()

    def get_discovered_urls(self, gym_id: int) -> list[UrlCandidate]:
        rows = self.conn.execute(
            "SELECT * FROM discovered_urls WHERE gym_id=? ORDER BY score DESC",
            (gym_id,),
        ).fetchall()
        return [
            UrlCandidate(
                url=r["url"], kind=r["kind"], score=r["score"], gym_id=gym_id
            )
            for r in rows
        ]

    # --- Schedule Sources ---

    def upsert_schedule_source(self, gym_id: int, source: ScheduleSource) -> None:
        now = _now()
        self.conn.execute(
            """INSERT INTO schedule_sources
               (gym_id, url, provider, selected, selected_at, status, error, adapter)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(gym_id, url) DO UPDATE SET
                 provider=excluded.provider, selected=excluded.selected,
                 selected_at=excluded.selected_at, status=excluded.status,
                 error=excluded.error, adapter=excluded.adapter""",
            (
                gym_id,
                source.url,
                source.provider.value,
                1 if source.selected else 0,
                now if source.selected else None,
                source.status.value,
                source.error,
                source.adapter,
            ),
        )
        self.conn.commit()

    def deselect_all_sources(self, gym_id: int) -> None:
        self.conn.execute(
            "UPDATE schedule_sources SET selected=0 WHERE gym_id=?", (gym_id,)
        )
        self.conn.commit()

    # --- Raw Events ---

    def clear_raw_events(self, gym_id: int) -> None:
        self.conn.execute("DELETE FROM raw_events WHERE gym_id=?", (gym_id,))
        self.conn.commit()

    def insert_raw_events(self, gym_id: int, events: list[RawEvent]) -> int:
        now = _now()
        count = 0
        for e in events:
            cur = self.conn.execute(
                """INSERT INTO raw_events
                   (gym_id, source_url, title, day_of_week, start_time, end_time,
                    timezone, location, raw_json, confidence, extracted_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    gym_id, e.source_url, e.title, e.day_of_week,
                    e.start_time, e.end_time, e.timezone, e.location,
                    e.raw_json, e.confidence, now,
                ),
            )
            e.id = cur.lastrowid
            count += 1
        self.conn.commit()
        return count

    def get_raw_events(self, gym_id: int) -> list[RawEvent]:
        rows = self.conn.execute(
            "SELECT * FROM raw_events WHERE gym_id=? ORDER BY id", (gym_id,)
        ).fetchall()
        return [
            RawEvent(
                id=r["id"],
                title=r["title"],
                day_of_week=r["day_of_week"],
                start_time=r["start_time"],
                end_time=r["end_time"],
                timezone=r["timezone"],
                location=r["location"],
                raw_json=r["raw_json"],
                confidence=r["confidence"],
                source_url=r["source_url"],
                gym_id=gym_id,
                labels_json=r["labels_json"],
                labels_model=r["labels_model"],
                labels_version=r["labels_version"],
                labeled_at=r["labeled_at"],
            )
            for r in rows
        ]

    def update_event_labels(
        self, event_id: int, labels_json: str, model: str, version: int
    ) -> None:
        self.conn.execute(
            """UPDATE raw_events
               SET labels_json=?, labels_model=?, labels_version=?, labeled_at=?
               WHERE id=?""",
            (labels_json, model, version, _now(), event_id),
        )
        self.conn.commit()

    # --- Open Mat Events ---

    def clear_open_mat_events(self, gym_id: int) -> None:
        self.conn.execute("DELETE FROM open_mat_events WHERE gym_id=?", (gym_id,))
        self.conn.commit()

    def insert_open_mat_events(
        self, gym_id: int, events: list[OpenMatEvent]
    ) -> int:
        now = _now()
        count = 0
        for e in events:
            self.conn.execute(
                """INSERT INTO open_mat_events
                   (gym_id, source_url, day_of_week, start_time, end_time,
                    timezone, title, confidence, derived_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    gym_id, e.source_url, e.day_of_week, e.start_time,
                    e.end_time, e.timezone, e.title, e.confidence, now,
                ),
            )
            count += 1
        self.conn.commit()
        return count

    def get_open_mat_events(self, gym_id: int) -> list[OpenMatEvent]:
        rows = self.conn.execute(
            "SELECT * FROM open_mat_events WHERE gym_id=? ORDER BY "
            "CASE day_of_week "
            "  WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 "
            "  WHEN 'wednesday' THEN 3 WHEN 'thursday' THEN 4 "
            "  WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6 "
            "  WHEN 'sunday' THEN 7 ELSE 8 END, start_time",
            (gym_id,),
        ).fetchall()
        return [
            OpenMatEvent(
                day_of_week=r["day_of_week"],
                start_time=r["start_time"],
                end_time=r["end_time"],
                timezone=r["timezone"],
                title=r["title"],
                confidence=r["confidence"],
                source_url=r["source_url"],
                gym_id=gym_id,
            )
            for r in rows
        ]
