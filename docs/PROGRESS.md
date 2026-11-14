# Overall Progress

> Edited **only by the human, on the `dev` branch**, at merge checkpoints.
> Each member's LLM keeps its own detailed file: `docs/pavan/PROGRESS.md` and `docs/rakshith/PROGRESS.md`.
> At each checkpoint, copy the two scores here.

**Overall score = (Pavan score + Rakshith score) / 2**

| Date / hour | Pavan score | Rakshith score | Overall | Merged into `dev`? | `dev` → `main`? |
|---|---|---|---|---|---|
| Hour 0 | 0 | 0 | 0 | | |

## Setup checklist (Step 0)

- [ ] GitHub repo created, both members added
- [ ] Vite + React scaffold, dependencies installed (`three`, `recharts`, `tailwindcss`, `vitest`)
- [ ] `vite.config.js`, `src/index.css`, `package.json` scripts updated
- [ ] Docs copied into `docs/`
- [ ] `Scene3D` stub and `index.js` committed
- [ ] Branches created: `main`, `dev`, `pavan`, `rakshith`
- [ ] `main` protected (PR only)
- [ ] Vercel connected to the repo
- [ ] Both laptops run `npm run dev` successfully
- [ ] `LICENSE` (MIT) added

## Integration checkpoints

- [ ] **CP1 (~hour 3):** fake data + sites merged; sandbox scene merged; `dev` runs
- [ ] **CP2 (~hour 8):** real Horizons data; geometry, metrics, timeline; terrain, lander, Sun, shadows, Earth
- [ ] **CP3 (~hour 12):** compare, metrics, verdict, calendar, 3D shadow view working together; tested on **both laptops**; `dev` → `main`
- [ ] **CP4 (~hour 16):** battery, astronaut view, explorer mode, performance tiers
- [ ] **Feature freeze (~hour 18)**

## Feature status (high level)

| Feature | Owner | Status |
|---|---|---|
| Site picker (presets + custom) | Rakshith | |
| Launch slip and landing date | Rakshith | |
| Sun / Earth timelines | Rakshith | |
| Metrics panel and verdict | Rakshith | |
| Side-by-side compare | Rakshith | |
| Mission window calendar | Rakshith | |
| Battery simulator | Rakshith | |
| Planner / Explorer modes | Rakshith | |
| 3D terrain, lander, shadows | Pavan | |
| Sun disk, Earth marker, stars | Pavan | |
| Astronaut view | Pavan | |
| HUD and shadow ruler | Pavan | |
| Quality tiers / no-GPU fallback | Pavan | |

## Submission checklist

- [ ] Live Vercel link on `main`, works in a fresh browser
- [ ] Public GitHub repo, MIT `LICENSE`, root `README.md`
- [ ] Demo video (2 to 3 minutes)
- [ ] Project description (problem, solution, data, assumptions, users)
- [ ] Credits and "not endorsed by NASA" statement
- [ ] Real data in `global_ephem.json` (`fake: false`)
