import React from 'react';
import { VerdictBadge } from './VerdictBadge.jsx';

/**
 * src/components/ui/BestWindows.jsx
 * Displays top recommended landing opportunities for a chosen site.
 */
export function BestWindows({
  site,
  windows = [],
  onLoadScenario
}) {
  if (!windows || windows.length === 0) return null;

  return (
    <div className="bg-[#070b14]/80 p-5 rounded-3xl border border-white/10 space-y-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-display font-bold text-slate-100 uppercase tracking-widest flex items-center gap-2">
          <span className="text-amber-400">★</span>
          <span>Ranked Optimal Landing Windows: {site?.name}</span>
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">RANKED BY ILLUMINATION DURATION</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {windows.map((w, idx) => (
          <div
            key={w.dateStr}
            className="bg-[#020409]/90 p-4 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3 hover:border-sky-500/40 transition-all duration-200 shadow-md group"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="font-mono font-bold text-xs text-sky-400 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500">#{idx + 1}</span> {w.dateStr}
              </span>
              <VerdictBadge verdict={{ level: w.level }} compact />
            </div>

            <div className="space-y-1.5 font-mono text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Total Illumination:</span>
                <span className="text-slate-100 font-bold">{(w.sunlitFraction * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Peak Night Blackout:</span>
                <span className="text-amber-300 font-bold">{w.longestDarkHours} h</span>
              </div>
              <div className="flex justify-between">
                <span>Direct Earth RF Link:</span>
                <span className="text-emerald-400 font-bold">{(w.earthVisibleFraction * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => onLoadScenario('A', site, `${w.dateStr}T00:00:00Z`)}
                className="py-1.5 px-2 bg-sky-500/10 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 rounded-xl text-[10px] font-medium transition-colors cursor-pointer text-center"
              >
                Load Alpha
              </button>
              <button
                onClick={() => onLoadScenario('B', site, `${w.dateStr}T00:00:00Z`)}
                className="py-1.5 px-2 bg-amber-500/10 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl text-[10px] font-medium transition-colors cursor-pointer text-center"
              >
                Load Bravo
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BestWindows;
