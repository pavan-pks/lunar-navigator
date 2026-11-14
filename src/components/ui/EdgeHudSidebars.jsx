import React from 'react';
import { ScrambleValue } from './ScrambleValue.jsx';

/**
 * The "Edge HUD" Telemetry Sidebars:
 * Placed strictly on the left and right margins of the viewport,
 * leaving the center 60% completely transparent for 3D orbit controls.
 * Features single-value result cards with scrambling decipher animations.
 */
export function EdgeHudSidebars({
  sites,
  selectedSiteId,
  customSite,
  onSelectSite,
  live,
  stats,
  verdict,
  powerEfficiencyPct,
  timeToSunset,
  timeToEarthset,
  isCollapsed = false
}) {
  const sunElStr = live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`;
  const earthElStr = live.earthEl > 0 ? `+${live.earthEl.toFixed(1)}°` : `${live.earthEl.toFixed(1)}°`;
  const commsWindowStr = `${(stats.earthVisibleFraction * 100).toFixed(0)}%`;
  const peakDarkStr = `${stats.longestDarkHours}h`;
  const timeToEarthsetStr = timeToEarthset !== null ? `${timeToEarthset}h` : 'No Earthset';
  const timeToSunsetStr = timeToSunset !== null ? `${timeToSunset}h` : 'Continuous';
  const solarGenStr = `${powerEfficiencyPct}%`;

  return (
    <>
      {/* === LEFT TELEMETRY SIDEBAR === */}
      <aside
        className={`absolute left-4 top-20 bottom-28 w-72 sm:w-80 flex flex-col justify-between pointer-events-auto transition-all duration-500 z-20 ${
          isCollapsed ? '-translate-x-[120%] opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_25px_rgba(56,189,248,0.12)] space-y-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff] animate-ping"></span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300">
                  PRIMARY TARGETING
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-400">SYS 01</span>
            </div>

            {/* Site Selector Dropdown */}
            <div className="space-y-1">
              <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">
                Designate Landing Crater:
              </label>
              <select
                value={customSite ? 'custom' : selectedSiteId}
                onChange={(e) => {
                  if (e.target.value !== 'custom') onSelectSite(e.target.value);
                }}
                className="w-full bg-black/60 border border-cyan-500/30 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              >
                {customSite && <option value="custom">{customSite.name}</option>}
                {sites.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`} S)
                  </option>
                ))}
              </select>
            </div>

            {/* Quick-select buttons */}
            <div className="flex flex-wrap gap-1.5 pt-2">
              {sites.slice(0, 4).map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSite(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono transition cursor-pointer border ${
                    selectedSiteId === s.id && !customSite
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_8px_rgba(56,189,248,0.3)]'
                      : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Single-Value Result Cards: Solar & Thermal */}
          <div className="space-y-2.5">
            <div className="text-[9px] font-mono uppercase tracking-widest text-amber-400 font-bold border-b border-amber-500/20 pb-1">
              SOLAR & POWER DYNAMICS
            </div>

            {/* Card 1: Sun Elevation */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">SUN ELEVATION</span>
                <span className="text-[9px] font-mono text-slate-500">Above Horizon</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-amber-300">
                <ScrambleValue value={sunElStr} />
              </div>
            </div>

            {/* Card 2: Time to Sunset */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">TIME TO SUNSET</span>
                <span className="text-[9px] font-mono text-slate-500">Until Nightfall</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-amber-300">
                <ScrambleValue value={timeToSunsetStr} />
              </div>
            </div>

            {/* Card 3: Peak Darkness */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">PEAK DARKNESS</span>
                <span className="text-[9px] font-mono text-slate-500">Survival Battery</span>
              </div>
              <div className={`text-xl font-mono font-extrabold ${stats.longestDarkHours > 48 ? 'text-amber-400' : 'text-emerald-400'}`}>
                <ScrambleValue value={peakDarkStr} />
              </div>
            </div>

            {/* Card 4: Solar Yield */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">SOLAR YIELD</span>
                <span className="text-[9px] font-mono text-slate-500">Array Capacity</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-amber-300">
                <ScrambleValue value={solarGenStr} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* === RIGHT TELEMETRY SIDEBAR === */}
      <aside
        className={`absolute right-4 top-20 bottom-28 w-72 sm:w-80 flex flex-col justify-between pointer-events-auto transition-all duration-500 z-20 ${
          isCollapsed ? 'translate-x-[120%] opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="bg-slate-900/40 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_25px_rgba(56,189,248,0.12)] space-y-4 flex-1 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f0ff]"></span>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-cyan-300">
                  DEEP SPACE NETWORK
                </span>
              </div>
              <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${
                live.earthEl > 0 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              }`}>
                {live.earthEl > 0 ? 'DSN LOCKED' : 'OCCULTED'}
              </span>
            </div>

            <div className="text-[10px] font-mono text-slate-400 space-y-1">
              <div className="flex justify-between">
                <span>Direct Ground Link:</span>
                <strong className="text-white">Goldstone / Madrid</strong>
              </div>
              <div className="flex justify-between">
                <span>Signal Frequency:</span>
                <strong className="text-cyan-300">Ka-Band 32 GHz</strong>
              </div>
            </div>
          </div>

          {/* Single-Value Result Cards: Earth & Comms */}
          <div className="space-y-2.5">
            <div className="text-[9px] font-mono uppercase tracking-widest text-cyan-400 font-bold border-b border-cyan-500/20 pb-1">
              DIRECT-TO-EARTH COMMS
            </div>

            {/* Card 5: Earth Elevation */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">EARTH ELEVATION</span>
                <span className="text-[9px] font-mono text-slate-500">Boresight Angle</span>
              </div>
              <div className={`text-xl font-mono font-extrabold ${live.earthEl > 0 ? 'text-cyan-300' : 'text-rose-400'}`}>
                <ScrambleValue value={earthElStr} />
              </div>
            </div>

            {/* Card 6: Time to Earthset */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">TIME TO EARTHSET</span>
                <span className="text-[9px] font-mono text-slate-500">LOS Margin</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-cyan-300">
                <ScrambleValue value={timeToEarthsetStr} />
              </div>
            </div>

            {/* Card 7: Comms Window */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">COMMS WINDOW</span>
                <span className="text-[9px] font-mono text-slate-500">14-Day Surface Contact</span>
              </div>
              <div className="text-xl font-mono font-extrabold text-cyan-300">
                <ScrambleValue value={commsWindowStr} />
              </div>
            </div>

            {/* Card 8: Mission Status */}
            <div className="bg-black/50 border border-white/5 rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-mono uppercase text-slate-400 block">FLIGHT VERDICT</span>
                <span className="text-[9px] font-mono text-slate-500">Artemis Safety Standard</span>
              </div>
              <div className={`text-lg font-mono font-extrabold ${
                verdict.status === 'VIABLE' ? 'text-emerald-400' : verdict.status === 'MARGINAL' ? 'text-amber-400' : 'text-rose-400'
              }`}>
                <ScrambleValue value={verdict.badge} />
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default EdgeHudSidebars;
