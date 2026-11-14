# Rakshith's Progress

> Owner: Rakshith's LLM. Update after **every** finished task. Never edit anyone else's progress file.
> Status values: `Not started` · `In progress` · `Done` · `Blocked`
> Done % must be 100 only when every acceptance criterion in `LLM_BRIEF.md` is met.
> **Score = sum(weight × done% / 100)**

**Current score: 32 / 100**
**Last updated:** 2026-11-14
**Currently working on:** R-05: energy.js (with tests)
**Data status:** REAL NASA/JPL Horizons data (`fake: false`)

## Core tasks

| ID | Task | Weight | Status | Done % | Points | Last update / note |
|---|---|---|---|---|---|---|
| R-01 | Fake data generator and `sites.json` | 5 | Done | 100 | 5 | Generated 9504 hours of plausible global ephemeris, 6 preset sites, and validation script. All PASS. |
| R-02 | Real Horizons fetch script and verification | 9 | Done | 100 | 9 | Fetched 9,504 hourly steps from NASA/JPL Horizons (target 301, center 500@399, quantities 14, 15). Verified against topocentric Horizons queries (Sun ΔEl ≤ 0.001°, Earth ΔEl ≤ 0.273° due to geocenter parallax). All PASS. |
| R-03 | `geometry.js` (with tests) | 6 | Done | 100 | 6 | Implemented analytical spherical astronomy module (`sunAltAz`, `earthAltAz`, `sampleSeries`, `valuesAt`, `lerpAzimuth`, `lerpAngle180`) with 11 Vitest unit tests passing. |
| R-04 | `config.js` and `metrics.js` (with tests) | 12 | Done | 100 | 12 | Implemented mission thresholds (`config.js`) and timeline analysis (`metrics.js`: `computeWindowStats`, `getVerdict`, `shadowLength`, `timeToNext`, `landingDate`). 8 Vitest tests pass; confirmed polar site seasonal verdict changes (0% July vs 100% Dec) and Apollo 11 ~50% synodic day/night. |
| R-05 | `energy.js` (with tests) | 5 | Not started | 0 | 0 | |
| R-05 | `energy.js` (with tests) | 5 | Not started | 0 | 0 | |
| R-06 | App shell, data loader, time controller | 7 | Not started | 0 | 0 | |
| R-07 | Site picker and custom coordinates | 4 | Not started | 0 | 0 | |
| R-08 | Date controls and launch slip | 5 | Not started | 0 | 0 | |
| R-09 | Timeline charts | 9 | Not started | 0 | 0 | |
| R-10 | Metrics panel and verdict badge | 5 | Not started | 0 | 0 | |
| R-11 | Compare layout (integrates `Scene3D`) | 9 | Not started | 0 | 0 | |
| R-12 | Calendar heatmap and best windows | 9 | Not started | 0 | 0 | |
| R-13 | Battery panel | 6 | Not started | 0 | 0 | |
| R-14 | Planner and Explorer modes, captions, glossary | 5 | Not started | 0 | 0 | |
| R-15 | Assumptions, footer, error states, polish | 4 | Not started | 0 | 0 | |
| | **Total** | **100** | | | **0** | |

## Stretch tasks (only after all core tasks are 100%)

| ID | Task | Status | Done % | Note |
|---|---|---|---|---|
| RS-1 | Mission replay (Chandrayaan-3) | Not started | 0 | |
| RS-2 | "Best alternative" suggester | Not started | 0 | |

## Verification log (R-02)

| Check | Site | Time (UTC) | Horizons value | Our value | Difference |
|---|---|---|---|---|---|
| Sun El, Az | Apollo 11 (0.67°, 23.47°) | 2027-03-12 12:00 | -11.74°, 89.05° | -11.74°, 89.05° | ΔEl: 0.001°, ΔAz: 0.000° (PASS) |
| Earth El, Az | Apollo 11 (0.67°, 23.47°) | 2027-03-12 12:00 | 60.18°, 255.25° | 60.31°, 255.25° | ΔEl: 0.134°, ΔAz: 0.002° (PASS) |
| Sun El, Az | Apollo 11 (0.67°, 23.47°) | 2027-06-21 00:00 | 45.50°, 270.88° | 45.50°, 270.88° | ΔEl: 0.001°, ΔAz: 0.001° (PASS) |
| Earth El, Az | Apollo 11 (0.67°, 23.47°) | 2027-06-21 00:00 | 67.01°, 274.71° | 67.10°, 274.72° | ΔEl: 0.091°, ΔAz: 0.001° (PASS) |
| Sun El, Az | Apollo 11 (0.67°, 23.47°) | 2027-12-15 18:00 | 37.48°, 268.21° | 37.48°, 268.21° | ΔEl: 0.001°, ΔAz: 0.001° (PASS) |
| Earth El, Az | Apollo 11 (0.67°, 23.47°) | 2027-12-15 18:00 | 65.39°, 265.23° | 65.50°, 265.23° | ΔEl: 0.108°, ΔAz: 0.000° (PASS) |
| Sun El, Az | Malapert (-86.0°, 0.1°) | 2027-03-12 12:00 | -3.09°, 125.02° | -3.09°, 125.02° | ΔEl: 0.000°, ΔAz: 0.000° (PASS) |
| Earth El, Az | Malapert (-86.0°, 0.1°) | 2027-03-12 12:00 | 10.38°, 354.48° | 10.63°, 354.49° | ΔEl: 0.257°, ΔAz: 0.004° (PASS) |
| Sun El, Az | Malapert (-86.0°, 0.1°) | 2027-06-21 00:00 | 2.63°, 338.85° | 2.63°, 338.85° | ΔEl: 0.001°, ΔAz: 0.000° (PASS) |
| Earth El, Az | Malapert (-86.0°, 0.1°) | 2027-06-21 00:00 | 1.30°, 0.54° | 1.55°, 0.54° | ΔEl: 0.245°, ΔAz: 0.005° (PASS) |
| Sun El, Az | Malapert (-86.0°, 0.1°) | 2027-12-15 18:00 | 4.50°, 330.79° | 4.50°, 330.79° | ΔEl: 0.000°, ΔAz: 0.001° (PASS) |
| Earth El, Az | Malapert (-86.0°, 0.1°) | 2027-12-15 18:00 | 5.09°, 358.96° | 5.36°, 358.95° | ΔEl: 0.273°, ΔAz: 0.005° (PASS) |

## Merge log

| Date | What was merged to `dev` | PR link | Tested by |
|---|---|---|---|
| | | | |

## Blockers and requests

(Write here, and in NOTES.md, anything you need from Pavan or the human.)
