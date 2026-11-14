import React from 'react';
import { motion } from 'framer-motion';

/**
 * Structured Minimalist Edge HUD Telemetry Sidebars.
 * Uses Flexbox layouts with standard document flow (flex-col gap-5) so cards naturally push down.
 * Features bg-black/50 backdrop-blur-md for superior contrast against sunlit 3D lunar regions.
 * Decouples aggregate static metrics (14-day coverage) from live simulation variables to eliminate jitter.
 */
export function EdgeHudSidebars({
  sites,
  selectedSiteId,
  customSite,
  onSelectSite,
  live,
  stats,
  verdict,
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
  // Live simulation variables (update as timeline moves)
  const sunElStr = live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`;
  const earthElStr = live.earthEl > 0 ? `+${live.earthEl.toFixed(1)}°` : `${live.earthEl.toFixed(1)}°`;
  const timeToEarthsetStr = timeToEarthset !== null ? `${timeToEarthset}h` : 'Constant LOS';
  const timeToSunsetStr = timeToSunset !== null ? `${timeToSunset}h` : 'Constant Sun';

  // Aggregate static metrics (calculated over 14-day mission window — static during playback)
  const totalIlluminationPct = `${(stats.sunlitFraction * 100).toFixed(0)}%`;
  const totalCommsPct = `${(stats.earthVisibleFraction * 100).toFixed(0)}%`;
  const peakDarkStr = `${stats.longestDarkHours}h`;

  return (
    <>
      {/* === LEFT TELEMETRY COLUMN (SOLAR GEOMETRY & TARGETING) === */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -24 : 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed left-6 sm:left-10 lg:left-12 top-20 bottom-24 w-72 sm:w-80 pointer-events-auto z-20 flex flex-col justify-start"
      >
        <div className="flex flex-col gap-5 p-5 bg-black/50 backdrop-blur-md border border-white/5 rounded-xl shadow-2xl overflow-y-auto scrollbar-none">
          {/* Target Location Selector */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Landing Target
            </span>
            <div className="relative">
              <select
                value={customSite ? 'custom' : selectedSiteId}
                onChange={(e) => {
                  if (e.target.value !== 'custom') onSelectSite(e.target.value);
                }}
                className="w-full bg-[#0a0a0a] border-b border-white/10 pb-1.5 text-[#f5f5f5] font-sans font-light text-sm focus:outline-none focus:border-white/40 cursor-none transition appearance-none"
              >
                {customSite && <option value="custom" className="bg-[#0a0a0a] text-[#f5f5f5]">{customSite.name}</option>}
                {sites.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#0a0a0a] text-[#f5f5f5]">
                    {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`})
                  </option>
                ))}
              </select>
              <span className="absolute right-0 top-1 text-xs text-[#a3a3a3] pointer-events-none font-light">↓</span>
            </div>

            {/* Candidate Site Quick Pills */}
            <div className="flex flex-wrap gap-2 pt-1">
              {sites.slice(0, 4).map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSite(s.id)}
                  className={`text-[10px] font-sans tracking-wider transition cursor-none px-2 py-0.5 rounded ${
                    selectedSiteId === s.id && !customSite
                      ? 'text-[#f5f5f5] bg-white/10 border-b border-white'
                      : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-white/5'
                  }`}
                >
                  {s.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Contextual Landing / Surface View button */}
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
                className="mt-2 text-[10px] font-sans font-light tracking-[0.2em] uppercase text-[#f5f5f5] border border-white/20 hover:border-white hover:bg-white hover:text-black px-4 py-2.5 rounded transition duration-300 cursor-none disabled:opacity-40 w-full text-center"
              >
                {isDescending
                  ? 'Descent in Progress…'
                  : hasLanded
                  ? (viewMode === 'surface' ? 'Return to Orbit ↖' : 'Enter Surface Simulation ↘')
                  : 'Initiate Landing Sequence ↘'}
              </button>
            )}
          </div>

          <div className="h-[1px] bg-white/5 w-full my-0.5" />

          {/* Section: Solar Telemetry */}
          <span className="text-[9px] font-sans font-light tracking-[0.25em] text-[#737373] uppercase block -mb-2">
            Solar Geometry & Power
          </span>

          {/* Live Metric 1: Current Sun Elevation */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Live Sun Elevation
            </span>
            <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {sunElStr}
            </div>
            <span className="text-[9px] font-sans font-light text-[#737373]">
              {live.sunEl > 0 ? 'Direct Solar Illumination' : 'In Grazing Rim Shadow'}
            </span>
          </div>

          {/* Live Metric 2: Time to Next Sunset */}
          <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Time to Sunset
            </span>
            <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {timeToSunsetStr}
            </div>
            <span className="text-[9px] font-sans font-light text-[#737373]">
              Simulated time until nightfall
            </span>
          </div>

          {/* Aggregate Metric 3: Total 14-Day Solar Illumination (Decoupled & Jitter-Free) */}
          <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              14-Day Solar Coverage
            </span>
            <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {totalIlluminationPct}
            </div>
            <span className="text-[9px] font-sans font-light text-[#737373]">
              {stats.sunlitHours}h total power generation window
            </span>
          </div>

          {/* Aggregate Metric 4: Peak Continuous Darkness */}
          <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Peak Continuous Night
            </span>
            <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {peakDarkStr}
            </div>
            <span className="text-[9px] font-sans font-light text-[#737373]">
              Battery reserve sizing threshold
            </span>
          </div>
        </div>
      </motion.aside>

      {/* === RIGHT TELEMETRY COLUMN (COMMUNICATIONS & CERTIFICATION) === */}
      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? 24 : 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed right-6 sm:right-10 lg:right-12 top-20 bottom-24 w-72 sm:w-80 pointer-events-auto z-20 flex flex-col justify-start"
      >
        <div className="flex flex-col gap-5 p-5 bg-black/50 backdrop-blur-md border border-white/5 rounded-xl shadow-2xl overflow-y-auto scrollbar-none text-right">
          {/* Deep Space Network Ground Segment */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Direct-to-Earth Link
            </span>
            <div className="text-sm font-sans font-light text-[#f5f5f5]">
              {live.earthEl > 0 ? 'LOS Active · Direct Link' : 'Occulted by Rim Topography'}
            </div>
            <div className="text-[10px] font-sans text-[#737373]">
              Goldstone · Madrid · Canberra DSN
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full my-0.5" />

          {/* Section: Communications Telemetry */}
          <span className="text-[9px] font-sans font-light tracking-[0.25em] text-[#737373] uppercase block -mb-2">
            Link Geometry
          </span>

          {/* Live Metric 5: Current Earth Elevation */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Live Earth Elevation
            </span>
            <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {earthElStr}
            </div>
            <span className="text-[9px] font-sans font-light text-[#737373]">
              Boresight angle from local horizontal
            </span>
          </div>

          {/* Live Metric 6: Time to Earthset */}
          <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Time to Earthset
            </span>
            <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {timeToEarthsetStr}
            </div>
            <span className="text-[9px] font-sans font-light text-[#737373]">
              Remaining direct link margin
            </span>
          </div>

          {/* Aggregate Metric 7: Total 14-Day Comms Window (Decoupled & Jitter-Free) */}
          <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              14-Day DTE Coverage
            </span>
            <div className="text-2xl font-mono font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {totalCommsPct}
            </div>
            <span className="text-[9px] font-sans font-light text-[#737373]">
              {stats.earthVisibleHours}h uninterrupted line-of-sight
            </span>
          </div>

          {/* Aggregate Metric 8: Flight Certification Verdict */}
          <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Mission Certification
            </span>
            <div className="text-lg font-sans font-light text-[#f5f5f5] mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              {verdict.badge}
            </div>
            <span className="text-[9px] font-sans font-light text-[#737373]">
              {verdict.reason}
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

export default EdgeHudSidebars;
