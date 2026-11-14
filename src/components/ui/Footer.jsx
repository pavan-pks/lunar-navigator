import React, { useState } from 'react';

/**
 * src/components/ui/Footer.jsx
 * Application footer with telemetry attribution, data provenance, and assumptions toggle.
 */
export function Footer() {
  const [showAssumptions, setShowAssumptions] = useState(false);

  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-500 text-xs py-6 px-4 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <p className="text-slate-400 font-medium">
            Lunar Landing Site Navigator — NASA Space Apps Challenge 2026
          </p>
          <p className="text-[11px] text-slate-600">
            Data sourced from NASA/JPL Horizons System (target 301, center 500@399). Surface presets from NASA Artemis Candidate Regions and LROC.
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={() => setShowAssumptions(prev => !prev)}
            className="text-slate-400 hover:text-sky-400 underline underline-offset-2 transition-colors cursor-pointer"
          >
            {showAssumptions ? 'Hide Model Assumptions' : 'View Model Assumptions'}
          </button>
          <span className="text-slate-700">|</span>
          <span className="text-slate-600 font-mono text-[11px]">MIT Open Source</span>
        </div>
      </div>

      {showAssumptions && (
        <div className="max-w-7xl mx-auto mt-4 pt-4 border-t border-slate-900 grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px] text-slate-400">
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/80">
            <span className="font-semibold text-slate-300 block mb-1">Spherical Moon Approximation</span>
            Local slope and crater wall micro-shadows are illustrative in the 3D patch. Solar elevation is computed relative to the mean spherical lunar datum.
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/80">
            <span className="font-semibold text-slate-300 block mb-1">Geocenter Line-of-Sight</span>
            Earth line-of-sight elevation uses Earth geocenter coordinates; topocentric parallax introduces up to ~0.26° elevation offset at lunar limb.
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/80">
            <span className="font-semibold text-slate-300 block mb-1">Simplified Thermal / Battery Model</span>
            Night heating assumes 20W base thermal electric heaters. Solar cells assume single-junction silicon/GaAs equivalent peak rating under AM0 lunar insolation.
          </div>
        </div>
      )}
    </footer>
  );
}

export default Footer;
