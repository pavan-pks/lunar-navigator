import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController } from './lib/useTimeController.js';
import { getLunarTime } from './lib/lunarTime.js';
import { sampleSeries, valuesAt, hoursSince } from './lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate, timeToNext } from './lib/metrics.js';
import { validateMissionInputs } from './lib/validation.js';
import { parseUrlState, buildUrlState } from './lib/urlState.js';
import { isPrefersReducedMotion } from './lib/animation.js';
import { playThrustRumble, playTelemetryPing, playTargetLock, isMuted, setMuted, startSpaceAmbientMusic, toggleSpaceAmbientMusic } from './lib/audio.js';

import { LunarUniverseR3F } from './components/scene/LunarUniverseR3F.jsx';
import { SurfaceViewSimulation } from './components/scene/SurfaceViewSimulation.jsx';
import { TargetingReticle } from './components/ui/TargetingReticle.jsx';
import { TopBar } from './components/ui/TopBar.jsx';
import { VerdictStrip } from './components/ui/VerdictStrip.jsx';
import { Inspector } from './components/ui/Inspector.jsx';
import { BottomTimeScrubber } from './components/ui/BottomTimeScrubber.jsx';
import { CustomCoordsModal } from './components/ui/CustomCoordsModal.jsx';
import { ReportModal } from './components/ui/ReportModal.jsx';
import { CsaArtemisPanel } from './components/ui/CsaArtemisPanel.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';
import { LUNAR_LANDMARKS } from './lib/lunarLandmarks.js';

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize state from URL params
  const initialUrlState = useMemo(() => parseUrlState(), []);

  const hasVisited = useMemo(() => {
    try {
      return localStorage.getItem('lunar_visited') === 'true';
    } catch {
      return false;
    }
  }, []);

  // Experience Scene State: 'macro' | 'transition' | 'orbit'
  // Auto-skip intro if visited before, if prefers-reduced-motion, or if #nointro
  const [sceneState, setSceneState] = useState(() =>
    initialUrlState.noIntro || hasVisited || isPrefersReducedMotion() ? 'orbit' : 'macro'
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && sceneState === 'macro') {
        setSceneState('orbit');
        try {
          localStorage.setItem('lunar_visited', 'true');
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sceneState]);

  const universeRef = useRef(null);

  // Target site selection & custom coordinates
  const [selectedSiteId, setSelectedSiteId] = useState(initialUrlState.siteId || 'shackleton');
  const [customSite, setCustomSite] = useState(null);
  const [showCustomCoordsModal, setShowCustomCoordsModal] = useState(false);

  // 2D screen projection of target for reticle
  const [craterScreenPos, setCraterScreenPos] = useState(null);

  // Descent & Landing States
  const [isDescending, setIsDescending] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);
  const [viewMode, setViewMode] = useState('orbit'); // 'orbit' | 'surface'

  // Flight schedule & slip parameters
  const [launchDate, setLaunchDate] = useState(
    initialUrlState.launch ? `${initialUrlState.launch}T00:00:00Z` : '2027-03-08T00:00:00Z'
  );
  const [transitDays, setTransitDays] = useState(initialUrlState.transit ?? 4);
  const [slipDays, setSlipDays] = useState(initialUrlState.slip ?? 0);
  const [missionDays, setMissionDays] = useState(14);
  const maxHours = missionDays * 24;

  // Planner / Explorer mode
  const [plannerMode, setPlannerMode] = useState(initialUrlState.mode || 'planner');

  // Inspector state
  const [inspectorTab, setInspectorTab] = useState(initialUrlState.tab || 'metrics');
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  // Compare scenarios state
  const [compareMode, setCompareMode] = useState(initialUrlState.cmpMode || 'sites'); // 'sites' | 'dates'
  const [scenarioA, setScenarioA] = useState({
    siteId: initialUrlState.siteId || 'shackleton',
    launchDate: initialUrlState.launch ? `${initialUrlState.launch}T00:00:00Z` : '2027-03-08T00:00:00Z',
    transitDays: initialUrlState.transit ?? 4,
    customSite: null
  });
  const [scenarioB, setScenarioB] = useState({
    siteId: initialUrlState.siteB || 'malapert',
    launchDate: initialUrlState.launchB ? `${initialUrlState.launchB}T00:00:00Z` : '2027-03-12T00:00:00Z',
    transitDays: 4,
    customSite: null
  });

  // Display Layers
  const [showLabels, setShowLabels] = useState(true);
  const [showGraticule, setShowGraticule] = useState(false);
  const [showDsnBeam, setShowDsnBeam] = useState(false);
  const [showSlopeHeatmap, setShowSlopeHeatmap] = useState(false);

  // Modals & Panels
  const [showReport, setShowReport] = useState(false);
  const [showCsaPanel, setShowCsaPanel] = useState(false);
  const [audioMuted, setAudioMutedState] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Simulation time controller
  const timeCtrl = useTimeController({ maxHours, initialSpeed: 24 });

  // Initial seek if specified in URL
  const initializedTimeRef = useRef(false);
  useEffect(() => {
    if (!initializedTimeRef.current && initialUrlState.t !== null && initialUrlState.t !== undefined) {
      timeCtrl.seek(initialUrlState.t);
      initializedTimeRef.current = true;
    }
  }, [initialUrlState.t, timeCtrl]);

  // Real-time lunar clock
  const [lunarClock, setLunarClock] = useState(() => getLunarTime());
  useEffect(() => {
    const timer = setInterval(() => setLunarClock(getLunarTime()), 2000);
    return () => clearInterval(timer);
  }, []);

  // Synchronize URL query params seamlessly
  useEffect(() => {
    const newUrl = buildUrlState({
      siteId: selectedSiteId,
      launchDate,
      transitDays,
      slipDays,
      mode: plannerMode,
      tab: inspectorTab,
      t: timeCtrl.tRel,
      compareMode,
      scenarioB,
      noIntro: sceneState === 'orbit'
    });
    window.history.replaceState(null, '', newUrl);
  }, [selectedSiteId, launchDate, transitDays, slipDays, plannerMode, inspectorTab, timeCtrl.tRel, compareMode, scenarioB, sceneState]);

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
    if (!data?.sites) return LUNAR_LANDMARKS[0] || { id: 'shackleton', name: 'Shackleton Crater Rim', lat: -89.9, lon: 129.8, terrainType: 'crater-rim' };
    return data.sites.find(s => s.id === selectedSiteId) || LUNAR_LANDMARKS.find(lm => lm.id === selectedSiteId) || data.sites[0];
  }, [data, selectedSiteId, customSite]);

  const handleSelectSite = (newSite) => {
    playTargetLock();
    setHasLanded(false);
    setViewMode('orbit');
    if (typeof newSite === 'object' && newSite !== null) {
      setCustomSite(newSite);
      setSelectedSiteId(newSite.id);
      if (universeRef.current?.focusSite) universeRef.current.focusSite(newSite);
    } else {
      setCustomSite(null);
      setSelectedSiteId(newSite);
      const siteObj = (data?.sites || []).find(s => s.id === newSite) || LUNAR_LANDMARKS.find(lm => lm.id === newSite);
      if (universeRef.current?.focusSite) universeRef.current.focusSite(siteObj || newSite);
    }
  };

  const handleSelectCustomCoord = ({ lat, lon }) => {
    playTargetLock();
    const custom = {
      id: 'custom',
      name: `Custom (${lat >= 0 ? '+' : ''}${lat.toFixed(1)}°, ${lon >= 0 ? '+' : ''}${lon.toFixed(1)}°)`,
      lat: parseFloat(lat.toFixed(3)),
      lon: parseFloat(lon.toFixed(3)),
      terrainType: Math.abs(lat) > 75 ? 'crater-rim' : 'plain',
      mission: 'Custom Target',
      notes: `Target locked at ${lat.toFixed(2)}° latitude, ${lon.toFixed(2)}° longitude.`,
      verified: true,
    };
    handleSelectSite(custom);
  };

  // Input validation and clamping
  const missionValidation = useMemo(() => {
    return validateMissionInputs({
      launchDate,
      transitDays,
      slipDays,
      missionDays,
      ephem: data?.ephem
    });
  }, [launchDate, transitDays, slipDays, missionDays, data?.ephem]);

  const landing = missionValidation.landingDate;
  const startHours = missionValidation.clampedStartHours;
  const landingDateStr = landing ? landing.slice(0, 10) : '2027-03-12';

  // Decoupled static series calculation
  const series = useMemo(() => {
    if (!data?.ephem) return { t: [], sunEl: [], sunAz: [], earthEl: [], earthAz: [] };
    return sampleSeries(site, startHours, maxHours, data.ephem, 1);
  }, [site, startHours, maxHours, data]);

  // Statistical aggregates
  const stats = useMemo(() => computeWindowStats(series), [series]);
  const verdict = useMemo(() => getVerdict(stats), [stats]);

  // Live simulation variables
  const live = useMemo(() => valuesAt(series, timeCtrl.tRel), [series, timeCtrl.tRel]);
  const timeToSunset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'sunset'), [series, timeCtrl.tRel]);
  const timeToEarthset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'earthset'), [series, timeCtrl.tRel]);

  const handleStartMission = () => {
    try {
      localStorage.setItem('lunar_visited', 'true');
    } catch {
      // ignore
    }
    playTelemetryPing(2524, 0.12);
    playThrustRumble(2.2);
    if (!audioMuted) startSpaceAmbientMusic();
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

    if (universeRef.current?.triggerCinematicDescent) {
      universeRef.current.triggerCinematicDescent(() => {
        playTelemetryPing(2000, 0.12);
        setIsDescending(false);
        setHasLanded(true);
      });
    } else {
      setTimeout(() => {
        setIsDescending(false);
        setHasLanded(true);
      }, 3000);
    }
  };

  const handleReturnToOrbit = () => {
    playTelemetryPing(1600, 0.08);
    setViewMode('orbit');
    setHasLanded(false);
    if (universeRef.current?.centerMoon) {
      universeRef.current.centerMoon();
    }
  };

  const handleResetToMacro = () => {
    playTelemetryPing(1200, 0.08);
    setSceneState('macro');
    setViewMode('orbit');
    setHasLanded(false);
    if (universeRef.current?.resetToMacro) universeRef.current.resetToMacro();
  };

  const toggleAudio = () => {
    const next = !audioMuted;
    setAudioMutedState(next);
    setMuted(next);
    toggleSpaceAmbientMusic(!next);
    if (!next) playTelemetryPing(2100, 0.08);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const handleSelectOpportunity = (targetScenario, oppSite, oppDate) => {
    playTelemetryPing(2200, 0.1);
    if (targetScenario === 'main') {
      handleSelectSite(oppSite);
      setLaunchDate(oppDate);
      setSlipDays(0);
    } else if (targetScenario === 'A') {
      setScenarioA({
        siteId: oppSite.id,
        launchDate: oppDate,
        transitDays: 4,
        customSite: oppSite.id === 'custom' ? oppSite : null
      });
      setInspectorTab('compare');
    } else if (targetScenario === 'B') {
      setScenarioB({
        siteId: oppSite.id,
        launchDate: oppDate,
        transitDays: 4,
        customSite: oppSite.id === 'custom' ? oppSite : null
      });
      setInspectorTab('compare');
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-black text-neutral-100 flex flex-col items-center justify-center p-8 space-y-4 font-mono select-none">
        <div className="w-8 h-8 border-2 border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
        <span className="text-xs uppercase tracking-widest text-neutral-400">
          Loading NASA/JPL Horizons Ephemeris Telemetry…
        </span>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  const { sites, ephem } = data;

  return (
    <div className="h-screen w-screen bg-black text-neutral-100 flex flex-col overflow-hidden font-sans select-none relative">
      {/* ── TOP SLIM MISSION BAR ── */}
      <TopBar
        sites={sites}
        selectedSiteId={selectedSiteId}
        onSelectSite={handleSelectSite}
        onOpenCustomCoords={() => setShowCustomCoordsModal(true)}
        launchDate={launchDate}
        onLaunchDateChange={setLaunchDate}
        transitDays={transitDays}
        onTransitDaysChange={setTransitDays}
        slipDays={slipDays}
        onSlipDaysChange={setSlipDays}
        landingDateStr={landingDateStr}
        onOpenReport={() => setShowReport(true)}
        onResetCamera={handleResetToMacro}
        audioMuted={audioMuted}
        onToggleAudio={toggleAudio}
        ephem={ephem}
        missionValidation={missionValidation}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        showGraticule={showGraticule}
        setShowGraticule={setShowGraticule}
        showDsnBeam={showDsnBeam}
        setShowDsnBeam={setShowDsnBeam}
        showSlopeHeatmap={showSlopeHeatmap}
        setShowSlopeHeatmap={setShowSlopeHeatmap}
        onCopyLink={handleCopyLink}
        linkCopied={linkCopied}
      />

      {/* ── PERSISTENT VERDICT STRIP ── */}
      <VerdictStrip
        verdict={verdict}
        stats={stats}
        live={live}
        siteName={site?.name || 'Selected Site'}
      />

      {/* ── OUTSIDE EPHEMERIS RANGE WARNING BANNER ── */}
      {missionValidation.isOutsideRange && (
        <div className="bg-amber-950/90 border-b border-amber-600/50 text-amber-200 text-xs font-mono px-4 py-1.5 flex items-center justify-between z-20">
          <span>Warning: {missionValidation.warnings.join(' ')}</span>
          <span className="text-[10px] text-amber-400 font-bold uppercase">Telemetry Clamped</span>
        </div>
      )}

      {/* ── MAIN WORKSPACE: 3D/2D VIEWPORT + RIGHT INSPECTOR ── */}
      <div className="flex-1 relative flex overflow-hidden">
        {/* 3D Scene Viewport */}
        <div className="flex-1 h-full relative">
          {viewMode === 'surface' ? (
            <SurfaceViewSimulation
              site={site}
              live={live}
              stats={stats}
              verdict={verdict}
              timeCtrl={timeCtrl}
              maxHours={maxHours}
              onBackToOrbit={handleReturnToOrbit}
              showSlopeHeatmap={showSlopeHeatmap}
            />
          ) : (
            <LunarUniverseR3F
              ref={universeRef}
              mode={sceneState}
              sites={sites}
              selectedSiteId={selectedSiteId}
              onSelectSite={handleSelectSite}
              onSelectCustomCoord={handleSelectCustomCoord}
              showLabels={showLabels}
              showGraticule={showGraticule}
              showDsnBeam={showDsnBeam}
              onReachedOrbit={handleReachedOrbit}
              onLanderTouchdown={() => setHasLanded(true)}
              onUpdateCraterScreenPos={setCraterScreenPos}
              sunEl={live.sunEl}
              sunAz={live.sunAz}
              earthEl={live.earthEl}
              earthAz={live.earthAz}
              customCoords={customSite}
              viewMode={viewMode}
              isDescending={isDescending}
              hasLanded={hasLanded}
              isComparing={inspectorTab === 'compare'}
              setIsDescending={setIsDescending}
              setHasLanded={setHasLanded}
              setViewMode={setViewMode}
            />
          )}

          {/* Intro Overlay for Macro Scene */}
          {sceneState === 'macro' && (
            <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-end p-8 pb-16 bg-gradient-to-t from-black/80 via-transparent to-transparent">
              <div className="pointer-events-auto max-w-lg space-y-3">
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-semibold">
                  NASA Space Apps 2026 // Lunar Landing Site Navigator
                </span>
                <h1 className="text-3xl font-sans font-bold text-white tracking-tight">
                  Artemis Polar Landing Evaluation
                </h1>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">
                  Evaluate solar illumination, continuous darkness survival windows, and direct line-of-sight communications to Earth across lunar south-pole candidate landing zones.
                </p>
                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleStartMission}
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-mono font-semibold transition-colors shadow-lg cursor-pointer flex items-center gap-2"
                  >
                    <span>Begin Orbital Analysis</span>
                    <span>→</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSceneState('orbit');
                      if (universeRef.current?.centerMoon) universeRef.current.centerMoon();
                    }}
                    className="px-3 py-2 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 rounded text-xs font-mono transition-colors cursor-pointer"
                  >
                    Skip Intro
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Targeting reticle marker over active site */}
          {sceneState === 'orbit' && viewMode === 'orbit' && craterScreenPos && (
            <TargetingReticle screenPos={craterScreenPos} />
          )}

          {/* Link Copied Toast Notification */}
          <AnimatePresence>
            {linkCopied && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 border border-neutral-700 px-3 py-1.5 rounded text-xs font-mono text-emerald-300 shadow-xl"
              >
                Mission State URL Copied to Clipboard
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── COLLAPSIBLE RIGHT INSPECTOR (5 TABS) ── */}
        {sceneState === 'orbit' && (
          <Inspector
            sites={sites}
            ephem={ephem}
            site={site}
            selectedSiteId={selectedSiteId}
            onSelectSite={handleSelectSite}
            series={series}
            startUTC={ephem?.startUTC}
            tRel={timeCtrl.tRel}
            onSeek={(t) => timeCtrl.seek(t)}
            live={live}
            stats={stats}
            verdict={verdict}
            timeToSunset={timeToSunset}
            timeToEarthset={timeToEarthset}
            plannerMode={plannerMode}
            onTogglePlannerMode={setPlannerMode}
            isCollapsed={inspectorCollapsed}
            onToggleCollapse={() => setInspectorCollapsed((v) => !v)}
            activeTab={inspectorTab}
            onTabChange={setInspectorTab}
            scenarioA={scenarioA}
            setScenarioA={setScenarioA}
            scenarioB={scenarioB}
            setScenarioB={setScenarioB}
            compareMode={compareMode}
            setCompareMode={setCompareMode}
            missionDays={missionDays}
            setMissionDays={setMissionDays}
            slipDays={slipDays}
            setSlipDays={setSlipDays}
            onSelectOpportunity={handleSelectOpportunity}
          />
        )}
      </div>

      {/* ── BOTTOM TIME CONTROLLER & SCRUBBER ── */}
      {sceneState === 'orbit' && (
        <BottomTimeScrubber
          timeCtrl={timeCtrl}
          maxHours={maxHours}
          landingDateStr={landingDateStr}
          onResetTime={() => timeCtrl.seek(0)}
        />
      )}

      {/* ── REPORT MODAL (PRINT / PDF READY) ── */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        site={site}
        stats={stats}
        live={live}
        verdict={verdict}
        launchDate={launchDate}
        transitDays={transitDays}
        slipDays={slipDays}
        landingDateStr={landingDateStr}
        ephem={ephem}
      />

      {/* ── CUSTOM COORDINATES ENTRY MODAL ── */}
      <CustomCoordsModal
        isOpen={showCustomCoordsModal}
        onClose={() => setShowCustomCoordsModal(false)}
        onApply={handleSelectCustomCoord}
        currentLat={site?.lat ?? -89.9}
        currentLon={site?.lon ?? 129.8}
      />

      {/* ── CSA ARTEMIS INFORMATION MODAL ── */}
      <CsaArtemisPanel
        isOpen={showCsaPanel}
        onClose={() => setShowCsaPanel(false)}
      />
    </div>
  );
}

export default App;
