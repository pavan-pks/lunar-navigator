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
    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <span>🌟</span>
          <span>Top Landing Windows: {site?.name}</span>
        </h3>
        <span className="text-[10px] text-slate-500 font-mono">Ranked by Solar Coverage</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {windows.map((w, idx) => (
          <div
            key={w.dateStr}
            className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex flex-col justify-between space-y-2"
          >
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-1.5">
              <span className="font-mono font-bold text-xs text-sky-400">
                #{idx + 1} {w.dateStr}
              </span>
              <VerdictBadge verdict={{ level: w.level }} compact />
            </div>

            <div className="space-y-1 font-mono text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>Sunlit:</span>
                <span className="text-slate-200 font-bold">{(w.sunlitFraction * 100).toFixed(0)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Max Dark:</span>
                <span className="text-slate-200 font-bold">{w.longestDarkHours} h</span>
              </div>
              <div className="flex justify-between">
                <span>Earth LOS:</span>
                <span className="text-slate-200 font-bold">{(w.earthVisibleFraction * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
              <button
                onClick={() => onLoadScenario('A', site, `${w.dateStr}T00:00:00Z`)}
                className="py-1 px-2 bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 rounded text-[10px] font-medium transition-colors cursor-pointer"
              >
                Load into A
              </button>
              <button
                onClick={() => onLoadScenario('B', site, `${w.dateStr}T00:00:00Z`)}
                className="py-1 px-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 rounded text-[10px] font-medium transition-colors cursor-pointer"
              >
                Load into B
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BestWindows;
