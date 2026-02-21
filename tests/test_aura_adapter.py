"""Tests for the Aura Schedule adapter."""

import json
from pathlib import Path

from gym_crawler.extract.adapter import select_adapter
from gym_crawler.extract.aura_schedule import AuraScheduleAdapter
from gym_crawler.models import RawEvent
from gym_crawler.normalize import classify_open_mat, normalize

FIXTURES = Path(__file__).parent / "fixtures"


def _load_fixture() -> str:
    return (FIXTURES / "aura_schedule.html").read_text()


class TestAuraDetection:
    def test_detects_aura_page(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        assert adapter.detect(html, "https://gym.com/schedule")

    def test_does_not_detect_plain_html(self):
        adapter = AuraScheduleAdapter()
        assert not adapter.detect("<html><body><p>Hello</p></body></html>", "https://gym.com")

    def test_registry_selects_aura(self):
        html = _load_fixture()
        adapter = select_adapter(html, "https://gym.com/schedule")
        assert adapter is not None
        assert adapter.name == "aura_schedule"

    def test_registry_falls_back_to_generic(self):
        adapter = select_adapter("<html><body>plain</body></html>", "https://gym.com")
        assert adapter is not None
        assert adapter.name == "html_generic"


class TestAuraExtraction:
    def test_extracts_all_classes(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")
        assert len(events) == 5

    def test_extracts_times(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")

        first = events[0]
        assert first.start_time == "09:00"
        assert first.end_time == "10:00"  # 9:00 + 60 min

    def test_computes_end_time_from_duration(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")

        # Second class: 10:00 AM + 90 min = 11:30
        open_mat = events[1]
        assert open_mat.start_time == "10:00"
        assert open_mat.end_time == "11:30"

    def test_display_title_combines_title_and_focus(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")

        # "BJJ" + "Fundamentals" -> "BJJ Fundamentals"
        assert events[0].title == "BJJ Fundamentals"
        # "BJJ" + "Open Mat" -> "BJJ Open Mat"
        assert events[1].title == "BJJ Open Mat"
        # "BJJ" + "Fighter Flow" -> "BJJ Fighter Flow"
        assert events[2].title == "BJJ Fighter Flow"
        # "No-Gi" + "Open Rolling" -> "No-Gi Open Rolling"
        assert events[3].title == "No-Gi Open Rolling"

    def test_extracts_day_of_week(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")
        assert all(e.day_of_week == "saturday" for e in events)

    def test_extracts_coaches(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")

        raw = json.loads(events[1].raw_json)
        assert raw["coaches"] == ["Coach Mike", "Coach Sarah"]

    def test_extracts_level(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")

        raw = json.loads(events[0].raw_json)
        assert raw["level"] == "All-Levels"

    def test_members_only_detected(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")

        # 4th class has "Members Only" text
        raw = json.loads(events[3].raw_json)
        assert raw["members_only"] is True

        # Others should not be members only
        raw0 = json.loads(events[0].raw_json)
        assert raw0["members_only"] is False

    def test_members_only_not_dropped(self):
        """Members-only classes should still be extracted, not filtered out."""
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")
        titles = [e.title for e in events]
        assert "No-Gi Open Rolling" in titles

    def test_raw_json_includes_adapter_name(self):
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")
        for e in events:
            raw = json.loads(e.raw_json)
            assert raw["adapter"] == "aura_schedule"

    def test_no_focus_still_works(self):
        """Class with no focus div (Kids BJJ) should still extract."""
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        events = adapter.extract(html, "https://gym.com/schedule")
        kids = [e for e in events if "Kids" in e.title]
        assert len(kids) == 1
        assert kids[0].title == "Kids BJJ"
        assert kids[0].start_time == "17:30"
        assert kids[0].end_time == "18:15"  # 17:30 + 45 min


class TestAuraOpenMatClassification:
    """Ensure the combined display_title makes the open-mat classifier work."""

    def test_bjj_open_mat_classified(self):
        """'BJJ Open Mat' (title + focus) should be detected as open mat."""
        event = RawEvent(title="BJJ Open Mat", day_of_week="saturday",
                         start_time="10:00", end_time="11:30")
        is_om, conf = classify_open_mat(event)
        assert is_om
        assert conf >= 0.9  # primary pattern + bjj context boost

    def test_nogi_open_rolling_classified(self):
        event = RawEvent(title="No-Gi Open Rolling", day_of_week="saturday",
                         start_time="13:00", end_time="14:00")
        is_om, conf = classify_open_mat(event)
        assert is_om
        assert conf >= 0.85

    def test_fundamentals_not_classified(self):
        event = RawEvent(title="BJJ Fundamentals", day_of_week="saturday")
        is_om, _ = classify_open_mat(event)
        assert not is_om

    def test_normalize_finds_aura_open_mats(self):
        """End-to-end: Aura events -> normalize -> public BJJ open mat events.

        'No-Gi Open Rolling' is members-only in fixture, so heuristic excludes it.
        Only the public 'BJJ Open Mat' should survive.
        """
        html = _load_fixture()
        adapter = AuraScheduleAdapter()
        raw_events = adapter.extract(html, "https://gym.com/schedule")

        open_mats = normalize(raw_events)
        titles = [om.title for om in open_mats]

        assert "BJJ Open Mat" in titles
        assert "No-Gi Open Rolling" not in titles  # members-only -> excluded
        assert "BJJ Fundamentals" not in titles
        assert len(open_mats) == 1
