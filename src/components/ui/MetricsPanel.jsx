import React from 'react';
import { VerdictBadge } from './VerdictBadge.jsx';
import { shadowLength } from '../../lib/metrics.js';

/**
 * src/components/ui/MetricsPanel.jsx
 * Dense telemetry metrics, live angles, window aggregates, shadow lengths, and A/B comparison delta.
 */
export function MetricsPanel({
  liveAngles,
  stats,
  verdict,
  objectHeightM = 3.0,
  timeToSunset = null,
  timeToEarthset = null,
  compareStats = null,
  colorVariant = 'sky'
}) {
  const isAmber = colorVariant === 'amber';
  const accentColor = isAmber ? 'text-amber-400' : 'text-sky-400';

  const shadowM = shadowLength(objectHeightM, liveAngles?.sunEl ?? 0);
  const shadowMultiple = Number.isFinite(shadowM) ? (shadowM / objectHeightM).toFixed(1) : '∞';

  return (
    <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-3 text-xs">
      {/* Header with Viability Verdict */}
      <div className="border-b border-slate-800/80 pb-2">
        <VerdictBadge verdict={verdict} />
      </div>

      {/* Live Celestial Positions */}
      <div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block mb-1">
          Instantaneous Telemetry
        </span>
        <div className="grid grid-cols-2 gap-2 font-mono">
          <div className="bg-slate-900/80 p-2 rounded border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">Sun Position</span>
            <div className="flex justify-between items-baseline mt-0.5">
              <span className="text-[11px] text-slate-400">El:</span>
              <span className={`font-bold ${accentColor}`}>
                {liveAngles ? `${liveAngles.sunEl.toFixed(1)}°` : '--'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-slate-400">Az:</span>
              <span className="text-slate-200">
                {liveAngles ? `${liveAngles.sunAz.toFixed(1)}°` : '--'}
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 p-2 rounded border border-slate-800/60">
            <span className="text-[10px] text-slate-400 block">Earth Line-of-Sight</span>
            <div className="flex justify-between items-baseline mt-0.5">
              <span className="text-[11px] text-slate-400">El:</span>
              <span className="font-bold text-emerald-400">
                {liveAngles ? `${liveAngles.earthEl.toFixed(1)}°` : '--'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-slate-400">Az:</span>
              <span className="text-slate-200">
                {liveAngles ? `${liveAngles.earthAz.toFixed(1)}°` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shadow & Horizon Proximity */}
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
        <div className="bg-slate-900/50 p-2 rounded border border-slate-800/40">
          <span className="text-[10px] text-slate-400 block">Shadow ({objectHeightM}m mast)</span>
          <span className="font-bold text-slate-200">
            {Number.isFinite(shadowM) ? `${shadowM.toFixed(1)} m` : 'Continuous Shadow'}
          </span>
          <span className="text-[10px] text-slate-500 block">
            {Number.isFinite(shadowM) ? `${shadowMultiple}× height` : 'Sun below horizon'}
          </span>
        </div>

        <div className="bg-slate-900/50 p-2 rounded border border-slate-800/40">
          <span className="text-[10px] text-slate-400 block">Time to Event</span>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Sunset:</span>
            <span className="text-slate-200">{timeToSunset !== null ? `${timeToSunset}h` : 'None in win'}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-400">Earthset:</span>
            <span className="text-slate-200">{timeToEarthset !== null ? `${timeToEarthset}h` : 'Always visible'}</span>
          </div>
        </div>
      </div>

      {/* Window Aggregate Stats */}
      {stats && (
        <div>
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono block mb-1">
            14-Day Cumulative Statistics
          </span>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-400">Sunlit Fraction:</span>
              <span className="text-slate-200 font-bold">
                {(stats.sunlitFraction * 100).toFixed(1)}% ({stats.sunlitHours}h)
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-400">Longest Darkness:</span>
              <span className={`font-bold ${stats.longestDarkHours > 48 ? 'text-amber-400' : 'text-slate-200'}`}>
                {stats.longestDarkHours} h
              </span>
            </div>
            <div className="flex justify-between py-0.5 border-b border-slate-800/40">
              <span className="text-slate-400">Sun Elevation (Peak / Mean):</span>
              <span className="text-slate-200">
                +{stats.maxSunEl}° / +{stats.meanSunEl}°
              </span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-400">Earth LOS Coverage:</span>
              <span className="text-slate-200">
                {(stats.earthVisibleFraction * 100).toFixed(1)}% (gap: {stats.longestEarthGapHours}h)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* A vs B Delta Comparison Column */}
      {compareStats && stats && (
        <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1 font-mono text-[11px]">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mb-0.5">
            Scenario Variance
          </span>
          {(() => {
            const darkDelta = stats.longestDarkHours - compareStats.longestDarkHours;
            const sunDelta = (stats.sunlitFraction - compareStats.sunlitFraction) * 100;
            return (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-400">Darkness diff:</span>
                  <span className={darkDelta > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                    {darkDelta > 0 ? `+${darkDelta.toFixed(0)}h more dark` : `${Math.abs(darkDelta).toFixed(0)}h less dark`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sunlight diff:</span>
                  <span className={sunDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                    {sunDelta >= 0 ? `+${sunDelta.toFixed(1)}% more sun` : `${sunDelta.toFixed(1)}% less sun`}
                  </span>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default MetricsPanel;
