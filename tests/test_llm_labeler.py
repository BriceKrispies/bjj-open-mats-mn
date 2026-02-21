"""Tests for LLM labeling pipeline — offline, no real Ollama calls."""

import json
from unittest.mock import patch

import pytest

from gym_crawler.llm_labeler import (
    _extract_labels_list,
    _normalize_label,
    _parse_labels,
    _validate_response,
    get_labels,
    label_events,
)
from gym_crawler.models import Gym, RawEvent
from gym_crawler.normalize import normalize


# ---------------------------------------------------------------------------
# Fixtures: a realistic set of events from a BJJ gym
# ---------------------------------------------------------------------------

def _make_events() -> list[RawEvent]:
    """8 events simulating a Cellar Gym Saturday schedule."""
    return [
        RawEvent(
            id=1, title="BJJ Fundamentals", day_of_week="saturday",
            start_time="09:00", end_time="10:00",
            raw_json=json.dumps({"adapter": "aura_schedule", "title": "BJJ", "focus": "Fundamentals", "level": "All-Levels", "members_only": False}),
        ),
        RawEvent(
            id=2, title="BJJ Open Mat", day_of_week="saturday",
            start_time="10:00", end_time="11:30",
            raw_json=json.dumps({"adapter": "aura_schedule", "title": "BJJ", "focus": "Open Mat", "level": "All-Levels", "members_only": False}),
        ),
        RawEvent(
            id=3, title="BJJ Open Mat", day_of_week="tuesday",
            start_time="19:30", end_time="20:30",
            raw_json=json.dumps({"adapter": "aura_schedule", "title": "BJJ", "focus": "Open Mat", "level": "All-Levels", "members_only": True}),
        ),
        RawEvent(
            id=4, title="Muay Thai Sparring", day_of_week="saturday",
            start_time="11:00", end_time="12:00",
            raw_json=json.dumps({"adapter": "aura_schedule", "title": "Muay Thai", "focus": "Sparring", "members_only": False}),
        ),
        RawEvent(
            id=5, title="MMA Sparring", day_of_week="saturday",
            start_time="13:00", end_time="14:00",
            raw_json=json.dumps({"adapter": "aura_schedule", "title": "MMA", "focus": "Sparring", "members_only": False}),
        ),
        RawEvent(
            id=6, title="No-Gi Open Rolling", day_of_week="wednesday",
            start_time="19:00", end_time="20:00",
            raw_json=json.dumps({"adapter": "aura_schedule", "title": "No-Gi", "focus": "Open Rolling", "level": "All-Levels", "members_only": False}),
        ),
        RawEvent(
            id=7, title="Kids BJJ", day_of_week="saturday",
            start_time="08:00", end_time="09:00",
            raw_json=json.dumps({"adapter": "aura_schedule", "title": "Kids BJJ", "focus": "", "members_only": False}),
        ),
        RawEvent(
            id=8, title="BJJ Fighter Flow", day_of_week="saturday",
            start_time="12:00", end_time="13:00",
            raw_json=json.dumps({"adapter": "aura_schedule", "title": "BJJ", "focus": "Fighter Flow", "members_only": False}),
        ),
    ]


def _make_llm_response(events: list[RawEvent]) -> list[dict]:
    """Simulate the correct LLM response for _make_events()."""
    labels_map = {
        1: {"is_bjj": True, "is_open_mat": False, "is_public": True, "members_only": False, "confidence": 0.95, "reasons": ["Regular fundamentals class"]},
        2: {"is_bjj": True, "is_open_mat": True, "is_public": True, "members_only": False, "confidence": 0.97, "reasons": ["BJJ Open Mat", "Public"]},
        3: {"is_bjj": True, "is_open_mat": True, "is_public": False, "members_only": True, "confidence": 0.95, "reasons": ["BJJ Open Mat", "Members Only"]},
        4: {"is_bjj": False, "is_open_mat": False, "is_public": True, "members_only": False, "confidence": 0.98, "reasons": ["Muay Thai is not BJJ"]},
        5: {"is_bjj": False, "is_open_mat": False, "is_public": True, "members_only": False, "confidence": 0.98, "reasons": ["MMA is not BJJ"]},
        6: {"is_bjj": True, "is_open_mat": True, "is_public": True, "members_only": False, "confidence": 0.96, "reasons": ["No-Gi open rolling", "BJJ discipline"]},
        7: {"is_bjj": True, "is_open_mat": False, "is_public": True, "members_only": False, "confidence": 0.90, "reasons": ["Kids class, not open mat"]},
        8: {"is_bjj": True, "is_open_mat": False, "is_public": True, "members_only": False, "confidence": 0.92, "reasons": ["Fighter Flow is a class, not open mat"]},
    }
    return [
        {"event_id": e.id, **labels_map[e.id]}
        for e in events
    ]


GYM = Gym(name="Test Gym", city="Minneapolis", state="MN")


# ---------------------------------------------------------------------------
# Tests: label_events with mocked Ollama
# ---------------------------------------------------------------------------

class TestLabelEvents:
    def test_labels_all_events(self):
        events = _make_events()
        response = _make_llm_response(events)

        with patch("gym_crawler.llm_labeler.generate_json", return_value=response):
            label_events(GYM, events, "llama3.2:3b")

        for e in events:
            assert e.labels_json is not None
            assert e.labels_model == "llama3.2:3b"

    def test_skips_already_labeled(self):
        events = _make_events()
        events[0].labels_json = json.dumps({"is_bjj": True, "is_open_mat": False, "is_public": True, "members_only": False})

        labels_by_id = {r["event_id"]: r for r in _make_llm_response(events)}
        call_count = 0

        def mock_generate(prompt, model, **kwargs):
            nonlocal call_count
            call_count += 1
            # Return the matching single label for whatever event is in the prompt
            for eid, label in labels_by_id.items():
                if str(eid) in prompt:
                    return label
            return labels_by_id[2]  # fallback

        with patch("gym_crawler.llm_labeler.generate_json", side_effect=mock_generate):
            label_events(GYM, events, "llama3.2:3b")

        # 7 calls (one per unlabeled event), not 8
        assert call_count == 7
        # Event 0 should keep its original labels (was already labeled)
        labels = json.loads(events[0].labels_json)
        assert labels["is_bjj"] is True
        assert "confidence" not in labels  # original, not overwritten

    def test_force_relabels(self):
        events = _make_events()
        events[0].labels_json = json.dumps({"is_bjj": True, "is_open_mat": False, "is_public": True, "members_only": False})

        response = _make_llm_response(events)

        with patch("gym_crawler.llm_labeler.generate_json", return_value=response):
            label_events(GYM, events, "llama3.2:3b", force=True)

        # Event 0 should now have the full LLM label with confidence
        labels = json.loads(events[0].labels_json)
        assert "confidence" in labels

    def test_handles_dict_wrapped_response(self):
        """LLM returns {"events": [...]} instead of bare array."""
        events = _make_events()
        bare_response = _make_llm_response(events)
        wrapped_response = {"events": bare_response}

        with patch("gym_crawler.llm_labeler.generate_json", return_value=wrapped_response):
            label_events(GYM, events, "llama3.2:3b")

        ok_count = sum(1 for e in events if get_labels(e) is not None)
        assert ok_count == len(events)

    def test_handles_partial_response(self):
        """LLM returns labels for only some events — rest get marked failed."""
        events = _make_events()
        partial_response = _make_llm_response(events)[:3]  # only first 3

        with patch("gym_crawler.llm_labeler.generate_json", return_value=partial_response):
            label_events(GYM, events, "llama3.2:3b")

        # First 3 should have valid labels
        for e in events[:3]:
            assert get_labels(e) is not None
        # Rest should be marked as failed (labels_json set but ok=False)
        for e in events[3:]:
            assert e.labels_json is not None
            data = json.loads(e.labels_json)
            assert data.get("ok") is False


# ---------------------------------------------------------------------------
# Tests: normalize with LLM labels (the critical filtering tests)
# ---------------------------------------------------------------------------

class TestNormalizeWithLabels:
    """The core test: LLM labels drive public BJJ open mat selection."""

    def _labeled_events(self) -> list[RawEvent]:
        """Return events with LLM labels applied."""
        events = _make_events()
        response = _make_llm_response(events)
        with patch("gym_crawler.llm_labeler.generate_json", return_value=response):
            label_events(GYM, events, "llama3.2:3b")
        return events

    def test_public_bjj_open_mat_included(self):
        """BJJ Open Mat (public) should be in results."""
        events = self._labeled_events()
        open_mats = normalize(events)
        titles = [om.title for om in open_mats]
        assert "BJJ Open Mat" in titles

    def test_nogi_open_rolling_included(self):
        """No-Gi Open Rolling (public) should be in results."""
        events = self._labeled_events()
        open_mats = normalize(events)
        titles = [om.title for om in open_mats]
        assert "No-Gi Open Rolling" in titles

    def test_members_only_excluded(self):
        """Members-only BJJ Open Mat must be excluded."""
        events = self._labeled_events()
        open_mats = normalize(events)
        # Event id=3 is members-only BJJ Open Mat on Tuesday
        for om in open_mats:
            if om.title == "BJJ Open Mat":
                assert om.day_of_week != "tuesday", \
                    "Members-only Tuesday open mat should be excluded"

    def test_muay_thai_sparring_excluded(self):
        """Muay Thai Sparring must NOT appear as open mat."""
        events = self._labeled_events()
        open_mats = normalize(events)
        titles = [om.title for om in open_mats]
        assert "Muay Thai Sparring" not in titles

    def test_mma_sparring_excluded(self):
        """MMA Sparring must NOT appear as open mat."""
        events = self._labeled_events()
        open_mats = normalize(events)
        titles = [om.title for om in open_mats]
        assert "MMA Sparring" not in titles

    def test_fundamentals_excluded(self):
        """Regular BJJ class should not be open mat."""
        events = self._labeled_events()
        open_mats = normalize(events)
        titles = [om.title for om in open_mats]
        assert "BJJ Fundamentals" not in titles

    def test_fighter_flow_excluded(self):
        """Fighter Flow is a class, not open mat."""
        events = self._labeled_events()
        open_mats = normalize(events)
        titles = [om.title for om in open_mats]
        assert "BJJ Fighter Flow" not in titles

    def test_kids_excluded(self):
        events = self._labeled_events()
        open_mats = normalize(events)
        titles = [om.title for om in open_mats]
        assert "Kids BJJ" not in titles

    def test_exactly_two_public_bjj_open_mats(self):
        """Only the public BJJ Open Mat (Sat) and No-Gi Open Rolling (Wed)."""
        events = self._labeled_events()
        open_mats = normalize(events)
        assert len(open_mats) == 2
        titles = sorted([om.title for om in open_mats])
        assert titles == ["BJJ Open Mat", "No-Gi Open Rolling"]


# ---------------------------------------------------------------------------
# Tests: heuristic fallback (no LLM labels)
# ---------------------------------------------------------------------------

class TestNormalizeHeuristicFallback:
    """When LLM labels are missing, heuristic should still filter correctly."""

    def test_muay_thai_sparring_excluded_heuristic(self):
        """Heuristic should reject Muay Thai Sparring."""
        events = [
            RawEvent(id=1, title="Muay Thai Sparring", day_of_week="saturday"),
        ]
        open_mats = normalize(events)
        assert len(open_mats) == 0

    def test_mma_sparring_excluded_heuristic(self):
        events = [
            RawEvent(id=1, title="MMA Sparring", day_of_week="saturday"),
        ]
        open_mats = normalize(events)
        assert len(open_mats) == 0

    def test_members_only_excluded_heuristic(self):
        events = [
            RawEvent(
                id=1, title="BJJ Open Mat", day_of_week="saturday",
                raw_json=json.dumps({"members_only": True}),
            ),
        ]
        open_mats = normalize(events)
        assert len(open_mats) == 0

    def test_public_bjj_open_mat_passes_heuristic(self):
        events = [
            RawEvent(id=1, title="BJJ Open Mat", day_of_week="saturday"),
        ]
        open_mats = normalize(events)
        assert len(open_mats) == 1


# ---------------------------------------------------------------------------
# Tests: response parsing — dict unwrapping
# ---------------------------------------------------------------------------

class TestExtractLabelsList:
    def test_bare_list(self):
        data = [{"event_id": 1}]
        assert _extract_labels_list(data) == data

    def test_dict_with_events_key(self):
        inner = [{"event_id": 1}]
        assert _extract_labels_list({"events": inner}) == inner

    def test_dict_with_labels_key(self):
        inner = [{"event_id": 1}]
        assert _extract_labels_list({"labels": inner}) == inner

    def test_dict_with_results_key(self):
        inner = [{"event_id": 1}]
        assert _extract_labels_list({"results": inner}) == inner

    def test_dict_with_unknown_key_containing_list(self):
        inner = [{"event_id": 1}]
        assert _extract_labels_list({"classifications_output": inner}) == inner

    def test_single_label_dict(self):
        """LLM returns a single label as a flat dict (not wrapped in array)."""
        single = {"event_id": 1, "is_bjj": True, "is_open_mat": False, "is_public": True, "members_only": False}
        result = _extract_labels_list(single)
        assert result == [single]

    def test_single_label_dict_with_id_key(self):
        single = {"id": 1, "is_bjj": True}
        result = _extract_labels_list(single)
        assert result == [single]

    def test_single_label_dict_with_is_bjj_only(self):
        single = {"is_bjj": True, "is_open_mat": False}
        result = _extract_labels_list(single)
        assert result == [single]

    def test_dict_with_no_list_values(self):
        assert _extract_labels_list({"status": "ok", "count": 3}) is None

    def test_non_dict_non_list(self):
        assert _extract_labels_list("string") is None
        assert _extract_labels_list(42) is None


# ---------------------------------------------------------------------------
# Tests: lenient label normalization
# ---------------------------------------------------------------------------

class TestNormalizeLabel:
    def test_complete_label(self):
        item = {"event_id": 1, "is_bjj": True, "is_open_mat": False, "is_public": True, "members_only": False, "confidence": 0.9, "reasons": ["test"]}
        label = _normalize_label(item, 1)
        assert label["is_bjj"] is True
        assert label["confidence"] == 0.9

    def test_string_booleans_coerced(self):
        item = {"is_bjj": "true", "is_open_mat": "false", "is_public": "yes", "members_only": "no"}
        label = _normalize_label(item, 1)
        assert label["is_bjj"] is True
        assert label["is_open_mat"] is False
        assert label["is_public"] is True
        assert label["members_only"] is False

    def test_missing_keys_get_defaults(self):
        label = _normalize_label({}, 1)
        assert label["is_bjj"] is False
        assert label["is_open_mat"] is False
        assert label["is_public"] is True  # default to public
        assert label["members_only"] is False
        assert label["confidence"] == 0.5
        assert label["reasons"] == []

    def test_confidence_clamped(self):
        label = _normalize_label({"confidence": 2.5}, 1)
        assert label["confidence"] == 1.0
        label = _normalize_label({"confidence": -0.5}, 1)
        assert label["confidence"] == 0.0

    def test_reasons_string_to_list(self):
        label = _normalize_label({"reasons": "single reason"}, 1)
        assert label["reasons"] == ["single reason"]


class TestParseLabels:
    def test_parses_valid_labels(self):
        labels_list = [
            {"event_id": 1, "is_bjj": True, "is_open_mat": True, "is_public": True, "members_only": False, "confidence": 0.9, "reasons": ["test"]},
        ]
        result = _parse_labels(labels_list, {1})
        assert 1 in result
        assert result[1]["is_bjj"] is True

    def test_skips_non_dict_items(self):
        labels_list = ["not a dict", {"event_id": 1, "is_bjj": True}]
        result = _parse_labels(labels_list, {1})
        assert 1 in result

    def test_ignores_unexpected_ids(self):
        labels_list = [
            {"event_id": 1, "is_bjj": True},
            {"event_id": 99, "is_bjj": True},
        ]
        result = _parse_labels(labels_list, {1})
        assert 1 in result
        assert 99 not in result

    def test_handles_string_event_id(self):
        """Some models return event_id as string."""
        labels_list = [{"event_id": "1", "is_bjj": True}]
        result = _parse_labels(labels_list, {1})
        assert 1 in result

    def test_uses_id_key_as_fallback(self):
        """Some models use 'id' instead of 'event_id'."""
        labels_list = [{"id": 1, "is_bjj": True}]
        result = _parse_labels(labels_list, {1})
        assert 1 in result


# ---------------------------------------------------------------------------
# Tests: strict validation (used in test contexts)
# ---------------------------------------------------------------------------

class TestStrictValidation:
    def test_valid_response(self):
        ids = {1, 2}
        response = [
            {"event_id": 1, "is_bjj": True, "is_open_mat": True, "is_public": True, "members_only": False, "confidence": 0.9, "reasons": ["test"]},
            {"event_id": 2, "is_bjj": False, "is_open_mat": False, "is_public": True, "members_only": False, "confidence": 0.8, "reasons": ["test"]},
        ]
        result = _validate_response(response, ids)
        assert result is not None
        assert set(result.keys()) == {1, 2}

    def test_unwraps_dict_wrapper(self):
        """Strict validation can also unwrap dict wrappers."""
        ids = {1}
        inner = [{"event_id": 1, "is_bjj": True, "is_open_mat": True, "is_public": True, "members_only": False, "confidence": 0.9, "reasons": ["test"]}]
        result = _validate_response({"events": inner}, ids)
        assert result is not None

    def test_rejects_non_list_no_list_inside(self):
        assert _validate_response({"status": "ok"}, {1}) is None

    def test_rejects_missing_key(self):
        response = [
            {"event_id": 1, "is_bjj": True},  # missing keys
        ]
        assert _validate_response(response, {1}) is None

    def test_rejects_wrong_type(self):
        response = [
            {"event_id": 1, "is_bjj": "yes", "is_open_mat": True, "is_public": True, "members_only": False, "confidence": 0.9, "reasons": ["test"]},
        ]
        assert _validate_response(response, {1}) is None

    def test_rejects_missing_event_id(self):
        response = [
            {"event_id": 1, "is_bjj": True, "is_open_mat": True, "is_public": True, "members_only": False, "confidence": 0.9, "reasons": ["test"]},
        ]
        assert _validate_response(response, {1, 2}) is None

    def test_rejects_unexpected_event_id(self):
        response = [
            {"event_id": 99, "is_bjj": True, "is_open_mat": True, "is_public": True, "members_only": False, "confidence": 0.9, "reasons": ["test"]},
        ]
        assert _validate_response(response, {1}) is None


# ---------------------------------------------------------------------------
# Tests: get_labels helper
# ---------------------------------------------------------------------------

class TestGetLabels:
    def test_returns_labels(self):
        event = RawEvent(id=1, title="test")
        event.labels_json = json.dumps({"is_bjj": True, "is_open_mat": True, "is_public": True, "members_only": False})
        labels = get_labels(event)
        assert labels is not None
        assert labels["is_bjj"] is True

    def test_returns_none_for_missing(self):
        event = RawEvent(id=1, title="test")
        assert get_labels(event) is None

    def test_returns_none_for_failed(self):
        event = RawEvent(id=1, title="test")
        event.labels_json = json.dumps({"ok": False, "error": "timeout"})
        assert get_labels(event) is None

    def test_returns_none_for_invalid_json(self):
        event = RawEvent(id=1, title="test")
        event.labels_json = "not json"
        assert get_labels(event) is None

    def test_returns_none_for_missing_bool_keys(self):
        """Labels without the 4 required bool keys are not usable."""
        event = RawEvent(id=1, title="test")
        event.labels_json = json.dumps({"is_bjj": True})  # missing other keys
        assert get_labels(event) is None


# ---------------------------------------------------------------------------
# Tests: Ollama client (mocked HTTP)
# ---------------------------------------------------------------------------

class TestOllamaClient:
    def test_generate_json_success(self):
        from gym_crawler.ollama import generate_json
        mock_resp = type("R", (), {
            "status_code": 200,
            "json": lambda self: {"response": '[{"test": true}]'},
        })()
        with patch("gym_crawler.ollama.httpx.post", return_value=mock_resp):
            result = generate_json("test prompt")
        assert result == [{"test": True}]

    def test_generate_connection_error(self):
        import httpx
        from gym_crawler.ollama import OllamaError, generate_json
        with patch("gym_crawler.ollama.httpx.post", side_effect=httpx.ConnectError("refused")):
            with pytest.raises(OllamaError, match="Cannot connect"):
                generate_json("test prompt")

    def test_generate_non_200(self):
        from gym_crawler.ollama import OllamaError, generate_json
        mock_resp = type("R", (), {
            "status_code": 500,
            "text": "Internal Server Error",
        })()
        with patch("gym_crawler.ollama.httpx.post", return_value=mock_resp):
            with pytest.raises(OllamaError, match="HTTP 500"):
                generate_json("test prompt")

    def test_generate_json_retry_on_invalid(self):
        """First response is invalid JSON, retry should work."""
        from gym_crawler.ollama import generate_json

        call_count = 0

        def mock_post(url, json, timeout):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return type("R", (), {
                    "status_code": 200,
                    "json": lambda self: {"response": "not valid json"},
                })()
            return type("R", (), {
                "status_code": 200,
                "json": lambda self: {"response": '[{"ok": true}]'},
            })()

        with patch("gym_crawler.ollama.httpx.post", side_effect=mock_post):
            result = generate_json("test prompt")
        assert result == [{"ok": True}]
        assert call_count == 2

    def test_generate_json_returns_none_after_double_failure(self):
        from gym_crawler.ollama import generate_json

        mock_resp = type("R", (), {
            "status_code": 200,
            "json": lambda self: {"response": "not json at all"},
        })()
        with patch("gym_crawler.ollama.httpx.post", return_value=mock_resp):
            result = generate_json("test prompt")
        assert result is None
