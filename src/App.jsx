import React, { useState, useEffect } from 'react';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController, SPEED_OPTIONS } from './lib/useTimeController.js';
import { landingDate } from './lib/metrics.js';
import { TopBar } from './components/ui/TopBar.jsx';
import { SampleDataBanner } from './components/ui/SampleDataBanner.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';
import { Footer } from './components/ui/Footer.jsx';

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // App-level configuration state
  const [activeTab, setActiveTab] = useState('compare');
  const [uiMode, setUiMode] = useState('planner');
  const [viewMode, setViewMode] = useState('orbit');
  const [quality, setQuality] = useState('auto');
  const [missionDays, setMissionDays] = useState(14);
  const [objectHeightM, setObjectHeightM] = useState(3.0);
  const [compareMode, setCompareMode] = useState('sites');

  // Scenario state
  const [scenarioA, setScenarioA] = useState({
    siteId: 'shackleton',
    customSite: null,
    launchDate: '2027-03-08T00:00:00Z',
    transitDays: 4
  });

  const [scenarioB, setScenarioB] = useState({
    siteId: 'malapert',
    customSite: null,
    launchDate: '2027-03-08T00:00:00Z',
    transitDays: 4
  });

  const maxHours = missionDays * 24;
  const timeCtrl = useTimeController({ maxHours, initialSpeed: 12 });

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 border-4 border-sky-500/20 border-t-sky-500 rounded-full animate-spin"></div>
        <p className="text-sm font-mono text-slate-400">Loading NASA/JPL Lunar Ephemeris & Presets…</p>
      </div>
    );
  }

  if (error || !data) {
    return <ErrorState error={error} onRetry={fetchData} />;
  }

  const { sites, ephem } = data;
  const siteA = scenarioA.customSite || sites.find(s => s.id === scenarioA.siteId) || sites[0];
  const siteB = scenarioB.customSite || sites.find(s => s.id === scenarioB.siteId) || sites[1] || sites[0];

  const landingA = landingDate(scenarioA.launchDate, scenarioA.transitDays);
  const landingB = landingDate(scenarioB.launchDate, scenarioB.transitDays);

  const currentDay = (timeCtrl.tRel / 24).toFixed(1);
  const currentHour = Math.floor(timeCtrl.tRel);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500/30">
      <SampleDataBanner isFake={ephem?.fake} />

      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        uiMode={uiMode}
        onUiModeChange={setUiMode}
        quality={quality}
        onQualityChange={setQuality}
        isFakeData={ephem?.fake}
      />

      {/* Global Mission Timeline Scrubber */}
      <section className="bg-slate-900/60 border-b border-slate-800/80 px-4 py-3 sticky top-14 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={timeCtrl.toggle}
              className={`px-4 py-1.5 rounded-lg font-semibold text-xs transition-colors flex items-center gap-2 cursor-pointer ${
                timeCtrl.playing
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                  : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sm'
              }`}
            >
              <span>{timeCtrl.playing ? '⏸ Pause' : '▶ Play'}</span>
            </button>

            <button
              onClick={() => timeCtrl.setTRel(0)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
              title="Reset to Landing (t = 0)"
            >
              ↺ Reset
            </button>

            <div className="flex items-center gap-1 bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs">
              <span className="text-[10px] text-slate-500 px-1 font-mono">Speed:</span>
              {SPEED_OPTIONS.map(spd => (
                <button
                  key={spd}
                  onClick={() => timeCtrl.setSpeed(spd)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                    timeCtrl.speed === spd
                      ? 'bg-sky-500 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {spd}h/s
                </button>
              ))}
            </div>
          </div>

          {/* Time Scrubber Slider */}
          <div className="flex-1 flex items-center gap-3 w-full">
            <input
              type="range"
              min={0}
              max={maxHours}
              step={0.1}
              value={timeCtrl.tRel}
              onChange={(e) => timeCtrl.setTRel(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          {/* Digital Telemetry Clock Readout */}
          <div className="flex items-center gap-3 font-mono text-xs text-right whitespace-nowrap">
            <div className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400 text-[10px] uppercase block">Mission Elapsed</span>
              <span className="text-sky-400 font-bold">
                T+{currentHour}h <span className="text-slate-400 text-[11px]">({currentDay}d)</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tab Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col">
        {activeTab === 'compare' && (
          <div className="flex-1 flex flex-col space-y-4">
            {/* Tab header badge */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
              <div>
                <h1 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Site Comparison Architecture</span>
                  <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {compareMode === 'sites' ? 'Dual Site Mode' : 'Launch Window Slip Mode'}
                  </span>
                </h1>
                <p className="text-xs text-slate-400">
                  Evaluate solar elevation, shadow lengths, direct Earth comms line-of-sight, and thermal survival margins side-by-side.
                </p>
              </div>

              {/* Mode switch */}
              <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs">
                <span className="text-slate-500 text-[11px] px-1">Compare:</span>
                <button
                  onClick={() => setCompareMode('sites')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    compareMode === 'sites' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Two Sites
                </button>
                <button
                  onClick={() => setCompareMode('dates')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    compareMode === 'dates' ? 'bg-sky-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Two Launch Dates
                </button>
              </div>
            </div>

            {/* Placeholder wireframe for Compare screen (completed in R-07 to R-11) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
              {/* Scenario A Card */}
              <div className="bg-slate-900/60 border border-sky-500/30 rounded-xl p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-400"></span>
                    <span className="font-bold text-sm text-sky-400 uppercase tracking-wider">Scenario A</span>
                    <span className="text-xs text-slate-300 font-medium">{siteA.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Landing: {landingA.toISOString().slice(0, 10)}
                  </span>
                </div>
                <div className="bg-slate-950/80 rounded-lg p-6 border border-slate-800 flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-xs space-y-2">
                  <span className="text-2xl">🔭</span>
                  <p className="font-semibold text-slate-200">Scenario A Telemetry & 3D Visualizer</p>
                  <p className="max-w-xs text-slate-500 text-[11px]">
                    Site selector, solar azimuth & elevation graphs, shadow ruler, and Pavan&apos;s WebGL 3D scene integrate here.
                  </p>
                </div>
              </div>

              {/* Scenario B Card */}
              <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-4 flex flex-col space-y-3">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                    <span className="font-bold text-sm text-amber-400 uppercase tracking-wider">Scenario B</span>
                    <span className="text-xs text-slate-300 font-medium">{siteB.name}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    Landing: {landingB.toISOString().slice(0, 10)}
                  </span>
                </div>
                <div className="bg-slate-950/80 rounded-lg p-6 border border-slate-800 flex-1 flex flex-col items-center justify-center text-center text-slate-400 text-xs space-y-2">
                  <span className="text-2xl">⚖️</span>
                  <p className="font-semibold text-slate-200">Scenario B Comparative Telemetry & 3D Visualizer</p>
                  <p className="max-w-xs text-slate-500 text-[11px]">
                    Synchronized to the shared T+{currentHour}h clock for direct trade studies.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3">
            <span className="text-3xl">🗓️</span>
            <h2 className="text-lg font-bold text-white">Mission Window Calendar Heatmap</h2>
            <p className="text-xs text-slate-400 max-w-md">
              Full-year 2027-2028 landing opportunity matrix. Identifies continuous solar illumination windows and optimal launch dates.
            </p>
            <span className="text-[11px] font-mono px-2 py-1 bg-slate-800 rounded text-slate-400">
              Integrating in Task R-12
            </span>
          </div>
        )}

        {activeTab === 'battery' && (
          <div className="flex-1 bg-slate-900/40 border border-slate-800 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3">
            <span className="text-3xl">🔋</span>
            <h2 className="text-lg font-bold text-white">Battery & Solar Array Simulation</h2>
            <p className="text-xs text-slate-400 max-w-md">
              Evaluate horizontal vs vertical solar mast performance under polar horizon grazing angles, survival heater loads, and charge depletion.
            </p>
            <span className="text-[11px] font-mono px-2 py-1 bg-slate-800 rounded text-slate-400">
              Integrating in Task R-13
            </span>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;
