import React, { useState, useRef, useEffect } from 'react';
import { Layers, Check } from 'lucide-react';

/**
 * Layers popover control with checkboxes.
 * Toggles visual overlays: Labels, Graticule, Earth telemetry beam (DSN), Illumination/Shadow.
 * Engineering style, no emojis, WCAG AA contrast.
 */
export function LayersPopover({
  showLabels,
  setShowLabels,
  showGraticule,
  setShowGraticule,
  showDsnBeam,
  setShowDsnBeam,
  showSlopeHeatmap,
  setShowSlopeHeatmap
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const layers = [
    {
      id: 'labels',
      label: 'Landmark Labels',
      checked: showLabels,
      toggle: () => setShowLabels((v) => !v),
      desc: '3D selenographic point annotations'
    },
    {
      id: 'graticule',
      label: 'Coordinate Graticule',
      checked: showGraticule,
      toggle: () => setShowGraticule((v) => !v),
      desc: 'Latitude/longitude polar grid'
    },
    {
      id: 'dsn',
      label: 'Earth Telemetry Link',
      checked: showDsnBeam,
      toggle: () => setShowDsnBeam((v) => !v),
      desc: 'Direct-to-Earth line-of-sight vector'
    },
    ...(setShowSlopeHeatmap ? [{
      id: 'slope',
      label: 'Landing Slope Hazard',
      checked: showSlopeHeatmap,
      toggle: () => setShowSlopeHeatmap((v) => !v),
      desc: 'Topographic slope safety classification'
    }] : [])
  ];

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="px-2.5 py-1 rounded border border-neutral-800 bg-neutral-900/90 hover:border-neutral-700 text-neutral-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono cursor-pointer"
        aria-expanded={isOpen}
        title="Toggle visual scene layers"
      >
        <Layers className="w-3.5 h-3.5 text-sky-400" />
        <span>Layers</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-neutral-950 border border-neutral-800 rounded p-2.5 shadow-2xl z-50 text-xs font-mono space-y-2 backdrop-blur-md">
          <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold border-b border-neutral-800 pb-1">
            Display Layers
          </div>
          <div className="space-y-1">
            {layers.map((layer) => (
              <label
                key={layer.id}
                className="flex items-start gap-2.5 p-1.5 rounded hover:bg-neutral-900/70 cursor-pointer select-none transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    layer.checked
                      ? 'bg-sky-600 border-sky-500 text-white'
                      : 'bg-neutral-900 border-neutral-700 text-transparent'
                  }`}
                >
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <input
                  type="checkbox"
                  checked={layer.checked}
                  onChange={layer.toggle}
                  className="sr-only"
                />
                <div>
                  <div className="text-neutral-200 font-medium leading-none">{layer.label}</div>
                  <div className="text-[10px] text-neutral-500 leading-tight mt-0.5">{layer.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default LayersPopover;
