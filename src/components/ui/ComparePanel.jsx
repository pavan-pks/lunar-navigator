import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause } from 'lucide-react';
import { sampleSeries, valuesAt, hoursSince } from '../../lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate, timeToNext } from '../../lib/metrics.js';

const SITE_ID_DEFAULTS = {
  alpha: 'shackleton',
  bravo: 'malapert',
};

function ScenarioColumn({
  label,
  sites,
  ephem,
  missionDays,
  siteId,
  setSiteId,
  launchDate,
  setLaunchDate,
  transitDays,
  setTransitDays,
  tRel = 0,
  align = 'left',
  lockSiteSelect = false,
}) {
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
  const live = useMemo(() => valuesAt(series, tRel), [series, tRel]);
  const timeToSunset = useMemo(() => timeToNext(series, tRel, 'sunset'), [series, tRel]);

  const isLeft = align === 'left';
  const textAlign = isLeft ? 'text-left' : 'text-right';

  const cards = [
    {
      title: 'LIVE SUN ELEVATION',
      value: live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`,
      sub: live.sunEl > 0 ? 'Direct illumination' : 'In topographic shadow',
      flag: live.sunEl < 0 ? 'warn' : 'ok',
    },
    {
      title: 'PEAK DARKNESS',
      value: `${stats.longestDarkHours}h`,
      sub: `sunset in ${timeToSunset !== null ? timeToSunset + 'h' : 'continuous'}`,
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
    <div className={`flex flex-col gap-4 p-4 sm:p-5 bg-black/85 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-y-auto max-h-[calc(100vh-14rem)] sidebar-scroll ${textAlign}`}>
      {/* Scenario Header & Target Picker */}
      <div className="flex flex-col gap-1.5 min-w-0">
        <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
          Scenario {label} Target
        </span>
        <select
          value={siteId}
          disabled={lockSiteSelect}
          onChange={(e) => setSiteId(e.target.value)}
          className={`bg-[#0a0a0a] border-b border-white/10 text-[#f5f5f5] font-sans font-light text-sm focus:outline-none focus:border-white/40 cursor-none transition appearance-none w-full pb-1 truncate ${
            lockSiteSelect ? 'opacity-70' : ''
          } ${textAlign}`}
        >
          {sites.map(s => (
            <option key={s.id} value={s.id} className="bg-[#0a0a0a] text-[#f5f5f5]">
              {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`})
            </option>
          ))}
        </select>
        <div className="text-[11px] font-mono text-[#737373] mt-0.5 truncate">
          {site.lat > 0 ? `+${site.lat.toFixed(2)}°` : `${site.lat.toFixed(2)}°`} · {site.lon > 0 ? `+${site.lon.toFixed(2)}°` : `${site.lon.toFixed(2)}°`}
        </div>
      </div>

      {/* Launch Schedule Parameters */}
      <div className={`flex ${isLeft ? 'flex-row' : 'flex-row-reverse'} flex-wrap gap-3 text-[11px] font-sans text-[#a3a3a3] border-t border-white/5 pt-3`}>
        <div className="flex items-center gap-1.5">
          <span>Launch:</span>
          <input
            type="date"
            value={launchDate.slice(0, 10)}
            onChange={(e) => setLaunchDate(`${e.target.value}T00:00:00Z`)}
            className="bg-transparent border-b border-white/10 text-[#f5f5f5] text-[11px] focus:outline-none cursor-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span>Transit:</span>
          <input
            type="number"
            min={1}
            max={14}
            value={transitDays}
            onChange={(e) => setTransitDays(Math.max(1, Math.min(14, Number(e.target.value))))}
            className="bg-transparent border-b border-white/10 text-[#f5f5f5] text-[11px] w-8 focus:outline-none text-center"
          />
          <span>d</span>
        </div>
      </div>

      {/* Single-Value Data Cards in Standard Flex Flow */}
      <div className="flex flex-col gap-3.5">
        {cards.map((card) => (
          <div key={card.title} className="flex flex-col gap-0.5 border-t border-white/5 pt-2.5 min-w-0">
            <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block truncate">
              {card.title}
            </span>
            <div className={`text-2xl font-mono tabular-nums font-light tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mt-0.5 ${
              card.flag === 'warn' ? 'text-amber-400' : 'text-[#f5f5f5]'
            }`}>
              {card.value}
            </div>
            <span className="text-[11px] font-sans font-light text-[#737373] truncate">{card.sub}</span>
          </div>
        ))}
      </div>

      {/* Flight Certification Verdict */}
      <div className="flex flex-col gap-0.5 border-t border-white/5 pt-2.5 mt-auto min-w-0">
        <span className="text-[11px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block">
          Certification Verdict
        </span>
        <div className={`text-base font-sans font-light mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] ${
          verdict.go ? 'text-emerald-300' : 'text-amber-400'
        }`}>
          {verdict.badge}
        </div>
        <span className="text-[11px] font-sans font-light text-[#737373] leading-relaxed [overflow-wrap:anywhere]">{verdict.reason}</span>
      </div>
    </div>
  );
}

/**
 * Split-Screen Comparison Mode:
 * Supports two sites OR one site on two dates with a shared time slider.
 */
export function ComparePanel({ sites, ephem, missionDays = 14, onClose }) {
  const [compareMode, setCompareMode] = useState('sites'); // 'sites' | 'dates'
  const [siteIdA, setSiteIdA] = useState(SITE_ID_DEFAULTS.alpha);
  const [siteIdB, setSiteIdB] = useState(SITE_ID_DEFAULTS.bravo);
  const [launchDateA, setLaunchDateA] = useState('2027-03-08T00:00:00Z');
  const [launchDateB, setLaunchDateB] = useState('2027-10-14T00:00:00Z');
  const [transitDaysA, setTransitDaysA] = useState(4);
  const [transitDaysB, setTransitDaysB] = useState(4);

  // Shared Time Slider State
  const maxHours = missionDays * 24;
  const [sharedTRel, setSharedTRel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSharedTRel((prev) => {
        const next = prev + 1;
        return next >= maxHours ? 0 : next;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, maxHours]);

  const activeSiteB = compareMode === 'dates' ? siteIdA : siteIdB;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between"
    >
      {/* Top Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 sm:px-12 py-4 pointer-events-auto bg-gradient-to-b from-black/90 to-transparent">
        <div>
          <span className="text-[11px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block">
            Comparative Trade Study
          </span>
          <h2 className="text-sm font-sans font-light text-[#f5f5f5] tracking-wide mt-0.5">
            Scenario Alpha vs. Scenario Bravo
          </h2>
        </div>

        {/* Mode Toggle: Compare Two Sites vs. Compare Two Dates */}
        <div className="flex items-center gap-2 bg-black/60 border border-white/15 rounded-lg p-1 text-[11px] font-sans">
          <button
            type="button"
            onClick={() => setCompareMode('sites')}
            className={`px-3 py-1 rounded transition cursor-none ${
              compareMode === 'sites'
                ? 'bg-white text-black font-medium'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Compare Two Sites
          </button>
          <button
            type="button"
            onClick={() => setCompareMode('dates')}
            className={`px-3 py-1 rounded transition cursor-none ${
              compareMode === 'dates'
                ? 'bg-white text-black font-medium'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            One Site, Two Dates
          </button>
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
      <div className="flex-1 w-full flex justify-between items-stretch px-4 sm:px-8 lg:px-12 pb-4 pointer-events-none overflow-hidden">
        {/* Left: Scenario Alpha */}
        <div className="w-full max-w-[280px] sm:max-w-[320px] lg:w-1/4 pointer-events-auto flex flex-col justify-start">
          <ScenarioColumn
            label="Alpha"
            sites={sites}
            ephem={ephem}
            missionDays={missionDays}
            siteId={siteIdA}
            setSiteId={setSiteIdA}
            launchDate={launchDateA}
            setLaunchDate={setLaunchDateA}
            transitDays={transitDaysA}
            setTransitDays={setTransitDaysA}
            tRel={sharedTRel}
            align="left"
            lockSiteSelect={false}
          />
        </div>

        {/* Center 50%: Pure transparent view into 3D lunar canvas */}
        <div className="hidden lg:flex flex-1 items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-[1px] h-12 bg-white/10" />
            <span className="text-[11px] font-sans font-light tracking-[0.3em] text-white/30 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
              Orbital Comparison
            </span>
            <div className="w-[1px] h-12 bg-white/10" />
          </div>
        </div>

        {/* Right: Scenario Bravo */}
        <div className="w-full max-w-[280px] sm:max-w-[320px] lg:w-1/4 pointer-events-auto flex flex-col justify-start">
          <ScenarioColumn
            label="Bravo"
            sites={sites}
            ephem={ephem}
            missionDays={missionDays}
            siteId={activeSiteB}
            setSiteId={setSiteIdB}
            launchDate={launchDateB}
            setLaunchDate={setLaunchDateB}
            transitDays={transitDaysB}
            setTransitDays={setTransitDaysB}
            tRel={sharedTRel}
            align="right"
            lockSiteSelect={compareMode === 'dates'}
          />
        </div>
      </div>

      {/* Shared Time Scrubber at the Bottom */}
      <div className="pointer-events-auto max-w-2xl mx-auto w-full px-4 pb-6 z-30">
        <div className="p-3 bg-black/85 backdrop-blur-md border border-white/15 rounded-xl flex flex-col gap-2 shadow-2xl">
          <div className="flex items-center justify-between text-[11px] font-mono text-[#a3a3a3]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className="text-white hover:opacity-80 transition cursor-none"
                aria-label={isPlaying ? 'Pause comparison' : 'Play comparison'}
              >
                {isPlaying ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <span className="text-[#f5f5f5]">
                Shared MET: {Math.floor(sharedTRel / 24)}d {Math.floor(sharedTRel % 24)}h
              </span>
            </div>
            <span>Mission Day {(sharedTRel / 24 + 1).toFixed(1)} / {missionDays}d</span>
          </div>
          <input
            type="range"
            min={0}
            max={maxHours}
            step={0.5}
            value={sharedTRel}
            onChange={(e) => setSharedTRel(parseFloat(e.target.value))}
            className="w-full h-1 bg-white/20 rounded accent-white cursor-none"
          />
        </div>
      </div>
    </motion.div>
  );
}

export default ComparePanel;
