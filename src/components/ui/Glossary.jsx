import React, { useState } from 'react';
import { BookOpen, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#050914] border border-sky-500/30 max-w-xl w-full rounded-3xl p-6 shadow-[0_16px_50px_rgba(0,0,0,0.9)] space-y-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-sky-400" />
            <h3 className="font-display font-bold text-white text-base">Lunar Astronomy & Navigation Lexicon</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center transition-colors cursor-pointer border border-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto space-y-3 pr-1 text-xs">
          {GLOSSARY_TERMS.map((item) => (
            <div key={item.term} className="p-3.5 bg-black/60 rounded-2xl border border-white/5 space-y-1">
              <span className="font-bold text-sky-400 font-mono text-xs block">{item.term}</span>
              <p className="text-slate-300 leading-relaxed text-[11px] font-mono">{item.definition}</p>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-white/10 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.3)]"
          >
            Close Lexicon
          </button>
        </div>
      </div>
    </div>
  );
}

export default Glossary;
