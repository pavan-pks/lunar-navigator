# Integration README

This file explains how Pavan's part and Rakshith's part fit together, so merging is painless.
It is also the **contract**: data shapes, component props, function signatures. Nobody changes it without agreeing (see `LLM_RULES.md` section 9).

---

## 1. The big picture

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

## 4. Step 0: one-time setup (humans, not LLMs)

### 4.1 Pavan creates the repo and scaffold on `main`

```bash
git clone https://github.com/<pavan>/lunar-navigator.git
cd lunar-navigator

npm create vite@latest . -- --template react     # choose "Ignore files and continue" if asked
npm install
npm install three recharts
npm install -D tailwindcss @tailwindcss/vite vitest

mkdir -p docs/pavan docs/rakshith public/data public/terrain scripts/pavan \
         src/lib src/dev src/components/scene src/components/ui
```

Edit `vite.config.js`:

```js
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
})
```

Put `@import "tailwindcss";` as the first line of `src/index.css`.
Add to `package.json` scripts: `"test": "vitest run"`.
Add to `.gitignore`: `scripts/cache/`, `.env`, `.DS_Store`.

### 4.2 Add the docs and the stub

Copy all docs from this package into `docs/`. Then create the **stub** that lets Rakshith build the Compare screen before Pavan's real scene exists.

`src/components/scene/Scene3D.jsx` (Pavan replaces this later):

```jsx
// STUB: Pavan replaces this with the real 3D scene. The props are the contract.
export default function Scene3D(props) {
  const f = (v) => (typeof v === 'number' ? v.toFixed(1) : '–')
  return (
    <div style={{ height: 320, border: '1px dashed #888', padding: 8, fontSize: 13 }}>
      <b>Scene3D stub</b> ({props.label ?? props.siteId})<br />
      Sun el {f(props.sunEl)}° az {f(props.sunAz)}° · Earth el {f(props.earthEl)}° az {f(props.earthAz)}°
    </div>
  )
}
```

`src/components/scene/index.js`:

```js
export { default as Scene3D } from './Scene3D.jsx'
```

Commit and push:

```bash
git add . && git commit -m "scaffold: vite, deps, folders, docs, scene stub" && git push
```

### 4.3 Create the branches

```bash
git checkout -b dev   && git push -u origin dev
git checkout -b pavan && git push -u origin pavan
git checkout dev && git checkout -b rakshith && git push -u origin rakshith
```

On GitHub: **Settings → Branches → protect `main`** (require a pull request). Connect the repo to **Vercel** (production branch `main`).
Rakshith clones the repo, runs `npm install`, and `git checkout rakshith`.

### 4.4 Check both laptops

`npm run dev` shows the Vite page on both machines. Only then start the LLM sessions.

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

## 9. Troubleshooting

| Problem | Likely cause | Fix |
|---|---|---|
| Sun appears on the wrong side in 3D | Axis convention mismatch | Use section 5.1: −Z is north, +X is east |
| Sun elevation looks wrong in charts | Longitude sign or 0..360 vs −180..180 | Normalise longitudes in `fetch_horizons.py` and compare with the verification script |
| 3D very slow on the no-GPU laptop | Quality too high | Set `quality="low"`, smaller terrain, 1024 shadow map |
| Two 3D panels make the laptop hot | Rendering every frame | Scene must render **on demand** (only when props or camera change) |
| Merge conflict in `package.json` | Someone installed a package | Revert it; only the human edits `package.json` |
| Vercel build fails | Import path or case-sensitivity (`Scene3D.jsx` vs `scene3d.jsx`) | Match file names exactly |

---

## 10. Final deliverables checklist

- [ ] Live Vercel link on `main`
- [ ] Public GitHub repo with MIT `LICENSE`
- [ ] Root `README.md` (what it is, how to run, data sources, credits)
- [ ] 2 to 3 minute demo video
- [ ] Project description text for submission (problem, solution, data, assumptions, users)
- [ ] Credits: NASA/JPL Horizons, LRO/LOLA if used; no claim of NASA endorsement
