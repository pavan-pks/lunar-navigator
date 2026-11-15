import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { buildCalendar, getBestWindowsForSite } from '../../lib/calendarData.js';
import { BestWindows } from './BestWindows.jsx';

/**
 * src/components/ui/Calendar.jsx
 * Full-year landing window calendar heatmap across all candidate sites.
 */
export function Calendar({
  sites,
  ephem,
  missionDays = 14,
  onSelectOpportunity
}) {
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id || 'shackleton');
  const [popoverCell, setPopoverCell] = useState(null); // { site, dateStr, level, stats, x, y }

  const calendarData = useMemo(() => {
    return buildCalendar(sites, ephem, {
      startDateStr: '2027-01-01',
      stepDays: 3,
      numSteps: 120,
      missionDays
    });
  }, [sites, ephem, missionDays]);

  const selectedSite = sites.find(s => s.id === selectedSiteId) || sites[0];
  const bestWindows = useMemo(() => {
    return getBestWindowsForSite(selectedSiteId, calendarData, 3);
  }, [selectedSiteId, calendarData]);

  const handleCellClick = (site, dateStr, cellData) => {
    setPopoverCell({ site, dateStr, ...cellData });
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-500/20 pb-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2.5">
            <span>Mission Window Opportunity Matrix</span>
            <span className="text-xs font-mono font-normal px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
              2027 – 2028 EPHEMERIS
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Full-year evaluation matrix for {missionDays}-day landing sorties. Click any matrix opportunity to stage into Flight Comparison.
          </p>
        </div>

        {/* Site selector for best windows */}
        <div className="flex items-center gap-2.5 text-xs bg-[#070b14]/80 p-1.5 rounded-xl border border-white/10 backdrop-blur-md">
          <label htmlFor="calendar-site-inspect" className="text-slate-400 font-mono text-[11px] pl-2">Target Site:</label>
          <select
            id="calendar-site-inspect"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="bg-[#03060c] border border-white/10 rounded-lg px-3 py-1.5 text-slate-200 text-xs cursor-pointer focus:outline-none focus:border-sky-500 hover:border-sky-500/40 transition"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.lat.toFixed(1)}° S)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Top 3 Best Windows for Selected Site */}
      <BestWindows
        site={selectedSite}
        windows={bestWindows}
        onLoadScenario={(scenarioKey, site, launchDate) => {
          onSelectOpportunity(scenarioKey, site, launchDate);
        }}
      />

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070b14]/80 p-3 rounded-2xl border border-white/10 text-xs shadow-md">
        <span className="text-slate-400 font-mono text-[11px] uppercase tracking-wider font-semibold">
          Flight Rule Viability Thresholds:
        </span>
        <div className="flex items-center gap-5 text-[11px] font-mono">
          <span className="flex items-center gap-2 text-emerald-300">
            <span className="w-4 h-4 rounded-md bg-emerald-500/25 border border-emerald-500/50 flex items-center justify-center font-bold text-[9px] shadow-[0_0_8px_rgba(16,185,129,0.3)]">V</span>
            Viable (Sun &gt;75%, Night &lt;48h)
          </span>
          <span className="flex items-center gap-2 text-amber-300">
            <span className="w-4 h-4 rounded-md bg-amber-500/25 border border-amber-500/50 flex items-center justify-center font-bold text-[9px] shadow-[0_0_8px_rgba(245,158,11,0.3)]">R</span>
            Risky (Sub-Optimal Power)
          </span>
          <span className="flex items-center gap-2 text-red-400">
            <span className="w-4 h-4 rounded-md bg-red-500/20 border border-red-500/40 flex items-center justify-center font-bold text-[9px] shadow-[0_0_8px_rgba(239,68,68,0.3)]">N</span>
            No-Go (&gt;120h Blackout)
          </span>
        </div>
      </div>

      {/* Heatmap Grid Matrix */}
      <div className="border border-white/10 rounded-3xl bg-[#03060c] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.8)] relative">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full border-collapse text-left font-mono text-[10px]">
            <thead className="bg-[#070b14] sticky top-0 z-20 text-slate-400 border-b border-white/10">
              <tr>
                <th className="p-3 sticky left-0 bg-[#070b14] z-30 font-semibold text-slate-200 border-r border-white/10 min-w-[190px]">
                  CANDIDATE SITE // COORDS
                </th>
                {calendarData.dates.map((dStr) => (
                  <th key={dStr} className="p-1.5 text-center min-w-[32px] border-r border-white/5">
                    <span className="block text-[9px] text-slate-500">{dStr.slice(5, 7)}/</span>
                    <span className="text-slate-300 font-semibold">{dStr.slice(8, 10)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => {
                const siteRow = calendarData.matrix[site.id] || {};
                return (
                  <tr key={site.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    {/* Sticky site header */}
                    <td className="p-2.5 sticky left-0 bg-[#03060c] z-10 border-r border-white/10 font-sans font-medium text-xs text-slate-200">
                      <div className="font-semibold text-slate-100">{site.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {site.lat.toFixed(1)}°, {site.lon.toFixed(1)}°
                      </div>
                    </td>

                    {/* Date cells */}
                    {calendarData.dates.map((dStr) => {
                      const cell = siteRow[dStr] || { level: 'risky', sunlitFraction: 0, longestDarkHours: 0 };
                      const isV = cell.level === 'viable';
                      const isR = cell.level === 'risky';

                      const cellBg = isV
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/50 hover:shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                        : isR
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/40 hover:shadow-[0_0_12px_rgba(245,158,11,0.5)]'
                        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/30';

                      const letter = isV ? 'V' : isR ? 'R' : 'N';

                      return (
                        <td key={dStr} className="p-1 text-center border-r border-white/5">
                          <button
                            onClick={() => handleCellClick(site, dStr, cell)}
                            className={`w-6.5 h-6.5 rounded-lg flex items-center justify-center font-bold border cursor-pointer transition-all duration-150 hover:scale-115 ${cellBg}`}
                            title={`${site.name} on ${dStr}: ${cell.level.toUpperCase()} (Sunlit ${(cell.sunlitFraction * 100).toFixed(0)}%, Max Dark ${cell.longestDarkHours}h)`}
                          >
                            {letter}
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

      {/* Selected Cell Action Popover / Drawer */}
      {popoverCell && (
        <div className="bg-[#050914] border border-sky-500/40 p-5 rounded-3xl shadow-[0_12px_40px_rgba(0,0,0,0.9)] flex flex-col sm:flex-row items-center justify-between gap-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="font-display font-bold text-white text-base">{popoverCell.site.name}</span>
              <span className="text-xs font-mono text-sky-400 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20">
                Touchdown {popoverCell.dateStr}
              </span>
              <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full uppercase ${
                popoverCell.level === 'viable' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                popoverCell.level === 'risky' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}>
                {popoverCell.level}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-mono">
              Illuminated: <strong className="text-white">{(popoverCell.sunlitFraction * 100).toFixed(0)}%</strong> |
              Longest darkness: <strong className="text-white">{popoverCell.longestDarkHours}h</strong> |
              Earth Direct LOS: <strong className="text-white">{(popoverCell.earthVisibleFraction * 100).toFixed(0)}%</strong>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                onSelectOpportunity('main', popoverCell.site, `${popoverCell.dateStr}T00:00:00Z`);
                setPopoverCell(null);
              }}
              className="py-1.5 px-3 bg-neutral-800 hover:bg-neutral-700 text-sky-300 rounded text-xs font-mono font-medium transition-colors cursor-pointer border border-neutral-700"
            >
              Load into Main View
            </button>
            <button
              onClick={() => {
                onSelectOpportunity('A', popoverCell.site, `${popoverCell.dateStr}T00:00:00Z`);
                setPopoverCell(null);
              }}
              className="py-1.5 px-3 bg-sky-900/60 hover:bg-sky-800 text-sky-200 border border-sky-600/50 rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Stage to Scenario Alpha
            </button>
            <button
              onClick={() => {
                onSelectOpportunity('B', popoverCell.site, `${popoverCell.dateStr}T00:00:00Z`);
                setPopoverCell(null);
              }}
              className="py-1.5 px-3 bg-amber-900/60 hover:bg-amber-800 text-amber-200 border border-amber-600/50 rounded text-xs font-mono transition-colors cursor-pointer"
            >
              Stage to Scenario Bravo
            </button>
            <button
              onClick={() => setPopoverCell(null)}
              className="py-1.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded text-xs transition-colors cursor-pointer border border-neutral-700"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
