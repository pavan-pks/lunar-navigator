import React, { useState } from 'react';

/**
 * src/components/ui/CrewTab.jsx
 * xEMU spacesuit consumables, bioenergetics in lunar 1/6 g, buddy pair management.
 */
export function CrewTab() {
  const [suitState, setSuitState] = useState({
    o2Pct: 92,
    batteryPct: 86,
    waterPct: 88,
    co2Hours: 7.5,
    bodyKg: 78,
    loadKg: 25,
    crew: '2', // buddy pair
    rover: 'lrv', // open rover
    o2Pct2: 89,
    batteryPct2: 84,
    waterPct2: 90,
    co2Hours2: 7.2
  });

  const [isEditing, setIsEditing] = useState(false);

  // Metabolic burn rate in 1/6 g (0.166 g)
  // Base walking power = (body + load) * g_moon * velocity * terrain_factor
  const metabolicWatts = Math.round(
    (suitState.bodyKg + suitState.loadKg) * 1.62 * 1.2 * 1.35 * (suitState.rover === 'none' ? 1.0 : 0.6)
  );

  return (
    <div className="space-y-4 text-xs font-sans">
      <div>
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
          Crew & xEMU Spacesuits
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Real-time consumables tracking for Artemis lunar exploration teams. Effort calculations incorporate lunar gravity (0.166 g) and spacesuit joint stiffness.
        </p>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-2 text-xs font-mono">
        <span className="px-2.5 py-1 rounded-full bg-[#171311] border border-white/10 text-slate-300">
          O₂: <strong className="text-white">{Math.min(suitState.o2Pct, suitState.o2Pct2)}%</strong> (Limiting)
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#171311] border border-white/10 text-slate-300">
          Power: <strong className="text-[#ffd25a]">{Math.min(suitState.batteryPct, suitState.batteryPct2)}%</strong>
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#171311] border border-white/10 text-slate-300">
          Metabolic: <strong className="text-sky-300">{metabolicWatts} W</strong>
        </span>
        <span className="px-2.5 py-1 rounded-full bg-[#171311] border border-white/10 text-slate-300">
          Team: <strong className="text-emerald-400">{suitState.crew === '2' ? 'Buddy Pair' : 'Solo'}</strong>
        </span>
      </div>

      {/* EV1 & EV2 Consumable Bars */}
      <div className="space-y-3 bg-[#171311]/90 p-3.5 rounded-xl border border-white/10">
        <div className="flex justify-between items-center text-[11px] font-mono border-b border-white/10 pb-1.5">
          <span className="text-slate-300 font-bold">EV-1 (Lead Astronaut)</span>
          <span className="text-sky-400">Artemis xEMU Suit</span>
        </div>

        {/* O2 Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Primary Oxygen Supply</span>
            <span className="text-white font-bold">{suitState.o2Pct}%</span>
          </div>
          <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-sky-400 rounded-full" style={{ width: `${suitState.o2Pct}%` }}></div>
          </div>
        </div>

        {/* Battery Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Suit Electronics Battery</span>
            <span className="text-[#ffd25a] font-bold">{suitState.batteryPct}%</span>
          </div>
          <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-[#ffd25a] rounded-full" style={{ width: `${suitState.batteryPct}%` }}></div>
          </div>
        </div>

        {/* Cooling Water */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Sublimator Water Loop</span>
            <span className="text-slate-200 font-bold">{suitState.waterPct}%</span>
          </div>
          <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-slate-300 rounded-full" style={{ width: `${suitState.waterPct}%` }}></div>
          </div>
        </div>
      </div>

      {/* EV2 Buddy */}
      {suitState.crew === '2' && (
        <div className="space-y-3 bg-[#171311]/90 p-3.5 rounded-xl border border-white/10">
          <div className="flex justify-between items-center text-[11px] font-mono border-b border-white/10 pb-1.5">
            <span className="text-slate-300 font-bold">EV-2 (Buddy Astronaut)</span>
            <span className="text-amber-400">Artemis xEMU Suit</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Primary Oxygen Supply</span>
              <span className="text-white font-bold">{suitState.o2Pct2}%</span>
            </div>
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-sky-400 rounded-full" style={{ width: `${suitState.o2Pct2}%` }}></div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Suit Electronics Battery</span>
              <span className="text-[#ffd25a] font-bold">{suitState.batteryPct2}%</span>
            </div>
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
              <div className="h-full bg-[#ffd25a] rounded-full" style={{ width: `${suitState.batteryPct2}%` }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Toggle */}
      <div className="pt-1">
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="text-xs text-sky-400 hover:text-sky-300 font-mono transition cursor-pointer flex items-center gap-1"
        >
          <span>{isEditing ? '▼ Hide Suit Calibration' : '▶ Calibrate Consumables & Vehicle'}</span>
        </button>

        {isEditing && (
          <div className="mt-3 p-3 bg-black/60 rounded-xl border border-white/10 space-y-3 text-[11px] font-mono">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 block mb-0.5">EVA Team Model</label>
                <select
                  value={suitState.crew}
                  onChange={(e) => setSuitState({ ...suitState, crew: e.target.value })}
                  className="w-full bg-[#171311] border border-white/10 rounded p-1.5 text-slate-200"
                >
                  <option value="2">Two (Buddy Pair)</option>
                  <option value="1">One (Solo Astronaut)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-0.5">Surface Mobility</label>
                <select
                  value={suitState.rover}
                  onChange={(e) => setSuitState({ ...suitState, rover: e.target.value })}
                  className="w-full bg-[#171311] border border-white/10 rounded p-1.5 text-slate-200"
                >
                  <option value="lrv">Lunar Terrain Vehicle (LTV Open)</option>
                  <option value="none">Foot Traverse Only</option>
                  <option value="pressurized">Pressurized Rover</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => setSuitState({
                ...suitState,
                o2Pct: 100,
                batteryPct: 100,
                waterPct: 100,
                co2Hours: 8.0,
                o2Pct2: 100,
                batteryPct2: 100,
                waterPct2: 100,
                co2Hours2: 8.0
              })}
              className="w-full py-1.5 rounded bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition"
            >
              Fresh Suits (Refill All to 100%)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CrewTab;
