import React, { useState } from 'react';
import { VerdictBadge } from './VerdictBadge.jsx';

export function RoutePlannerTab({ selectedSite, verdict, stats, liveAngles, onSeekTime, tRel }) {
  const [fromLocation, setFromLocation] = useState('Lander Touchdown Pad Alpha');
  const [toLocation, setToLocation] = useState('Station 1: High Ridge Ejecta');
  const [stops, setStops] = useState([]);
  const [departTime, setDepartTime] = useState('06:00');
  const [roundtrip, setRoundtrip] = useState(true);
  const [avoidSteep, setAvoidSteep] = useState(true);

  const addStop = () => {
    setStops([...stops, `Waypoint ${stops.length + 1}: Crater Rim Crest`]);
  };

  const removeStop = (idx) => {
    setStops(stops.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      <div>
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
          Lunar Traverse Planner
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Plan EVAs across polar crater topography. Evaluates solar elevation, shadowed depressions, slope angles, and life support consumables.
        </p>
      </div>

      {/* From / Stops / To Inputs */}
      <div className="space-y-2 bg-[#171311]/90 p-3.5 rounded-xl border border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
          <input
            type="text"
            value={fromLocation}
            onChange={(e) => setFromLocation(e.target.value)}
            className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            placeholder="Starting Point"
          />
        </div>

        {stops.map((stop, i) => (
          <div key={i} className="flex items-center gap-2 pl-4 border-l border-white/10">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <input
              type="text"
              value={stop}
              readOnly
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-300 font-mono"
            />
            <button
              onClick={() => removeStop(i)}
              className="text-slate-500 hover:text-red-400 px-1.5"
            >
              ✕
            </button>
          </div>
        ))}

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>
          <input
            type="text"
            value={toLocation}
            onChange={(e) => setToLocation(e.target.value)}
            className="flex-1 bg-black/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
            placeholder="Destination Target"
          />
        </div>

        <button
          onClick={addStop}
          className="text-sky-400 hover:text-sky-300 font-mono text-[11px] pt-1 pl-4 flex items-center gap-1"
        >
          + Add Science Station Waypoint
        </button>
      </div>

      {/* Route Options */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
        <label className="flex items-center gap-2 p-2 bg-[#171311] rounded-lg border border-white/10 cursor-pointer">
          <input
            type="checkbox"
            checked={roundtrip}
            onChange={(e) => setRoundtrip(e.target.checked)}
            className="accent-sky-500"
          />
          <span>Return to Lander</span>
        </label>

        <label className="flex items-center gap-2 p-2 bg-[#171311] rounded-lg border border-white/10 cursor-pointer" title="Avoid slopes >15°">
          <input
            type="checkbox"
            checked={avoidSteep}
            onChange={(e) => setAvoidSteep(e.target.checked)}
            className="accent-sky-500"
          />
          <span>Avoid Slopes &gt;15°</span>
        </label>
      </div>

      {/* Flight Summary Card */}
      <div className="bg-[#171311] p-4 rounded-xl border border-white/10 space-y-3">
        <div className="flex justify-between items-baseline">
          <div>
            <div className="text-2xl font-bold font-mono text-white">
              4.8 <span className="text-sm font-normal text-slate-400">km</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Estimated Sortie: <strong>3h 15m</strong> (at 1.5 km/h)
            </div>
          </div>
          <VerdictBadge verdict={verdict} compact />
        </div>

        {/* Live Elevation Angle Readouts */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px] font-mono">
          <div className="p-2 bg-black/50 rounded-lg">
            <span className="text-slate-500 block text-[9px]">SOLAR ELEVATION</span>
            <span className={liveAngles?.sunEl > 0 ? 'text-[#ffd25a] font-bold' : 'text-slate-400'}>
              {liveAngles ? `${liveAngles.sunEl.toFixed(1)}°` : '+2.4°'}
            </span>
          </div>
          <div className="p-2 bg-black/50 rounded-lg">
            <span className="text-slate-500 block text-[9px]">EARTH DIRECT LOS</span>
            <span className="text-emerald-400 font-bold">
              {liveAngles ? `${liveAngles.earthEl.toFixed(1)}° DIRECT` : '+8.6° DIRECT'}
            </span>
          </div>
        </div>

        {/* O2 / Life Support Reserve Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Primary Oxygen Consumption</span>
            <span className="text-white font-bold">38% Used (62% Reserve)</span>
          </div>
          <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/10">
            <div className="h-full bg-sky-400 rounded-full" style={{ width: '38%' }}></div>
          </div>
        </div>
      </div>

      {/* Turn-by-Turn Waypoints */}
      <div className="space-y-1.5 pt-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
          Traverse Stations & Directions
        </span>
        <div className="space-y-1 text-xs">
          <div className="p-2.5 bg-[#171311] rounded-lg border border-white/10 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-bold flex items-center justify-center text-[10px] shrink-0">
              A
            </span>
            <div>
              <div className="font-semibold text-slate-200">Depart Lander Touchdown Alpha</div>
              <div className="text-[10px] text-slate-400 font-mono">Head 140° SE along illuminated crater rim (0.0 km)</div>
            </div>
          </div>

          <div className="p-2.5 bg-[#171311] rounded-lg border border-white/10 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-500 text-black font-bold flex items-center justify-center text-[10px] shrink-0">
              1
            </span>
            <div>
              <div className="font-semibold text-slate-200">Station 1: High Ridge Ejecta</div>
              <div className="text-[10px] text-slate-400 font-mono">Deploy solar power repeater pylon; sample bedrock (2.2 km)</div>
            </div>
          </div>

          <div className="p-2.5 bg-[#171311] rounded-lg border border-white/10 flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-red-500 text-black font-bold flex items-center justify-center text-[10px] shrink-0">
              B
            </span>
            <div>
              <div className="font-semibold text-slate-200">Rim Crest Overlook Terminal</div>
              <div className="text-[10px] text-slate-400 font-mono">Permanent line-of-sight to Earth; reverse traverse (4.8 km)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoutePlannerTab;
