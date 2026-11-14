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
import { StoryMode } from './components/story/StoryMode.jsx';

export function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Top-level experience mode: 'story' (cinematic space walk & zoom) or 'control' (mission control trade studies)
  const [missionMode, setMissionMode] = useState('story');

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
      <div className="min-h-screen bg-[#020408] text-slate-200 flex flex-col items-center justify-center p-6 space-y-6 relative overflow-hidden font-sans">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.1),transparent_70%)] pointer-events-none"></div>
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-2 border-sky-500/20 border-t-sky-400 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-sky-400 animate-pulse">☾</div>
        </div>
        <div className="text-center space-y-2 relative z-10">
          <p className="text-sm font-display font-semibold tracking-wider uppercase text-slate-200">
            Initializing NASA Horizons Lunar Ephemeris
          </p>
          <p className="text-xs font-mono text-slate-500">
            JPL Horizons Vector Target #301 (Moon) • NASA Artemis Landing Zones
          </p>
        </div>
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

  // STORY MODE SCREEN
  if (missionMode === 'story') {
    return (
      <StoryMode
        sites={sites}
        ephem={ephem}
        onSwitchToPlanner={() => setMissionMode('control')}
      />
    );
  }

  // MISSION CONTROL SCREEN
  return (
    <div className="min-h-screen bg-[#030508] text-slate-100 flex flex-col selection:bg-sky-500/40 selection:text-white font-sans">
      <SampleDataBanner isFake={ephem?.fake} />

      <TopBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        uiMode={uiMode}
        onUiModeChange={handleUiModeChange}
        quality={quality}
        onQualityChange={setQuality}
        isFakeData={ephem?.fake}
        onOpenStoryMode={() => setMissionMode('story')}
      />

      {/* Mission Simulation Master Scrubber */}
      <section className="bg-[#050811]/90 border-b border-sky-500/15 px-4 py-3 sticky top-15 z-30 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Playback Controls */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={timeCtrl.toggle}
              className={`px-4 py-1.5 rounded-xl font-medium text-xs transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-sm ${
                timeCtrl.playing
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                  : 'bg-gradient-to-r from-sky-600 to-sky-500 hover:from-sky-500 hover:to-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.35)]'
              }`}
            >
              <span>{timeCtrl.playing ? '⏸ PAUSE' : '▶ SIMULATE'}</span>
            </button>

            <button
              onClick={() => timeCtrl.setTRel(0)}
              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs border border-white/10 transition-colors cursor-pointer"
              title="Reset to Lunar Touchdown (t = 0)"
            >
              ↺ Reset
            </button>

            <div className="flex items-center gap-1 bg-[#03060c] rounded-xl p-1 border border-white/10 text-xs">
              <span className="text-[10px] text-slate-500 px-1 font-mono uppercase">Speed:</span>
              {SPEED_OPTIONS.map(spd => (
                <button
                  key={spd}
                  onClick={() => timeCtrl.setSpeed(spd)}
                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                    timeCtrl.speed === spd
                      ? 'bg-sky-500/25 text-sky-300 border border-sky-400/30 font-bold shadow-xs'
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
            <div className="relative flex-1 flex items-center">
              <input
                type="range"
                min={0}
                max={maxHours}
                step={0.1}
                value={timeCtrl.tRel}
                onChange={(e) => timeCtrl.setTRel(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-900/90 rounded-lg appearance-none cursor-pointer accent-sky-400 border border-white/10 hover:border-sky-500/40 transition"
              />
            </div>
          </div>

          {/* Digital Telemetry Clock Readout */}
          <div className="flex items-center gap-3 font-mono text-xs text-right whitespace-nowrap">
            <div className="px-3.5 py-1.5 rounded-xl bg-[#03060c] border border-sky-500/20 shadow-inner flex items-center gap-3">
              <div className="text-left">
                <span className="text-slate-500 text-[9px] uppercase tracking-wider block">MISSION CLOCK</span>
                <span className="text-sky-400 font-bold text-xs tracking-tight">
                  T+{currentHour}h <span className="text-slate-400 text-[10px]">({currentDay}d)</span>
                </span>
              </div>
              <div className="h-6 w-px bg-white/10"></div>
              <div className="text-left">
                <span className="text-slate-500 text-[9px] uppercase tracking-wider block">STATUS</span>
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  OPERATIONAL
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Tab Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col space-y-6">
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
