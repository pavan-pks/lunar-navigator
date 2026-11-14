import React from 'react';

export const SCIENCE_CITATIONS = [
  {
    num: 1,
    source: 'NASA/JPL Horizons Ephemeris System',
    paper: 'Giorgini, J.D. et al. (1996). JPL Solar System Dynamics.',
    use: 'Sub-solar and sub-Earth coordinates on the Moon sampled hourly across 2027–2028 (Moon center #301, Earth geocenter 500@399).'
  },
  {
    num: 2,
    source: 'LRO Lunar Orbiter Laser Altimeter (LOLA)',
    paper: 'Smith, D.E. et al. (2010). Initial observations from LOLA on LRO. GRL, 37(18).',
    use: 'High-resolution 30-meter polar digital elevation models and crater rim slope statistics.'
  },
  {
    num: 3,
    source: 'Lunar Bioenergetics & 1/6 g Locomotion',
    paper: 'Pandolf, K.B., Givoni, B., & Goldman, R.F. (1977). Predicting energy expenditure with loads.',
    use: 'Metabolic watts equation scaled by lunar gravity multiplier (0.166 g) and spacesuit joint resistance (×1.35).'
  },
  {
    num: 4,
    source: 'LRO Diviner Lunar Radiometer Experiment',
    paper: 'Paige, D.A. et al. (2010). Diviner lunar radiometer experiment observations of cold traps. Science, 330.',
    use: 'Surface thermal model: diurnal range 40 K (-233°C) in shadow to 390 K (+117°C) at sunlit zenith; 20W night survival electrical load.'
  },
  {
    num: 5,
    source: 'Artemis Candidate Regions Assessment',
    paper: 'NASA Artemis III Science Definition Team Report (2020). NASA SP-20205009602.',
    use: 'Curated preset sites (Shackleton, Malapert, Haworth, Faustini, Amundsen, Nobile) and landing zone flight rules.'
  }
];

export function ScienceTab() {
  return (
    <div className="space-y-4 text-xs font-sans">
      <div>
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
          The Science Behind the Telemetry
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Every figure, angle, and threshold displayed in this application derives directly from published peer-reviewed planetary models and NASA orbital telemetry.
        </p>
      </div>

      <div className="space-y-3 font-mono">
        {SCIENCE_CITATIONS.map((c) => (
          <div key={c.num} className="p-3 bg-[#171311] rounded-xl border border-white/10 space-y-1 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-400 font-bold flex items-center justify-center text-[10px]">
                {c.num}
              </span>
              <strong className="text-slate-100">{c.source}</strong>
            </div>
            <div className="text-[10px] text-slate-400 pl-7">{c.paper}</div>
            <p className="text-slate-300 pl-7 pt-1 leading-relaxed text-[10.5px]">
              <strong className="text-slate-400">Application:</strong> {c.use}
            </p>
          </div>
        ))}
      </div>

      {/* About Project */}
      <div className="p-3.5 bg-black/60 rounded-xl border border-white/10 space-y-2 text-[11px] font-mono">
        <span className="text-slate-300 font-bold uppercase block border-b border-white/10 pb-1">
          About Lunar Navigator
        </span>
        <p className="text-slate-400 leading-relaxed">
          Developed for the 2026 NASA Space Apps Challenge, <em>Lunar Landing Site Navigator</em>. Built to empower Artemis mission planners and the public to analyze polar solar illumination, Earth communication windows, and battery endurance with zero guesswork.
        </p>
        <p className="text-slate-500 text-[10px]">
          MIT Open Source License • Clean Client-Side Architecture (zero tracking, zero backend dependencies).
        </p>
      </div>
    </div>
  );
}

export default ScienceTab;
