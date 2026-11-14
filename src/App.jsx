import React, { useState, useEffect } from 'react';
import { loadAllData } from './lib/dataLoader.js';
import { useTimeController, SPEED_OPTIONS } from './lib/useTimeController.js';
import { TopBar } from './components/ui/TopBar.jsx';
import { SampleDataBanner } from './components/ui/SampleDataBanner.jsx';
import { ErrorState } from './components/ui/ErrorState.jsx';
import { Footer } from './components/ui/Footer.jsx';
import { Compare } from './components/ui/Compare.jsx';
import { Calendar } from './components/ui/Calendar.jsx';
import { BatteryPanel } from './components/ui/BatteryPanel.jsx';
import { ExplorerCaptions } from './components/ui/ExplorerCaptions.jsx';
import { AssumptionsPanel } from './components/ui/AssumptionsPanel.jsx';

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // App-level configuration state
  const [activeTab, setActiveTab] = useState('compare');
  const [viewMode, setViewMode] = useState('orbit');
  const [quality, setQuality] = useState('auto');
  const [missionDays, setMissionDays] = useState(14);
  const [objectHeightM, setObjectHeightM] = useState(3.0);
  const [compareMode, setCompareMode] = useState('sites');
  const [slipDays, setSlipDays] = useState(0);
  const [showAssumptionsModal, setShowAssumptionsModal] = useState(false);

  // Persistent UI mode (Planner vs Explorer)
  const [uiMode, setUiMode] = useState(() => {
    try {
      return localStorage.getItem('lunar_ui_mode') || 'planner';
    } catch {
      return 'planner';
    }
  });

  const handleUiModeChange = (mode) => {
    setUiMode(mode);
    try {
      localStorage.setItem('lunar_ui_mode', mode);
    } catch {
      // Ignored if storage is restricted
    }
  };

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

  const currentDay = (timeCtrl.tRel / 24).toFixed(1);
  const currentHour = Math.floor(timeCtrl.tRel);

  // Staging handler from Calendar click
  const handleStageFromCalendar = (scenarioKey, site, launchDateStr) => {
    if (scenarioKey === 'A') {
      setScenarioA(prev => ({
        ...prev,
        siteId: site.id,
        customSite: site.id.startsWith('custom-') ? site : null,
        launchDate: launchDateStr
      }));
    } else {
      setScenarioB(prev => ({
        ...prev,
        siteId: site.id,
        customSite: site.id.startsWith('custom-') ? site : null,
        launchDate: launchDateStr
      }));
    }
    setActiveTab('compare');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500/30">
      <SampleDataBanner isFake={ephem?.fake} />

      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        uiMode={uiMode}
        onUiModeChange={handleUiModeChange}
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
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 flex flex-col space-y-4">
        {uiMode === 'explorer' && (
          <ExplorerCaptions
            siteName={siteA.name}
            objectHeightM={objectHeightM}
          />
        )}

        {activeTab === 'compare' && (
          <Compare
            sites={sites}
            ephem={ephem}
            scenarioA={scenarioA}
            setScenarioA={setScenarioA}
            scenarioB={scenarioB}
            setScenarioB={setScenarioB}
            compareMode={compareMode}
            setCompareMode={setCompareMode}
            tRel={timeCtrl.tRel}
            setTRel={timeCtrl.setTRel}
            viewMode={viewMode}
            setViewMode={setViewMode}
            quality={quality}
            setQuality={setQuality}
            missionDays={missionDays}
            setMissionDays={setMissionDays}
            objectHeightM={objectHeightM}
            slipDays={slipDays}
            setSlipDays={setSlipDays}
          />
        )}

        {activeTab === 'calendar' && (
          <Calendar
            sites={sites}
            ephem={ephem}
            missionDays={missionDays}
            onSelectOpportunity={handleStageFromCalendar}
          />
        )}

        {activeTab === 'battery' && (
          <BatteryPanel
            sites={sites}
            ephem={ephem}
            scenarioA={scenarioA}
            scenarioB={scenarioB}
            missionDays={missionDays}
          />
        )}
      </main>

      <Footer />

      <AssumptionsPanel
        isOpen={showAssumptionsModal}
        onClose={() => setShowAssumptionsModal(false)}
      />
    </div>
  );
}

export default App;
