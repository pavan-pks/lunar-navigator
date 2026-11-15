import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Battery, Calendar as CalendarIcon } from 'lucide-react';
import { Timeline } from './Timeline.jsx';
import { BatteryPanel } from './BatteryPanel.jsx';
import { Calendar } from './Calendar.jsx';

/**
 * Analysis Tools Modal:
 * Quantitative engineering tools (Timeline, Battery Simulator, Calendar Matrix)
 * styled in the original minimal glass aerospace visual identity.
 */
export function AnalysisToolsModal({
  isOpen,
  onClose,
  initialTab = 'timeline',
  sites,
  ephem,
  site,
  series,
  startUTC,
  tRel,
  onSeek,
  stats,
  launchDate,
  transitDays,
  missionDays = 14,
  onSelectOpportunity,
}) {
  const [tabOverride, setTabOverride] = useState(null);
  const activeTab = tabOverride || initialTab;

  if (!isOpen) return null;

  const scenarioA = {
    siteId: site?.id || 'shackleton',
    customSite: site?.id === 'custom' ? site : null,
    launchDate: launchDate,
    transitDays: transitDays,
  };

  const scenarioB = {
    siteId: 'malapert',
    customSite: null,
    launchDate: launchDate,
    transitDays: transitDays,
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-black/80 backdrop-blur-md pointer-events-auto select-none cursor-none overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-5xl max-h-[90vh] bg-black/90 border border-white/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto"
        >
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-neutral-950/60">
            <div>
              <span className="text-[11px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block">
                NASA Artemis Flight Dynamics
              </span>
              <h2 className="text-sm font-sans font-medium text-white tracking-wide mt-0.5">
                Mission Planning Analysis & Simulation Tools
              </h2>
            </div>

            {/* Tab Navigation */}
            <div className="flex items-center gap-1.5 bg-black/70 border border-white/10 p-1 rounded-lg text-[11px] font-sans">
              <button
                type="button"
                onClick={() => setTabOverride('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-none ${
                  activeTab === 'timeline'
                    ? 'bg-white text-black font-medium'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Activity size={12} />
                <span>Elevation Timeline</span>
              </button>

              <button
                type="button"
                onClick={() => setTabOverride('battery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-none ${
                  activeTab === 'battery'
                    ? 'bg-white text-black font-medium'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Battery size={12} />
                <span>Battery Simulator</span>
              </button>

              <button
                type="button"
                onClick={() => setTabOverride('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-none ${
                  activeTab === 'calendar'
                    ? 'bg-white text-black font-medium'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <CalendarIcon size={12} />
                <span>Opportunity Matrix</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 p-1.5 rounded transition cursor-none"
              aria-label="Close Analysis Tools"
            >
              <X size={15} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto sidebar-scroll">
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-xs font-mono font-medium text-white uppercase tracking-wider">
                      Solar Elevation & Direct-to-Earth Line-of-Sight Timeline
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Target: {site?.name} · Flight Duration: {missionDays} days ({missionDays * 24} hours)
                    </p>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-300">
                    Sunlit: <span className="text-white font-medium">{(stats.sunlitFraction * 100).toFixed(0)}%</span> · Earth LOS: <span className="text-white font-medium">{(stats.earthVisibleFraction * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="bg-black/60 border border-white/10 rounded-xl p-4">
                  <Timeline
                    series={series}
                    startUTC={startUTC}
                    tRel={tRel}
                    onSeek={onSeek}
                    stats={stats}
                  />
                </div>
              </div>
            )}

            {activeTab === 'battery' && (
              <div className="space-y-4">
                <div className="border-b border-white/10 pb-3">
                  <h3 className="text-xs font-mono font-medium text-white uppercase tracking-wider">
                    Electrochemical Battery Charge Simulation ("Will It Survive The Night?")
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Evaluates continuous darkness discharge, thermal heater maintenance draw, and survival depth-of-discharge.
                  </p>
                </div>

                <div className="bg-black/60 border border-white/10 rounded-xl p-4">
                  <BatteryPanel
                    sites={sites}
                    ephem={ephem}
                    scenarioA={scenarioA}
                    scenarioB={scenarioB}
                    missionDays={missionDays}
                  />
                </div>
              </div>
            )}

            {activeTab === 'calendar' && (
              <div className="space-y-4">
                <div className="border-b border-white/10 pb-3">
                  <h3 className="text-xs font-mono font-medium text-white uppercase tracking-wider">
                    Full-Year Mission Window Heatmap Matrix
                  </h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Click any cell to stage that landing site and launch epoch into your mission plan.
                  </p>
                </div>

                <Calendar
                  sites={sites}
                  ephem={ephem}
                  missionDays={missionDays}
                  onSelectOpportunity={(scenarioKey, chosenSite, chosenDate) => {
                    onSelectOpportunity?.(chosenSite, chosenDate);
                    onClose();
                  }}
                />
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default AnalysisToolsModal;
