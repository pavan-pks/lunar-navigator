# PAVAN: SINGLE FILE FOR THE ANTIGRAVITY CHAT

> **How to use this file (Pavan):**
> 1. Finish **Step 0** first (`STEP0_SETUP.md`): repo scaffolded, docs and the Scene3D stub committed, branches created.
> 2. `git checkout pavan`, open Antigravity in the project folder.
> 3. Attach or paste **this whole file** as your first message, then type: **"Start with P-01."** After each task, type **"Next task."**
> 4. One chat session per task (or two small ones). If a chat resets, paste the short starter at the very bottom.
>
> This is a combined copy of `docs/LLM_RULES.md`, the contract parts of `docs/INTEGRATION_README.md`, and `docs/pavan/LLM_BRIEF.md`. If they ever differ, the files in `docs/` are the source of truth.

---

# 0. FIRST: HOW YOU MUST BEHAVE (summary)

You are the AI coding assistant for **Pavan** in a 2-person team (Pavan and **Rakshith**) building the **Lunar Landing Site Navigator** for NASA Space Apps 2026. About 20 hours in total.

1. Only edit **Pavan's folders** (section 2 of the brief below): `src/components/scene/**`, `src/dev/**`, `sandbox-pavan.html`, `public/terrain/**`, `scripts/pavan/**`, `docs/pavan/**`.
2. Never edit Rakshith's folders, `package.json`, `vite.config.js`, `index.html`, or any human-only file. Never run `npm install <anything>`. The repo scaffold (Step 0) already exists: do not recreate it.
3. Follow the task order P-01 to P-13. One task at a time. Stretch goals only after P-13.
4. Do not change contracts (props of `Scene3D`, exports, conventions).
5. After every task: update `docs/pavan/PROGRESS.md` and `docs/pavan/NOTES.md`, commit to branch `pavan` as `P-xx: message`, then reply in 6 lines or fewer (done, how to test, next).
6. No external textures, models, CDNs, or remote assets. Everything procedural. Never claim the procedural terrain is real.

# 0.1 IMPORTANT: THE TEAMMATE'S LAPTOP IS WEAK

This developer's laptop has a dedicated GPU (RTX 3050), but **Rakshith's laptop has no dedicated GPU** and will run your scene during integration and the demo. So the scene must be light by design, even though it runs great here.

- **Render on demand**: no continuous render loop. Render only when props, camera, resize, or an animation changed.
- Build and tune for the **`low` tier first** (129×129 terrain, 1024 shadow map, pixel ratio 1, 40 rocks, no antialias), then add `medium` and `high`.
- **Test every task on `low`** as well as on `high`. Before calling P-11 done, test with the browser's CPU throttling (DevTools, Performance, CPU 4x slowdown) and report the frame time.
- Two `Scene3D` instances on one page must stay smooth on `low`.
- `quality="auto"` must start on `medium`, measure, and downgrade if under 24 fps (never upgrade automatically).
- Keep draw calls, texture sizes and geometry counts small. Dispose everything on unmount.
- If something looks great but costs a lot (for example a larger shadow map), make it `high` only.

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

# 2. INTEGRATION CONTRACTS (what you share with Rakshith)

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

# 3. YOUR BRIEF: 3D Scene and Visuals (tasks P-01 to P-13)

> You are the LLM for **Pavan**. First read `docs/LLM_RULES.md`, `docs/PROJECT.md`, `docs/INTEGRATION_README.md`.
> Your branch: `pavan`. Your commit prefix: `P-xx:`.
> Progress file: `docs/pavan/PROGRESS.md`. Notes file: `docs/pavan/NOTES.md`.

---

## 1. Your mission

Build the **3D visual part** of the Lunar Landing Site Navigator: a React component `Scene3D` that shows a lunar surface patch with a lander, a Sun that casts long shadows, and Earth hanging low in the sky, driven **only by four numbers**: Sun elevation, Sun azimuth, Earth elevation, Earth azimuth.

Why it matters: this is the "wow" part. When someone compares two landing sites, they will see shadows sweep across the ground and understand in seconds why the Moon's south pole is hard.

You do **not** do: data fetching, Horizons, metrics, charts, calendar, battery, date logic, app layout. Those are Rakshith's. You never need them to work: you build and test inside your own sandbox page.

---

## 2. Files you own (and only these)

```
sandbox-pavan.html                       ← your test page (open at /sandbox-pavan.html while `npm run dev`)
src/dev/pavan-main.jsx
src/dev/PavanSandbox.jsx
src/components/scene/
  index.js                               ← exports (keep the exports from the contract)
  Scene3D.jsx                            ← main component (replace the stub)
  terrain.js                             ← terrain height function + mesh builder
  lander.js                              ← lander model
  rocks.js                               ← rock scatter
  sky.js                                 ← stars, Sun disk, Earth marker, compass
  cameraModes.js                         ← orbit camera + astronaut camera
  quality.js                             ← quality tiers + auto downgrade
  noise.js                               ← small seeded noise (no libraries)
  Hud.jsx                                ← DOM overlay (labels, readouts, buttons)
  SkyDiagram.jsx                         ← lightweight SVG fallback / compact view
  ShadowRuler.js                         ← shadow length ruler
  LaunchAnimation.jsx                    ← STRETCH
public/terrain/                          ← STRETCH (heightmaps)
scripts/pavan/                           ← STRETCH helpers
docs/pavan/                              ← brief, progress, notes
```

**Do not touch:** anything in `src/lib/`, `src/components/ui/`, `src/App.jsx`, `src/main.jsx`, `src/index.css`, `public/data/`, `scripts/*.py`, `package.json`, `vite.config.js`, `index.html`.
Style your components with inline styles or a CSS file inside `src/components/scene/` (do not use global CSS).

---

## 3. Contract you must satisfy (do not change it)

```jsx
<Scene3D
  sunEl={number}  sunAz={number}  earthEl={number}  earthAz={number}   // degrees, required
  siteId="shackleton"            // string, seeds the terrain
  terrainType="crater-rim"       // 'crater-rim' | 'massif' | 'plain'  (default 'plain')
  viewMode="orbit"               // 'orbit' | 'astronaut' (default 'orbit'; if omitted, show your own toggle)
  quality="auto"                 // 'auto' | 'low' | 'medium' | 'high' (default 'auto')
  label="Shackleton, 12 Mar 2027"
  landerHeight={3}               // meters
  showHud={true}
  showShadowRuler={true}
  heightmapUrl={undefined}       // stretch
/>
```

Exports from `src/components/scene/index.js`: `Scene3D` (default and named), `SkyDiagram`, `LaunchAnimation` (stretch).

**Conventions (must match everyone):**

- Angles in degrees. Azimuth is **clockwise from north** (N=0, E=90, S=180, W=270).
- Scene axes: **+Y up, +X east, −Z north**, 1 unit = 1 meter.
- Direction toward a body: `x = cos(el)·sin(az)`, `y = sin(el)`, `z = −cos(el)·cos(az)`.
- Sun is "up" if `sunEl > −0.27°`. Earth is visible if `earthEl > 0°`.
- Shadow length = `landerHeight / tan(sunEl)` (cap the drawn ruler at 150 m).

**Behaviour promises:** never throw on bad props (NaN, undefined): clamp or ignore. Fill the parent's width. Default height 360px if the parent has none. Clean up WebGL on unmount. Render **on demand** (see P-11). If WebGL fails, show `SkyDiagram` plus a short message.

---

## 4. Resources to use

| Need | Resource |
|---|---|
| three.js API | https://threejs.org/docs/ |
| Shadow examples | https://threejs.org/examples/ (search "shadowmap", "directional light shadow") |
| Orbit controls | `import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'` |
| Look and feel reference | NASA Moon Trek https://trek.nasa.gov/moon/ and LROC Quickmap https://quickmap.lroc.asu.edu/ (just to see how the south pole looks) |
| LOLA terrain info (stretch) | https://pds-geosciences.wustl.edu/missions/lro/lola.htm (if the link moved, search "LRO LOLA PDS") |
| Real photos for realism (no asset use unless license is clear) | NASA Image and Video Library https://images.nasa.gov/ |

If the web tool is available, confirm three.js API details from the docs before using an API you are not sure about. Do not guess API names.
**No external textures or models.** Generate everything procedurally (code, canvas textures). That avoids licence problems and keeps the app offline-ready.

---

## 5. Task list (do them in this order)

Weights add up to 100. Update `docs/pavan/PROGRESS.md` after every task.

| ID | Task | Weight |
|---|---|---|
| P-01 | Sandbox harness | 5 |
| P-02 | Scene skeleton (renderer, camera, resize, cleanup) | 8 |
| P-03 | Terrain generator | 12 |
| P-04 | Lander model | 8 |
| P-05 | Rocks and scatter | 5 |
| P-06 | Sun light and shadows | 12 |
| P-07 | Sky: stars, Sun disk, Earth marker | 10 |
| P-08 | Orbit camera | 5 |
| P-09 | Astronaut camera | 10 |
| P-10 | HUD overlay and compass | 6 |
| P-11 | Quality tiers and performance (on-demand rendering) | 10 |
| P-12 | Hardening: error handling, WebGL fallback, SkyDiagram, notes | 6 |
| P-13 | Shadow ruler | 3 |
| | **Total** | **100** |
| PS-1 | STRETCH: LaunchAnimation (schematic) | |
| PS-2 | STRETCH: real LOLA heightmap loader | |
| PS-3 | STRETCH: cinematic camera path for the demo video | |

---

### P-01: Sandbox harness (weight 5)

**Goal:** a test page that works without any of Rakshith's code, so you can build and test alone.

**How to build**
1. Create `sandbox-pavan.html` in the project root with a `<div id="root">` and a module script that loads `/src/dev/pavan-main.jsx`.
2. `src/dev/pavan-main.jsx` renders `<PavanSandbox />`.
3. `PavanSandbox.jsx` renders a left control panel and a large `Scene3D`:
   - Sliders: Sun elevation (−10 to 30°, step 0.1), Sun azimuth (0 to 360°), Earth elevation (−10 to 20°), Earth azimuth (0 to 360°).
   - Dropdowns: site (`shackleton` crater-rim, `malapert` massif, `plain-test` plain, `apollo11` plain), view mode (orbit, astronaut), quality (auto, low, medium, high).
   - Checkboxes: show HUD, show shadow ruler.
   - Button "Simulate lunar day": animates the Sun azimuth through 360° in about 20 seconds with `sunEl = 1.5 + 1.2·sin(2·azimuthRadians)` (fake but plausible) and a slowly moving Earth.
   - A live FPS counter.
   - Two scenes side by side toggle ("compare test"), so you can test two WebGL contexts at once.
4. Open it at `http://localhost:5173/sandbox-pavan.html`.

**Acceptance:** the page opens, the sliders update the props passed to `Scene3D` (the stub is fine at first).

---

### P-02: Scene skeleton (weight 8)

**Goal:** a robust three.js setup inside a React component.

**How to build**
1. `Scene3D.jsx` uses a container `div` ref and one `useEffect` to create `WebGLRenderer`, `Scene`, `PerspectiveCamera`.
2. Renderer: `setPixelRatio(min(devicePixelRatio, tierMax))`, black background, `outputColorSpace = SRGBColorSpace`, `shadowMap.enabled = true`, `shadowMap.type = PCFShadowMap`.
3. Use a `ResizeObserver` on the container to resize the renderer and camera aspect.
4. Separate effects: (a) create the scene once; (b) a lightweight effect that updates the Sun, Earth, label, and so on when props change (never rebuild the scene for angle changes); (c) rebuild terrain only when `siteId`, `terrainType`, `heightmapUrl` or the quality tier change.
5. React StrictMode mounts twice in dev: your cleanup must dispose everything correctly (geometries, materials, textures, renderer, `forceContextLoss()`, listeners, observers, animation frames).
6. Expose an internal `invalidate()` that requests one render (used by P-11).

**Acceptance:** a black canvas with a test cube resizes with the window, has no console warnings in StrictMode, and leaves no leaked canvases after unmounting.

---

### P-03: Terrain generator (weight 12)

**Goal:** a believable, **illustrative** lunar surface patch (400 m × 400 m) that differs per site.

**How to build**
1. `noise.js`: a small seeded value-noise or simplex-like function plus fBm (2D), and a string-to-seed hash. No libraries.
2. `terrain.js`: `buildTerrain({ siteId, terrainType, resolution })` returns `{ mesh, heightAt(x, z) }`.
   - `PlaneGeometry(400, 400, res−1, res−1)`, rotate to horizontal, displace Y by `heightAt`.
   - `heightAt` = base shape + fBm roughness (about 1 to 1.5 m amplitude) + 15 to 40 small craterlets (bowl with a raised rim, seeded random positions and radii from 2 to 15 m).
   - **Base shapes:**
     - `crater-rim`: a large crater (radius about 500 m, centre offset so the origin sits on the rim ridge), floor sloping away on one side.
     - `massif`: a broad smooth hill with the origin near the top ridge, sloping down on both sides.
     - `plain`: nearly flat, craterlets only.
   - **Flat landing pad:** blend heights to a level pad of about 8 m radius around the origin so the lander sits level.
3. Material: `MeshStandardMaterial`, roughness 1, metalness 0. Add per-vertex colour variation (grey 0.35 to 0.6 by height and noise) so the relief is readable.
4. `computeVertexNormals()` after displacement. The mesh must `receiveShadow` and `castShadow`.
5. `heightAt(x, z)` must be callable outside the mesh (used by the lander, rocks, astronaut camera, ruler). Use bilinear lookup on the height grid.

**Acceptance:** each of the four sandbox sites looks different; the same `siteId` always looks the same (deterministic); a level pad exists at the origin; no seams or spikes; generation takes under 150 ms at 257×257.

---

### P-04: Lander model (weight 8)

**Goal:** a simple recognisable lander built from primitives.

**How to build** (`lander.js`, `buildLander(heightM)` returns a `Group` scaled so the total height equals `landerHeight`)
- Body: a box or octagonal prism; 4 legs (thin cylinders angled outward) with footpads (flat cylinders); a descent engine bell (cone) underneath; a solar panel (thin box, dark blue) on top or on the side; a small antenna (thin cylinder plus a disc dish).
- Materials: light grey with a bit of gold or silver for contrast; `castShadow = true`, `receiveShadow = true`.
- Position the lander at the origin with its feet on `heightAt(0, 0)`.
- The scale must update when `landerHeight` changes without rebuilding the terrain.

**Acceptance:** it looks like a lander from both orbit and astronaut cameras, sits on the pad, and its shadow is clearly visible.

---

### P-05: Rocks and scatter (weight 5)

**Goal:** objects that make shadows readable and give a sense of scale.

**How to build** (`rocks.js`)
- Use one `InstancedMesh` of a distorted icosahedron (noise-jittered vertices), 40 (low) to 250 (high) instances, random scale 0.2 to 2 m, seeded by `siteId`, kept off the landing pad (radius 10 m).
- Place each on `heightAt`, with a random rotation and slight sink into the ground.
- They must cast and receive shadows.
- Optionally add 3 to 5 bigger boulders (3 to 6 m) around 40 to 120 m away as shadow landmarks.

**Acceptance:** rocks cast visible shadows, no floating or buried rocks, and instance counts follow the quality tier.

---

### P-06: Sun light and shadows (weight 12)

**Goal:** physically sensible Moon lighting: one harsh Sun, almost black shadows.

**How to build**
1. A `DirectionalLight` at `target + dir · 500`, where `dir` is built from `sunEl`/`sunAz` (conventions in section 3), target at the origin.
2. Intensity: about 3 when the Sun is up (`sunEl > −0.27°`), **0 when it is down** (no twilight on the Moon; a very short fade of 0.1° is fine to avoid popping).
3. Ambient light very low (about 0.02) to mimic faint earthshine. Optionally a very faint bluish `HemisphereLight` only when Earth is above the horizon.
4. Shadow setup: `castShadow = true`, `shadow.mapSize` by tier (1024 / 2048), orthographic shadow camera `left/right/top/bottom = ±220`, `near = 1`, `far = 1300`, `bias ≈ −0.0005`, `normalBias ≈ 0.3` (tune to remove acne and peter-panning).
5. Because the Sun is often below 3° elevation, shadows are very long. Check that the shadow frustum still covers the terrain patch and nothing clips at low angles.
6. When props change, only update the light's position and intensity, then `invalidate()`.

**Acceptance (check in the sandbox):**
- Sun elevation 20° gives short shadows; 2° gives very long ones; 0.3° gives extremely long ones.
- Sun below −0.27° gives a pitch-dark scene (only faint ambient).
- Turning the azimuth rotates the shadows correctly (shadow points opposite the Sun).
- No shadow acne or visible banding at the default tier.

---

### P-07: Sky: stars, Sun disk, Earth marker (weight 10)

**Goal:** a sky that is visibly correct.

**How to build** (`sky.js`)
- **Stars:** `Points` with about 1500 random directions on a sphere of radius 900, `sizeAttenuation: false`, size 1.5. Dim (opacity about 0.35) while the Sun is up, full opacity at night. Always black sky, no atmosphere or gradient.
- **Sun disk:** emissive white sphere at distance 800 with radius `800·tan(0.265°) ≈ 3.7` (real angular size about 0.53°). Visible only when `sunEl > −0.27°`.
- **Earth marker:** sphere with angular diameter about 1.9° (radius `800·tan(0.95°) ≈ 13.3`) at distance 800, placed by `earthEl`/`earthAz`. Use a **procedural canvas texture** (blue ocean, green and brown blobs, white cloud noise; 256×128). `MeshBasicMaterial`. Hidden when `earthEl < 0`. A small text sprite "Earth" next to it.
- A thin horizon reference is not needed: the terrain is the horizon.
- Both bodies must update only on prop change (then `invalidate()`).

**Acceptance:** the Sun disk appears at the right azimuth and elevation (cross-check with the directional light); Earth appears only above the horizon; both look correctly small (Earth about 3.5× the Sun's width).

---

### P-08: Orbit camera (weight 5)

**How to build** (`cameraModes.js`)
- `PerspectiveCamera` fov 50, start at `(70, 40, 90)`, `OrbitControls` target `(0, 2, 0)`.
- Limits: `maxPolarAngle ≈ 1.45 rad` (stay above ground), `minDistance 10`, `maxDistance 300`, damping on high tiers only.
- Keep the camera above the terrain (`y ≥ heightAt(x, z) + 1`).
- OrbitControls `change` event calls `invalidate()`.

**Acceptance:** rotate, zoom and pan feel smooth; the camera never goes underground.

---

### P-09: Astronaut camera (weight 10)

**Goal:** a first-person view standing near the lander, showing the low Sun skimming the horizon and Earth hanging in the sky.

**How to build**
- Camera `fov 70`, position about 8 m from the lander (e.g. `(6, heightAt + 1.7, 10)`), eye height 1.7 m.
- Look control: drag (mouse and touch) changes yaw and pitch (pitch clamped to ±60°); arrow keys also work; no walking required.
- On entering this mode, the initial yaw faces the Sun (if the Sun is up), otherwise faces north.
- HUD buttons: **Look at Sun**, **Look at Earth**, **Look North** (smoothly turn the camera).
- Compass labels N, E, S, W as sprites on a ring of radius 190 m at height 3 m (north is −Z).

**Acceptance:** at `sunEl = 1.5°` the Sun is just above the horizon, shadows are long on the ground, and "Look at Earth" centres the Earth marker when it is above the horizon (otherwise show a message "Earth is below the horizon").

---

### P-10: HUD overlay and compass (weight 6)

**How to build** (`Hud.jsx`, a DOM overlay positioned over the canvas; `pointer-events: none` except buttons)
- Top-left: `label` text.
- Top-right: small tag **"Illustrative terrain"** (always visible; this is an honesty requirement).
- Bottom-left readout: Sun el/az, Earth el/az (1 decimal), shadow length for the lander (e.g. "Shadow: 86 m, 29× the lander's height", or "Sun below horizon").
- Bottom-right: view toggle (Orbit | Astronaut) when `viewMode` is not controlled by props.
- Good contrast, small font, no overlap on narrow containers (a width of 320 px must work).
- Hidden when `showHud={false}`.

**Acceptance:** all texts update live with props; layout is clean at 320 px and 1000 px widths.

---

### P-11: Quality tiers and performance (weight 10)

**Goal:** smooth on a laptop **without a dedicated GPU**, while looking great on an RTX 3050.

**How to build** (`quality.js`)

| Tier | Terrain resolution | Shadow map | Pixel ratio | Rocks | Stars | Antialias |
|---|---|---|---|---|---|---|
| low | 129 | 1024 | 1 | 40 | 800 | off |
| medium | 257 | 2048 | min(dpr, 1.5) | 120 | 1500 | on |
| high | 385 | 2048 | min(dpr, 2) | 250 | 2500 | on |

- `quality="auto"` starts on **medium**, measures the average frame time over the first ~90 rendered frames (while rendering continuously during that probe), and if the average is under 24 fps drops one tier; repeat once more if it is still slow. Do not upgrade automatically.
- **Render on demand:** do not run a continuous render loop. Render only when (a) props changed, (b) the camera or controls changed, (c) a camera transition or animation is running, (d) the container resized. Use a `needsRender` flag with `requestAnimationFrame`.
- Pause rendering when the canvas is off-screen (`IntersectionObserver`) or the tab is hidden.
- Two `Scene3D` instances on one page must work (two WebGL contexts).
- Expose the current tier in the HUD (small text) and an optional `onTierChange` callback prop (does not break the contract).

**Acceptance:** in the sandbox, forcing `low` is clearly lighter (frame time drops and the GPU is idle when nothing changes); `auto` downgrades on a slow machine; two panels run together.

---

### P-12: Hardening (weight 6)

**How to build**
- Validate and clamp props: `NaN` or `undefined` angles fall back to the last valid value (or defaults: Sun el 5, az 180, Earth el 5, az 0).
- Wrap renderer creation in `try/catch`. If WebGL is unavailable or the context is lost, render `<SkyDiagram .../>` and a one-line message "3D view is unavailable on this device".
- Handle `webglcontextlost` and `webglcontextrestored`.
- Add an error boundary around the scene so a bug cannot blank the whole app.
- `SkyDiagram.jsx`: an SVG with a horizon line, compass ticks, the Sun (yellow circle) and Earth (blue circle) placed by azimuth (x axis, 0 to 360) and elevation (y axis, −10 to 40°), with a short caption. It must work with no WebGL and is also exported for Rakshith to use as a compact view.
- Fill in `docs/pavan/NOTES.md` completely (props, behaviours, performance notes, known issues).

**Acceptance:** disabling WebGL in the browser shows the SkyDiagram, bad props never crash, NOTES.md is complete.

---

### P-13: Shadow ruler (weight 3)

**How to build** (`ShadowRuler.js`, toggled by `showShadowRuler`)
- A thin line on the ground from the lander's base along the shadow direction (opposite the Sun's azimuth), length `H / tan(sunEl)` capped at 150 m, with ticks every 10 m, and a text sprite at the end ("Shadow 86 m").
- Hidden when the Sun is below the horizon. Terrain slope is ignored (it is a visual aid; state this in NOTES.md).

**Acceptance:** the ruler's end matches where the lander's shadow ends on flat ground.

---

## 6. STRETCH goals (only after P-01 to P-13 are 100%)

### PS-1: LaunchAnimation (schematic)
Standalone component `LaunchAnimation({ progress, launchLabel, landingLabel, autoplay })`. Pure SVG and CSS (no three.js). Earth on the left, Moon on the right, a curved dashed path, a small rocket icon moving along the path, and a lander descending in the last 15%. Caption: **"Illustrative, not to scale"**. Controlled by `progress` (0 to 1) or `autoplay`. Rakshith decides where to place it.

### PS-2: Real LOLA heightmap loader
Support `heightmapUrl` (a grayscale PNG in `public/terrain/`). Read pixels via canvas, map to heights with a `heightScaleM` constant, and use it instead of the procedural base shape. When a real heightmap is used, change the HUD tag to "Terrain: LOLA data" and document the source. You (the human) download a small tile from Moon Trek https://trek.nasa.gov/moon/ and convert it. Prefer NASA-hosted data; if a tile comes from a non-U.S. Government source (for example Quickmap), the human must check that site's data use terms first and the source must be credited in the README. A helper script can live in `scripts/pavan/`. Only claim "terrain-accurate" if the tile is real and its source is noted.

### PS-3: Cinematic camera path
A "Cinematic" button in the HUD: a slow orbit that ends low behind the lander looking at the Sun, for the demo video. Cancel on any user input.

---

## 7. Testing your work (no Rakshith code needed)

1. `npm run dev`, then open `/sandbox-pavan.html`.
2. For every task, run its acceptance checks in the sandbox.
3. Test all four sandbox sites, both view modes, and all quality tiers.
4. Test the "compare test" with two scenes.
5. Open DevTools: no errors or warnings, no growing memory after toggling modes 20 times.
6. Check at widths 320, 768 and 1280 px.
7. Run `npm run build` to be sure the production build compiles (report the result to the human; do not edit config files).

---

## 8. Common pitfalls (read before coding)

- Mixing up azimuth conventions: north is **−Z**, azimuth is **clockwise**, so east (az 90) is **+X**.
- Forgetting to dispose of geometries, materials and textures (memory leaks with StrictMode).
- Rebuilding the terrain on every slider move (slow). Update the light only.
- Shadow camera too small, giving cut-off shadows at low sun angles.
- A continuous render loop on a no-GPU laptop. Render on demand.
- Using external textures or CDN scripts. Everything procedural.
- Claiming the procedural terrain is real.
- Editing files outside your folders. Write a request in NOTES.md instead.

---

## 9. After each task

1. Update `docs/pavan/PROGRESS.md`.
2. Update `docs/pavan/NOTES.md`.
3. Commit to `pavan` with `P-xx: ...`.
4. Tell the human in 6 lines or fewer: done, how to test, next.


---

# 4. SHORT STARTER FOR NEW SESSIONS (paste this if the chat was reset)

> You are the LLM for **Pavan**. Read `docs/LLM_RULES.md`, `docs/PROJECT.md`, `docs/INTEGRATION_README.md`, `docs/pavan/LLM_BRIEF.md`, `docs/pavan/PROGRESS.md`, `docs/pavan/NOTES.md`. Rakshith's laptop has no dedicated GPU: render on demand, build and test the `low` tier first. Tell me in 5 lines which task is next and which files you will touch. Only edit Pavan's folders, never install packages, never change contracts, update PROGRESS.md and NOTES.md after every task, commit to branch `pavan` as `P-xx: message`.
