import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { sampleSeries, valuesAt, hoursSince } from '../../lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate } from '../../lib/metrics.js';

const SITE_ID_DEFAULTS = {
  alpha: 'shackleton',
  bravo: 'malapert',
};

function ScenarioColumn({ label, sites, ephem, missionDays, align = 'left' }) {
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

  const isLeft = align === 'left';
  const textAlign = isLeft ? 'text-left' : 'text-right';

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
      sub: `${stats.earthVisibleHours}h direct-to-earth`,
      flag: stats.earthVisibleFraction < 0.5 ? 'warn' : 'ok',
    },
    {
      title: 'SOLAR COVERAGE',
      value: `${(stats.sunlitFraction * 100).toFixed(0)}%`,
      sub: `${stats.sunlitHours}h illuminated window`,
      flag: stats.sunlitFraction < 0.5 ? 'warn' : 'ok',
    },
  ];

  return (
    <div className={`flex flex-col gap-5 p-5 bg-black/50 backdrop-blur-md border border-white/5 rounded-xl shadow-2xl overflow-y-auto scrollbar-none ${textAlign}`}>
      {/* Scenario Header & Target Picker */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
          Scenario {label} Target
        </span>
        <select
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          className={`bg-[#0a0a0a] border-b border-white/10 text-[#f5f5f5] font-sans font-light text-sm focus:outline-none focus:border-white/40 cursor-none transition appearance-none w-full pb-1 ${textAlign}`}
        >
          {sites.map(s => (
            <option key={s.id} value={s.id} className="bg-[#0a0a0a] text-[#f5f5f5]">
              {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`})
            </option>
          ))}
        </select>
        <div className="text-[9px] font-mono text-[#737373] mt-0.5">
          {site.lat > 0 ? `+${site.lat.toFixed(2)}°` : `${site.lat.toFixed(2)}°`} · {site.lon > 0 ? `+${site.lon.toFixed(2)}°` : `${site.lon.toFixed(2)}°`}
        </div>
      </div>

      {/* Launch Schedule Parameters */}
      <div className={`flex ${isLeft ? 'flex-row' : 'flex-row-reverse'} gap-4 text-[10px] font-sans text-[#a3a3a3] border-t border-white/5 pt-3`}>
        <div className="flex items-center gap-1.5">
          <span>Launch:</span>
          <input
            type="date"
            value={launchDate.slice(0, 10)}
            onChange={(e) => setLaunchDate(`${e.target.value}T00:00:00Z`)}
            className="bg-transparent border-b border-white/10 text-[#f5f5f5] text-[10px] focus:outline-none cursor-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span>Transit:</span>
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

      {/* Single-Value Data Cards in Standard Flex Flow */}
      <div className="flex flex-col gap-4">
        {cards.map((card) => (
          <div key={card.title} className="flex flex-col gap-0.5 border-t border-white/5 pt-3">
            <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
              {card.title}
            </span>
            <div className={`text-2xl font-mono font-light tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mt-0.5 ${
              card.flag === 'warn' ? 'text-[#d4a853]' : 'text-[#f5f5f5]'
            }`}>
              {card.value}
            </div>
            <span className="text-[9px] font-sans font-light text-[#737373]">{card.sub}</span>
          </div>
        ))}
      </div>

      {/* Flight Certification Verdict */}
      <div className="flex flex-col gap-0.5 border-t border-white/5 pt-3 mt-auto">
        <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
          Certification Verdict
        </span>
        <div className={`text-base font-sans font-light mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
          verdict.go ? 'text-[#f5f5f5]' : 'text-[#d4a853]'
        }`}>
          {verdict.badge}
        </div>
        <span className="text-[9px] font-sans font-light text-[#737373]">{verdict.reason}</span>
      </div>
    </div>
  );
}

/**
 * Split-Screen Comparison Mode:
 * Left 25%: Scenario Alpha metrics
 * Center 50%: Unobstructed 3D Moon canvas
 * Right 25%: Scenario Bravo metrics
 */
export function ComparePanel({ sites, ephem, missionDays = 14, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between"
    >
      {/* Top Header Bar */}
      <header className="flex items-center justify-between px-8 sm:px-12 py-5 pointer-events-auto bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <span className="text-[10px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block">
            Comparative Trade Study
          </span>
          <h2 className="text-sm font-sans font-light text-[#f5f5f5] tracking-wide mt-0.5">
            Scenario Alpha vs. Scenario Bravo
          </h2>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-xs font-sans text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none border border-white/10 hover:border-white/30 px-3 py-1.5 rounded"
        >
          <X size={13} />
          <span>Exit Comparison</span>
        </button>
      </header>

      {/* Main Split Layout: Left 25% | Center 50% Clear | Right 25% */}
      <div className="flex-1 w-full flex justify-between items-stretch px-6 sm:px-10 lg:px-12 pb-8 pointer-events-none overflow-hidden">
        {/* Left 25%: Scenario Alpha */}
        <div className="w-full max-w-[280px] sm:max-w-[320px] lg:w-1/4 pointer-events-auto flex flex-col justify-start">
          <ScenarioColumn
            label="Alpha"
            sites={sites}
            ephem={ephem}
            missionDays={missionDays}
            align="left"
          />
        </div>

        {/* Center 50%: Pure transparent view into 3D lunar canvas with subtle comparison callout */}
        <div className="hidden lg:flex flex-1 items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-[1px] h-12 bg-white/10" />
            <span className="text-[10px] font-sans font-light tracking-[0.3em] text-white/30 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              Orbital Analysis
            </span>
            <div className="w-[1px] h-12 bg-white/10" />
          </div>
        </div>

        {/* Right 25%: Scenario Bravo */}
        <div className="w-full max-w-[280px] sm:max-w-[320px] lg:w-1/4 pointer-events-auto flex flex-col justify-start">
          <ScenarioColumn
            label="Bravo"
            sites={sites}
            ephem={ephem}
            missionDays={missionDays}
            align="right"
          />
        </div>
      </div>
    </motion.div>
  );
}

export default ComparePanel;
