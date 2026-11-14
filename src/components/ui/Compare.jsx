import React, { useMemo } from 'react';
import { sampleSeries, valuesAt, hoursSince } from '../../lib/geometry.js';
import { computeWindowStats, getVerdict, timeToNext, landingDate } from '../../lib/metrics.js';
import { ScenePanel } from './ScenePanel.jsx';
import { Timeline } from './Timeline.jsx';
import { MetricsPanel } from './MetricsPanel.jsx';
import { SitePicker } from './SitePicker.jsx';
import { DateControls } from './DateControls.jsx';

/**
 * src/components/ui/Compare.jsx
 * Side-by-side lunar landing trade study comparison view.
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
  objectHeightM,
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

  // Comparative auto summary
  const summarySentence = useMemo(() => {
    const sunDiff = (statsA.sunlitFraction - statsB.sunlitFraction) * 100;
    const darkDiff = statsB.longestDarkHours - statsA.longestDarkHours;

    if (Math.abs(sunDiff) < 1.0 && Math.abs(darkDiff) < 2.0) {
      return `Both landing profiles present nearly identical solar regimes (${(statsA.sunlitFraction * 100).toFixed(0)}% vs ${(statsB.sunlitFraction * 100).toFixed(0)}% illuminated).`;
    }
    if (statsA.sunlitFraction > statsB.sunlitFraction) {
      return `Scenario A yields ${(statsA.sunlitFraction * 100).toFixed(0)}% continuous solar coverage vs ${(statsB.sunlitFraction * 100).toFixed(0)}% for Scenario B. Scenario B suffers ${darkDiff > 0 ? `${darkDiff}h longer thermal blackout` : 'intermittent shadow intervals'}.`;
    } else {
      return `Scenario B commands ${(statsB.sunlitFraction * 100).toFixed(0)}% illumination vs ${(statsA.sunlitFraction * 100).toFixed(0)}% for Scenario A; Scenario A requires battery endurance for a ${statsA.longestDarkHours}h blackout period.`;
    }
  }, [statsA, statsB]);

  return (
    <div className="space-y-6">
      {/* Top Operations & Mode Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070b14]/80 p-3.5 rounded-2xl border border-white/10 shadow-lg text-xs backdrop-blur-md">
        {/* Left: Mode toggles */}
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider">Mission Architecture:</span>
          <div className="flex items-center bg-[#03060c] p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setCompareMode('sites')}
              className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer font-medium ${
                compareMode === 'sites' 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-xs' 
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              Dual Site Assessment
            </button>
            <button
              onClick={() => setCompareMode('dates')}
              className={`px-3.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer font-medium ${
                compareMode === 'dates' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-xs' 
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              Launch Window Slip (±30d)
            </button>
          </div>

          <button
            onClick={handleSwap}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors flex items-center gap-1.5 cursor-pointer text-xs"
            title="Swap Scenario A and B targets"
          >
            <span>⇄</span>
            <span>Invert A/B</span>
          </button>
        </div>

        {/* Right: Camera view & Quality */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#03060c] p-1 rounded-xl border border-white/10">
            <span className="text-[10px] text-slate-500 px-2 uppercase font-mono tracking-wider">3D View:</span>
            <button
              onClick={() => setViewMode('orbit')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                viewMode === 'orbit' 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 font-bold' 
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              Orbital Nadir
            </button>
            <button
              onClick={() => setViewMode('astronaut')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                viewMode === 'astronaut' 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold' 
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              Astronaut EVA
            </button>
          </div>
        </div>
      </div>

      {/* Auto Summary Narrative Banner */}
      <div className="bg-[#050914]/85 border border-sky-500/20 rounded-2xl px-5 py-3.5 text-xs text-slate-200 flex items-start sm:items-center gap-3 shadow-[0_4px_24px_rgba(0,0,0,0.6)] backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-sky-400 mt-1 sm:mt-0 shadow-[0_0_8px_#38bdf8] shrink-0"></span>
        <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 leading-relaxed">
          <span className="text-sky-400 font-mono text-[11px] uppercase tracking-wider font-bold">MISSION TRADE STUDY //</span>
          <span>{summarySentence}</span>
        </div>
      </div>

      {/* Comparison Grid (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Scenario A Column */}
        <div className="glass-panel-cyan rounded-3xl p-5 space-y-5 flex flex-col transition-all duration-300">
          <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_10px_#38bdf8] animate-pulse"></span>
              <span className="font-display font-bold text-sm text-sky-400 tracking-wider">SCENARIO ALPHA</span>
              <span className="text-xs font-mono text-slate-300 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                {siteA.name}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Touchdown: <strong className="text-sky-300">{landingA.toISOString().slice(0, 10)}</strong>
            </span>
          </div>

          {/* Controls Header */}
          <div className="space-y-3 bg-[#03060c]/80 p-4 rounded-2xl border border-sky-500/15">
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

          {/* 3D Scene Panel */}
          <ScenePanel
            siteId={siteA.id}
            terrainType={siteA.terrainType}
            sunEl={liveA.sunEl}
            sunAz={liveA.sunAz}
            earthEl={liveA.earthEl}
            earthAz={liveA.earthAz}
            viewMode={viewMode}
            quality={quality}
            label={`${siteA.name} [ALPHA]`}
            landerHeight={objectHeightM}
          />

          {/* Timeline Chart */}
          <Timeline
            series={seriesA}
            startUTC={landingA}
            tRel={tRel}
            onSeek={setTRel}
            colorVariant="sky"
            stats={statsA}
          />

          {/* Metrics & Verdict Panel */}
          <MetricsPanel
            liveAngles={liveA}
            stats={statsA}
            verdict={verdictA}
            objectHeightM={objectHeightM}
            timeToSunset={timeToSunsetA}
            timeToEarthset={timeToEarthsetA}
            compareStats={statsB}
            colorVariant="sky"
          />
        </div>

        {/* Scenario B Column */}
        <div className="glass-panel-amber rounded-3xl p-5 space-y-5 flex flex-col transition-all duration-300">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_10px_#fb923c] animate-pulse"></span>
              <span className="font-display font-bold text-sm text-amber-400 tracking-wider">SCENARIO BRAVO</span>
              <span className="text-xs font-mono text-slate-300 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                {siteB.name}
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Touchdown: <strong className="text-amber-300">{landingB.toISOString().slice(0, 10)}</strong>
            </span>
          </div>

          {/* Controls Header */}
          <div className="space-y-3 bg-[#0a0604]/80 p-4 rounded-2xl border border-amber-500/15">
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
              <div className="text-xs text-slate-400 font-mono py-2 px-3 bg-black/50 rounded-xl border border-amber-500/20">
                Anchor Site: <span className="text-amber-300 font-bold">{siteA.name}</span> (Locked for Slip Sensitivity Study)
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
              slipDeltaSummary={`Slip ${slipDays > 0 ? `+${slipDays}d` : `${slipDays}d`}: Landing ${landingB.toISOString().slice(0, 10)} | Verdict: ${verdictB.level.toUpperCase()}`}
              colorVariant="amber"
            />
          </div>

          {/* 3D Scene Panel */}
          <ScenePanel
            siteId={siteB.id}
            terrainType={siteB.terrainType}
            sunEl={liveB.sunEl}
            sunAz={liveB.sunAz}
            earthEl={liveB.earthEl}
            earthAz={liveB.earthAz}
            viewMode={viewMode}
            quality={quality}
            label={`${siteB.name} [BRAVO]`}
            landerHeight={objectHeightM}
          />

          {/* Timeline Chart */}
          <Timeline
            series={seriesB}
            startUTC={landingB}
            tRel={tRel}
            onSeek={setTRel}
            colorVariant="amber"
            stats={statsB}
          />

          {/* Metrics & Verdict Panel */}
          <MetricsPanel
            liveAngles={liveB}
            stats={statsB}
            verdict={verdictB}
            objectHeightM={objectHeightM}
            timeToSunset={timeToSunsetB}
            timeToEarthset={timeToEarthsetB}
            compareStats={statsA}
            colorVariant="amber"
          />
        </div>
      </div>
    </div>
  );
}

export default Compare;
