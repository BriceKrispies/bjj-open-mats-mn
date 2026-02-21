# /// script
# requires-python = ">=3.10"
# ///
"""
Build cleaned.csv from the raw per-image CSVs (1-5.csv).

Pipeline:
  1. Parse raw CSVs, fix field counts
  2. Combine Sheet1 files (4,1,3,2) in row order, dedup overlaps; append Visited (5)
  3. Clean & normalize schedule values
  4. Remove rows with status Closed / No Open Mat
  5. Fold city/state into address, drop unnecessary columns
  6. Write cleaned.csv
"""

import csv
import sys
import io
from pathlib import Path

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

DIR = Path(__file__).parent

# --- Config ---

RAW_HEADERS = ["Name", "Notes", "City", "State", "Contact", "Schedule", "Address", "Phone"]
RAW_FIELD_COUNT = len(RAW_HEADERS)
SHEET1_FILES = ["4.csv", "1.csv", "3.csv", "2.csv"]
VISITED_FILE = "5.csv"
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


# --- Step 1: Parse raw CSVs ---

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


# --- Step 2: Combine & dedup ---

def dedup_key(row: dict) -> tuple:
    return (row["Name"].strip().lower(), row["City"].strip().lower())


def pick_better(a: dict, b: dict) -> dict:
    """Keep whichever row has more non-empty fields."""
    def filled(d: dict) -> int:
        return sum(1 for v in d.values() if v.strip())
    return b if filled(b) > filled(a) else a


def combine(sheet1_files: list[str], visited_file: str) -> list[dict]:
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

    sheet1_rows = [seen[k] for k in order]
    for r in sheet1_rows:
        r["Source"] = "Sheet1"
    print(f"  Sheet1: {len(sheet1_rows)} unique rows from {len(sheet1_files)} files")

    visited_path = DIR / visited_file
    visited_rows = []
    if visited_path.exists():
        visited_rows = parse_raw(visited_path)
        for r in visited_rows:
            r["Source"] = "Visited"
    print(f"  Visited: {len(visited_rows)} rows")

    return sheet1_rows + visited_rows


# --- Step 3: Clean schedules & extract status ---

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


# --- Step 5: Fold city/state into address ---

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


# --- Main pipeline ---

def main():
    print("Step 1-2: Parse raw CSVs and combine...")
    rows = combine(SHEET1_FILES, VISITED_FILE)
    print(f"  Combined: {len(rows)} total rows\n")

    print("Step 3: Clean schedules & extract status...")
    removed = []
    cleaned = []
    for r in rows:
        sched, status = clean_schedule(r)
        r["Schedule"] = sched

        # Step 4: Remove closed / no open mat
        if status in REMOVE_STATUSES:
            removed.append((r["Name"], status))
            continue

        # Step 5: Fold city/state into address
        r["Address"] = ensure_address_has_city_state(r)

        # Keep only output columns
        cleaned.append({k: r[k] for k in OUTPUT_COLS})

    print(f"  Removed {len(removed)} rows:")
    for name, status in removed:
        print(f"    - {name} ({status})")
    print()

    # Step 6: Write output
    out_path = DIR / "cleaned.csv"
    with open(out_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=OUTPUT_COLS)
        writer.writeheader()
        writer.writerows(cleaned)

    print(f"Result: {len(cleaned)} rows, columns: {', '.join(OUTPUT_COLS)}")
    print(f"Wrote {out_path.name}")


if __name__ == "__main__":
    main()
