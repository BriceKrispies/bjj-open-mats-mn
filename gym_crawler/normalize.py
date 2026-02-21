"""Normalize raw events and classify open-mat sessions."""

from __future__ import annotations

import re

from .llm_labeler import get_labels
from .models import OpenMatEvent, RawEvent
from .util.log import get_logger

log = get_logger("normalize")

# Primary patterns (high confidence)
OPEN_MAT_PATTERNS = [
    re.compile(r"\bopen\s*mat\b", re.IGNORECASE),
    re.compile(r"\bopenmat\b", re.IGNORECASE),
    re.compile(r"\bopen\s*roll(ing)?\b", re.IGNORECASE),
]

# Secondary patterns (medium confidence) — NO sparring, that's too broad
ROLLING_PATTERNS = [
    re.compile(r"\b(free\s*)?rolling\b", re.IGNORECASE),
    re.compile(r"\brandori\b", re.IGNORECASE),
    re.compile(r"\bopen\s*train(ing)?\b", re.IGNORECASE),
    re.compile(r"\bopen\s*gym\b", re.IGNORECASE),
    re.compile(r"\bopen\s*class\b", re.IGNORECASE),
]

# Context boosters (increase confidence)
CONTEXT_BOOST_PATTERNS = [
    (re.compile(r"\bno[\s-]?gi\b", re.IGNORECASE), 0.05),
    (re.compile(r"\bgi\b", re.IGNORECASE), 0.02),
    (re.compile(r"\bbjj\b", re.IGNORECASE), 0.05),
    (re.compile(r"\bjiu[\s-]?jitsu\b", re.IGNORECASE), 0.05),
    (re.compile(r"\bgrappling\b", re.IGNORECASE), 0.05),
    (re.compile(r"\ball\s*levels?\b", re.IGNORECASE), 0.03),
]

# Negative patterns (reduce confidence or reject)
NEGATIVE_PATTERNS = [
    re.compile(r"\bkids?\b", re.IGNORECASE),
    re.compile(r"\bchildren\b", re.IGNORECASE),
    re.compile(r"\bjunior\b", re.IGNORECASE),
    re.compile(r"\btiny\s*champ", re.IGNORECASE),
    re.compile(r"\bprivate\b", re.IGNORECASE),
    re.compile(r"\bcompetition\s*team\b", re.IGNORECASE),
]

# Non-BJJ disciplines: if the title starts with or is primarily these, it's not BJJ
NON_BJJ_PATTERNS = [
    re.compile(r"\bmuay\s*thai\b", re.IGNORECASE),
    re.compile(r"\bkickbox(ing)?\b", re.IGNORECASE),
    re.compile(r"\b(mma|mixed\s*martial\s*arts?)\b", re.IGNORECASE),
    re.compile(r"\bboxing\b", re.IGNORECASE),
    re.compile(r"\bwrestling\b", re.IGNORECASE),
    re.compile(r"\bjudo\b", re.IGNORECASE),
    re.compile(r"\bkarate\b", re.IGNORECASE),
    re.compile(r"\btaekwondo\b", re.IGNORECASE),
]

# Members-only patterns
MEMBERS_ONLY_PATTERNS = [
    re.compile(r"\bmembers?\s*only\b", re.IGNORECASE),
    re.compile(r"\bmembership\s*required\b", re.IGNORECASE),
    re.compile(r"\binvite\s*only\b", re.IGNORECASE),
]


def classify_open_mat(event: RawEvent) -> tuple[bool, float]:
    """Determine if a raw event is an open mat session.

    Returns (is_open_mat, confidence) where confidence is 0.0-1.0.
    """
    text = f"{event.title} {event.day_of_week}".strip()
    if not text:
        return False, 0.0

    confidence = 0.0
    matched = False

    # Check primary patterns
    for pat in OPEN_MAT_PATTERNS:
        if pat.search(text):
            confidence = 0.9
            matched = True
            break

    # Check secondary patterns
    if not matched:
        for pat in ROLLING_PATTERNS:
            if pat.search(text):
                confidence = 0.6
                matched = True
                break

    if not matched:
        return False, 0.0

    # Apply context boosters
    for pat, boost in CONTEXT_BOOST_PATTERNS:
        if pat.search(text):
            confidence = min(1.0, confidence + boost)

    # Apply negative patterns
    for pat in NEGATIVE_PATTERNS:
        if pat.search(text):
            confidence -= 0.3

    # Reject if confidence too low
    if confidence < 0.3:
        return False, confidence

    return True, round(confidence, 2)


def _is_bjj_heuristic(event: RawEvent) -> bool:
    """Heuristic check: is this event BJJ-related (not MMA/striking)?"""
    text = event.title
    for pat in NON_BJJ_PATTERNS:
        if pat.search(text):
            return False
    return True


def _is_public_heuristic(event: RawEvent) -> bool:
    """Heuristic check: is this event public (not members-only)?"""
    # Check title text
    text = event.title
    for pat in MEMBERS_ONLY_PATTERNS:
        if pat.search(text):
            return False
    # Check raw_json for members_only flag
    if event.raw_json:
        import json
        try:
            raw = json.loads(event.raw_json)
            if raw.get("members_only"):
                return False
        except (json.JSONDecodeError, AttributeError):
            pass
    return True


def _classify_with_labels(event: RawEvent) -> tuple[bool, float] | None:
    """Use LLM labels if available. Returns (is_public_bjj_open_mat, confidence) or None."""
    labels = get_labels(event)
    if labels is None:
        return None

    is_bjj = labels.get("is_bjj", False)
    is_open_mat = labels.get("is_open_mat", False)
    is_public = labels.get("is_public", True)
    confidence = labels.get("confidence", 0.0)

    if is_bjj and is_open_mat and is_public:
        return True, confidence
    return False, confidence


def normalize(
    raw_events: list[RawEvent], source_url: str = ""
) -> list[OpenMatEvent]:
    """Filter and convert raw events to public BJJ open mat events.

    Uses LLM labels as authoritative when available, falling back to
    heuristic classification otherwise.
    """
    open_mats: list[OpenMatEvent] = []
    llm_used = 0
    heuristic_used = 0

    for event in raw_events:
        # Try LLM labels first
        label_result = _classify_with_labels(event)
        if label_result is not None:
            llm_used += 1
            is_public_bjj_om, confidence = label_result
            if not is_public_bjj_om:
                continue
        else:
            # Fallback: heuristic classification
            heuristic_used += 1
            is_open_mat, confidence = classify_open_mat(event)
            if not is_open_mat:
                continue
            # Apply BJJ and public filters in fallback too
            if not _is_bjj_heuristic(event):
                continue
            if not _is_public_heuristic(event):
                continue

        open_mats.append(OpenMatEvent(
            day_of_week=event.day_of_week,
            start_time=event.start_time,
            end_time=event.end_time,
            timezone=event.timezone,
            title=event.title,
            confidence=confidence,
            source_url=event.source_url or source_url,
            gym_id=event.gym_id,
        ))

    log.info(
        "Normalized %d raw events -> %d public BJJ open mats "
        "(llm=%d, heuristic=%d)",
        len(raw_events), len(open_mats), llm_used, heuristic_used,
    )
    return open_mats
