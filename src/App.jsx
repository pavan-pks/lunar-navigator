import React, { useState, useEffect, useMemo } from 'react';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController, SPEED_OPTIONS } from './lib/useTimeController.js';
import { getLunarTime } from './lib/lunarTime.js';
import { sampleSeries, valuesAt, hoursSince } from './lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate, timeToNext } from './lib/metrics.js';

import { ScenePanel } from './components/ui/ScenePanel.jsx';
import { LunarIntro } from './components/story/LunarIntro.jsx';
import { VisorHud } from './components/ui/VisorHud.jsx';
import { MissionsTab } from './components/ui/MissionsTab.jsx';
import { RoutePlannerTab } from './components/ui/RoutePlannerTab.jsx';
import { CrewTab } from './components/ui/CrewTab.jsx';
import { SitesTab } from './components/ui/SitesTab.jsx';
import { ConditionsTab } from './components/ui/ConditionsTab.jsx';
import { ScienceTab } from './components/ui/ScienceTab.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active panel tab: 'missions' | 'route' | 'crew' | 'sites' | 'conditions' | 'science'
  const [activeTab, setActiveTab] = useState('missions');
  const [selectedSiteId, setSelectedSiteId] = useState('shackleton');
  const [viewMode, setViewMode] = useState('orbit');
  const [objectHeightM, setObjectHeightM] = useState(3.0);

  // Overlays
  const [showIntro, setShowIntro] = useState(() => {
    return !window.location.hash.includes('nointro');
  });
  const [showVisor, setShowVisor] = useState(false);

  // 14-day sortie time controller
  const missionDays = 14;
  const maxHours = missionDays * 24;
  const timeCtrl = useTimeController({ maxHours, initialSpeed: 12 });

  // Clock state
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
    if (!data?.sites) return { id: 'shackleton', name: 'Shackleton Rim', lat: -89.9, lon: 0.0, terrainType: 'crater' };
    return data.sites.find(s => s.id === selectedSiteId) || data.sites[0];
  }, [data, selectedSiteId]);

  const landing = landingDate('2027-03-08T00:00:00Z', 4);
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

  const { sites } = data;
  const currentDay = (timeCtrl.tRel / 24).toFixed(1);
  const currentHour = Math.floor(timeCtrl.tRel);

  return (
    <div className="h-screen w-screen bg-[#000000] text-[#f0f6fc] flex flex-col overflow-hidden font-sans select-none">
      {/* 50px Fixed Mission Header */}
      <header className="h-[50px] shrink-0 border-b border-[#21262d] bg-[#0d1117] px-5 flex items-center justify-between gap-4 z-30">
        <div className="flex items-center gap-3">
          <div className="font-display font-bold text-sm tracking-wider uppercase">
            LUNAR <span className="text-sky-400">NAVIGATOR</span>
          </div>
          <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold">
            ARTEMIS // POLAR OPS
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          {/* Live Lunar Clock */}
          <div
            className="text-[#8b949e] text-[11px] hidden md:block text-right cursor-help"
            title={`Coordinated Lunar Time: ${lunarClock.ltcString} • Phase: ${lunarClock.phaseName} (${lunarClock.illumPct}% illuminated) • Distance: ${lunarClock.distKm.toLocaleString()} km`}
          >
            <b>{lunarClock.ltcString}</b> • <span className="text-slate-300">{lunarClock.illumPct}% ILLUM</span> • {lunarClock.lightSeconds}s DELAY
          </div>

          {/* Visor HUD Trigger */}
          <button
            onClick={() => setShowVisor(true)}
            className="px-2.5 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-200 border border-[#30363d] text-[11px] transition cursor-pointer flex items-center gap-1.5"
          >
            <span>👨‍🚀</span>
            <span className="hidden sm:inline">Visor HUD</span>
          </button>

          {/* Watch Intro Replay */}
          <button
            onClick={() => setShowIntro(true)}
            className="px-2.5 py-1 rounded bg-transparent hover:bg-[#21262d] text-slate-300 border border-[#30363d] text-[11px] transition cursor-pointer"
          >
            Watch Intro
          </button>
        </div>
      </header>

      {/* Main Grid: Left Map/3D Canvas (1fr), Right Tools Sidebar (400px) */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_400px] h-[calc(100vh-50px)] overflow-hidden relative">
        {/* LEFT COLUMN: PRIMARY 3D VISUALIZER */}
        <div className="relative h-full w-full bg-black flex flex-col overflow-hidden">
          {/* 3D Lunar Surface & Lander Scene */}
          <div className="flex-1 relative w-full h-full">
            <ScenePanel
              siteId={site.id}
              terrainType={site.terrainType}
              sunEl={live.sunEl}
              sunAz={live.sunAz}
              earthEl={live.earthEl}
              earthAz={live.earthAz}
              viewMode={viewMode}
              quality="high"
              label={`${site.name} • NASA Artemis III`}
              landerHeight={objectHeightM}
              showHud={true}
              showShadowRuler={true}
            />

            {/* In-Scene Top Camera Toggles */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 font-mono text-[11px]">
              <div className="bg-[#0d1117]/90 border border-[#21262d] rounded-lg p-0.5 flex">
                <button
                  onClick={() => setViewMode('orbit')}
                  className={`px-2.5 py-1 rounded transition ${
                    viewMode === 'orbit' ? 'bg-sky-500 text-black font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Orbit Nadir
                </button>
                <button
                  onClick={() => setViewMode('astronaut')}
                  className={`px-2.5 py-1 rounded transition ${
                    viewMode === 'astronaut' ? 'bg-sky-500 text-black font-bold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Astronaut EVA
                </button>
              </div>

              {/* Site indicator badge */}
              <div className="bg-[#0d1117]/90 border border-[#21262d] rounded-lg px-2.5 py-1 text-slate-200 font-mono">
                {site.name} ({site.lat.toFixed(1)}° S)
              </div>
            </div>

            {/* Bottom-Left Live Readout Badge */}
            <div className="absolute left-3 bottom-16 z-20 bg-[#0d1117]/90 border border-[#21262d] rounded-lg px-3 py-1.5 font-mono text-[11px] text-slate-200 pointer-events-none backdrop-blur-xs flex items-center gap-3">
              <div>
                <span className="text-[#8b949e] block text-[9px]">SOLAR ELEVATION</span>
                <span className={live.sunEl > 0 ? 'text-[#ffd25a] font-bold' : 'text-slate-400 font-bold'}>
                  {live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`}
                </span>
              </div>
              <div className="h-5 w-px bg-[#21262d]"></div>
              <div>
                <span className="text-[#8b949e] block text-[9px]">EARTH DIRECT LOS</span>
                <span className="text-[#3fb950] font-bold">
                  +{live.earthEl.toFixed(1)}° DIRECT
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Mission Scrubber Bar */}
          <div className="h-14 shrink-0 bg-[#0d1117]/95 border-t border-[#21262d] px-4 flex items-center justify-between gap-4 z-20 font-mono text-xs">
            <div className="flex items-center gap-2">
              <button
                onClick={timeCtrl.toggle}
                className={`px-3 py-1 rounded font-semibold text-xs transition cursor-pointer ${
                  timeCtrl.playing ? 'bg-[#d29922] text-black' : 'bg-sky-500 text-black hover:bg-sky-400'
                }`}
              >
                {timeCtrl.playing ? '⏸ Pause' : '▶ Play'}
              </button>
              <button
                onClick={() => timeCtrl.setTRel(0)}
                className="px-2 py-1 rounded bg-[#21262d] hover:bg-[#30363d] text-slate-300 text-xs transition"
              >
                ↺ Day 0
              </button>
              <div className="hidden sm:flex items-center gap-1 bg-black rounded p-0.5 border border-[#21262d]">
                {SPEED_OPTIONS.map(spd => (
                  <button
                    key={spd}
                    onClick={() => timeCtrl.setSpeed(spd)}
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      timeCtrl.speed === spd ? 'bg-sky-500 text-black font-bold' : 'text-slate-400'
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
                className="w-full h-1.5 bg-[#21262d] rounded appearance-none cursor-pointer accent-sky-400"
              />
            </div>

            {/* Elapsed Telemetry */}
            <div className="text-right whitespace-nowrap text-[11px] text-slate-300">
              T+<strong className="text-sky-400">{currentHour}h</strong> ({currentDay}d)
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 6-TAB MISSION CONTROL PANEL */}
        <aside id="panel" className="h-full border-l border-[#21262d] bg-[#0d1117] flex flex-col overflow-hidden">
          {/* Sticky Panel Tabs */}
          <nav className="h-10 shrink-0 bg-[#0d1117] border-b border-[#21262d] grid grid-cols-6 gap-0 text-center font-mono text-[11px] z-10">
            {[
              { id: 'missions', label: 'Missions' },
              { id: 'route', label: 'Route' },
              { id: 'crew', label: 'Crew' },
              { id: 'sites', label: 'Sites' },
              { id: 'conditions', label: 'Conditions' },
              { id: 'science', label: 'Science' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center border-b-2 transition cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-sky-400 text-white font-bold'
                    : 'border-transparent text-[#8b949e] hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Panel Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === 'missions' && (
              <MissionsTab
                onSelectMission={(m) => {
                  setActiveTab('route');
                }}
              />
            )}

            {activeTab === 'route' && (
              <RoutePlannerTab
                selectedSite={site}
                verdict={verdict}
                stats={stats}
                liveAngles={live}
                onSeekTime={timeCtrl.setTRel}
                tRel={timeCtrl.tRel}
              />
            )}

            {activeTab === 'crew' && <CrewTab />}

            {activeTab === 'sites' && (
              <SitesTab
                sites={sites}
                selectedSite={site}
                onSelectSite={(newSite) => setSelectedSiteId(newSite.id)}
              />
            )}

            {activeTab === 'conditions' && (
              <ConditionsTab
                liveAngles={live}
                selectedSite={site}
                stats={stats}
              />
            )}

            {activeTab === 'science' && <ScienceTab />}
          </div>
        </aside>
      </main>

      {/* OVERLAY: CINEMATIC THREE.JS 3D INTRO */}
      {showIntro && (
        <LunarIntro onDone={() => setShowIntro(false)} />
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
