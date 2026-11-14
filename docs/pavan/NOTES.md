# Pavan's Notes (integration notes written by Pavan's LLM)

> Rakshith and the human read this file during integration. Keep it accurate and short.
> Update after every finished task.

## What is built so far
- `sandbox-pavan.html`: Standalone entry page for Pavan's visual test sandbox.
- `src/dev/pavan-main.jsx`: React entry point rendering `PavanSandbox`.
- `src/dev/PavanSandbox.jsx`: Interactive test harness with angle sliders, presets, lunar day simulation, FPS counter, and dual-scene compare test.
- `src/components/scene/index.js`: Exports `Scene3D` (named and default).
- `src/components/scene/noise.js`: Seeded 32-bit FNV-1a hash, Mulberry32 PRNG, smooth quintic 2D noise, and 2D fBm.
- `src/components/scene/terrain.js`: Deterministic 400m x 400m lunar terrain builder supporting `crater-rim`, `massif`, and `plain` profiles with flat 8m landing pad, craterlet scatter, regolith vertex colors, and fast bilinear `heightAt(x, z)`.
- `src/components/scene/lander.js`: Detailed procedural lunar lander model (octagonal cabin, gold foil descent stage, 4 articulated legs with footpads, descent engine bell, solar panel wings, steerable dish antenna, and height-scale reactivity).
- `src/components/scene/cameraModes.js`: OrbitControls controller constrained to terrain height with target tracking.
- `src/components/scene/Scene3D.jsx`: Complete Three.js WebGL setup with `PerspectiveCamera`, OrbitControls, procedural lander on landing pad, dynamic terrain generation, on-demand `invalidate()` scheduling, separated lifecycle effects, and full StrictMode disposal.

## How to use it (props and exports)
- Run `npm run dev` and navigate to `http://localhost:5173/sandbox-pavan.html`.
- `Scene3D` accepts all contract props: `sunEl`, `sunAz`, `earthEl`, `earthAz`, `siteId`, `terrainType`, `viewMode`, `quality`, `label`, `landerHeight`, `showHud`, `showShadowRuler`, `heightmapUrl`.
- Render occurs strictly on-demand via internal `invalidate()` whenever angles, dimensions, camera position, or scene configurations change.

## Decisions
- Used standalone dark-themed inline styles in `PavanSandbox.jsx` to prevent styling conflicts with Tailwind and guarantee a clean testing UI across any layout width.
- Separate `useEffect` hooks in `Scene3D.jsx`: (a) core renderer & scene initialization, (b) light/angle/lander-scale updates that never rebuild geometry, and (c) terrain/site changes.
- Craterlet bounding box rejection reduces terrain generation time from ~200ms to ~70-90ms at 257x257 resolution.
- Landers feet rest exactly on `heightAt(0, 0)` with all meshes casting and receiving shadows.

## Performance notes
- Live FPS counter integrated into sandbox header to benchmark render loop and frame timings across tasks.
- On-demand rendering ensures 0% continuous GPU load when idle.
- Pixel ratio capped per quality tier: `low` = 1.0, `medium` = 1.5, `high` = 2.0.
- Terrain resolution: `low` = 129, `medium`/`auto` = 257, `high` = 385. Generates under 100ms at 257x257.

## Known issues
- Rock and scatter meshes are not yet placed; rocks and boulder scatter arrive in P-05.

## Requests to the other member / human
- None at this time.

## CONTRACT CHANGE REQUESTS
- None.
