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
      className="bg-amber-500/20 border-b border-amber-500/50 text-amber-200 px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between"
    >
      <div className="flex items-center gap-2 mx-auto">
        <span className="inline-block px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold text-[10px] tracking-wide uppercase">
          Sample Data
        </span>
        <span>
          Synthetic lunar ephemeris prototype. Run <code className="bg-black/40 px-1 py-0.5 rounded text-amber-300">python scripts/fetch_horizons.py</code> to load real NASA/JPL data.
        </span>
      </div>
    </div>
  );
}

export default SampleDataBanner;
