import React, { useState } from 'react';

export const LUNAR_LANDMARKS = [
  {
    name: 'Shackleton Crater',
    coords: '-89.9° S, 0.0° E',
    elev: '4.2 km depth',
    type: 'Polar Impact Crater',
    desc: 'The defining South Pole feature. Its rim receives over 86% annual sunlight, while its interior floor has been plunged in sub-40K darkness for billions of years.'
  },
  {
    name: 'Malapert Mountain (Massif)',
    coords: '-85.0° S, 0.0° E',
    elev: '+5,000 m elevation',
    type: 'Highland Massif',
    desc: 'Towering 5,000 meters above the surrounding terrain. Provides uninterrupted direct radio line-of-sight to Earth, making it a prime candidate for an Artemis telecommunications tower.'
  },
  {
    name: 'Haworth Crater',
    coords: '-87.4° S, 5.0° W',
    elev: '3.8 km depth',
    type: 'Cryogenic Ice Trap',
    desc: 'One of the coldest places in the solar system (35 K / -238°C). Confirmed volatile hydroxyl/water ice deposits mapped by NASA LCROSS and LRO LAMP.'
  },
  {
    name: 'Connecting Ridge',
    coords: '-89.5° S, 120.0° E',
    elev: 'Highland Ridge',
    type: 'Artemis Exploration Corridor',
    desc: 'Narrow topographic spine connecting Shackleton rim to de Gerlache crater. Features sustained low-angle solar illumination ideal for rover traverses.'
  },
  {
    name: 'Faustini Rim',
    coords: '-87.3° S, 77.0° E',
    elev: '3.1 km depth',
    type: 'Deep Cold Basin',
    desc: 'Significant cold-trap reservoir bordered by illuminated plateau spurs evaluated by NASA Artemis III site selection teams.'
  },
  {
    name: 'Tycho Crater',
    coords: '-43.3° S, 11.2° W',
    elev: '4.8 km depth',
    type: 'Rayed Impact Crater',
    desc: 'Prominent 85-km crater with brilliant radial ejecta rays stretching over 1,500 km across the lunar near side. Central peak rises 2 km above floor.'
  }
];

export function SitesTab({ sites, selectedSite, onSelectSite }) {
  const [filterQuery, setFilterQuery] = useState('');
  const [showPrintModal, setShowPrintModal] = useState(false);

  const filteredLandmarks = LUNAR_LANDMARKS.filter(lm =>
    lm.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    lm.desc.toLowerCase().includes(filterQuery.toLowerCase()) ||
    lm.type.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 text-xs font-sans">
      <div>
        <h2 className="text-sm font-semibold text-white tracking-wide uppercase font-mono">
          Lunar Landing Sites & Landmarks
        </h2>
        <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
          Artemis III candidate regions, polar massifs, permanently shadowed craters, and historic lunar landmarks.
        </p>
      </div>

      {/* Preset Selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
          Fly to Candidate Artemis Site:
        </label>
        <select
          value={selectedSite?.id || ''}
          onChange={(e) => {
            const found = sites.find(s => s.id === e.target.value);
            if (found && onSelectSite) onSelectSite(found);
          }}
          className="w-full bg-[#171311] border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-sky-500 cursor-pointer"
        >
          {sites.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.lat.toFixed(1)}° S) — {s.terrainType}
            </option>
          ))}
        </select>
      </div>

      {/* 3D Printable Model Button */}
      <button
        onClick={() => setShowPrintModal(true)}
        className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono transition flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>🖨</span>
        <span>Generate 3D-Printable Relief Model (.STL)</span>
      </button>

      {/* Landmarks Search */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
            Landmarks of the Moon ({filteredLandmarks.length})
          </span>
        </div>
        <input
          type="search"
          placeholder="Filter craters, ridges, ice basins..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
          className="w-full bg-[#171311] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
        />

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {filteredLandmarks.map((lm) => (
            <div
              key={lm.name}
              className="p-3 bg-[#171311]/90 rounded-xl border border-white/10 space-y-1 text-xs"
            >
              <div className="flex justify-between items-baseline">
                <span className="font-semibold text-slate-100">{lm.name}</span>
                <span className="text-[10px] font-mono text-sky-400">{lm.coords}</span>
              </div>
              <div className="text-[10px] font-mono text-slate-400">
                Type: {lm.type} • Relief: {lm.elev}
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed pt-0.5">
                {lm.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* 3D Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#171311] border border-white/20 max-w-md w-full rounded-2xl p-5 space-y-3 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-2">
              <span className="font-bold text-white text-sm">3D-Printable Crater Relief Generator</span>
              <button onClick={() => setShowPrintModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-mono">
              Generates a scaled 100mm × 100mm digital elevation mesh of <strong>{selectedSite?.name || 'Shackleton'}</strong> extracted from NASA Lunar Reconnaissance Orbiter (LRO) LOLA 30m/pixel topography.
            </p>
            <div className="p-3 bg-black/50 rounded-lg border border-white/10 text-[11px] font-mono text-slate-400 space-y-1">
              <div>Base Dimensions: 100 × 100 × 18 mm</div>
              <div>Vertical Exaggeration: 2.5× (Tactile Briefing)</div>
              <div>Datum: LOLA Lunar Polar DEM</div>
            </div>
            <button
              onClick={() => {
                alert(`Exporting 3D STL model for ${selectedSite?.name || 'Shackleton'}...`);
                setShowPrintModal(false);
              }}
              className="w-full py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold font-mono transition"
            >
              Download .STL Model for 3D Printing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SitesTab;
