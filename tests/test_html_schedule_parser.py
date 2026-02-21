"""Tests for HTML schedule extraction strategies."""

from pathlib import Path

from gym_crawler.extract.html_schedule import extract_from_html
from gym_crawler.extract.google_calendar import extract_from_ics

FIXTURES = Path(__file__).parent / "fixtures"


class TestTableExtraction:
    def test_basic_table(self):
        html = (FIXTURES / "schedule_table.html").read_text()
        events = extract_from_html(html, "https://gym.com/schedule")
        assert len(events) >= 5  # 7 rows in fixture

        # Check we got days
        days = {e.day_of_week for e in events}
        assert "monday" in days
        assert "saturday" in days
        assert "sunday" in days

        # Check we got times
        timed = [e for e in events if e.start_time]
        assert len(timed) >= 5

        # Check Open Mat events are present
        titles = [e.title for e in events]
        assert any("Open Mat" in t for t in titles)

    def test_extracts_time_ranges(self):
        html = (FIXTURES / "schedule_table.html").read_text()
        events = extract_from_html(html)
        morning = [e for e in events if e.title == "Morning BJJ"]
        assert len(morning) >= 1
        assert morning[0].start_time == "06:00"
        assert morning[0].end_time == "07:00"


class TestDayColumnTable:
    def test_day_as_columns(self):
        html = (FIXTURES / "schedule_day_columns.html").read_text()
        events = extract_from_html(html)
        assert len(events) >= 5  # several non-empty cells

        # Check specific events
        open_mats = [e for e in events if "open mat" in e.title.lower()]
        assert len(open_mats) >= 2  # Friday 6am, Saturday 10am, Wed lunch

        # Check days are correctly assigned
        days = {e.day_of_week for e in events}
        assert "monday" in days
        assert "friday" in days
        assert "saturday" in days


class TestDaySections:
    def test_day_header_sections(self):
        html = (FIXTURES / "schedule_day_sections.html").read_text()
        events = extract_from_html(html)
        assert len(events) >= 8

        # Check Monday has 3 events
        monday = [e for e in events if e.day_of_week == "monday"]
        assert len(monday) >= 3

        # Check Saturday has 2 events
        saturday = [e for e in events if e.day_of_week == "saturday"]
        assert len(saturday) >= 2

        # Check Open Mat is found
        open_mats = [e for e in events if "open mat" in e.title.lower()]
        assert len(open_mats) >= 2


class TestIcsExtraction:
    def test_ics_parse(self):
        ics = (FIXTURES / "sample.ics").read_text()
        events = extract_from_ics(ics, "https://calendar.google.com/basic.ics")
        assert len(events) == 5

        # Check Saturday Open Mat
        sat = [e for e in events if "Open Mat" in e.title and e.day_of_week == "saturday"]
        assert len(sat) >= 1
        assert sat[0].start_time == "10:00"
        assert sat[0].end_time == "12:00"

        # Check location preserved
        assert all(e.location for e in events)

    def test_ics_days_correct(self):
        ics = (FIXTURES / "sample.ics").read_text()
        events = extract_from_ics(ics)
        days = {e.day_of_week for e in events}
        # Jan 18 2025 = Saturday, Jan 20 = Monday, Jan 21 = Tuesday,
        # Jan 22 = Wednesday, Jan 24 = Friday
        assert days == {"saturday", "monday", "tuesday", "wednesday", "friday"}
