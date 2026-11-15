import React, { useState } from 'react';
import { X } from 'lucide-react';
import { computeEphemerisRange } from '../../lib/validation.js';

/**
 * Data & Assumptions Popover.
 * Discloses astronomical ephemeris provenance, mathematical model limits, and coverage bounds.
 * Restrained engineering aesthetic without marketing or sci-fi decoration.
 */
export function DataAssumptionsPopover({ ephem, missionValidation }) {
  const [isOpen, setIsOpen] = useState(false);
  const range = computeEphemerisRange(ephem);

  const startFmt = range.startDate ? range.startDate.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'N/A';
  const endFmt = range.endDate ? range.endDate.toISOString().replace('T', ' ').slice(0, 16) + ' UTC' : 'N/A';

  return (
    <div className="relative inline-block text-xs font-mono">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`px-2 py-1 rounded border transition-colors flex items-center gap-1.5 ${
          missionValidation?.isOutsideRange
            ? 'bg-amber-950/40 border-amber-500/60 text-amber-300 hover:bg-amber-900/50'
            : 'bg-neutral-900/80 border-neutral-700/60 text-neutral-300 hover:border-neutral-500 hover:text-white'
        }`}
        title="View ephemeris dataset provenance and physical assumptions"
        aria-expanded={isOpen}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 inline-block" />
        <span>Data & Assumptions</span>
        {missionValidation?.isOutsideRange && (
          <span className="text-[10px] text-amber-400 font-semibold">[RANGE CLAMPED]</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-80 sm:w-96 p-3.5 bg-neutral-950 border border-neutral-800 rounded shadow-2xl z-50 text-[11px] text-neutral-300 space-y-2.5 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
            <span className="font-semibold text-neutral-100 tracking-wider uppercase text-[10px]">
              Mission Data & Assumptions
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-neutral-500 hover:text-neutral-200 text-xs px-1 flex items-center justify-center cursor-pointer"
              aria-label="Close popover"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {missionValidation?.isOutsideRange && (
            <div className="p-2 bg-amber-950/60 border border-amber-600/60 rounded text-amber-200 text-[10px] leading-tight space-y-1">
              <div className="font-bold uppercase tracking-wider">Warning: Outside Ephemeris Coverage</div>
              {missionValidation.warnings.map((w, idx) => (
                <div key={idx}>{w}</div>
              ))}
            </div>
          )}

          <div className="space-y-1.5">
            <div>
              <div className="text-neutral-500 text-[10px] uppercase">Ephemeris Source</div>
              <div className="text-neutral-200 font-medium">NASA/JPL Horizons System (target Moon, observer geocenter)</div>
            </div>

            <div>
              <div className="text-neutral-500 text-[10px] uppercase">Ephemeris Coverage Range</div>
              <div className="text-neutral-200">
                {startFmt} – {endFmt} ({range.totalHours.toLocaleString()} hours, {range.stepHours}h step)
              </div>
            </div>

            <div>
              <div className="text-neutral-500 text-[10px] uppercase">Astronomical Model</div>
              <div className="text-neutral-200">
                Smooth-sphere model (R = 1,737.4 km), no terrain occlusion. Sun elevation &gt; -0.27° defines sunrise.
              </div>
            </div>

            <div>
              <div className="text-neutral-500 text-[10px] uppercase">3D Visualization</div>
              <div className="text-neutral-200">
                Illustrative 3D terrain and lighting. Global coordinates verified against JPL topocentric vectors.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataAssumptionsPopover;
