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
- `src/lib/config.js`: Central configuration constants (`SUN_UP_DEG = -0.27`, `EARTH_UP_DEG = 0.0`, default mission/transit durations, and `VERDICT` viability thresholds).
- `src/lib/metrics.js`: Metrics suite (`computeWindowStats`, `getVerdict`, `shadowLength`, `timeToNext`, `landingDate`).
- `src/lib/energy.js`: Battery and solar PV simulator (`simulateBattery`, `getPanelFactor`) supporting horizontal, vertical-fixed, and vertical-tracking panels, plus night heater survival loads.
- `src/lib/dataLoader.js`: Cached promise loader for `sites.json` and `global_ephem.json` with schema validation.
- `src/lib/useTimeController.js`: Continuous animation loop controller driven by `requestAnimationFrame`, with loop reset and tab visibility auto-pause.
- `src/lib/calendarData.js`: Memoized full-year landing window matrix calculator with top 3 window rankings.
- `src/lib/captions.js`: Educational plain-language insight generator for Explorer mode.
- `src/components/ui/SitePicker.jsx`: Preset selector & arbitrary custom coordinate validator.
- `src/components/ui/DateControls.jsx`: Launch date picker, transit duration slider, and launch slip slider.
- `src/components/ui/Timeline.jsx`: Recharts elevation profile with night shading and interactive cursor seeking.
- `src/components/ui/VerdictBadge.jsx`: Viability badge with expandable evaluation criteria.
- `src/components/ui/MetricsPanel.jsx`: Live angles, shadow lengths, cumulative statistics, and A vs B variance column.
- `src/components/ui/ScenePanel.jsx`: Container integrating Pavan's 3D Scene under lazy-loaded suspense.
- `src/components/ui/Compare.jsx`: Dual-scenario side-by-side comparison screen.
- `src/components/ui/BestWindows.jsx`: Top 3 recommended landing opportunities for candidate sites.
- `src/components/ui/Calendar.jsx`: Interactive heatmap matrix across 2027-2028 with quick staging into Scenario A/B.
- `src/components/ui/BatteryPanel.jsx`: Energy balance simulator with hardware presets and Recharts charge profiles.
- `src/components/ui/Glossary.jsx`: Lunar astronomy terminology modal.
- `src/components/ui/ExplorerCaptions.jsx`: Educational overview cards for students and general public.
- `src/components/ui/AssumptionsPanel.jsx`: Formal scientific assumptions and simplifications disclosure.
- `src/components/ui/TopBar.jsx`, `SampleDataBanner.jsx`, `ErrorState.jsx`, `Footer.jsx`: App chrome and layout.
- `src/App.jsx`: Master application state coordinator with responsive layout and mode persistence.

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
- `loadAllData()`: loads `sites.json` and `global_ephem.json`.
- `sampleSeries(site, startHours, durationHours, ephem)`: generates continuous angles.
- `valuesAt(series, tRel)`: evaluates angles with correct azimuth circular wrap.
- `computeWindowStats(series)`: produces window totals, dark runs, and Earth LOS coverage.
- `getVerdict(stats)`: returns viability level (`viable`, `risky`, `not-viable`) and reasons.
- `simulateBattery(series, params)`: simulates battery Wh state of charge and depletion hour.
- `buildCalendar(sites, ephem, options)`: precomputes full-year matrix for heatmap.

## Verification results
- All 31 unit tests pass (`npx vitest run`).
- Full production bundle builds cleanly in ~800ms (`npm run build`).
- `python scripts/validate_data.py` PASS on both sites and real ephemeris.
- `python scripts/verify_against_horizons.py` PASS against topocentric Horizons coordinates across equatorial and south polar sites.

## Decisions
- Used 2-hour sampling steps in `calendarData.js` to render the 120-date matrix in <50ms without blocking the UI thread.
- Kept dual-scenario comparison clocks aligned to `tRel` (hours since landing) so trade studies compare equivalent mission phases.
- Wrapped `localStorage` access in `try/catch` to support private/sandboxed browser environments.

## Known issues
- None; entire track R-01 through R-15 is 100% complete and verified.

## Requests to the other member / human
- None at this time.
