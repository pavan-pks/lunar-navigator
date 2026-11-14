# LLM RULES (read this first, every session)

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

## 1. Read order at the start of every session

1. `docs/LLM_RULES.md` (this file)
2. `docs/PROJECT.md` (what we are building)
3. `docs/INTEGRATION_README.md` (how the pieces connect, data and props contracts)
4. **Your own brief:** `docs/pavan/LLM_BRIEF.md` or `docs/rakshith/LLM_BRIEF.md`
5. **Your own progress file:** `docs/<name>/PROGRESS.md`
6. **Your own notes file:** `docs/<name>/NOTES.md`

Do not start coding until you have read all six and told the human, in 5 lines or fewer, which task you will do next and which files you will touch.

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

## 11. Starter prompt the human pastes at the start of a session

> You are the LLM for **<Pavan | Rakshith>**. Read, in order: `docs/LLM_RULES.md`, `docs/PROJECT.md`, `docs/INTEGRATION_README.md`, `docs/<name>/LLM_BRIEF.md`, `docs/<name>/PROGRESS.md`, `docs/<name>/NOTES.md`.
> Then tell me in 5 lines which task you will do next and which files you will touch. Follow `docs/LLM_RULES.md` strictly: only edit your own folders, do not install packages, do not change contracts, update PROGRESS.md and NOTES.md after every task, and commit to your own branch.
