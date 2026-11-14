# RAKSHITH'S LLM BRIEF: Data, Logic and UI

> You are the LLM for **Rakshith**. First read `docs/LLM_RULES.md`, `docs/PROJECT.md`, `docs/INTEGRATION_README.md`.
> Your branch: `rakshith`. Your commit prefix: `R-xx:`.
> Progress file: `docs/rakshith/PROGRESS.md`. Notes file: `docs/rakshith/NOTES.md`.

---

## 1. Your mission

Build everything except the 3D scene:

1. **Data:** fetch the Moon's Sun and Earth geometry from NASA/JPL Horizons and store it as static JSON.
2. **Logic:** compute Sun and Earth elevation and azimuth for any lunar site at any time, then metrics, a viability verdict, shadow length, and a battery simulation.
3. **UI:** site and date pickers, launch-slip slider, timelines, metrics panel, comparison layout, a mission window calendar heatmap, battery simulator, Planner and Explorer modes, assumptions panel.

The 3D scene (`Scene3D`) is built by Pavan. You use it through the props contract in `docs/INTEGRATION_README.md` section 5.4. A **stub** already exists in `src/components/scene/Scene3D.jsx`, so you can build the whole Compare screen without waiting. Never edit that folder.

**Users:** mission planners (want dense numbers and fast comparison), and students and the public (want simple visuals and plain-language captions).

---

## 2. Files you own (and only these)

```
scripts/
  make_fake_data.py              ← day-0 sample data (plausible but fake)
  fetch_horizons.py              ← real data from Horizons
  verify_against_horizons.py     ← cross-check geometry against Horizons topocentric output
  validate_data.py               ← schema check for the JSON files
public/data/
  sites.json
  global_ephem.json              ← (fake first, real later; same shape)
  replays.json                   ← STRETCH
  global_ephem_2023.json         ← STRETCH (for the Chandrayaan-3 replay)
src/
  App.jsx  main.jsx  index.css
  lib/
    config.js  geometry.js  metrics.js  energy.js
    dataLoader.js  useTimeController.js  calendarData.js  captions.js  format.js
    *.test.js                    ← Vitest tests
  components/ui/
    TopBar.jsx  SitePicker.jsx  DateControls.jsx  TimeControls.jsx
    Timeline.jsx  MetricsPanel.jsx  VerdictBadge.jsx
    Compare.jsx  ScenePanel.jsx
    Calendar.jsx  BestWindows.jsx
    BatteryPanel.jsx
    ExplorerCaptions.jsx  Glossary.jsx
    AssumptionsPanel.jsx  Footer.jsx  SampleDataBanner.jsx  ErrorState.jsx
docs/rakshith/                   ← brief, progress, notes
```

**Do not touch:** `src/components/scene/**`, `src/dev/**`, `sandbox-pavan.html`, `public/terrain/**`, `scripts/pavan/**`, `docs/pavan/**`, `package.json`, `vite.config.js`, `index.html`.
If you need a change from Pavan's side (for example a new prop), write a request in your NOTES.md.

---

## 3. Contracts you must satisfy (do not change them)

Read `docs/INTEGRATION_README.md` sections 5.1 to 5.6. In short:

- Angles in degrees; longitude east-positive (−180 to 180); azimuth clockwise from north.
- `sites.json` and `global_ephem.json` shapes exactly as written there.
- Library function names and return shapes exactly as in section 5.5.
- Both comparison panels share one clock: **hours since landing (`tRel`)**.
- Pass `Scene3D` only these props: `sunEl, sunAz, earthEl, earthAz, siteId, terrainType, viewMode, quality, label, landerHeight, showHud, showShadowRuler`.

**Core math (use exactly; do not "improve"):**

```
sin(el) = sin φ · sin φt + cos φ · cos φt · cos(λt − λ)
az      = atan2( cos φt · sin(λt − λ),  cos φ · sin φt − sin φ · cos φt · cos(λt − λ) )  → 0..360
```
where (φ, λ) is the site and (φt, λt) is the sub-solar point (for the Sun) or the sub-Earth point (for Earth). Clamp site latitude to ±89.9999° to avoid an undefined azimuth at the exact pole.

Rules: Sun is up if `sunEl > −0.27°`; Earth is visible if `earthEl > 0°`; shadow length = `height / tan(sunEl)`.

---

## 4. Resources to use

| Need | Resource |
|---|---|
| Horizons API docs (verify every parameter here before using it) | https://ssd-api.jpl.nasa.gov/doc/horizons.html |
| Horizons web interface (manual cross-check) | https://ssd.jpl.nasa.gov/horizons/app.html |
| Horizons API endpoint | `https://ssd.jpl.nasa.gov/api/horizons.api` |
| Site coordinates and context | LROC Quickmap https://quickmap.lroc.asu.edu/ , NASA Moon Trek https://trek.nasa.gov/moon/ , NASA Artemis landing region pages |
| Mission facts (stretch) | ISRO / NASA mission pages for Chandrayaan-3 |
| Charts | Recharts https://recharts.org/ |
| Tests | Vitest https://vitest.dev/ |

Quickmap (ASU) and the CSA pages are non-U.S. Government sites: use them to look up or confirm coordinates, but do not copy their datasets into the repo (see `docs/LLM_RULES.md` section 5).

Always record the source URL of every coordinate in `sites.json` (`source` field) and set `verified` to `true` only when you have checked it.

---

## 5. Task list (do them in this order)

Weights add up to 100. Update `docs/rakshith/PROGRESS.md` after every task.

| ID | Task | Weight |
|---|---|---|
| R-01 | Fake data generator and `sites.json` | 5 |
| R-02 | Real Horizons fetch script and verification | 9 |
| R-03 | `geometry.js` (with tests) | 6 |
| R-04 | `config.js` and `metrics.js` (with tests) | 12 |
| R-05 | `energy.js` (with tests) | 5 |
| R-06 | App shell, data loader, time controller | 7 |
| R-07 | Site picker and custom coordinates | 4 |
| R-08 | Date controls and launch slip | 5 |
| R-09 | Timeline charts | 9 |
| R-10 | Metrics panel and verdict badge | 5 |
| R-11 | Compare layout (integrates `Scene3D`) | 9 |
| R-12 | Calendar heatmap and best windows | 9 |
| R-13 | Battery panel | 6 |
| R-14 | Planner and Explorer modes, captions, glossary | 5 |
| R-15 | Assumptions, footer, error states, polish | 4 |
| | **Total** | **100** |
| RS-1 | STRETCH: Mission replay (Chandrayaan-3) | |
| RS-2 | STRETCH: "Best alternative" suggester | |

---

### R-01: Fake data and sites.json (weight 5)

**Goal:** Pavan and you can work on day 0 with plausible data. Merge this into `dev` within the first 3 hours.

**How to build**
1. `scripts/make_fake_data.py` writes `public/data/global_ephem.json` with `"fake": true`, `startUTC "2027-01-01T00:00:00Z"`, `stepHours 1`, covering 2027-01-01 to 2028-01-31 (about 9,500 rows). Use plausible physics so the UI looks real:
   - synodic period = 29.530589 days (708.7 h)
   - `subSolarLon(t) = lon0 − 360·t/708.7` wrapped to −180..180 (the Sun moves westward over the surface)
   - `subSolarLat(t) = 1.54·sin(2π·t / (365.25·24))` (about ±1.5° seasonal)
   - `subEarthLon(t) = 6.5·sin(2π·t / (27.55·24))`, `subEarthLat(t) = 6.7·sin(2π·t / (27.21·24))` (libration)
   - round to 3 decimals
2. `public/data/sites.json` with **6 presets**. Suggested seeds (approximate: mark `verified: false` until you check a source and fill in `source`):

| id | name | approx lat | approx lon | terrainType |
|---|---|---|---|---|
| shackleton | Shackleton crater rim | −89.9 | 129.8 | crater-rim |
| malapert | Malapert massif | −86.0 | 0.1 | massif |
| haworth | Haworth crater region | −87.5 | −5 (verify) | crater-rim |
| chandrayaan3 | Chandrayaan-3 landing area | −69.37 | 32.32 | plain |
| nobile | Nobile region (south pole candidate) | −85.2 (verify) | 53 (verify) | crater-rim |
| apollo11 | Apollo 11 (equatorial contrast) | 0.674 | 23.473 | plain |

   Add a `mission` text where relevant. Keep the table's "verify" notes in `notes`.
3. `scripts/validate_data.py` checks shapes, equal array lengths, numeric ranges, and prints a clear PASS or FAIL.

**Acceptance:** both files exist, validate PASS, and `fake: true` is set. Tell the human so they can merge to `dev`.

---

### R-02: Real Horizons fetch and verification (weight 9)

**Goal:** replace the fake file with real NASA/JPL data (same shape, `fake: false`).

**How to build**
1. **First read the Horizons API docs** (link above) and confirm every parameter name. Do not trust this brief blindly if the docs differ; if they do, follow the docs and write the difference in NOTES.md.
2. `scripts/fetch_horizons.py` (uses `requests`; accepts `--start`, `--stop`, `--out`; default 2027-01-01 to 2028-01-31):
   - Endpoint `https://ssd.jpl.nasa.gov/api/horizons.api`, `format=json`.
   - Target `COMMAND='301'` (Moon), observer `CENTER='500@399'` (Earth geocenter), `EPHEM_TYPE='OBSERVER'`, `STEP_SIZE='1 h'`, `QUANTITIES='14,15'` (observer sub-longitude and sub-latitude = **sub-Earth point**; Sun sub-longitude and sub-latitude = **sub-solar point**; confirm the quantity numbers in the docs), `ANG_FORMAT='DEG'`, `CSV_FORMAT='YES'`, `OBJ_DATA='NO'`.
   - Fetch **month by month** to stay within limits; parse the rows between `$$SOE` and `$$EOE` in the `result` text; cache raw responses in `scripts/cache/` (git-ignored) so reruns are instant.
   - Normalise longitudes to −180..180 east-positive and round to 3 decimals.
   - Write `public/data/global_ephem.json` with `fake: false` and a `source` string.
   - Handle network errors with clear messages and retries. The script is run on the human's own machine (it needs internet).
3. `scripts/verify_against_horizons.py`: for 2 sites (one polar, one equatorial) and 3 times each, query Horizons **topocentric** for the Sun (`COMMAND='10'`) and Earth (`COMMAND='399'`) with `CENTER='coord@301'`, `COORD_TYPE='GEODETIC'`, `SITE_COORD='lon,lat,0'`, `QUANTITIES='4'` (azimuth and elevation), airless (`APPARENT='AIRLESS'`; confirm in docs). Compute the same values with the formulas above (a Python copy of `geometry.js`) and print a comparison table.

**Acceptance:** `validate_data.py` passes on the real file; verification shows Sun elevation within about 0.3° and Earth elevation within about 0.6° (the Earth gap comes from geocenter parallax, up to ~0.26°). If a longitude sign or frame convention is wrong, the verification will show it: fix it in the fetch script, not in `geometry.js`. Write the final differences in NOTES.md.

---

### R-03: geometry.js (weight 6)

**Functions** (signatures in `docs/INTEGRATION_README.md` section 5.5)
- `sunAltAz(lat, lon, tHours, ephem)` and `earthAltAz(...)`: interpolate the sub-point linearly between hourly samples. **Handle the longitude wrap at ±180°** (interpolate on the shortest arc).
- `sampleSeries(site, startHours, durationHours, ephem, stepHours = 1)` returns arrays `t` (hours since start, relative to `startHours`), `sunEl`, `sunAz`, `earthEl`, `earthAz`.
- `valuesAt(series, tRel)`: linear interpolation of elevations; **azimuth interpolation must wrap correctly** (359° to 1° goes through 0°).
- Helpers: `hoursSince(startUTC, date)`, `dateFromHours(startUTC, hours)`.
- Throw or return `null` for hours outside the ephemeris range, with a clear message; callers handle it.

**Tests (Vitest, `geometry.test.js`)**
- Site at the sub-solar point has `el ≈ 90°`; the antipode has `el ≈ −90°`.
- Equatorial site 90° east of the sub-solar point has `el ≈ 0°`.
- Azimuth wrap test (359.5° and 0.5° interpolate to about 0°).
- Longitude wrap test across ±180°.

**Acceptance:** tests pass; no NaN at the poles (`lat = −90`).

---

### R-04: config.js and metrics.js (weight 12)

**`config.js`:** every tunable number in one place.
```js
export const SUN_UP_DEG = -0.27
export const EARTH_UP_DEG = 0
export const DEFAULT_TRANSIT_DAYS = 4
export const DEFAULT_MISSION_DAYS = 14
export const DEFAULT_OBJECT_HEIGHT_M = 3
export const VERDICT = {
  viable:    { minSunlit: 0.75, maxDarkHours: 48,  minEarth: 0.50 },
  notViable: { maxSunlit: 0.40, minDarkHours: 120 },   // anything between is "risky"
}
```
Comment that these thresholds are **illustrative planning thresholds**, not NASA criteria (the Assumptions panel says so).

**`computeWindowStats(series)` returns**
```
{
  windowHours, sunlitHours, sunlitFraction,
  longestDarkHours, longestDarkStartT,
  meanSunEl (while sunlit), maxSunEl,
  earthVisibleHours, earthVisibleFraction, longestEarthGapHours,
  sunsetCount (number of times the Sun sets in the window)
}
```
**Other functions:** `timeToNext(series, tRel, kind)` (hours until the next sunset, sunrise, earthset, or earthrise; `null` if none in the window), `shadowLength(heightM, sunElDeg)` (`Infinity` if `sunEl ≤ 0`; return meters), `getVerdict(stats)` returns `{ level, reasons[] }` where reasons are human-readable, for example "Longest darkness 130 h is above the 120 h limit", `landingDate(launchDate, transitDays)`.

**Verdict logic:** `not-viable` if `sunlitFraction < 0.40` or `longestDarkHours > 120`; `viable` if `sunlitFraction ≥ 0.75` and `longestDarkHours ≤ 48` and `earthVisibleFraction ≥ 0.50`; otherwise `risky`.

**Tests (`metrics.test.js`)** on hand-made series: all sunlit; all dark; one 60 h dark gap; Earth visible half the time. Check every field and each verdict level.

**Acceptance:** tests pass; with the real or fake data, polar sites show different verdicts across dates while Apollo 11 shows a roughly 50% day/night pattern.

---

### R-05: energy.js (weight 5)

`simulateBattery(series, params)` with defaults:

```
params = {
  capacityWh: 1000, panelPeakW: 200, loadW: 60, nightHeaterW: 20,
  orientation: 'horizontal',   // 'horizontal' | 'vertical-fixed' | 'vertical-tracking'
  panelAz: 180,                // used only by 'vertical-fixed'
  startChargeFraction: 1.0
}
```
- Panel power factor from sun elevation `el` (only when `el > SUN_UP_DEG`; otherwise 0):
  - `horizontal`: `max(0, sin(el))`
  - `vertical-fixed`: `max(0, cos(el) · cos(sunAz − panelAz))`
  - `vertical-tracking`: `cos(el)` (assumes the panel rotates to face the Sun)
- Each hour: `charge += (panelPeakW · factor − loadW − (sunUp ? 0 : nightHeaterW)) · 1h`, clamped to `[0, capacityWh]`.
- Output: `charge[]`, `depletedAtHour` (first hour charge hits 0, or `null`), `survivedHours`, `minChargeWh`, and a `summary` string such as "Battery runs out after 11.2 days, before the Sun returns" or "Battery survives the whole 14-day window".
- Add a short comment explaining why vertical panels win near the poles (the Sun skims the horizon).

**Tests (`energy.test.js`):** constant daylight with generation above load stays full; constant darkness depletes at the expected hour; `horizontal` vs `vertical-tracking` at 2° elevation shows vertical generating far more.

---

### R-06: App shell, data loader, time controller (weight 7)

**How to build**
1. `dataLoader.js`: `loadAllData()` fetches `/data/sites.json` and `/data/global_ephem.json` (cached in memory), validates minimally, returns `{ sites, ephem }`. Errors become a clear `Error` shown by `ErrorState`.
2. `useTimeController.js`: `useTimeController({ maxHours })` returns `{ tRel, setTRel, playing, play, pause, toggle, speed, setSpeed }`, driven by `requestAnimationFrame`, default speed 12 hours per second, options 6, 12, 24, 48; loops at the end; pauses when the tab is hidden.
3. `App.jsx` holds the state:
   - `scenarioA` and `scenarioB`: `{ site (preset id or custom {name, lat, lon, terrainType:'plain', id:'custom-…'}), launchDate, transitDays }`
   - `compareMode`: `'sites'` (A and B can have different sites) or `'dates'` (same site, two launch dates)
   - `missionDays` (default 14), `viewMode`, `quality` (`'auto' | 'low' | 'medium' | 'high'`), `uiMode` (`'planner' | 'explorer'`), `objectHeightM`
   - one shared time controller (`tRel`)
4. Layout: `TopBar` (title, Planner/Explorer toggle, performance select, tab navigation: **Compare**, **Calendar**, **Battery**), the active tab, `Footer`.
5. `SampleDataBanner.jsx`: shows "SAMPLE DATA (not real NASA data)" when `ephem.fake` is true.
6. A tiny responsive style system with Tailwind classes; colour-blind-safe palette (use blue and orange for A and B, never red and green alone).

**Acceptance:** the app loads the fake data, shows the banner, switches tabs, and the time controller plays and pauses.

---

### R-07: Site picker and custom coordinates (weight 4)

- `SitePicker.jsx`: a dropdown of presets (name plus mission note) and a **Custom** option with latitude (−90 to 90) and longitude (−180 to 180) number inputs and an optional name.
- Validate inputs (empty, NaN, out of range show inline messages). A custom site gets `terrainType: 'plain'` and id `custom-<lat>-<lon>`.
- Show a gentle note when a custom latitude is above −60°: "South pole conditions are most dramatic below −80° latitude".
- Works through geometry (no extra data needed for custom coordinates).

**Acceptance:** a custom site such as −85.5, 20 produces charts and metrics; invalid input never crashes.

---

### R-08: Date controls and launch slip (weight 5)

- `DateControls.jsx`: launch date input (limited to the ephemeris range minus the transit and mission window), transit days (1 to 10, default 4), computed **landing date** (shown clearly), mission window days (1 to 30, default 14).
- **Slip slider:** −30 to +30 days relative to the planned launch. Show a live "delta" line comparing baseline and slipped: sunlit fraction, longest darkness, verdict (for example "Sunlit 82% → 41%, verdict Viable → Not viable").
- In `'dates'` mode, scenario B's launch date is controlled here (A = baseline, B = slipped).

**Acceptance:** slipping the launch changes the landing date, charts, metrics, and verdict immediately.

---

### R-09: Timeline charts (weight 9)

`Timeline.jsx` (Recharts), one per scenario:
- X axis: hours or days since landing. Y axis: Sun elevation in degrees. A reference line at 0° (horizon).
- A line for Sun elevation. **Shaded bands** for darkness (Sun down) and for Earth-visible windows (a second thin strip below the chart with Earth-visible segments).
- A vertical cursor at the current `tRel`; click or drag on the chart sets `tRel`.
- Tooltip with time (hours and date/time UTC), Sun el, Earth el.
- Accessibility: below each chart add a text summary ("Sun is up 82% of the window; longest night 31 hours starting day 6").
- Performance: at most about 400 points per chart.

**Acceptance:** the cursor moves with the play button; clicking sets the time; both charts are readable on a phone width.

---

### R-10: Metrics panel and verdict badge (weight 5)

`MetricsPanel.jsx`, `VerdictBadge.jsx`:
- Live: Sun el and az, Earth el and az, time to next sunset, time to next Earthset (from `tRel`).
- Window stats: sunlit hours and fraction, longest darkness and its start, mean and max Sun elevation, Earth-visible fraction, longest Earth gap.
- Shadow length for the chosen object height (input, default 3 m) as meters and as a multiple of the height.
- **Verdict badge** (Viable / Risky / Not viable, with icon and text, not colour alone) and a "Why?" list from `getVerdict().reasons`.
- When comparing, show a delta column (A vs B) with arrows and plain words ("B has 6 more dark hours").

---

### R-11: Compare layout (weight 9)

`Compare.jsx`, `ScenePanel.jsx`:
- Two columns on desktop, stacked on mobile. Each column: scenario header (site name, landing date, verdict badge), `Scene3D` (lazy loaded, see integration README section 6), `Timeline`, `MetricsPanel`.
- Above both columns: the shared `TimeControls` (play/pause, speed, slider over `0..missionDays·24`, current time display "Day 3, 14:00 since landing").
- Controls: compare mode toggle (**Two sites** | **Two dates**), view mode toggle (orbit | astronaut) and a performance select (auto, low, medium, high) which pass `viewMode` and `quality` down, **Swap A/B** button.
- A one-sentence auto summary: "Site A gets 82% sunlight, Site B only 41%, so B would need relay support and larger batteries".
- Until Pavan's real scene arrives, the stub is used. When the real scene is merged nothing changes in your code.
- Use `SkyDiagram` from `../scene` only if it exists (import it from `../scene/index.js`; it is part of the contract).

**Acceptance:** both panels move in sync; Scene3D receives correct angles (compare against the stub's printed values and the timeline); mode switching works.

---

### R-12: Calendar heatmap and best windows (weight 9)

`calendarData.js` and `Calendar.jsx`, `BestWindows.jsx`:
- `buildCalendar(sites, ephem, { startDate, days, missionDays })` returns for each site and each landing day: verdict level plus the key stats (`sunlitFraction`, `longestDarkHours`, `earthVisibleFraction`). Compute once, memoised; if it takes more than 150 ms, chunk it with `requestIdleCallback` or `setTimeout` and show a progress state.
- **Heatmap:** rows = sites (presets plus the current custom site), columns = landing dates across the ephemeris range. Colours: green (viable), amber (risky), red (not viable), but also **different cell patterns or letters** (V, R, N) for colour-blind users. Sticky row labels, horizontal scroll, a month header, and a legend.
- Hover: tooltip with site, date, verdict, key stats. Click: choose **Load into A** or **Load into B** (small popover) which sets the site and landing date (launch = landing − transit days) and switches to the Compare tab.
- **Best windows list** for the selected site: the top 3 landing dates (or contiguous runs) ranked by sunlit fraction, then lower longest-dark hours.
- Keyboard navigation of cells is a bonus, not required.

**Acceptance:** the heatmap renders fast; clicking a cell loads the exact scenario; the best-windows list matches visible green regions.

---

### R-13: Battery panel (weight 6)

`BatteryPanel.jsx`:
- Inputs (sliders with units): battery capacity (Wh), panel peak power (W), load (W), night heater (W), panel orientation (horizontal | vertical fixed | vertical sun-tracking), panel azimuth (for vertical fixed), start charge (%).
- A chart of battery charge over the window for scenario A and B (two lines), with darkness shading.
- Result sentences from `simulateBattery().summary` for A and B, with the "depleted on day X" moment marked on the chart.
- A short explainer: "Near the poles the Sun skims the horizon, so tilted or vertical panels collect far more than flat ones."
- Presets: "CubeSat-class", "Small lander", "Rover" (just parameter bundles; label them as examples).

**Acceptance:** changing orientation visibly changes the outcome; results match the unit-tested energy model.

---

### R-14: Planner and Explorer modes (weight 5)

- **Planner:** all numbers, thresholds visible, advanced settings.
- **Explorer:** large verdict, 3 to 5 plain-language captions from `captions.js` (for example "At this site the Sun stays only {x}° above the horizon, so shadows are {y} times longer than the objects that cast them", "Earth is in view {p}% of the time, so the lander can talk to home directly during that time", "The longest night lasts {d} days, long enough to freeze a lander without a heater"), and a **Glossary** with tooltips (elevation, azimuth, sunset, Earthset, libration, terminator). Hide technical controls (thresholds, orientation azimuth).
- The mode is remembered in `localStorage` wrapped in `try/catch`.

**Acceptance:** switching modes changes content immediately and nothing breaks; a student can understand the screen without space knowledge.

---

### R-15: Assumptions, footer, error states, polish (weight 4)

- `AssumptionsPanel.jsx` listing the simplifications: smooth-sphere horizon (no terrain in numbers), Earth direction uses the geocenter (up to ~0.26° error), light time ignored, 3D terrain is illustrative, planning thresholds are illustrative, the battery model is simplified, ephemeris range.
- `Footer.jsx`: credits (NASA/JPL Horizons; LRO/LOLA if used), "Not affiliated with or endorsed by NASA", MIT licence mention, GitHub link placeholder.
- `ErrorState.jsx` and loading skeletons for every async part.
- Responsive check at 360, 768, and 1280 px; keyboard focus order; `aria-label`s; no console errors; a `<title>`.

---

## 6. STRETCH goals (only when R-01 to R-15 are 100%)

### RS-1: Mission replay (Chandrayaan-3)
- Extend the fetch script to also write `global_ephem_2023.json` (Aug 2023) and make `dataLoader` choose the file by date.
- `replays.json` with the Chandrayaan-3 landing site and time (approx. 69.37° S, 32.32° E, 23 Aug 2023; **verify from an ISRO or NASA source and record the URL**).
- A "Replay" button that loads this scenario with a short factual text. Add one more replay only if the first is solid.

### RS-2: "Best alternative" suggester
Given scenario A, search ±30 days (same site) and all presets (same date) and show the top alternatives that move the verdict toward Viable, in one line each, with a "Load" button.

---

## 7. Testing your work

1. `npm run test` after every logic task.
2. `npm run dev`; check each tab with the fake data, then with the real data.
3. Compare 2 or 3 values by hand against the Horizons web interface (record in NOTES.md).
4. Check unusual input: custom coordinate at the exact pole, launch date at the range edge, mission days 1 and 30, empty inputs.
5. Run `npm run build` and report the result to the human (do not edit config files).
6. Use the integration checklist in `docs/INTEGRATION_README.md` section 8 before asking for a merge to `dev`.

---

## 8. Common pitfalls (read before coding)

- Longitude sign or 0..360 vs −180..180 confusion: verify with the topocentric check.
- Forgetting to wrap azimuth interpolation across 0°/360°.
- Interpolating longitudes across ±180° without the shortest-arc rule.
- Different clocks in A and B: always use `tRel` since each scenario's landing time.
- Using `localStorage` without `try/catch`.
- Running heavy loops on every render: memoise (`useMemo`) the series and stats per scenario.
- Editing the stub or anything in `src/components/scene/`: never. Use the props contract.
- Forgetting the **SAMPLE DATA** banner when `ephem.fake` is true.
- Claiming results are "NASA verdicts": they are **illustrative planning thresholds**.

---

## 9. After each task

1. Update `docs/rakshith/PROGRESS.md`.
2. Update `docs/rakshith/NOTES.md`.
3. Commit to `rakshith` with `R-xx: ...`.
4. Tell the human in 6 lines or fewer: done, how to test, next.
