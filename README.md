# Lunar Landing Site Navigator

NASA Space Apps Challenge 2026 entry. Compare lunar south pole landing sites and dates:
see where the Sun and Earth are, how shadows move, whether a lander has power and a
line of sight to Earth, and whether a battery survives the night.

**Live demo:** (add Vercel link)
**Demo video:** (add link)

## Run locally

```bash
npm install
npm run dev        # app
npm run test       # unit tests
```

3D scene test page (while `npm run dev` is running): `http://localhost:5173/sandbox-pavan.html`

## How it works

- `scripts/fetch_horizons.py` downloads the Moon's sub-solar and sub-Earth points from NASA/JPL Horizons into `public/data/global_ephem.json`.
- The app computes Sun and Earth elevation and azimuth for any lunar site from those points, then metrics, a viability verdict, a launch-window calendar and a battery simulation.
- A three.js scene draws terrain, a lander, the Sun, Earth and shadows.

See `docs/` for the full plan, contracts and progress.

## Assumptions

(Copy from the in-app Assumptions panel before submission.)

## Data and credits

- Ephemeris: NASA/JPL Horizons System.
- (Add any other source, with its terms link.)
- This project is not affiliated with or endorsed by NASA.

## License

MIT, see `LICENSE`.
