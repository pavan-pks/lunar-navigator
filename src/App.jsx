import React, { useState, useEffect, useMemo } from 'react';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController, SPEED_OPTIONS } from './lib/useTimeController.js';
import { getLunarTime } from './lib/lunarTime.js';
import { sampleSeries, valuesAt, hoursSince } from './lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate, timeToNext, shadowLength } from './lib/metrics.js';

import { TopBar } from './components/ui/TopBar.jsx';
import { ScenePanel } from './components/ui/ScenePanel.jsx';
import { SpaceIntroScene } from './components/story/SpaceIntroScene.jsx';
import { VisorHud } from './components/ui/VisorHud.jsx';
import { Compare } from './components/ui/Compare.jsx';
import { Timeline } from './components/ui/Timeline.jsx';
import { Calendar } from './components/ui/Calendar.jsx';
import { BatteryPanel } from './components/ui/BatteryPanel.jsx';
import { SitePicker } from './components/ui/SitePicker.jsx';
import { DateControls } from './components/ui/DateControls.jsx';
import { VerdictBadge } from './components/ui/VerdictBadge.jsx';
import { ExplorerCaptions } from './components/ui/ExplorerCaptions.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active navigation tab: 'surface' | 'compare' | 'timeline' | 'battery'
  const [activeTab, setActiveTab] = useState('surface');
  // Audience mode: 'planner' (technical telemetry) | 'explorer' (educational captions)
  const [uiMode, setUiMode] = useState('planner');
  const [quality, setQuality] = useState('high');

  // Selected site & custom coordinates
  const [selectedSiteId, setSelectedSiteId] = useState('shackleton');
  const [customSite, setCustomSite] = useState(null);

  // Mission date & flight dynamics
  const [launchDate, setLaunchDate] = useState('2027-03-08T00:00:00Z');
  const [transitDays, setTransitDays] = useState(4);
  const [slipDays, setSlipDays] = useState(0);
  const missionDays = 14;
  const maxHours = missionDays * 24;
  const objectHeightM = 3.0;

  // View mode in 3D: 'orbit' | 'astronaut' | 'earth'
  const [viewMode, setViewMode] = useState('orbit');

  // Story Mode & Solar Zoom overlay
  const [showIntro, setShowIntro] = useState(() => {
    return !window.location.hash.includes('nointro');
  });
  const [isZooming, setIsZooming] = useState(false);
  const [showVisor, setShowVisor] = useState(false);

  // Time controller for 14-day mission scrub
  const timeCtrl = useTimeController({ maxHours, initialSpeed: 12 });

  // Secondary scenario for Side-by-Side Trade Study comparison
  const [scenarioB, setScenarioB] = useState({
    siteId: 'malapert',
    launchDate: '2027-03-08T00:00:00Z',
    transitDays: 4,
    customSite: null
  });
  const [compareMode, setCompareMode] = useState('sites'); // 'sites' | 'dates'

  // Live real-time lunar clock
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

  // Handle site selection (preset or custom)
  const handleSelectSite = (newSite) => {
    if (typeof newSite === 'string') {
      setSelectedSiteId(newSite);
      setCustomSite(null);
    } else if (newSite?.id?.startsWith('custom-')) {
      setCustomSite(newSite);
      setSelectedSiteId(newSite.id);
    } else if (newSite?.id) {
      setSelectedSiteId(newSite.id);
      setCustomSite(null);
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

  // Operational Countdowns: Time remaining before Sunset & Earthset
  const timeToSunset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'sunset'), [series, timeCtrl.tRel]);
  const timeToEarthset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'earthset'), [series, timeCtrl.tRel]);

  // Shadow length calculated with Mast height
  const shadowM = shadowLength(objectHeightM, live?.sunEl ?? 0);

  // Power Generation Efficiency (% capability based on solar incidence)
  const powerEfficiencyPct = useMemo(() => {
    if (!live || live.sunEl <= 0) return 0;
    // For vertical or tilted lander solar panels, incidence depends on elevation
    const eff = Math.min(100, Math.max(0, Math.sin((live.sunEl * Math.PI) / 180) * 100 * 2.5));
    return eff.toFixed(0);
  }, [live]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#000000] text-slate-200 flex flex-col items-center justify-center p-6 space-y-4 font-mono select-none">
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

  // Scenario A for Compare component
  const scenarioA = {
    siteId: selectedSiteId,
    launchDate,
    transitDays,
    customSite
  };

  return (
    <div className="h-screen w-screen bg-[#03060c] text-[#f0f6fc] flex flex-col overflow-hidden font-sans select-none">
      {/* Cinematic Aerospace Mission Header */}
      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        uiMode={uiMode}
        onUiModeChange={setUiMode}
        quality={quality}
        onQualityChange={setQuality}
        isFakeData={data.isSample}
        onOpenStoryMode={() => setShowIntro(true)}
        onOpenVisor={() => setShowVisor(true)}
        lunarClock={lunarClock}
      />

      {/* MAIN VIEWPORT BODY */}
      <main className="flex-1 overflow-hidden relative">
        {/* TAB 1: 3D SURFACE & LANDER (Primary Mission Navigator) */}
        {activeTab === 'surface' && (
          <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[1fr_420px] overflow-hidden">
            {/* LEFT: 3D Lunar Surface & Lander Viewport */}
            <div className="relative h-full w-full bg-black flex flex-col overflow-hidden">
              <div className="flex-1 relative w-full h-full">
                <ScenePanel
                  siteId={site.id}
                  terrainType={site.terrainType || 'crater-rim'}
                  sunEl={live.sunEl}
                  sunAz={live.sunAz}
                  earthEl={live.earthEl}
                  earthAz={live.earthAz}
                  viewMode={viewMode}
                  quality={quality}
                  label={`${site.name} • NASA Artemis III`}
                  landerHeight={objectHeightM}
                  showHud={true}
                  showShadowRuler={true}
                />

                {/* Top-Left Camera Mode Controls */}
                <div className="absolute top-3 left-3 z-20 flex items-center gap-2 font-mono text-[11px]">
                  <div className="bg-[#070b14]/90 border border-white/10 rounded-xl p-1 flex shadow-lg backdrop-blur-md">
                    <button
                      onClick={() => setViewMode('orbit')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'orbit' ? 'bg-sky-500 text-black font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Orbit Nadir
                    </button>
                    <button
                      onClick={() => setViewMode('astronaut')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'astronaut' ? 'bg-sky-500 text-black font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Astronaut EVA
                    </button>
                    <button
                      onClick={() => setViewMode('earth')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'earth' ? 'bg-sky-500 text-black font-bold shadow-xs' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Earth Line-of-Sight
                    </button>
                  </div>

                  {/* Active Site Indicator */}
                  <div className="hidden sm:flex bg-[#070b14]/90 border border-white/10 rounded-xl px-3 py-1.5 text-slate-200 font-mono shadow-lg backdrop-blur-md items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                    <span>{site.name}</span>
                    <span className="text-slate-500">({site.lat.toFixed(1)}° S)</span>
                  </div>
                </div>

                {/* Prominent Horizon & Countdowns HUD (Bottom-Left) */}
                <div className="absolute left-3 bottom-16 z-20 grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs pointer-events-none">
                  {/* Solar Elevation */}
                  <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg">
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>SOLAR ELEVATION</span>
                      <span>☀️</span>
                    </div>
                    <div className={`text-base font-bold mt-0.5 ${live.sunEl > 0 ? 'text-[#ffd25a]' : 'text-slate-400'}`}>
                      {live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {live.sunEl > 0 ? `${powerEfficiencyPct}% Solar Output` : 'Night Blackout'}
                    </div>
                  </div>

                  {/* Earth LOS */}
                  <div className="bg-[#070b14]/90 backdrop-blur-md border border-white/10 rounded-xl p-2.5 shadow-lg">
                    <div className="text-[9px] text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>EARTH DIRECT LOS</span>
                      <span>🌍</span>
                    </div>
                    <div className={`text-base font-bold mt-0.5 ${live.earthEl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {live.earthEl > 0 ? `+${live.earthEl.toFixed(1)}°` : `${live.earthEl.toFixed(1)}°`}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {live.earthEl > 0 ? 'Direct RF Locked' : 'Occulted by Rim'}
                    </div>
                  </div>

                  {/* Time to Sunset Countdown */}
                  <div className="bg-[#070b14]/90 backdrop-blur-md border border-amber-500/30 rounded-xl p-2.5 shadow-lg">
                    <div className="text-[9px] text-amber-400 uppercase tracking-wider">
                      TIME TO SUNSET
                    </div>
                    <div className="text-base font-bold text-amber-300 mt-0.5">
                      {timeToSunset !== null ? `${timeToSunset}h` : 'Continuous'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {timeToSunset !== null ? 'Power Window Closes' : 'Quasi-Eternal Light'}
                    </div>
                  </div>

                  {/* Time to Earthset Countdown */}
                  <div className="bg-[#070b14]/90 backdrop-blur-md border border-sky-500/30 rounded-xl p-2.5 shadow-lg">
                    <div className="text-[9px] text-sky-400 uppercase tracking-wider">
                      TIME TO EARTHSET
                    </div>
                    <div className="text-base font-bold text-sky-300 mt-0.5">
                      {timeToEarthset !== null ? `${timeToEarthset}h` : 'Continuous'}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {timeToEarthset !== null ? 'RF Blackout Onset' : 'No Occultation'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Mission Scrubber Bar */}
              <div className="h-14 shrink-0 bg-[#070b14]/95 border-t border-white/10 px-4 flex items-center justify-between gap-4 z-20 font-mono text-xs shadow-xl">
                <div className="flex items-center gap-2">
                  <button
                    onClick={timeCtrl.toggle}
                    className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition cursor-pointer shadow-xs ${
                      timeCtrl.playing ? 'bg-[#d29922] text-black' : 'bg-sky-500 text-black hover:bg-sky-400'
                    }`}
                  >
                    {timeCtrl.playing ? '⏸ Pause' : '▶ Play'}
                  </button>
                  <button
                    onClick={() => timeCtrl.setTRel(0)}
                    className="px-2.5 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-slate-300 text-xs transition cursor-pointer"
                  >
                    ↺ Touchdown
                  </button>
                  <div className="hidden sm:flex items-center gap-1 bg-black/60 rounded-lg p-0.5 border border-white/10">
                    {SPEED_OPTIONS.map(spd => (
                      <button
                        key={spd}
                        onClick={() => timeCtrl.setSpeed(spd)}
                        className={`px-2 py-0.5 rounded text-[10px] cursor-pointer transition ${
                          timeCtrl.speed === spd ? 'bg-sky-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {spd}h/s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scrubber Range Slider */}
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 hidden sm:inline">T+0h</span>
                  <input
                    type="range"
                    min={0}
                    max={maxHours}
                    step={0.2}
                    value={timeCtrl.tRel}
                    onChange={(e) => timeCtrl.setTRel(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400"
                  />
                  <span className="text-[10px] text-slate-500 hidden sm:inline">T+{maxHours}h</span>
                </div>

                {/* Elapsed Mission Time Telemetry */}
                <div className="text-right whitespace-nowrap text-[11px] text-slate-300 font-mono">
                  MET <strong className="text-sky-400">+{currentHour}h</strong> ({currentDay}d)
                </div>
              </div>
            </div>

            {/* RIGHT: Dedicated Lunar Site & Telemetry Controls */}
            <aside className="h-full border-l border-white/10 bg-[#070b14] flex flex-col overflow-y-auto p-4 space-y-4">
              {/* Mission Viability Verdict Badge */}
              <VerdictBadge verdict={verdict} />

              {/* 1. Landing Target Site Picker */}
              <div className="bg-[#03060c] rounded-2xl p-4 border border-white/10 space-y-3">
                <SitePicker
                  sites={sites}
                  selectedSite={site}
                  onSelectSite={handleSelectSite}
                />
                {site.notes && (
                  <p className="text-[11px] text-slate-400 leading-relaxed font-light border-t border-white/5 pt-2">
                    {site.notes}
                  </p>
                )}
              </div>

              {/* 2. Date and Launch Slip Flexibility */}
              <div className="bg-[#03060c] rounded-2xl p-4 border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono font-semibold">
                    Mission Timeline & Launch Slip
                  </span>
                  <span className="text-[10px] font-mono text-sky-400 font-bold">
                    {slipDays !== 0 ? `${slipDays > 0 ? `+${slipDays}` : slipDays}d Slip` : 'On Schedule'}
                  </span>
                </div>

                <DateControls
                  launchDate={launchDate}
                  onLaunchDateChange={setLaunchDate}
                  transitDays={transitDays}
                  onTransitDaysChange={setTransitDays}
                  missionDays={missionDays}
                  slipDays={slipDays}
                  onSlipDaysChange={setSlipDays}
                  showSlipSlider={true}
                />
              </div>

              {/* 3. Real-Time Horizon Telemetry & Shadow */}
              <div className="bg-[#03060c] rounded-2xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse"></span>
                    Horizon Clearance Metrics
                  </span>
                  <span className="text-[10px] text-slate-500">Lander Mast: {objectHeightM}m</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Lander Shadow</span>
                    <span className="font-bold text-slate-100 text-xs">
                      {Number.isFinite(shadowM) ? `${shadowM.toFixed(1)} m` : 'Horizon Blocked'}
                    </span>
                  </div>

                  <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">Solar Power Capacity</span>
                    <span className={`font-bold text-xs ${live.sunEl > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                      {powerEfficiencyPct}%
                    </span>
                  </div>
                </div>

                {/* 14-Day Cumulative Summary */}
                <div className="space-y-1.5 text-[11px] pt-1 border-t border-white/5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total Solar Illumination:</span>
                    <span className="text-slate-200 font-bold">
                      {(stats.sunlitFraction * 100).toFixed(1)}% ({stats.sunlitHours}h)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Peak Thermal Darkness:</span>
                    <span className={`font-bold ${stats.longestDarkHours > 48 ? 'text-amber-400' : 'text-slate-200'}`}>
                      {stats.longestDarkHours}h
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Earth Direct RF Visibility:</span>
                    <span className="text-emerald-400 font-bold">
                      {(stats.earthVisibleFraction * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Educational Insights (Educator / Public mode) */}
              {uiMode === 'explorer' && (
                <div className="bg-[#03060c] rounded-2xl p-4 border border-amber-500/20">
                  <ExplorerCaptions site={site} live={live} stats={stats} />
                </div>
              )}
            </aside>
          </div>
        )}

        {/* TAB 2: SIDE-BY-SIDE TRADE STUDY COMPARISON */}
        {activeTab === 'compare' && (
          <div className="h-full w-full overflow-y-auto p-4 sm:p-6 bg-[#03060c]">
            <div className="max-w-7xl mx-auto">
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
                quality={quality}
                setQuality={setQuality}
                missionDays={missionDays}
                setMissionDays={() => {}}
                objectHeightM={objectHeightM}
                slipDays={slipDays}
                setSlipDays={setSlipDays}
              />
            </div>
          </div>
        )}

        {/* TAB 3: 14-DAY TIMELINE & LAUNCH WINDOWS */}
        {activeTab === 'timeline' && (
          <div className="h-full w-full overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#03060c]">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Interactive Elevation Curve Timeline */}
              <div className="bg-[#070b14] rounded-2xl p-6 border border-white/10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div>
                    <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
                      <span>14-Day Celestial Horizon Curves</span>
                      <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                        {site.name}
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Continuous Sun (golden) and Earth (cyan) elevation relative to the local lunar horizon. Click graph to jump time.
                    </p>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-slate-400">Current Scrub: </span>
                    <strong className="text-sky-400">T+{currentHour}h ({currentDay}d)</strong>
                  </div>
                </div>

                <Timeline
                  series={series}
                  tRel={timeCtrl.tRel}
                  onSeek={timeCtrl.setTRel}
                  height={260}
                />
              </div>

              {/* Full-Year 2027 Opportunity Heatmap Matrix */}
              <Calendar
                sites={sites}
                ephem={ephem}
                missionDays={missionDays}
                onSelectOpportunity={(opp) => {
                  setSelectedSiteId(opp.site.id);
                  setLaunchDate(`${opp.dateStr}T00:00:00Z`);
                  setActiveTab('surface');
                }}
              />
            </div>
          </div>
        )}

        {/* TAB 4: ENERGY & BATTERY SURVIVAL */}
        {activeTab === 'battery' && (
          <div className="h-full w-full overflow-y-auto p-4 sm:p-6 bg-[#03060c]">
            <div className="max-w-7xl mx-auto">
              <BatteryPanel
                sites={sites}
                ephem={ephem}
                scenarioA={scenarioA}
                scenarioB={scenarioB}
                missionDays={missionDays}
              />
            </div>
          </div>
        )}
      </main>

      {/* OVERLAY: 3D SOLAR SYSTEM OPENER & MOON ZOOM */}
      {showIntro && (
        <SpaceIntroScene
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={(id) => setSelectedSiteId(id)}
          isZooming={isZooming}
          onStartZoom={() => setIsZooming(true)}
          onSkipIntro={() => {
            setIsZooming(false);
            setShowIntro(false);
          }}
          onReachedMoon={() => {
            setIsZooming(false);
            setShowIntro(false);
          }}
        />
      )}

      {/* OVERLAY: ASTRONAUT HELMET VISOR HUD */}
      {showVisor && (
        <VisorHud
          isOpen={showVisor}
          onClose={() => setShowVisor(false)}
          sunEl={live.sunEl}
          earthEl={live.earthEl}
          siteName={site.name}
        />
      )}
    </div>
  );
}

export default App;
