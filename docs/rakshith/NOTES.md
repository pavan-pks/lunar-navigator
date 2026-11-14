# Rakshith's Notes (integration notes written by Rakshith's LLM)

> Pavan and the human read this file during integration. Keep it accurate and short.
> Update after every finished task.

## What is built so far
- `scripts/make_fake_data.py`: Synthetic lunar ephemeris generator for 2027-01-01 to 2028-01-31 (9,504 hourly steps).
- `scripts/fetch_horizons.py`: NASA/JPL Horizons fetcher for 2027-01-01 to 2028-01-31 (quantities 14, 15 from Moon/geocenter) chunked monthly with cache in `scripts/cache/`.
- `scripts/verify_against_horizons.py`: Cross-check test suite comparing analytical spherical geometry against topocentric Horizons queries (`CENTER='coord@301'`).
- `scripts/validate_data.py`: Schema and range validation suite for all static JSON datasets.
- `public/data/sites.json`: 6 curated preset landing regions (`shackleton`, `malapert`, `haworth`, `chandrayaan3`, `nobile`, `apollo11`).
- `public/data/global_ephem.json`: Real NASA/JPL Horizons lunar sub-solar and sub-Earth coordinates (`fake: false`, 9,504 hourly records).
- `src/lib/geometry.js`: Analytical spherical astronomy module (`sunAltAz`, `earthAltAz`, `sampleSeries`, `valuesAt`, `calculateElAz`).
- `src/lib/geometry.test.js`: Vitest test suite with 11 tests covering zenith, antipode, equator, polar stability, azimuth wrapping (359°->0°), and longitude wrapping (±180°).
- `src/lib/config.js`: Central configuration constants (`SUN_UP_DEG = -0.27`, `EARTH_UP_DEG = 0.0`, default mission/transit durations, and `VERDICT` viability thresholds).
- `src/lib/metrics.js`: Metrics suite (`computeWindowStats`, `getVerdict`, `shadowLength`, `timeToNext`, `landingDate`).
- `src/lib/metrics.test.js`: Vitest unit tests verifying 100% sunlit, 100% dark, 60h dark gap, 50% Earth visibility, shadow calculations, and next sunset/sunrise timings (all 8 tests pass).
- `src/lib/energy.js`: Battery and solar PV simulator (`simulateBattery`, `getPanelFactor`) supporting horizontal, vertical-fixed, and vertical-tracking panels, plus night heater survival loads.
- `src/lib/energy.test.js`: Vitest test suite verifying daylight generation, nocturnal depletion, polar grazing geometry (>28x vertical gain at 2°), and edge conditions (all 5 tests pass).
- `src/lib/dataLoader.js` & `dataLoader.test.js`: Cached promise loader for `sites.json` and `global_ephem.json` with schema validation.
- `src/lib/useTimeController.js`: Continuous animation loop controller driven by `requestAnimationFrame`, with loop reset and tab visibility auto-pause.
- `src/components/ui/TopBar.jsx`, `SampleDataBanner.jsx`, `ErrorState.jsx`, `Footer.jsx`: App shell chrome and controls.
- `src/App.jsx`: Master state manager, time scrubber bar, tab routing, and responsive layout.

## Data status
- Status: REAL NASA/JPL Horizons data (`fake: false`).
- Source: `NASA/JPL Horizons System (ephemeris type: OBSERVER, center: 500@399 geocenter, target: 301 Moon, quantities: 14, 15)`.
- Date range: 2027-01-01T00:00:00Z to 2028-01-31T23:00:00Z (9,504 hours).
- Regeneration commands:
  ```powershell
  python scripts/fetch_horizons.py
  python scripts/validate_data.py
  python scripts/verify_against_horizons.py
  ```

## How to use it (functions and components)
- `public/data/sites.json`: Array of site objects with `id`, `name`, `lat`, `lon`, `terrainType`, `mission`, `notes`, `source`, `verified`.
- `public/data/global_ephem.json`: Object containing parallel arrays: `subSolarLat`, `subSolarLon`, `subEarthLat`, `subEarthLon`.

## Verification results
- Ran `python scripts/validate_data.py`: 6 sites valid, 9504 ephemeris entries pass all range and schema constraints.
- Ran `python scripts/verify_against_horizons.py`:
  - Sun elevation error: max 0.0011° (threshold 0.3°)
  - Sun azimuth error: max 0.0006° (threshold 0.5°)
  - Earth elevation error: max 0.2729° (threshold 0.6° - due to geocenter parallax up to 0.26°)
  - Earth azimuth error: max 0.0054° (threshold 0.5°)
  - All 12 test assertions PASSED.

## Decisions
- Wrapped longitudes to `[-180, 180]` East positive.
- Rounded coordinates to 3 decimals (~30m precision on Moon surface).
- Saved cache files in `scripts/cache/` (ignored by git).

## Known issues
- None; real Horizons data is operational and verified.

## Requests to the other member / human
- None at this time.

## CONTRACT CHANGE REQUESTS
- None.
