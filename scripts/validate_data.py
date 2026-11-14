#!/usr/bin/env python3
"""
scripts/validate_data.py
Validates JSON data files in public/data/ against project contract schemas.
"""

import json
import os
import sys

def validate_sites(sites_path="public/data/sites.json"):
    print(f"Validating {sites_path}...")
    if not os.path.exists(sites_path):
        print(f"FAIL: File not found: {sites_path}")
        return False

    with open(sites_path, "r", encoding="utf-8") as f:
        try:
            sites = json.load(f)
        except Exception as e:
            print(f"FAIL: JSON parse error: {e}")
            return False

    if not isinstance(sites, list) or len(sites) < 4:
        print(f"FAIL: sites must be a list with at least 4 entries, got {len(sites) if isinstance(sites, list) else type(sites)}")
        return False

    valid_terrains = {"crater-rim", "massif", "plain"}
    required_keys = {"id", "name", "lat", "lon", "terrainType", "notes", "source", "verified"}

    for idx, s in enumerate(sites):
        missing = required_keys - set(s.keys())
        if missing:
            print(f"FAIL: Site [{idx}] missing required keys: {missing}")
            return False

        if not isinstance(s["lat"], (int, float)) or not (-90.0 <= s["lat"] <= 90.0):
            print(f"FAIL: Site [{s.get('id')}] lat {s.get('lat')} out of range [-90, 90]")
            return False

        if not isinstance(s["lon"], (int, float)) or not (-180.0 <= s["lon"] <= 180.0):
            print(f"FAIL: Site [{s.get('id')}] lon {s.get('lon')} out of range [-180, 180]")
            return False

        if s["terrainType"] not in valid_terrains:
            print(f"FAIL: Site [{s.get('id')}] invalid terrainType: {s.get('terrainType')}")
            return False

        if not isinstance(s["verified"], bool):
            print(f"FAIL: Site [{s.get('id')}] verified must be boolean")
            return False

    print(f"PASS: {len(sites)} sites valid.")
    return True

def validate_ephemeris(ephem_path="public/data/global_ephem.json"):
    print(f"Validating {ephem_path}...")
    if not os.path.exists(ephem_path):
        print(f"FAIL: File not found: {ephem_path}")
        return False

    with open(ephem_path, "r", encoding="utf-8") as f:
        try:
            ephem = json.load(f)
        except Exception as e:
            print(f"FAIL: JSON parse error: {e}")
            return False

    required_keys = {"fake", "source", "startUTC", "stepHours", "subSolarLat", "subSolarLon", "subEarthLat", "subEarthLon"}
    missing = required_keys - set(ephem.keys())
    if missing:
        print(f"FAIL: Missing required keys in ephemeris: {missing}")
        return False

    arrays = [ephem["subSolarLat"], ephem["subSolarLon"], ephem["subEarthLat"], ephem["subEarthLon"]]
    lengths = [len(a) for a in arrays]
    if len(set(lengths)) != 1:
        print(f"FAIL: Coordinate arrays have mismatched lengths: {lengths}")
        return False

    n = lengths[0]
    if n < 100:
        print(f"FAIL: Ephemeris array length too short ({n})")
        return False

    # Check bounds
    for i in range(min(1000, n)):
        slat = ephem["subSolarLat"][i]
        slon = ephem["subSolarLon"][i]
        elat = ephem["subEarthLat"][i]
        elon = ephem["subEarthLon"][i]

        if not (-90.0 <= slat <= 90.0 and -180.0 <= slon <= 180.0):
            print(f"FAIL: Subsolar coords out of bounds at step {i}: lat={slat}, lon={slon}")
            return False

        if not (-90.0 <= elat <= 90.0 and -180.0 <= elon <= 180.0):
            print(f"FAIL: Subearth coords out of bounds at step {i}: lat={elat}, lon={elon}")
            return False

    print(f"PASS: Ephemeris valid ({n} hours, fake={ephem['fake']}).")
    return True

def main():
    s_ok = validate_sites()
    e_ok = validate_ephemeris()
    if s_ok and e_ok:
        print("\nALL DATA FILES VALIDATED: PASS")
        sys.exit(0)
    else:
        print("\nDATA VALIDATION FAILED: FAIL")
        sys.exit(1)

if __name__ == "__main__":
    main()
