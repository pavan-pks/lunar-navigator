# Lunar Landing Site Navigator

NASA Space Apps Challenge 2026 · Challenge: *Lunar Landing Site Navigator*

> Read this file first. It is the single source of truth for what we are building.

---

## 1. The idea (in simple words)

Landers going to the Moon's south pole need two things to survive:

- **Sunlight** for power and heat.
- **A view of Earth** to talk to mission control.

At the south pole the Sun barely rises above the horizon, so a small change in **landing site** or **landing date** can mean weeks of sunlight or weeks of darkness. When a launch slips, planners must quickly ask: *"What if we land somewhere else, or later?"*

NASA's current tools (JPL Horizons, Quickmap, Moon Trek) can answer this, but they are hard to use and slow for comparing options.

**Our app makes it fast and visual.** Pick two sites (or one site on two dates), press play, and watch the Sun, Earth, and shadows move over a lunar day. The app tells you: *Is this site-date combination viable?*

**Who it is for**
- **Mission planners:** dense numbers and quick comparison.
- **Students and the public:** simple visuals that show why the Moon is hard.

---

## 2. Features

### Must-have (core)
1. **Site picker:** 5 to 6 preset sites plus custom latitude/longitude.
2. **Date and time selector** with a **launch-slip slider** (landing date = launch date + transit days).
3. **Sun and Earth timelines:** Sun elevation curve and Earth-visible windows for each site.
4. **Metrics panel:** Sun elevation, hours of sunlight, longest darkness, time to sunset and Earthset, shadow length.
5. **Verdict badge:** Viable / Risky / Not viable.
6. **Side-by-side comparison:** two sites, or one site on two dates, with a shared time slider.

### Differentiators (what makes us stand out)
7. **3D shadow view:** terrain, lander, and a Sun that moves across the sky, so shadows sweep over the lunar day. Earth appears and disappears below the horizon.
8. **Mission Window Calendar:** a heatmap of sites × dates (green / yellow / red). Click a cell to load it into the comparison.
9. **"Will it survive the night?" battery simulator:** enter battery and power numbers, watch charge rise in sunlight and drain in darkness, get a result like "depleted on day 11".
10. **Planner / Explorer modes:** dense numbers for planners, plain-language captions for everyone else.

### Stretch (only if time remains)
11. Astronaut's-eye view (ground-level camera).
12. Real mission replay (for example Chandrayaan-3). Verify coordinates and dates from official sources first.
13. Real LOLA terrain tile instead of a procedural crater.
14. Schematic launch → transit → landing animation (labelled "illustrative").

**Cut order if time runs short:** 14 → 12 → 13 → 11 → 9. Features 1 to 8 must stay.

---

## 3. Tech stack

| Part | Tool |
|---|---|
| App | React + Vite |
| Styling | Tailwind CSS |
| 3D scene | three.js |
| Charts | Recharts |
| Data fetching (one-time script) | Python + JPL Horizons API (sub-solar and sub-Earth points) |
| Data storage | Static JSON in `public/data/` (`sites.json`, `global_ephem.json`) (**no backend**) |
| Hosting | Vercel (auto-deploys from `main`) |
| Version control | GitHub |

**How data flows**

```
Python script ──► JPL Horizons ──► global_ephem.json (sub-solar + sub-Earth points, hourly)
                                         │
                                         ▼
        React app: geometry.js turns them into Sun/Earth elevation + azimuth
        for ANY site (presets or custom lat/lon)
                                         │
                                         ▼
        metrics, verdict, calendar, battery ──► UI ──► 4 angles ──► 3D scene
```

The app never calls an API at runtime, so the demo cannot break because of the network.

---

## 4. Rules for calculations (do not invent astronomy)

- Sun is up if **Sun elevation > −0.27°** (no atmosphere on the Moon).
- Earth is visible if **Earth elevation > 0°**.
- **Shadow length = object height / tan(Sun elevation).**
- Horizons gives the **sub-solar point** and **sub-Earth point** on the Moon (target Moon, observer Earth geocenter, hourly). The app computes Sun and Earth elevation/azimuth for any site with spherical geometry (formulas in `docs/INTEGRATION_README.md`). Two sites are cross-checked against Horizons topocentric output.
- Our elevations assume a **smooth sphere with no terrain**. Label this in the UI. The 3D terrain is **illustrative** unless we use real LOLA data.

---

## 5. Data contract

Full details are in `docs/INTEGRATION_README.md` section 5. In short:

```json
// public/data/sites.json
[
  { "id": "shackleton", "name": "Shackleton crater rim", "lat": -89.9, "lon": 129.8,
    "terrainType": "crater-rim", "mission": null, "notes": "", "source": "", "verified": false }
]
```

```json
// public/data/global_ephem.json  (ONE file for the whole Moon, hourly)
{
  "fake": false,
  "source": "JPL Horizons",
  "startUTC": "2027-01-01T00:00:00Z",
  "stepHours": 1,
  "subSolarLat": [], "subSolarLon": [],
  "subEarthLat": [], "subEarthLon": []
}
```

All angles are in degrees. All arrays have the same length. `fake: true` means sample data (the app shows a banner).

---

## 6. Folder ownership (so merging is painless)

**Rule: only edit files you own.** Full list in `docs/LLM_RULES.md` section 3.

```
lunar-navigator/
├── docs/
│   ├── PROJECT.md  LLM_RULES.md  INTEGRATION_README.md  PROGRESS.md   # human, on dev
│   ├── pavan/      (LLM_BRIEF, PROGRESS, NOTES)                      # PAVAN
│   └── rakshith/   (LLM_BRIEF, PROGRESS, NOTES)                      # RAKSHITH
├── scripts/
│   ├── *.py                       # RAKSHITH (fetch, fake data, verify, validate)
│   └── pavan/                     # PAVAN (optional terrain helpers)
├── public/
│   ├── data/                      # RAKSHITH
│   └── terrain/                   # PAVAN (optional)
├── sandbox-pavan.html             # PAVAN (his own test page)
└── src/
    ├── dev/                       # PAVAN
    ├── lib/                       # RAKSHITH (geometry, metrics, energy, loader, hooks)
    ├── components/
    │   ├── scene/                 # PAVAN (Scene3D, terrain, lander, sky, camera, HUD)
    │   └── ui/                    # RAKSHITH (pickers, charts, panels, calendar, battery, compare)
    ├── App.jsx  main.jsx  index.css   # RAKSHITH
```

| Person | Owns |
|---|---|
| **Pavan** (GPU laptop) | 3D scene, shadows, Earth marker, astronaut view, HUD, performance tiers, sky diagram |
| **Rakshith** | Data scripts and JSON, geometry, metrics, verdict, timelines, calendar, battery, comparison layout, app shell |
| **Human-only** | `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `LICENSE`, root `README.md`, overall docs |

**The two parts talk only through props:** the UI passes four angles to `<Scene3D />`. The scene never reads data or does metrics.

---

## 7. Git rules

```
main     stable, deployed, protected
 └─ dev  integration branch
     ├─ pavan
     └─ rakshith
```

1. Work only on your own branch (`pavan` or `rakshith`).
2. Merge into `dev` with a Pull Request at the checkpoints in `docs/INTEGRATION_README.md` section 7.
3. `dev` goes into `main` only when it runs cleanly on both laptops.
4. Before starting a new task: `git fetch origin && git merge origin/dev` on your branch.
5. Commit often with `<task id>: <message>`.

---

## 8. Credits and license

- Code license: **MIT**.
- Data: NASA/JPL Horizons. LOLA/LRO data if used. Do not imply NASA endorsement.
- **Data use notice from the challenge:** NASA does not endorse any non-U.S. Government entity and is not responsible for information on non-U.S. Government websites. For those sites (for example LROC Quickmap, run by Arizona State University, and Canadian Space Agency pages) we must comply with **that site's own data use terms**. Before downloading or redistributing anything from them, read their terms and record the source and terms link in the README.
- Check the license of any fonts, textures, icons, or models before using them, and list them in the README.
