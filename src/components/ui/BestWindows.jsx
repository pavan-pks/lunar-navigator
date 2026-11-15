import React from 'react';
import { Sparkles, Check, GitCompare } from 'lucide-react';
import { VerdictBadge } from './VerdictBadge.jsx';

/**
 * Format ISO date string into human-friendly format (e.g. "Jan 04, 2027")
 */
function formatWindowDate(dateStr) {
  try {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  } catch {
    return dateStr;
  }
}

/**
 * src/components/ui/BestWindows.jsx
 * Displays top recommended landing opportunities for a chosen site
 * in the site's minimalist glass visual language with plain-language metrics.
 */
export function BestWindows({
  site,
  windows = [],
  currentLandingDateStr = '',
  onSelectWindow,
  onCompareWindow
}) {
  if (!windows || windows.length === 0) return null;

  return (
    <div className="bg-black/80 p-4 sm:p-5 rounded-2xl border border-white/10 space-y-4 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <h3 className="text-xs font-sans font-medium text-white tracking-wide">
            Recommended Landing Opportunities · <span className="text-neutral-300">{site?.name}</span>
          </h3>
        </div>
        <span className="text-[11px] font-sans text-neutral-400">
          Ranked by maximum sunlight and battery safety
        </span>
      </div>

      {/* Grid of Recommended Windows */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {windows.map((w, idx) => {
          const isCurrentPlan = currentLandingDateStr && currentLandingDateStr.startsWith(w.dateStr);

          // Plain-English subtitles
          const sunSub = w.sunlitFraction >= 0.99
            ? 'Continuous daylight (336 hrs)'
            : `${(w.sunlitFraction * 336).toFixed(0)} hrs daylight`;

          const nightSub = w.longestDarkHours === 0
            ? 'No night (zero heater drain)'
            : w.longestDarkHours <= 48
            ? 'Manageable battery reserve'
            : 'Excessive cold hazard';

          const earthSub = w.earthVisibleFraction >= 0.8
            ? 'Continuous direct link'
            : 'Occasional rim occlusion';

          return (
            <div
              key={w.dateStr}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                isCurrentPlan
                  ? 'bg-sky-950/20 border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                  : 'bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/8'
              }`}
            >
              {/* Card Title & Badges */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-semibold text-sm text-white">
                      {formatWindowDate(w.dateStr)}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-500">#{idx + 1}</span>
                  </div>
                  <span className="text-[10px] font-mono text-neutral-400">{w.dateStr}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {isCurrentPlan && (
                    <span className="px-2 py-0.5 rounded-full bg-sky-900/60 border border-sky-400/50 text-sky-200 text-[10px] font-sans">
                      Current Plan
                    </span>
                  )}
                  <VerdictBadge verdict={{ level: w.level }} compact />
                </div>
              </div>

              {/* Simplified Human-Friendly Metrics */}
              <div className="space-y-2 text-[11px] font-sans">
                {/* Sunlight */}
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-neutral-300 block font-medium">Daylight Coverage</span>
                    <span className="text-[10px] text-neutral-500 block">{sunSub}</span>
                  </div>
                  <span className="font-mono text-white font-medium text-sm tabular-nums">
                    {(w.sunlitFraction * 100).toFixed(0)}%
                  </span>
                </div>

                {/* Longest Night */}
                <div className="flex items-baseline justify-between border-t border-white/5 pt-1.5">
                  <div>
                    <span className="text-neutral-300 block font-medium">Longest Night</span>
                    <span className="text-[10px] text-neutral-500 block">{nightSub}</span>
                  </div>
                  <span className={`font-mono font-medium text-sm tabular-nums ${w.longestDarkHours > 48 ? 'text-amber-300' : 'text-neutral-200'}`}>
                    {w.longestDarkHours}h
                  </span>
                </div>

                {/* Earth Visibility */}
                <div className="flex items-baseline justify-between border-t border-white/5 pt-1.5">
                  <div>
                    <span className="text-neutral-300 block font-medium">Earth Visibility</span>
                    <span className="text-[10px] text-neutral-500 block">{earthSub}</span>
                  </div>
                  <span className="font-mono text-emerald-400 font-medium text-sm tabular-nums">
                    {(w.earthVisibleFraction * 100).toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => onSelectWindow?.(site, `${w.dateStr}T00:00:00Z`)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-sans font-medium transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    isCurrentPlan
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 cursor-default'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {isCurrentPlan ? (
                    <>
                      <Check size={12} />
                      <span>Active</span>
                    </>
                  ) : (
                    <span>Set Date</span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onCompareWindow?.(site, `${w.dateStr}T00:00:00Z`)}
                  className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 rounded-lg text-xs font-sans transition cursor-pointer flex items-center justify-center gap-1.5"
                  title="Compare this landing opportunity against other dates"
                >
                  <GitCompare size={12} />
                  <span>Compare</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BestWindows;
