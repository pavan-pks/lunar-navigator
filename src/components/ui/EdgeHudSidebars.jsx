import React, { useState } from 'react';
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

  const [showCustomCoords, setShowCustomCoords] = useState(false);
  const [customLat, setCustomLat] = useState(() => customSite?.lat ?? -89.9);
  const [customLon, setCustomLon] = useState(() => customSite?.lon ?? 129.8);

  const handleApplyCustom = () => {
    const lat = parseFloat(Number(customLat).toFixed(3));
    const lon = parseFloat(Number(customLon).toFixed(3));
    const siteObj = {
      id: 'custom',
      name: `Custom (${lat >= 0 ? '+' : ''}${lat.toFixed(1)}°, ${lon >= 0 ? '+' : ''}${lon.toFixed(1)}°)`,
      lat,
      lon,
      terrainType: Math.abs(lat) > 75 ? 'crater-rim' : 'plain',
      mission: 'Custom Target',
      notes: `Target locked at ${lat.toFixed(2)}° latitude, ${lon.toFixed(2)}° longitude.`,
      verified: true,
    };
    onSelectSite(siteObj);
  };

  return (
    <>
      {/* === LEFT TELEMETRY COLUMN (SOLAR GEOMETRY & TARGETING) === */}
      <motion.aside
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? -24 : 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed left-3 sm:left-6 lg:left-12 top-20 sm:top-24 bottom-28 w-[calc(100vw-1.5rem)] sm:w-80 pointer-events-auto z-20 flex flex-col min-h-0 max-h-[calc(100vh-12rem)]"
      >
        <div className="flex flex-col gap-3.5 p-4 sm:p-5 pb-8 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl h-full min-h-0 overflow-y-auto overscroll-contain pr-2.5 sidebar-scroll">
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

            {/* Custom Coordinates Toggle Button */}
            <button
              onClick={() => setShowCustomCoords(v => !v)}
              className={`text-[10px] font-sans tracking-wider transition cursor-none px-2.5 py-1.5 rounded border flex items-center justify-between w-full mt-1 ${
                showCustomCoords || customSite
                  ? 'bg-sky-950/40 border-sky-400/40 text-sky-200'
                  : 'bg-white/5 border-white/10 text-[#a3a3a3] hover:text-white hover:border-white/20'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <span>📍</span>
                <span>{customSite ? `Custom (${customSite.lat >= 0 ? '+' : ''}${customSite.lat.toFixed(1)}°, ${customSite.lon >= 0 ? '+' : ''}${customSite.lon.toFixed(1)}°)` : 'Custom Coordinates'}</span>
              </span>
              <span className="text-[10px] opacity-70">{showCustomCoords ? '▲' : '▼'}</span>
            </button>

            {/* Expandable Custom Coordinate Input Panel */}
            {showCustomCoords && (
              <div className="bg-black/90 border border-white/15 p-3 rounded-lg flex flex-col gap-2.5 text-[11px] font-sans mt-0.5">
                <div className="flex items-center justify-between text-[10px] text-neutral-400 uppercase tracking-widest font-mono">
                  <span>Pinpoint Targeting</span>
                  <span className="text-sky-400 font-sans">Active</span>
                </div>

                {/* Latitude Input & Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">Latitude:</span>
                    <span className="font-mono text-white font-medium">
                      {Number(customLat) >= 0 ? `+${Number(customLat).toFixed(1)}°` : `${Number(customLat).toFixed(1)}°`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-90.0"
                    max="90.0"
                    step="0.1"
                    value={customLat}
                    onChange={(e) => setCustomLat(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded accent-sky-400 cursor-none"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                    <button type="button" onClick={() => setCustomLat(-89.9)} className="hover:text-white cursor-none">South (-89.9°)</button>
                    <button type="button" onClick={() => setCustomLat(0.0)} className="hover:text-white cursor-none">Equator (0°)</button>
                    <button type="button" onClick={() => setCustomLat(90.0)} className="hover:text-white cursor-none">North (+90°)</button>
                  </div>
                </div>

                {/* Longitude Input & Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-400">Longitude:</span>
                    <span className="font-mono text-white font-medium">
                      {Number(customLon) >= 0 ? `+${Number(customLon).toFixed(1)}°` : `${Number(customLon).toFixed(1)}°`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-180.0"
                    max="180.0"
                    step="0.1"
                    value={customLon}
                    onChange={(e) => setCustomLon(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/20 rounded accent-sky-400 cursor-none"
                  />
                  <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                    <button type="button" onClick={() => setCustomLon(-180.0)} className="hover:text-white cursor-none">-180°</button>
                    <button type="button" onClick={() => setCustomLon(0.0)} className="hover:text-white cursor-none">0° Prime</button>
                    <button type="button" onClick={() => setCustomLon(180.0)} className="hover:text-white cursor-none">+180°</button>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={handleApplyCustom}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-medium py-1.5 px-3 rounded text-[11px] tracking-wider uppercase transition cursor-none text-center shadow-lg mt-0.5"
                >
                  Lock Custom Target ↗
                </button>

                <div className="text-[9px] text-neutral-400 leading-tight border-t border-white/10 pt-1.5">
                  💡 Tip: You can also click anywhere directly on the 3D Moon to drop a pin.
                </div>
              </div>
            )}

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
        className="fixed right-3 sm:right-6 lg:right-12 top-20 sm:top-24 bottom-28 w-[calc(100vw-1.5rem)] sm:w-80 pointer-events-auto z-20 flex flex-col min-h-0 max-h-[calc(100vh-12rem)] max-lg:hidden"
      >
        <div className="flex flex-col gap-3.5 p-4 sm:p-5 pb-8 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl h-full min-h-0 overflow-y-auto overscroll-contain pr-2.5 text-right sidebar-scroll">
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
