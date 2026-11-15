import React from 'react';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';
import { SIM_SPEED_OPTIONS } from '../../lib/config.js';

/**
 * Bottom Mission Elapsed Time (MET) and Simulation Time Scrubber.
 * Features:
 * - Play / Pause toggle
 * - Simulation speed selector (1x, 10x, 24x, 60x, 120x)
 * - Mission Elapsed Time (MET: days, hours, minutes)
 * - 1-pixel high-precision timeline slider
 *
 * Plain engineering aesthetic, no emojis.
 */
export function BottomTimeScrubber({
  timeCtrl,
  maxHours,
  landingDateStr,
  onResetTime
}) {
  const t = timeCtrl.tRel;
  const metDays = Math.floor(t / 24);
  const metHours = Math.floor(t % 24);
  const metMinutes = Math.floor((t * 60) % 60);

  const speedOptions = [
    { value: 1, label: '1x' },
    { value: 10, label: '10x' },
    { value: 24, label: '24x (1h/s)' },
    { value: 60, label: '60x' },
    { value: 120, label: '120x' }
  ];

  const cycleSpeed = () => {
    const currentIndex = speedOptions.findIndex((s) => s.value === timeCtrl.speed);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    timeCtrl.setSpeed(speedOptions[nextIndex].value);
  };

  return (
    <div className="w-full bg-neutral-950/95 border-t border-neutral-800 text-neutral-200 text-xs font-mono select-none backdrop-blur-md px-4 py-2 space-y-1.5 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Playback Controls & Speed */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={timeCtrl.togglePlay}
            className="w-7 h-7 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center transition-colors cursor-pointer"
            title={timeCtrl.playing ? 'Pause simulation (Space)' : 'Play simulation (Space)'}
            aria-label={timeCtrl.playing ? 'Pause' : 'Play'}
          >
            {timeCtrl.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <button
            type="button"
            onClick={cycleSpeed}
            className="px-2 py-1 rounded border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-300 hover:text-white transition-colors text-[11px] font-semibold cursor-pointer"
            title="Cycle simulation playback speed"
          >
            {speedOptions.find((s) => s.value === timeCtrl.speed)?.label || `${timeCtrl.speed}x`}
          </button>

          {onResetTime && (
            <button
              type="button"
              onClick={onResetTime}
              className="p-1.5 rounded border border-neutral-800 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              title="Reset time to T+0h"
              aria-label="Reset Time"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Mission Elapsed Time */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 uppercase text-[10px]">MET:</span>
            <span className="text-neutral-100 font-bold tabular-nums">
              +{metDays}d {String(metHours).padStart(2, '0')}h {String(metMinutes).padStart(2, '0')}m
            </span>
            <span className="text-neutral-500 text-[10px] tabular-nums">
              (T+{t.toFixed(1)}h / {maxHours}h)
            </span>
          </div>
          {landingDateStr && (
            <span className="text-neutral-500 text-[11px] hidden sm:inline">
              Touchdown: {landingDateStr}
            </span>
          )}
        </div>
      </div>

      {/* Scrubbing Range Slider */}
      <div className="max-w-7xl mx-auto relative flex items-center pt-0.5">
        <input
          type="range"
          min={0}
          max={maxHours}
          step={0.1}
          value={t}
          onChange={(e) => timeCtrl.seek(parseFloat(e.target.value))}
          className="w-full h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-sky-400"
          aria-label="Mission simulation timeline scrubber"
        />
      </div>
    </div>
  );
}

export default BottomTimeScrubber;
