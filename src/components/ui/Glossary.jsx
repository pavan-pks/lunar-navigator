import React, { useState } from 'react';

export const GLOSSARY_TERMS = [
  {
    term: 'Solar Elevation',
    definition: 'The angular height of the Sun above the local lunar horizon plane. 0° represents the true horizon, 90° is directly overhead at zenith, and negative values indicate nighttime.'
  },
  {
    term: 'Solar Azimuth',
    definition: 'The compass bearing of the Sun measured in degrees clockwise from lunar North: 0° is North, 90° is East, 180° is South, and 270° is West.'
  },
  {
    term: 'Lunar Terminator',
    definition: 'The moving boundary dividing the illuminated daylight hemisphere from the dark nocturnal hemisphere. It advances at approximately 15.4 km/h at the equator and slows to a walking pace near the poles.'
  },
  {
    term: 'Optical Libration',
    definition: 'The apparent wobble of the Moon caused by its elliptical orbit and tilted axis. Libration allows ground observers to see up to 59% of the total lunar surface over time, periodically raising and lowering Earth above the horizon at high latitudes.'
  },
  {
    term: 'PSR (Permanently Shadowed Region)',
    definition: 'Depressed crater basins near the lunar poles whose floors have not received sunlight in billions of years. Temperatures drop below 40 Kelvin (-233°C), trapping volatile water ice reserves.'
  },
  {
    term: 'Peaks of Eternal Light (PEL)',
    definition: 'Elevated topographic rims and massifs near the poles that receive nearly continuous solar illumination (>80-90% of the year), making them premier candidates for Artemis lunar bases.'
  }
];

/**
 * src/components/ui/Glossary.jsx
 * Interactive lunar terminology modal and reference drawer.
 */
export function Glossary({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📖</span>
            <h3 className="font-bold text-white text-base">Lunar Astronomy Glossary</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1 text-xs">
          {GLOSSARY_TERMS.map((item) => (
            <div key={item.term} className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 space-y-1">
              <span className="font-bold text-sky-400 font-mono text-xs block">{item.term}</span>
              <p className="text-slate-300 leading-relaxed text-[11px]">{item.definition}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Glossary
          </button>
        </div>
      </div>
    </div>
  );
}

export default Glossary;
