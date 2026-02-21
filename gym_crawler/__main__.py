"""CLI entrypoint: uv run python -m gym_crawler --gym "Name" [options]"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .db import Database
from .discover import discover
from .extract.router import extract, select_schedule_source
from .llm_labeler import label_events
from .models import CrawlStatus, Gym
from .normalize import normalize
from .ollama import DEFAULT_MODEL
from .util.http import get_client
from .util.log import get_logger, setup_logging

log = get_logger("cli")


def load_gyms(data_path: str) -> list[dict]:
    p = Path(data_path)
    if not p.exists():
        log.error("Gym data file not found: %s", data_path)
        sys.exit(1)
    with open(p, encoding="utf-8") as f:
        data = json.load(f)
    if isinstance(data, dict) and "gyms" in data:
        return data["gyms"]
    if isinstance(data, list):
        return data
    log.error("Invalid gym data format in %s", data_path)
    sys.exit(1)


def find_gym(gyms: list[dict], name: str) -> dict | None:
    name_lower = name.lower()
    for g in gyms:
        if g["name"].lower() == name_lower:
            return g
    # Fuzzy: substring match
    matches = [g for g in gyms if name_lower in g["name"].lower()]
    if len(matches) == 1:
        return matches[0]
    if len(matches) > 1:
        log.error(
            "Ambiguous gym name '%s', matches: %s",
            name, [g["name"] for g in matches],
        )
        return None
    return None


def print_summary(
    gym: Gym,
    candidates: list,
    source: object | None,
    raw_count: int,
    open_mats: list,
    db_path: str,
    *,
    llm_model: str | None = None,
    llm_labeled: int = 0,
) -> None:
    print("\n" + "=" * 60)
    print(f"  CRAWL SUMMARY: {gym.name}")
    print("=" * 60)

    print(f"\n  Homepage: {gym.homepage or '(none)'}")

    print(f"\n  Discovered URLs: {len(candidates)}")
    for i, c in enumerate(candidates[:5]):
        print(f"    {i+1}. [{c.kind}] score={c.score:.1f}  {c.url}")
    if len(candidates) > 5:
        print(f"    ... and {len(candidates) - 5} more")

    if source:
        print(f"\n  Selected source: {source.url}")
        print(f"    Provider: {source.provider.value}")
        print(f"    Adapter: {source.adapter or '(none)'}")
        print(f"    Status: {source.status.value}")
        if source.error:
            print(f"    Error: {source.error}")
    else:
        print("\n  No schedule source selected.")

    print(f"\n  Raw events extracted: {raw_count}")

    if llm_model:
        print(f"\n  LLM labeling: {llm_model}")
        print(f"    Events labeled: {llm_labeled}")
    else:
        print("\n  LLM labeling: disabled")

    print(f"\n  Public BJJ Open Mats: {len(open_mats)}")
    for om in open_mats:
        time_str = om.start_time
        if om.end_time:
            time_str += f"-{om.end_time}"
        print(
            f"    {om.day_of_week.capitalize():<10} {time_str:<14} "
            f"{om.title:<30} (confidence={om.confidence:.0%})"
        )

    print(f"\n  Results stored in: {db_path}")
    print(f"    Query: SELECT * FROM open_mat_events WHERE gym_id="
          f"(SELECT id FROM gyms WHERE name='{gym.name}');")
    print()


def run(args: argparse.Namespace) -> None:
    setup_logging()
    db = Database(args.db)

    use_llm = args.llm
    force_llm = args.force_llm
    llm_model = args.llm_model

    # Load gym data
    gym_data = load_gyms(args.data)
    match = find_gym(gym_data, args.gym)
    if match is None:
        log.error("Gym '%s' not found in %s", args.gym, args.data)
        available = [g["name"] for g in gym_data]
        print(f"Available gyms: {available}")
        sys.exit(1)

    # Build Gym model, apply --homepage override
    homepage = args.homepage or match.get("homepage", "")
    gym = Gym(
        name=match["name"],
        city=match.get("city", ""),
        state=match.get("state", ""),
        homepage=homepage,
        notes=match.get("notes", ""),
    )
    gym_id = db.upsert_gym(gym)
    gym.id = gym_id
    log.info("Processing gym: %s (id=%d)", gym.name, gym_id)

    run_id = db.start_crawl_run(gym_id)
    client = get_client()

    try:
        # --- Discover ---
        log.info("Discovering schedule URLs...")
        candidates = discover(gym, client)
        for c in candidates:
            c.gym_id = gym_id
            db.upsert_discovered_url(gym_id, c)

        # --- Select source ---
        source = select_schedule_source(candidates)
        if source is None:
            log.warning("No schedule source found for %s", gym.name)
            db.finish_crawl_run(run_id, CrawlStatus.PARTIAL, "No schedule URL found")
            print_summary(gym, candidates, None, 0, [], args.db)
            return

        source.gym_id = gym_id
        db.deselect_all_sources(gym_id)
        db.upsert_schedule_source(gym_id, source)

        # --- Extract ---
        log.info("Extracting events from %s ...", source.url)
        raw_events, source = extract(source, client, gym)
        db.upsert_schedule_source(gym_id, source)

        for e in raw_events:
            e.gym_id = gym_id

        # Clear and re-insert (idempotent)
        db.clear_raw_events(gym_id)
        raw_count = db.insert_raw_events(gym_id, raw_events)

        # --- LLM Labeling ---
        llm_labeled = 0
        if use_llm and raw_events:
            log.info("Labeling events with %s via Ollama...", llm_model)
            try:
                label_events(gym, raw_events, llm_model, db, force=force_llm)
                llm_labeled = sum(
                    1 for e in raw_events if e.labels_json is not None
                )
            except Exception as e:
                log.error("LLM labeling failed: %s (falling back to heuristics)", e)

        # --- Normalize ---
        log.info("Classifying open mat events...")
        open_mats = normalize(raw_events, source.url)
        for om in open_mats:
            om.gym_id = gym_id

        db.clear_open_mat_events(gym_id)
        db.insert_open_mat_events(gym_id, open_mats)

        status = CrawlStatus.SUCCESS if raw_events else CrawlStatus.PARTIAL
        db.finish_crawl_run(run_id, status)

        print_summary(
            gym, candidates, source, raw_count, open_mats, args.db,
            llm_model=llm_model if use_llm else None,
            llm_labeled=llm_labeled,
        )

    except Exception as e:
        db.finish_crawl_run(run_id, CrawlStatus.FAILED, str(e))
        log.error("Pipeline failed: %s", e)
        raise
    finally:
        client.close()
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(
        prog="gym_crawler",
        description="Crawl a gym's website to find open mat schedule times.",
    )
    parser.add_argument(
        "--gym", required=True, help="Gym name (exact or substring match)"
    )
    parser.add_argument(
        "--db", default="gym_crawler.db", help="SQLite database path"
    )
    parser.add_argument(
        "--data", default="gyms.json", help="Gym data file (JSON)"
    )
    parser.add_argument(
        "--homepage", default="", help="Override homepage URL for this run"
    )
    parser.add_argument(
        "--refresh", action="store_true", help="Force refetch even if recent"
    )

    # LLM labeling flags
    llm_group = parser.add_mutually_exclusive_group()
    llm_group.add_argument(
        "--llm", action="store_true", default=True,
        help="Enable LLM labeling via Ollama (default)",
    )
    llm_group.add_argument(
        "--no-llm", action="store_false", dest="llm",
        help="Disable LLM labeling, use heuristics only",
    )
    parser.add_argument(
        "--force-llm", action="store_true", default=False,
        help="Re-label events even if already labeled",
    )
    parser.add_argument(
        "--llm-model", default=DEFAULT_MODEL,
        help=f"Ollama model to use for labeling (default: {DEFAULT_MODEL})",
    )

    args = parser.parse_args()
    run(args)


if __name__ == "__main__":
    main()
