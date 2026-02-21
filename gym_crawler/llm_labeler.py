"""LLM-based event labeling via Ollama."""

from __future__ import annotations

import json
from typing import Any

from .db import Database
from .models import Gym, RawEvent
from .ollama import DEFAULT_MODEL, OllamaError, generate_json
from .util.log import get_logger

log = get_logger("llm_labeler")

LABELS_VERSION = 1
BATCH_SIZE = 1  # 3B models handle one event at a time most reliably

REQUIRED_BOOL_KEYS = ("is_bjj", "is_open_mat", "is_public", "members_only")


def label_events(
    gym: Gym,
    events: list[RawEvent],
    model: str = DEFAULT_MODEL,
    db: Database | None = None,
    *,
    force: bool = False,
) -> list[RawEvent]:
    """Label events using a local LLM via Ollama.

    Only labels events that are unlabeled unless force=True.
    Updates events in-place and persists to DB if provided.
    Returns the full event list (labeled + already-labeled).
    """
    to_label = [
        e for e in events
        if force or e.labels_json is None
    ]

    if not to_label:
        log.info("All %d events already labeled, skipping", len(events))
        return events

    log.info("Labeling %d/%d events with %s", len(to_label), len(events), model)

    # Process in batches
    total_batches = (len(to_label) + BATCH_SIZE - 1) // BATCH_SIZE
    for i in range(0, len(to_label), BATCH_SIZE):
        batch = to_label[i : i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        if total_batches <= 20 or batch_num % 10 == 1 or batch_num == total_batches:
            log.info("  Labeling %d/%d...", batch_num, total_batches)
        _label_batch(gym, batch, model, db)

    labeled_count = sum(1 for e in events if e.labels_json is not None)
    ok_count = sum(1 for e in events if _labels_ok(e))
    log.info("Labeling complete: %d/%d events labeled (%d ok, %d failed)",
             labeled_count, len(events), ok_count, labeled_count - ok_count)
    return events


def _labels_ok(event: RawEvent) -> bool:
    """Check if an event has valid (non-failed) labels."""
    return get_labels(event) is not None


def _label_batch(
    gym: Gym,
    batch: list[RawEvent],
    model: str,
    db: Database | None,
) -> None:
    """Label a single batch of events."""
    prompt = _build_prompt(gym, batch)
    event_ids = {e.id for e in batch}

    try:
        result = generate_json(prompt, model)
    except OllamaError as e:
        log.error("Ollama error: %s", e)
        _mark_batch_failed(batch, str(e), model, db)
        return

    if result is None:
        _mark_batch_failed(batch, "Invalid JSON from LLM after retry", model, db)
        return

    # Try to extract the labels array from the response
    labels_list = _extract_labels_list(result)
    if labels_list is None:
        # Debug: log the actual structure to understand the model's format
        if isinstance(result, dict):
            keys = list(result.keys())[:5]
            sample_val = result[keys[0]] if keys else None
            log.warning(
                "Could not extract labels array from dict response. "
                "Keys (first 5): %s, sample value type: %s, sample: %.200s",
                keys, type(sample_val).__name__ if sample_val else "N/A",
                str(sample_val),
            )
        else:
            log.warning("Could not extract labels from response type=%s: %.200s",
                        type(result).__name__, str(result))
        _mark_batch_failed(batch, "Could not extract labels array from response", model, db)
        return

    # Parse and apply labels — be lenient per-event
    labels_by_id = _parse_labels(labels_list, event_ids)

    applied = 0
    for event in batch:
        label = labels_by_id.get(event.id)
        if label is None:
            _mark_event_failed(event, "Missing from LLM response", model, db)
            continue

        event.labels_json = json.dumps(label)
        event.labels_model = model
        event.labels_version = LABELS_VERSION
        if db:
            db.update_event_labels(event.id, event.labels_json, model, LABELS_VERSION)
        applied += 1

    log.info("  Applied %d/%d labels from batch", applied, len(batch))


def _extract_labels_list(result: object) -> list | None:
    """Extract a list of label dicts from an LLM response.

    Handles:
    - Bare list: [{"event_id": 1, ...}, ...]
    - Dict wrapper: {"events": [...]} or {"labels": [...]} or {"results": [...]}
    - Dict with single list value: {"anything": [...]}
    """
    if isinstance(result, list):
        return result

    if isinstance(result, dict):
        # Try known wrapper keys first
        for key in ("events", "labels", "results", "data", "classifications"):
            if key in result and isinstance(result[key], list):
                log.debug("Unwrapped LLM response from dict key '%s'", key)
                return result[key]

        # Fall back: grab the first value that is a list of dicts
        for key, val in result.items():
            if isinstance(val, list) and val and isinstance(val[0], dict):
                log.debug("Unwrapped LLM response from dict key '%s'", key)
                return val

        # Single label object: dict has event_id or label keys directly
        if "event_id" in result or "id" in result or "is_bjj" in result:
            log.debug("Wrapping single-label dict response into list")
            return [result]

    return None


def _parse_labels(
    labels_list: list, expected_ids: set[int]
) -> dict[int, dict]:
    """Parse label items leniently. Returns labels keyed by event_id.

    Skips items that can't be parsed rather than failing the whole batch.
    Fills in missing keys with defaults.
    """
    labels_by_id: dict[int, dict] = {}

    for item in labels_list:
        if not isinstance(item, dict):
            log.debug("Skipping non-dict item in labels list: %s", type(item))
            continue

        # Extract event_id
        eid = item.get("event_id")
        if eid is None:
            # Some models use "id" instead
            eid = item.get("id")
        if eid is None:
            log.debug("Skipping label item without event_id: %s", item)
            continue

        # Coerce event_id to int
        try:
            eid = int(eid)
        except (ValueError, TypeError):
            log.debug("Skipping label with non-integer event_id: %s", eid)
            continue

        if eid not in expected_ids:
            log.debug("Ignoring unexpected event_id %s", eid)
            continue

        # Build normalized label with defaults for missing fields
        label = _normalize_label(item, eid)
        labels_by_id[eid] = label

    return labels_by_id


def _normalize_label(item: dict, event_id: int) -> dict:
    """Normalize a single label dict, filling defaults for missing keys."""
    label: dict[str, Any] = {"event_id": event_id}

    for key in REQUIRED_BOOL_KEYS:
        val = item.get(key)
        if isinstance(val, bool):
            label[key] = val
        elif isinstance(val, str):
            label[key] = val.lower() in ("true", "yes", "1")
        elif isinstance(val, (int, float)):
            label[key] = bool(val)
        else:
            # Default: conservative fallback
            label[key] = False if key != "is_public" else True

    # Confidence
    conf = item.get("confidence", 0.5)
    try:
        label["confidence"] = max(0.0, min(1.0, float(conf)))
    except (ValueError, TypeError):
        label["confidence"] = 0.5

    # Reasons
    reasons = item.get("reasons", [])
    if isinstance(reasons, list):
        label["reasons"] = [str(r) for r in reasons]
    elif isinstance(reasons, str):
        label["reasons"] = [reasons]
    else:
        label["reasons"] = []

    return label


def _build_prompt(gym: Gym, batch: list[RawEvent]) -> str:
    """Build the labeling prompt for a batch of events."""
    events_payload = []
    for e in batch:
        entry: dict[str, Any] = {
            "event_id": e.id,
            "title": e.title,
            "day": e.day_of_week,
            "start_time": e.start_time,
            "end_time": e.end_time,
        }
        # Include structured fields from raw_json if available
        if e.raw_json:
            try:
                raw = json.loads(e.raw_json)
                if raw.get("focus"):
                    entry["focus"] = raw["focus"]
                if raw.get("level"):
                    entry["level"] = raw["level"]
                if raw.get("coaches"):
                    entry["coaches"] = raw["coaches"]
                if raw.get("members_only"):
                    entry["extra_text"] = "Members Only"
            except json.JSONDecodeError:
                pass
        events_payload.append(entry)

    events_json = json.dumps(events_payload, indent=2)

    # Single-event prompt — very explicit with examples for small models
    if len(batch) == 1:
        e = batch[0]
        return f"""\
Return ONLY valid JSON. No markdown.

Classify this gym class. The title is "{e.title}".

EXAMPLES:
- "BJJ Open Mat" -> is_bjj=true, is_open_mat=true
- "BJJ Open Mat" with "Members Only" -> is_bjj=true, is_open_mat=true, is_public=false, members_only=true
- "No-Gi Open Rolling" -> is_bjj=true, is_open_mat=true
- "BJJ Fundamentals" -> is_bjj=true, is_open_mat=false
- "Muay Thai Sparring" -> is_bjj=false, is_open_mat=false
- "MMA Sparring" -> is_bjj=false, is_open_mat=false
- "Kids BJJ" -> is_bjj=true, is_open_mat=false
- "Yoga" -> is_bjj=false, is_open_mat=false
- "Wrestling" -> is_bjj=false, is_open_mat=false

KEY RULE: If the title contains "Open Mat" or "Open Rolling", then is_open_mat MUST be true.
KEY RULE: Only BJJ/jiu-jitsu/no-gi/grappling counts as is_bjj=true. MMA, Muay Thai, kickboxing, wrestling, judo = is_bjj=false.
KEY RULE: If extra_text says "Members Only", then is_public=false and members_only=true.

EVENT: {events_json}

Return JSON: {{"event_id": {e.id}, "is_bjj": true/false, "is_open_mat": true/false, "is_public": true/false, "members_only": true/false, "confidence": 0.0-1.0, "reasons": ["..."]}}"""

    return f"""\
Return ONLY a valid JSON array. No markdown.

Classify these gym events:
{events_json}

KEY RULE: If title contains "Open Mat" or "Open Rolling", then is_open_mat MUST be true.
KEY RULE: Only BJJ/jiu-jitsu/no-gi/grappling = is_bjj=true. MMA/Muay Thai/kickboxing/wrestling/judo = is_bjj=false.
KEY RULE: If extra_text says "Members Only", then is_public=false and members_only=true.

Return a JSON array:
[{{"event_id": N, "is_bjj": true/false, "is_open_mat": true/false, "is_public": true/false, "members_only": true/false, "confidence": 0.0-1.0, "reasons": ["..."]}}]"""


def _validate_response(
    result: object, expected_ids: set[int]
) -> dict[int, dict] | None:
    """Validate LLM response structure. Returns labels keyed by event_id, or None.

    Kept for backward compat with tests. Strict mode.
    """
    labels_list = _extract_labels_list(result)
    if labels_list is None:
        log.error("LLM response is not a list and could not be unwrapped: %s", type(result))
        return None

    labels_by_id: dict[int, dict] = {}

    for item in labels_list:
        if not isinstance(item, dict):
            log.error("LLM response item is not a dict: %s", type(item))
            return None

        # Check required keys and types (strict for test validation)
        required = {
            "event_id": int,
            "is_bjj": bool,
            "is_open_mat": bool,
            "is_public": bool,
            "members_only": bool,
            "confidence": (int, float),
            "reasons": list,
        }
        for key, expected_type in required.items():
            if key not in item:
                log.error("Missing key '%s' in LLM response item: %s", key, item)
                return None
            if not isinstance(item[key], expected_type):
                log.error(
                    "Key '%s' has wrong type %s (expected %s)",
                    key, type(item[key]), expected_type,
                )
                return None

        eid = item["event_id"]
        if eid not in expected_ids:
            log.error("Unexpected event_id %s in LLM response", eid)
            return None

        labels_by_id[eid] = item

    # Check all expected event_ids are present
    missing = expected_ids - set(labels_by_id.keys())
    if missing:
        log.error("Missing event_ids in LLM response: %s", missing)
        return None

    return labels_by_id


def _mark_batch_failed(
    batch: list[RawEvent], error: str, model: str, db: Database | None
) -> None:
    """Mark all events in a batch as labeling-failed."""
    for event in batch:
        _mark_event_failed(event, error, model, db)


def _mark_event_failed(
    event: RawEvent, error: str, model: str, db: Database | None
) -> None:
    """Mark a single event as labeling-failed."""
    fail_json = json.dumps({"ok": False, "error": error})
    event.labels_json = fail_json
    event.labels_model = model
    event.labels_version = LABELS_VERSION
    if db:
        db.update_event_labels(event.id, fail_json, model, LABELS_VERSION)


def get_labels(event: RawEvent) -> dict | None:
    """Parse labels from event, returning None if missing or failed."""
    if not event.labels_json:
        return None
    try:
        labels = json.loads(event.labels_json)
    except json.JSONDecodeError:
        return None
    if not isinstance(labels, dict):
        return None
    if labels.get("ok") is False:
        return None
    # Must have the core boolean keys to be usable
    if not all(k in labels for k in REQUIRED_BOOL_KEYS):
        return None
    return labels
