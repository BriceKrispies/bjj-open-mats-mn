"""Tests for URL scoring and ranking."""

from pathlib import Path

from bs4 import BeautifulSoup

from gym_crawler.discover import _extract_from_page
from gym_crawler.util.urls import detect_provider, is_schedule_iframe, score_url

FIXTURES = Path(__file__).parent / "fixtures"


class TestScoreUrl:
    def test_schedule_keyword_in_path(self):
        assert score_url("https://gym.com/schedule") > 0

    def test_calendar_keyword(self):
        assert score_url("https://gym.com/calendar") > 0

    def test_open_mat_keyword(self):
        assert score_url("https://gym.com/open-mat") > 0

    def test_negative_pricing(self):
        assert score_url("https://gym.com/pricing") < 0

    def test_negative_contact(self):
        assert score_url("https://gym.com/contact") < 0

    def test_anchor_text_boosts(self):
        plain = score_url("https://gym.com/page")
        with_text = score_url("https://gym.com/page", "View Schedule")
        assert with_text > plain

    def test_schedule_beats_pricing(self):
        assert score_url("https://gym.com/schedule") > score_url("https://gym.com/pricing")

    def test_shorter_paths_boosted(self):
        short = score_url("https://gym.com/schedule")
        deep = score_url("https://gym.com/a/b/c/d/schedule")
        assert short >= deep


class TestDetectProvider:
    def test_mindbody(self):
        assert detect_provider("https://widgets.mindbodyonline.com/widget/123") == "mindbody"

    def test_zenplanner(self):
        assert detect_provider("https://test.zenplanner.com/schedule") == "zenplanner"

    def test_google_calendar(self):
        assert detect_provider("https://calendar.google.com/calendar/embed") == "google_calendar"

    def test_teamup(self):
        assert detect_provider("https://teamup.com/ks123abc") == "teamup"

    def test_unknown(self):
        assert detect_provider("https://gym.com/schedule") is None


class TestScheduleIframe:
    def test_mindbody_iframe(self):
        assert is_schedule_iframe("https://widgets.mindbodyonline.com/widget/123")

    def test_google_calendar_iframe(self):
        assert is_schedule_iframe("https://calendar.google.com/calendar/embed?src=abc")

    def test_schedule_keyword_iframe(self):
        assert is_schedule_iframe("https://gym.com/schedule-widget")

    def test_non_schedule_iframe(self):
        assert not is_schedule_iframe("https://youtube.com/embed/abc")

    def test_empty(self):
        assert not is_schedule_iframe("")


class TestExtractFromPage:
    def test_homepage_discovery(self):
        html = (FIXTURES / "homepage_with_links.html").read_text()
        soup = BeautifulSoup(html, "lxml")
        candidates, links = _extract_from_page(
            soup, "https://gym.com/", "https://gym.com"
        )

        urls = [c.url for c in candidates]
        # Should find schedule-related links
        assert any("schedule" in u for u in urls)
        assert any("open-mat" in u for u in urls)
        assert any("classes" in u for u in urls)

        # Should find the mindbody iframe
        assert any("mindbody" in c.kind for c in candidates)

        # Should find the google calendar link
        assert any("calendar.google.com" in u for u in urls)

        # Pricing should NOT be a candidate (negative score)
        pricing_candidates = [c for c in candidates if "pricing" in c.url]
        assert all(c.score < 0 for c in pricing_candidates)

    def test_internal_links_collected(self):
        html = (FIXTURES / "homepage_with_links.html").read_text()
        soup = BeautifulSoup(html, "lxml")
        _, links = _extract_from_page(
            soup, "https://gym.com/", "https://gym.com"
        )
        assert len(links) > 0
        # All links should be on same domain
        assert all("gym.com" in link for link in links)
