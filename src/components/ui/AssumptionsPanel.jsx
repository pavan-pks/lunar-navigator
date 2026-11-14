import React from 'react';

/**
 * src/components/ui/AssumptionsPanel.jsx
 * Comprehensive disclosure of all mathematical, astronomical, and physical modeling simplifications.
 */
export function AssumptionsPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  const assumptions = [
    {
      title: 'Smooth-Sphere Lunar Reference Datum',
      desc: 'Analytical solar and Earth elevation angles are computed relative to the mean spherical Moon (R = 1,737.4 km). Local slope tilts and micro-crater topography are illustrative in the 3D scene and not subtracted from mathematical sun elevation.'
    },
    {
      title: 'Geocenter Line-of-Sight & Parallax',
      desc: 'Earth direction is referenced to the Earth center-of-mass (geocenter). Topocentric parallax to specific ground antenna dishes (such as Goldstone, Madrid, or Canberra) introduces an angular deviation of up to ~0.26° at lunar limb.'
    },
    {
      title: 'Zero Light-Travel Time Delay',
      desc: 'Ephemeris sample times are evaluated instantaneously in Barycentric Dynamical Time (TDB/UTC). The ~1.28-second light travel time between Earth and the Moon is neglected.'
    },
    {
      title: 'Simplified Photovoltaic & Thermal Simulation',
      desc: 'Solar cells assume standard space-grade efficiency under unattenuated AM0 insolation (1,361 W/m²). Thermal survival heating assumes 20W constant electric heat during nocturnal shadow.'
    },
    {
      title: 'Illustrative Viability Verdicts',
      desc: 'Viability criteria (75% sunlit, ≤48h darkness, ≥50% Earth LOS) represent comparative engineering thresholds for mission trade studies, and do not represent formal NASA flight certification.'
    },
    {
      title: 'Ephemeris Coverage & Provenance',
      desc: 'Ephemeris spans 2027-01-01 to 2028-01-31 at 1-hour resolution, queried directly from the NASA/JPL Horizons Ephemeris System (target 301, center 500@399).'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#050914] border border-sky-500/30 max-w-2xl w-full rounded-3xl p-6 shadow-[0_16px_50px_rgba(0,0,0,0.9)] space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl text-amber-400">⚖️</span>
            <h3 className="font-display font-bold text-white text-base">Model Assumptions & Scientific Simplifications</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors cursor-pointer border border-white/10"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1 text-xs">
          {assumptions.map((a, idx) => (
            <div key={idx} className="p-3.5 bg-black/60 rounded-2xl border border-white/5 space-y-1">
              <span className="font-bold text-amber-400 font-mono text-xs block">{a.title}</span>
              <p className="text-slate-300 leading-relaxed text-[11px] font-mono">{a.desc}</p>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-white/10 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.3)]"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AssumptionsPanel;
