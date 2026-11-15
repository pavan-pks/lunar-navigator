import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Battery, Calendar as CalendarIcon, ShieldCheck } from 'lucide-react';
import { Timeline } from './Timeline.jsx';
import { BatteryPanel } from './BatteryPanel.jsx';
import { Calendar } from './Calendar.jsx';
import { landingDate as computeLandingDate, computeSuitabilityScore } from '../../lib/metrics.js';

/**
 * Analysis Tools Modal:
 * Quantitative engineering tools (Timeline, Battery Simulator, Opportunity Calendar)
 * styled in the site's restrained minimal glass visual identity, featuring a 4-Factor
 * Landing Suitability Index and PSR (Permanently Shadowed Region) identification.
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
  onCompareOpportunity,
}) {
  const [tabOverride, setTabOverride] = useState(null);
  const activeTab = tabOverride || initialTab;

  const currentLanding = useMemo(() => {
    return computeLandingDate(launchDate, transitDays);
  }, [launchDate, transitDays]);

  // Compute 4-Factor Multi-Disciplinary Suitability Index (Solar, Night, Comms, Slope)
  const suitability = useMemo(() => {
    return computeSuitabilityScore(stats, site);
  }, [stats, site]);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 lg:p-8 bg-black/80 backdrop-blur-md pointer-events-auto select-none cursor-default overflow-y-auto">
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition cursor-pointer ${
                  activeTab === 'calendar'
                    ? 'bg-white text-black font-medium'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <CalendarIcon size={12} />
                <span>Opportunity Calendar</span>
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="text-neutral-400 hover:text-white border border-white/10 hover:border-white/30 p-1.5 rounded transition cursor-pointer"
              aria-label="Close Analysis Tools"
            >
              <X size={15} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 p-5 sm:p-6 overflow-y-auto sidebar-scroll space-y-5">
            {/* 4-Factor Multi-Disciplinary Suitability Score Banner */}
            <div className="p-4 rounded-xl bg-neutral-950/80 border border-white/10 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs ${
                      suitability.totalScore >= 80
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : suitability.totalScore >= 60
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {suitability.totalScore} / 100
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-2">
                      <span>{suitability.grade}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">Grade {suitability.gradeLetter}</span>
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Target: {site?.name} ({site?.lat > 0 ? `+${site.lat.toFixed(1)}°` : `${site.lat.toFixed(1)}°`}, {site?.lon > 0 ? `+${site.lon.toFixed(1)}°` : `${site.lon.toFixed(1)}°`})
                    </div>
                  </div>
                </div>

                {/* PSR & Slope Status Tag */}
                <div className="flex flex-wrap items-center gap-2">
                  {site?.isPsrAdjacent ? (
                    <span
                      className="px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-400/40 text-purple-300 text-[10px] font-sans font-medium"
                      title={site.psrDetails}
                    >
                      PSR Adjacent: Volatile Cold Trap
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-neutral-400 text-[10px] font-sans">
                      Non-PSR ({site?.terrainType || 'highland'})
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-neutral-400 border border-white/10 px-2 py-1 rounded bg-black/50">
                    Slope: {site?.nominalSlopeDeg || 5.0}° (&lt;15° safe)
                  </span>
                </div>
              </div>

              {/* 4 Pillars Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-sans">
                {/* Pillar 1: Solar */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-1">
                    <span>Solar Illumination</span>
                    <span className="font-mono text-neutral-500">35% wt</span>
                  </div>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-white font-medium text-xs">{suitability.pillars?.solar?.value}</span>
                    <span className="text-neutral-400 text-[10px]">{suitability.pillars?.solar?.score} / 100</span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded mt-1.5 overflow-hidden">
                    <div className="bg-amber-400 h-full rounded" style={{ width: `${suitability.pillars?.solar?.score || 0}%` }} />
                  </div>
                </div>

                {/* Pillar 2: Night Survival */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-1">
                    <span>Night Survival</span>
                    <span className="font-mono text-neutral-500">25% wt</span>
                  </div>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-white font-medium text-xs">{suitability.pillars?.night?.value}</span>
                    <span className="text-neutral-400 text-[10px]">{suitability.pillars?.night?.score} / 100</span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded mt-1.5 overflow-hidden">
                    <div className="bg-sky-400 h-full rounded" style={{ width: `${suitability.pillars?.night?.score || 0}%` }} />
                  </div>
                </div>

                {/* Pillar 3: Earth Line-of-Sight */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-1">
                    <span>Earth Visibility</span>
                    <span className="font-mono text-neutral-500">25% wt</span>
                  </div>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-white font-medium text-xs">{suitability.pillars?.comms?.value}</span>
                    <span className="text-neutral-400 text-[10px]">{suitability.pillars?.comms?.score} / 100</span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded mt-1.5 overflow-hidden">
                    <div className="bg-emerald-400 h-full rounded" style={{ width: `${suitability.pillars?.comms?.score || 0}%` }} />
                  </div>
                </div>

                {/* Pillar 4: Terrain Slope Safety */}
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                  <div className="flex justify-between items-center text-[10px] text-neutral-400 mb-1">
                    <span>Terrain Slope Safety</span>
                    <span className="font-mono text-neutral-500">15% wt</span>
                  </div>
                  <div className="flex justify-between items-baseline font-mono">
                    <span className="text-white font-medium text-xs">{suitability.pillars?.slope?.value}</span>
                    <span className="text-neutral-400 text-[10px]">{suitability.pillars?.slope?.score} / 100</span>
                  </div>
                  <div className="w-full bg-white/10 h-1 rounded mt-1.5 overflow-hidden">
                    <div className="bg-rose-400 h-full rounded" style={{ width: `${suitability.pillars?.slope?.score || 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Tab View */}
            {activeTab === 'timeline' && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-xs font-sans font-medium text-white tracking-wide">
                      Sun Elevation & Earth Line-of-Sight Profile
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      Target: {site?.name} · Flight Duration: {missionDays} days ({missionDays * 24} hours)
                    </p>
                  </div>
                  <div className="text-[11px] font-mono text-neutral-300">
                    Daylight: <span className="text-white font-medium">{(stats.sunlitFraction * 100).toFixed(0)}%</span> · Earth Contact: <span className="text-white font-medium">{(stats.earthVisibleFraction * 100).toFixed(0)}%</span>
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
                  <h3 className="text-xs font-sans font-medium text-white tracking-wide">
                    Lander Energy & Storage Simulator ("Will It Survive The Night?")
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
                <Calendar
                  sites={sites}
                  ephem={ephem}
                  missionDays={missionDays}
                  currentSite={site}
                  currentLandingDate={currentLanding}
                  onSelectOpportunity={(chosenSite, chosenDate) => {
                    onSelectOpportunity?.(chosenSite, chosenDate);
                    onClose();
                  }}
                  onCompareOpportunity={(chosenSite, chosenDate) => {
                    onCompareOpportunity?.(chosenSite, chosenDate);
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
