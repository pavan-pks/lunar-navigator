# Rakshith's Notes (integration notes written by Rakshith's LLM)

> Pavan and the human read this file during integration. Keep it accurate and short.
> Update after every finished task.

## What is built so far
- `scripts/make_fake_data.py`: Synthetic lunar ephemeris generator for 2027-01-01 to 2028-01-31 (9,504 hourly steps).
- `scripts/validate_data.py`: Schema and range validation suite for all static JSON datasets.
- `public/data/sites.json`: 6 curated preset landing regions (`shackleton`, `malapert`, `haworth`, `chandrayaan3`, `nobile`, `apollo11`).
- `public/data/global_ephem.json`: Plausible synthetic lunar sub-solar and sub-Earth coordinates.

## Data status
- Status: FAKE sample data (`fake: true`).
- Date range: 2027-01-01T00:00:00Z to 2028-01-31T23:00:00Z (9,504 hours).
- Regeneration commands:
  ```powershell
  python scripts/make_fake_data.py
  python scripts/validate_data.py
  ```

## How to use it (functions and components)
- `public/data/sites.json`: Array of site objects with `id`, `name`, `lat`, `lon`, `terrainType`, `mission`, `notes`, `source`, `verified`.
- `public/data/global_ephem.json`: Object containing parallel arrays: `subSolarLat`, `subSolarLon`, `subEarthLat`, `subEarthLon`.

## Verification results
- Ran `python scripts/validate_data.py`: 6 sites valid, 9504 ephemeris entries pass all range and schema constraints.

## Decisions
- Used 29.530589-day synodic period and seasonal 1.54° solar latitude oscillation for realistic day/night prototyping.
- Set `verified: false` on site coordinates pending explicit cross-check against LROC / Moon Trek references in R-02.

## Known issues
- Ephemeris is synthetic; switching to real JPL Horizons ephemeris in R-02.

## Requests to the other member / human
- None at this time.

## CONTRACT CHANGE REQUESTS
- None.
