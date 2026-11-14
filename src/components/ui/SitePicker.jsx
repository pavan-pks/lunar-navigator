import React, { useState } from 'react';

/**
 * src/components/ui/SitePicker.jsx
 * Preset landing site picker with custom lunar coordinates support and validation.
 */
export function SitePicker({
  sites = [],
  selectedSite,
  onSelectSite,
  colorVariant = 'sky' // 'sky' for Scenario A, 'amber' for Scenario B
}) {
  const isCustom = selectedSite?.id?.startsWith('custom-');
  const [showCustomModal, setShowCustomModal] = useState(isCustom);
  const [customLat, setCustomLat] = useState(isCustom ? selectedSite.lat : -85.5);
  const [customLon, setCustomLon] = useState(isCustom ? selectedSite.lon : 20.0);
  const [customName, setCustomName] = useState(isCustom ? selectedSite.name : 'Custom Site');
  const [errorMsg, setErrorMsg] = useState('');

  const accentColor = colorVariant === 'amber' ? 'text-amber-400' : 'text-sky-400';
  const borderFocus = colorVariant === 'amber' ? 'focus:border-amber-500' : 'focus:border-sky-500';

  const handleSelectPreset = (e) => {
    const val = e.target.value;
    if (val === 'custom') {
      setShowCustomModal(true);
      applyCustom(customLat, customLon, customName);
    } else {
      setShowCustomModal(false);
      const site = sites.find(s => s.id === val);
      if (site) {
        onSelectSite(site);
      }
    }
  };

  const applyCustom = (latVal, lonVal, nameVal) => {
    const lat = parseFloat(latVal);
    const lon = parseFloat(lonVal);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMsg('Latitude must be a valid number between -90° and +90°');
      return;
    }
    if (isNaN(lon) || lon < -180 || lon > 180) {
      setErrorMsg('Longitude must be a valid number between -180° and +180°');
      return;
    }

    setErrorMsg('');
    const newSite = {
      id: `custom-${lat.toFixed(2)}-${lon.toFixed(2)}`,
      name: nameVal.trim() || `Custom (${lat.toFixed(2)}°, ${lon.toFixed(2)}°)`,
      lat,
      lon,
      terrainType: 'plain',
      notes: 'User-specified arbitrary surface coordinate',
      source: 'User Custom Input',
      verified: true
    };
    onSelectSite(newSite);
  };

  const handleLatChange = (e) => {
    const val = e.target.value;
    setCustomLat(val);
    applyCustom(val, customLon, customName);
  };

  const handleLonChange = (e) => {
    const val = e.target.value;
    setCustomLon(val);
    applyCustom(customLat, val, customName);
  };

  const handleNameChange = (e) => {
    const val = e.target.value;
    setCustomName(val);
    applyCustom(customLat, customLon, val);
  };

  const isHighLatitude = parseFloat(customLat) > -60;

  return (
    <div className="space-y-2 text-xs">
      <div className="flex items-center justify-between">
        <label className="text-slate-400 font-medium">Landing Site</label>
        <span className={`font-mono text-[11px] ${accentColor}`}>
          {selectedSite.lat > 0 ? `+${selectedSite.lat.toFixed(2)}°` : `${selectedSite.lat.toFixed(2)}°`},{' '}
          {selectedSite.lon > 0 ? `+${selectedSite.lon.toFixed(2)}°` : `${selectedSite.lon.toFixed(2)}°`}
        </span>
      </div>

      <div className="flex gap-2">
        <select
          value={isCustom ? 'custom' : selectedSite.id}
          onChange={handleSelectPreset}
          className={`flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-100 text-xs cursor-pointer focus:outline-none ${borderFocus}`}
        >
          <optgroup label="Curated Artemis & Polar Presets">
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.lat.toFixed(1)}°, {s.lon.toFixed(1)}°) — {s.terrainType}
              </option>
            ))}
          </optgroup>
          <optgroup label="Custom Coordinates">
            <option value="custom">★ Custom Coordinates…</option>
          </optgroup>
        </select>
      </div>

      {/* Custom Coordinates Sub-panel */}
      {showCustomModal && (
        <div className="p-3 bg-slate-950/90 border border-slate-800 rounded-lg space-y-2 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Latitude (-90 to +90°)</label>
              <input
                type="number"
                step="0.01"
                min="-90"
                max="90"
                value={customLat}
                onChange={handleLatChange}
                className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none ${borderFocus}`}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Longitude (-180 to +180°)</label>
              <input
                type="number"
                step="0.01"
                min="-180"
                max="180"
                value={customLon}
                onChange={handleLonChange}
                className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none ${borderFocus}`}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Label (Optional)</label>
            <input
              type="text"
              value={customName}
              onChange={handleNameChange}
              placeholder="e.g. VIPER Drill Site Alpha"
              className={`w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:outline-none ${borderFocus}`}
            />
          </div>

          {errorMsg && (
            <p className="text-[11px] text-red-400 font-medium">{errorMsg}</p>
          )}

          {isHighLatitude && !errorMsg && (
            <p className="text-[10px] text-amber-400/90 leading-tight">
              💡 South pole conditions are most dramatic below −80° latitude.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default SitePicker;
