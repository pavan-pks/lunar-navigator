# STEP 0: repo setup (Pavan does this, about 30 to 45 minutes, before any LLM session)

Yes, the empty repo needs a few things first. The goal: one clean starting commit on `main`
that both of you branch from, so nobody ever creates the scaffold twice or fights over config.

## What you need installed
- Node.js 20 or newer (`node -v`), Git, a GitHub account for both of you.

## Part A. Scaffold the app (on your laptop)

1. Clone the empty repo and go inside it:
   ```bash
   git clone https://github.com/<you>/lunar-navigator.git
   cd lunar-navigator
   ```
2. Scaffold Vite + React into the current folder:
   ```bash
   npm create vite@latest . -- --template react
   ```
   - If it says the folder is not empty, choose **Ignore files and continue**.
   - If it offers experimental options (for example a different bundler or "install and start"), choose **No**.
3. Install dependencies (the **only** time anyone installs packages):
   ```bash
   npm install
   npm install three recharts
   npm install -D tailwindcss @tailwindcss/vite vitest
   ```

## Part B. Copy the starter files over the scaffold

Unzip `repo-starter.zip` and copy **everything inside it** into the repo folder, allowing overwrites.
It adds or replaces:

- `vite.config.js` (Tailwind and Vitest wired in)
- `src/index.css` (just the Tailwind import)
- `src/components/scene/Scene3D.jsx` and `index.js` (the **stub** Rakshith builds against)
- empty folders: `src/lib`, `src/components/ui`, `src/dev`, `public/data`, `public/terrain`, `scripts/pavan`
- `docs/` (all the plan, rules, briefs, progress and notes files, plus both single-file prompts)
- `LICENSE` (MIT; edit the names) and `README.md` (skeleton)

## Part C. Two small manual edits

1. `package.json`: in `"scripts"` add `"test": "vitest run"` (keep the existing scripts).
2. `.gitignore`: add these lines at the end:
   ```
   scripts/cache/
   .env
   .DS_Store
   ```

## Part D. Check it works

```bash
npm run dev      # the Vite page loads, no errors in the terminal
npm run build    # builds without errors, then stop
```

## Part E. First commit, branches, protection

```bash
git add .
git commit -m "scaffold: vite, deps, folders, docs, scene stub"
git push origin main

git checkout -b dev   && git push -u origin dev
git checkout -b pavan && git push -u origin pavan
git checkout dev && git checkout -b rakshith && git push -u origin rakshith
git checkout pavan
```

On GitHub:
1. **Settings → Collaborators:** add Rakshith.
2. **Settings → Branches:** add a rule for `main` (require a pull request before merging).

## Part F. Deploy early

1. vercel.com → Add New Project → import the repo. Framework: **Vite** (auto-detected). Production branch: `main`.
2. Open the live URL. It shows the default Vite page: that is fine for now.
3. Vercel also makes preview links for `dev`, `pavan` and `rakshith` automatically.

## Part G. Rakshith's laptop

```bash
git clone https://github.com/<you>/lunar-navigator.git
cd lunar-navigator
npm install
git checkout rakshith
npm run dev
```
He should see the Vite page. Then he can start his Antigravity session.

## Final check before the LLM sessions

- [ ] `main`, `dev`, `pavan`, `rakshith` exist on GitHub
- [ ] `docs/` is in the repo (all files)
- [ ] `src/components/scene/Scene3D.jsx` stub is in the repo
- [ ] `npm run dev` works on both laptops
- [ ] `main` is protected, Vercel is connected
- [ ] Pavan is on `pavan`, Rakshith is on `rakshith`

## What NOT to add now
- No app code, no data, no extra packages, no design work. The LLMs build all of that inside their own folders.
- Do not create `App.jsx` content yourself: Rakshith's LLM owns `App.jsx`, `main.jsx` and the UI.
