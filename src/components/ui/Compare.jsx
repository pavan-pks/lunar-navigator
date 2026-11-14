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
      return `Both scenarios show comparable solar profiles (${(statsA.sunlitFraction * 100).toFixed(0)}% vs ${(statsB.sunlitFraction * 100).toFixed(0)}% sunlight).`;
    }
    if (statsA.sunlitFraction > statsB.sunlitFraction) {
      return `Scenario A receives ${(statsA.sunlitFraction * 100).toFixed(0)}% sunlight vs Scenario B's ${(statsB.sunlitFraction * 100).toFixed(0)}%; Scenario B experiences ${darkDiff > 0 ? `${darkDiff}h more darkness` : 'shorter windows'}.`;
    } else {
      return `Scenario B receives ${(statsB.sunlitFraction * 100).toFixed(0)}% sunlight vs Scenario A's ${(statsA.sunlitFraction * 100).toFixed(0)}%; Scenario A experiences ${statsA.longestDarkHours}h of continuous darkness.`;
    }
  }, [statsA, statsB]);

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800 text-xs">
        {/* Left: Mode toggles */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">Comparison Study:</span>
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setCompareMode('sites')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                compareMode === 'sites' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Two Sites
            </button>
            <button
              onClick={() => setCompareMode('dates')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                compareMode === 'dates' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Launch Slip
            </button>
          </div>

          <button
            onClick={handleSwap}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            title="Swap Scenario A and B"
          >
            ⇄ Swap A/B
          </button>
        </div>

        {/* Right: Camera view & Quality */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-500 px-1.5 uppercase font-mono">View:</span>
            <button
              onClick={() => setViewMode('orbit')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'orbit' ? 'bg-slate-800 text-sky-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Orbit
            </button>
            <button
              onClick={() => setViewMode('astronaut')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                viewMode === 'astronaut' ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Astronaut
            </button>
          </div>
        </div>
      </div>

      {/* Auto Summary Narrative Banner */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-300 flex items-center gap-2">
        <span className="text-sky-400 font-bold">Analysis:</span>
        <span>{summarySentence}</span>
      </div>

      {/* Comparison Grid (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Scenario A Column */}
        <div className="bg-slate-900/50 border border-sky-500/30 rounded-xl p-4 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span>
              <span className="font-bold text-sm text-sky-400 tracking-wider">SCENARIO A</span>
              <span className="text-xs font-mono text-slate-300">({siteA.name})</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Landing: {landingA.toISOString().slice(0, 10)}
            </span>
          </div>

          {/* Controls Header */}
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
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
            label={`${siteA.name} (Scenario A)`}
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
        <div className="bg-slate-900/50 border border-amber-500/30 rounded-xl p-4 space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_#fb923c]"></span>
              <span className="font-bold text-sm text-amber-400 tracking-wider">SCENARIO B</span>
              <span className="text-xs font-mono text-slate-300">({siteB.name})</span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Landing: {landingB.toISOString().slice(0, 10)}
            </span>
          </div>

          {/* Controls Header */}
          <div className="space-y-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80">
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
              <div className="text-xs text-slate-400 font-mono py-1 px-2 bg-slate-950 rounded border border-slate-800">
                Site: <span className="text-slate-200 font-bold">{siteA.name}</span> (Locked to Scenario A)
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
            label={`${siteB.name} (Scenario B)`}
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
