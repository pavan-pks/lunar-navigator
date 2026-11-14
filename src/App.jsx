import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Play, Pause, BarChart2, FileText } from 'lucide-react';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController, SPEED_OPTIONS } from './lib/useTimeController.js';
import { getLunarTime } from './lib/lunarTime.js';
import { sampleSeries, valuesAt, hoursSince } from './lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate, timeToNext } from './lib/metrics.js';
import { playThrustRumble, playTelemetryPing, playTargetLock, isMuted, setMuted } from './lib/audio.js';

import { LunarUniverseR3F } from './components/scene/LunarUniverseR3F.jsx';
import { TargetingReticle } from './components/ui/TargetingReticle.jsx';
import { EdgeHudSidebars } from './components/ui/EdgeHudSidebars.jsx';
import { ComparePanel } from './components/ui/ComparePanel.jsx';
import { CsaArtemisPanel } from './components/ui/CsaArtemisPanel.jsx';
import { ReportModal } from './components/ui/ReportModal.jsx';
import { CustomCursor } from './components/ui/CustomCursor.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';

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

  // Projected 2D screen coordinates of the active crater
  const [craterScreenPos, setCraterScreenPos] = useState(null);

  // Descent & Landing States
  const [isDescending, setIsDescending] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const [isSidebarsCollapsed, setIsSidebarsCollapsed] = useState(false);

  // View modes: 'orbit' | 'surface'
  const [viewMode, setViewMode] = useState('orbit');
  const [surfaceCamMode, setSurfaceCamMode] = useState('orbit');

  // Compare split-screen panel (overlaid over 3D moon)
  const [compareOpen, setCompareOpen] = useState(false);

  // Report modal
  const [showReport, setShowReport] = useState(false);

  // CSA Artemis modal
  const [showCsaPanel, setShowCsaPanel] = useState(false);

  // Flight dynamics
  const [launchDate, setLaunchDate] = useState('2027-03-08T00:00:00Z');
  const [transitDays, setTransitDays] = useState(4);
  const [slipDays, setSlipDays] = useState(0);
  const missionDays = 14;
  const maxHours = missionDays * 24;
  const objectHeightM = 3.0;

  // Audio mute state
  const [audioMuted, setAudioMutedState] = useState(false);

  // Time controller
  const timeCtrl = useTimeController({ maxHours, initialSpeed: 12 });

  // Scenario B for Compare
  const [scenarioB, setScenarioB] = useState({
    siteId: 'malapert',
    launchDate: '2027-03-08T00:00:00Z',
    transitDays: 4,
    customSite: null,
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

  useEffect(() => { fetchData(); }, []);

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

  const series = useMemo(() => {
    if (!data?.ephem) return { t: [], sunEl: [], sunAz: [], earthEl: [], earthAz: [] };
    return sampleSeries(site, startHours, maxHours, data.ephem, 1);
  }, [site, startHours, maxHours, data]);

  const live = useMemo(() => valuesAt(series, timeCtrl.tRel), [series, timeCtrl.tRel]);
  const stats = useMemo(() => computeWindowStats(series), [series]);
  const verdict = useMemo(() => getVerdict(stats), [stats]);

  const timeToSunset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'sunset'), [series, timeCtrl.tRel]);
  const timeToEarthset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'earthset'), [series, timeCtrl.tRel]);

  const powerEfficiencyPct = useMemo(() => {
    if (!live || live.sunEl <= 0) return 0;
    return Math.min(100, Math.max(0, Math.sin((live.sunEl * Math.PI) / 180) * 100 * 2.5)).toFixed(0);
  }, [live]);

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

    if (universeRef.current?.triggerCinematicDescent) {
      universeRef.current.triggerCinematicDescent(() => {
        playTelemetryPing(2000, 0.12);
        setIsDescending(false);
        setHasLanded(true);
        setViewMode('surface');
        setIsSidebarsCollapsed(false);
      });
    } else {
      setTimeout(() => {
        setIsDescending(false);
        setHasLanded(true);
        setViewMode('surface');
        setIsSidebarsCollapsed(false);
      }, 3000);
    }
  };

  const handleResetToMacro = () => {
    playTelemetryPing(1200, 0.08);
    setSceneState('macro');
    setViewMode('orbit');
    setHasLanded(false);
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

  const showEnterSurface = sceneState === 'orbit';

  return (
    <div className="h-screen w-screen bg-[#000000] text-[#f5f5f5] overflow-hidden font-sans select-none relative cursor-none">
      {/* ── Custom crosshair cursor ── */}
      <CustomCursor />

      {/* ── 1. UNIFIED R3F 3D VIEWPORT (SPACE, MOON & SPACECRAFT) ── */}
      <LunarUniverseR3F
        ref={universeRef}
        mode={sceneState}
        sites={sites}
        selectedSiteId={selectedSiteId}
        onSelectSite={handleSelectSite}
        onReachedOrbit={handleReachedOrbit}
        onLanderTouchdown={() => {
          setHasLanded(true);
          setViewMode('surface');
        }}
        onUpdateCraterScreenPos={setCraterScreenPos}
        sunEl={live.sunEl}
        sunAz={live.sunAz}
        earthEl={live.earthEl}
        earthAz={live.earthAz}
        customCoords={customSite}
        viewMode={viewMode}
        isDescending={isDescending}
        hasLanded={hasLanded}
        setIsDescending={setIsDescending}
        setHasLanded={setHasLanded}
        setViewMode={setViewMode}
      />

      {/* ── 2. CENTER RETICLE ── */}
      {sceneState === 'orbit' && viewMode === 'orbit' && !isDescending && (
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

            <h1 className="text-4xl sm:text-6xl font-sans font-light text-[#f5f5f5] tracking-tight uppercase leading-none">
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
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-8 sm:p-12 lg:p-14">
          {/* ── TOP BAR ── */}
          <header className="flex items-center justify-between pointer-events-auto">
            <div>
              <span className="text-[10px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block">
                {viewMode === 'surface' ? 'Surface Station EVA' : 'Polar Orbit Survey'}
              </span>
              <div className="text-sm font-sans font-light text-[#f5f5f5] tracking-wide mt-0.5">
                {site.name} · <span className="font-mono text-xs text-[#a3a3a3]">{site.lat > 0 ? `+${site.lat.toFixed(1)}°` : `${site.lat.toFixed(1)}°`}</span>
              </div>
            </div>

            {/* Nav actions */}
            <div className="flex items-center gap-6 text-xs font-sans tracking-wider">
              {viewMode === 'surface' ? (
                <>
                  <button
                    onClick={() => setViewMode('orbit')}
                    className="text-[#f5f5f5] border-b border-white/20 hover:border-white transition cursor-none pb-0.5"
                  >
                    Return to Orbit ↖
                  </button>
                  <button
                    onClick={() => setSurfaceCamMode(prev => prev === 'orbit' ? 'astronaut' : 'orbit')}
                    className="text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none"
                  >
                    {surfaceCamMode === 'orbit' ? 'Perspective: Mast' : 'Perspective: 1.7m EVA'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { playTelemetryPing(2000, 0.08); setCompareOpen(v => !v); }}
                  className={`flex items-center gap-1.5 transition cursor-none ${compareOpen ? 'text-[#f5f5f5]' : 'text-[#a3a3a3] hover:text-[#f5f5f5]'}`}
                >
                  <BarChart2 size={12} />
                  Compare
                </button>
              )}

              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none"
              >
                <FileText size={12} />
                Report
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

          {/* ── FLOATING TELEMETRY SIDEBARS ── */}
          <EdgeHudSidebars
            sites={sites}
            selectedSiteId={selectedSiteId}
            customSite={customSite}
            onSelectSite={handleSelectSite}
            live={live}
            stats={stats}
            verdict={verdict}
            powerEfficiencyPct={powerEfficiencyPct}
            timeToSunset={timeToSunset}
            timeToEarthset={timeToEarthset}
            isCollapsed={isSidebarsCollapsed}
            onEnterSurface={handleTriggerDescent}
            showEnterSurface={showEnterSurface}
            isDescending={isDescending}
            hasLanded={hasLanded}
            viewMode={viewMode}
            onReturnToOrbit={() => setViewMode('orbit')}
          />

          {/* ── BOTTOM SCRUBBER ── */}
          <div className="pointer-events-auto space-y-3 z-20 max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between text-[11px] font-sans font-light text-[#a3a3a3]">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => timeCtrl.toggle()}
                  className="text-[#f5f5f5] hover:opacity-70 transition cursor-none flex items-center"
                  aria-label={timeCtrl.playing ? 'Pause' : 'Play'}
                >
                  {timeCtrl.playing ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <div className="flex items-center gap-2 text-[#a3a3a3]">
                  {SPEED_OPTIONS.map(spd => (
                    <button
                      key={spd.value}
                      onClick={() => timeCtrl.setSpeed(spd.value)}
                      className={`transition cursor-none ${
                        timeCtrl.speed === spd.value ? 'text-[#f5f5f5] font-normal' : 'hover:text-[#f5f5f5]'
                      }`}
                    >
                      {spd.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="font-mono text-xs text-[#f5f5f5]">
                MET {metDays}d {metHours}h {metMinutes}m
              </div>

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

            {/* Whisper-thin scrubber line */}
            <div className="relative flex items-center">
              <input
                type="range"
                min={0}
                max={maxHours}
                step={0.1}
                value={timeCtrl.tRel}
                onChange={(e) => timeCtrl.seek(parseFloat(e.target.value))}
                className="w-full h-[1px] bg-white/15 rounded appearance-none cursor-none accent-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* COMPARE SPLIT-SCREEN OVERLAY (floats OVER 3D moon)                      */}
      {/* ======================================================================= */}
      {compareOpen && sceneState === 'orbit' && viewMode === 'orbit' && (
        <ComparePanel
          sites={sites}
          ephem={ephem}
          missionDays={missionDays}
          onClose={() => setCompareOpen(false)}
        />
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
