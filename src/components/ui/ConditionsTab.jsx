import React from 'react';
import { getLunarTime } from '../../lib/lunarTime.js';

export function ConditionsTab({ liveAngles, selectedSite, stats }) {
  const lunarTime = getLunarTime();

  return (
    <div className="space-y-4 text-xs font-sans">
      <div>
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
          Environmental Conditions & Space Weather
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Real-time astronomical ephemeris and space environment metrics for {selectedSite?.name || 'South Pole'}.
        </p>
      </div>

      {/* Grid of Key Numerical Conditions */}
      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div className="p-3 bg-[#171311] rounded-xl border border-white/10 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase block">Solar Elevation</span>
          <span className="text-lg font-bold text-[#ffd25a]">
            {liveAngles?.sunEl !== undefined ? `+${liveAngles.sunEl.toFixed(1)}°` : '+2.4°'}
          </span>
          <span className="text-[10px] text-slate-400 block">Horizon Grazing Beam</span>
        </div>

        <div className="p-3 bg-[#171311] rounded-xl border border-white/10 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase block">Earth Radio LOS</span>
          <span className="text-lg font-bold text-emerald-400">
            {liveAngles?.earthEl !== undefined ? `+${liveAngles.earthEl.toFixed(1)}°` : '+8.6°'}
          </span>
          <span className="text-[10px] text-slate-400 block">Direct Line-of-Sight</span>
        </div>

        <div className="p-3 bg-[#171311] rounded-xl border border-white/10 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase block">Earth Distance</span>
          <span className="text-lg font-bold text-white">
            {lunarTime.distKm.toLocaleString()} <span className="text-xs font-normal text-slate-400">km</span>
          </span>
          <span className="text-[10px] text-slate-400 block">Latency: {lunarTime.lightSeconds}s light delay</span>
        </div>

        <div className="p-3 bg-[#171311] rounded-xl border border-white/10 space-y-0.5">
          <span className="text-[10px] text-slate-500 uppercase block">Lunar Phase</span>
          <span className="text-lg font-bold text-sky-300">
            {lunarTime.illumPct}%
          </span>
          <span className="text-[10px] text-slate-400 block">{lunarTime.phaseName}</span>
        </div>
      </div>

      {/* Space Weather Status */}
      <div className="space-y-2 bg-[#171311] p-3.5 rounded-xl border border-white/10">
        <div className="flex justify-between items-center text-[11px] font-mono border-b border-white/10 pb-1.5">
          <span className="text-slate-300 font-bold uppercase">Solar Activity & Radiation</span>
          <span className="text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            ALL CLEAR (GO)
          </span>
        </div>
        <div className="space-y-1.5 font-mono text-[11px] text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Solar Proton Event (SPE):</span>
            <span className="text-emerald-400 font-bold">Quiet (&lt;0.5 pfu)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Galactic Cosmic Rays (GCR):</span>
            <span>0.28 mSv/day (Nominal background)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Micrometeorite Risk:</span>
            <span>Nominal (No active meteor stream)</span>
          </div>
        </div>
      </div>

      {/* What Orbiters Found Here */}
      <div className="space-y-2 bg-[#171311] p-3.5 rounded-xl border border-white/10">
        <span className="text-slate-300 font-bold text-[11px] font-mono uppercase block border-b border-white/10 pb-1.5">
          Orbital Science Findings ({selectedSite?.name || 'South Pole'})
        </span>
        <div className="space-y-2 text-[11px] text-slate-300 leading-relaxed font-mono">
          <p>
            • <strong className="text-white">LRO LAMP Far-UV Albedo:</strong> Confirms surface frost concentrations of 1.5–3.5% water equivalent hydrogen within adjacent shadowed crater floors.
          </p>
          <p>
            • <strong className="text-white">LOLA Slope Geomechanics:</strong> Rim flanks maintain 8°–14° slopes navigable by uncrewed robotic rovers and suited crew.
          </p>
          <p>
            • <strong className="text-white">Diviner Radiometer:</strong> Nighttime thermal trough drops to 40 K (-233°C). Requires active 20W electrical survival heater.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ConditionsTab;
