import React from 'react';

/**
 * src/components/ui/SampleDataBanner.jsx
 * Displays a prominent warning banner when synthetic ephemeris data is in use.
 */
export function SampleDataBanner({ isFake = false }) {
  if (!isFake) return null;

  return (
    <div
      role="alert"
      className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2 text-xs font-mono font-medium flex items-center justify-between backdrop-blur-md"
    >
      <div className="flex items-center gap-2.5 mx-auto">
        <span className="inline-block px-2 py-0.5 rounded-full bg-amber-400 text-black font-bold text-[9px] tracking-wider uppercase shadow-[0_0_10px_rgba(245,158,11,0.5)]">
          SYNTHETIC EPHEMERIS
        </span>
        <span className="text-[11px]">
          Simulated trajectory model in use. Run <code className="bg-black/50 px-1.5 py-0.5 rounded text-amber-300 border border-amber-500/20">python scripts/fetch_horizons.py</code> to fetch authentic NASA/JPL data.
        </span>
      </div>
    </div>
  );
}

export default SampleDataBanner;
