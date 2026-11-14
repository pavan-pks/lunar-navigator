#!/usr/bin/env python3
"""
scripts/verify_against_horizons.py
Cross-checks the project's analytical spherical trigonometry formulas against
NASA/JPL Horizons topocentric observer queries (CENTER='coord@301') for known sites.

Acceptance criteria:
- Sun elevation difference < 0.3 deg
- Earth elevation difference < 0.6 deg (due to Moon-geocenter parallax up to ~0.26 deg)
- Sun and Earth azimuth difference < 0.5 deg
"""

import math
import sys
import requests

HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api"

def calculate_el_az(site_lat, site_lon, target_lat, target_lon):
    """
    Project standard analytical spherical geometry formula (from docs/INTEGRATION_README.md 5.3):
    sin(el) = sin phi * sin phi_t + cos phi * cos phi_t * cos(lam_t - lam)
    az      = atan2( cos phi_t * sin(lam_t - lam),  cos phi * sin phi_t - sin phi * cos phi_t * cos(lam_t - lam) ) -> 0..360
    """
    # Clamp site latitude to avoid polar singularity
    clamped_lat = max(-89.9999, min(89.9999, site_lat))

    phi = math.radians(clamped_lat)
    lam = math.radians(site_lon)
    phi_t = math.radians(target_lat)
    lam_t = math.radians(target_lon)

    d_lam = lam_t - lam

    sin_el = math.sin(phi) * math.sin(phi_t) + math.cos(phi) * math.cos(phi_t) * math.cos(d_lam)
    sin_el = max(-1.0, min(1.0, sin_el))
    el = math.degrees(math.asin(sin_el))

    y = math.cos(phi_t) * math.sin(d_lam)
    x = math.cos(phi) * math.sin(phi_t) - math.sin(phi) * math.cos(phi_t) * math.cos(d_lam)
    az = math.degrees(math.atan2(y, x))
    az = (az + 360.0) % 360.0

    return el, az

def get_ephem_index(dt_str, start_iso="2027-01-01T00:00:00Z"):
    """Calculates array index for a given YYYY-MM-DD HH:MM string."""
    from datetime import datetime
    t_dt = datetime.strptime(dt_str, "%Y-%m-%d %H:%M")
    s_dt = datetime.fromisoformat(start_iso.replace("Z", "+00:00")).replace(tzinfo=None)
    hours = int((t_dt - s_dt).total_seconds() // 3600)
    return hours

def query_horizons_subpoints(time_str, ephem_json_path="public/data/global_ephem.json"):
    """Gets sub-Earth and sub-solar coordinates from local global_ephem.json if available."""
    import json, os
    if os.path.exists(ephem_json_path):
        with open(ephem_json_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        idx = get_ephem_index(time_str, data.get("startUTC", "2027-01-01T00:00:00Z"))
        if 0 <= idx < len(data["subSolarLat"]):
            return (
                data["subEarthLat"][idx],
                data["subEarthLon"][idx],
                data["subSolarLat"][idx],
                data["subSolarLon"][idx]
            )

    from datetime import datetime, timedelta
    t_dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M")
    stop_str = (t_dt + timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M")

    params = {
        "format": "json",
        "COMMAND": "'301'",
        "CENTER": "'500@399'",
        "EPHEM_TYPE": "'OBSERVER'",
        "START_TIME": f"'{time_str}'",
        "STOP_TIME": f"'{stop_str}'",
        "STEP_SIZE": "'1 h'",
        "QUANTITIES": "'14,15'",
        "ANG_FORMAT": "'DEG'",
        "CSV_FORMAT": "'YES'",
        "OBJ_DATA": "'NO'"
    }
    r = requests.get(HORIZONS_API, params=params, timeout=30)
    res = r.json().get("result", "")
    lines = res.split("$$SOE")[1].split("$$EOE")[0].strip().split("\n")
    parts = [p.strip() for p in lines[0].split(",") if p.strip()]
    ob_lon, ob_lat = float(parts[1]), float(parts[2])
    sl_lon, sl_lat = float(parts[3]), float(parts[4])

    if ob_lon > 180.0:
        ob_lon -= 360.0
    if sl_lon > 180.0:
        sl_lon -= 360.0

    return ob_lat, ob_lon, sl_lat, sl_lon

def query_horizons_topocentric(target_cmd, site_lat, site_lon, time_str):
    """Queries Horizons topocentric azimuth and elevation from lunar surface coordinates."""
    from datetime import datetime, timedelta
    t_dt = datetime.strptime(time_str, "%Y-%m-%d %H:%M")
    stop_str = (t_dt + timedelta(minutes=5)).strftime("%Y-%m-%d %H:%M")

    params = {
        "format": "json",
        "COMMAND": f"'{target_cmd}'",
        "CENTER": "'coord@301'",
        "COORD_TYPE": "'GEODETIC'",
        "SITE_COORD": f"'{site_lon},{site_lat},0'",
        "EPHEM_TYPE": "'OBSERVER'",
        "START_TIME": f"'{time_str}'",
        "STOP_TIME": f"'{stop_str}'",
        "STEP_SIZE": "'1 h'",
        "QUANTITIES": "'4'",
        "ANG_FORMAT": "'DEG'",
        "CSV_FORMAT": "'YES'",
        "OBJ_DATA": "'NO'"
    }
    r = requests.get(HORIZONS_API, params=params, timeout=30)
    res = r.json().get("result", "")
    lines = res.split("$$SOE")[1].split("$$EOE")[0].strip().split("\n")
    parts = [p.strip() for p in lines[0].split(",") if p.strip()]
    # parts: [datetime, code, az, el] or [datetime, az, el]
    nums = [float(p) for p in parts if p.replace(".", "", 1).replace("-", "", 1).isdigit()]
    if len(nums) < 2:
        raise ValueError(f"Could not parse topocentric az/el from: {parts}")
    h_az, h_el = nums[0], nums[1]
    return h_az, h_el

def diff_angle_deg(a, b):
    """Angular difference in degrees modulo 360."""
    diff = abs((a - b + 180.0) % 360.0 - 180.0)
    return diff

def main():
    test_sites = [
        {"name": "Apollo 11 (Equatorial)", "lat": 0.67408, "lon": 23.47297},
        {"name": "Malapert Massif (South Polar)", "lat": -86.0, "lon": 0.1}
    ]

    test_times = [
        "2027-03-12 12:00",
        "2027-06-21 00:00",
        "2027-12-15 18:00"
    ]

    print("==========================================================================================")
    print("HORIZONS TOPOCENTRIC VERIFICATION SUITE")
    print("Comparing analytical geometry.js formulas vs NASA/JPL Horizons topocentric observer output")
    print("==========================================================================================\n")

    all_passed = True
    results = []

    for site in test_sites:
        print(f"Site: {site['name']} (lat: {site['lat']}, lon: {site['lon']})")
        print("-" * 90)
        print(f"{'Time':<18} | {'Target':<6} | {'Calc (El, Az)':<18} | {'Horizons (El, Az)':<20} | {'ΔEl (deg)':<9} | {'ΔAz (deg)':<9} | Status")
        print("-" * 90)

        for t_str in test_times:
            ob_lat, ob_lon, sl_lat, sl_lon = query_horizons_subpoints(t_str)

            # Test Sun (COMMAND='10')
            calc_sun_el, calc_sun_az = calculate_el_az(site["lat"], site["lon"], sl_lat, sl_lon)
            h_sun_az, h_sun_el = query_horizons_topocentric("10", site["lat"], site["lon"], t_str)
            d_sun_el = abs(calc_sun_el - h_sun_el)
            d_sun_az = diff_angle_deg(calc_sun_az, h_sun_az)
            sun_pass = d_sun_el <= 0.3 and d_sun_az <= 0.5
            if not sun_pass:
                all_passed = False

            results.append({
                "site": site["name"], "time": t_str, "target": "Sun",
                "calc_el": calc_sun_el, "calc_az": calc_sun_az,
                "h_el": h_sun_el, "h_az": h_sun_az,
                "d_el": d_sun_el, "d_az": d_sun_az, "pass": sun_pass
            })

            print(f"{t_str:<18} | Sun    | {calc_sun_el:6.2f}°, {calc_sun_az:6.2f}° | {h_sun_el:6.2f}°, {h_sun_az:6.2f}°   | {d_sun_el:7.3f}° | {d_sun_az:7.3f}° | {'PASS' if sun_pass else 'FAIL'}")

            # Test Earth (COMMAND='399')
            calc_earth_el, calc_earth_az = calculate_el_az(site["lat"], site["lon"], ob_lat, ob_lon)
            h_earth_az, h_earth_el = query_horizons_topocentric("399", site["lat"], site["lon"], t_str)
            d_earth_el = abs(calc_earth_el - h_earth_el)
            d_earth_az = diff_angle_deg(calc_earth_az, h_earth_az)
            earth_pass = d_earth_el <= 0.6 and d_earth_az <= 0.5
            if not earth_pass:
                all_passed = False

            results.append({
                "site": site["name"], "time": t_str, "target": "Earth",
                "calc_el": calc_earth_el, "calc_az": calc_earth_az,
                "h_el": h_earth_el, "h_az": h_earth_az,
                "d_el": d_earth_el, "d_az": d_earth_az, "pass": earth_pass
            })

            print(f"{t_str:<18} | Earth  | {calc_earth_el:6.2f}°, {calc_earth_az:6.2f}° | {h_earth_el:6.2f}°, {h_earth_az:6.2f}°   | {d_earth_el:7.3f}° | {d_earth_az:7.3f}° | {'PASS' if earth_pass else 'FAIL'}")

        print()

    print("==========================================================================================")
    max_sun_d_el = max(r["d_el"] for r in results if r["target"] == "Sun")
    max_sun_d_az = max(r["d_az"] for r in results if r["target"] == "Sun")
    max_earth_d_el = max(r["d_el"] for r in results if r["target"] == "Earth")
    max_earth_d_az = max(r["d_az"] for r in results if r["target"] == "Earth")

    print(f"Summary:")
    print(f"  Max Sun   ΔEl: {max_sun_d_el:.4f}° (tolerance: 0.3000°)")
    print(f"  Max Sun   ΔAz: {max_sun_d_az:.4f}° (tolerance: 0.5000°)")
    print(f"  Max Earth ΔEl: {max_earth_d_el:.4f}° (tolerance: 0.6000° - geocenter parallax up to 0.26°)")
    print(f"  Max Earth ΔAz: {max_earth_d_az:.4f}° (tolerance: 0.5000°)")

    if all_passed:
        print("\nOVERALL VERIFICATION: PASS")
        sys.exit(0)
    else:
        print("\nOVERALL VERIFICATION: FAIL")
        sys.exit(1)

if __name__ == "__main__":
    main()
