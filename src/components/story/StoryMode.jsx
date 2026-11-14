import React, { useState, useMemo } from 'react';
import { SpaceIntroScene } from './SpaceIntroScene.jsx';
import { ScenePanel } from '../ui/ScenePanel.jsx';
import { sampleSeries, valuesAt, hoursSince } from '../../lib/geometry.js';
import { computeWindowStats, getVerdict, landingDate } from '../../lib/metrics.js';
import { simulateBattery, DEFAULT_BATTERY_PARAMS } from '../../lib/energy.js';

const SPACECRAFT_OPTIONS = [
  {
    id: 'starship',
    name: 'Artemis Starship HLS',
    desc: '50-meter heavy human lander with high-elevation solar mast and high payload capacity.',
    height: 12.0, // Scaled for 3D visibility
    icon: '🚀',
    power: { capacityWh: 5000, panelPeakW: 800, loadW: 180, nightHeaterW: 40, orientation: 'vertical-tracking' }
  },
  {
    id: 'clps',
    name: 'CLPS Science Lander',
    desc: '3-meter robotic commercial lander (Nova-C / Peregrine archetype) for automated payloads.',
    height: 3.0,
    icon: '🛰️',
    power: { capacityWh: 1000, panelPeakW: 200, loadW: 60, nightHeaterW: 20, orientation: 'horizontal' }
  },
  {
    id: 'viper',
    name: 'VIPER Polar Rover',
    desc: '1.5-meter mobile resource prospector with vertical sun-tracking mast to search for crater ice.',
    height: 1.8,
    icon: '🚙',
    power: { capacityWh: 4000, panelPeakW: 600, loadW: 120, nightHeaterW: 30, orientation: 'vertical-tracking' }
  }
];

const SEASON_OPTIONS = [
  {
    id: 'summer',
    label: 'March 2027 (Peak Summer Sunlight)',
    date: '2027-03-08T00:00:00Z',
    desc: 'Optimal solar illumination window. Sun elevation peaks up to +2.8° above horizon.'
  },
  {
    id: 'winter',
    label: 'July 2027 (Deep Winter Shadow)',
    date: '2027-07-15T00:00:00Z',
    desc: 'Sub-solar latitude swings north, dipping polar sites into extended cryogenic darkness.'
  }
];

export function StoryMode({ sites, ephem, onSwitchToPlanner }) {
  const [storyPhase, setStoryPhase] = useState('intro'); // 'intro' | 'approaching' | 'selection' | 'surface'
  const [selectedSiteId, setSelectedSiteId] = useState('shackleton');
  const [selectedCraftId, setSelectedCraftId] = useState('starship');
  const [selectedSeasonId, setSelectedSeasonId] = useState('summer');

  // Surface simulation time state
  const [tRel, setTRel] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const selectedSite = sites.find(s => s.id === selectedSiteId) || sites[0];
  const selectedCraft = SPACECRAFT_OPTIONS.find(c => c.id === selectedCraftId) || SPACECRAFT_OPTIONS[0];
  const selectedSeason = SEASON_OPTIONS.find(s => s.id === selectedSeasonId) || SEASON_OPTIONS[0];

  // Compute ephemeris geometry for selected site and season
  const landing = landingDate(selectedSeason.date, 4);
  const startHours = Math.max(0, hoursSince(ephem.startUTC, landing));
  const durationHours = 14 * 24; // 14-day sortie

  const series = useMemo(() => {
    return sampleSeries(selectedSite, startHours, durationHours, ephem, 1);
  }, [selectedSite, startHours, durationHours, ephem]);

  const live = useMemo(() => valuesAt(series, tRel), [series, tRel]);
  const stats = useMemo(() => computeWindowStats(series), [series]);
  const verdict = useMemo(() => getVerdict(stats), [stats]);

  // Battery simulation with selected spacecraft specs
  const batterySim = useMemo(() => {
    return simulateBattery(series, selectedCraft.power);
  }, [series, selectedCraft.power]);

  const currentHour = Math.floor(tRel);
  const currentDay = (tRel / 24).toFixed(1);
  const chargeAtHour = batterySim.charge[Math.min(currentHour, batterySim.charge.length - 1)] || 0;
  const chargePercent = ((chargeAtHour / selectedCraft.power.capacityWh) * 100).toFixed(0);

  // Time playback ticker
  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTRel(prev => {
        const next = prev + 1;
        if (next > durationHours) return 0;
        return next;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [isPlaying, durationHours]);

  return (
    <div className="relative w-full min-h-screen bg-black text-white flex flex-col overflow-hidden font-sans select-none">
      {/* 3D Background Space / Moon View */}
      {storyPhase !== 'surface' && (
        <SpaceIntroScene
          isZooming={storyPhase === 'approaching'}
          onReachedMoon={() => setStoryPhase('selection')}
          targetSite={selectedSite}
        />
      )}

      {/* PHASE 1: STORY INTRO OVERLAY */}
      {storyPhase === 'intro' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-12 bg-gradient-to-t from-black/90 via-transparent to-black/60 pointer-events-none">
          {/* Header Tag */}
          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 font-bold shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                ☾
              </span>
              <span className="text-xs font-mono font-semibold tracking-widest uppercase text-sky-300">
                NASA Space Apps Challenge 2026
              </span>
            </div>
            <button
              onClick={onSwitchToPlanner}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-mono text-slate-200 transition-colors"
            >
              Skip to Mission Control ↗
            </button>
          </div>

          {/* Main Story Hero Pitch */}
          <div className="max-w-2xl space-y-5 pointer-events-auto">
            <div className="space-y-2">
              <span className="text-xs font-mono tracking-widest text-amber-400 uppercase font-semibold">
                STORY MODE // ARTEMIS EXPEDITION
              </span>
              <h1 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight leading-tight">
                Surviving the Lunar South Pole
              </h1>
            </div>
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-light">
              At the Moon's South Pole, the Sun never climbs high — it grazes the jagged crater horizon at just 1.5°.
              A few meters can mean <strong className="text-amber-300">continuous solar power</strong> or <strong className="text-sky-300">weeks of freezing blackout</strong>.
            </p>
            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              Will your landing site survive the lunar night? Can mission control hear you?
            </p>

            <div className="pt-2 flex flex-wrap gap-4">
              <button
                onClick={() => setStoryPhase('approaching')}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-semibold text-sm shadow-[0_0_30px_rgba(56,189,248,0.5)] transition-all transform hover:scale-105 flex items-center gap-2.5 cursor-pointer"
              >
                <span>🚀 BEGIN MISSION</span>
                <span className="text-xs font-mono opacity-80">(Zoom to Moon)</span>
              </button>
            </div>
          </div>

          {/* Footer note */}
          <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between pointer-events-auto">
            <span>Real NASA/JPL Horizons Ephemeris • Sub-Solar & Sub-Earth Vectors</span>
            <span>Touchdown Target: 80°S – 90°S</span>
          </div>
        </div>
      )}

      {/* PHASE 2: APPROACHING THE MOON (TRANSITION) */}
      {storyPhase === 'approaching' && (
        <div className="absolute inset-x-0 bottom-16 z-20 flex justify-center pointer-events-none">
          <div className="bg-black/75 border border-sky-500/30 px-6 py-3 rounded-full backdrop-blur-md shadow-2xl flex items-center gap-3 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
            <span className="text-xs font-mono font-semibold tracking-wider uppercase text-sky-200">
              Translunar Coast Complete • Entering Lunar South Pole Orbit...
            </span>
          </div>
        </div>
      )}

      {/* PHASE 3: MISSION SELECTION OVERLAY */}
      {storyPhase === 'selection' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-6 sm:p-10 bg-black/70 backdrop-blur-sm overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <span className="text-[10px] font-mono text-sky-400 uppercase tracking-widest font-bold">
                PHASE 01: MISSION CONFIGURATION
              </span>
              <h2 className="text-2xl font-display font-bold text-white">
                Select Your Artemis Landing Architecture
              </h2>
            </div>
            <button
              onClick={() => setStoryPhase('intro')}
              className="text-xs font-mono text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 border border-white/10"
            >
              ↺ Space View
            </button>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-auto py-6">
            {/* Step 1: Landing Zone */}
            <div className="bg-[#070c18]/90 p-5 rounded-3xl border border-sky-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                <span className="font-display font-bold text-sm text-sky-300">1. Target Landing Zone</span>
                <span className="text-[10px] font-mono text-slate-400">South Pole</span>
              </div>
              <div className="space-y-2.5">
                {sites.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSiteId(s.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 ${
                      selectedSiteId === s.id
                        ? 'bg-sky-500/20 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs">{s.name}</span>
                      <span className="text-[10px] font-mono text-sky-400">{s.lat.toFixed(1)}° S</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-1">{s.notes}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Spacecraft Architecture */}
            <div className="bg-[#070c18]/90 p-5 rounded-3xl border border-sky-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                <span className="font-display font-bold text-sm text-sky-300">2. Spacecraft Architecture</span>
                <span className="text-[10px] font-mono text-slate-400">Vehicle</span>
              </div>
              <div className="space-y-2.5">
                {SPACECRAFT_OPTIONS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCraftId(c.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1 ${
                      selectedCraftId === c.id
                        ? 'bg-sky-500/20 border-sky-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-xs flex items-center gap-1.5">
                        <span>{c.icon}</span> {c.name}
                      </span>
                      <span className="text-[10px] font-mono text-amber-300">{c.height}m mast</span>
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-2">{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Touchdown Timing */}
            <div className="bg-[#070c18]/90 p-5 rounded-3xl border border-sky-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                <span className="font-display font-bold text-sm text-sky-300">3. Mission Season</span>
                <span className="text-[10px] font-mono text-slate-400">2027 Horizons</span>
              </div>
              <div className="space-y-2.5">
                {SEASON_OPTIONS.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSeasonId(s.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      selectedSeasonId === s.id
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                        : 'bg-black/40 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }`}
                  >
                    <div className="font-bold text-xs">{s.label}</div>
                    <span className="text-[10px] text-slate-400 leading-relaxed">{s.desc}</span>
                  </button>
                ))}
              </div>

              {/* Quick Summary Pill */}
              <div className="p-3 bg-black/60 rounded-xl border border-white/10 text-[11px] font-mono text-slate-300 space-y-1">
                <div className="text-sky-400 font-semibold">Ready for Descent:</div>
                <div>Landing: {selectedSite.name} ({selectedSite.lat.toFixed(1)}°S)</div>
                <div>Vehicle: {selectedCraft.name}</div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/10 pt-4">
            <span className="text-xs font-mono text-slate-400">
              NASA Rule: Site requires &gt;75% solar availability and continuous Earth Line-of-Sight.
            </span>
            <button
              onClick={() => {
                setStoryPhase('surface');
                setTRel(0);
              }}
              className="py-3 px-8 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all transform hover:scale-105 cursor-pointer flex items-center gap-2"
            >
              <span>🛬 LAND SPACECRAFT ON SITE</span>
            </button>
          </div>
        </div>
      )}

      {/* PHASE 4: SURFACE DESCENT & INTERACTIVE STORY EXPERIENCE */}
      {storyPhase === 'surface' && (
        <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
          {/* Surface HUD Top Navigation */}
          <div className="flex items-center justify-between bg-[#070b14]/90 p-3.5 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#10b981]"></span>
              <div>
                <span className="text-xs font-mono text-slate-400 block uppercase">TOUCHDOWN SITE</span>
                <span className="text-sm font-display font-bold text-white flex items-center gap-2">
                  {selectedSite.name} ({selectedSite.lat.toFixed(1)}°S) • {selectedCraft.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setStoryPhase('selection')}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 text-xs font-mono transition-colors"
              >
                Change Target / Lander
              </button>
              <button
                onClick={onSwitchToPlanner}
                className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(56,189,248,0.3)]"
              >
                Open Side-by-Side Mission Control ↗
              </button>
            </div>
          </div>

          {/* 3D Scene of Lunar Surface */}
          <div className="relative rounded-3xl overflow-hidden border border-sky-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
            <ScenePanel
              siteId={selectedSite.id}
              terrainType={selectedSite.terrainType}
              sunEl={live.sunEl}
              sunAz={live.sunAz}
              earthEl={live.earthEl}
              earthAz={live.earthAz}
              viewMode="orbit"
              quality="high"
              label={`${selectedSite.name} • ${selectedCraft.name}`}
              landerHeight={selectedCraft.height}
            />

            {/* In-Scene Floating Telemetry Badges */}
            <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2 pointer-events-none">
              <div className="bg-black/75 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md text-[11px] font-mono">
                <span className="text-slate-400 block text-[9px]">SOLAR ANGLE</span>
                <span className={live.sunEl > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}° (Day)` : `${live.sunEl.toFixed(1)}° (Night)`}
                </span>
              </div>
              <div className="bg-black/75 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md text-[11px] font-mono">
                <span className="text-slate-400 block text-[9px]">EARTH DIRECT LOS</span>
                <span className={live.earthEl > 0 ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {live.earthEl > 0 ? `+${live.earthEl.toFixed(1)}° (Direct Line)` : 'Blocked by Terrain'}
                </span>
              </div>
              <div className="bg-black/75 border border-white/15 px-3 py-1.5 rounded-xl backdrop-blur-md text-[11px] font-mono">
                <span className="text-slate-400 block text-[9px]">BATTERY SoC</span>
                <span className={chargePercent > 20 ? 'text-sky-300 font-bold' : 'text-red-400 font-bold'}>
                  {chargePercent}% ({chargeAtHour} Wh)
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Passage of Time Scrubber */}
          <div className="bg-[#070b14]/90 p-4 rounded-3xl border border-white/10 space-y-3 backdrop-blur-md shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                    isPlaying
                      ? 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                  }`}
                >
                  {isPlaying ? '⏸ PAUSE SIMULATION' : '▶ WATCH 14 LUNAR DAYS'}
                </button>
                <button
                  onClick={() => setTRel(0)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-mono"
                >
                  ↺ Day 0
                </button>
              </div>

              {/* Telemetry Clock */}
              <div className="font-mono text-xs text-slate-200">
                Sortie Progress: <strong className="text-sky-400">T+{currentHour}h</strong> ({currentDay} days)
              </div>
            </div>

            {/* Slider */}
            <div className="relative pt-1">
              <input
                type="range"
                min={0}
                max={durationHours}
                step={0.5}
                value={tRel}
                onChange={(e) => setTRel(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-sky-400 border border-white/10"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1">
                <span>Touchdown (Day 0)</span>
                <span>Day 7 (Mid-Mission)</span>
                <span>Day 14 (Sortie End)</span>
              </div>
            </div>
          </div>

          {/* NASA Flight Verdict & Answers */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-black/50 rounded-2xl border border-sky-500/20 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                NASA Criterion 1: Solar Power
              </span>
              <div className="text-sm font-bold text-white">
                {(stats.sunlitFraction * 100).toFixed(0)}% Illuminated ({stats.sunlitHours}h)
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                {stats.longestDarkHours <= 48
                  ? `Peak darkness is only ${stats.longestDarkHours}h. Well within spacecraft battery capacity.`
                  : `Extended blackout of ${stats.longestDarkHours}h threatens battery depletion.`}
              </p>
            </div>

            <div className="p-4 bg-black/50 rounded-2xl border border-emerald-500/20 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                NASA Criterion 2: Earth Direct RF Link
              </span>
              <div className="text-sm font-bold text-white">
                {(stats.earthVisibleFraction * 100).toFixed(0)}% Line-of-Sight
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                {stats.earthVisibleFraction >= 0.5
                  ? `Direct high-bandwidth communications to Deep Space Network established.`
                  : `Frequent occultations require orbital relay satellite assistance.`}
              </p>
            </div>

            <div className="p-4 bg-black/50 rounded-2xl border border-amber-500/20 space-y-1">
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                Mission Viability Verdict
              </span>
              <div className={`text-sm font-bold font-mono ${
                verdict.level === 'viable' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                {verdict.level === 'viable' ? '✓ FLIGHT VIABLE (GO)' : '⚠ HIGH RISK / MARGINAL'}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
                {batterySim.survivedHours >= durationHours
                  ? `Battery survives all 14 days with min reserve ${batterySim.minChargeWh} Wh.`
                  : `Warning: Battery exhausts in blackout!`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StoryMode;
