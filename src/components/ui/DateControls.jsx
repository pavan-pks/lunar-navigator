import React from 'react';
import { landingDate } from '../../lib/metrics.js';

/**
 * src/components/ui/DateControls.jsx
 * Mission launch date, transit duration, landing date calculation, and launch slip slider.
 */
export function DateControls({
  launchDate,
  onLaunchDateChange,
  transitDays,
  onTransitDaysChange,
  missionDays,
  onMissionDaysChange,
  slipDays = 0,
  onSlipDaysChange,
  showSlipSlider = false,
  slipDeltaSummary = null,
  colorVariant = 'sky'
}) {
  const landing = landingDate(launchDate, transitDays);
  const launchStr = typeof launchDate === 'string' ? launchDate.slice(0, 10) : launchDate.toISOString().slice(0, 10);
  const landingStr = landing.toISOString().slice(0, 10);

  const accentColor = colorVariant === 'amber' ? 'text-amber-400' : 'text-sky-400';
  const borderFocus = colorVariant === 'amber' ? 'focus:border-amber-500' : 'focus:border-sky-500';

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (val) {
      onLaunchDateChange(`${val}T00:00:00Z`);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Launch Date */}
        <div>
          <label className="text-slate-400 font-medium block mb-1">Earth Launch Date</label>
          <input
            type="date"
            min="2027-01-01"
            max="2028-01-10"
            value={launchStr}
            onChange={handleDateChange}
            className={`w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs focus:outline-none ${borderFocus}`}
          />
        </div>

        {/* Transit Days */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-slate-400 font-medium">Earth-Moon Transit</label>
            <span className="font-mono text-slate-300">{transitDays} days</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={transitDays}
              onChange={(e) => onTransitDaysChange(parseInt(e.target.value, 10))}
              className="flex-1 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>
        </div>
      </div>

      {/* Computed Landing Date Banner */}
      <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800/80 font-mono text-[11px]">
        <span className="text-slate-400">Lunar Touchdown:</span>
        <span className={`font-bold ${accentColor}`}>
          {landingStr} 00:00 UTC
        </span>
      </div>

      {/* Mission Window Days */}
      {onMissionDaysChange && (
        <div className="flex items-center justify-between pt-1">
          <label className="text-slate-400">Mission Window:</label>
          <div className="flex items-center gap-2">
            {[7, 14, 21, 28].map((days) => (
              <button
                key={days}
                onClick={() => onMissionDaysChange(days)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  missionDays === days
                    ? 'bg-slate-800 text-sky-400 font-bold border border-sky-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Launch Slip Slider (Used in Date Slip Comparison) */}
      {showSlipSlider && (
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-2 mt-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium text-[11px]">Launch Slip Adjustment:</span>
            <span className="font-mono text-amber-400 font-bold">
              {slipDays > 0 ? `+${slipDays} days` : slipDays < 0 ? `${slipDays} days` : 'Baseline (0d)'}
            </span>
          </div>

          <input
            type="range"
            min={-30}
            max={30}
            step={1}
            value={slipDays}
            onChange={(e) => onSlipDaysChange(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>-30d</span>
            <span>Planned</span>
            <span>+30d</span>
          </div>

          {slipDeltaSummary && (
            <div className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800 leading-relaxed font-mono">
              {slipDeltaSummary}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DateControls;
