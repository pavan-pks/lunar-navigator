import React, { useState, useMemo } from 'react';
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Mission Window Opportunity Calendar</span>
            <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              2027 – 2028
            </span>
          </h2>
          <p className="text-xs text-slate-400">
            Full-year evaluation matrix for {missionDays}-day landing sorties. Click any date cell to stage into your comparison.
          </p>
        </div>

        {/* Site selector for best windows */}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="calendar-site-inspect" className="text-slate-400">Inspect Site:</label>
          <select
            id="calendar-site-inspect"
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200 text-xs cursor-pointer focus:outline-none focus:border-sky-500"
          >
            {sites.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.lat.toFixed(1)}°)
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-xs">
        <span className="text-slate-400 font-mono text-[11px]">Heatmap Legend:</span>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-[9px]">V</span>
            Viable (Sunlit &gt;75%, Dark &lt;48h)
          </span>
          <span className="flex items-center gap-1.5 text-amber-400">
            <span className="w-3.5 h-3.5 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center font-bold text-[9px]">R</span>
            Risky (Marginal power/thermal)
          </span>
          <span className="flex items-center gap-1.5 text-red-400">
            <span className="w-3.5 h-3.5 rounded bg-red-500/20 border border-red-500/40 flex items-center justify-center font-bold text-[9px]">N</span>
            Not Viable (&gt;120h dark)
          </span>
        </div>
      </div>

      {/* Heatmap Grid Matrix */}
      <div className="border border-slate-800 rounded-xl bg-slate-950 overflow-hidden shadow-inner relative">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full border-collapse text-left font-mono text-[10px]">
            <thead className="bg-slate-900 sticky top-0 z-20 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-2.5 sticky left-0 bg-slate-900 z-30 font-semibold text-slate-200 border-r border-slate-800 min-w-[180px]">
                  Site / Coordinates
                </th>
                {calendarData.dates.map((dStr) => (
                  <th key={dStr} className="p-1 text-center min-w-[28px] border-r border-slate-800/40">
                    <span className="block text-[9px] text-slate-500">{dStr.slice(5, 7)}/</span>
                    <span>{dStr.slice(8, 10)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => {
                const siteRow = calendarData.matrix[site.id] || {};
                return (
                  <tr key={site.id} className="border-b border-slate-800/60 hover:bg-slate-900/40">
                    {/* Sticky site header */}
                    <td className="p-2 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 font-sans font-medium text-xs text-slate-300">
                      <div>{site.name}</div>
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
                        ? 'bg-emerald-500/25 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/40'
                        : isR
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/40'
                        : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/30';

                      const letter = isV ? 'V' : isR ? 'R' : 'N';

                      return (
                        <td key={dStr} className="p-0.5 text-center border-r border-slate-800/20">
                          <button
                            onClick={() => handleCellClick(site, dStr, cell)}
                            className={`w-6 h-6 rounded flex items-center justify-center font-bold border cursor-pointer transition-transform hover:scale-110 ${cellBg}`}
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
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">{popoverCell.site.name}</span>
              <span className="text-xs font-mono text-sky-400">Touchdown {popoverCell.dateStr}</span>
              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase ${
                popoverCell.level === 'viable' ? 'bg-emerald-500/20 text-emerald-300' :
                popoverCell.level === 'risky' ? 'bg-amber-500/20 text-amber-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {popoverCell.level}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Sunlit: <span className="text-slate-200">{(popoverCell.sunlitFraction * 100).toFixed(0)}%</span> |
              Longest darkness: <span className="text-slate-200">{popoverCell.longestDarkHours}h</span> |
              Earth LOS: <span className="text-slate-200">{(popoverCell.earthVisibleFraction * 100).toFixed(0)}%</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onSelectOpportunity('A', popoverCell.site, `${popoverCell.dateStr}T00:00:00Z`);
                setPopoverCell(null);
              }}
              className="py-1.5 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Stage to Scenario A
            </button>
            <button
              onClick={() => {
                onSelectOpportunity('B', popoverCell.site, `${popoverCell.dateStr}T00:00:00Z`);
                setPopoverCell(null);
              }}
              className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Stage to Scenario B
            </button>
            <button
              onClick={() => setPopoverCell(null)}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Calendar;
