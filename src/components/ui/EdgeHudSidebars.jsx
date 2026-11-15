import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Activity, Battery as BatteryIcon, Calendar as CalendarIcon } from 'lucide-react';
import { ScrambleValue } from './ScrambleValue.jsx';

/**
 * Returns a human-friendly abbreviated site name for pills to avoid duplication or clipping.
 */
function getSitePillLabel(site) {
  if (site.shortName) return site.shortName;
  const idMap = {
    shackleton: 'Shackleton',
    malapert: 'Malapert',
    connecting_ridge: 'Connecting Ridge',
    faustini: 'Faustini',
    haworth: 'Haworth',
    nobile: 'Nobile Rim',
    gerlache: 'de Gerlache',
    amundsen: 'Amundsen',
    leibnitz: 'Leibnitz Beta',
    slater: 'Slater',
    shoemaker: 'Shoemaker',
    apollo11: 'Apollo 11',
    chandrayaan3: 'Chandrayaan-3',
    chang_e_4: "Chang'e 4",
    south_pole: 'South Pole',
    north_pole: 'North Pole',
    tycho: 'Tycho',
    copernicus: 'Copernicus',
  };
  if (idMap[site.id]) return idMap[site.id];
  return site.name.replace(/\s*(crater|basin|rim|plateau|ridge|site|mountain)\b/gi, '').trim() || site.name;
}

/**
 * Structured Minimalist Edge HUD Telemetry Sidebars.
 * Minimal black/white aesthetic with 1px thin borders and glass panels.
 * Features responsive text containment, no clipped words, and tabular-nums.
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
  plannerMode = 'planner', // 'planner' | 'explorer'
  onTogglePlannerMode,
  onOpenTool, // (toolName: 'timeline' | 'battery' | 'calendar') => void
}) {
  // Live simulation variables (update as timeline moves, guarded against non-finite values)
  const safeLiveSun = Number.isFinite(live?.sunEl) ? live.sunEl : 0;
  const safeLiveEarth = Number.isFinite(live?.earthEl) ? live.earthEl : 0;
  const sunElStr = safeLiveSun > 0 ? `+${safeLiveSun.toFixed(1)}°` : `${safeLiveSun.toFixed(1)}°`;
  const earthElStr = safeLiveEarth > 0 ? `+${safeLiveEarth.toFixed(1)}°` : `${safeLiveEarth.toFixed(1)}°`;
  const timeToEarthsetStr = Number.isFinite(timeToEarthset) ? `${timeToEarthset}h` : 'Constant LOS';
  const timeToSunsetStr = Number.isFinite(timeToSunset) ? `${timeToSunset}h` : 'Constant Sun';

  // Aggregate static metrics (calculated over 14-day mission window — static during playback)
  const sunlitFrac = Number.isFinite(stats?.sunlitFraction) ? stats.sunlitFraction : 0;
  const earthVisFrac = Number.isFinite(stats?.earthVisibleFraction) ? stats.earthVisibleFraction : 0;
  const totalIlluminationPct = `${(sunlitFrac * 100).toFixed(0)}%`;
  const totalCommsPct = `${(earthVisFrac * 100).toFixed(0)}%`;
  const peakDarkStr = `${Number.isFinite(stats?.longestDarkHours) ? stats.longestDarkHours : 0}h`;

  const [showCustomCoords, setShowCustomCoords] = useState(false);
  const [customLat, setCustomLat] = useState(() => customSite?.lat ?? -89.9);
  const [customLon, setCustomLon] = useState(() => customSite?.lon ?? 129.8);

  const currentSiteName = customSite ? customSite.name : (sites.find(s => s.id === selectedSiteId)?.name || 'Target Site');

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
        className="fixed left-3 sm:left-6 lg:left-10 top-20 sm:top-24 bottom-28 w-[calc(100vw-1.5rem)] sm:w-84 max-w-[22rem] pointer-events-auto z-20 flex flex-col min-h-0 max-h-[calc(100vh-12rem)]"
      >
        <div className="flex flex-col gap-3.5 p-4 sm:p-5 pb-8 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl h-full min-h-0 overflow-y-auto overscroll-contain pr-2.5 sidebar-scroll">
          {/* Planner vs Explorer Mode Switch */}
          {onTogglePlannerMode && (
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
              <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase">
                Display Mode
              </span>
              <div className="flex rounded-md border border-white/15 overflow-hidden text-[11px] font-sans">
                <button
                  type="button"
                  onClick={() => onTogglePlannerMode('planner')}
                  className={`px-2.5 py-0.5 transition cursor-pointer ${
                    plannerMode === 'planner'
                      ? 'bg-white text-black font-medium'
                      : 'text-[#a3a3a3] hover:text-white bg-transparent'
                  }`}
                >
                  Planner
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePlannerMode('explorer')}
                  className={`px-2.5 py-0.5 transition cursor-pointer ${
                    plannerMode === 'explorer'
                      ? 'bg-white text-black font-medium'
                      : 'text-[#a3a3a3] hover:text-white bg-transparent'
                  }`}
                >
                  Explorer
                </button>
              </div>
            </div>
          )}

          {/* Target Location Selector */}
          <div className="flex flex-col gap-2 min-w-0">
            <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Landing Target
            </span>
            <div className="relative min-w-0" title={currentSiteName}>
              <select
                value={customSite ? 'custom' : selectedSiteId}
                onChange={(e) => {
                  if (e.target.value !== 'custom') onSelectSite(e.target.value);
                }}
                className="w-full bg-[#0a0a0a] border-b border-white/10 pb-1.5 text-[#f5f5f5] font-sans font-light text-sm focus:outline-none focus:border-white/40 cursor-pointer transition appearance-none truncate pr-6"
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
            <div className="flex flex-wrap gap-1.5 pt-1">
              {sites.slice(0, 5).map(s => (
                <button
                  key={s.id}
                  onClick={() => onSelectSite(s.id)}
                  title={s.name}
                  className={`text-[11px] font-sans tracking-wider transition cursor-pointer px-2 py-0.5 rounded truncate max-w-[10rem] ${
                    selectedSiteId === s.id && !customSite
                      ? 'text-[#f5f5f5] bg-white/15 border-b border-white'
                      : 'text-[#a3a3a3] hover:text-[#f5f5f5] hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {getSitePillLabel(s)}
                </button>
              ))}
            </div>

            {/* Custom Coordinates Toggle Button */}
            <button
              onClick={() => setShowCustomCoords(v => !v)}
              className={`text-[11px] font-sans tracking-wider transition cursor-pointer px-2.5 py-1.5 rounded border flex items-center justify-between w-full mt-1 ${
                showCustomCoords || customSite
                  ? 'bg-sky-950/40 border-sky-400/40 text-sky-200'
                  : 'bg-white/5 border-white/10 text-[#a3a3a3] hover:text-white hover:border-white/20'
              }`}
            >
              <span className="flex items-center gap-1.5 min-w-0 truncate">
                <MapPin className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="truncate">{customSite ? customSite.name : 'Custom Coordinates'}</span>
              </span>
              <span className="text-[11px] opacity-70 shrink-0">{showCustomCoords ? '▲' : '▼'}</span>
            </button>

            {/* Expandable Custom Coordinate Input Panel */}
            {showCustomCoords && (
              <div className="bg-black/90 border border-white/15 p-3 rounded-lg flex flex-col gap-2.5 text-[11px] font-sans mt-0.5">
                <div className="flex items-center justify-between text-[11px] text-neutral-400 uppercase tracking-widest font-mono">
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
                    className="w-full h-1 bg-white/20 rounded accent-sky-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
                    <button type="button" onClick={() => setCustomLat(-89.9)} className="hover:text-white cursor-pointer">South (-89.9°)</button>
                    <button type="button" onClick={() => setCustomLat(0.0)} className="hover:text-white cursor-pointer">Equator (0°)</button>
                    <button type="button" onClick={() => setCustomLat(90.0)} className="hover:text-white cursor-pointer">North (+90°)</button>
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
                    className="w-full h-1 bg-white/20 rounded accent-sky-400 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-neutral-400 font-mono">
                    <button type="button" onClick={() => setCustomLon(-180.0)} className="hover:text-white cursor-pointer">-180°</button>
                    <button type="button" onClick={() => setCustomLon(0.0)} className="hover:text-white cursor-pointer">0°</button>
                    <button type="button" onClick={() => setCustomLon(180.0)} className="hover:text-white cursor-pointer">+180°</button>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  className="bg-sky-600 hover:bg-sky-500 text-white font-medium py-1.5 px-3 rounded text-[11px] tracking-wider uppercase transition cursor-pointer text-center shadow-lg mt-0.5"
                >
                  Lock Custom Target ↗
                </button>

                <div className="text-[11px] text-neutral-400 leading-tight border-t border-white/10 pt-1.5">
                  Tip: You can also click anywhere directly on the 3D Moon to drop a pin.
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
                className="mt-2 text-[11px] font-sans font-light tracking-[0.2em] uppercase text-[#f5f5f5] border border-white/20 hover:border-white hover:bg-white hover:text-black px-4 py-2.5 rounded transition duration-300 cursor-pointer disabled:opacity-40 w-full text-center"
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
          <span className="text-[11px] font-sans font-light tracking-[0.25em] text-[#737373] uppercase block -mb-2">
            Solar Geometry & Power
          </span>

          {/* Explorer Mode Captions or Planner Dense Telemetry */}
          {plannerMode === 'explorer' ? (
            <div className="flex flex-col gap-3 py-1 text-[11px] font-sans text-neutral-300 leading-relaxed [overflow-wrap:anywhere]">
              <div className="p-2.5 rounded bg-white/5 border border-white/10">
                <span className="font-semibold text-white block mb-1">Solar Illumination</span>
                {safeLiveSun > 0 ? (
                  <span>The Sun is currently {sunElStr} above the local horizon, providing direct light and solar power to the landing site.</span>
                ) : (
                  <span>The Sun is {sunElStr} below the rim, casting the site in deep topographic shadow.</span>
                )}
              </div>
              <div className="p-2.5 rounded bg-white/5 border border-white/10">
                <span className="font-semibold text-white block mb-1">Darkness & Battery Endurance</span>
                <span>
                  Nightfall arrives in <strong className="text-white">{timeToSunsetStr}</strong>. The longest continuous blackout lasts{' '}
                  <strong className="text-white">{peakDarkStr}</strong>, requiring a minimum battery capacity to survive night heating.
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Live Metric 1: Current Sun Elevation */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
                  Live Sun Elevation
                </span>
                <div className="text-2xl font-mono tabular-nums font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <ScrambleValue value={sunElStr} />
                </div>
                <span className="text-[11px] font-sans font-light text-[#737373] [overflow-wrap:anywhere]">
                  {live.sunEl > 0 ? 'Direct Solar Illumination' : 'In Grazing Rim Shadow'}
                </span>
              </div>

              {/* Live Metric 2: Time to Next Sunset */}
              <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3 min-w-0">
                <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
                  Time to Sunset
                </span>
                <div className="text-2xl font-mono tabular-nums font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <ScrambleValue value={timeToSunsetStr} />
                </div>
                <span className="text-[11px] font-sans font-light text-[#737373] [overflow-wrap:anywhere]">
                  Simulated time until nightfall
                </span>
              </div>

              {/* Aggregate Metric 3: Total 14-Day Solar Coverage */}
              <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3 min-w-0">
                <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
                  14-Day Solar Coverage
                </span>
                <div className="text-2xl font-mono tabular-nums font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <ScrambleValue value={totalIlluminationPct} />
                </div>
                <span className="text-[11px] font-sans font-light text-[#737373] [overflow-wrap:anywhere]">
                  {stats.sunlitHours}h total power generation window
                </span>
              </div>

              {/* Aggregate Metric 4: Peak Continuous Darkness */}
              <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3 min-w-0">
                <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
                  Peak Continuous Night
                </span>
                <div className="text-2xl font-mono tabular-nums font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <ScrambleValue value={peakDarkStr} />
                </div>
                <span className="text-[11px] font-sans font-light text-[#737373] [overflow-wrap:anywhere]">
                  Battery reserve sizing threshold
                </span>
              </div>
            </>
          )}

          {/* Quick Analysis Tools Launchers */}
          {onOpenTool && (
            <div className="border-t border-white/10 pt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenTool('timeline')}
                className="text-[11px] font-sans px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5"
              >
                <Activity className="w-3 h-3 text-sky-400" />
                <span>Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenTool('battery')}
                className="text-[11px] font-sans px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5"
              >
                <BatteryIcon className="w-3 h-3 text-emerald-400" />
                <span>Battery</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenTool('calendar')}
                className="text-[11px] font-sans px-2.5 py-1 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1.5"
              >
                <CalendarIcon className="w-3 h-3 text-amber-400" />
                <span>Calendar</span>
              </button>
            </div>
          )}
        </div>
      </motion.aside>

      {/* === RIGHT TELEMETRY COLUMN (COMMUNICATIONS & CERTIFICATION) === */}
      <motion.aside
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: isCollapsed ? 0 : 1, x: isCollapsed ? 24 : 0 }}
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="fixed right-3 sm:right-6 lg:right-10 top-20 sm:top-24 bottom-28 w-[calc(100vw-1.5rem)] sm:w-84 max-w-[22rem] pointer-events-auto z-20 flex flex-col min-h-0 max-h-[calc(100vh-12rem)] max-lg:hidden"
      >
        <div className="flex flex-col gap-3.5 p-4 sm:p-5 pb-8 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl h-full min-h-0 overflow-y-auto overscroll-contain pr-2.5 text-right sidebar-scroll">
          {/* Deep Space Network Ground Segment */}
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Direct-to-Earth Link
            </span>
            <div className="text-sm font-sans font-light text-[#f5f5f5] [overflow-wrap:anywhere]">
              {safeLiveEarth > 0 ? 'LOS Active · Direct Link' : 'Occulted by Rim Topography'}
            </div>
            <div className="text-[11px] font-sans text-[#737373]">
              Goldstone · Madrid · Canberra DSN
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full my-0.5" />

          {/* Section: Communications Telemetry */}
          <span className="text-[11px] font-sans font-light tracking-[0.25em] text-[#737373] uppercase block -mb-2">
            Link Geometry
          </span>

          {/* Explorer Mode Captions or Planner Dense Telemetry */}
          {plannerMode === 'explorer' ? (
            <div className="flex flex-col gap-3 py-1 text-[11px] font-sans text-neutral-300 leading-relaxed text-left [overflow-wrap:anywhere]">
              <div className="p-2.5 rounded bg-white/5 border border-white/10">
                <span className="font-semibold text-white block mb-1">Earth Visibility</span>
                {safeLiveEarth > 0 ? (
                  <span>Earth is currently {earthElStr} above the lunar horizon, providing continuous high-bandwidth telemetry and voice.</span>
                ) : (
                  <span>Earth is below the horizon ({earthElStr}). Direct communications are blocked by the terrain.</span>
                )}
              </div>
              <div className="p-2.5 rounded bg-white/5 border border-white/10">
                <span className="font-semibold text-white block mb-1">Overall DTE Window</span>
                <span>
                  Earth line-of-sight is available for <strong className="text-white">{totalCommsPct}</strong> ({stats.earthVisibleHours}h) of the 14-day sortie.
                </span>
              </div>
            </div>
          ) : (
            <>
              {/* Live Metric 5: Current Earth Elevation */}
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
                  Live Earth Elevation
                </span>
                <div className="text-2xl font-mono tabular-nums font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <ScrambleValue value={earthElStr} />
                </div>
                <span className="text-[11px] font-sans font-light text-[#737373] [overflow-wrap:anywhere]">
                  Boresight angle from local horizontal
                </span>
              </div>

              {/* Live Metric 6: Time to Earthset */}
              <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3 min-w-0">
                <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
                  Time to Earthset
                </span>
                <div className="text-2xl font-mono tabular-nums font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <ScrambleValue value={timeToEarthsetStr} />
                </div>
                <span className="text-[11px] font-sans font-light text-[#737373] [overflow-wrap:anywhere]">
                  Remaining direct link margin
                </span>
              </div>

              {/* Aggregate Metric 7: Total 14-Day Comms Window */}
              <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3 min-w-0">
                <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
                  14-Day DTE Coverage
                </span>
                <div className="text-2xl font-mono tabular-nums font-light tracking-tight text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  <ScrambleValue value={totalCommsPct} />
                </div>
                <span className="text-[11px] font-sans font-light text-[#737373] [overflow-wrap:anywhere]">
                  {stats.earthVisibleHours}h uninterrupted line-of-sight
                </span>
              </div>
            </>
          )}

          {/* Aggregate Metric 8: Flight Certification Verdict */}
          <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3 min-w-0">
            <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              Mission Certification
            </span>
            <div className={`text-lg font-sans font-light mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
              verdict.go ? 'text-emerald-300' : 'text-amber-400'
            }`}>
              {verdict.badge}
            </div>
            <span className="text-[11px] font-sans font-light text-[#737373] leading-relaxed [overflow-wrap:anywhere]">
              {verdict.reason}
            </span>
          </div>
        </div>
      </motion.aside>
    </>
  );
}

export default EdgeHudSidebars;
