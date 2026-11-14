import React from 'react';

export const LUNAR_MISSIONS = [
  {
    id: 'shackleton-eva',
    title: 'Shackleton Rim Traverse: Peak of Eternal Light',
    siteName: 'Shackleton Rim (-89.9° S)',
    goal: 'Traverse along the rim crest to deploy a solar communications repeater and sample anorthosite impact melt.',
    distanceKm: 4.8,
    durationHours: 5.5,
    stops: ['Lander Touchdown Alpha', 'Station 1: High Ridge Ejecta', 'Station 2: Solar Repeater Pylon', 'Station 3: Rim Crest Overlook'],
    kit: 'Hammer, core tubes, solar repeater payload, xEMU suit'
  },
  {
    id: 'malapert-summit',
    title: 'Malapert Mountain Summit Ascent',
    siteName: 'Malapert Massif (-85.0° S)',
    goal: 'Ascend the 5,000-meter elevation massif to verify uninterrupted Earth Line-of-Sight for primary lunar base relay.',
    distanceKm: 7.2,
    durationHours: 6.8,
    stops: ['Base Camp Foot', 'Station 1: Geotechnical Slope Anchor', 'Station 2: Earth Direct RF Beacon', 'Station 3: Summit Peak'],
    kit: 'Survey LIDAR, RF signal test rig, lunar rock drill'
  },
  {
    id: 'haworth-ice',
    title: 'Haworth Crater Cryogenic Ice Core EVA',
    siteName: 'Haworth Crater (-87.4° S)',
    goal: 'Descend into the Permanently Shadowed Region (40 Kelvin) to extract volatile water ice cores.',
    distanceKm: 3.4,
    durationHours: 4.2,
    stops: ['Illuminated Rim Deck', 'Station 1: Shadow Perimeter', 'Station 2: Cryo-Drill Site Alpha', 'Station 3: Volatile Ice Core Beta'],
    kit: 'Vacuum cryo-sample canisters, heated glove liners, 1m rotary percussive drill'
  },
  {
    id: 'viper-prospect',
    title: 'VIPER Rover Volatiles Scouting Route',
    siteName: 'VIPER South Pole Ridge (-85.5° S)',
    goal: 'Traverse connecting ridges between Shackleton and de Gerlache to map subsurface hydrogen with NIRVSS and MSolo.',
    distanceKm: 12.5,
    durationHours: 8.0,
    stops: ['Lander Deployment Pad', 'Waypoint 1: Neutron Spectrometer Hotspot', 'Waypoint 2: Drill Deployment Site', 'Waypoint 3: Safe Sun Haven'],
    kit: 'TRIDENT Drill, NIRVSS Spectrometer, MSolo Mass Spectrometer'
  },
  {
    id: 'apollo11-retro',
    title: 'Apollo 11 Historical Retrospective',
    siteName: 'Sea of Tranquility (0.67° N, 23.47° E)',
    goal: 'Historic 2.5-hour lunar surface EVA re-evaluating solar elevation (14.5°), shadow lengths, and EASEP deployment.',
    distanceKm: 1.1,
    durationHours: 2.5,
    stops: ['LM Eagle', 'PSEP Seismic Package', 'Laser Ranging Retroreflector (LRRR)', 'Little West Crater (Double Rim)'],
    kit: 'Lunar TV camera, solar wind composition foil, sample collection tongs'
  }
];

export function MissionsTab({ onSelectMission }) {
  return (
    <div className="space-y-4 text-xs font-sans">
      <div>
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
          Artemis III Science EVAs
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Operational lunar surface walks designed for Artemis candidate landing regions. Each sortie includes science objectives, station waypoints, and payload equipment.
        </p>
      </div>

      <div className="space-y-3">
        {LUNAR_MISSIONS.map((m) => (
          <div
            key={m.id}
            className="p-3.5 bg-[#171311]/90 rounded-xl border border-white/10 hover:border-sky-500/40 transition-all space-y-2.5 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-amber-400 font-mono font-bold block">{m.siteName}</span>
                <h3 className="font-semibold text-slate-100 text-xs mt-0.5">{m.title}</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                {m.distanceKm} km • {m.durationHours}h
              </span>
            </div>

            <p className="text-[11px] text-slate-300 leading-relaxed">
              {m.goal}
            </p>

            <div className="space-y-1 text-[10px] text-slate-400 font-mono">
              <div>
                <span className="text-slate-500">Waypoints:</span> {m.stops.join(' → ')}
              </div>
              <div>
                <span className="text-slate-500">Equipment:</span> {m.kit}
              </div>
            </div>

            <button
              onClick={() => onSelectMission && onSelectMission(m)}
              className="w-full py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/40 text-sky-300 border border-sky-500/30 font-medium text-xs transition cursor-pointer"
            >
              Load This EVA into Planner →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MissionsTab;
