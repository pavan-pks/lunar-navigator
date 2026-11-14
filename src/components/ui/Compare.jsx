import React, { useMemo } from 'react';
import { sampleSeries, valuesAt, hoursSince } from '../../lib/geometry.js';
import { computeWindowStats, getVerdict, timeToNext, landingDate } from '../../lib/metrics.js';
import { ScenePanel } from './ScenePanel.jsx';
import { SitePicker } from './SitePicker.jsx';
import { DateControls } from './DateControls.jsx';

/**
 * src/components/ui/Compare.jsx
 * Approachable, borderless side-by-side lunar landing trade study comparison view.
 * Eliminates text bloat in favor of clear, modular visual cards.
 */
export function Compare({
  sites,
  ephem,
  scenarioA,
  setScenarioA,
  scenarioB,
  setScenarioB,
  compareMode,
  setCompareMode,
  tRel,
  setTRel,
  viewMode,
  setViewMode,
  quality,
  setQuality,
  missionDays,
  setMissionDays,
  objectHeightM = 3.0,
  slipDays,
  setSlipDays
}) {
  const siteA = scenarioA.customSite || sites.find(s => s.id === scenarioA.siteId) || sites[0];
  const siteB = scenarioB.customSite || sites.find(s => s.id === scenarioB.siteId) || sites[1] || sites[0];

  const landingA = landingDate(scenarioA.launchDate, scenarioA.transitDays);
  const landingB = landingDate(scenarioB.launchDate, scenarioB.transitDays);

  const startHoursA = useMemo(() => {
    return Math.max(0, hoursSince(ephem.startUTC, landingA));
  }, [ephem.startUTC, landingA]);

  const startHoursB = useMemo(() => {
    return Math.max(0, hoursSince(ephem.startUTC, landingB));
  }, [ephem.startUTC, landingB]);

  const durationHours = missionDays * 24;

  const seriesA = useMemo(() => {
    return sampleSeries(siteA, startHoursA, durationHours, ephem, 1);
  }, [siteA, startHoursA, durationHours, ephem]);

  const seriesB = useMemo(() => {
    return sampleSeries(siteB, startHoursB, durationHours, ephem, 1);
  }, [siteB, startHoursB, durationHours, ephem]);

  const liveA = useMemo(() => valuesAt(seriesA, tRel), [seriesA, tRel]);
  const liveB = useMemo(() => valuesAt(seriesB, tRel), [seriesB, tRel]);

  const statsA = useMemo(() => computeWindowStats(seriesA), [seriesA]);
  const statsB = useMemo(() => computeWindowStats(seriesB), [seriesB]);

  const verdictA = useMemo(() => getVerdict(statsA), [statsA]);
  const verdictB = useMemo(() => getVerdict(statsB), [statsB]);

  const timeToSunsetA = useMemo(() => timeToNext(seriesA, tRel, 'sunset'), [seriesA, tRel]);
  const timeToSunsetB = useMemo(() => timeToNext(seriesB, tRel, 'sunset'), [seriesB, tRel]);

  const timeToEarthsetA = useMemo(() => timeToNext(seriesA, tRel, 'earthset'), [seriesA, tRel]);
  const timeToEarthsetB = useMemo(() => timeToNext(seriesB, tRel, 'earthset'), [seriesB, tRel]);

  // Swap A and B
  const handleSwap = () => {
    const tempA = { ...scenarioA };
    setScenarioA({ ...scenarioB });
    setScenarioB(tempA);
  };

  // Approachable Comparative Summary Sentence
  const summarySentence = useMemo(() => {
    const sunDiff = (statsA.sunlitFraction - statsB.sunlitFraction) * 100;
    const darkDiff = statsB.longestDarkHours - statsA.longestDarkHours;

    if (Math.abs(sunDiff) < 1.0 && Math.abs(darkDiff) < 2.0) {
      return `Both scenarios provide matching solar illumination (${(statsA.sunlitFraction * 100).toFixed(0)}%). Choose based on direct line-of-sight communication margins.`;
    }
    if (statsA.sunlitFraction > statsB.sunlitFraction) {
      return `Scenario A (${siteA.name}) delivers ${(statsA.sunlitFraction * 100).toFixed(0)}% solar coverage vs ${(statsB.sunlitFraction * 100).toFixed(0)}% for Scenario B. Scenario B requires ${darkDiff > 0 ? `${darkDiff}h more battery survival` : 'battery reserves'}.`;
    } else {
      return `Scenario B (${siteB.name}) delivers ${(statsB.sunlitFraction * 100).toFixed(0)}% solar coverage vs ${(statsA.sunlitFraction * 100).toFixed(0)}% for Scenario A.`;
    }
  }, [statsA, statsB, siteA.name, siteB.name]);

  const sunPctA = (statsA.sunlitFraction * 100).toFixed(1);
  const sunPctB = (statsB.sunlitFraction * 100).toFixed(1);
  const earthPctA = (statsA.earthVisibleFraction * 100).toFixed(1);
  const earthPctB = (statsB.earthVisibleFraction * 100).toFixed(1);

  return (
    <div className="space-y-5 pb-8 font-sans select-none">
      {/* 1. TOP CONTROLS & ARCHITECTURE CARD (BORDERLESS) */}
      <div className="border-0 bg-slate-950/75 backdrop-blur-2xl rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-wrap items-center justify-between gap-4">
        {/* Architecture Mode Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Mode:</span>
          <div className="flex items-center bg-black/40 p-1 rounded-2xl">
            <button
              onClick={() => setCompareMode('sites')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer border-0 ${
                compareMode === 'sites'
                  ? 'bg-sky-400 text-black font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Dual Site Assessment
            </button>
            <button
              onClick={() => setCompareMode('dates')}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer border-0 ${
                compareMode === 'dates'
                  ? 'bg-amber-400 text-black font-bold shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Launch Date Slip
            </button>
          </div>

          <button
            onClick={handleSwap}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono transition cursor-pointer border-0 flex items-center gap-1.5"
            title="Swap Scenario A and B"
          >
            <span>⇄</span>
            <span>Swap A/B</span>
          </button>
        </div>

        {/* View Camera Mode */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl font-mono text-xs">
          <span className="text-[11px] text-slate-400 px-2">Camera:</span>
          <button
            onClick={() => setViewMode('orbit')}
            className={`px-2.5 py-1 rounded-xl transition cursor-pointer border-0 ${
              viewMode === 'orbit' ? 'bg-sky-400/20 text-sky-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Orbit
          </button>
          <button
            onClick={() => setViewMode('astronaut')}
            className={`px-2.5 py-1 rounded-xl transition cursor-pointer border-0 ${
              viewMode === 'astronaut' ? 'bg-amber-400/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Surface EVA
          </button>
        </div>
      </div>

      {/* 2. APPROACHABLE EXECUTIVE SUMMARY CARD (BORDERLESS) */}
      <div className="border border-white/[0.08] bg-slate-950/70 backdrop-blur-2xl rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-400/20 flex items-center justify-center shrink-0 text-sky-400">
          <svg className="w-5 h-5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div>
          <div className="text-[10px] text-sky-400 font-mono font-bold uppercase tracking-wider">
            NASA Flight Dynamics Assessment
          </div>
          <div className="text-sm text-slate-200 font-sans mt-0.5 leading-snug">
            {summarySentence}
          </div>
        </div>
      </div>

      {/* 3. SITE SELECTION CARDS (SIDE-BY-SIDE BORDERLESS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Scenario Alpha Card */}
        <div className="border-0 bg-slate-950/75 backdrop-blur-2xl rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span>
              <span className="font-display font-bold text-xs uppercase tracking-wider text-sky-300">
                Scenario Alpha
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Touchdown: <strong className="text-sky-300">{landingA.toISOString().slice(0, 10)}</strong>
            </span>
          </div>

          <SitePicker
            sites={sites}
            selectedSite={siteA}
            onSelectSite={(newSite) => {
              if (newSite.id.startsWith('custom-')) {
                setScenarioA(prev => ({ ...prev, siteId: newSite.id, customSite: newSite }));
              } else {
                setScenarioA(prev => ({ ...prev, siteId: newSite.id, customSite: null }));
              }
            }}
            colorVariant="sky"
          />

          <DateControls
            launchDate={scenarioA.launchDate}
            onLaunchDateChange={(d) => setScenarioA(prev => ({ ...prev, launchDate: d }))}
            transitDays={scenarioA.transitDays}
            onTransitDaysChange={(td) => setScenarioA(prev => ({ ...prev, transitDays: td }))}
            missionDays={missionDays}
            onMissionDaysChange={setMissionDays}
            colorVariant="sky"
          />
        </div>

        {/* Scenario Bravo Card */}
        <div className="border-0 bg-slate-950/75 backdrop-blur-2xl rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] space-y-4">
          <div className="flex items-center justify-between pb-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fb923c]"></span>
              <span className="font-display font-bold text-xs uppercase tracking-wider text-amber-300">
                Scenario Bravo
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Touchdown: <strong className="text-amber-300">{landingB.toISOString().slice(0, 10)}</strong>
            </span>
          </div>

          {compareMode === 'sites' ? (
            <SitePicker
              sites={sites}
              selectedSite={siteB}
              onSelectSite={(newSite) => {
                if (newSite.id.startsWith('custom-')) {
                  setScenarioB(prev => ({ ...prev, siteId: newSite.id, customSite: newSite }));
                } else {
                  setScenarioB(prev => ({ ...prev, siteId: newSite.id, customSite: null }));
                }
              }}
              colorVariant="amber"
            />
          ) : (
            <div className="text-xs text-slate-400 font-mono py-2.5 px-3 bg-black/40 rounded-2xl">
              Anchor Site: <span className="text-amber-300 font-bold">{siteA.name}</span> (Locked for Slip Study)
            </div>
          )}

          <DateControls
            launchDate={scenarioB.launchDate}
            onLaunchDateChange={(d) => setScenarioB(prev => ({ ...prev, launchDate: d }))}
            transitDays={scenarioB.transitDays}
            onTransitDaysChange={(td) => setScenarioB(prev => ({ ...prev, transitDays: td }))}
            missionDays={missionDays}
            showSlipSlider={compareMode === 'dates'}
            slipDays={slipDays}
            onSlipDaysChange={(days) => {
              setSlipDays(days);
              const baseDate = new Date(scenarioA.launchDate);
              baseDate.setDate(baseDate.getDate() + days);
              setScenarioB(prev => ({ ...prev, launchDate: baseDate.toISOString() }));
            }}
            colorVariant="amber"
          />
        </div>
      </div>

      {/* 4. 3D SURFACE VIEWS (SIDE-BY-SIDE BORDERLESS CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="border-0 bg-slate-950/75 backdrop-blur-2xl rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="text-[11px] font-mono text-sky-400 font-bold mb-2 flex items-center justify-between">
            <span>{siteA.name}</span>
            <span className="text-slate-400 font-normal">Sun {liveA.sunEl > 0 ? `+${liveA.sunEl.toFixed(1)}°` : `${liveA.sunEl.toFixed(1)}°`}</span>
          </div>
          <div className="rounded-2xl overflow-hidden h-56">
            <ScenePanel
              siteId={siteA.id}
              terrainType={siteA.terrainType}
              sunEl={liveA.sunEl}
              sunAz={liveA.sunAz}
              earthEl={liveA.earthEl}
              earthAz={liveA.earthAz}
              viewMode={viewMode}
              quality={quality}
              label={siteA.name}
              landerHeight={objectHeightM}
            />
          </div>
        </div>

        <div className="border-0 bg-slate-950/75 backdrop-blur-2xl rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden">
          <div className="text-[11px] font-mono text-amber-400 font-bold mb-2 flex items-center justify-between">
            <span>{siteB.name}</span>
            <span className="text-slate-400 font-normal">Sun {liveB.sunEl > 0 ? `+${liveB.sunEl.toFixed(1)}°` : `${liveB.sunEl.toFixed(1)}°`}</span>
          </div>
          <div className="rounded-2xl overflow-hidden h-56">
            <ScenePanel
              siteId={siteB.id}
              terrainType={siteB.terrainType}
              sunEl={liveB.sunEl}
              sunAz={liveB.sunAz}
              earthEl={liveB.earthEl}
              earthAz={liveB.earthAz}
              viewMode={viewMode}
              quality={quality}
              label={siteB.name}
              landerHeight={objectHeightM}
            />
          </div>
        </div>
      </div>

      {/* 5. CORE MISSION COMPARISON CARDS (ASPECT BY ASPECT - BORDERLESS) */}
      <div className="space-y-5">
        {/* ASPECT 1: SOLAR ILLUMINATION & POWER */}
        <div className="border border-white/[0.08] bg-slate-950/70 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></span>
              <div>
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                  Aspect 1: Solar Illumination & Power Generation
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Assessing solar array viability and battery endurance required across the 14-day surface mission.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-amber-400/15 text-amber-300">
              {statsA.sunlitFraction >= statsB.sunlitFraction ? `Optimal: ${siteA.name}` : `Optimal: ${siteB.name}`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Alpha Solar Metrics */}
            <div className="bg-black/40 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sky-400 font-bold">
                <span>{siteA.name}</span>
                <span className="text-base text-amber-300">{sunPctA}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-sky-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, statsA.sunlitFraction * 100))}%` }}></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Sunlit Duration:</span>
                <strong className="text-white">{statsA.sunlitHours}h / {durationHours}h</strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Peak Thermal Blackout:</span>
                <strong className={statsA.longestDarkHours > 48 ? 'text-amber-400' : 'text-emerald-400'}>
                  {statsA.longestDarkHours} hours
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Next Sunset:</span>
                <span className="text-slate-400">{timeToSunsetA !== null ? `${timeToSunsetA}h` : 'No sunset'}</span>
              </div>
            </div>

            {/* Bravo Solar Metrics */}
            <div className="bg-black/40 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-amber-400 font-bold">
                <span>{siteB.name}</span>
                <span className="text-base text-amber-300">{sunPctB}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, statsB.sunlitFraction * 100))}%` }}></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Sunlit Duration:</span>
                <strong className="text-white">{statsB.sunlitHours}h / {durationHours}h</strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Peak Thermal Blackout:</span>
                <strong className={statsB.longestDarkHours > 48 ? 'text-amber-400' : 'text-emerald-400'}>
                  {statsB.longestDarkHours} hours
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Next Sunset:</span>
                <span className="text-slate-400">{timeToSunsetB !== null ? `${timeToSunsetB}h` : 'No sunset'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ASPECT 2: DIRECT-TO-EARTH COMMUNICATION */}
        <div className="border border-white/[0.08] bg-slate-950/70 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
              <div>
                <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                  Aspect 2: Direct-To-Earth Communication
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Direct Deep Space Network (DSN) visibility without requiring orbital relay satellites.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold px-3 py-1 rounded-full bg-cyan-400/15 text-cyan-300">
              {statsA.earthVisibleFraction >= statsB.earthVisibleFraction ? `Optimal: ${siteA.name}` : `Optimal: ${siteB.name}`}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
            {/* Alpha Comms Metrics */}
            <div className="bg-black/40 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sky-400 font-bold">
                <span>{siteA.name}</span>
                <span className="text-base text-cyan-300">{earthPctA}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-cyan-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, statsA.earthVisibleFraction * 100))}%` }}></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Earth Elevation:</span>
                <strong className={liveA.earthEl > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {liveA.earthEl > 0 ? `+${liveA.earthEl.toFixed(1)}°` : `${liveA.earthEl.toFixed(1)}°`}
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>RF Lock Status:</span>
                <strong className={liveA.earthEl > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {liveA.earthEl > 0 ? 'Direct DSN Locked' : 'Occulted by Rim'}
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Longest Comms Blackout:</span>
                <span className="text-slate-400">{statsA.longestEarthGapHours} hours</span>
              </div>
            </div>

            {/* Bravo Comms Metrics */}
            <div className="bg-black/40 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-amber-400 font-bold">
                <span>{siteB.name}</span>
                <span className="text-base text-cyan-300">{earthPctB}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div className="bg-amber-400 h-2 rounded-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, statsB.earthVisibleFraction * 100))}%` }}></div>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Earth Elevation:</span>
                <strong className={liveB.earthEl > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {liveB.earthEl > 0 ? `+${liveB.earthEl.toFixed(1)}°` : `${liveB.earthEl.toFixed(1)}°`}
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>RF Lock Status:</span>
                <strong className={liveB.earthEl > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {liveB.earthEl > 0 ? 'Direct DSN Locked' : 'Occulted by Rim'}
                </strong>
              </div>
              <div className="flex justify-between text-[11px] text-slate-300">
                <span>Longest Comms Blackout:</span>
                <span className="text-slate-400">{statsB.longestEarthGapHours} hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* ASPECT 3: FLIGHT VERDICT & MISSION RECOMMENDATION */}
        <div className="border border-white/[0.08] bg-slate-950/70 backdrop-blur-2xl rounded-3xl p-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></span>
            <div>
              <h3 className="font-display font-bold text-sm text-white uppercase tracking-wider">
                Aspect 3: Flight Viability Verdict & Recommendation
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Comparative synthesis for mission planners, engineers, and educators.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            {/* Alpha Verdict Card */}
            <div className="bg-black/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sky-400 font-bold">{siteA.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  verdictA.status === 'VIABLE' ? 'bg-emerald-500/20 text-emerald-300' :
                  verdictA.status === 'MARGINAL' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {verdictA.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                {verdictA.reason}
              </p>
            </div>

            {/* Bravo Verdict Card */}
            <div className="bg-black/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 font-bold">{siteB.name}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  verdictB.status === 'VIABLE' ? 'bg-emerald-500/20 text-emerald-300' :
                  verdictB.status === 'MARGINAL' ? 'bg-amber-500/20 text-amber-300' :
                  'bg-rose-500/20 text-rose-300'
                }`}>
                  {verdictB.badge}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                {verdictB.reason}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Compare;
