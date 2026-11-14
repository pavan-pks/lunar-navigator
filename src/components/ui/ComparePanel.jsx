import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { sampleSeries, valuesAt, hoursSince } from '../../lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate } from '../../lib/metrics.js';

/**
 * Split-Screen Compare Panel.
 * Floats OVER the 3D canvas — does NOT replace it.
 * Two transparent columns (Scenario Alpha / Bravo) with single-value data cards.
 * A thin center verdict strip shows the winner.
 */

const SITE_ID_DEFAULTS = {
  alpha: 'shackleton',
  bravo: 'malapert',
};

function ScenarioColumn({ label, sites, ephem, missionDays }) {
  const [siteId, setSiteId] = useState(label === 'Alpha' ? SITE_ID_DEFAULTS.alpha : SITE_ID_DEFAULTS.bravo);
  const [launchDate, setLaunchDate] = useState('2027-03-08T00:00:00Z');
  const [transitDays, setTransitDays] = useState(4);
  const maxHours = missionDays * 24;

  const site = useMemo(() => sites.find(s => s.id === siteId) || sites[0], [sites, siteId]);

  const startHours = useMemo(() => {
    if (!ephem) return 0;
    const landing = landingDate(launchDate, transitDays);
    return Math.max(0, hoursSince(ephem.startUTC, landing));
  }, [ephem, launchDate, transitDays]);

  const series = useMemo(() => {
    if (!ephem) return { t: [], sunEl: [], sunAz: [], earthEl: [], earthAz: [] };
    return sampleSeries(site, startHours, maxHours, ephem, 1);
  }, [site, startHours, maxHours, ephem]);

  const stats = useMemo(() => computeWindowStats(series), [series]);
  const verdict = useMemo(() => getVerdict(stats), [stats]);
  const live = useMemo(() => valuesAt(series, 0), [series]);

  const isAlpha = label === 'Alpha';
  const align = isAlpha ? 'text-left' : 'text-right';

  const cards = [
    {
      title: 'SUN ELEVATION',
      value: live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`,
      sub: 'at landing epoch',
      flag: live.sunEl < 0 ? 'warn' : 'ok',
    },
    {
      title: 'PEAK DARKNESS',
      value: `${stats.longestDarkHours}h`,
      sub: 'max continuous night',
      flag: stats.longestDarkHours > 100 ? 'warn' : 'ok',
    },
    {
      title: 'COMMS WINDOW',
      value: `${(stats.earthVisibleFraction * 100).toFixed(0)}%`,
      sub: 'DTE coverage',
      flag: stats.earthVisibleFraction < 0.5 ? 'warn' : 'ok',
    },
    {
      title: 'SOLAR YIELD',
      value: `${Math.min(100, Math.max(0, Math.sin((live.sunEl * Math.PI) / 180) * 100 * 2.5)).toFixed(0)}%`,
      sub: 'photovoltaic efficiency',
      flag: live.sunEl < 2 ? 'warn' : 'ok',
    },
  ];

  return (
    <div className={`flex-1 flex flex-col space-y-5 ${align}`}>
      {/* Scenario Header */}
      <div>
        <span className="text-[9px] font-sans font-light tracking-[0.3em] text-[#a3a3a3] uppercase block">
          Scenario {label}
        </span>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className={`bg-transparent border-b border-white/10 text-[#f5f5f5] font-sans font-light text-sm focus:outline-none focus:border-white/40 cursor-pointer transition appearance-none w-full pb-1 mt-1 ${align}`}
        >
          {sites.map(s => (
            <option key={s.id} value={s.id} className="bg-[#0a0a0a] text-[#f5f5f5]">
              {s.name}
            </option>
          ))}
        </select>
        <div className="text-[10px] font-mono text-[#a3a3a3] mt-1">
          {site.lat > 0 ? `+${site.lat.toFixed(2)}°` : `${site.lat.toFixed(2)}°`} · {site.lon > 0 ? `+${site.lon.toFixed(2)}°` : `${site.lon.toFixed(2)}°`}
        </div>
      </div>

      {/* Launch Controls */}
      <div className={`flex ${isAlpha ? 'flex-row' : 'flex-row-reverse'} gap-4 text-[10px] font-sans text-[#a3a3a3]`}>
        <div className="flex items-center gap-1.5">
          <span>Launch</span>
          <input
            type="date"
            value={launchDate.slice(0, 10)}
            onChange={(e) => setLaunchDate(`${e.target.value}T00:00:00Z`)}
            className="bg-transparent border-b border-white/10 text-[#f5f5f5] text-[10px] focus:outline-none cursor-pointer"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span>Transit</span>
          <input
            type="number"
            min={1}
            max={14}
            value={transitDays}
            onChange={(e) => setTransitDays(Number(e.target.value))}
            className="bg-transparent border-b border-white/10 text-[#f5f5f5] text-[10px] w-6 focus:outline-none text-center"
          />
          <span>d</span>
        </div>
      </div>

      {/* Data Cards */}
      <div className="space-y-4">
        {cards.map((card) => (
          <div key={card.title} className={`border-t border-white/5 pt-3 ${align}`}>
            <span className="text-[9px] font-sans font-light tracking-[0.2em] text-[#a3a3a3] uppercase block">
              {card.title}
            </span>
            <div className={`text-3xl font-mono font-light tracking-tight mt-0.5 ${
              card.flag === 'warn' ? 'text-[#d4a853]' : 'text-[#f5f5f5]'
            }`}>
              {card.value}
            </div>
            <div className="text-[9px] font-sans text-[#a3a3a3] mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Verdict */}
      <div className={`mt-auto pt-4 border-t border-white/5`}>
        <span className="text-[9px] font-sans font-light tracking-[0.2em] text-[#a3a3a3] uppercase block">
          Flight Status
        </span>
        <div className={`text-sm font-sans font-light mt-1 ${
          verdict.go ? 'text-[#f5f5f5]' : 'text-[#d4a853]'
        }`}>
          {verdict.badge}
        </div>
      </div>
    </div>
  );
}

export function ComparePanel({ sites, ephem, missionDays = 14, onClose }) {
  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {/* Thin full-width top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-10 py-4 pointer-events-auto">
        <span className="text-[9px] font-sans font-light tracking-[0.3em] text-[#a3a3a3] uppercase">
          Trade Study — Site Comparison
        </span>
        <button
          onClick={onClose}
          className="text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none p-1"
        >
          <X size={14} />
        </button>
      </div>

      {/* Two floating columns — left and right, moon visible in center */}
      <div className="absolute top-14 bottom-24 left-8 sm:left-12 lg:left-14 w-72 pointer-events-auto overflow-y-auto scrollbar-none">
        <ScenarioColumn label="Alpha" sites={sites} ephem={ephem} missionDays={missionDays} />
      </div>

      <div className="absolute top-14 bottom-24 right-8 sm:right-12 lg:right-14 w-72 pointer-events-auto overflow-y-auto scrollbar-none">
        <ScenarioColumn label="Bravo" sites={sites} ephem={ephem} missionDays={missionDays} />
      </div>

      {/* Center thin divider label */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center gap-2">
        <div className="w-[1px] h-16 bg-white/8"></div>
        <span className="text-[9px] font-sans font-light tracking-[0.25em] text-white/20 uppercase">vs</span>
        <div className="w-[1px] h-16 bg-white/8"></div>
      </div>
    </div>
  );
}

export default ComparePanel;
