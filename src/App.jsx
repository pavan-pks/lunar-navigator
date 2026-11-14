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
import { NasaResourcesModal } from './components/ui/NasaResourcesModal.jsx';
import { MinimalMissionReport } from './components/ui/MinimalMissionReport.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';

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
  const [isZooming, setIsZooming] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

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

  const handleSelectSite = (newSiteId) => {
    if (newSiteId === 'custom') {
      const lat = prompt('Enter custom Latitude (-90° to +90°):', '-89.5');
      const lon = prompt('Enter custom Longitude (-180° to +180°):', '45.0');
      const latNum = parseFloat(lat);
      const lonNum = parseFloat(lon);
      if (!isNaN(latNum) && !isNaN(lonNum)) {
        const custom = {
          id: `custom-${latNum.toFixed(2)}-${lonNum.toFixed(2)}`,
          name: `Custom (${latNum.toFixed(2)}°, ${lonNum.toFixed(2)}°)`,
          lat: latNum,
          lon: lonNum,
          terrainType: 'plain'
        };
        setCustomSite(custom);
        setSelectedSiteId(custom.id);
      }
    } else {
      setCustomSite(null);
      setSelectedSiteId(newSiteId);
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

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black text-slate-200 flex flex-col items-center justify-center p-6 space-y-4 font-mono select-none">
        <div className="w-12 h-12 border-2 border-sky-500/20 border-t-sky-400 rounded-full animate-spin"></div>
        <p className="text-xs text-slate-400 tracking-wider uppercase">Loading NASA/JPL Lunar Ephemeris Telemetry…</p>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  const { sites, ephem } = data;
  const currentDay = (timeCtrl.tRel / 24).toFixed(1);
  const currentHour = Math.floor(timeCtrl.tRel);

  const scenarioA = {
    siteId: selectedSiteId,
    launchDate,
    transitDays,
    customSite
  };

  return (
    <div className="h-screen w-screen bg-black text-[#f0f6fc] overflow-hidden font-sans select-none relative">
      {/* 1. FULLSCREEN 3D LUNAR SURFACE VIEWPORT (Edge-to-Edge) */}
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

      {/* 2. MINIMAL FLOATING GLASSMORPHIC HEADER */}
      <header className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between gap-3 pointer-events-none">
        {/* Brand & Landing Site Glass Pill */}
        <div className="flex items-center gap-2.5 bg-black/45 backdrop-blur-2xl border border-white/15 rounded-2xl px-4 py-2 shadow-2xl pointer-events-auto">
          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.3)]">
            <span className="text-sky-400 font-bold text-sm">☾</span>
          </div>
          <div>
            <div className="font-display font-extrabold text-xs tracking-wider uppercase flex items-center gap-1.5">
              <span>LUNAR</span>
              <span className="text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">NAVIGATOR</span>
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>NASA Artemis</span>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10 mx-1"></div>

          {/* Quick Glass Site Selector */}
          <select
            value={customSite ? 'custom' : selectedSiteId}
            onChange={(e) => handleSelectSite(e.target.value)}
            className="bg-black/50 border border-white/15 rounded-xl px-3 py-1.5 text-slate-200 text-xs font-mono cursor-pointer focus:outline-none focus:border-sky-400 transition hover:border-white/30"
          >
            <optgroup label="Curated Polar Sites">
              {sites.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`} S)
                </option>
              ))}
            </optgroup>
            <option value="custom">Custom Coordinates (Lat/Lon)...</option>
          </select>
        </div>

        {/* Center: Camera View Glass Segmented Control */}
        <div className="hidden md:flex items-center bg-black/45 backdrop-blur-2xl border border-white/15 rounded-2xl p-1 shadow-2xl pointer-events-auto font-mono text-[11px]">
          <button
            onClick={() => setViewMode('orbit')}
            className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
              viewMode === 'orbit' ? 'bg-sky-500/25 border border-sky-400/40 text-sky-200 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Orbit Nadir
          </button>
          <button
            onClick={() => setViewMode('astronaut')}
            className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
              viewMode === 'astronaut' ? 'bg-sky-500/25 border border-sky-400/40 text-sky-200 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Astronaut EVA
          </button>
          <button
            onClick={() => setViewMode('earth')}
            className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
              viewMode === 'earth' ? 'bg-sky-500/25 border border-sky-400/40 text-sky-200 font-bold shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Earth Line-of-Sight
          </button>
        </div>

        {/* Right: Modal Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Minimal NASA Assessment Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-sky-500/20 hover:bg-sky-500/30 backdrop-blur-2xl border border-sky-400/40 text-sky-200 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)] cursor-pointer"
            title="Inspect Minimal NASA Mission Report & Embedded GIS"
          >
            <span>📋</span>
            <span>Mission Report</span>
          </button>

          {/* NASA & Partner Resources Portal */}
          <button
            onClick={() => setShowResourcesModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-black/45 hover:bg-black/60 backdrop-blur-2xl border border-white/15 hover:border-sky-400/50 text-slate-200 text-xs font-mono font-semibold transition-all shadow-xl cursor-pointer"
            title="Access QuickMap, Moon Trek, JPL Horizons, and CSA Moon Exploration"
          >
            <span>🛰️</span>
            <span className="hidden sm:inline">Resources</span>
          </button>

          {/* Compare Sites Button */}
          <button
            onClick={() => setShowCompareModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-black/45 hover:bg-black/60 backdrop-blur-2xl border border-white/15 hover:border-sky-400/50 text-slate-200 text-xs font-mono font-semibold transition-all shadow-xl cursor-pointer"
          >
            <span>⚖️</span>
            <span className="hidden sm:inline">Compare Sites</span>
          </button>

          {/* Timeline & Calendar Button */}
          <button
            onClick={() => setShowTimelineModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-black/45 hover:bg-black/60 backdrop-blur-2xl border border-white/15 hover:border-sky-400/50 text-slate-200 text-xs font-mono font-semibold transition-all shadow-xl cursor-pointer"
          >
            <span>▦</span>
            <span className="hidden sm:inline">Timeline</span>
          </button>

          {/* Space Orbit / Intro Zoom Button */}
          <button
            onClick={() => setShowIntro(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-sky-500/20 to-amber-500/20 hover:from-sky-500/30 hover:to-amber-500/30 backdrop-blur-2xl border border-sky-400/30 text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(56,189,248,0.25)] cursor-pointer"
          >
            <span>☀️</span>
            <span>Space View</span>
          </button>
        </div>
      </header>

      {/* 3. FLOATING GLASS TELEMETRY METRIC CARDS (Top-Left) */}
      <div className="absolute top-20 left-4 z-20 space-y-2.5 pointer-events-none">
        {/* Solar Illumination Card */}
        <div className="bg-black/45 backdrop-blur-2xl border border-white/15 rounded-2xl p-3.5 shadow-2xl pointer-events-auto w-64 transition-all hover:bg-black/60 hover:border-amber-400/40">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="uppercase tracking-wider">SOLAR ILLUMINATION</span>
            <span className="text-amber-400">☀️</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className={`text-2xl font-extrabold font-mono ${live.sunEl > 0 ? 'text-[#ffd25a]' : 'text-slate-500'}`}>
              {live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`}
            </div>
            <div className="text-xs font-mono text-amber-300 font-semibold">
              {powerEfficiencyPct}% Output
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex justify-between border-t border-white/10 pt-1.5">
            <span>Countdown to Sunset:</span>
            <span className="text-amber-400 font-bold">
              {timeToSunset !== null ? `${timeToSunset}h` : 'Continuous Light'}
            </span>
          </div>
        </div>

        {/* Earth Line-of-Sight Card */}
        <div className="bg-black/45 backdrop-blur-2xl border border-white/15 rounded-2xl p-3.5 shadow-2xl pointer-events-auto w-64 transition-all hover:bg-black/60 hover:border-emerald-400/40">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="uppercase tracking-wider">EARTH DIRECT LOS</span>
            <span className="text-emerald-400">🌍</span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <div className={`text-2xl font-extrabold font-mono ${live.earthEl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {live.earthEl > 0 ? `+${live.earthEl.toFixed(1)}°` : `${live.earthEl.toFixed(1)}°`}
            </div>
            <div className="text-xs font-mono text-emerald-300 font-semibold">
              {live.earthEl > 0 ? 'Direct RF Locked' : 'Occulted'}
            </div>
          </div>
          <div className="text-[11px] font-mono text-slate-400 mt-1 flex justify-between border-t border-white/10 pt-1.5">
            <span>Countdown to Earthset:</span>
            <span className="text-emerald-400 font-bold">
              {timeToEarthset !== null ? `${timeToEarthset}h` : 'Continuous LOS'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. FLOATING MISSION VIABILITY BADGE (Top-Right) */}
      <div className="absolute top-20 right-4 z-20 pointer-events-auto">
        <div className="bg-black/45 backdrop-blur-2xl border border-white/15 rounded-2xl p-3.5 shadow-2xl space-y-2 text-right font-mono text-xs w-60">
          <div className="flex items-center justify-end gap-2">
            <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
              verdict.status === 'VIABLE' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' :
              verdict.status === 'MARGINAL' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' :
              'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
            }`} />
            <span className="font-extrabold text-sm text-white">{verdict.badge}</span>
          </div>
          <p className="text-[10px] text-slate-300 font-sans leading-tight">
            {verdict.reason}
          </p>
          <div className="border-t border-white/10 pt-1.5 space-y-1 text-[10px] text-slate-400">
            <div className="flex justify-between">
              <span>Lander Shadow:</span>
              <span className="text-slate-200 font-bold">{Number.isFinite(shadowM) ? `${shadowM.toFixed(1)}m` : 'Blackout'}</span>
            </div>
            <div className="flex justify-between">
              <span>14-Day Sunlit:</span>
              <span className="text-slate-200 font-bold">{(stats.sunlitFraction * 100).toFixed(0)}% ({stats.sunlitHours}h)</span>
            </div>
          </div>
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full mt-1.5 py-1 px-2 rounded-xl bg-white/10 hover:bg-sky-500/25 text-sky-300 text-[10px] font-mono font-semibold transition cursor-pointer flex items-center justify-center gap-1 border border-white/10 hover:border-sky-400/40"
          >
            <span>Inspect Report & GIS ↗</span>
          </button>
        </div>
      </div>

      {/* 5. MINIMAL FLOATING GLASS SCRUBBER DOCK (Bottom-Center) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 w-full max-w-2xl px-4 pointer-events-auto">
        <div className="bg-black/50 backdrop-blur-2xl border border-white/15 rounded-3xl p-3 sm:p-4 shadow-[0_10px_40px_rgba(0,0,0,0.8)] space-y-2 font-mono text-xs">
          {/* Controls & Time Scrub */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={timeCtrl.toggle}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-md ${
                  timeCtrl.playing ? 'bg-[#d29922] text-black' : 'bg-sky-400 text-black hover:bg-sky-300'
                }`}
              >
                {timeCtrl.playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={() => timeCtrl.setTRel(0)}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs transition cursor-pointer"
                title="Reset to Touchdown T+0h"
              >
                ↺ T+0
              </button>
              <div className="hidden sm:flex items-center gap-1 bg-black/40 rounded-xl p-0.5 border border-white/10">
                {SPEED_OPTIONS.map(spd => (
                  <button
                    key={spd}
                    onClick={() => timeCtrl.setSpeed(spd)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] cursor-pointer transition ${
                      timeCtrl.speed === spd ? 'bg-sky-400 text-black font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}h/s
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <div className="flex-1 flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={maxHours}
                step={0.2}
                value={timeCtrl.tRel}
                onChange={(e) => timeCtrl.setTRel(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Elapsed MET */}
            <div className="text-right whitespace-nowrap text-[11px] text-slate-200">
              MET <strong className="text-sky-400 font-bold">+{currentHour}h</strong> ({currentDay}d)
            </div>
          </div>

          {/* Minimal Flight Date & Launch Slip Strip */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-white/10 pt-2 px-1">
            <div className="flex items-center gap-2">
              <span>Earth Launch:</span>
              <input
                type="date"
                min="2027-01-01"
                max="2028-01-10"
                value={launchDate.slice(0, 10)}
                onChange={(e) => setLaunchDate(`${e.target.value}T00:00:00Z`)}
                className="bg-black/60 border border-white/10 rounded-lg px-2 py-0.5 text-slate-200 text-[10px] cursor-pointer focus:outline-none focus:border-sky-400"
              />
            </div>

            <div className="flex items-center gap-2">
              <span>Launch Slip:</span>
              <input
                type="range"
                min={-7}
                max={7}
                step={1}
                value={slipDays}
                onChange={(e) => setSlipDays(parseInt(e.target.value, 10))}
                className="w-20 h-1 bg-slate-900 rounded appearance-none cursor-pointer accent-sky-400"
              />
              <span className={`font-bold ${slipDays !== 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                {slipDays > 0 ? `+${slipDays}d` : `${slipDays}d`}
              </span>
            </div>

            <div className="hidden sm:block">
              Touchdown: <strong className="text-sky-400">{landing.toISOString().slice(0, 10)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 6. MODAL: FULLSCREEN GLASS SIDE-BY-SIDE TRADE STUDY */}
      {showCompareModal && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-3xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-white/15 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚖️</span>
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                    Side-by-Side Lunar Landing Trade Study
                  </h2>
                  <p className="text-xs text-slate-400">
                    Compare Sun & Earth positions, power windows, and communication clearance across two sites or dates.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition cursor-pointer"
              >
                ✕ Close Comparison
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

      {/* 7. MODAL: 14-DAY TIMELINE & CALENDAR */}
      {showTimelineModal && (
        <div className="fixed inset-0 z-40 bg-black/85 backdrop-blur-3xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col space-y-6">
            <div className="flex items-center justify-between border-b border-white/15 pb-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">▦</span>
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
                className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition cursor-pointer"
              >
                ✕ Close Timeline
              </button>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-2xl p-6">
              <Timeline
                series={series}
                tRel={timeCtrl.tRel}
                onSeek={timeCtrl.setTRel}
                height={280}
              />
            </div>

            <div className="bg-black/50 border border-white/10 rounded-2xl p-6">
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

      {/* 8. OVERLAY: 3D SOLAR SYSTEM INTRO & MOON ZOOM */}
      {showIntro && (
        <SpaceIntroScene
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={(id) => setSelectedSiteId(id)}
          launchDate={launchDate}
          onLaunchDateChange={setLaunchDate}
          transitDays={transitDays}
          onTransitDaysChange={setTransitDays}
          onSkipIntro={() => {
            setIsZooming(false);
            setShowIntro(false);
          }}
          onReachedMoon={() => {
            setIsZooming(false);
            setShowIntro(false);
            setShowReportModal(true);
          }}
        />
      )}

      {/* 9. MODAL: NASA & SPACE AGENCY PARTNER RESOURCES */}
      <NasaResourcesModal
        isOpen={showResourcesModal}
        onClose={() => setShowResourcesModal(false)}
        selectedSite={site}
      />

      {/* 10. MODAL: MINIMAL NASA MISSION REPORT & EMBEDDED GIS */}
      <MinimalMissionReport
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        site={site}
        landingDateStr={landing.toISOString().slice(0, 10)}
        stats={stats}
        live={live}
        verdict={verdict}
        timeToSunset={timeToSunset}
        timeToEarthset={timeToEarthset}
        ephem={ephem}
      />
    </div>
  );
}

export default App;
