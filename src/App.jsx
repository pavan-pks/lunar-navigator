import React, { useState, useEffect, useMemo, useRef } from 'react';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController, SPEED_OPTIONS } from './lib/useTimeController.js';
import { getLunarTime } from './lib/lunarTime.js';
import { sampleSeries, valuesAt, hoursSince } from './lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate, timeToNext, shadowLength } from './lib/metrics.js';
import { playThrustRumble, playTelemetryPing, playTargetLock, isMuted, setMuted } from './lib/audio.js';

import { CinematicSpaceUniverse } from './components/scene/CinematicSpaceUniverse.jsx';
import { TradeStudyHolodeck } from './components/ui/TradeStudyHolodeck.jsx';
import { ResultCardsGrid } from './components/ui/ResultCardsGrid.jsx';
import { CsaArtemisPanel } from './components/ui/CsaArtemisPanel.jsx';
import { ScenePanel } from './components/ui/ScenePanel.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Cinematic Experience Scene State:
  // 'macro' (Scene 1) | 'transition' (Scene 2) | 'orbit' (Scene 3) | 'compare' (Scene 4)
  const [sceneState, setSceneState] = useState(() => {
    return window.location.hash.includes('nointro') ? 'orbit' : 'macro';
  });

  const universeRef = useRef(null);

  // Selected site & custom coordinates
  const [selectedSiteId, setSelectedSiteId] = useState('shackleton');
  const [customSite, setCustomSite] = useState(null);

  // Landing sequence state
  const [hasLanded, setHasLanded] = useState(false);

  // View modes: 'orbit' (3D celestial space) | 'surface' (local high-res LOLA terrain with lander)
  const [viewMode, setViewMode] = useState('orbit');
  const [surfaceCamMode, setSurfaceCamMode] = useState('orbit'); // 'orbit' or 'astronaut'

  // Educational CSA Artemis Portal Modal
  const [showCsaPanel, setShowCsaPanel] = useState(false);

  // Flight dynamics & date flexibility
  const [launchDate, setLaunchDate] = useState('2027-03-08T00:00:00Z');
  const [transitDays, setTransitDays] = useState(4);
  const [slipDays, setSlipDays] = useState(0);
  const missionDays = 14;
  const maxHours = missionDays * 24;
  const objectHeightM = 3.0;

  // Audio mute state
  const [audioMuted, setAudioMutedState] = useState(false);

  // Time controller for 14-day mission scrub
  const timeCtrl = useTimeController({ maxHours, initialSpeed: 12 });

  // Scenario B for Trade Study Holodeck (Scene 4)
  const [scenarioB, setScenarioB] = useState({
    siteId: 'malapert',
    launchDate: '2027-03-08T00:00:00Z',
    transitDays: 4,
    customSite: null
  });

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
    playTargetLock();
    setHasLanded(false);
    if (typeof newSite === 'object' && newSite !== null) {
      setCustomSite(newSite);
      setSelectedSiteId(newSite.id);
      if (universeRef.current?.triggerLanding) {
        universeRef.current.triggerLanding();
      }
    } else {
      setCustomSite(null);
      setSelectedSiteId(newSite);
      if (universeRef.current?.focusSite) {
        universeRef.current.focusSite(newSite);
      }
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

  // Trigger Scene 2: Transition from Macro to Lunar Orbit
  const handleStartMission = () => {
    playTelemetryPing(2524, 0.15);
    playThrustRumble(2.6);
    setSceneState('transition');
    if (universeRef.current?.startMissionTransition) {
      universeRef.current.startMissionTransition();
    }
  };

  // Reached Orbit callback from universe
  const handleReachedOrbit = () => {
    playTelemetryPing(1800, 0.1);
    setSceneState('orbit');
  };

  // Satellite touchdown callback
  const handleLanderTouchdown = () => {
    playTelemetryPing(2200, 0.12);
    setHasLanded(true);
  };

  // Reset to Macro View
  const handleResetToMacro = () => {
    playTelemetryPing(1200, 0.1);
    setSceneState('macro');
    setViewMode('orbit');
    setHasLanded(false);
    if (universeRef.current?.resetToMacro) {
      universeRef.current.resetToMacro();
    }
  };

  const toggleAudio = () => {
    const next = !audioMuted;
    setAudioMutedState(next);
    setMuted(next);
    if (!next) playTelemetryPing(2100, 0.08);
  };

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
      {/* 1. 3D VIEWPORT: ORBITAL UNIVERSE OR AUTHENTIC PHOTOREALISTIC SURFACE */}
      {viewMode === 'surface' ? (
        <div className="absolute inset-0 w-full h-full z-0 animate-in fade-in duration-500">
          <ScenePanel
            siteId={site.id}
            terrainType={site.terrainType}
            sunEl={live.sunEl}
            sunAz={live.sunAz}
            earthEl={live.earthEl}
            earthAz={live.earthAz}
            viewMode={surfaceCamMode}
            quality="high"
            label={site.name}
            landerHeight={objectHeightM}
          />
        </div>
      ) : (
        <CinematicSpaceUniverse
          ref={universeRef}
          mode={sceneState}
          sites={sites}
          selectedSiteId={selectedSiteId}
          onSelectSite={handleSelectSite}
          onReachedOrbit={handleReachedOrbit}
          onLanderTouchdown={handleLanderTouchdown}
          sunEl={live.sunEl}
          sunAz={live.sunAz}
          earthEl={live.earthEl}
          earthAz={live.earthAz}
          customCoords={customSite}
          onPointCustomCoords={(coords) => {
            const latStr = `${Math.abs(coords.lat).toFixed(1)}°${coords.lat < 0 ? 'S' : 'N'}`;
            const lonStr = `${Math.abs(coords.lon).toFixed(1)}°${coords.lon >= 0 ? 'E' : 'W'}`;
            handleSelectSite({
              id: `custom-${coords.lat.toFixed(1)}-${coords.lon.toFixed(1)}`,
              name: `Designated Site (${latStr}, ${lonStr})`,
              lat: coords.lat,
              lon: coords.lon,
              terrainType: coords.lat < -80 ? 'crater-rim' : 'plain'
            });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* SCENE 1: THE SOLAR SYSTEM MACRO VIEW (MAIN MENU)                          */}
      {/* ========================================================================= */}
      {sceneState === 'macro' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center p-6 bg-radial from-transparent via-black/25 to-[#050814]/85 pointer-events-none transition-opacity duration-500">
          <div className="max-w-xl w-full bg-[#070e1c]/80 backdrop-blur-3xl border border-slate-800/80 rounded-3xl p-8 sm:p-10 space-y-6 shadow-[0_20px_80px_rgba(0,0,0,0.9)] pointer-events-auto text-center animate-in fade-in zoom-in-95 duration-500">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0B3D91]/30 border border-cyan-400/40 text-[10px] font-mono tracking-widest text-cyan-300 uppercase font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
              NASA ARTEMIS // POLAR FLIGHT DYNAMICS
            </div>

            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight uppercase leading-none">
              LUNAR NAVIGATOR: <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 drop-shadow-[0_0_30px_rgba(56,189,248,0.5)]">
                ARTEMIS POLAR OPS
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed max-w-md mx-auto">
              Simulate solar illumination, grazing crater shadows, and direct-to-Earth Deep Space Network communication corridors at candidate lunar landing sites.
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartMission}
                className="w-full sm:flex-1 py-4 px-8 rounded-2xl bg-gradient-to-r from-[#0B3D91] to-cyan-500 hover:from-blue-700 hover:to-cyan-400 text-white font-bold text-xs tracking-widest uppercase font-mono transition-all transform hover:scale-[1.03] shadow-[0_0_35px_rgba(0,240,255,0.45)] cursor-pointer flex items-center justify-center gap-3 border border-cyan-300/40"
              >
                <span>INITIALIZE APPROACH</span>
                <span className="text-sm">&rarr;</span>
              </button>

              <button
                onClick={toggleAudio}
                className="px-4 py-4 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-mono transition cursor-pointer border border-slate-800 flex items-center gap-2"
                title={audioMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                <span>{audioMuted ? 'Audio: OFF' : 'Audio: ON'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENE 2: THE TRANSITION (CAMERA LERPS RAPIDLY PAST EARTH INTO MOON ORBIT) */}
      {/* ========================================================================= */}
      {sceneState === 'transition' && (
        <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
          <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-cyan-400/20 text-xs font-mono text-cyan-300 tracking-widest uppercase flex items-center gap-3 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            TRANS-LUNAR INJECTION // APPROACH VECTOR LOCKED
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENE 3: LUNAR ORBIT & MISSION CONTROL HUD (THE CORE LOOP)                */}
      {/* ========================================================================= */}
      {(sceneState === 'orbit' || sceneState === 'compare') && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-5">
          {/* 3.1 TOP BAR: NASA ARTEMIS POLAR OPS & MODE SWITCHERS */}
          <header className="flex items-center justify-between pointer-events-auto bg-[#070e1c]/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl px-4 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,0.8)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#0B3D91] flex items-center justify-center text-white font-mono font-bold text-xs shadow-md border border-cyan-400/30">
                NASA
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-display font-bold text-white tracking-wider">
                    {viewMode === 'surface' ? 'SURFACE EVA MAST // ARTEMIS BASE' : 'ARTEMIS POLAR OPS // ORBITAL HUD'}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    JPL HORIZONS
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Target: <strong className="text-cyan-300">{site.name}</strong> ({site.lat > 0 ? `+${site.lat.toFixed(1)}°` : `${site.lat.toFixed(1)}°`} S)
                </div>
              </div>
            </div>

            {/* Quick Actions & Scene Toggles */}
            <div className="flex items-center gap-2.5">
              {/* If in Surface View: Provide Return to Orbit Button */}
              {viewMode === 'surface' ? (
                <button
                  onClick={() => {
                    playTelemetryPing(1400, 0.08);
                    setViewMode('orbit');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-600 hover:from-cyan-400 hover:to-sky-500 text-black font-bold text-xs font-mono transition cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.5)] flex items-center gap-1.5"
                >
                  <span>&uarr; RETURN TO ORBIT</span>
                </button>
              ) : (
                /* Compare Alternate Scenarios (Scene 4) */
                <button
                  onClick={() => {
                    playTelemetryPing(1900, 0.08);
                    setSceneState('compare');
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0B3D91] hover:bg-blue-700 text-white text-xs font-mono transition cursor-pointer border border-cyan-400/40 shadow-[0_0_15px_rgba(11,61,145,0.5)] flex items-center gap-1.5"
                >
                  <span>COMPARE SCENARIOS</span>
                </button>
              )}

              {/* Surface View Camera Mode: Astronaut vs Mast */}
              {viewMode === 'surface' && (
                <div className="hidden sm:flex items-center bg-black/40 p-1 rounded-xl border border-slate-800 text-xs font-mono">
                  <button
                    onClick={() => {
                      playTelemetryPing(1400, 0.06);
                      setSurfaceCamMode('orbit');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      surfaceCamMode === 'orbit' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Lander Mast
                  </button>
                  <button
                    onClick={() => {
                      playTelemetryPing(1400, 0.06);
                      setSurfaceCamMode('astronaut');
                    }}
                    className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                      surfaceCamMode === 'astronaut' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Astronaut (1.7m)
                  </button>
                </div>
              )}

              {/* CSA / Artemis Partner Alignment Educational Panel */}
              <button
                onClick={() => {
                  playTelemetryPing(1600, 0.06);
                  setShowCsaPanel(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-300 text-xs font-mono transition cursor-pointer border border-red-500/30 flex items-center gap-1.5"
                title="View Canadian Space Agency & Artemis Partner Alignments"
              >
                <span>CSA / Partner Info</span>
              </button>

              {/* Audio Toggle */}
              <button
                onClick={toggleAudio}
                className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 flex items-center justify-center text-xs font-mono transition cursor-pointer"
                title={audioMuted ? 'Unmute' : 'Mute'}
              >
                {audioMuted ? '🔇' : '🔊'}
              </button>

              {/* Reset to Macro View */}
              <button
                onClick={handleResetToMacro}
                className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer border border-slate-800"
                title="Return to Solar System Macro View"
              >
                Macro View
              </button>
            </div>
          </header>

          {/* 3.2 DATA-DRIVEN UI: SINGLE-VALUE RESULT CARDS GRID */}
          <div className="pt-3 pointer-events-auto max-w-7xl mx-auto w-full">
            <ResultCardsGrid
              live={live}
              stats={stats}
              verdict={verdict}
              powerEfficiencyPct={powerEfficiencyPct}
              timeToSunset={timeToSunset}
              timeToEarthset={timeToEarthset}
            />
          </div>

          {/* 3.3 TARGETING RETICLE & INTERACTIVE SITE SELECTOR STRIP */}
          {viewMode === 'orbit' && (
            <div className="flex justify-center pointer-events-none py-2">
              <div className="pointer-events-auto bg-[#070e1c]/85 border border-slate-800/80 backdrop-blur-xl rounded-2xl px-4 py-2 shadow-xl flex items-center gap-2 text-xs font-mono">
                <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                  Target Polar Landing Site:
                </span>
                <div className="flex gap-1.5 overflow-x-auto">
                  {sites.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSite(s.id)}
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-mono transition cursor-pointer border ${
                        selectedSiteId === s.id && !customSite
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {s.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3.4 PROMINENT CTA: "ENTER SURFACE VIEW" BUTTON (Fades in once landing sequence completes) */}
          {hasLanded && viewMode === 'orbit' && (
            <div className="flex justify-center pointer-events-none pb-2 animate-in fade-in zoom-in-95 duration-400">
              <button
                onClick={() => {
                  playTelemetryPing(2500, 0.15);
                  setViewMode('surface');
                }}
                className="pointer-events-auto py-4 px-10 rounded-2xl bg-gradient-to-r from-[#0B3D91] via-cyan-500 to-sky-400 hover:from-blue-700 hover:to-cyan-300 text-black font-extrabold text-sm tracking-widest uppercase font-mono transition-all transform hover:scale-[1.04] shadow-[0_0_40px_rgba(0,240,255,0.6)] cursor-pointer flex items-center gap-3 border border-white/40 animate-pulse"
              >
                <span>ENTER SURFACE VIEW</span>
                <span className="text-lg">&darr;</span>
              </button>
            </div>
          )}

          {/* 3.5 BOTTOM VIDEO-STYLE TEMPORAL SCRUBBER */}
          <div className="pointer-events-auto bg-[#070e1c]/90 border border-slate-800/80 backdrop-blur-xl rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.85)] space-y-3 animate-in slide-in-from-bottom duration-400">
            {/* Scrubber Header: Transport controls, MET time & Date Sliders */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-3">
                {/* Play / Pause button */}
                <button
                  onClick={() => {
                    playTelemetryPing(1400, 0.06);
                    timeCtrl.toggle();
                  }}
                  className="w-8 h-8 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center justify-center transition cursor-pointer shadow-[0_0_12px_rgba(56,189,248,0.5)]"
                >
                  {timeCtrl.playing ? '⏸' : '▶'}
                </button>

                {/* Speed buttons */}
                <div className="flex items-center bg-black/40 rounded-xl p-0.5 border border-slate-800">
                  {SPEED_OPTIONS.map(spd => (
                    <button
                      key={spd.value}
                      onClick={() => timeCtrl.setSpeed(spd.value)}
                      className={`px-2 py-1 rounded-lg text-[10px] transition cursor-pointer ${
                        timeCtrl.speed === spd.value ? 'bg-[#0B3D91] text-white font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd.label}
                    </button>
                  ))}
                </div>

                {/* Mission Elapsed Time */}
                <div className="text-slate-300 text-xs">
                  MET: <strong className="text-cyan-300 font-bold">D+{metDays} {metHours}h {metMinutes}m</strong>
                </div>
              </div>

              {/* Earth Launch Date & Transit Controls */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase">Earth Launch:</span>
                  <input
                    type="date"
                    value={launchDate.slice(0, 10)}
                    onChange={(e) => setLaunchDate(`${e.target.value}T00:00:00Z`)}
                    className="bg-black/60 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 uppercase">Transit:</span>
                  <span className="text-xs text-cyan-300 font-bold">{transitDays}d</span>
                  <input
                    type="range"
                    min={2}
                    max={8}
                    step={1}
                    value={transitDays}
                    onChange={(e) => setTransitDays(parseInt(e.target.value, 10))}
                    className="w-16 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>
              </div>
            </div>

            {/* Scrubber Timeline Slider & Day Ticks */}
            <div className="relative pt-2">
              <input
                type="range"
                min={0}
                max={maxHours}
                step={0.1}
                value={timeCtrl.tRel}
                onChange={(e) => timeCtrl.seek(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400 relative z-10"
              />

              {/* Day Tick Marks (Day 0 to Day 14) */}
              <div className="flex justify-between text-[9px] font-mono text-slate-500 pt-1.5 px-1 select-none">
                {Array.from({ length: 15 }, (_, i) => (
                  <span key={i} className={i === metDays ? 'text-cyan-300 font-bold' : ''}>
                    D{i}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCENE 4: THE TRADE STUDY HOLODECK (COMPARISON MODE)                       */}
      {/* ========================================================================= */}
      {sceneState === 'compare' && (
        <TradeStudyHolodeck
          sites={sites}
          ephem={ephem}
          scenarioA={scenarioA}
          setScenarioA={(newA) => {
            if (typeof newA === 'function') {
              // Not supported
            } else {
              if (newA.siteId) setSelectedSiteId(newA.siteId);
              if (newA.launchDate) setLaunchDate(newA.launchDate);
              if (newA.transitDays) setTransitDays(newA.transitDays);
            }
          }}
          scenarioB={scenarioB}
          setScenarioB={setScenarioB}
          missionDays={missionDays}
          onClose={() => setSceneState('orbit')}
          onSelectSiteInUniverse={handleSelectSite}
        />
      )}

      {/* ========================================================================= */}
      {/* EDUCATIONAL / MISSION-CONTEXT: CSA MOON EXPLORATION PORTAL MODAL          */}
      {/* ========================================================================= */}
      <CsaArtemisPanel
        isOpen={showCsaPanel}
        onClose={() => setShowCsaPanel(false)}
      />
    </div>
  );
}

export default App;
