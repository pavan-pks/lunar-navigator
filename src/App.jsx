import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, BarChart2, FileText, RotateCcw } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController } from './lib/useTimeController.js';
import { getLunarTime } from './lib/lunarTime.js';
import { sampleSeries, valuesAt, hoursSince } from './lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate, timeToNext } from './lib/metrics.js';
import { playThrustRumble, playTelemetryPing, playTargetLock, isMuted, setMuted } from './lib/audio.js';

import { LunarUniverseR3F } from './components/scene/LunarUniverseR3F.jsx';
import { SurfaceViewSimulation } from './components/scene/SurfaceViewSimulation.jsx';
import { TargetingReticle } from './components/ui/TargetingReticle.jsx';
import { EdgeHudSidebars } from './components/ui/EdgeHudSidebars.jsx';
import { ComparePanel } from './components/ui/ComparePanel.jsx';
import { CsaArtemisPanel } from './components/ui/CsaArtemisPanel.jsx';
import { ReportModal } from './components/ui/ReportModal.jsx';
import { CustomCursor } from './components/ui/CustomCursor.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';

export const SIM_SPEED_OPTIONS = [
  { value: 1, label: '1x' },
  { value: 10, label: '10x' },
  { value: 24, label: '24x (1h/sec)' },
  { value: 60, label: '60x' },
  { value: 120, label: '120x' },
];

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Experience Scene State: 'macro' | 'transition' | 'orbit'
  const [sceneState, setSceneState] = useState(() =>
    window.location.hash.includes('nointro') ? 'orbit' : 'macro'
  );

  const universeRef = useRef(null);

  // Selected site & custom coordinates
  const [selectedSiteId, setSelectedSiteId] = useState('shackleton');
  const [customSite, setCustomSite] = useState(null);

  // Projected 2D screen coordinates of the active crater for subtle reticle marker
  const [craterScreenPos, setCraterScreenPos] = useState(null);

  // Descent & Landing States
  const [isDescending, setIsDescending] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const [showLandingOption, setShowLandingOption] = useState(false);
  const [isSidebarsCollapsed, setIsSidebarsCollapsed] = useState(false);

  // View modes: 'orbit' | 'surface' (EVA View)
  const [viewMode, setViewMode] = useState('orbit');

  // Compare split-screen mode: when true, standard HUD unmounts cleanly
  const [compareOpen, setCompareOpen] = useState(false);

  // Report modal
  const [showReport, setShowReport] = useState(false);

  // CSA Artemis modal
  const [showCsaPanel, setShowCsaPanel] = useState(false);

  // Flight dynamics & mission schedule
  const [launchDate, setLaunchDate] = useState('2027-03-08T00:00:00Z');
  const [transitDays, setTransitDays] = useState(4);
  const [slipDays, setSlipDays] = useState(0);
  const missionDays = 14;
  const maxHours = missionDays * 24;

  // Audio mute state
  const [audioMuted, setAudioMutedState] = useState(false);

  // Simulation time controller
  const timeCtrl = useTimeController({ maxHours, initialSpeed: 24 });

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

  const site = useMemo(() => {
    if (customSite) return customSite;
    if (!data?.sites) return { id: 'shackleton', name: 'Shackleton Crater Rim', lat: -89.9, lon: 129.8, terrainType: 'crater-rim' };
    return data.sites.find(s => s.id === selectedSiteId) || data.sites[0];
  }, [data, selectedSiteId, customSite]);

  const handleSelectSite = (newSite) => {
    playTargetLock();
    setHasLanded(false);
    setShowLandingOption(false);
    setViewMode('orbit');
    if (typeof newSite === 'object' && newSite !== null) {
      setCustomSite(newSite);
      setSelectedSiteId(newSite.id);
    } else {
      setCustomSite(null);
      setSelectedSiteId(newSite);
      if (universeRef.current?.focusSite) universeRef.current.focusSite(newSite);
    }
  };

  const landing = landingDate(launchDate, transitDays + slipDays);
  const startHours = useMemo(() => {
    if (!data?.ephem) return 0;
    return Math.max(0, hoursSince(data.ephem.startUTC, landing));
  }, [data, landing]);

  // Decoupled Static Series (only recalculates when site or launch date changes — NOT on every tick)
  const series = useMemo(() => {
    if (!data?.ephem) return { t: [], sunEl: [], sunAz: [], earthEl: [], earthAz: [] };
    return sampleSeries(site, startHours, maxHours, data.ephem, 1);
  }, [site, startHours, maxHours, data]);

  // Aggregate static metrics (calculated once per target/launch config — zero playback jitter)
  const stats = useMemo(() => computeWindowStats(series), [series]);
  const verdict = useMemo(() => getVerdict(stats), [stats]);

  // Live simulation variables (update as timeline scrubs)
  const live = useMemo(() => valuesAt(series, timeCtrl.tRel), [series, timeCtrl.tRel]);
  const timeToSunset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'sunset'), [series, timeCtrl.tRel]);
  const timeToEarthset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'earthset'), [series, timeCtrl.tRel]);

  const metDays = Math.floor(timeCtrl.tRel / 24);
  const metHours = Math.floor(timeCtrl.tRel % 24);
  const metMinutes = Math.floor((timeCtrl.tRel % 1) * 60);

  const handleStartMission = () => {
    playTelemetryPing(2524, 0.12);
    playThrustRumble(2.2);
    setSceneState('transition');
    if (universeRef.current?.startMissionTransition) universeRef.current.startMissionTransition();
  };

  const handleReachedOrbit = () => {
    playTelemetryPing(1800, 0.08);
    setSceneState('orbit');
  };

  const handleTriggerDescent = () => {
    if (isDescending) return;
    playTelemetryPing(2400, 0.15);
    setIsDescending(true);
    setIsSidebarsCollapsed(true);
    setShowLandingOption(false);

    if (universeRef.current?.triggerCinematicDescent) {
      universeRef.current.triggerCinematicDescent(() => {
        playTelemetryPing(2000, 0.12);
        setIsDescending(false);
        setHasLanded(true);
        setIsSidebarsCollapsed(false);
        setShowLandingOption(true);
      });
    } else {
      setTimeout(() => {
        setIsDescending(false);
        setHasLanded(true);
        setIsSidebarsCollapsed(false);
        setShowLandingOption(true);
      }, 3000);
    }
  };

  const handleReturnToOrbit = () => {
    playTelemetryPing(1600, 0.08);
    setViewMode('orbit');
    setHasLanded(false);
    setShowLandingOption(false);
    if (universeRef.current?.centerMoon) {
      universeRef.current.centerMoon();
    }
  };

  const handleResetToMacro = () => {
    playTelemetryPing(1200, 0.08);
    setSceneState('macro');
    setViewMode('orbit');
    setHasLanded(false);
    setShowLandingOption(false);
    setIsSidebarsCollapsed(false);
    setCompareOpen(false);
    if (universeRef.current?.resetToMacro) universeRef.current.resetToMacro();
  };

  const toggleAudio = () => {
    const next = !audioMuted;
    setAudioMutedState(next);
    setMuted(next);
    if (!next) playTelemetryPing(2100, 0.08);
  };

  const cycleSpeed = () => {
    const currentIndex = SIM_SPEED_OPTIONS.findIndex(s => s.value === timeCtrl.speed);
    const nextSpeed = SIM_SPEED_OPTIONS[(currentIndex + 1) % SIM_SPEED_OPTIONS.length];
    timeCtrl.setSpeed(nextSpeed.value);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#000000] text-[#f5f5f5] flex flex-col items-center justify-center p-8 space-y-4 font-sans select-none cursor-none">
        <CustomCursor />
        <div className="w-6 h-6 border border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-[10px] font-sans font-light tracking-[0.3em] text-[#a3a3a3] uppercase">
          Connecting to JPL Ephemeris…
        </p>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  const { sites, ephem } = data;

  return (
    <div className="h-screen w-screen bg-[#000000] text-[#f5f5f5] overflow-hidden font-sans select-none relative cursor-none">
      {/* ── Custom Crosshair Cursor ── */}
      <CustomCursor />

      {/* ── 1. UNIFIED R3F 3D VIEWPORT (SPACE, MOON & SPACECRAFT) ── */}
      <div className={`absolute inset-0 w-full h-full ${viewMode === 'surface' ? 'hidden' : 'block'}`}>
        <LunarUniverseR3F
          ref={universeRef}
          mode={sceneState}
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={handleSelectSite}
          onReachedOrbit={handleReachedOrbit}
          onLanderTouchdown={() => {
            setHasLanded(true);
            setShowLandingOption(true);
          }}
          onUpdateCraterScreenPos={setCraterScreenPos}
          sunEl={live.sunEl}
          sunAz={live.sunAz}
          earthEl={live.earthEl}
          earthAz={live.earthAz}
          customCoords={customSite}
          viewMode={viewMode === 'surface' ? 'orbit' : viewMode}
          isDescending={isDescending}
          hasLanded={hasLanded}
          isComparing={compareOpen}
          setIsDescending={setIsDescending}
          setHasLanded={setHasLanded}
          setViewMode={setViewMode}
        />
      </div>

      {/* ── 1B. PHOTOREALISTIC SURFACE VIEW & SIMULATION (PAVAN SANDBOX AESTHETIC) ── */}
      {viewMode === 'surface' && (
        <div className="absolute inset-0 w-full h-full z-10">
          <SurfaceViewSimulation
            site={site}
            sunEl={live.sunEl}
            sunAz={live.sunAz}
            earthEl={live.earthEl}
            earthAz={live.earthAz}
            onReturnToOrbit={handleReturnToOrbit}
          />
        </div>
      )}

      {/* ── 1C. TOUCHDOWN SURFACE VIEW OPTION PROMPT ── */}
      <AnimatePresence>
        {showLandingOption && viewMode === 'orbit' && hasLanded && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 bg-black/95 border border-white/20 p-5 rounded-xl shadow-2xl flex flex-col items-center gap-3 text-center pointer-events-auto max-w-md w-full mx-4">
            <div className="flex items-center gap-2 text-xs font-sans tracking-[0.2em] text-[#f5f5f5] uppercase font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Touchdown Confirmed · {site.name}
            </div>
            <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
              Lander securely grounded on landing pad. Open local surface simulation to inspect procedural regolith, grazing shadows, and astronaut EVA POV.
            </p>
            <div className="flex items-center gap-3 w-full mt-1">
              <button
                onClick={() => {
                  setShowLandingOption(false);
                  setViewMode('surface');
                }}
                className="flex-1 bg-white text-black hover:bg-neutral-200 py-2.5 px-4 rounded text-xs font-sans font-medium tracking-wider uppercase transition cursor-none"
              >
                Enter Surface Simulation ↘
              </button>
              <button
                onClick={() => setShowLandingOption(false)}
                className="text-xs text-[#a3a3a3] hover:text-white px-3 py-2 transition cursor-none"
              >
                Stay in Orbit
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* ── 2. CENTER RETICLE (Visible in orbit when not comparing) ── */}
      {sceneState === 'orbit' && viewMode === 'orbit' && !isDescending && !compareOpen && (
        <TargetingReticle
          targetName={site.name}
          targetCoords={{ lat: site.lat, lon: site.lon }}
          craterScreenPos={craterScreenPos}
          isLocked={true}
        />
      )}

      {/* ======================================================================= */}
      {/* SCENE 1: MACRO HERO MENU                                                 */}
      {/* ======================================================================= */}
      {sceneState === 'macro' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center p-8 sm:p-12 lg:p-16 pointer-events-none">
          <div className="max-w-xl w-full pointer-events-auto text-center space-y-6">
            <span className="text-[10px] font-sans font-light tracking-[0.3em] text-[#a3a3a3] uppercase block">
              NASA Artemis · Polar Flight Dynamics
            </span>

            <h1 className="text-4xl sm:text-6xl font-sans font-light text-[#f5f5f5] tracking-tight uppercase leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              Lunar Navigator
            </h1>

            <p className="text-xs sm:text-sm font-sans font-light text-[#a3a3a3] max-w-md mx-auto leading-relaxed">
              Evaluating polar solar illumination, grazing shadows, and direct-to-Earth
              communication windows at candidate lunar landing sites.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartMission}
                className="text-xs font-sans tracking-[0.2em] uppercase text-[#f5f5f5] border border-white/20 hover:border-white hover:bg-white hover:text-black px-8 py-3.5 transition duration-300 cursor-none"
              >
                Initialize Approach ↗
              </button>

              <button
                onClick={toggleAudio}
                className="text-xs font-sans tracking-widest text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none px-4 py-2"
              >
                {audioMuted ? 'Audio · Off' : 'Audio · On'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SCENE 2: TRANSITION                                                      */}
      {/* ======================================================================= */}
      {sceneState === 'transition' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <span className="text-[10px] font-sans font-light tracking-[0.3em] text-[#a3a3a3] uppercase animate-pulse">
            Trans-Lunar Approach
          </span>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SCENE 3 & SURFACE: ORBIT / SURFACE HUD                                  */}
      {/* ======================================================================= */}
      {(sceneState === 'orbit' || viewMode === 'surface') && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6 sm:p-10 lg:p-12">
          {/* ── TOP BAR HEADER ── */}
          <header className="flex items-center justify-between pointer-events-none bg-gradient-to-b from-black/80 via-black/40 to-transparent p-4 rounded-xl -mx-4 -mt-4">
            <div className="pointer-events-auto">
              <span className="text-[10px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block">
                {viewMode === 'surface' ? 'Astronaut EVA Surface Simulation' : 'Polar Orbit Survey'}
              </span>
              <div className="text-sm font-sans font-light text-[#f5f5f5] tracking-wide mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                {site.name} · <span className="font-mono text-xs text-[#a3a3a3]">{site.lat > 0 ? `+${site.lat.toFixed(1)}°` : `${site.lat.toFixed(1)}°`}</span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="flex items-center gap-6 text-xs font-sans tracking-wider pointer-events-auto">
              {viewMode === 'surface' ? (
                <button
                  onClick={handleReturnToOrbit}
                  className="text-[#f5f5f5] border-b border-white/30 hover:border-white transition cursor-none pb-0.5"
                >
                  Return to Orbital Survey ↖
                </button>
              ) : (
                <button
                  onClick={() => {
                    playTelemetryPing(2000, 0.08);
                    setCompareOpen(v => !v);
                  }}
                  className={`flex items-center gap-1.5 transition cursor-none ${
                    compareOpen ? 'text-[#f5f5f5]' : 'text-[#a3a3a3] hover:text-[#f5f5f5]'
                  }`}
                >
                  <BarChart2 size={12} />
                  <span>{compareOpen ? 'Exit Compare' : 'Compare'}</span>
                </button>
              )}

              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none"
              >
                <FileText size={12} />
                <span>Report</span>
              </button>

              <button
                onClick={() => setShowCsaPanel(true)}
                className="text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none"
              >
                CSA Alignment ↗
              </button>

              <button onClick={toggleAudio} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none">
                {audioMuted ? 'Audio · Off' : 'Audio · On'}
              </button>

              <button onClick={handleResetToMacro} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none">
                Overview ↗
              </button>
            </div>
          </header>

          {/* ── CONDITIONAL RENDERING: SINGLE-SITE HUD vs. COMPARISON HUD (Framer Motion) ── */}
          <AnimatePresence mode="wait">
            {compareOpen && sceneState === 'orbit' && viewMode === 'orbit' ? (
              <ComparePanel
                key="compare-panel"
                sites={sites}
                ephem={ephem}
                missionDays={missionDays}
                onClose={() => setCompareOpen(false)}
              />
            ) : !compareOpen ? (
              <EdgeHudSidebars
                key="single-hud"
                sites={sites}
                selectedSiteId={selectedSiteId}
                customSite={customSite}
                onSelectSite={handleSelectSite}
                live={live}
                stats={stats}
                verdict={verdict}
                timeToSunset={timeToSunset}
                timeToEarthset={timeToEarthset}
                isCollapsed={isSidebarsCollapsed}
                onEnterSurface={() => {
                  if (hasLanded && viewMode === 'orbit') {
                    setViewMode('surface');
                  } else {
                    handleTriggerDescent();
                  }
                }}
                showEnterSurface={sceneState === 'orbit'}
                isDescending={isDescending}
                hasLanded={hasLanded}
                viewMode={viewMode}
                onReturnToOrbit={handleReturnToOrbit}
              />
            ) : null}
          </AnimatePresence>

          {/* ── BOTTOM TIMELINE SCRUBBER & SPEED MULTIPLIER ── */}
          {!compareOpen && (
            <div className="pointer-events-auto space-y-3 z-20 max-w-4xl mx-auto w-full p-4 rounded-xl bg-black/80 border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between text-[11px] font-sans font-light text-[#a3a3a3]">
                {/* Play/Pause & Speed Multiplier */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => timeCtrl.toggle()}
                    className="text-[#f5f5f5] hover:opacity-70 transition cursor-none flex items-center"
                    aria-label={timeCtrl.playing ? 'Pause' : 'Play'}
                  >
                    {timeCtrl.playing ? <Pause size={13} /> : <Play size={13} />}
                  </button>

                  {/* Speed Multiplier Button (Cycles 1x, 10x, 24x, 60x, 120x) */}
                  <button
                    onClick={cycleSpeed}
                    className="text-[11px] font-mono tracking-wider text-[#f5f5f5] hover:text-white transition cursor-none border-b border-transparent hover:border-white/40 pb-0.5"
                    title="Cycle Simulation Speed"
                  >
                    {SIM_SPEED_OPTIONS.find(s => s.value === timeCtrl.speed)?.label || `${timeCtrl.speed}x`}
                  </button>
                </div>

                {/* Mission Elapsed Time */}
                <div className="font-mono text-xs text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  MET {metDays}d {metHours}h {metMinutes}m
                  {viewMode === 'surface' && <span className="text-[#a3a3a3] ml-2">· EVA Surface Simulation</span>}
                </div>

                {/* Launch & Transit Controls */}
                <div className="flex items-center gap-4 text-[#a3a3a3]">
                  <div className="flex items-center gap-1.5">
                    <span>Launch:</span>
                    <input
                      type="date"
                      value={launchDate.slice(0, 10)}
                      onChange={(e) => setLaunchDate(`${e.target.value}T00:00:00Z`)}
                      className="bg-transparent border-b border-white/10 pb-0.5 text-xs text-[#f5f5f5] focus:outline-none cursor-none"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>Transit:</span>
                    <span className="font-mono text-[#f5f5f5]">{transitDays}d</span>
                  </div>
                </div>
              </div>

              {/* Whisper-Thin Scrubber Line */}
              <div className="relative flex items-center">
                <input
                  type="range"
                  min={0}
                  max={maxHours}
                  step={0.1}
                  value={timeCtrl.tRel}
                  onChange={(e) => timeCtrl.seek(parseFloat(e.target.value))}
                  className="w-full h-[1px] bg-white/20 rounded appearance-none cursor-none accent-white"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* REPORT MODAL                                                             */}
      {/* ======================================================================= */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        site={site}
        stats={stats}
        live={live}
        verdict={verdict}
        launchDate={launchDate}
        transitDays={transitDays}
      />

      {/* ======================================================================= */}
      {/* CSA ARTEMIS MODAL                                                        */}
      {/* ======================================================================= */}
      <CsaArtemisPanel
        isOpen={showCsaPanel}
        onClose={() => setShowCsaPanel(false)}
      />
    </div>
  );
}

export default App;
