# BJJ Open Mats Crawler

Discovers and extracts open mat schedules from BJJ gym websites, storing results in SQLite.

## Quick Start

```bash
# Run for one gym (requires Ollama running locally)
uv run python -m gym_crawler --gym "The Cellar Gym"

# Run without LLM (heuristic-only classification)
uv run python -m gym_crawler --gym "The Cellar Gym" --no-llm

# Force re-label events even if already labeled
uv run python -m gym_crawler --gym "The Cellar Gym" --force-llm

# Override homepage URL
uv run python -m gym_crawler --gym "Bellum" --homepage "https://www.bellumbjj.com/schedule"

# Custom db path
uv run python -m gym_crawler --gym "The Cellar Gym" --db my_data.db
```

## Adding a Gym

Edit `gyms.json`:

```json
{
  "gyms": [
    {
      "name": "My Gym",
      "city": "Minneapolis",
      "state": "MN",
      "homepage": "https://mygym.com",
      "notes": "optional notes"
    }
  ]
}
```

Only `name` is required. `homepage` is strongly recommended — without it, discovery has nothing to crawl.

## Database Tables

| Table | Purpose |
|-------|---------|
| `gyms` | Gym registry (name, city, state, homepage) |
| `crawl_runs` | History of crawl attempts per gym |
| `discovered_urls` | All schedule-like URLs found during crawl |
| `schedule_sources` | Selected schedule page + provider detection |
| `raw_events` | Every class/event extracted from the schedule |
| `open_mat_events` | Filtered open mat sessions with confidence scores |

## Querying Results

```sql
-- All open mats for a gym
SELECT * FROM open_mat_events
WHERE gym_id = (SELECT id FROM gyms WHERE name = 'Alliance BJJ St. Croix');

-- All open mats across all gyms
SELECT g.name, o.day_of_week, o.start_time, o.end_time, o.title, o.confidence
FROM open_mat_events o JOIN gyms g ON o.gym_id = g.id
ORDER BY g.name, CASE o.day_of_week
  WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
  WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6
  WHEN 'sunday' THEN 7 END;

-- What URLs were discovered for a gym
SELECT url, kind, score FROM discovered_urls
WHERE gym_id = (SELECT id FROM gyms WHERE name = 'Alliance BJJ St. Croix')
ORDER BY score DESC;

-- Crawl history
SELECT g.name, c.started_at, c.status, c.error
FROM crawl_runs c JOIN gyms g ON c.gym_id = g.id
ORDER BY c.started_at DESC;
```

## Running Tests

```bash
uv run pytest
```

## Architecture

```
gym_crawler/
  __main__.py     # Argument parsing, pipeline orchestration
  db.py           # SQLite schema, migrations, query helpers
  models.py       # Dataclasses: Gym, UrlCandidate, RawEvent, OpenMatEvent
  discover.py     # Homepage crawl + URL candidate scoring
  normalize.py    # Open-mat classifier (LLM labels + heuristic fallback)
  ollama.py       # Minimal Ollama HTTP client
  llm_labeler.py  # LLM-based event labeling (batch prompt, validation)
  extract/
    adapter.py          # ScheduleAdapter protocol + registry
    router.py           # Fetch page, dispatch to adapter, return events
    aura_schedule.py    # Aura schedule widget (.aura-schedule__class-*)
    html_adapter.py     # Generic HTML adapter (table/day-section/text-scan)
    gcal_adapter.py     # Google Calendar adapter
    html_schedule.py    # Table, day-section, and text-scan parsers
    google_calendar.py  # ICS feed parser + gcal embed detection
  util/
    urls.py   # URL scoring, provider detection
    text.py   # Day/time parsing helpers
    http.py   # httpx client with rate limiting
    log.py    # Structured logging setup
```

Pipeline: `discover -> select_source -> extract (adapter) -> label (LLM) -> normalize -> store`

## Adapters

Extraction uses a plugin-based adapter system. Each adapter implements the `ScheduleAdapter` protocol:

- **`detect(html, url)`** — returns `True` if this adapter can handle the page
- **`extract(html, url)`** — parses HTML and returns a list of `RawEvent`s
- **`name`** — identifier stored in the database (e.g. `"aura_schedule"`)

The registry in `extract/adapter.py` is ordered by specificity — provider-specific adapters (like Aura) are tried before the generic HTML fallback.

### Adding a new adapter

1. Create `gym_crawler/extract/my_adapter.py`:

```python
from gym_crawler.extract.adapter import ScheduleAdapter
from gym_crawler.models import RawEvent

class MyAdapter:
    @property
    def name(self) -> str:
        return "my_provider"

    def detect(self, html: str, url: str) -> bool:
        return "my-provider-marker" in html

    def extract(self, html: str, url: str, **kwargs) -> list[RawEvent]:
        # Parse HTML and return RawEvent list
        ...
```

2. Register it in `extract/adapter.py` `_build_registry()`, before `GenericHtmlAdapter`.
3. Add a fixture in `tests/fixtures/` and tests in `tests/`.

## LLM Labeling (Ollama)

After extraction, each event is classified by a local LLM via [Ollama](https://ollama.com) to determine:
- **is_bjj** — is this a BJJ event?
- **is_open_mat** — is this an open mat / open rolling?
- **is_public** — is this open to the public (not members-only)?

Only events that are `is_bjj && is_open_mat && is_public` appear in the final results.

### Setup

```bash
# Install Ollama (https://ollama.com), then:
ollama pull llama3.2:3b
ollama serve  # leave running in background
```

### CLI flags

| Flag | Default | Description |
|------|---------|-------------|
| `--llm` | on | Enable LLM labeling (requires Ollama) |
| `--no-llm` | — | Disable LLM, use heuristic-only |
| `--force-llm` | off | Re-label events even if already labeled |
| `--llm-model` | `llama3.2:3b` | Ollama model name |

Labels are stored in `raw_events.labels_json` so re-runs skip already-labeled events unless `--force-llm` is used.
