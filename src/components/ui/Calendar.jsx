import React, { useState, useMemo, useEffect } from 'react';
import { Calendar as CalendarIcon, Check, GitCompare, Info } from 'lucide-react';
import { buildCalendar, getBestWindowsForSite } from '../../lib/calendarData.js';
import { computeSuitabilityScore } from '../../lib/metrics.js';
import { BestWindows } from './BestWindows.jsx';
import { VerdictBadge } from './VerdictBadge.jsx';

/**
 * Format ISO date string into friendly readable month and day (e.g. "Jan 04")
 */
function formatShortDate(dateStr) {
  try {
    const d = new Date(`${dateStr}T00:00:00Z`);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      timeZone: 'UTC'
    });
  } catch {
    return dateStr;
  }
}

/**
 * src/components/ui/Calendar.jsx
 * Full-year landing opportunity calendar heatmap across candidate sites
 * with dynamic live inspection and clean, plain-English metrics.
 */
export function Calendar({
  sites = [],
  ephem,
  missionDays = 14,
  currentSite = null,
  currentLandingDate = null,
  onSelectOpportunity,
  onCompareOpportunity
}) {
  // Synchronize initial selected site with current active site
  const [selectedSiteId, setSelectedSiteId] = useState(currentSite?.id || sites[0]?.id || 'shackleton');

  useEffect(() => {
    if (currentSite?.id && currentSite.id !== selectedSiteId) {
      setSelectedSiteId(currentSite.id);
    }
  }, [currentSite?.id]);

  // Normalized current landing date string (YYYY-MM-DD)
  const currentLandingDateStr = useMemo(() => {
    if (!currentLandingDate) return '';
    try {
      const d = typeof currentLandingDate === 'string' ? new Date(currentLandingDate) : currentLandingDate;
      return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  }, [currentLandingDate]);

  // Compute full-year matrix data
  const calendarData = useMemo(() => {
    return buildCalendar(sites, ephem, {
      startDateStr: '2027-01-01',
      stepDays: 3,
      numSteps: 120,
      missionDays
    });
  }, [sites, ephem, missionDays]);

  const selectedSite = useMemo(() => {
    return sites.find(s => s.id === selectedSiteId) || sites[0];
  }, [sites, selectedSiteId]);

  // Top recommended windows for selected site
  const bestWindows = useMemo(() => {
    return getBestWindowsForSite(selectedSiteId, calendarData, 3);
  }, [selectedSiteId, calendarData]);

  // Currently inspected cell (defaults to top recommended window or current plan)
  const [inspectCell, setInspectCell] = useState(null);

  useEffect(() => {
    if (bestWindows && bestWindows.length > 0 && selectedSite) {
      const matchCurrent = bestWindows.find(w => w.dateStr === currentLandingDateStr);
      const chosen = matchCurrent || bestWindows[0];
      setInspectCell({
        site: selectedSite,
        dateStr: chosen.dateStr,
        ...chosen
      });
    }
  }, [selectedSiteId, bestWindows, currentLandingDateStr]);

  const handleCellClick = (site, dateStr, cellData) => {
    setSelectedSiteId(site.id);
    setInspectCell({
      site,
      dateStr,
      ...cellData
    });
  };

  const handleApplyMission = (site, dateStr) => {
    onSelectOpportunity?.(site, `${dateStr}T00:00:00Z`);
  };

  const handleCompareMission = (site, dateStr) => {
    onCompareOpportunity?.(site, `${dateStr}T00:00:00Z`);
  };

  return (
    <div className="space-y-5 font-sans">
      {/* Header & Site Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-sky-400" />
            <h2 className="text-sm font-sans font-medium text-white tracking-wide">
              Landing Opportunity Calendar (2027–2028)
            </h2>
          </div>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Full-year evaluation for {missionDays}-day landing sorties. Click any window to inspect sunlight and battery safety.
          </p>
        </div>

        {/* Target Site Dropdown */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg shrink-0">
          <label htmlFor="calendar-site-inspect" className="text-neutral-400 text-xs">
            Site:
          </label>
          <select
            id="calendar-site-inspect"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="bg-transparent text-white text-xs font-medium focus:outline-none cursor-pointer"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id} className="bg-neutral-900 text-white">
                {s.name} ({s.lat.toFixed(1)}° S)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 3 Recommended Windows */}
      <BestWindows
        site={selectedSite}
        windows={bestWindows}
        currentLandingDateStr={currentLandingDateStr}
        onSelectWindow={handleApplyMission}
        onCompareWindow={handleCompareMission}
      />

      {/* Dynamic Selected Window Details Panel */}
      {inspectCell && (() => {
        const cellSuitability = computeSuitabilityScore(inspectCell, inspectCell.site);
        return (
          <div className="bg-black/85 border border-sky-400/30 p-4 sm:p-5 rounded-2xl shadow-2xl backdrop-blur-md space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-sans text-neutral-400 uppercase tracking-widest block">
                  Selected Window Details
                </span>
                <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
                  <span className="text-sm font-semibold text-white">
                    {inspectCell.site.name} · {formatShortDate(inspectCell.dateStr)} ({inspectCell.dateStr})
                  </span>
                  <VerdictBadge verdict={{ level: inspectCell.level }} compact />
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    cellSuitability.totalScore >= 80 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    cellSuitability.totalScore >= 60 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    {cellSuitability.totalScore} / 100 ({cellSuitability.grade})
                  </span>
                  {inspectCell.site.isPsrAdjacent && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-950/60 border border-purple-400/40 text-purple-300 text-[10px] font-sans">
                      PSR Adjacent
                    </span>
                  )}
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleApplyMission(inspectCell.site, inspectCell.dateStr)}
                  className="px-3 py-1.5 bg-white text-black hover:bg-neutral-200 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={13} />
                  <span>Apply to Mission</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCompareMission(inspectCell.site, inspectCell.dateStr)}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-lg text-xs font-medium transition cursor-pointer flex items-center gap-1.5"
                >
                  <GitCompare size={13} />
                  <span>Compare</span>
                </button>
              </div>
            </div>

            {/* 4-Pillar Multi-Disciplinary Metric Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-[11px] font-sans">
              {/* Daylight Coverage */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] text-neutral-400">
                  <span>Daylight (35% wt)</span>
                  <span className="font-mono text-neutral-500">{cellSuitability.pillars?.solar?.score}/100</span>
                </div>
                <div className="mt-1">
                  <div className="text-base font-mono text-white font-medium tabular-nums">
                    {(inspectCell.sunlitFraction * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {(inspectCell.sunlitFraction * 336).toFixed(0)} hrs sunlight
                  </div>
                </div>
              </div>

              {/* Continuous Darkness */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] text-neutral-400">
                  <span>Night Survival (25% wt)</span>
                  <span className="font-mono text-neutral-500">{cellSuitability.pillars?.night?.score}/100</span>
                </div>
                <div className="mt-1">
                  <div className={`text-base font-mono font-medium tabular-nums ${inspectCell.longestDarkHours > 48 ? 'text-amber-300' : 'text-white'}`}>
                    {inspectCell.longestDarkHours} hrs
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {inspectCell.longestDarkHours === 0 ? 'No night (zero drain)' : `${inspectCell.longestDarkHours}h blackout`}
                  </div>
                </div>
              </div>

              {/* Earth Line-of-Sight */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] text-neutral-400">
                  <span>Earth Visibility (25% wt)</span>
                  <span className="font-mono text-neutral-500">{cellSuitability.pillars?.comms?.score}/100</span>
                </div>
                <div className="mt-1">
                  <div className="text-base font-mono text-emerald-400 font-medium tabular-nums">
                    {(inspectCell.earthVisibleFraction * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    {(inspectCell.earthVisibleFraction * 336).toFixed(0)} hrs direct line
                  </div>
                </div>
              </div>

              {/* Terrain Slope Safety */}
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[10px] text-neutral-400">
                  <span>Slope Safety (15% wt)</span>
                  <span className="font-mono text-neutral-500">{cellSuitability.pillars?.slope?.score}/100</span>
                </div>
                <div className="mt-1">
                  <div className="text-base font-mono text-white font-medium tabular-nums">
                    {inspectCell.site.nominalSlopeDeg || 5.0}°
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    &lt;15° safe tip margin
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-black/70 p-3 rounded-xl border border-white/10 text-[11px] text-neutral-300">
        <span className="font-medium text-neutral-400 flex items-center gap-1.5">
          <Info size={13} className="text-sky-400" />
          <span>Viability Key:</span>
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 text-emerald-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/30 border border-emerald-500/60 inline-block"></span>
            <span>Viable (Sunlight &gt;75%, Night &lt;48h)</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/30 border border-amber-500/60 inline-block"></span>
            <span>Caution (Reduced Sun or Long Night)</span>
          </span>
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500/50 inline-block"></span>
            <span>Not Recommended (&gt;120h Darkness)</span>
          </span>
        </div>
      </div>

      {/* Heatmap Grid Matrix */}
      <div className="border border-white/10 rounded-2xl bg-black/85 overflow-hidden shadow-2xl relative">
        <div className="overflow-x-auto max-h-96 sidebar-scroll">
          <table className="w-full border-collapse text-[11px] font-sans">
            <thead className="sticky top-0 z-20 bg-neutral-950/95 backdrop-blur-md border-b border-white/10">
              <tr>
                <th className="p-3 text-left font-medium text-neutral-300 sticky left-0 z-30 bg-neutral-950 min-w-44 border-r border-white/10">
                  Landing Site
                </th>
                <th className="p-3 text-left font-medium text-neutral-400 min-w-20 border-r border-white/10">
                  Latitude
                </th>
                {calendarData.dates.map((dStr) => {
                  const isCurrent = currentLandingDateStr === dStr;
                  return (
                    <th
                      key={dStr}
                      className={`p-2 text-center font-mono text-[10px] min-w-14 border-r border-white/5 whitespace-nowrap ${
                        isCurrent ? 'bg-sky-950/40 text-sky-300 font-bold' : 'text-neutral-400'
                      }`}
                      title={dStr}
                    >
                      <div>{formatShortDate(dStr)}</div>
                      {isCurrent && (
                        <div className="text-[9px] text-sky-400 font-sans tracking-tight">Active</div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => {
                const isSiteSelected = site.id === selectedSiteId;
                const rowCells = calendarData.matrix[site.id] || {};

                return (
                  <tr
                    key={site.id}
                    className={`border-b border-white/5 transition-colors ${
                      isSiteSelected ? 'bg-white/8' : 'hover:bg-white/4'
                    }`}
                  >
                    {/* Sticky Site Name Column */}
                    <td
                      className={`p-3 font-medium sticky left-0 z-10 border-r border-white/10 cursor-pointer ${
                        isSiteSelected
                          ? 'bg-neutral-900 text-sky-300'
                          : 'bg-black/90 text-neutral-200'
                      }`}
                      onClick={() => setSelectedSiteId(site.id)}
                      title={`Select ${site.name}`}
                    >
                      <div className="truncate max-w-40">{site.name}</div>
                    </td>

                    {/* Coordinates Column */}
                    <td className="p-3 text-neutral-400 font-mono text-[10px] border-r border-white/10 whitespace-nowrap">
                      {site.lat > 0 ? `+${site.lat.toFixed(1)}°` : `${site.lat.toFixed(1)}°`}
                    </td>

                    {/* Date Opportunity Cells */}
                    {calendarData.dates.map((dStr) => {
                      const cell = rowCells[dStr];
                      if (!cell) {
                        return <td key={dStr} className="p-1 border-r border-white/5" />;
                      }

                      const isV = cell.level === 'viable';
                      const isR = cell.level === 'risky';

                      const cellStyle = isV
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/40'
                        : isR
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/40'
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/25 hover:bg-rose-500/25';

                      const isInspected = inspectCell && inspectCell.site.id === site.id && inspectCell.dateStr === dStr;
                      const isCurrentPlan = currentLandingDateStr === dStr;

                      const pct = Math.round(cell.sunlitFraction * 100);

                      return (
                        <td key={dStr} className="p-1 text-center border-r border-white/5">
                          <button
                            type="button"
                            onClick={() => handleCellClick(site, dStr, cell)}
                            className={`w-9 h-7 rounded text-[10px] font-mono font-medium border cursor-pointer transition-all flex items-center justify-center mx-auto ${cellStyle} ${
                              isInspected ? 'ring-2 ring-sky-400 ring-offset-1 ring-offset-black' : ''
                            } ${isCurrentPlan ? 'outline-1 outline-sky-400' : ''}`}
                            title={`${site.name} on ${dStr}: ${(cell.sunlitFraction * 100).toFixed(0)}% Sunlight, ${cell.longestDarkHours}h Max Night, ${(cell.earthVisibleFraction * 100).toFixed(0)}% Earth Visibility (${cell.level.toUpperCase()})`}
                          >
                            <span>{pct}%</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Calendar;
