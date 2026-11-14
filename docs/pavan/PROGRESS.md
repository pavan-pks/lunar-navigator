# Pavan's Progress

> Owner: Pavan's LLM. Update after **every** finished task. Never edit anyone else's progress file.
> Status values: `Not started` · `In progress` · `Done` · `Blocked`
> Done % must be 100 only when every acceptance criterion in `LLM_BRIEF.md` is met.
> **Score = sum(weight × done% / 100)**

**Current score: 60 / 100**
**Last updated:** 2026-11-14
**Currently working on:** P-08: Orbit camera

## Core tasks

| ID | Task | Weight | Status | Done % | Points | Last update / note |
|---|---|---|---|---|---|---|
| P-01 | Sandbox harness | 5 | Done | 100 | 5 | Sandbox harness with sliders, presets, simulation loop, dual-scene compare test & FPS counter |
| P-02 | Scene skeleton (renderer, camera, resize, cleanup) | 8 | Done | 100 | 8 | WebGLRenderer, PerspectiveCamera, PCFShadowMap, ResizeObserver, on-demand invalidate(), StrictMode disposal |
| P-03 | Terrain generator | 12 | Done | 100 | 12 | 400mx400m patch, noise.js + terrain.js, crater-rim/massif/plain, flat pad, vertex colors, bilinear heightAt |
| P-04 | Lander model | 8 | Done | 100 | 8 | Procedural lunar lander in lander.js (cabin, gold foil stage, 4 legs, footpads, engine bell, solar panels, dish antenna) + OrbitControls |
| P-05 | Rocks and scatter | 5 | Done | 100 | 5 | Single InstancedMesh of distorted icosahedron rocks (40-250 by tier), landmark boulders, clear pad radius, cast/receive shadows |
| P-06 | Sun light and shadows | 12 | Done | 100 | 12 | Harsh DirectionalLight (intensity 3.0), sub-2° grazing shadow coverage, -0.27° lunar horizon cutoff, 0.02 ambient & faint Earthshine |
| P-07 | Sky: stars, Sun disk, Earth marker | 10 | Done | 100 | 10 | sky.js: 800-2500 stars Points with day/night dimming, emissive Sun disk (0.53° angular size), procedural canvas textured Earth (1.9°) & text sprite |
| P-08 | Orbit camera | 5 | Not started | 0 | 0 | |
| P-05 | Rocks and scatter | 5 | Not started | 0 | 0 | |
| P-06 | Sun light and shadows | 12 | Not started | 0 | 0 | |
| P-07 | Sky: stars, Sun disk, Earth marker | 10 | Not started | 0 | 0 | |
| P-08 | Orbit camera | 5 | Not started | 0 | 0 | |
| P-09 | Astronaut camera | 10 | Not started | 0 | 0 | |
| P-10 | HUD overlay and compass | 6 | Not started | 0 | 0 | |
| P-11 | Quality tiers and performance (on-demand rendering) | 10 | Not started | 0 | 0 | |
| P-12 | Hardening: errors, WebGL fallback, SkyDiagram, notes | 6 | Not started | 0 | 0 | |
| P-13 | Shadow ruler | 3 | Not started | 0 | 0 | |
| | **Total** | **100** | | | **5** | |

## Stretch tasks (only after all core tasks are 100%)

| ID | Task | Status | Done % | Note |
|---|---|---|---|---|
| PS-1 | LaunchAnimation (schematic) | Not started | 0 | |
| PS-2 | Real LOLA heightmap loader | Not started | 0 | |
| PS-3 | Cinematic camera path | Not started | 0 | |

## Merge log

| Date | What was merged to `dev` | PR link | Tested by |
|---|---|---|---|
| | | | |

## Blockers and requests

(Write here, and in NOTES.md, anything you need from Rakshith or the human.)
