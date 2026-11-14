import React, { useState } from 'react';

/**
 * src/components/ui/Footer.jsx
 * Application footer with telemetry attribution, data provenance, and assumptions toggle.
 */
export function Footer() {
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <footer className="bg-[#020409] border-t border-sky-500/15 text-slate-400 text-xs py-8 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <p className="text-slate-200 font-display font-semibold text-sm tracking-wide">
            Lunar Landing Site Navigator — NASA Space Apps Challenge 2026
          </p>
          <p className="text-[11px] text-slate-500 font-mono max-w-2xl leading-relaxed">
            Data sourced from NASA/JPL Horizons Ephemeris System (Moon Barycenter #301, geocenter observer 500@399). Landing zones validated against NASA Artemis III candidate region portfolios and LOLA/LROC DEM topography.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <button
            onClick={() => setShowAssumptions(prev => !prev)}
            className="text-sky-400 hover:text-sky-300 transition-colors cursor-pointer px-3 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20"
          >
            {showAssumptions ? '▲ Close Model Assumptions' : '▼ Flight Rules & Assumptions'}
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-slate-500 text-[11px]">MIT Open Source</span>
        </div>
      </div>

      {showAssumptions && (
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-slate-300 font-mono">
          <div className="p-4 bg-black/60 rounded-2xl border border-white/10 space-y-1">
            <span className="font-semibold text-sky-300 block mb-1">Spherical Lunar Datum</span>
            Local slope and micro-shadows are rendered via Three.js bump and elevation shaders. Solar elevation angles correspond to the mean spherical lunar radius (1737.4 km).
          </div>
          <div className="p-4 bg-black/60 rounded-2xl border border-white/10 space-y-1">
            <span className="font-semibold text-emerald-300 block mb-1">Geocenter RF Parallax</span>
            Direct Earth Line-of-Sight is evaluated against Earth geocenter coordinates; topocentric parallax introduces up to ~0.26° elevation offset at lunar limb.
          </div>
          <div className="p-4 bg-black/60 rounded-2xl border border-white/10 space-y-1">
            <span className="font-semibold text-amber-300 block mb-1">Diurnal Thermal / PV Physics</span>
            Survival heating incorporates a 20W continuous baseload during occultation. Solar cells are rated at AM0 space insolation (1361 W/m²) with cosine incident angle attenuation.
          </div>
        </div>
      )}
    </footer>
  );
}

export default Footer;
