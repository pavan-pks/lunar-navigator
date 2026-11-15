import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Sliders, Activity, Battery, Calendar as CalendarIcon, GitCompare } from 'lucide-react';
import { MetricsPanel } from './MetricsPanel.jsx';
import { ExplorerCaptions } from './ExplorerCaptions.jsx';
import { Timeline } from './Timeline.jsx';
import { BatteryPanel } from './BatteryPanel.jsx';
import { Calendar } from './Calendar.jsx';
import { Compare } from './Compare.jsx';

/**
 * Collapsible Right Inspector Panel.
 * Hosts mission analysis tabs:
 * 1. Metrics (Planner dense view or Explorer plain captions)
 * 2. Timeline (Recharts Sun/Earth elevation profile synced to scrubber)
 * 3. Battery (Electrochemical charge simulation)
 * 4. Calendar (Full mission window opportunity heatmap)
 * 5. Compare (Side-by-side trade study comparison)
 */
export function Inspector({
  sites,
  ephem,
  site,
  selectedSiteId,
  onSelectSite,
  series,
  startUTC,
  tRel,
  onSeek,
  live,
  stats,
  verdict,
  timeToSunset,
  timeToEarthset,
  objectHeightM = 3.0,
  plannerMode = 'planner', // 'planner' | 'explorer'
  onTogglePlannerMode,
  isCollapsed = false,
  onToggleCollapse,
  activeTab = 'metrics',
  onTabChange,
  scenarioA,
  setScenarioA,
  scenarioB,
  setScenarioB,
  compareMode = 'sites',
  setCompareMode,
  missionDays = 14,
  setMissionDays,
  slipDays = 0,
  setSlipDays,
  onSelectOpportunity
}) {
  const tabs = [
    { id: 'metrics', label: 'Metrics', icon: Activity },
    { id: 'timeline', label: 'Timeline', icon: Sliders },
    { id: 'battery', label: 'Battery', icon: Battery },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'compare', label: 'Compare', icon: GitCompare }
  ];

  if (isCollapsed) {
    return (
      <div className="absolute top-24 right-4 z-30">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 bg-neutral-950/90 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white rounded shadow-xl flex items-center gap-1.5 text-xs font-mono backdrop-blur-md cursor-pointer transition-colors"
          title="Open Inspector"
          aria-label="Expand Inspector"
        >
          <ChevronLeft className="w-4 h-4 text-sky-400" />
          <span className="font-semibold uppercase tracking-wider text-[11px]">Inspector</span>
        </button>
      </div>
    );
  }

  return (
    <aside className="w-full md:w-[460px] xl:w-[500px] h-[calc(100vh-140px)] flex flex-col bg-neutral-950/92 border-l border-neutral-800 text-neutral-200 text-xs shadow-2xl backdrop-blur-md z-30 overflow-hidden">
      {/* Header with Tabs and Collapse button */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/50 px-3 py-2 shrink-0">
        <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-neutral-800 text-white font-semibold border border-neutral-700'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-neutral-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors ml-2 cursor-pointer"
          title="Collapse Inspector"
          aria-label="Collapse Inspector"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'metrics' && (
          <div className="space-y-4">
            {/* Planner vs Explorer Mode Switcher */}
            <div className="flex items-center justify-between bg-neutral-900 p-1 rounded border border-neutral-800 font-mono text-[11px]">
              <span className="text-neutral-400 pl-2">Display Mode:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onTogglePlannerMode('planner')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    plannerMode === 'planner'
                      ? 'bg-neutral-800 text-sky-400 font-bold border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Planner (Dense)
                </button>
                <button
                  type="button"
                  onClick={() => onTogglePlannerMode('explorer')}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                    plannerMode === 'explorer'
                      ? 'bg-neutral-800 text-sky-400 font-bold border border-neutral-700'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  Explorer (Captions)
                </button>
              </div>
            </div>

            {plannerMode === 'planner' ? (
              <MetricsPanel
                liveAngles={live}
                stats={stats}
                verdict={verdict}
                objectHeightM={objectHeightM}
                timeToSunset={timeToSunset}
                timeToEarthset={timeToEarthset}
              />
            ) : (
              <ExplorerCaptions
                stats={stats}
                liveAngles={live}
                siteName={site?.name || 'Selected Site'}
                objectHeightM={objectHeightM}
              />
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-4">
            <Timeline
              series={series}
              startUTC={startUTC}
              tRel={tRel}
              onSeek={onSeek}
              stats={stats}
            />
          </div>
        )}

        {activeTab === 'battery' && (
          <div className="space-y-4">
            <BatteryPanel
              sites={sites}
              ephem={ephem}
              scenarioA={scenarioA}
              scenarioB={scenarioB}
              missionDays={missionDays}
            />
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-4">
            <Calendar
              sites={sites}
              ephem={ephem}
              missionDays={missionDays}
              onSelectOpportunity={(targetScenario, oppSite, oppDate) => {
                if (onSelectOpportunity) {
                  onSelectOpportunity(targetScenario, oppSite, oppDate);
                }
              }}
            />
          </div>
        )}

        {activeTab === 'compare' && (
          <div className="space-y-4">
            <Compare
              sites={sites}
              ephem={ephem}
              scenarioA={scenarioA}
              setScenarioA={setScenarioA}
              scenarioB={scenarioB}
              setScenarioB={setScenarioB}
              compareMode={compareMode}
              setCompareMode={setCompareMode}
              tRel={tRel}
              setTRel={onSeek}
              missionDays={missionDays}
              setMissionDays={setMissionDays}
              slipDays={slipDays}
              setSlipDays={setSlipDays}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

export default Inspector;
