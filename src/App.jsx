import React, { useState, useEffect, useMemo } from 'react';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController, SPEED_OPTIONS } from './lib/useTimeController.js';
import { getLunarTime } from './lib/lunarTime.js';
import { sampleSeries, valuesAt, hoursSince } from './lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate, timeToNext, shadowLength } from './lib/metrics.js';

import { ScenePanel } from './components/ui/ScenePanel.jsx';
import { SpaceIntroScene } from './components/story/SpaceIntroScene.jsx';
import { Compare } from './components/ui/Compare.jsx';
import { Timeline } from './components/ui/Timeline.jsx';
import { Calendar } from './components/ui/Calendar.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';

/**
 * Circular aerospace elevation gauge with color-coded angle readout.
 */
function CircularElevationGauge({ angle, maxAngle = 45, color = '#ffd25a', label = 'ELEVATION' }) {
  const radius = 26;
  const stroke = 3.5;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const clampedAngle = Math.max(-10, Math.min(maxAngle, angle));
  const strokeDashoffset = circumference - (Math.max(0, clampedAngle) / maxAngle) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="rgba(255, 255, 255, 0.12)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + ' ' + circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.25s ease' }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>
        <span className="absolute font-mono text-[11px] font-bold" style={{ color }}>
          {angle > 0 ? `+${angle.toFixed(1)}°` : `${angle.toFixed(1)}°`}
        </span>
      </div>
      <div>
        <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest block">{label}</span>
        <span className="text-[11px] font-mono font-bold text-white">
          {angle > 0 ? 'Above Horizon' : 'Sub-Horizon'}
        </span>
      </div>
    </div>
  );
}

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Selected site & custom coordinates
  const [selectedSiteId, setSelectedSiteId] = useState('shackleton');
  const [customSite, setCustomSite] = useState(null);

  // Flight dynamics & date flexibility
  const [launchDate, setLaunchDate] = useState('2027-03-08T00:00:00Z');
  const [transitDays, setTransitDays] = useState(4);
  const [slipDays, setSlipDays] = useState(0);
  const missionDays = 14;
  const maxHours = missionDays * 24;
  const objectHeightM = 3.0;

  // View modes: 'orbit' | 'astronaut' | 'earth'
  const [viewMode, setViewMode] = useState('orbit');

  // Modals & Overlays
  const [showIntro, setShowIntro] = useState(() => !window.location.hash.includes('nointro'));
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showTelemetrySidebars, setShowTelemetrySidebars] = useState(true);

  // Time controller for 14-day mission scrub
  const timeCtrl = useTimeController({ maxHours, initialSpeed: 12 });

  // Secondary scenario for Side-by-Side Trade Study comparison
  const [scenarioB, setScenarioB] = useState({
    siteId: 'malapert',
    launchDate: '2027-03-08T00:00:00Z',
    transitDays: 4,
    customSite: null
  });
  const [compareMode, setCompareMode] = useState('sites');

  // Real-time lunar clock
  const [lunarClock, setLunarClock] = useState(() => getLunarTime());
  useEffect(() => {
    const timer = setInterval(() => setLunarClock(getLunarTime()), 2000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await loadAllData();
      setData(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute ephemeris series for active site
  const site = useMemo(() => {
    if (customSite) return customSite;
    if (!data?.sites) return { id: 'shackleton', name: 'Shackleton Crater Rim', lat: -89.9, lon: 129.8, terrainType: 'crater-rim' };
    return data.sites.find(s => s.id === selectedSiteId) || data.sites[0];
  }, [data, selectedSiteId, customSite]);

  const handleSelectSite = (newSite) => {
    if (typeof newSite === 'object' && newSite !== null) {
      setCustomSite(newSite);
      setSelectedSiteId(newSite.id);
    } else if (newSite === 'custom') {
      const lat = prompt('Enter custom Latitude (-90° to +90°):', '-89.5');
      const lon = prompt('Enter custom Longitude (-180° to +180°):', '45.0');
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (!isNaN(latNum) && !isNaN(lonNum)) {
        const custom = {
          id: `custom-${latNum.toFixed(1)}-${lonNum.toFixed(1)}`,
          name: `Custom (${latNum.toFixed(1)}°, ${lonNum.toFixed(1)}°)`,
          lat: latNum,
          lon: lonNum,
          terrainType: latNum < -80 ? 'crater-rim' : 'plain'
        };
        setCustomSite(custom);
        setSelectedSiteId(custom.id);
      }
    } else {
      setCustomSite(null);
      setSelectedSiteId(newSite);
    }
  };

  // Touchdown date accounting for transit and launch slip
  const landing = landingDate(launchDate, transitDays + slipDays);
  const startHours = useMemo(() => {
    if (!data?.ephem) return 0;
    return Math.max(0, hoursSince(data.ephem.startUTC, landing));
  }, [data, landing]);

  const series = useMemo(() => {
    if (!data?.ephem) return { t: [], sunEl: [], sunAz: [], earthEl: [], earthAz: [] };
    return sampleSeries(site, startHours, maxHours, data.ephem, 1);
  }, [site, startHours, maxHours, data]);

  const live = useMemo(() => valuesAt(series, timeCtrl.tRel), [series, timeCtrl.tRel]);
  const stats = useMemo(() => computeWindowStats(series), [series]);
  const verdict = useMemo(() => getVerdict(stats), [stats]);

  // Operational Countdowns
  const timeToSunset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'sunset'), [series, timeCtrl.tRel]);
  const timeToEarthset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'earthset'), [series, timeCtrl.tRel]);

  // Shadow length
  const shadowM = shadowLength(objectHeightM, live?.sunEl ?? 0);

  // Power Generation Efficiency (% capability based on solar incidence)
  const powerEfficiencyPct = useMemo(() => {
    if (!live || live.sunEl <= 0) return 0;
    const eff = Math.min(100, Math.max(0, Math.sin((live.sunEl * Math.PI) / 180) * 100 * 2.5));
    return eff.toFixed(0);
  }, [live]);

  // Current Mission Elapsed Time in days & hours
  const metDays = Math.floor(timeCtrl.tRel / 24);
  const metHours = Math.floor(timeCtrl.tRel % 24);
  const metMinutes = Math.floor((timeCtrl.tRel % 1) * 60);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#050814] text-slate-200 flex flex-col items-center justify-center p-6 space-y-4 font-mono select-none">
        <div className="w-12 h-12 border-2 border-[#0B3D91] border-t-cyan-400 rounded-full animate-spin"></div>
        <p className="text-xs text-cyan-400 tracking-widest uppercase">NASA / JPL Horizons Telemetry Link Initializing…</p>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  const { sites, ephem } = data;

  const scenarioA = {
    siteId: selectedSiteId,
    launchDate,
    transitDays,
    customSite
  };

  return (
    <div className="h-screen w-screen bg-[#050814] text-[#f0f6fc] overflow-hidden font-sans select-none relative">
      {/* 1. CENTRAL DOMINANT 3D LUNAR ENVIRONMENT VIEWPORT */}
      <div className="absolute inset-0 w-full h-full z-0">
        <ScenePanel
          siteId={site.id}
          terrainType={site.terrainType || 'crater-rim'}
          sunEl={live.sunEl}
          sunAz={live.sunAz}
          earthEl={live.earthEl}
          earthAz={live.earthAz}
          viewMode={viewMode}
          quality="high"
          label={`${site.name} • NASA Artemis III`}
          landerHeight={objectHeightM}
          showHud={false}
          showShadowRuler={true}
        />
      </div>

      {/* 2. NASA ARTEMIS / JPL MISSION CONTROL HEADER */}
      <header className="absolute top-3 left-4 right-4 z-30 flex items-center justify-between gap-3 pointer-events-none">
        {/* Brand & Landing Site Selector */}
        <div className="flex items-center gap-3 bg-[#070e1c]/85 backdrop-blur-2xl border border-slate-800/80 rounded-2xl px-4 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.85)] pointer-events-auto">
          {/* NASA Vector Insignia */}
          <div className="w-8 h-8 rounded-xl bg-[#0B3D91] flex items-center justify-center shadow-[0_0_15px_rgba(11,61,145,0.6)] shrink-0 font-display font-extrabold text-xs text-white">
            NASA
          </div>

          <div>
            <div className="font-display font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5">
              <span>LUNAR</span>
              <span className="text-cyan-400">NAVIGATOR</span>
              <span className="text-[9px] font-mono font-normal text-slate-500 hidden sm:inline">// JPL HORIZONS</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>FDO TELEMETRY ACTIVE</span>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 mx-1"></div>

          {/* Quick Landing Site Dropdown */}
          <select
            value={customSite ? 'custom' : selectedSiteId}
            onChange={(e) => handleSelectSite(e.target.value)}
            className="bg-[#0b1324] border border-slate-700/80 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-mono cursor-pointer focus:outline-none focus:border-cyan-400 transition"
          >
            {customSite && (
              <option value="custom">{site.name}</option>
            )}
            <optgroup label="Candidate Artemis Sites">
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`} S, {s.lon.toFixed(1)}° E)
                </option>
              ))}
            </optgroup>
            <option value="custom">Designate Custom Coordinates...</option>
          </select>
        </div>

        {/* Center: Camera View Segmented Control */}
        <div className="hidden md:flex items-center bg-[#070e1c]/85 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-1 shadow-[0_8px_30px_rgba(0,0,0,0.85)] pointer-events-auto font-mono text-[11px]">
          <button
            onClick={() => setViewMode('orbit')}
            className={`px-3 py-1 rounded-xl transition cursor-pointer ${
              viewMode === 'orbit' ? 'bg-[#0B3D91] text-cyan-200 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Orbit Nadir
          </button>
          <button
            onClick={() => setViewMode('astronaut')}
            className={`px-3 py-1 rounded-xl transition cursor-pointer ${
              viewMode === 'astronaut' ? 'bg-[#0B3D91] text-cyan-200 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Surface Astronaut EVA
          </button>
          <button
            onClick={() => setViewMode('earth')}
            className={`px-3 py-1 rounded-xl transition cursor-pointer ${
              viewMode === 'earth' ? 'bg-[#0B3D91] text-cyan-200 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Earth Line-of-Sight
          </button>
        </div>

        {/* Right: Mission Actions */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Telemetry Sidebars Toggle */}
          <button
            onClick={() => setShowTelemetrySidebars(prev => !prev)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl font-mono text-xs font-bold transition shadow-lg cursor-pointer border ${
              showTelemetrySidebars
                ? 'bg-cyan-500/20 border-cyan-400/40 text-cyan-300'
                : 'bg-[#070e1c]/85 border-slate-800 text-slate-300 hover:bg-[#0c162d]'
            }`}
            title="Toggle Telemetry Sidebar Overlay"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
            <span className="hidden sm:inline">Telemetry</span>
          </button>

          {/* Trade Study Compare Button */}
          <button
            onClick={() => setShowCompareModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#070e1c]/85 hover:bg-[#0c162d] backdrop-blur-2xl border border-slate-800 text-slate-200 text-xs font-mono font-semibold transition shadow-lg cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 stroke-cyan-400" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
            <span className="hidden sm:inline">Trade Study</span>
          </button>

          {/* Orbit Celestial View Button */}
          <button
            onClick={() => setShowIntro(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#0B3D91] hover:bg-[#0e49ad] text-white text-xs font-mono font-semibold transition shadow-[0_0_15px_rgba(11,61,145,0.4)] cursor-pointer border border-cyan-400/30"
          >
            <svg className="w-3.5 h-3.5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            <span>Orbit View</span>
          </button>
        </div>
      </header>

      {/* 3. DOCKED TELEMETRY SIDEBARS (NASA MISSION CONTROL PANELS) */}
      {showTelemetrySidebars && (
        <>
          {/* LEFT TELEMETRY SIDEBAR: SOLAR ILLUMINATION & POWER */}
          <aside className="absolute top-18 left-4 z-20 w-80 space-y-3 pointer-events-auto animate-in slide-in-from-left duration-300">
            {/* CARD 1: SOLAR VECTOR & HORIZON ELEVATION */}
            <div className="bg-[#070e1c]/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] tracking-wider text-amber-400 uppercase font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  Solar Illumination Vector
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/25">
                  {live.sunEl > 0 ? 'SUNLIT' : 'OCCULTED'}
                </span>
              </div>

              {/* Circular Elevation Gauge */}
              <div className="py-1">
                <CircularElevationGauge
                  angle={live.sunEl}
                  color={live.sunEl > 2 ? '#ffd25a' : live.sunEl > 0 ? '#f59e0b' : '#64748b'}
                  label="Solar Horizon Angle"
                />
              </div>

              {/* Monospace Telemetry Metrics */}
              <div className="space-y-1.5 text-[11px] pt-1 border-t border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Azimuth Heading:</span>
                  <span className="text-slate-200 font-semibold">{live.sunAz.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Photovoltaic Yield:</span>
                  <span className="text-amber-300 font-bold">{powerEfficiencyPct}% Max Output</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Time to Sunset:</span>
                  <span className="text-amber-300 font-bold">
                    {timeToSunset !== null ? `${timeToSunset}h remaining` : 'Quasi-Eternal Light'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Lander Mast Shadow:</span>
                  <span className="text-slate-200">{Number.isFinite(shadowM) ? `${shadowM.toFixed(1)}m` : 'Horizon Blocked'}</span>
                </div>
              </div>
            </div>

            {/* CARD 2: POWER BUDGET & THERMAL REGIME */}
            <div className="bg-[#070e1c]/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] tracking-wider text-slate-300 uppercase font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                  14-Day Power Regime
                </span>
                <span className="text-[10px] font-bold text-cyan-300">
                  {(stats.sunlitFraction * 100).toFixed(1)}% SUNLIT
                </span>
              </div>

              {/* Power Yield Visual Bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-amber-300 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, stats.sunlitFraction * 100))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Sunlit: <strong>{stats.sunlitHours}h</strong></span>
                  <span>Mission Total: <strong>{maxHours}h</strong></span>
                </div>
              </div>

              <div className="space-y-1.5 text-[11px] pt-1 border-t border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Peak Thermal Blackout:</span>
                  <span className={`font-bold ${stats.longestDarkHours > 48 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {stats.longestDarkHours}h duration
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Battery Capacity Need:</span>
                  <span className="text-slate-300 text-[10px]">
                    {stats.longestDarkHours === 0 ? 'Minimal (Continuous)' : `${stats.longestDarkHours}h pack required`}
                  </span>
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT TELEMETRY SIDEBAR: DIRECT-TO-EARTH COMMS & FLIGHT VERDICT */}
          <aside className="absolute top-18 right-4 z-20 w-80 space-y-3 pointer-events-auto animate-in slide-in-from-right duration-300">
            {/* CARD 3: MISSION FLIGHT DYNAMICS STATUS */}
            <div className="bg-[#070e1c]/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] font-mono text-xs space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] tracking-wider text-slate-400 uppercase font-bold">
                  Flight Dynamics Status
                </span>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${
                  verdict.status === 'VIABLE' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
                  verdict.status === 'MARGINAL' ? 'bg-amber-500/15 text-amber-300 border-amber-500/30' :
                  'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  {verdict.badge}
                </span>
              </div>

              <div className="text-[11px] text-slate-200 font-sans leading-relaxed">
                {verdict.reason}
              </div>

              <div className="text-[10px] text-slate-400 pt-1.5 border-t border-slate-800 flex justify-between">
                <span>Target: <strong className="text-slate-200">{site.name}</strong></span>
                <span>{site.lat.toFixed(1)}°S, {site.lon.toFixed(1)}°E</span>
              </div>
            </div>

            {/* CARD 4: DIRECT-TO-EARTH COMMS (DEEP SPACE NETWORK) */}
            <div className="bg-[#070e1c]/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-4 shadow-[0_12px_40px_rgba(0,0,0,0.85)] font-mono text-xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[10px] tracking-wider text-cyan-400 uppercase font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                  Direct-to-Earth (DSN)
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  live.earthEl > 0 ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                }`}>
                  {live.earthEl > 0 ? 'DSN CARRIER LOCKED' : 'OCCULTED'}
                </span>
              </div>

              {/* Circular Elevation Gauge for Earth */}
              <div className="py-1">
                <CircularElevationGauge
                  angle={live.earthEl}
                  color={live.earthEl > 0 ? '#38bdf8' : '#f43f5e'}
                  label="Earth Horizon Elevation"
                />
              </div>

              <div className="space-y-1.5 text-[11px] pt-1 border-t border-slate-800/80">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">14-Day Visibility Window:</span>
                  <span className="text-cyan-300 font-bold">{(stats.earthVisibleFraction * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Time to Earthset:</span>
                  <span className="text-cyan-300 font-bold">
                    {timeToEarthset !== null ? `${timeToEarthset}h remaining` : 'Continuous Link'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Max Communication Gap:</span>
                  <span className="text-slate-200">{stats.longestEarthGapHours} hours</span>
                </div>
              </div>
            </div>
          </aside>
        </>
      )}

      {/* 4. TEMPORAL SCRUBBER (NLE VIDEO EDITING / MISSION CONTROL TIMELINE DOCKED AT BOTTOM) */}
      <footer className="absolute bottom-3 left-4 right-4 z-30 pointer-events-auto">
        <div className="max-w-5xl mx-auto bg-[#070e1c]/90 backdrop-blur-2xl border border-slate-800/90 rounded-2xl p-3 sm:p-4 shadow-[0_12px_45px_rgba(0,0,0,0.9)] space-y-2.5 font-mono text-xs">
          
          {/* Top Bar: Transport controls, MET Readout, and Speed Multipliers */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 pb-2.5">
            {/* Play/Pause & T+0 Reset */}
            <div className="flex items-center gap-2">
              <button
                onClick={timeCtrl.toggle}
                className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 ${
                  timeCtrl.playing ? 'bg-[#d29922] text-black shadow-md' : 'bg-cyan-400 text-black hover:bg-cyan-300'
                }`}
              >
                {timeCtrl.playing ? (
                  <>
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <span>Run MET</span>
                  </>
                )}
              </button>

              <button
                onClick={() => timeCtrl.setTRel(0)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs transition cursor-pointer border border-slate-700/50"
                title="Reset to Touchdown T+0h"
              >
                ↺ T+0
              </button>

              {/* Speed Multipliers */}
              <div className="flex items-center gap-1 bg-[#0b1324] rounded-xl p-0.5 border border-slate-800">
                {SPEED_OPTIONS.map(spd => (
                  <button
                    key={spd}
                    onClick={() => timeCtrl.setSpeed(spd)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] cursor-pointer transition ${
                      timeCtrl.speed === spd ? 'bg-[#0B3D91] text-cyan-200 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}h/s
                  </button>
                ))}
              </div>
            </div>

            {/* Mission Elapsed Time Readout */}
            <div className="flex items-center gap-4 text-xs">
              <div className="bg-[#0b1324] px-3 py-1 rounded-xl border border-slate-800 flex items-center gap-2">
                <span className="text-[10px] text-slate-500 uppercase">MISSION ELAPSED:</span>
                <span className="text-cyan-400 font-bold tracking-wider">
                  MET +{String(metDays).padStart(2, '0')}d {String(metHours).padStart(2, '0')}h {String(metMinutes).padStart(2, '0')}m
                </span>
              </div>
              <div className="hidden md:block text-[11px] text-slate-400">
                Touchdown: <strong className="text-slate-200">{landing.toISOString().slice(0, 10)}</strong>
              </div>
            </div>
          </div>

          {/* Timeline Multi-Track Scrubber (NLE style) */}
          <div className="space-y-1 relative">
            {/* Day / Hour Ruler Ticks */}
            <div className="flex justify-between text-[9px] text-slate-500 font-mono px-1">
              <span>T+0d</span>
              <span>D2</span>
              <span>D4</span>
              <span>D6</span>
              <span>D8</span>
              <span>D10</span>
              <span>D12</span>
              <span>D14 (T+336h)</span>
            </div>

            {/* Ribbon Track Container */}
            <div className="relative h-6 bg-slate-950/80 rounded-lg border border-slate-800 overflow-hidden flex flex-col justify-center">
              {/* Solar Track Ribbon (Golden when sunlit) */}
              <div className="h-2 w-full flex">
                {series.sunEl.map((el, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-full"
                    style={{
                      backgroundColor: el > 2 ? '#ffd25a' : el > 0 ? '#f59e0b' : '#0f172a'
                    }}
                  />
                ))}
              </div>

              {/* Earth RF Track Ribbon (Cyan when visible) */}
              <div className="h-1.5 w-full flex mt-0.5">
                {series.earthEl.map((el, idx) => (
                  <div
                    key={idx}
                    className="flex-1 h-full"
                    style={{
                      backgroundColor: el > 0 ? '#00f0ff' : '#450a0a'
                    }}
                  />
                ))}
              </div>

              {/* Interactive Scrub Range Input Overlay */}
              <input
                type="range"
                min={0}
                max={maxHours}
                step={0.2}
                value={timeCtrl.tRel}
                onChange={(e) => timeCtrl.setTRel(parseFloat(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-10"
              />

              {/* Playhead Needle Cursor */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-400 pointer-events-none z-20 shadow-[0_0_8px_#f87171]"
                style={{ left: `${(timeCtrl.tRel / maxHours) * 100}%` }}
              >
                <div className="w-2.5 h-2.5 bg-red-400 rounded-full -ml-1 -mt-0.5"></div>
              </div>
            </div>
          </div>

          {/* Bottom Strip: Earth Launch Date & Launch Slip Controls */}
          <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Earth Launch:</span>
                <input
                  type="date"
                  min="2027-01-01"
                  max="2028-01-10"
                  value={launchDate.slice(0, 10)}
                  onChange={(e) => setLaunchDate(`${e.target.value}T00:00:00Z`)}
                  className="bg-[#0b1324] border border-slate-700 rounded-lg px-2 py-0.5 text-slate-200 text-[10px] cursor-pointer focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span>Transit:</span>
                <span className="text-cyan-400 font-bold">{transitDays} days</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span>Launch Slip (±7d sensitivity):</span>
              <input
                type="range"
                min={-7}
                max={7}
                step={1}
                value={slipDays}
                onChange={(e) => setSlipDays(parseInt(e.target.value, 10))}
                className="w-24 h-1 bg-slate-900 rounded appearance-none cursor-pointer accent-cyan-400"
              />
              <span className={`font-bold font-mono ${slipDays !== 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {slipDays > 0 ? `+${slipDays}d slip` : `${slipDays}d slip`}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* 5. MODAL: FULLSCREEN NASA MISSION CONTROL TRADE STUDY (COMPARE) */}
      {showCompareModal && (
        <div className="fixed inset-0 z-40 bg-[#050814]/90 backdrop-blur-3xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0B3D91] flex items-center justify-center text-white font-display font-bold text-xs shadow-md">
                  NASA
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white tracking-wide">
                    Lunar Landing Site Trade Study // Side-by-Side Dual Analysis
                  </h2>
                  <p className="text-xs text-slate-400">
                    Comparative ephemeris, solar array generation curves, and direct-to-Earth RF visibility.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono transition cursor-pointer border border-slate-700/60"
              >
                Close Trade Study
              </button>
            </div>

            <div className="flex-1">
              <Compare
                sites={sites}
                ephem={ephem}
                scenarioA={scenarioA}
                setScenarioA={(newScen) => {
                  if (newScen.siteId) setSelectedSiteId(newScen.siteId);
                  if (newScen.launchDate) setLaunchDate(newScen.launchDate);
                  if (newScen.transitDays) setTransitDays(newScen.transitDays);
                  if (newScen.customSite !== undefined) setCustomSite(newScen.customSite);
                }}
                scenarioB={scenarioB}
                setScenarioB={setScenarioB}
                compareMode={compareMode}
                setCompareMode={setCompareMode}
                tRel={timeCtrl.tRel}
                setTRel={timeCtrl.setTRel}
                viewMode={viewMode}
                setViewMode={setViewMode}
                quality="high"
                setQuality={() => {}}
                missionDays={missionDays}
                setMissionDays={() => {}}
                objectHeightM={objectHeightM}
                slipDays={slipDays}
                setSlipDays={setSlipDays}
              />
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL: 14-DAY TIMELINE & CALENDAR */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-40 bg-[#050814]/90 backdrop-blur-3xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center text-sky-400">
                  <svg className="w-4 h-4 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                    14-Day Celestial Horizon Curves & Launch Windows
                  </h2>
                  <p className="text-xs text-slate-400">
                    Sun (golden) and Earth (cyan) elevation trajectories relative to {site.name}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTimelineModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono transition cursor-pointer border border-slate-700"
              >
                Close Timeline
              </button>
            </div>

            <div className="bg-[#070e1c] border border-slate-800 rounded-2xl p-6">
              <Timeline
                series={series}
                tRel={timeCtrl.tRel}
                onSeek={timeCtrl.setTRel}
                height={280}
              />
            </div>

            <div className="bg-[#070e1c] border border-slate-800 rounded-2xl p-6">
              <Calendar
                sites={sites}
                ephem={ephem}
                missionDays={missionDays}
                onSelectOpportunity={(opp) => {
                  setSelectedSiteId(opp.site.id);
                  setLaunchDate(`${opp.dateStr}T00:00:00Z`);
                  setShowTimelineModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 7. OVERLAY: 3D SOLAR SYSTEM & ORBITAL LAUNCH SIMULATION */}
      {showIntro && (
        <SpaceIntroScene
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={handleSelectSite}
          launchDate={launchDate}
          onLaunchDateChange={setLaunchDate}
          transitDays={transitDays}
          onTransitDaysChange={setTransitDays}
          onSkipIntro={() => setShowIntro(false)}
          onReachedMoon={() => {
            setShowIntro(false);
            setShowTelemetrySidebars(true);
          }}
        />
      )}
    </div>
  );
}

export default App;
