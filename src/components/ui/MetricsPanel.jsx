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
  const borderAccent = isAmber ? 'border-amber-500/20' : 'border-sky-500/20';

  const shadowM = shadowLength(objectHeightM, liveAngles?.sunEl ?? 0);
  const shadowMultiple = Number.isFinite(shadowM) ? (shadowM / objectHeightM).toFixed(1) : '∞';

  return (
    <div className={`bg-[#03060c]/90 rounded-2xl p-4 border ${borderAccent} space-y-4 text-xs shadow-inner`}>
      {/* Header with Viability Verdict */}
      <div className="border-b border-white/10 pb-3">
        <VerdictBadge verdict={verdict} />
      </div>

      {/* Live Celestial Positions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-semibold flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isAmber ? 'bg-amber-400' : 'bg-sky-400'}`}></span>
            Real-Time Ephemeris Vector
          </span>
          <span className="text-[9px] font-mono text-slate-500">JPL_REF: HORIZONS</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 font-mono">
          <div className="bg-black/50 p-3 rounded-xl border border-white/5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>SOLAR VECTOR</span>
              <span className="text-amber-400">☀️</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-slate-500">Elevation:</span>
              <span className={`font-bold text-sm ${accentColor}`}>
                {liveAngles ? `${liveAngles.sunEl.toFixed(1)}°` : '--'}
              </span>
            </div>
            <div className="flex justify-between items-baseline mt-0.5">
              <span className="text-[11px] text-slate-500">Azimuth:</span>
              <span className="text-slate-300 font-medium">
                {liveAngles ? `${liveAngles.sunAz.toFixed(1)}°` : '--'}
              </span>
            </div>
          </div>

          <div className="bg-black/50 p-3 rounded-xl border border-white/5 shadow-xs">
            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span>EARTH LOS</span>
              <span className="text-emerald-400">🌍</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-[11px] text-slate-500">Elevation:</span>
              <span className="font-bold text-sm text-emerald-400">
                {liveAngles ? `${liveAngles.earthEl.toFixed(1)}°` : '--'}
              </span>
            </div>
            <div className="flex justify-between items-baseline mt-0.5">
              <span className="text-[11px] text-slate-500">Azimuth:</span>
              <span className="text-slate-300 font-medium">
                {liveAngles ? `${liveAngles.earthAz.toFixed(1)}°` : '--'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Shadow & Horizon Proximity */}
      <div className="grid grid-cols-2 gap-2.5 font-mono text-[11px]">
        <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-400 block mb-0.5">Lander Mast Shadow ({objectHeightM}m)</span>
          <span className="font-bold text-slate-100 text-xs">
            {Number.isFinite(shadowM) ? `${shadowM.toFixed(1)} m` : 'Horizon Blocked'}
          </span>
          <span className="text-[9px] text-slate-500 block mt-0.5">
            {Number.isFinite(shadowM) ? `${shadowMultiple}× mast height` : 'Sub-horizon blackout'}
          </span>
        </div>

        <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-400 block mb-0.5">Proximity to Occultation</span>
          <div className="flex justify-between text-[10px] mt-0.5">
            <span className="text-slate-500">Next Sunset:</span>
            <span className="text-slate-200 font-semibold">{timeToSunset !== null ? `${timeToSunset}h` : 'No occultation'}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-slate-500">Next Earthset:</span>
            <span className="text-emerald-400 font-semibold">{timeToEarthset !== null ? `${timeToEarthset}h` : 'Direct LOS continuous'}</span>
          </div>
        </div>
      </div>

      {/* Window Aggregate Stats */}
      {stats && (
        <div className="bg-black/30 p-3 rounded-xl border border-white/5">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono block mb-2 font-semibold">
            14-Day Cumulative Window Telemetry
          </span>
          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Total Solar Illumination:</span>
              <span className="text-slate-100 font-bold">
                {(stats.sunlitFraction * 100).toFixed(1)}% <span className="text-slate-500 font-normal">({stats.sunlitHours}h)</span>
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Peak Thermal Blackout:</span>
              <span className={`font-bold ${stats.longestDarkHours > 48 ? 'text-amber-400' : 'text-slate-200'}`}>
                {stats.longestDarkHours} hours
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-white/5">
              <span className="text-slate-400">Solar Elevation (Peak / Mean):</span>
              <span className="text-slate-200">
                +{stats.maxSunEl}° / +{stats.meanSunEl}°
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Earth Direct RF Link:</span>
              <span className="text-slate-200">
                {(stats.earthVisibleFraction * 100).toFixed(1)}% <span className="text-slate-500 font-normal">(max gap: {stats.longestEarthGapHours}h)</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* A vs B Delta Comparison Column */}
      {compareStats && stats && (
        <div className="p-3 bg-black/60 rounded-xl border border-white/10 space-y-1 font-mono text-[11px] shadow-inner">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold mb-1.5 flex items-center gap-1.5">
            <span>◬</span> Trade Study Variance Delta
          </span>
          {(() => {
            const darkDelta = stats.longestDarkHours - compareStats.longestDarkHours;
            const sunDelta = (stats.sunlitFraction - compareStats.sunlitFraction) * 100;
            return (
              <>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Thermal Blackout Delta:</span>
                  <span className={`font-bold ${darkDelta > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {darkDelta > 0 ? `+${darkDelta.toFixed(0)}h longer darkness` : `${Math.abs(darkDelta).toFixed(0)}h shorter darkness`}
                  </span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span className="text-slate-400">Solar Energy Delta:</span>
                  <span className={`font-bold ${sunDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {sunDelta >= 0 ? `+${sunDelta.toFixed(1)}% solar advantage` : `${sunDelta.toFixed(1)}% deficit`}
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
