import React, { useMemo, useState } from 'react';
import { sampleSeries, valuesAt, hoursSince } from '../../lib/geometry.js';
import { computeWindowStats, getVerdict, timeToNext, landingDate } from '../../lib/metrics.js';
import { playTelemetryPing } from '../../lib/audio.js';

/**
 * Scene 4: The Trade Study Holodeck (Comparison Mode)
 * Sleek holographic comparison interface for evaluating Scenario Alpha vs Scenario Bravo
 * with independent temporal scrubbers, side-by-side telemetry, and dynamic central verdict.
 */
export function TradeStudyHolodeck({
  sites,
  ephem,
  scenarioA,
  setScenarioA,
  scenarioB,
  setScenarioB,
  missionDays = 14,
  onClose,
  onSelectSiteInUniverse
}) {
  const [tRelA, setTRelA] = useState(0);
  const [tRelB, setTRelB] = useState(0);
  const [linkedScrub, setLinkedScrub] = useState(true);

  const siteA = scenarioA.customSite || sites.find(s => s.id === scenarioA.siteId) || sites[0];
  const siteB = scenarioB.customSite || sites.find(s => s.id === scenarioB.siteId) || sites[1] || sites[0];

  const landingA = landingDate(scenarioA.launchDate, scenarioA.transitDays);
  const landingB = landingDate(scenarioB.launchDate, scenarioB.transitDays);

  const durationHours = missionDays * 24;

  const startHoursA = useMemo(() => {
    return Math.max(0, hoursSince(ephem.startUTC, landingA));
  }, [ephem.startUTC, landingA]);

  const startHoursB = useMemo(() => {
    return Math.max(0, hoursSince(ephem.startUTC, landingB));
  }, [ephem.startUTC, landingB]);

  const seriesA = useMemo(() => {
    return sampleSeries(siteA, startHoursA, durationHours, ephem, 1);
  }, [siteA, startHoursA, durationHours, ephem]);

  const seriesB = useMemo(() => {
    return sampleSeries(siteB, startHoursB, durationHours, ephem, 1);
  }, [siteB, startHoursB, durationHours, ephem]);

  const liveA = useMemo(() => valuesAt(seriesA, tRelA), [seriesA, tRelA]);
  const liveB = useMemo(() => valuesAt(seriesB, tRelB), [seriesB, tRelB]);

  const statsA = useMemo(() => computeWindowStats(seriesA), [seriesA]);
  const statsB = useMemo(() => computeWindowStats(seriesB), [seriesB]);

  const verdictA = useMemo(() => getVerdict(statsA), [statsA]);
  const verdictB = useMemo(() => getVerdict(statsB), [statsB]);

  // Dynamic Holodeck Synthesis & Winner Determination
  const tradeAnalysis = useMemo(() => {
    const sunDiff = (statsA.sunlitFraction - statsB.sunlitFraction) * 100;
    const commsDiff = (statsA.earthVisibleFraction - statsB.earthVisibleFraction) * 100;
    const darkDiffHours = statsB.longestDarkHours - statsA.longestDarkHours;

    let winner = 'EQUAL';
    let summary = '';
    let recommendation = '';

    // Power generation is primary lunar survival criterion, followed by DSN comms
    const scoreA = statsA.sunlitFraction * 0.6 + statsA.earthVisibleFraction * 0.4;
    const scoreB = statsB.sunlitFraction * 0.6 + statsB.earthVisibleFraction * 0.4;

    if (scoreA > scoreB + 0.04) {
      winner = 'ALPHA';
      summary = `Scenario Alpha (${siteA.name}) outperforms Scenario Bravo with ${(statsA.sunlitFraction * 100).toFixed(0)}% solar illumination (${Math.abs(sunDiff).toFixed(1)}% higher power capture) and ${darkDiffHours > 0 ? `${darkDiffHours}h shorter blackout` : 'optimal battery survival'}.`;
      recommendation = `RECOMMENDATION: Commit mission profile to ${siteA.name}. Reduces surface battery reserve requirements and provides superior direct line-of-sight communications.`;
    } else if (scoreB > scoreA + 0.04) {
      winner = 'BRAVO';
      summary = `Scenario Bravo (${siteB.name}) outperforms Scenario Alpha with ${(statsB.sunlitFraction * 100).toFixed(0)}% solar illumination (${Math.abs(sunDiff).toFixed(1)}% higher power capture) and superior direct Deep Space Network contact.`;
      recommendation = `RECOMMENDATION: Commit mission profile to ${siteB.name}. Maximize continuous photovoltaic generation and scientific return.`;
    } else {
      winner = 'BALANCED';
      summary = `Both scenarios demonstrate comparable operational margins (~${(statsA.sunlitFraction * 100).toFixed(0)}% solar, ~${(statsA.earthVisibleFraction * 100).toFixed(0)}% comms).`;
      recommendation = `RECOMMENDATION: Either landing corridor is flight-certified. Select based on terrain slope and scientific sample return targets.`;
    }

    return { winner, summary, recommendation, sunDiff, commsDiff, darkDiffHours };
  }, [statsA, statsB, siteA.name, siteB.name]);

  const handleScrubA = (val) => {
    const h = parseFloat(val);
    setTRelA(h);
    if (linkedScrub) setTRelB(h);
  };

  const handleScrubB = (val) => {
    const h = parseFloat(val);
    setTRelB(h);
    if (linkedScrub) setTRelA(h);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#050814]/85 backdrop-blur-2xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300 flex flex-col font-sans select-none">
      {/* 1. HOLODECK TOP HEADER */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0B3D91] border border-cyan-400/40 flex items-center justify-center text-white font-mono font-bold text-xs shadow-[0_0_15px_rgba(11,61,145,0.6)]">
            HOLO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-cyan-400">
                SCENE 4 // MISSION CONTROL
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
            </div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-white tracking-wide">
              The Trade Study Holodeck: Dual Scenario Analysis
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Linked Scrubber Toggle */}
          <button
            onClick={() => {
              playTelemetryPing(1800, 0.08);
              setLinkedScrub(!linkedScrub);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono transition cursor-pointer border ${
              linkedScrub
                ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                : 'bg-black/40 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {linkedScrub ? 'Sync Scrubbers: ON' : 'Sync Scrubbers: OFF'}
          </button>

          <button
            onClick={() => {
              playTelemetryPing(1400, 0.08);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono transition cursor-pointer border border-slate-700 flex items-center gap-1.5"
          >
            <span>&times;</span>
            <span>Exit Holodeck</span>
          </button>
        </div>
      </div>

      {/* 2. CENTRAL DYNAMIC VERDICT & WINNER BANNER */}
      <div className="max-w-7xl mx-auto w-full mb-5">
        <div className="bg-[#070e1c]/90 border border-slate-800/80 rounded-2xl p-5 shadow-[0_15px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                tradeAnalysis.winner === 'ALPHA'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : tradeAnalysis.winner === 'BRAVO'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
              }`}>
                {tradeAnalysis.winner === 'ALPHA' ? 'Winner: Scenario Alpha' : tradeAnalysis.winner === 'BRAVO' ? 'Winner: Scenario Bravo' : 'Dual Viable Corridors'}
              </div>
              <span className="text-xs text-slate-400 font-mono">Flight Dynamics Real-Time Trade Study</span>
            </div>

            {/* Quick Summary comparison metrics */}
            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-sky-400 font-bold">Alpha: {(statsA.sunlitFraction * 100).toFixed(0)}% Sun</span>
                <span className="text-slate-600">vs</span>
                <span className="text-amber-400 font-bold">Bravo: {(statsB.sunlitFraction * 100).toFixed(0)}% Sun</span>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs sm:text-sm text-slate-200 font-sans leading-relaxed">
            {tradeAnalysis.summary}
          </div>
          <div className="mt-2 text-xs font-mono text-cyan-300 bg-cyan-950/30 border border-cyan-800/40 rounded-xl p-2.5">
            {tradeAnalysis.recommendation}
          </div>
        </div>
      </div>

      {/* 3. SPLIT-SCREEN VIEWPORTS: SCENARIO ALPHA (LEFT) & SCENARIO BRAVO (RIGHT) */}
      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
        {/* === SCENARIO ALPHA (NASA VECTOR BLUE / CYAN) === */}
        <div className="bg-[#070e1c]/90 border border-sky-500/30 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-sky-500/20">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff]"></span>
                <h3 className="font-display font-bold text-sm text-cyan-300 uppercase tracking-wider">
                  Scenario Alpha (Reference)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Touchdown: <strong className="text-white">{landingA.toISOString().slice(0, 10)}</strong>
              </span>
            </div>

            {/* Site Picker Dropdown */}
            <div className="mt-3 space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                Landing Site:
              </label>
              <select
                value={scenarioA.siteId}
                onChange={(e) => {
                  playTelemetryPing(1600, 0.08);
                  setScenarioA(prev => ({ ...prev, siteId: e.target.value, customSite: null }));
                  if (onSelectSiteInUniverse) onSelectSiteInUniverse(e.target.value);
                }}
                className="w-full bg-black/60 border border-sky-500/30 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`} S)
                  </option>
                ))}
              </select>
            </div>

            {/* Date and Transit Controls */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                  Launch Date:
                </label>
                <input
                  type="date"
                  value={scenarioA.launchDate.slice(0, 10)}
                  onChange={(e) => setScenarioA(prev => ({ ...prev, launchDate: `${e.target.value}T00:00:00Z` }))}
                  className="w-full bg-black/60 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    Transit:
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-300">{scenarioA.transitDays}d</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={scenarioA.transitDays}
                  onChange={(e) => setScenarioA(prev => ({ ...prev, transitDays: parseInt(e.target.value, 10) }))}
                  className="w-full h-1.5 bg-slate-900 rounded appearance-none cursor-pointer accent-cyan-400 mt-2"
                />
              </div>
            </div>

            {/* Telemetry Dials & Readings */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-black/50 border border-slate-800/80 rounded-2xl p-3">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Sun Elevation</span>
                <span className="text-lg font-mono font-bold text-cyan-300 block mt-1">
                  {liveA.sunEl > 0 ? `+${liveA.sunEl.toFixed(1)}°` : `${liveA.sunEl.toFixed(1)}°`}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {liveA.sunEl > 0 ? 'Solar Arrays Generating' : 'Eclipse / Battery Depletion'}
                </span>
              </div>

              <div className="bg-black/50 border border-slate-800/80 rounded-2xl p-3">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Earth Elevation</span>
                <span className={`text-lg font-mono font-bold block mt-1 ${liveA.earthEl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {liveA.earthEl > 0 ? `+${liveA.earthEl.toFixed(1)}°` : `${liveA.earthEl.toFixed(1)}°`}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {liveA.earthEl > 0 ? 'Direct DSN Lock' : 'Occulted by Rim'}
                </span>
              </div>
            </div>

            {/* 14-Day Cumulative Performance */}
            <div className="bg-black/40 border border-slate-800/80 rounded-2xl p-4 mt-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Solar Coverage:</span>
                <strong className="text-cyan-300">{(statsA.sunlitFraction * 100).toFixed(1)}% ({statsA.sunlitHours}h)</strong>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${statsA.sunlitFraction * 100}%` }}></div>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Longest Blackout:</span>
                <strong className={statsA.longestDarkHours > 48 ? 'text-amber-400' : 'text-emerald-400'}>
                  {statsA.longestDarkHours} hours
                </strong>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Direct Earth Contact:</span>
                <strong className="text-white">{(statsA.earthVisibleFraction * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* Scenario Alpha Independent Scrubber */}
          <div className="bg-black/60 border border-sky-500/20 rounded-2xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-wider">Alpha Mission Time:</span>
              <span className="text-cyan-300 font-bold">MET D+{Math.floor(tRelA / 24)} {Math.floor(tRelA % 24)}h</span>
            </div>
            <input
              type="range"
              min={0}
              max={durationHours}
              step={1}
              value={tRelA}
              onChange={(e) => handleScrubA(e.target.value)}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        {/* === SCENARIO BRAVO (CAUTION AMBER / ORANGE) === */}
        <div className="bg-[#070e1c]/90 border border-amber-500/30 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl flex flex-col justify-between space-y-4">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/20">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_#f59e0b]"></span>
                <h3 className="font-display font-bold text-sm text-amber-300 uppercase tracking-wider">
                  Scenario Bravo (Trade Study)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Touchdown: <strong className="text-white">{landingB.toISOString().slice(0, 10)}</strong>
              </span>
            </div>

            {/* Site Picker Dropdown */}
            <div className="mt-3 space-y-1">
              <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block">
                Landing Site:
              </label>
              <select
                value={scenarioB.siteId}
                onChange={(e) => {
                  playTelemetryPing(1600, 0.08);
                  setScenarioB(prev => ({ ...prev, siteId: e.target.value, customSite: null }));
                  if (onSelectSiteInUniverse) onSelectSiteInUniverse(e.target.value);
                }}
                className="w-full bg-black/60 border border-amber-500/30 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              >
                {sites.map(s => (
                  <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                    {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`} S)
                  </option>
                ))}
              </select>
            </div>

            {/* Date and Transit Controls */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest block mb-1">
                  Launch Date:
                </label>
                <input
                  type="date"
                  value={scenarioB.launchDate.slice(0, 10)}
                  onChange={(e) => setScenarioB(prev => ({ ...prev, launchDate: `${e.target.value}T00:00:00Z` }))}
                  className="w-full bg-black/60 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                    Transit:
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-300">{scenarioB.transitDays}d</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={scenarioB.transitDays}
                  onChange={(e) => setScenarioB(prev => ({ ...prev, transitDays: parseInt(e.target.value, 10) }))}
                  className="w-full h-1.5 bg-slate-900 rounded appearance-none cursor-pointer accent-amber-400 mt-2"
                />
              </div>
            </div>

            {/* Telemetry Dials & Readings */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-black/50 border border-slate-800/80 rounded-2xl p-3">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Sun Elevation</span>
                <span className="text-lg font-mono font-bold text-amber-300 block mt-1">
                  {liveB.sunEl > 0 ? `+${liveB.sunEl.toFixed(1)}°` : `${liveB.sunEl.toFixed(1)}°`}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {liveB.sunEl > 0 ? 'Solar Arrays Generating' : 'Eclipse / Battery Depletion'}
                </span>
              </div>

              <div className="bg-black/50 border border-slate-800/80 rounded-2xl p-3">
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider block">Earth Elevation</span>
                <span className={`text-lg font-mono font-bold block mt-1 ${liveB.earthEl > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {liveB.earthEl > 0 ? `+${liveB.earthEl.toFixed(1)}°` : `${liveB.earthEl.toFixed(1)}°`}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {liveB.earthEl > 0 ? 'Direct DSN Lock' : 'Occulted by Rim'}
                </span>
              </div>
            </div>

            {/* 14-Day Cumulative Performance */}
            <div className="bg-black/40 border border-slate-800/80 rounded-2xl p-4 mt-3 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Solar Coverage:</span>
                <strong className="text-amber-300">{(statsB.sunlitFraction * 100).toFixed(1)}% ({statsB.sunlitHours}h)</strong>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-amber-400 h-1.5 rounded-full" style={{ width: `${statsB.sunlitFraction * 100}%` }}></div>
              </div>

              <div className="flex justify-between pt-1">
                <span className="text-slate-400">Longest Blackout:</span>
                <strong className={statsB.longestDarkHours > 48 ? 'text-amber-400' : 'text-emerald-400'}>
                  {statsB.longestDarkHours} hours
                </strong>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400">Direct Earth Contact:</span>
                <strong className="text-white">{(statsB.earthVisibleFraction * 100).toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* Scenario Bravo Independent Scrubber */}
          <div className="bg-black/60 border border-amber-500/20 rounded-2xl p-3 space-y-2">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-slate-400 uppercase tracking-wider">Bravo Mission Time:</span>
              <span className="text-amber-300 font-bold">MET D+{Math.floor(tRelB / 24)} {Math.floor(tRelB % 24)}h</span>
            </div>
            <input
              type="range"
              min={0}
              max={durationHours}
              step={1}
              value={tRelB}
              onChange={(e) => handleScrubB(e.target.value)}
              className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradeStudyHolodeck;
