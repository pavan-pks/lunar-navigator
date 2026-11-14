# Pavan's Notes (integration notes written by Pavan's LLM)

> Rakshith and the human read this file during integration. Keep it accurate and short.
> Update after every finished task.

## What is built so far
- `sandbox-pavan.html`: Standalone entry page for Pavan's visual test sandbox.
- `src/dev/pavan-main.jsx`: React entry point rendering `PavanSandbox`.
- `src/dev/PavanSandbox.jsx`: Interactive test harness with angle sliders, presets, lunar day simulation, FPS counter, and dual-scene compare test.
- `src/components/scene/index.js`: Exports `Scene3D` (named and default).
- `src/components/scene/Scene3D.jsx`: Complete Three.js WebGL setup with `PerspectiveCamera`, `ResizeObserver`, on-demand `invalidate()` scheduling, separated lifecycle effects, and full StrictMode disposal.

## How to use it (props and exports)
- Run `npm run dev` and navigate to `http://localhost:5173/sandbox-pavan.html`.
- `Scene3D` accepts all contract props: `sunEl`, `sunAz`, `earthEl`, `earthAz`, `siteId`, `terrainType`, `viewMode`, `quality`, `label`, `landerHeight`, `showHud`, `showShadowRuler`, `heightmapUrl`.
- Render occurs strictly on-demand via internal `invalidate()` whenever angles, dimensions, or scene configurations change.

## Decisions
- Used standalone dark-themed inline styles in `PavanSandbox.jsx` to prevent styling conflicts with Tailwind and guarantee a clean testing UI across any layout width.
- Separate `useEffect` hooks in `Scene3D.jsx`: (a) core renderer & scene initialization, (b) light/angle updates that never rebuild geometry, and (c) terrain/site changes.

## Performance notes
- Live FPS counter integrated into sandbox header to benchmark render loop and frame timings across tasks.
- On-demand rendering ensures 0% continuous GPU load when idle.
- Pixel ratio capped per quality tier: `low` = 1.0, `medium` = 1.5, `high` = 2.0.

## Known issues
- Test cube and temporary ground plane currently rendered; procedural lunar terrain generation is next in P-03.

## Requests to the other member / human
- None at this time.

## CONTRACT CHANGE REQUESTS
- None.
