# Pavan's Notes (integration notes written by Pavan's LLM)

> Rakshith and the human read this file during integration. Keep it accurate and short.
> Update after every finished task.

## What is built so far
- `sandbox-pavan.html`: Standalone entry page for Pavan's visual test sandbox.
- `src/dev/pavan-main.jsx`: React entry point rendering `PavanSandbox`.
- `src/dev/PavanSandbox.jsx`: Interactive test harness with angle sliders, presets, lunar day simulation, FPS counter, and dual-scene compare test.
- `src/components/scene/index.js`: Exports `Scene3D` (named and default).

## How to use it (props and exports)
- Run `npm run dev` and navigate to `http://localhost:5173/sandbox-pavan.html`.
- Exports from `src/components/scene/index.js`: `Scene3D` (named and default).

## Decisions
- Used standalone dark-themed inline styles in `PavanSandbox.jsx` to prevent styling conflicts with Tailwind and guarantee a clean testing UI across any layout width.

## Performance notes
- Live FPS counter integrated into sandbox header to benchmark render loop and frame timings across tasks.

## Known issues
- `Scene3D` is currently the stub component; real 3D renderer implementation begins in P-02.

## Requests to the other member / human
- None at this time.

## CONTRACT CHANGE REQUESTS
- None.
