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
- `src/components/scene/rocks.js`: Procedural rock and boulder scatter utilizing a single `InstancedMesh` with vertex-jittered icosahedrons, tier scaling (40/120/250), 3-5 landmark boulders, and terrain grounding.
- `src/components/scene/sky.js`: Deep space procedural sky system with starfield Points (radius 900, 800-2500 by tier) dimming to 0.35 during daytime, emissive white Sun disk (angular size 0.53°), procedural canvas textured Earth sphere (angular size 1.9°), and callout text sprite.
- `src/components/scene/cameraModes.js`: OrbitControls controller constrained to terrain height with target tracking.
- `src/components/scene/Scene3D.jsx`: Complete Three.js WebGL setup with `PerspectiveCamera`, OrbitControls, harsh directional Sun lighting, wide orthographic shadow camera, deep sky system, procedural lander, rocks, dynamic terrain, on-demand `invalidate()` scheduling, and full StrictMode disposal.

## How to use it (props and exports)
- Run `npm run dev` and navigate to `http://localhost:5173/sandbox-pavan.html`.
- `Scene3D` accepts all contract props: `sunEl`, `sunAz`, `earthEl`, `earthAz`, `siteId`, `terrainType`, `viewMode`, `quality`, `label`, `landerHeight`, `showHud`, `showShadowRuler`, `heightmapUrl`.
- Render occurs strictly on-demand via internal `invalidate()` whenever angles, dimensions, camera position, or scene configurations change.

## Decisions
- Used standalone dark-themed inline styles in `PavanSandbox.jsx` to prevent styling conflicts with Tailwind and guarantee a clean testing UI across any layout width.
- Separate `useEffect` hooks in `Scene3D.jsx`: (a) core renderer & scene initialization, (b) light/angle/lander-scale updates that never rebuild geometry, and (c) terrain/site changes.
- Craterlet bounding box rejection reduces terrain generation time from ~200ms to ~70-90ms at 257x257 resolution.
- Landers feet rest exactly on `heightAt(0, 0)` with all meshes casting and receiving shadows.
- All rocks combined into a single `InstancedMesh` draw call, sinking slightly into the terrain to prevent any floating artifacts.
- Shadow camera frustum bounds set to `±240m` with `near=5`, `far=1300`, `bias=-0.0003`, `normalBias=0.25` ensuring full coverage across entire 400m patch even at grazing sun elevations (sub-2°).
- Hard vacuum lunar illumination: Sun intensity 3.0 when `sunEl > -0.27°` with a 0.1° fade preventing pop-in, 0.02 baseline ambient, and 0.04 faint bluish Earthshine active only when `earthEl > 0°`.
- Sun disk and Earth marker placed at distance 800 with realistic physical angular diameters (Sun ~0.53°, Earth ~1.9°, ratio ~3.5:1).

## Performance notes
- Live FPS counter integrated into sandbox header to benchmark render loop and frame timings across tasks.
- On-demand rendering ensures 0% continuous GPU load when idle.
- Pixel ratio capped per quality tier: `low` = 1.0, `medium` = 1.5, `high` = 2.0.
- Terrain resolution: `low` = 129, `medium`/`auto` = 257, `high` = 385. Generates under 100ms at 257x257.
- Shadow map size: `low` = 1024, `medium`/`high` = 2048.
- Rock scatter takes <8ms to generate in 1 single draw call for all instances.
- Stars rendered as single `THREE.Points` draw call with zero texture overhead.

## Known issues
- Orbit camera refinements (verifying exact polar angles, damping on high tier, and astronaut camera mode in P-09) are up next in P-08.

## Requests to the other member / human
- None at this time.

## CONTRACT CHANGE REQUESTS
- None.
