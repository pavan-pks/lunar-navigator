import React, { useMemo, useState } from 'react';
import { sampleSeries, valuesAt, hoursSince } from '../../lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate } from '../../lib/metrics.js';

/**
 * Minimalist Trade Study Comparison:
 * Clean Apple-inspired astronomical data comparison with generous spacing,
 * whisper-thin borders, and refined typography.
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

  const tradeAnalysis = useMemo(() => {
    const sunDiff = (statsA.sunlitFraction - statsB.sunlitFraction) * 100;
    const scoreA = statsA.sunlitFraction * 0.6 + statsA.earthVisibleFraction * 0.4;
    const scoreB = statsB.sunlitFraction * 0.6 + statsB.earthVisibleFraction * 0.4;

    let winner = 'BALANCED';
    let summary = '';
    let recommendation = '';

    if (scoreA > scoreB + 0.04) {
      winner = 'ALPHA';
      summary = `Scenario Alpha (${siteA.name}) delivers ${(statsA.sunlitFraction * 100).toFixed(0)}% solar illumination (${Math.abs(sunDiff).toFixed(1)}% higher power yield) with reduced battery reserve requirements.`;
      recommendation = `Optimal flight profile commits to ${siteA.name} for superior solar endurance and direct Deep Space Network margins.`;
    } else if (scoreB > scoreA + 0.04) {
      winner = 'BRAVO';
      summary = `Scenario Bravo (${siteB.name}) delivers ${(statsB.sunlitFraction * 100).toFixed(0)}% solar illumination (${Math.abs(sunDiff).toFixed(1)}% higher power yield) with extended communications coverage.`;
      recommendation = `Optimal flight profile commits to ${siteB.name} for maximum continuous power capture.`;
    } else {
      winner = 'BALANCED';
      summary = `Both scenarios demonstrate matching operational clearances (~${(statsA.sunlitFraction * 100).toFixed(0)}% solar coverage, ~${(statsA.earthVisibleFraction * 100).toFixed(0)}% direct line-of-sight).`;
      recommendation = `Both sites meet Artemis certification criteria. Select based on terrain slope and scientific objectives.`;
    }

    return { winner, summary, recommendation };
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
    <div className="fixed inset-0 z-40 bg-[#050505]/95 p-8 sm:p-12 lg:p-14 overflow-y-auto animate-in fade-in duration-300 flex flex-col font-sans select-none">
      {/* Header */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between border-b border-white/10 pb-6 mb-8">
        <div>
          <span className="text-[10px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block">
            Comparative Analysis
          </span>
          <h2 className="text-xl sm:text-2xl font-sans font-light text-[#f5f5f5] tracking-tight mt-1">
            Trade Study · Dual Scenario Evaluation
          </h2>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={() => setLinkedScrub(!linkedScrub)}
            className="text-xs font-sans tracking-wider text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-pointer"
          >
            {linkedScrub ? 'Linked Scrub · On' : 'Linked Scrub · Off'}
          </button>

          <button
            onClick={onClose}
            className="text-xs font-sans tracking-widest text-[#f5f5f5] border border-white/20 hover:border-white px-4 py-2 rounded-full transition cursor-pointer"
          >
            Close ↗
          </button>
        </div>
      </div>

      {/* Synthesis Verdict */}
      <div className="max-w-6xl mx-auto w-full mb-8">
        <div className="border border-white/10 rounded-2xl p-6 sm:p-8 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-sans font-light tracking-[0.2em] text-[#a3a3a3] uppercase">
              Operational Verdict
            </span>
            <span className="text-xs font-sans tracking-wider text-[#f5f5f5]">
              {tradeAnalysis.winner === 'ALPHA' ? `Preference: ${siteA.name}` : tradeAnalysis.winner === 'BRAVO' ? `Preference: ${siteB.name}` : 'Both Scenarios Viable'}
            </span>
          </div>
          <p className="text-sm font-sans font-light text-[#f5f5f5] leading-relaxed">
            {tradeAnalysis.summary}
          </p>
          <p className="text-xs font-sans font-light text-[#a3a3a3] leading-relaxed">
            {tradeAnalysis.recommendation}
          </p>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="max-w-6xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
        {/* Scenario Alpha */}
        <div className="border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <span className="text-[10px] font-sans font-light tracking-[0.2em] text-[#a3a3a3] uppercase">
                Scenario Alpha
              </span>
              <span className="text-xs font-mono text-[#a3a3a3]">
                {landingA.toISOString().slice(0, 10)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-sans font-light tracking-[0.2em] text-[#a3a3a3] uppercase block mb-1">
                  Site
                </label>
                <select
                  value={scenarioA.siteId}
                  onChange={(e) => {
                    setScenarioA(prev => ({ ...prev, siteId: e.target.value, customSite: null }));
                    if (onSelectSiteInUniverse) onSelectSiteInUniverse(e.target.value);
                  }}
                  className="w-full bg-transparent border-b border-white/10 pb-1 text-sm font-sans font-light text-[#f5f5f5] focus:outline-none"
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#050505] text-[#f5f5f5]">{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[10px] font-sans font-light tracking-[0.15em] text-[#a3a3a3] uppercase block">
                    Sun Elevation
                  </span>
                  <span className="text-xl font-mono font-light text-[#f5f5f5] mt-1 block">
                    {liveA.sunEl > 0 ? `+${liveA.sunEl.toFixed(1)}°` : `${liveA.sunEl.toFixed(1)}°`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-sans font-light tracking-[0.15em] text-[#a3a3a3] uppercase block">
                    Earth Elevation
                  </span>
                  <span className="text-xl font-mono font-light text-[#f5f5f5] mt-1 block">
                    {liveA.earthEl > 0 ? `+${liveA.earthEl.toFixed(1)}°` : `${liveA.earthEl.toFixed(1)}°`}
                  </span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-2 text-xs font-sans font-light">
                <div className="flex justify-between">
                  <span className="text-[#a3a3a3]">Solar Coverage:</span>
                  <span className="font-mono text-[#f5f5f5]">{(statsA.sunlitFraction * 100).toFixed(0)}% ({statsA.sunlitHours}h)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a3a3a3]">Peak Blackout:</span>
                  <span className="font-mono text-[#f5f5f5]">{statsA.longestDarkHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a3a3a3]">Earth Contact:</span>
                  <span className="font-mono text-[#f5f5f5]">{(statsA.earthVisibleFraction * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono text-[#a3a3a3] mb-2">
              <span>Timeline Scrub</span>
              <span>D+{Math.floor(tRelA / 24)} {Math.floor(tRelA % 24)}h</span>
            </div>
            <input
              type="range"
              min={0}
              max={durationHours}
              step={1}
              value={tRelA}
              onChange={(e) => handleScrubA(e.target.value)}
              className="w-full h-[1px] bg-white/20 rounded appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>

        {/* Scenario Bravo */}
        <div className="border border-white/10 rounded-2xl p-6 sm:p-8 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <span className="text-[10px] font-sans font-light tracking-[0.2em] text-[#a3a3a3] uppercase">
                Scenario Bravo
              </span>
              <span className="text-xs font-mono text-[#a3a3a3]">
                {landingB.toISOString().slice(0, 10)}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-sans font-light tracking-[0.2em] text-[#a3a3a3] uppercase block mb-1">
                  Site
                </label>
                <select
                  value={scenarioB.siteId}
                  onChange={(e) => {
                    setScenarioB(prev => ({ ...prev, siteId: e.target.value, customSite: null }));
                    if (onSelectSiteInUniverse) onSelectSiteInUniverse(e.target.value);
                  }}
                  className="w-full bg-transparent border-b border-white/10 pb-1 text-sm font-sans font-light text-[#f5f5f5] focus:outline-none"
                >
                  {sites.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#050505] text-[#f5f5f5]">{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <span className="text-[10px] font-sans font-light tracking-[0.15em] text-[#a3a3a3] uppercase block">
                    Sun Elevation
                  </span>
                  <span className="text-xl font-mono font-light text-[#f5f5f5] mt-1 block">
                    {liveB.sunEl > 0 ? `+${liveB.sunEl.toFixed(1)}°` : `${liveB.sunEl.toFixed(1)}°`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-sans font-light tracking-[0.15em] text-[#a3a3a3] uppercase block">
                    Earth Elevation
                  </span>
                  <span className="text-xl font-mono font-light text-[#f5f5f5] mt-1 block">
                    {liveB.earthEl > 0 ? `+${liveB.earthEl.toFixed(1)}°` : `${liveB.earthEl.toFixed(1)}°`}
                  </span>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-2 text-xs font-sans font-light">
                <div className="flex justify-between">
                  <span className="text-[#a3a3a3]">Solar Coverage:</span>
                  <span className="font-mono text-[#f5f5f5]">{(statsB.sunlitFraction * 100).toFixed(0)}% ({statsB.sunlitHours}h)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a3a3a3]">Peak Blackout:</span>
                  <span className="font-mono text-[#f5f5f5]">{statsB.longestDarkHours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a3a3a3]">Earth Contact:</span>
                  <span className="font-mono text-[#f5f5f5]">{(statsB.earthVisibleFraction * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[10px] font-mono text-[#a3a3a3] mb-2">
              <span>Timeline Scrub</span>
              <span>D+{Math.floor(tRelB / 24)} {Math.floor(tRelB % 24)}h</span>
            </div>
            <input
              type="range"
              min={0}
              max={durationHours}
              step={1}
              value={tRelB}
              onChange={(e) => handleScrubB(e.target.value)}
              className="w-full h-[1px] bg-white/20 rounded appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TradeStudyHolodeck;
