# /// script
# requires-python = ">=3.10"
# dependencies = ["requests"]
# ///
"""
Build cleaned.csv from the raw per-image CSVs (1-5.csv).
Optionally validate the output against Google Places API.

Pipeline:
  1. Parse raw CSVs, fix field counts
  2. Combine Sheet1 files (4,1,3,2) in row order, dedup overlaps; append Visited (5)
  3. Clean & normalize schedule values
  4. Remove rows with status Closed / No Open Mat
  5. Fold city/state into address, drop unnecessary columns
  6. Write cleaned.csv
  7. (--validate) Cross-check each row against Google Places; write validated.csv

Usage:
  python build.py                                   # build only
  python build.py --validate --key <key>            # build + validate
  GOOGLE_API_KEY=<key> python build.py --validate
  python build.py --validate --key <key> --limit 10 # test first 10 rows
"""

import argparse
import csv
import io
import os
import re
import sys
import time
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

DIR = Path(__file__).parent

# ---------------------------------------------------------------------------
# Config — build
# ---------------------------------------------------------------------------

RAW_HEADERS = ["Name", "Notes", "City", "State", "Contact", "Schedule", "Address", "Phone"]
RAW_FIELD_COUNT = len(RAW_HEADERS)
SHEET1_FILES = ["4.csv", "1.csv", "3.csv", "2.csv"]
OUTPUT_COLS = ["Name", "Contact", "Schedule", "Address", "Phone"]

# Schedule values that are actually statuses, not real times
STATUS_MAP = {
    "NONE": "No Open Mat",
    "NO OPEN MAT": "No Open Mat",
    "CLOSED": "Closed",
    "Not Open to outsiders": "Not Open",
    "? No schedule": "No Schedule",
    "? Not Listed ?": "Not Listed",
    "? Unknown": "Unknown",
    "? No Open Mat": "No Open Mat",
    "None Listed? Sat No Gi": "Unknown",
}

# Statuses that mean "remove this row entirely"
REMOVE_STATUSES = {"Closed", "No Open Mat"}

# Raw schedule string -> cleaned schedule string
SCHEDULE_CLEAN = {
    "Sat 10 am": "Sat 10:00 AM",
    "Sat 10 am Gi Rolls": "Sat 10:00 AM (Gi Rolls)",
    "Sat 10 am?": "Sat 10:00 AM (?)",
    "Sat 8 - 10 am": "Sat 8:00-10:00 AM",
    "Sat 12 - 2": "Sat 12:00-2:00 PM",
    "Sat 12 - 2,": "Sat 12:00-2:00 PM",
    "Sat 2 - 3 PM ?": "Sat 2:00-3:00 PM (?)",
    "Sat 1 - 3 ? BJJ": "Sat 1:00-3:00 PM",
    "Sat 10-11 am": "Sat 10:00-11:00 AM",
    "Sat 10-11 am No Gi": "Sat 10:00-11:00 AM (No Gi)",
    "Sat 10-12": "Sat 10:00 AM-12:00 PM",
    "Sunday 3-5 pm": "Sun 3:00-5:00 PM",
    "Sunday 10 - 12": "Sun 10:00 AM-12:00 PM",
    "Sunday 10 am - 1 pm": "Sun 10:00 AM-1:00 PM",
    "Sun 9-1030 am": "Sun 9:00-10:30 AM",
    "Sun 9-1030": "Sun 9:00-10:30 AM",
    "Sun 10 am Marathon BJJ": "Sun 10:00 AM (Marathon BJJ)",
    "Saturday 930 - 1100 am": "Sat 9:30-11:00 AM",
    "Saturday 930 - 1100": "Sat 9:30-11:00 AM",
    "Saturday 11 am - 1200 noon": "Sat 11:00 AM-12:00 PM",
    "Wednesday ? 8-930 pm": "Wed 8:00-9:30 PM (?)",
    "Sunday 430 pm - 600 pm Open": "Sun 4:30-6:00 PM (Open)",
    "Sunday 430 - 600 pm Open": "Sun 4:30-6:00 PM (Open)",
    "F 6-7, Sat 11-12": "Fri 6:00-7:00 PM, Sat 11:00 AM-12:00 PM",
    "F 5, Sun ? pm, 12 noon, 12 more": "Fri 5:00 PM, Sun 12:00 PM (?)",
    "Fri 530 - 630, Sat 10-12": "Fri 5:30-6:30 PM, Sat 10:00 AM-12:00 PM",
    "Friday /15": "Fri (?)",
    "? 5-7pm no gi": "5:00-7:00 PM (No Gi, day unknown)",
    "? Sat 11 am": "Sat 11:00 AM (?)",
    "? Sat 900 am ?": "Sat 9:00 AM (?)",
    "? Sat 930 ?": "Sat 9:30 AM (?)",
    "? Sat Noon - 100 pm": "Sat 12:00-1:00 PM (?)",
    "? Sun 9 am ?": "Sun 9:00 AM (?)",
    "? W 730 pm ?": "Wed 7:30 PM (?)",
    "? M + Th 645 pm ?": "Mon+Thu 6:45 PM (?)",
    "? M + W 600 pm ?": "Mon+Wed 6:00 PM (?)",
    "M + Th 645 pm": "Mon+Thu 6:45 PM",
    "? 630 pm, Sat 1pm, Sun 930 am": "? 6:30 PM, Sat 1:00 PM, Sun 9:30 AM",
    "? 630 pm Sat 11 am Sun 530 am": "? 6:30 PM, Sat 11:00 AM, Sun 5:30 AM (?)",
    "th-830, Sat 11 am open mat": "Thu 8:30 AM, Sat 11:00 AM",
    "M+F 715-745, Sat 1045-1115, Sun": "Mon+Fri 7:15-7:45 AM, Sat 10:45-11:15 AM, Sun",
    "M+F 715-745, Sat 1045-1115": "Mon+Fri 7:15-7:45 AM, Sat 10:45-11:15 AM",
    "Sat 1045 - 1200 noon": "Sat 10:45 AM-12:00 PM",
    "Sat 1130 - 1230": "Sat 11:30 AM-12:30 PM",
    "Sat 1230 - 230 PM adult class": "Sat 12:30-2:30 PM",
    "Sat 12 - 1 Ground Training": "Sat 12:00-1:00 PM (Ground Training)",
    "Tue 630 pm Marathon Roll": "Tue 6:30 PM (Marathon Roll)",
    "Sat 8 am at Bellum": "Sat 8:00 AM (at Bellum)",
    "None Listed? Sat No Gi": "Sat (No Gi, time unknown)",
}

# ---------------------------------------------------------------------------
# Config — validate
# ---------------------------------------------------------------------------

PLACES_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = (
    "places.displayName,"
    "places.formattedAddress,"
    "places.nationalPhoneNumber,"
    "places.businessStatus"
)
RATE_LIMIT_DELAY = 0.35  # seconds between API calls

VALIDATED_COLS = OUTPUT_COLS + [
    "g_name", "g_address", "g_phone", "g_status",
    "name_match", "address_match", "phone_match",
    "needs_review", "notes",
]

# ---------------------------------------------------------------------------
# Build — Step 1: Parse raw CSVs
# ---------------------------------------------------------------------------

def parse_raw(filepath: Path) -> list[dict]:
    """Read a raw CSV, fix field counts, return rows as dicts (skip blank names)."""
    raw = filepath.read_text(encoding="utf-8")
    reader = csv.reader(raw.splitlines())
    rows = []
    for i, row in enumerate(reader):
        if i == 0:
            continue  # skip header
        while len(row) > RAW_FIELD_COUNT and row[-1].strip() == "":
            row.pop()
        while len(row) < RAW_FIELD_COUNT:
            row.append("")
        d = dict(zip(RAW_HEADERS, row))
        if d["Name"].strip():
            rows.append(d)
    return rows


# ---------------------------------------------------------------------------
# Build — Step 2: Combine & dedup
# ---------------------------------------------------------------------------

def dedup_key(row: dict) -> tuple:
    return (row["Name"].strip().lower(), row["City"].strip().lower())


def pick_better(a: dict, b: dict) -> dict:
    """Keep whichever row has more non-empty fields."""
    def filled(d: dict) -> int:
        return sum(1 for v in d.values() if v.strip())
    return b if filled(b) > filled(a) else a


def combine(sheet1_files: list[str]) -> list[dict]:
    seen: dict[tuple, dict] = {}
    order: list[tuple] = []

    for fname in sheet1_files:
        fpath = DIR / fname
        if not fpath.exists():
            print(f"  WARNING: {fname} not found, skipping")
            continue
        for r in parse_raw(fpath):
            key = dedup_key(r)
            if key in seen:
                seen[key] = pick_better(seen[key], r)
            else:
                seen[key] = r
                order.append(key)

    rows = [seen[k] for k in order]
    print(f"  {len(rows)} unique rows from {len(sheet1_files)} files")
    return rows


# ---------------------------------------------------------------------------
# Build — Step 3: Clean schedules & extract status
# ---------------------------------------------------------------------------

def clean_schedule(row: dict) -> tuple[str, str]:
    """Return (cleaned_schedule, status)."""
    sched = row["Schedule"].strip()
    status = ""

    if sched in STATUS_MAP:
        status = STATUS_MAP[sched]
        sched = SCHEDULE_CLEAN.get(sched, "")
    elif sched in SCHEDULE_CLEAN:
        sched = SCHEDULE_CLEAN[sched]

    return sched, status


# ---------------------------------------------------------------------------
# Build — Step 5: Fold city/state into address
# ---------------------------------------------------------------------------

def ensure_address_has_city_state(row: dict) -> str:
    addr = row["Address"].strip()
    city = row["City"].strip()
    state = row["State"].strip()

    if not addr:
        if city and state:
            return f"{city}, {state}"
        return city or ""

    addr_lower = addr.lower()
    if city and city.lower() not in addr_lower:
        addr = f"{addr}, {city}, {state}" if state else f"{addr}, {city}"
    elif state and state not in addr:
        addr = f"{addr}, {state}"

    return addr


# ---------------------------------------------------------------------------
# Validate — normalization helpers
# ---------------------------------------------------------------------------

def _norm_text(s: str) -> str:
    s = s.lower()
    s = re.sub(r"[^\w\s]", "", s)
    return re.sub(r"\s+", " ", s).strip()


def _norm_phone(p: str) -> str:
    return re.sub(r"\D", "", p)


def _street_number(addr: str) -> str:
    m = re.match(r"^\d+", addr.strip())
    return m.group(0) if m else ""


def _zip_code(addr: str) -> str:
    zips = re.findall(r"\b\d{5}\b", addr)
    return zips[-1] if zips else ""


def match_name(orig: str, google: str) -> str:
    if not orig or not google:
        return "missing"
    return "yes" if _norm_text(orig) == _norm_text(google) else "no"


def match_phone(orig: str, google: str) -> str:
    if not orig or not google:
        return "missing"
    o, g = _norm_phone(orig), _norm_phone(google)
    if not o or not g:
        return "missing"
    return "yes" if o[-10:] == g[-10:] else "no"


def match_address(orig: str, google: str) -> str:
    """
    Checks that the street number AND zip code from our record both appear
    in Google's formatted address. Falls back to word-overlap if neither exists.
    """
    if not orig or not google:
        return "missing"
    street_no = _street_number(orig)
    zip_code = _zip_code(orig)
    g_lower = google.lower()

    if not street_no and not zip_code:
        orig_words = set(_norm_text(orig).split())
        g_words = set(_norm_text(google).split())
        return "yes" if len(orig_words & g_words) >= 2 else "no"

    has_street = (not street_no) or (street_no in g_lower)
    has_zip = (not zip_code) or (zip_code in g_lower)
    return "yes" if (has_street and has_zip) else "no"


# ---------------------------------------------------------------------------
# Validate — API call
# ---------------------------------------------------------------------------

def search_place(name: str, address: str, api_key: str) -> dict | None:
    import requests  # only imported when --validate is used
    query = f"{name} {address}".strip()
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": FIELD_MASK,
    }
    payload = {"textQuery": query, "maxResultCount": 1, "languageCode": "en"}
    try:
        resp = requests.post(PLACES_URL, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        places = resp.json().get("places", [])
        return places[0] if places else None
    except requests.RequestException as e:
        print(f"    API error: {e}")
        return None


# ---------------------------------------------------------------------------
# Validate — per-row
# ---------------------------------------------------------------------------

def validate_row(row: dict, api_key: str) -> dict:
    place = search_place(row["Name"], row["Address"], api_key)
    out = dict(row)

    if place is None:
        out.update(
            g_name="", g_address="", g_phone="", g_status="NOT_FOUND",
            name_match="no", address_match="no", phone_match="missing",
            needs_review="yes", notes="No Google result found",
        )
        return out

    g_name    = place.get("displayName", {}).get("text", "")
    g_address = place.get("formattedAddress", "")
    g_phone   = place.get("nationalPhoneNumber", "")
    g_status  = place.get("businessStatus", "OPERATIONAL")

    nm = match_name(row["Name"], g_name)
    am = match_address(row["Address"], g_address)
    pm = match_phone(row["Phone"], g_phone)

    notes = []
    if g_status == "CLOSED_PERMANENTLY":
        notes.append("PERMANENTLY CLOSED on Google")
    elif g_status == "CLOSED_TEMPORARILY":
        notes.append("Temporarily closed on Google")

    needs = "yes" if (
        nm == "no" or am == "no" or pm == "no"
        or g_status in ("CLOSED_PERMANENTLY", "CLOSED_TEMPORARILY", "NOT_FOUND")
    ) else "no"

    out.update(
        g_name=g_name, g_address=g_address, g_phone=g_phone, g_status=g_status,
        name_match=nm, address_match=am, phone_match=pm,
        needs_review=needs, notes="; ".join(notes),
    )
    return out


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Build cleaned.csv from raw CSVs, optionally validate via Google Places."
    )
    parser.add_argument(
        "--validate", action="store_true",
        help="After building, cross-check each row against Google Places API",
    )
    parser.add_argument(
        "--key", default=os.environ.get("GOOGLE_API_KEY", ""),
        help="Google Places API key (or set GOOGLE_API_KEY env var); required with --validate",
    )
    parser.add_argument(
        "--limit", type=int, default=0,
        help="With --validate: only validate the first N rows (0 = all)",
    )
    args = parser.parse_args()

    if args.validate and not args.key:
        print("ERROR: --validate requires an API key (--key <key> or GOOGLE_API_KEY env var)")
        sys.exit(1)

    # --- Build ---
    print("Step 1-2: Parse raw CSVs and combine...")
    rows = combine(SHEET1_FILES)
    print(f"  Combined: {len(rows)} total rows\n")

    print("Step 3: Clean schedules & extract status...")
    removed = []
    cleaned = []
    for r in rows:
        sched, status = clean_schedule(r)
        r["Schedule"] = sched

        if status in REMOVE_STATUSES:
            removed.append((r["Name"], status))
            continue

        r["Address"] = ensure_address_has_city_state(r)
        cleaned.append({k: r[k] for k in OUTPUT_COLS})

    print(f"  Removed {len(removed)} rows:")
    for name, status in removed:
        print(f"    - {name} ({status})")
    print()

    out_path = DIR / "cleaned.csv"
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLS)
        writer.writeheader()
        writer.writerows(cleaned)

    print(f"Result: {len(cleaned)} rows, columns: {', '.join(OUTPUT_COLS)}")
    print(f"Wrote {out_path.name}")

    if not args.validate:
        return

    # --- Validate ---
    print()
    rows_to_check = cleaned[: args.limit] if args.limit else cleaned
    print(f"Step 7: Validating {len(rows_to_check)} rows against Google Places...\n")

    results = []
    for i, row in enumerate(rows_to_check, 1):
        print(f"[{i:>3}/{len(rows_to_check)}] {row['Name']}")
        result = validate_row(row, args.key)

        if result["needs_review"] == "yes":
            print(f"         *** NEEDS REVIEW")
            if result["notes"]:
                print(f"             {result['notes']}")
            if result["name_match"] == "no":
                print(f"             name:    ours='{row['Name']}'  google='{result['g_name']}'")
            if result["address_match"] == "no":
                print(f"             address: ours='{row['Address']}'")
                print(f"                      goog='{result['g_address']}'")
            if result["phone_match"] == "no":
                print(f"             phone:   ours='{row['Phone']}'  google='{result['g_phone']}'")

        results.append(result)
        time.sleep(RATE_LIMIT_DELAY)

    validated_path = DIR / "validated.csv"
    with open(validated_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=VALIDATED_COLS)
        writer.writeheader()
        writer.writerows(results)

    needs_review = sum(1 for r in results if r["needs_review"] == "yes")
    ok = len(results) - needs_review
    print(f"\nDone.  OK: {ok}  |  Needs review: {needs_review}  |  Total: {len(results)}")
    print(f"Wrote {validated_path.name}")


if __name__ == "__main__":
    main()
