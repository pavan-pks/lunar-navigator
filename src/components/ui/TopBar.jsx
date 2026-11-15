import React, { useState } from 'react';
import { MapPin, Share2, FileText, Volume2, VolumeX, RotateCcw } from 'lucide-react';
import { LayersPopover } from './LayersPopover.jsx';
import { DataAssumptionsPopover } from './DataAssumptionsPopover.jsx';

/**
 * Slim Mission Planning Top Bar.
 * Hosts:
 * (a) Brand and site selector dropdown with custom coordinates option
 * (b) Date & slip flight controls (launch date, transit duration, slip slider 0-30d, landing date)
 * (c) Secondary action buttons (Report, Layers popover, Data & Assumptions, Audio, Share link, Overview)
 *
 * Restrained engineering aesthetic, no emojis.
 */
export function TopBar({
  sites = [],
  selectedSiteId = 'shackleton',
  onSelectSite,
  onOpenCustomCoords,
  launchDate,
  onLaunchDateChange,
  transitDays,
  onTransitDaysChange,
  slipDays,
  onSlipDaysChange,
  landingDateStr,
  onOpenReport,
  onResetCamera,
  audioMuted,
  onToggleAudio,
  ephem,
  missionValidation,
  showLabels,
  setShowLabels,
  showGraticule,
  setShowGraticule,
  showDsnBeam,
  setShowDsnBeam,
  showSlopeHeatmap,
  setShowSlopeHeatmap,
  onCopyLink,
  linkCopied = false
}) {
  const [showSlipInput, setShowSlipInput] = useState(false);

  const handleLaunchDateInput = (e) => {
    const val = e.target.value;
    if (val && onLaunchDateChange) {
      onLaunchDateChange(`${val}T00:00:00Z`);
    }
  };

  return (
    <header className="w-full bg-neutral-950/95 border-b border-neutral-800 text-neutral-200 text-xs font-mono select-none sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 h-12 flex items-center justify-between gap-3">
        {/* Left Section: Brand & Site Selector */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="font-sans font-bold text-sm tracking-wide text-white uppercase">
              Lunar Navigator
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700/60 hidden sm:inline-block">
              ARTEMIS-III
            </span>
          </div>

          <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded px-2 py-1">
            <MapPin className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <select
              value={selectedSiteId}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  if (onOpenCustomCoords) onOpenCustomCoords();
                } else if (onSelectSite) {
                  onSelectSite(e.target.value);
                }
              }}
              className="bg-transparent text-neutral-200 text-xs focus:outline-none cursor-pointer max-w-[130px] sm:max-w-[170px] truncate"
              title="Select candidate lunar south-pole landing site"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id} className="bg-neutral-900 text-neutral-200">
                  {s.name} ({s.lat.toFixed(1)}°S)
                </option>
              ))}
              <option value="custom" className="bg-neutral-900 text-neutral-200">
                Custom Coordinates…
              </option>
            </select>
          </div>
        </div>

        {/* Center Section: Flight Dynamics Controls (Launch, Transit, Slip, Landing) */}
        <div className="hidden lg:flex items-center gap-4 bg-neutral-900/60 px-3 py-1 rounded border border-neutral-800/80 text-[11px]">
          {/* Launch Date */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 uppercase text-[10px]">Launch:</span>
            <input
              type="date"
              min="2027-01-01"
              max="2028-01-15"
              value={launchDate ? launchDate.slice(0, 10) : '2027-03-08'}
              onChange={handleLaunchDateInput}
              className="bg-neutral-900 border border-neutral-700/60 rounded px-1.5 py-0.5 text-neutral-100 text-[11px] focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Transit Days */}
          <div className="flex items-center gap-1.5">
            <span className="text-neutral-500 uppercase text-[10px]">Transit:</span>
            <input
              type="number"
              min={1}
              max={14}
              value={transitDays}
              onChange={(e) => onTransitDaysChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
              className="w-12 bg-neutral-900 border border-neutral-700/60 rounded px-1.5 py-0.5 text-neutral-100 text-[11px] text-center focus:outline-none focus:border-sky-500"
            />
            <span className="text-neutral-500">d</span>
          </div>

          {/* Launch Slip Slider Toggle & Value */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSlipInput((v) => !v)}
              className="text-[10px] uppercase text-neutral-500 hover:text-neutral-300 transition-colors"
            >
              Slip:
            </button>
            <div className="flex items-center gap-1.5">
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={slipDays}
                onChange={(e) => onSlipDaysChange(parseInt(e.target.value, 10))}
                className="w-20 h-1 bg-neutral-800 rounded appearance-none cursor-pointer accent-sky-400"
                title={`Launch slip: ${slipDays} days`}
              />
              <span className={`font-semibold tabular-nums ${slipDays > 0 ? 'text-amber-400' : 'text-neutral-300'}`}>
                +{slipDays}d
              </span>
            </div>
          </div>

          {/* Computed Landing Date */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-neutral-800">
            <span className="text-neutral-500 uppercase text-[10px]">Landing:</span>
            <span className="text-sky-300 font-bold tabular-nums">
              {landingDateStr || '2027-03-12'}
            </span>
          </div>
        </div>

        {/* Right Section: Secondary Actions */}
        <div className="flex items-center gap-2">
          {/* Layers Popover */}
          <LayersPopover
            showLabels={showLabels}
            setShowLabels={setShowLabels}
            showGraticule={showGraticule}
            setShowGraticule={setShowGraticule}
            showDsnBeam={showDsnBeam}
            setShowDsnBeam={setShowDsnBeam}
            showSlopeHeatmap={showSlopeHeatmap}
            setShowSlopeHeatmap={setShowSlopeHeatmap}
          />

          {/* Data & Assumptions */}
          <DataAssumptionsPopover
            ephem={ephem}
            missionValidation={missionValidation}
          />

          {/* Report Button */}
          {onOpenReport && (
            <button
              type="button"
              onClick={onOpenReport}
              className="px-2.5 py-1 rounded border border-neutral-800 bg-neutral-900/90 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
              title="Open print-ready mission evaluation report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Report</span>
            </button>
          )}

          {/* Copy Link Button */}
          {onCopyLink && (
            <button
              type="button"
              onClick={onCopyLink}
              className="p-1.5 rounded border border-neutral-800 bg-neutral-900/90 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title="Copy shareable mission state URL"
              aria-label="Copy shareable link"
            >
              <Share2 className="w-3.5 h-3.5" />
              {linkCopied && (
                <span className="sr-only">Copied</span>
              )}
            </button>
          )}

          {/* Audio Toggle */}
          {onToggleAudio && (
            <button
              type="button"
              onClick={onToggleAudio}
              className="p-1.5 rounded border border-neutral-800 bg-neutral-900/90 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer"
              title={audioMuted ? 'Unmute ambient sound' : 'Mute ambient sound'}
              aria-label={audioMuted ? 'Unmute audio' : 'Mute audio'}
            >
              {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-neutral-500" /> : <Volume2 className="w-3.5 h-3.5 text-neutral-300" />}
            </button>
          )}

          {/* Camera Reset Overview Button */}
          {onResetCamera && (
            <button
              type="button"
              onClick={onResetCamera}
              className="p-1.5 rounded border border-neutral-800 bg-neutral-900/90 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors cursor-pointer hidden md:flex"
              title="Reset orbital overview camera"
              aria-label="Reset Camera"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default TopBar;
