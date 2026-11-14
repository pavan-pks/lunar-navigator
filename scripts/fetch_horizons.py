#!/usr/bin/env python3
"""
scripts/fetch_horizons.py
Fetches high-accuracy lunar ephemeris from NASA/JPL Horizons API for 2027-2028.
Extracts sub-solar and sub-Earth coordinates (quantities 14, 15) seen from Moon.
Saves to public/data/global_ephem.json with fake=false.
"""

import argparse
import calendar
import hashlib
import json
import os
import sys
import time
from datetime import datetime, date
import requests

HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api"

def wrap_lon(lon):
    """Normalize longitude to [-180, 180] degrees (East positive)."""
    lon = lon % 360.0
    if lon > 180.0:
        lon -= 360.0
    return lon

def fetch_chunk(start_str, stop_str, cache_dir="scripts/cache", use_cache=True, retries=3):
    """Fetches a single chunk from Horizons API or disk cache."""
    os.makedirs(cache_dir, exist_ok=True)
    cache_key = f"{start_str}_{stop_str}".replace(" ", "_").replace(":", "")
    cache_path = os.path.join(cache_dir, f"horizons_chunk_{cache_key}.json")

    if use_cache and os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return data.get("result", "")
        except Exception:
            pass

    params = {
        "format": "json",
        "COMMAND": "'301'",
        "CENTER": "'500@399'",
        "EPHEM_TYPE": "'OBSERVER'",
        "START_TIME": f"'{start_str}'",
        "STOP_TIME": f"'{stop_str}'",
        "STEP_SIZE": "'1 h'",
        "QUANTITIES": "'14,15'",
        "ANG_FORMAT": "'DEG'",
        "CSV_FORMAT": "'YES'",
        "OBJ_DATA": "'NO'"
    }

    last_err = None
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(HORIZONS_API, params=params, timeout=45)
            r.raise_for_status()
            data = r.json()
            result = data.get("result", "")
            if "$$SOE" not in result or "$$EOE" not in result:
                raise ValueError("Response missing $$SOE or $$EOE markers")
            
            # Cache valid response
            if use_cache:
                with open(cache_path, "w", encoding="utf-8") as f:
                    json.dump(data, f)
            return result
        except Exception as e:
            last_err = e
            print(f"  Attempt {attempt}/{retries} failed for {start_str} to {stop_str}: {e}")
            time.sleep(2 * attempt)

    raise RuntimeError(f"Failed to fetch {start_str} to {stop_str}: {last_err}")

def parse_ephemeris_rows(result_text):
    """Extracts parsed rows between $$SOE and $$EOE."""
    if "$$SOE" not in result_text or "$$EOE" not in result_text:
        return []
    
    body = result_text.split("$$SOE")[1].split("$$EOE")[0]
    lines = body.strip().split("\n")
    rows = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        parts = [p.strip() for p in line.split(",") if p.strip()]
        if len(parts) >= 5:
            dt_str = parts[0]
            try:
                ob_lon = float(parts[1])
                ob_lat = float(parts[2])
                sl_lon = float(parts[3])
                sl_lat = float(parts[4])
                rows.append((dt_str, ob_lon, ob_lat, sl_lon, sl_lat))
            except ValueError:
                continue
    return rows

def generate_chunks(start_date_str, stop_date_str):
    """Splits date range into month-by-month chunks."""
    start_d = datetime.strptime(start_date_str, "%Y-%m-%d").date()
    stop_d = datetime.strptime(stop_date_str, "%Y-%m-%d").date()

    chunks = []
    y, m = start_d.year, start_d.month
    while (y < stop_d.year) or (y == stop_d.year and m <= stop_d.month):
        _, last_day = calendar.monthrange(y, m)
        d_start = 1 if not (y == start_d.year and m == start_d.month) else start_d.day
        d_end = last_day if not (y == stop_d.year and m == stop_d.month) else stop_d.day
        
        chunk_start = f"{y:04d}-{m:02d}-{d_start:02d} 00:00"
        chunk_stop = f"{y:04d}-{m:02d}-{d_end:02d} 23:00"
        chunks.append((chunk_start, chunk_stop))
        
        if m == 12:
            y += 1
            m = 1
        else:
            m += 1
    return chunks

def main():
    parser = argparse.ArgumentParser(description="Fetch Moon ephemeris from NASA/JPL Horizons.")
    parser.add_argument("--start", default="2027-01-01", help="Start date YYYY-MM-DD (default: 2027-01-01)")
    parser.add_argument("--stop", default="2028-01-31", help="Stop date YYYY-MM-DD (default: 2028-01-31)")
    parser.add_argument("--out", default="public/data/global_ephem.json", help="Output JSON path")
    parser.add_argument("--cache-dir", default="scripts/cache", help="Cache directory")
    parser.add_argument("--no-cache", action="store_true", help="Bypass disk cache")
    args = parser.parse_args()

    chunks = generate_chunks(args.start, args.stop)
    print(f"Fetching Horizons ephemeris in {len(chunks)} monthly chunks from {args.start} to {args.stop}...")

    all_rows = []
    for idx, (c_start, c_stop) in enumerate(chunks, 1):
        print(f"[{idx}/{len(chunks)}] Fetching {c_start} to {c_stop}...")
        res_text = fetch_chunk(c_start, c_stop, cache_dir=args.cache_dir, use_cache=not args.no_cache)
        rows = parse_ephemeris_rows(res_text)
        print(f"       -> Parsed {len(rows)} hourly entries.")
        all_rows.extend(rows)

    print(f"\nTotal raw rows parsed: {len(all_rows)}")

    sub_solar_lat = []
    sub_solar_lon = []
    sub_earth_lat = []
    sub_earth_lon = []

    for dt_str, ob_lon, ob_lat, sl_lon, sl_lat in all_rows:
        sub_solar_lat.append(round(sl_lat, 3))
        sub_solar_lon.append(round(wrap_lon(sl_lon), 3))
        sub_earth_lat.append(round(ob_lat, 3))
        sub_earth_lon.append(round(wrap_lon(ob_lon), 3))

    start_iso = f"{args.start}T00:00:00Z"
    ephem_data = {
        "fake": False,
        "source": "NASA/JPL Horizons System (ephemeris type: OBSERVER, center: 500@399 geocenter, target: 301 Moon, quantities: 14, 15)",
        "startUTC": start_iso,
        "stepHours": 1,
        "subSolarLat": sub_solar_lat,
        "subSolarLon": sub_solar_lon,
        "subEarthLat": sub_earth_lat,
        "subEarthLon": sub_earth_lon
    }

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", encoding="utf-8") as f:
        json.dump(ephem_data, f, indent=2)

    file_size_kb = os.path.getsize(args.out) / 1024
    print(f"SUCCESS: Wrote {len(sub_solar_lat)} hourly entries to {args.out} ({file_size_kb:.1f} KB).")
    print(f"Fake status: {ephem_data['fake']}")

if __name__ == "__main__":
    main()
