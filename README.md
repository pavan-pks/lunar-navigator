# Lunar Landing Site Navigator

**NASA Space Apps Challenge 2026** — Lunar Landing Site Navigator Entry  
A mission-planning and flight-dynamics analysis platform for evaluating lunar south-pole landing sites and launch windows across Artemis, CLPS, and commercial lunar exploration sorties.

---

## 1. Overview & Objective

Operating near the lunar south pole presents extreme engineering challenges: grazing solar incidence (typically $1.5^\circ$ to $3.0^\circ$ above the horizon), perpetual topographic shadows cast by crater rims, fluctuating direct Earth line-of-sight due to lunar libration ($27.2\text{ day}$ period), and severe cryogenic temperatures ($<40\text{ K}$) inside Permanently Shadowed Regions (PSRs).

**Lunar Landing Site Navigator** evaluates landing sites and mission dates against strict flight rules:
- Will the solar arrays remain illuminated, or will long nocturnal blackouts drain the batteries?
- Can the spacecraft maintain Direct-to-Earth (DTE) communication with the Deep Space Network?
- Is the terrain safe for touchdown relative to the $15^\circ$ lander tip-over limit?

---

## 2. Key Modules & Analytical Capabilities

### 2.1 4-Factor Multi-Disciplinary Suitability Index
Every candidate landing site and window is evaluated using a weighted composite score ($0\text{--}100$):
- **Solar Illumination (35% weight):** Cumulative daylight fraction over the sortie window.
- **Night Survival / Battery Margin (25% weight):** Penalizes unbroken continuous darkness ($0\text{h}$ blackout $= 100$, $>120\text{h}$ darkness $= 10$).
- **Direct-to-Earth Communication (25% weight):** Line-of-sight availability percentage with the Goldstone, Madrid, and Canberra ground segments. Evaluates to $0\%$ on the lunar far side.
- **Terrain Slope & Safety (15% weight):** Evaluates landing site slope against the $15^\circ$ footpad tip-over limit: $\text{Score} = \max(0, \text{round}((1 - \text{slope} / 15^\circ) \times 100))$.

### 2.2 Permanently Shadowed Region (PSR) Identification
Identifies critical volatile cold traps adjacent to landing sites:
- **Shackleton, Haworth, Faustini, de Gerlache, Amundsen, Nobile:** Flagged with explicit PSR proximity tags, volatile ice cold-trap targets, and nominal slope margins.
- **Highland & Mare Baselines:** Clearly demarcated as non-PSR diurnal reference locations.

### 2.3 Electrochemical Battery & Power Simulator (`src/lib/energy.js`)
- Diurnal solar harvesting vs. night survival electric heating draw ($20\text{ W}$ baseline).
- Supports horizontal deck arrays, vertical sun-tracking masts ($>28\times$ energy capture advantage at grazing polar angles), and fixed azimuth masts.
- State-of-charge (SoC Wh) timeline and depth-of-discharge limit analysis ("*Will it survive the night?*").

### 2.4 Trajectory Flight Budget & Launch Dynamics
- Interactive launch date, transit duration ($3\text{--}14\text{ days}$), and launch slip slider ($0\text{--}30\text{ days}$).
- **Trajectory Budget Breakdown Tooltip:**
  - **Apollo / Artemis Direct Transfer:** $3\text{--}5\text{ days}$ transit, $\text{TLI } \Delta v \approx 3,150\text{ m/s}$, $\text{LOI } \Delta v \approx 850\text{ m/s}$, $\text{Total } \Delta v \approx 4,000\text{ m/s}$.
  - **Low-Energy Weak Stability Boundary (WSB / BLT):** $90\text{--}120\text{ days}$ transit via Sun-Earth L1/L2 (saves $\sim 18\%$ / $750\text{ m/s}$ $\Delta v$, $\text{Total } \Delta v \approx 3,250\text{ m/s}$).

### 2.5 Opportunity Calendar Heatmap Matrix
- Full-year ($2027\text{--}2028$) multi-site landing matrix evaluated in $3\text{--}\text{day}$ steps.
- Interactive live window inspection: click any cell to view solar coverage %, continuous night hours, Earth comms %, and apply directly to the main mission plan with one click.

### 2.6 Photorealistic 3D Orbit & Astronaut EVA Surface Simulation
- High-performance Three.js/R3F rendering with ACES Filmic tone mapping and PCF soft shadow maps.
- Authentic regolith albedo, micro-cratering bump mapping, and weathered rock boulders.
- Grounded Artemis/Apollo lander, interactive metric shadow ruler ($L = H / \tan(h)$), slope hazard heatmap ($<6^\circ$ Safe, $6^\circ\text{--}15^\circ$ Caution, $>15^\circ$ Hazard), and astronaut helmet visor HUD.

### 2.7 Formal Mission Report Export
- Print-optimized view with clean CSS formatting and native PDF export (`window.print()`).
- Packages site coordinates, landing epoch, viability verdict, 4-factor suitability score, and full scientific disclosures.

---

## 3. Scientific Calculation Rules & Ephemeris

- **Sunlit Threshold:** Sun is considered up when solar elevation angle $h > -0.27^\circ$ (accounting for the apparent solar angular semi-diameter at $1\text{ AU}$).
- **Earth Visibility Threshold:** Earth is considered visible when elevation $h > 0.0^\circ$ (geometric horizon).
- **Shadow Geometry:** Upright mast shadow length is computed as $L = H / \tan(h)$ for height $H$.
- **Ephemeris Source:** NASA JPL Horizons System (DE440 ephemeris, observer center 500@301), sampled at regular intervals across 2027–2028.

---

## 4. Modeling Assumptions & Disclosures

1. **Smooth-Sphere Lunar Reference Datum:** Analytical solar and Earth elevation angles are referenced to the mean spherical Moon ($R = 1,737.4\text{ km}$). 3D local terrain relief and slopes are illustrative and do not occlude the analytical ephemeris horizon.
2. **Geocenter Line-of-Sight:** Earth line-of-sight is referenced to Earth center-of-mass. Topocentric parallax across Deep Space Network ground antennas introduces an angular deviation of up to $\sim 0.26^\circ$ at the lunar limb.
3. **Zero Light-Travel Time Delay:** Evaluated instantaneously in Barycentric Dynamical Time (TDB/UTC); the $\sim 1.28\text{ s}$ light travel time between Earth and the Moon is neglected.
4. **Photovoltaic Flux:** Solar panels assume unattenuated AM0 insolation ($1,361\text{ W/m}^2$).

---

## 5. Local Setup & Testing

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22)
- npm 9+

### Installation & Launch
```bash
# Clone and install dependencies
git clone https://github.com/mhabibkabbo/Lunar-Navigator.git
cd lunar-navigator
npm install

# Start development server
npm run dev

# Run automated unit test suite (39 tests)
npm run test

# Compile production build
npm run build
```

---

## 6. Architecture & Tech Stack

- **Core Framework:** React 19, Vite 6
- **3D Graphics & Shaders:** Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`)
- **Styling:** Tailwind CSS 4, Framer Motion
- **Data Visualizations:** Recharts (Elevation timelines, battery state-of-charge curves)
- **Icons & Assets:** Lucide React (zero emojis across the interface for a restrained aerospace aesthetic)
- **Test Suite:** Vitest (comprehensive unit test coverage for geometry, metrics, energy balance, validation, and URL state)

---

## 7. Data Credits & Provenance

- **Ephemeris Data:** NASA Jet Propulsion Laboratory (JPL) Horizons On-Line Ephemeris System.
- **Topographic Context:** NASA Lunar Reconnaissance Orbiter (LRO) Lunar Orbiter Laser Altimeter (LOLA) and LROC QuickMap.
- **Thermal Baselines:** NASA LRO Diviner Lunar Radiometer Experiment.
- **Landing Site Coordinates:** NASA Artemis Candidate Landing Regions and NASA CLPS Initiatives.

*Disclaimer: This project was developed as an educational and analytical entry for the NASA Space Apps Challenge 2026. It is not an official NASA mission operation tool and is not endorsed by NASA.*

---

## 8. License

MIT License. See [LICENSE](LICENSE) for details.
