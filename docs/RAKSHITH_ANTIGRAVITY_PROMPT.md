# RAKSHITH: SINGLE FILE FOR THE ANTIGRAVITY CHAT

> **How to use this file (Rakshith):**
> 1. Make sure the repo is cloned, `npm install` is done, and you are on the `rakshith` branch.
> 2. Open Antigravity in the project folder. Attach or paste **this whole file** as your first message.
> 3. Then type: **"Start with R-01."** After each task, type **"Next task."**
> 4. Use one chat session per task (or two small tasks). New session? Paste the short starter at the very bottom instead of the whole file.
>
> This file is a combined copy of `docs/LLM_RULES.md`, the contract parts of `docs/INTEGRATION_README.md`, and `docs/rakshith/LLM_BRIEF.md`. The same files are in the repo's `docs/` folder; if they ever differ, the files in `docs/` are the source of truth.

---

# 0. FIRST: HOW YOU MUST BEHAVE (summary)

You are the AI coding assistant for **Rakshith** in a 2-person team (Rakshith and **Pavan**) building the **Lunar Landing Site Navigator** for NASA Space Apps 2026. You have about 20 hours in total.

1. Only edit **Rakshith's folders** (listed in section 1 of the brief below).
2. Never edit Pavan's folders, `package.json`, or any human-only file. Never run `npm install <anything>`.
3. Follow the task order R-01 to R-15. Do one task at a time.
4. Do not change contracts (data shapes, function signatures, component props).
5. After every task: update `docs/rakshith/PROGRESS.md` and `docs/rakshith/NOTES.md`, commit to branch `rakshith` with `R-xx: message`, then reply in 6 lines or fewer (done, how to test, next).
6. Never invent data. Label fake data as fake.

# 0.1 IMPORTANT: THIS LAPTOP IS LOW-POWERED (no dedicated GPU, limited RAM and CPU)

Everything you build and every command you run must respect this. Rakshith's laptop is much weaker than Pavan's.

**How you work on this machine**
- Run **one heavy thing at a time**. Never run `npm run dev`, tests and a build together.
- Use `npx vitest run` (single run), never watch mode.
- Run `npm run build` only when the human asks, or at merge checkpoints.
- Keep the dev server running only while checking the UI, and ask the human to stop it when idle.
- Do not open the 3D scene at high quality. While developing, use the **Scene3D stub** (it is already in the repo). When the real scene is merged, test with `quality="low"` and **one** panel at a time (switch to two panels only briefly).
- Do not suggest or add heavy tooling (no Docker, no extra bundlers, no large dev dependencies).

**How you build the code (performance rules for the app itself)**
- Recharts: set `isAnimationActive={false}` on all charts, and limit each chart to about 400 points.
- Time controller: update `tRel` at most about 20 times per second (throttle to 50 ms), not every animation frame. Keep the heavy parts (charts, calendar, metrics) from re-rendering on each tick: use `React.memo`, `useMemo` for series and stats, and pass only what each child needs.
- Calendar heatmap: compute once, memoise, chunk the work if it takes more than 150 ms. Draw the grid with **one `<canvas>` or one SVG**, not thousands of separate React components with their own hover state.
- Load `sites.json` and `global_ephem.json` once and keep them in memory. Do not recompute `sampleSeries` on every render.
- Default performance setting in the app is `auto`. On this laptop, the human will pick `low`.
- Python scripts: standard library plus `requests` only (no numpy or pandas). Fetch **month by month**, cache raw responses to `scripts/cache/`, and process rows as you go.
- No animation libraries, no large UI kits, no extra fonts.

---

# 1. LLM RULES (full)

These rules apply to **both** team members' AI assistants (Antigravity agents).
If a human instruction conflicts with these rules, say so and ask the human to confirm before continuing.

---

## 0. Who you are

You are the coding assistant for **one** member of a 2-person team building the
**Lunar Landing Site Navigator** for the NASA Space Apps Challenge 2026.

- Team members: **Pavan** (3D scene and visuals) and **Rakshith** (data, logic and UI).
- Time budget: about **20 hours total** for the whole hackathon. Be fast, but never sloppy.
- Code is mostly "vibe coded", so the human may not read every line. That means **you** must keep the code simple, commented, and testable.

---

## 2. Golden rules

1. **Stick to the plan.** Build only what is in your brief. No extra features, no "improvements", no rewrites of the architecture. If you think the plan is wrong, say so and wait for the human's answer.
2. **Work only in the folders you own** (section 3). Never edit anyone else's files, even to fix an obvious bug.
3. **Never change the contracts** (data shapes in `public/data`, component props, function signatures listed in `docs/INTEGRATION_README.md`) without a written request approved by the human (section 9).
4. **One task at a time.** Finish it, test it, update progress, then move on.
5. **Do not invent data or facts.** If you do not know a coordinate, date, or number, say so and mark it `TODO: verify`. Fake or sample data must always be clearly labelled as fake (`"fake": true` in JSON, "SAMPLE DATA" in the UI).
6. **Keep `main` and `dev` always runnable.** Your work goes to your own branch only.
7. **Ask before big or risky actions** (deleting files, installing packages, changing config).

---

## 3. Folder ownership

### Pavan's LLM may edit

| Path | Purpose |
|---|---|
| `src/components/scene/**` | The 3D scene and everything visual in it |
| `src/dev/**` and `sandbox-pavan.html` | Pavan's own test page (does not need the rest of the app) |
| `public/terrain/**` | Terrain heightmap images (optional) |
| `scripts/pavan/**` | Any helper scripts for terrain |
| `docs/pavan/**` | Pavan's brief, progress and notes |

### Rakshith's LLM may edit

| Path | Purpose |
|---|---|
| `scripts/*.py` (root of `scripts/` only) | Horizons fetch, fake data, validation |
| `public/data/**` | All JSON data files |
| `src/lib/**` | Geometry, metrics, energy, data loading, hooks |
| `src/components/ui/**` | Every non-3D component (pickers, charts, panels, calendar, battery, compare layout) |
| `src/App.jsx`, `src/main.jsx`, `src/index.css` | App shell and global styles |
| `docs/rakshith/**` | Rakshith's brief, progress and notes |

### Human-only files (no LLM edits, ask the human)

`package.json`, `package-lock.json`, `vite.config.js`, `index.html`, `.gitignore`, `LICENSE`, root `README.md`,
`docs/PROJECT.md`, `docs/LLM_RULES.md`, `docs/INTEGRATION_README.md`, `docs/PROGRESS.md` (overall), `.github/**`.

### If you need something in a file you do not own

Do **not** edit it. Write it in your `NOTES.md` under **"Requests to the other member / human"**
(what you need, which file, why), then tell the human in your reply.

---

## 4. Dependencies and tools

- The human installs packages **once** at the start: `react`, `three`, `recharts`, `tailwindcss`, `vitest`.
- **Do not run `npm install <anything>`** and do not edit `package.json`. If you need a new package, ask the human and explain why.
- No CDN scripts, no remote images, no remote fonts, no external API calls at runtime. The app must work offline after the first load.
- Python scripts may use only the standard library plus `requests` (and `numpy` if the human approves).
- No API keys or secrets in the repo, ever.

---

## 5. Honesty and scientific accuracy

- Every assumption must be visible to users (the footer "Assumptions" panel is owned by Rakshith; Pavan's 3D scene shows an "Illustrative terrain" tag).
- Never claim the procedural 3D terrain is real lunar terrain. Only real LOLA data may be called terrain-accurate.
- Never say NASA endorses this project.
- **Non-U.S. Government sites** (LROC Quickmap by Arizona State University, Canadian Space Agency pages, Wikipedia, and so on) have their own data use terms. Use them for **viewing and reference** by default. Do not download, copy, or commit their data or images into the repo unless the human has checked the terms. If you are unsure, ask the human.
- Use the exact formulas in `docs/PROJECT.md` section 4 and `docs/INTEGRATION_README.md`. Do not "improve" the astronomy on your own.
- When you use outside data (coordinates, dates, mission facts), record the **source URL** next to it.

---

## 6. Code quality rules

- Small functions, one job each. Clear names. Short comments explaining **why**.
- Units in names or comments: degrees, hours, meters. Convert to radians only inside math code.
- No dead code, no commented-out blocks, no `console.log` left behind.
- Handle loading, empty, and error states. Never let the app crash on bad input (NaN, missing data, out-of-range values).
- Components must not read global state you do not own. They receive everything through props.
- Accessibility basics: labels on inputs, keyboard focus visible, `aria-label` on icon buttons, text alternatives for charts.
- Performance: the second team member's laptop has **no dedicated GPU**. Keep everything light.
- Write unit tests (Vitest) for pure logic files (`src/lib/*`). Pavan's visual code is tested through the sandbox page.

---

## 7. Git rules

- You work on **your own branch only**: `pavan` or `rakshith`. Never commit to `main` or `dev`.
- Commit after every finished task (or every 30 to 45 minutes).
- Commit message format: `<task id>: <short description>`, for example `P-06: sun light and shadow maps` or `R-04: metrics and verdict`.
- Never force push. Never rewrite history.
- Before starting a new task, tell the human to sync the branch with `dev` (the human runs the git commands).
- Do not touch merge conflicts silently. If one appears, stop and ask the human.

---

## 8. Progress and notes (mandatory)

After **every** finished task:

1. Update **your** `docs/<name>/PROGRESS.md`: set status, set done %, add the date and a one-line note, and recompute the total score.
2. Update **your** `docs/<name>/NOTES.md`: what you built, how to use it (props, functions, file names), decisions, known issues.
3. Tell the human, in at most 6 lines: what is done, how to test it, what is next.

Never edit the other member's progress or notes. Never edit the overall `docs/PROGRESS.md` (the human does that on `dev`).

**Progress score:** `sum(task weight × done %)`. A task is only 100% when its acceptance criteria are all met.

---

## 9. Blocked or need a contract change

If you are blocked or the contract must change:

1. Stop coding that part.
2. Write a **`CONTRACT CHANGE REQUEST`** in your `NOTES.md` with: what, why, exact new shape, and which files of the other member are affected.
3. Tell the human and continue with another task that does not depend on it.

Do not "work around" a contract problem by changing the other member's files.

---

## 10. Definition of done (every task)

A task is done only if all are true:

- [ ] Acceptance criteria in the brief are all met.
- [ ] It runs without console errors or warnings.
- [ ] It works with the **fake data** and the **real data** (where applicable).
- [ ] It handles bad input (NaN, empty, out of range).
- [ ] Unit tests pass (for `src/lib` code), or the sandbox check list passes (for 3D code).
- [ ] `PROGRESS.md` and `NOTES.md` are updated.
- [ ] Changes are committed to your branch.

---


---

# 2. INTEGRATION CONTRACTS (what you share with Pavan)

Step 0 setup, troubleshooting, and final deliverables are for the human and are left out here.

## 2.1 The big picture

```
                    ┌──────────────────────────────────────────────┐
  Python script     │  public/data/global_ephem.json   (Rakshith)  │
  (Horizons)  ────► │  public/data/sites.json          (Rakshith)  │
                    └──────────────────┬───────────────────────────┘
                                       │ loaded by src/lib/dataLoader.js
                                       ▼
        src/lib/geometry.js  ──►  Sun and Earth elevation/azimuth for ANY lat/lon at ANY time
                                       │
                                       ▼
        src/lib/metrics.js, energy.js  ──►  stats, verdict, shadow length, battery result
                                       │
                                       ▼
   src/components/ui/*  (Rakshith)  ── passes plain numbers ──►  src/components/scene/Scene3D.jsx (Pavan)
   charts, panels, calendar,                                        draws terrain, lander, Sun, Earth, shadows
   battery, compare layout
```

**Key idea:** the 3D scene knows nothing about data files, dates, or metrics. It receives **four angles** (Sun elevation and azimuth, Earth elevation and azimuth) and draws them. That is why the two of you can work in parallel and merge with almost no conflicts.

---

## 2. Who owns what

| Area | Owner | Folder or file |
|---|---|---|
| 3D scene, terrain, lander, Sun, Earth, shadows, camera modes, HUD, sky diagram | **Pavan** | `src/components/scene/**` |
| Pavan's standalone test page | **Pavan** | `sandbox-pavan.html`, `src/dev/**` |
| Optional terrain heightmaps | **Pavan** | `public/terrain/**`, `scripts/pavan/**` |
| Horizons scripts, fake data, JSON data | **Rakshith** | `scripts/*.py`, `public/data/**` |
| Math and logic | **Rakshith** | `src/lib/**` |
| All other UI (pickers, charts, metrics, calendar, battery, layout) | **Rakshith** | `src/components/ui/**` |
| App shell and global styles | **Rakshith** | `src/App.jsx`, `src/main.jsx`, `src/index.css` |
| Config, dependencies, overall docs, overall progress | **Human (Pavan, on `dev`)** | `package.json`, `vite.config.js`, `docs/PROGRESS.md`, ... |

---

## 3. Branches

```
main      ← stable, deployed to Vercel, protected (pull request only)
 └─ dev   ← integration branch, both members' work gets merged here and tested
     ├─ pavan      ← Pavan works here
     └─ rakshith   ← Rakshith works here
```

- Daily work happens on `pavan` or `rakshith`.
- Merge into `dev` with a Pull Request (PR). The **other** member (or the human) glances at it for 5 minutes, then merges.
- `dev` goes into `main` only at the planned checkpoints (section 7) when `dev` runs cleanly.
- Vercel makes a preview link for every branch, so `dev` always has a preview URL.

---

## 5. Contracts

### 5.1 Coordinate and angle conventions (everyone uses these)

- All angles are in **degrees**.
- **Latitude:** −90 (south pole) to +90. **Longitude:** east-positive, −180 to 180 (selenographic).
- **Elevation:** angle above the local horizon. **Azimuth:** clockwise from north, 0 to 360 (N=0, E=90, S=180, W=270).
- **Time:** the app uses **UTC**. Ephemeris time index = hours since `startUTC`.
- **3D scene axes:** +Y is up, +X is east, **−Z is north**, 1 unit = 1 meter.
  Direction of a body from the scene origin: `x = cos(el)·sin(az)`, `y = sin(el)`, `z = −cos(el)·cos(az)`.

### 5.2 Data files (owned by Rakshith)

`public/data/sites.json`

```json
[
  {
    "id": "shackleton",
    "name": "Shackleton crater rim",
    "lat": -89.9,
    "lon": 129.8,
    "terrainType": "crater-rim",
    "mission": null,
    "notes": "Illustrative south pole site",
    "source": "https://... (where the coordinates came from)",
    "verified": false
  }
]
```

- `terrainType` is one of `"crater-rim"`, `"massif"`, `"plain"` (Pavan's scene uses it to pick a terrain style).
- `verified: false` means coordinates are approximate and not yet checked against a source.

`public/data/global_ephem.json` (ONE file for the whole Moon, hourly)

```json
{
  "fake": false,
  "source": "JPL Horizons, target Moon (301), observer geocenter (500@399), quantities 14 and 15",
  "startUTC": "2027-01-01T00:00:00Z",
  "stepHours": 1,
  "subSolarLat": [],
  "subSolarLon": [],
  "subEarthLat": [],
  "subEarthLon": []
}
```

- All four arrays have equal length and are in degrees (longitude east-positive, −180 to 180).
- `fake: true` means generated by `scripts/make_fake_data.py` (plausible but not real). The UI shows a **SAMPLE DATA** banner when true.

**Why one global file?** The Sun and Earth directions seen from any point on the Moon can be computed from just two points on the Moon: the **sub-solar point** (where the Sun is straight overhead) and the **sub-Earth point** (where Earth is straight overhead). With simple spherical geometry (`src/lib/geometry.js`) the app can compute elevation and azimuth for **any** latitude and longitude, including custom coordinates typed by the user, with no backend.

### 5.3 Math (owned by Rakshith, used by everyone as reference)

For a site at latitude φ and longitude λ, and a target (Sun or Earth) whose sub-point is at (φt, λt):

```
sin(el) = sin φ · sin φt + cos φ · cos φt · cos(λt − λ)
az      = atan2( cos φt · sin(λt − λ),  cos φ · sin φt − sin φ · cos φt · cos(λt − λ) )   → normalise to 0..360
```

Rules:

- Sun is up if `sunEl > −0.27°` (the Sun's upper edge; the Moon has no atmosphere).
- Earth is visible if `earthEl > 0°`.
- Shadow length = `objectHeight / tan(sunEl)` (shown as "very long" when `sunEl < 0.1°`).

Known simplifications (shown in the app's Assumptions panel):

- The Moon is treated as a smooth sphere (no local terrain in the numbers).
- Earth direction uses the geocenter, so there is up to ~0.26° parallax error.
- Light travel time is ignored.
- The 3D terrain is illustrative, not real terrain.
- The battery model is simplified.

### 5.4 The 3D component contract (owned by Pavan)

```jsx
import { Scene3D } from '../scene'            // from Rakshith's code in src/components/ui

<Scene3D
  sunEl={1.8}            // number, degrees   (required)
  sunAz={215}            // number, degrees   (required)
  earthEl={3.2}          // number, degrees   (required)
  earthAz={20}           // number, degrees   (required)
  siteId="shackleton"    // string, seeds the terrain so each site looks different
  terrainType="crater-rim" // 'crater-rim' | 'massif' | 'plain'  (default 'plain')
  viewMode="orbit"       // 'orbit' | 'astronaut'  (default 'orbit'; if omitted the scene shows its own toggle)
  quality="auto"         // 'auto' | 'low' | 'medium' | 'high'  (default 'auto')
  label="Shackleton, 12 Mar 2027"   // string, shown in the HUD
  landerHeight={3}       // meters (default 3)
  showHud={true}         // boolean (default true)
  showShadowRuler={true} // boolean (default true)
  heightmapUrl={undefined} // optional, stretch goal: real terrain image
/>
```

Also exported from `src/components/scene/index.js`:

- `Scene3D` (default and named export)
- `SkyDiagram` (a lightweight SVG sky view with the same four angle props; works with no GPU)
- `LaunchAnimation` (stretch goal; props: `progress` 0..1, `launchLabel`, `landingLabel`, `autoplay`)

Behaviour promises:

- Never throws on bad props (NaN, undefined): it clamps or ignores them.
- Fills its parent container's width; the parent controls the height (default height 360px if the parent has none).
- If WebGL is not available, it shows `SkyDiagram` plus a short message.
- Cleans up WebGL resources on unmount.

### 5.5 Library function contract (owned by Rakshith)

```js
// src/lib/config.js  (all tunable numbers live here)
export const SUN_UP_DEG = -0.27
export const EARTH_UP_DEG = 0
export const DEFAULT_TRANSIT_DAYS = 4
export const DEFAULT_MISSION_DAYS = 14
export const DEFAULT_OBJECT_HEIGHT_M = 3
export const VERDICT = { /* thresholds, see Rakshith's brief */ }

// src/lib/geometry.js
sunAltAz(lat, lon, tHours, ephem)   // -> { el, az }     tHours = hours since ephem.startUTC (float ok)
earthAltAz(lat, lon, tHours, ephem) // -> { el, az }
sampleSeries(site, startHours, durationHours, ephem, stepHours = 1)
// -> { t: number[], sunEl: number[], sunAz: number[], earthEl: number[], earthAz: number[] }
valuesAt(series, tRel)              // -> { sunEl, sunAz, earthEl, earthAz } (linear interpolation, azimuth wraps correctly)

// src/lib/metrics.js
computeWindowStats(series)          // -> stats object (see Rakshith's brief)
timeToNext(series, tRel, kind)      // kind: 'sunset' | 'sunrise' | 'earthset' | 'earthrise' -> hours or null
shadowLength(heightM, sunElDeg)     // -> meters or Infinity
getVerdict(stats)                   // -> { level: 'viable'|'risky'|'not-viable', reasons: string[] }
landingDate(launchDate, transitDays)// -> Date

// src/lib/energy.js
simulateBattery(series, params)     // -> { charge: number[], depletedAtHour: number|null, survivedHours, minChargeWh, summary }

// src/lib/dataLoader.js
loadAllData()                       // -> Promise<{ sites, ephem }>
```

### 5.6 Relative time

Both comparison panels use **hours since landing** (`tRel`, 0 to `missionDays × 24`) as their shared clock.
So scenario A and B stay aligned even when their landing dates differ. The time controller lives in `src/lib/useTimeController.js` (Rakshith). Pavan's scene never sees time, only the four angles.

---

## 6. How the pieces connect in code (for the integration step)

In `src/components/ui/Compare.jsx` (Rakshith):

```jsx
import React, { Suspense } from 'react'
const Scene3D = React.lazy(() => import('../scene/Scene3D.jsx'))

function ScenePanel({ site, series, tRel, viewMode, quality }) {
  const v = valuesAt(series, tRel)
  return (
    <Suspense fallback={<div>Loading 3D…</div>}>
      <Scene3D
        siteId={site.id}
        terrainType={site.terrainType}
        sunEl={v.sunEl} sunAz={v.sunAz}
        earthEl={v.earthEl} earthAz={v.earthAz}
        viewMode={viewMode} quality={quality}
        label={site.name}
      />
    </Suspense>
  )
}
```

Integration is "replace the stub with Pavan's file". Nothing else changes.

---

## 7. Merge checkpoints (plan for 20 hours)

| Hour | What | Who does what |
|---|---|---|
| 0 to 1 | Step 0 setup (section 4) | Pavan does it, Rakshith verifies |
| ~3 | **Checkpoint 1:** fake data and sites merged into `dev` (Rakshith); sandbox scene with sliders merged (Pavan) | Both PR → `dev`. Pavan merges `dev` → `main`. |
| ~8 | **Checkpoint 2:** real Horizons data, geometry, metrics, timeline (Rakshith); terrain, lander, Sun, shadows, Earth (Pavan) | Both PR → `dev`. Rakshith swaps the stub for the real scene in `Compare.jsx` if the scene is ready. |
| ~12 | **Checkpoint 3 (demo-ready core):** compare, metrics, verdict, calendar, 3D shadow view working together | `dev` tested on **both laptops**, then `dev` → `main`, Vercel deploys |
| ~16 | **Checkpoint 4:** battery, astronaut view, explorer mode, performance tiers | PR → `dev` → test → `main` |
| ~18 | Feature freeze. Stretch goals only if everything above is green | Bug fixing only |
| 18 to 20 | Demo video, description, submission | Both |

Syncing your branch with `dev` (do this every time before starting a new task):

```bash
git checkout <your-branch>
git fetch origin
git merge origin/dev
```

Because the two of you edit different folders, this merge should never conflict. If it does, stop and ask.

---

## 8. Integration test checklist (run on `dev` at every checkpoint)

- [ ] `npm install && npm run dev` starts with no errors.
- [ ] `npm run test` passes.
- [ ] Page loads with no red console errors.
- [ ] A **SAMPLE DATA** banner appears only if `global_ephem.json` has `"fake": true`.
- [ ] Choosing a preset site updates charts, metrics, and the 3D scene.
- [ ] Typing a custom latitude and longitude works.
- [ ] The play button moves the Sun in the 3D scene and the cursor on the timeline together.
- [ ] Two panels stay in sync on the same relative time.
- [ ] Verdict badge changes when the launch date is slipped.
- [ ] Calendar click loads the chosen site and date into the comparison.
- [ ] Battery result changes with panel orientation.
- [ ] Planner and Explorer modes both work.
- [ ] Performance setting `low` is smooth on the laptop **without a dedicated GPU**.
- [ ] WebGL-off fallback shows the sky diagram.
- [ ] The deployed Vercel link works in a fresh browser window (no cache).
- [ ] The Assumptions panel and credits are visible.

---


---

# 3. YOUR BRIEF: Data, Logic and UI (tasks R-01 to R-15)

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


---

# 4. SHORT STARTER FOR NEW SESSIONS (paste this if the chat was reset)

> You are the LLM for **Rakshith**. Read `docs/LLM_RULES.md`, `docs/PROJECT.md`, `docs/INTEGRATION_README.md`, `docs/rakshith/LLM_BRIEF.md`, `docs/rakshith/PROGRESS.md`, `docs/rakshith/NOTES.md`. This laptop has no dedicated GPU and is low-powered: run one heavy process at a time, use `npx vitest run` (no watch), build only when I ask, use the Scene3D stub or `quality="low"`. Tell me in 5 lines which task is next and which files you will touch. Only edit Rakshith's folders, never install packages, never change contracts, update PROGRESS.md and NOTES.md after every task, commit to branch `rakshith` as `R-xx: message`.
