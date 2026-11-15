import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react';
import { Play, Pause, BarChart2, FileText, ChevronDown, Compass } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController } from './lib/useTimeController.js';
import { sampleSeries, valuesAt, hoursSince } from './lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate, timeToNext } from './lib/metrics.js';
import { validateMissionInputs } from './lib/validation.js';
import { parseUrlState, buildUrlState } from './lib/urlState.js';
import { isWebGLAvailable } from './lib/webgl.js';
import {
  playThrustRumble,
  playTelemetryPing,
  playTargetLock,
  setMuted,
  startSpaceAmbientMusic,
  toggleSpaceAmbientMusic,
} from './lib/audio.js';

import { TargetingReticle } from './components/ui/TargetingReticle.jsx';
import { EdgeHudSidebars } from './components/ui/EdgeHudSidebars.jsx';
import { ComparePanel } from './components/ui/ComparePanel.jsx';
import { AnalysisToolsModal } from './components/ui/AnalysisToolsModal.jsx';
import { DataAssumptionsPopover } from './components/ui/DataAssumptionsPopover.jsx';
import { CsaArtemisPanel } from './components/ui/CsaArtemisPanel.jsx';
import { CustomCursor } from './components/ui/CustomCursor.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';
import { LUNAR_LANDMARKS } from './lib/lunarLandmarks.js';

// Lazy-load heavy 3D canvases and modals
const LunarUniverseR3F = React.lazy(() => import('./components/scene/LunarUniverseR3F.jsx'));
const SurfaceViewSimulation = React.lazy(() => import('./components/scene/SurfaceViewSimulation.jsx'));
const ReportModal = React.lazy(() => import('./components/ui/ReportModal.jsx'));

import { SIM_SPEED_OPTIONS } from './lib/config.js';

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // URL state initialization
  const initialUrlState = useMemo(() => parseUrlState(), []);

  // Experience Scene State: 'macro' | 'transition' | 'orbit'
  const [sceneState, setSceneState] = useState(() =>
    initialUrlState.noIntro || window.location.hash.includes('nointro') ? 'orbit' : 'macro'
  );

  const universeRef = useRef(null);

  // Selected site & custom coordinates
  const [selectedSiteId, setSelectedSiteId] = useState(() => initialUrlState.siteId || 'shackleton');
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

  // Compare split-screen mode
  const [compareOpen, setCompareOpen] = useState(false);

  // Analysis Tools modal: null | 'timeline' | 'battery' | 'calendar'
  const [analysisTool, setAnalysisTool] = useState(null);

  // Report modal
  const [showReport, setShowReport] = useState(false);

  // CSA Artemis modal
  const [showCsaPanel, setShowCsaPanel] = useState(false);

  // More secondary actions menu open on small screens
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Flight dynamics & mission schedule
  const [launchDate, setLaunchDate] = useState(() => initialUrlState.launchDate || '2027-03-08T00:00:00Z');
  const [transitDays, setTransitDays] = useState(() => initialUrlState.transitDays || 4);
  const [slipDays, setSlipDays] = useState(() => initialUrlState.slipDays || 0);
  const [showTransitTooltip, setShowTransitTooltip] = useState(false);
  const missionDays = 14;
  const maxHours = missionDays * 24;

  // Display Mode: 'planner' (dense numbers) | 'explorer' (plain-language captions)
  const [plannerMode, setPlannerMode] = useState(() => initialUrlState.plannerMode || 'planner');

  // Audio mute state
  const [audioMuted, setAudioMutedState] = useState(false);

  // 3D Visual layers
  const [showLabels, setShowLabels] = useState(true);
  const [showGraticule, setShowGraticule] = useState(false);
  const [showDsnBeam, setShowDsnBeam] = useState(false);
  const [showThermalMap, setShowThermalMap] = useState(false);

  // Copy link feedback
  const [linkCopied, setLinkCopied] = useState(false);

  // Simulation time controller
  const timeCtrl = useTimeController({
    maxHours,
    initialSpeed: 24,
    initialTime: initialUrlState.tRel || 0,
  });

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
    let ignore = false;
    loadAllData()
      .then((res) => {
        if (!ignore) {
          setData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, []);

  const site = useMemo(() => {
    if (customSite) return customSite;
    if (!data?.sites) return LUNAR_LANDMARKS[0] || { id: 'shackleton', name: 'Shackleton Crater Rim', lat: -89.9, lon: 129.8, terrainType: 'crater-rim' };
    return data.sites.find(s => s.id === selectedSiteId) || LUNAR_LANDMARKS.find(lm => lm.id === selectedSiteId) || data.sites[0];
  }, [data, selectedSiteId, customSite]);

  // Mission input validation and bounds clamping
  const missionValidation = useMemo(() => {
    return validateMissionInputs({
      launchDateStr: launchDate,
      transitDays,
      slipDays,
      missionDays,
      ephem: data?.ephem,
    });
  }, [launchDate, transitDays, slipDays, missionDays, data?.ephem]);

  const landing = landingDate(launchDate, transitDays + slipDays);
  const startHours = useMemo(() => {
    if (!data?.ephem || !data.ephem.subSolarLat) return 0;
    const rawHours = hoursSince(data.ephem.startUTC, landing);
    if (!Number.isFinite(rawHours)) return 0;
    const totalEphemHours = (data.ephem.subSolarLat.length - 1) * (data.ephem.stepHours || 1);
    const maxAvailable = Math.max(0, totalEphemHours - maxHours);
    return Math.max(0, Math.min(rawHours, maxAvailable));
  }, [data, landing, maxHours]);

  // Decoupled Static Series (only recalculates when site, launch date or slip changes — NOT on every tick)
  const series = useMemo(() => {
    if (!data?.ephem) return { t: [], sunEl: [], sunAz: [], earthEl: [], earthAz: [] };
    return sampleSeries(site, startHours, maxHours, data.ephem, 1);
  }, [site, startHours, maxHours, data]);

  // Aggregate static metrics
  const stats = useMemo(() => computeWindowStats(series), [series]);
  const verdict = useMemo(() => getVerdict(stats), [stats]);

  // Live simulation variables
  const live = useMemo(() => valuesAt(series, timeCtrl.tRel), [series, timeCtrl.tRel]);
  const timeToSunset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'sunset'), [series, timeCtrl.tRel]);
  const timeToEarthset = useMemo(() => timeToNext(series, timeCtrl.tRel, 'earthset'), [series, timeCtrl.tRel]);

  const metDays = Math.floor(timeCtrl.tRel / 24);
  const metHours = Math.floor(timeCtrl.tRel % 24);
  const metMinutes = Math.floor((timeCtrl.tRel % 1) * 60);

  // Sync state to URL hash (debounced to avoid browser history rate-limiting and frame jank)
  useEffect(() => {
    if (sceneState === 'macro') return;
    const timer = setTimeout(() => {
      const urlHash = buildUrlState({
        siteId: customSite ? 'custom' : selectedSiteId,
        launchDate,
        slipDays,
        tRel: Math.round(timeCtrl.tRel * 10) / 10,
        plannerMode,
        noIntro: true,
      });
      try {
        window.history.replaceState(null, '', urlHash);
      } catch {
        // Guard against browser history rate-limits
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [sceneState, selectedSiteId, customSite, launchDate, slipDays, timeCtrl.tRel, plannerMode]);

  const handleCopyLink = () => {
    try {
      navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2200);
    } catch {
      // ignore
    }
  };

  const handleSelectSite = (newSite) => {
    playTargetLock();
    setHasLanded(false);
    setShowLandingOption(false);
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

  const handleStartMission = () => {
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
    setAnalysisTool(null);
    if (universeRef.current?.resetToMacro) universeRef.current.resetToMacro();
  };

  const toggleAudio = () => {
    const next = !audioMuted;
    setAudioMutedState(next);
    setMuted(next);
    toggleSpaceAmbientMusic(!next);
    if (!next) playTelemetryPing(2100, 0.08);
  };

  const cycleSpeed = () => {
    const currentIndex = SIM_SPEED_OPTIONS.findIndex(s => s.value === timeCtrl.speed);
    const nextSpeed = SIM_SPEED_OPTIONS[(currentIndex + 1) % SIM_SPEED_OPTIONS.length];
    timeCtrl.setSpeed(nextSpeed.value);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#000000] text-[#f5f5f5] flex flex-col items-center justify-center p-8 space-y-4 font-sans select-none cursor-default">
        <CustomCursor />
        <div className="w-6 h-6 border border-white/20 border-t-white rounded-full animate-spin" />
        <p className="text-[11px] font-sans font-light tracking-[0.3em] text-[#a3a3a3] uppercase">
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
    <div className="h-screen w-screen bg-[#000000] text-[#f5f5f5] overflow-hidden font-sans select-none relative cursor-default">
      {/* ── Custom Crosshair Cursor ── */}
      <CustomCursor />

      {/* ── 1. UNIFIED R3F 3D LUNAR VIEWPORT ── */}
      <div className={`absolute inset-0 w-full h-full ${viewMode === 'surface' ? 'hidden' : 'block'}`}>
        <Suspense fallback={null}>
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
            showThermalMap={showThermalMap}
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
        </Suspense>
      </div>

      {/* ── 1B. PHOTOREALISTIC SURFACE VIEW & SIMULATION (EVA View) ── */}
      {viewMode === 'surface' && (
        <div className="absolute inset-0 w-full h-full z-10">
          <Suspense fallback={null}>
            <SurfaceViewSimulation
              site={site}
              sunEl={live.sunEl}
              sunAz={live.sunAz}
              earthEl={live.earthEl}
              earthAz={live.earthAz}
              onReturnToOrbit={handleReturnToOrbit}
              onOpenReport={() => setShowReport(true)}
              onOpenAnalysis={() => setAnalysisTool('timeline')}
              timeCtrl={timeCtrl}
              maxHours={maxHours}
            />
          </Suspense>
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
                  timeCtrl.pause();
                  setViewMode('surface');
                }}
                className="flex-1 bg-white text-black hover:bg-neutral-200 py-2.5 px-4 rounded text-xs font-sans font-medium tracking-wider uppercase transition cursor-pointer"
              >
                Enter Surface Simulation ↘
              </button>
              <button
                onClick={() => setShowLandingOption(false)}
                className="text-xs text-[#a3a3a3] hover:text-white px-3 py-2 transition cursor-pointer"
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
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center p-6 sm:p-12 lg:p-16 pointer-events-none">
          <div className="max-w-xl w-full pointer-events-auto text-center space-y-6">
            <span className="text-[11px] font-sans font-medium tracking-[0.25em] sm:tracking-[0.3em] text-[#d4d4d4] uppercase block drop-shadow-[0_2px_8px_rgba(0,0,0,1)]">
              NASA Artemis · Polar Flight Dynamics
            </span>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-sans font-light text-white tracking-[0.1em] sm:tracking-[0.2em] uppercase leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,1)]">
              Lunar Navigator
            </h1>

            <p className="text-xs sm:text-sm font-sans font-normal text-[#d4d4d4] max-w-md mx-auto leading-relaxed drop-shadow-[0_2px_10px_rgba(0,0,0,1)] [overflow-wrap:anywhere]">
              Evaluating polar solar illumination, grazing shadows, and direct-to-Earth communication windows at candidate lunar landing sites.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleStartMission}
                className="flex items-center justify-center gap-2.5 text-xs font-sans font-semibold tracking-[0.2em] uppercase text-black bg-white hover:bg-neutral-200 px-8 py-3.5 rounded-full transition-all duration-300 cursor-pointer shadow-2xl hover:scale-105 active:scale-95"
                title="Play Mission"
              >
                <Play size={13} className="fill-current" />
                <span>Play</span>
              </button>

              <button
                onClick={toggleAudio}
                className="text-xs font-sans tracking-widest text-[#d4d4d4] hover:text-white transition cursor-pointer px-4 py-2 drop-shadow-[0_2px_8px_rgba(0,0,0,1)]"
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
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col items-center justify-center p-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: -25, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 1.05 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="flex flex-col items-center gap-3"
          >
            <span className="text-[11px] font-mono tracking-[0.2em] sm:tracking-[0.45em] text-[#38bdf8] uppercase">
              ORBITAL APPROACH
            </span>
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-sans font-light tracking-[0.15em] sm:tracking-[0.35em] text-white uppercase drop-shadow-[0_4px_30px_rgba(0,0,0,0.95)]">
              THE MOON
            </h1>
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent via-[#38bdf8] to-transparent mt-2" />
          </motion.div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SCENE 3: ORBIT PLANNING HUD (Hidden on Surface View)                     */}
      {/* ======================================================================= */}
      {sceneState === 'orbit' && viewMode === 'orbit' && (
        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-4 sm:p-8 lg:p-10">
          {/* ── TOP BAR HEADER ── */}
          <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pointer-events-none bg-transparent">
            {/* Left: Site Info & Mobile HUD Toggle */}
            <div className="pointer-events-auto flex items-center justify-between w-full md:w-auto gap-4">
              <div className="min-w-0 max-w-[20rem]">
                <span className="text-[11px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block truncate">
                  Polar Orbit Survey
                </span>
                <div className="text-sm font-sans font-light text-[#f5f5f5] tracking-wide mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] truncate" title={site.name}>
                  {site.name} · <span className="font-mono text-xs text-[#a3a3a3]">{site.lat > 0 ? `+${site.lat.toFixed(1)}°` : `${site.lat.toFixed(1)}°`}</span>
                </div>
              </div>

              {/* Mobile HUD Toggle Button */}
              <button
                type="button"
                onClick={() => setIsSidebarsCollapsed(v => !v)}
                className="md:hidden border border-white/20 bg-black/80 px-2.5 py-1 rounded text-[11px] font-sans text-sky-300 pointer-events-auto shadow-md shrink-0 cursor-pointer"
              >
                {isSidebarsCollapsed ? 'HUD' : 'Hide HUD'}
              </button>
            </div>

            {/* Right: Responsive Action Bar */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-sans tracking-wider pointer-events-auto max-w-full">
              {/* Spacecraft Focus Zoom Button */}
              <button
                type="button"
                onClick={() => {
                  playTelemetryPing(1900, 0.08);
                  universeRef.current?.focusSpacecraft?.();
                }}
                className="text-[#38bdf8] hover:text-white transition cursor-pointer flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-full bg-sky-950/40 border border-sky-700/40"
                title="Zoom camera to focus on the Spacecraft"
              >
                <span>Focus Craft</span>
              </button>

              {/* Compare Button */}
              <button
                type="button"
                onClick={() => {
                  playTelemetryPing(2000, 0.08);
                  setCompareOpen(v => !v);
                }}
                className={`flex items-center gap-1.5 transition cursor-pointer shrink-0 px-2.5 py-1 rounded border ${
                  compareOpen ? 'text-[#f5f5f5] bg-white/10 border-white/40' : 'text-[#a3a3a3] hover:text-[#f5f5f5] border-transparent'
                }`}
              >
                <BarChart2 size={12} />
                <span>{compareOpen ? 'Exit Compare' : 'Compare'}</span>
              </button>

              {/* Quantitative Analysis Tools Launcher */}
              <button
                type="button"
                onClick={() => setAnalysisTool('timeline')}
                className="flex items-center gap-1 text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-pointer shrink-0 px-2 py-1 rounded bg-white/5 border border-white/10 hover:border-white/30"
                title="Open quantitative timeline, battery simulator, and mission calendar"
              >
                <span>Analysis</span>
              </button>

              {/* Report Button */}
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-pointer shrink-0"
              >
                <FileText size={12} />
                <span>Report</span>
              </button>

              {/* Desktop Direct Secondary Buttons */}
              <div className="hidden lg:flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowCsaPanel(true)}
                  className="text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-pointer shrink-0"
                >
                  CSA Alignment ↗
                </button>

                <button
                  type="button"
                  onClick={() => setShowLabels(v => !v)}
                  className={`transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    showLabels ? 'text-[#f5f5f5]' : 'text-[#737373] hover:text-[#a3a3a3]'
                  }`}
                  title="Toggle on-Moon 3D landmark and landing site labels"
                >
                  <span>Labels · {showLabels ? 'On' : 'Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGraticule(v => !v)}
                  className={`transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    showGraticule ? 'text-[#38bdf8]' : 'text-[#737373] hover:text-[#a3a3a3]'
                  }`}
                  title="Toggle coordinate graticule grid"
                >
                  <span>Grid · {showGraticule ? 'On' : 'Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowDsnBeam(v => !v)}
                  className={`transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    showDsnBeam ? 'text-[#38bdf8]' : 'text-[#737373] hover:text-[#a3a3a3]'
                  }`}
                  title="Toggle Direct-to-Earth Telemetry Laser Beam"
                >
                  <span>DSN · {showDsnBeam ? 'On' : 'Off'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowThermalMap(v => !v)}
                  className={`transition cursor-pointer flex items-center gap-1 shrink-0 ${
                    showThermalMap ? 'text-[#a78bfa]' : 'text-[#737373] hover:text-[#a3a3a3]'
                  }`}
                  title="Toggle illustrative cold-trap layer (not measured data)"
                >
                  <span>Ice Map · {showThermalMap ? 'On' : 'Off'}</span>
                </button>

                <button type="button" onClick={toggleAudio} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-pointer shrink-0">
                  {audioMuted ? 'Audio · Off' : 'Audio · On'}
                </button>

                <button type="button" onClick={handleResetToMacro} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-pointer shrink-0">
                  Overview ↗
                </button>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="text-xs text-[#a3a3a3] hover:text-white transition cursor-pointer border border-white/10 hover:border-white/30 px-2 py-0.5 rounded"
                  title="Copy shareable mission link"
                >
                  {linkCopied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Mobile / Tablet "More ▾" Menu Dropdown */}
              <div className="lg:hidden relative">
                <button
                  type="button"
                  onClick={() => setShowMoreMenu(v => !v)}
                  className="flex items-center gap-1 text-xs text-[#a3a3a3] hover:text-white border border-white/15 px-2.5 py-1 rounded bg-black/70 cursor-pointer"
                >
                  <span>More</span>
                  <ChevronDown size={11} />
                </button>

                {showMoreMenu && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 bg-black/95 border border-white/15 rounded-xl shadow-2xl p-2 z-50 flex flex-col gap-1 text-[11px] font-sans backdrop-blur-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCsaPanel(true);
                        setShowMoreMenu(false);
                      }}
                      className="text-left px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      CSA Alignment ↗
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowLabels(v => !v)}
                      className="text-left px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      Labels · {showLabels ? 'On' : 'Off'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowGraticule(v => !v)}
                      className="text-left px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      Grid · {showGraticule ? 'On' : 'Off'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowDsnBeam(v => !v)}
                      className="text-left px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      DSN · {showDsnBeam ? 'On' : 'Off'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowThermalMap(v => !v)}
                      className="text-left px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      Ice Map · {showThermalMap ? 'On' : 'Off'}
                    </button>

                    <button
                      type="button"
                      onClick={toggleAudio}
                      className="text-left px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      {audioMuted ? 'Audio · Off' : 'Audio · On'}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-left px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer"
                    >
                      {linkCopied ? 'Copied' : 'Copy Link'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        handleResetToMacro();
                      }}
                      className="text-left px-2.5 py-1.5 text-neutral-300 hover:text-white hover:bg-white/10 rounded transition cursor-pointer border-t border-white/10 mt-1"
                    >
                      Overview ↗
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* ── ILLUSTRATIVE COLD-TRAP HEATMAP SCALE LEGEND ── */}
          {showThermalMap && viewMode === 'orbit' && (
            <div className="absolute top-18 left-1/2 -translate-x-1/2 z-25 pointer-events-none flex flex-wrap items-center justify-center gap-3 bg-black/90 border border-violet-500/40 px-4 py-1.5 rounded-full text-[11px] font-mono tracking-wider text-neutral-300 shadow-2xl backdrop-blur-md max-w-[90vw]">
              <span className="text-violet-400 font-bold uppercase">Illustrative Cold-Trap Layer</span>
              <span className="text-white/20">•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-300 inline-block shadow-[0_0_8px_#67e8f9]" />
                <span className="text-cyan-200 font-medium">Permanent Shadow (PSR)</span>
              </span>
              <span className="text-white/20">•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block" />
                <span>Cold Trap Region</span>
              </span>
            </div>
          )}

          {/* ── CONDITIONAL RENDERING: SINGLE-SITE HUD vs. COMPARISON HUD ── */}
          <AnimatePresence mode="wait">
            {compareOpen && sceneState === 'orbit' && viewMode === 'orbit' ? (
              <ComparePanel
                key="compare-panel"
                sites={sites}
                ephem={ephem}
                missionDays={missionDays}
                onClose={() => setCompareOpen(false)}
              />
            ) : (!compareOpen && viewMode === 'orbit') ? (
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
                    timeCtrl.pause();
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
                plannerMode={plannerMode}
                onTogglePlannerMode={setPlannerMode}
                onOpenTool={(toolName) => setAnalysisTool(toolName)}
              />
            ) : null}
          </AnimatePresence>

          {/* ── BOTTOM TIMELINE SCRUBBER & MISSION CONTROLS (Orbit Survey only) ── */}
          {!compareOpen && viewMode === 'orbit' && (
            <div className="pointer-events-auto space-y-2.5 z-20 max-w-4xl mx-auto w-full p-3 sm:p-4 rounded-xl bg-black/85 backdrop-blur-md border border-white/10 shadow-2xl">
              {/* Responsive Row: wraps cleanly into two tidy lines on small screens */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 text-[11px] font-sans font-light text-[#a3a3a3]">
                {/* Row 1 / Left: Play/Pause, Speed Multiplier, MET */}
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                  <button
                    type="button"
                    onClick={() => timeCtrl.toggle()}
                    className="text-[#f5f5f5] hover:opacity-70 transition cursor-pointer flex items-center"
                    aria-label={timeCtrl.playing ? 'Pause' : 'Play'}
                  >
                    {timeCtrl.playing ? <Pause size={13} /> : <Play size={13} />}
                  </button>

                  <button
                    type="button"
                    onClick={cycleSpeed}
                    className="text-[11px] font-mono tracking-wider text-[#f5f5f5] hover:text-white transition cursor-pointer border-b border-transparent hover:border-white/40 pb-0.5"
                    title="Cycle Simulation Speed"
                  >
                    {SIM_SPEED_OPTIONS.find(s => s.value === timeCtrl.speed)?.label || `${timeCtrl.speed}x`}
                  </button>

                  <div className="font-mono text-xs text-[#f5f5f5] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                    MET {metDays}d {metHours}h {metMinutes}m
                    {viewMode === 'surface' && <span className="text-[#a3a3a3] ml-2">· EVA View</span>}
                  </div>
                </div>

                {/* Row 2 / Right: Launch Date, Transit Days, Slip Slider, Data Assumptions Popover */}
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-[#a3a3a3]">
                  {/* Launch Date */}
                  <div className="flex items-center gap-1.5">
                    <span>Launch:</span>
                    <input
                      type="date"
                      value={launchDate.slice(0, 10)}
                      onChange={(e) => setLaunchDate(`${e.target.value}T00:00:00Z`)}
                      className="bg-transparent border-b border-white/15 pb-0.5 text-[11px] text-[#f5f5f5] focus:outline-none cursor-pointer"
                    />
                  </div>

                  {/* Interactive Transit Days with Trajectory Flight Budget Tooltip */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowTransitTooltip(v => !v)}
                      onMouseEnter={() => setShowTransitTooltip(true)}
                      className="flex items-center gap-1 hover:text-white transition cursor-pointer text-left focus:outline-none"
                      title="Click to view Trajectory Flight Budget & Δv estimates"
                    >
                      <span>Transit:</span>
                      <span className="font-mono text-[#f5f5f5] text-[11px] underline decoration-dotted decoration-white/40">
                        {transitDays}d
                      </span>
                    </button>

                    {/* Trajectory Flight Budget Tooltip */}
                    {showTransitTooltip && (
                      <div
                        onMouseLeave={() => setShowTransitTooltip(false)}
                        className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 p-3.5 bg-black/95 border border-white/20 rounded-xl shadow-2xl z-50 text-[11px] font-sans text-neutral-300 pointer-events-auto backdrop-blur-xl space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                          <span className="font-medium text-white text-[11px] flex items-center gap-1.5">
                            <Compass size={12} className="text-sky-400" />
                            <span>Trajectory Flight Budget</span>
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">Total: {transitDays + slipDays}d</span>
                        </div>

                        <div className="space-y-2 text-[10px] font-mono">
                          {/* Profile 1: Direct Transfer */}
                          <div
                            className={`p-2 rounded-lg border transition ${
                              transitDays <= 7
                                ? 'bg-sky-950/40 border-sky-400/40 text-sky-200'
                                : 'bg-white/5 border-white/10 text-neutral-400'
                            }`}
                          >
                            <div className="flex justify-between items-center font-bold text-white mb-0.5">
                              <span>Direct Transfer (Apollo / Artemis)</span>
                              <span className="text-sky-400">3–5 days</span>
                            </div>
                            <p className="text-[10px] text-neutral-300 font-sans leading-tight">
                              High-energy translunar insertion (TLI) to lunar orbit.
                            </p>
                            <div className="flex justify-between text-[10px] text-neutral-400 mt-1 pt-1 border-t border-white/5">
                              <span>TLI Δv ≈ 3,150 m/s</span>
                              <span>LOI Δv ≈ 850 m/s</span>
                              <span className="font-bold text-white">Total ≈ 4,000 m/s</span>
                            </div>
                          </div>

                          {/* Profile 2: Low-Energy Transfer */}
                          <div
                            className={`p-2 rounded-lg border transition ${
                              transitDays > 7
                                ? 'bg-amber-950/40 border-amber-400/40 text-amber-200'
                                : 'bg-white/5 border-white/10 text-neutral-400'
                            }`}
                          >
                            <div className="flex justify-between items-center font-bold text-white mb-0.5">
                              <span>Low-Energy Transfer (BLT / WSB)</span>
                              <span className="text-amber-300">90–120 days</span>
                            </div>
                            <p className="text-[10px] text-neutral-300 font-sans leading-tight">
                              Sun-Earth L1/L2 Weak Stability Boundary transfer (CAPSTONE / Danuri cargo style).
                            </p>
                            <div className="flex justify-between text-[10px] text-neutral-400 mt-1 pt-1 border-t border-white/5">
                              <span>Saves ~18% Δv (~750 m/s)</span>
                              <span className="font-bold text-white">Total ≈ 3,250 m/s</span>
                            </div>
                          </div>
                        </div>

                        {/* Transit Duration Slider */}
                        <div className="pt-1.5 border-t border-white/10 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-neutral-400 font-sans">Adjust Transit Duration:</span>
                            <span className="font-mono text-white font-bold">{transitDays} days</span>
                          </div>
                          <input
                            type="range"
                            min={3}
                            max={14}
                            step={1}
                            value={transitDays}
                            onChange={(e) => setTransitDays(parseInt(e.target.value, 10))}
                            className="w-full h-1 bg-white/20 rounded accent-sky-400 cursor-pointer"
                          />
                          <div className="flex justify-between text-[9px] text-neutral-500 font-mono">
                            <button
                              type="button"
                              onClick={() => setTransitDays(4)}
                              className="hover:text-white cursor-pointer"
                            >
                              Apollo Baseline (4d)
                            </button>
                            <button
                              type="button"
                              onClick={() => setTransitDays(7)}
                              className="hover:text-white cursor-pointer"
                            >
                              Extended Insertion (7d)
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Launch Slip Slider (0 to 30 days) */}
                  <div className="flex items-center gap-1.5" title="Launch slip window (0 to 30 days)">
                    <span>Slip:</span>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={slipDays}
                      onChange={(e) => setSlipDays(parseInt(e.target.value, 10))}
                      className="w-14 sm:w-20 h-1 bg-white/20 rounded accent-sky-400 cursor-pointer"
                    />
                    <span className="font-mono text-sky-300 text-[11px]">+{slipDays}d</span>
                  </div>

                  {/* Persistent Data & Assumptions Popover */}
                  <DataAssumptionsPopover
                    ephem={ephem}
                    missionValidation={missionValidation}
                  />
                </div>
              </div>

              {/* Whisper-Thin Scrubber Line */}
              <div className="relative flex items-center pt-1">
                <input
                  type="range"
                  min={0}
                  max={maxHours}
                  step={0.1}
                  value={timeCtrl.tRel}
                  onChange={(e) => timeCtrl.seek(parseFloat(e.target.value))}
                  className="w-full h-[2px] bg-white/20 rounded appearance-none cursor-pointer accent-white"
                  aria-label="Simulation time scrubber"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================= */}
      {/* QUANTITATIVE ANALYSIS TOOLS MODAL                                        */}
      {/* ======================================================================= */}
      <AnalysisToolsModal
        isOpen={Boolean(analysisTool)}
        initialTab={analysisTool || 'timeline'}
        onClose={() => setAnalysisTool(null)}
        sites={sites}
        ephem={ephem}
        site={site}
        series={series}
        startUTC={ephem?.startUTC}
        tRel={timeCtrl.tRel}
        onSeek={(t) => timeCtrl.seek(t)}
        stats={stats}
        launchDate={launchDate}
        transitDays={transitDays + slipDays}
        missionDays={missionDays}
        onSelectOpportunity={(chosenSite, chosenDate) => {
          handleSelectSite(chosenSite.id);
          try {
            const landingD = new Date(chosenDate);
            const totalTransit = transitDays + slipDays;
            const launchD = new Date(landingD.getTime() - totalTransit * 24 * 3600 * 1000);
            setLaunchDate(launchD.toISOString().slice(0, 10));
          } catch {
            setLaunchDate(chosenDate);
          }
          setSlipDays(0);
        }}
        onCompareOpportunity={(chosenSite, chosenDate) => {
          setCompareOpen(true);
        }}
      />

      {/* ======================================================================= */}
      {/* REPORT MODAL                                                             */}
      {/* ======================================================================= */}
      <Suspense fallback={null}>
        <ReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          site={site}
          stats={stats}
          live={live}
          verdict={verdict}
          launchDate={launchDate}
          transitDays={transitDays + slipDays}
        />
      </Suspense>

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
