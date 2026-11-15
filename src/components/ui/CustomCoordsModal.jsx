import React, { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Custom Selenographic Coordinate Entry Modal.
 * Allows entering target latitude (-90° to +90°) and longitude (-180° to +180°).
 */
export function CustomCoordsModal({ isOpen, onClose, onApply, currentLat = -89.9, currentLon = 129.8 }) {
  const [lat, setLat] = useState(currentLat);
  const [lon, setLon] = useState(currentLon);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);

    if (isNaN(latNum) || latNum < -90 || latNum > 90) {
      setError('Latitude must be between -90° (South Pole) and +90° (North Pole).');
      return;
    }
    if (isNaN(lonNum) || lonNum < -180 || lonNum > 180) {
      setError('Longitude must be between -180° and +180°.');
      return;
    }

    onApply({ lat: latNum, lon: lonNum });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none">
      <div className="w-full max-w-sm bg-neutral-950 border border-neutral-800 rounded p-4 text-xs font-mono text-neutral-200 shadow-2xl space-y-3">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
          <span className="font-semibold text-neutral-100 uppercase tracking-wider text-[11px]">
            Target Coordinates
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-2 bg-red-950/60 border border-red-700/50 rounded text-red-300 text-[11px]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-neutral-400 text-[10px] uppercase block mb-1">
              Latitude (-90° to +90°)
            </label>
            <input
              type="number"
              step="0.001"
              min="-90"
              max="90"
              value={lat}
              onChange={(e) => {
                setLat(e.target.value);
                setError('');
              }}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div>
            <label className="text-neutral-400 text-[10px] uppercase block mb-1">
              Longitude (-180° to +180°)
            </label>
            <input
              type="number"
              step="0.001"
              min="-180"
              max="180"
              value={lon}
              onChange={(e) => {
                setLon(e.target.value);
                setError('');
              }}
              className="w-full bg-neutral-900 border border-neutral-800 rounded px-2.5 py-1.5 text-neutral-100 focus:outline-none focus:border-sky-500"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors"
            >
              Apply Coordinates
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CustomCoordsModal;
