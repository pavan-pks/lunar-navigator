import React from 'react';
import { ScrambleValue } from './ScrambleValue.jsx';

/**
 * Elegant Floating Astronomical Telemetry (De-Boxed UI):
 * Free of heavy card boxes, glowing neons, and bulky containers.
 * Uses spacious geometric sans-serif typography with monospace numerical readouts,
 * whisper-thin dividers (border-white/5), and generous negative space.
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
  isCollapsed = false,
  onEnterSurface,
  showEnterSurface = false,
  isDescending = false,
  hasLanded = false,
  viewMode = 'orbit',
  onReturnToOrbit,
}) {
  const sunElStr = live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`;
  const earthElStr = live.earthEl > 0 ? `+${live.earthEl.toFixed(1)}°` : `${live.earthEl.toFixed(1)}°`;
  const commsWindowStr = `${(stats.earthVisibleFraction * 100).toFixed(0)}%`;
  const peakDarkStr = `${stats.longestDarkHours}h`;
  const timeToEarthsetStr = timeToEarthset !== null ? `${timeToEarthset}h` : 'Constant';
  const timeToSunsetStr = timeToSunset !== null ? `${timeToSunset}h` : 'Constant';
  const solarGenStr = `${powerEfficiencyPct}%`;

  return (
    <>
      {/* === LEFT FLOATING TELEMETRY COLUMN === */}
      <aside
        className={`absolute left-8 sm:left-12 lg:left-14 top-24 bottom-28 w-64 sm:w-72 flex flex-col justify-between pointer-events-auto transition-all duration-700 ease-out z-20 ${
          isCollapsed ? '-translate-x-12 opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="flex-1 flex flex-col justify-between space-y-8 drop-shadow-sm">
          {/* Target Location Selector */}
          <div>
            <span className="text-[10px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block mb-2">
              Landing Target
            </span>
            <div className="relative">
              <select
                value={customSite ? 'custom' : selectedSiteId}
                onChange={(e) => {
                  if (e.target.value !== 'custom') onSelectSite(e.target.value);
                }}
                className="w-full bg-transparent border-b border-white/10 pb-1.5 text-[#f5f5f5] font-sans font-light text-sm focus:outline-none focus:border-white/40 cursor-pointer transition appearance-none"
              >
                {customSite && <option value="custom" className="bg-[#050505] text-[#f5f5f5]">{customSite.name}</option>}
                {sites.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#050505] text-[#f5f5f5]">
                    {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`})
                  </option>
                ))}
              </select>
              <span className="absolute right-0 top-1 text-xs text-[#a3a3a3] pointer-events-none font-light">↓</span>
            </div>

            {/* Subtle Site Switcher Pills */}
            <div className="flex flex-wrap gap-2 pt-3">
              {sites.slice(0, 4).map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSite(s.id)}
                  className={`text-[10px] font-sans tracking-wider transition cursor-none ${
                    selectedSiteId === s.id && !customSite
                      ? 'text-[#f5f5f5] border-b border-white'
                      : 'text-[#a3a3a3] hover:text-[#f5f5f5]'
                  }`}
                >
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Contextual Landing / Surface View button directly beneath coordinates */}
            {showEnterSurface && onEnterSurface && (
              <button
                onClick={() => {
                  if (hasLanded && viewMode === 'surface' && onReturnToOrbit) {
                    onReturnToOrbit();
                  } else {
                    onEnterSurface();
                  }
                }}
                disabled={isDescending}
                className="mt-4 text-[10px] font-sans font-light tracking-[0.2em] uppercase text-[#f5f5f5] border border-white/20 hover:border-white hover:bg-white hover:text-black px-4 py-2.5 transition duration-300 cursor-none disabled:opacity-40 w-full text-center"
              >
                {isDescending
                  ? 'Descent in Progress…'
                  : hasLanded
                  ? (viewMode === 'surface' ? 'Return to Orbit ↖' : 'Surface View (Landed) ↘')
                  : 'Initiate Landing Sequence ↘'}
              </button>
            )}
          </div>

          {/* Solar & Illumination Floating Metrics */}
          <div className="space-y-5">
            <span className="text-[9px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block border-b border-white/5 pb-1">
              Solar Geometry
            </span>

            {/* Metric 1: Sun Elevation */}
            <div>
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Sun Elevation
              </span>
              <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] mt-0.5">
                <ScrambleValue value={sunElStr} />
              </div>
            </div>

            {/* Metric 2: Time to Sunset */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Time to Sunset
              </span>
              <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] mt-0.5">
                <ScrambleValue value={timeToSunsetStr} />
              </div>
            </div>

            {/* Metric 3: Peak Darkness */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Peak Darkness
              </span>
              <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] mt-0.5">
                <ScrambleValue value={peakDarkStr} />
              </div>
            </div>

            {/* Metric 4: Photovoltaic Yield */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Photovoltaic Yield
              </span>
              <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] mt-0.5">
                <ScrambleValue value={solarGenStr} />
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* === RIGHT FLOATING TELEMETRY COLUMN === */}
      <aside
        className={`absolute right-8 sm:right-12 lg:right-14 top-24 bottom-28 w-64 sm:w-72 flex flex-col justify-between pointer-events-auto transition-all duration-700 ease-out z-20 ${
          isCollapsed ? 'translate-x-12 opacity-0' : 'translate-x-0 opacity-100'
        }`}
      >
        <div className="flex-1 flex flex-col justify-between space-y-8 drop-shadow-sm text-right">
          {/* Deep Space Network Status */}
          <div>
            <span className="text-[10px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block mb-1">
              Earth Link
            </span>
            <div className="text-xs font-sans font-light text-[#f5f5f5]">
              {live.earthEl > 0 ? 'Direct LOS Active' : 'Occulted by Rim'}
            </div>
            <div className="text-[10px] font-sans text-[#a3a3a3] mt-0.5">
              Goldstone · Madrid · Canberra
            </div>
          </div>

          {/* Communications Floating Metrics */}
          <div className="space-y-5">
            <span className="text-[9px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block border-b border-white/5 pb-1">
              Direct-to-Earth
            </span>

            {/* Metric 5: Earth Elevation */}
            <div>
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Earth Elevation
              </span>
              <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] mt-0.5">
                <ScrambleValue value={earthElStr} />
              </div>
            </div>

            {/* Metric 6: Time to Earthset */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Time to Earthset
              </span>
              <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] mt-0.5">
                <ScrambleValue value={timeToEarthsetStr} />
              </div>
            </div>

            {/* Metric 7: Comms Window */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Comms Window
              </span>
              <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] mt-0.5">
                <ScrambleValue value={commsWindowStr} />
              </div>
            </div>

            {/* Metric 8: Flight Certification Verdict */}
            <div className="border-t border-white/5 pt-3">
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Flight Status
              </span>
              <div className="text-lg font-sans font-light text-[#f5f5f5] mt-0.5">
                {verdict.badge}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default EdgeHudSidebars;
