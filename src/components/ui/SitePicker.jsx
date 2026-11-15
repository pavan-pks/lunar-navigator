import React, { useState } from 'react';

/**
 * src/components/ui/SitePicker.jsx
 * Preset landing site picker with custom lunar coordinates support and validation.
 */
export function SitePicker({
  sites = [],
  selectedSite,
  onSelectSite,
  colorVariant = 'sky'
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
        <label className="text-slate-400 font-mono text-[11px] uppercase tracking-wider font-semibold">Landing Target</label>
        <span className={`font-mono text-[11px] ${accentColor} font-bold`}>
          {selectedSite.lat > 0 ? `+${selectedSite.lat.toFixed(2)}°` : `${selectedSite.lat.toFixed(2)}°`},{' '}
          {selectedSite.lon > 0 ? `+${selectedSite.lon.toFixed(2)}°` : `${selectedSite.lon.toFixed(2)}°`}
        </span>
      </div>

      <div className="flex gap-2">
        <select
          value={isCustom ? 'custom' : selectedSite.id}
          onChange={handleSelectPreset}
          className={`flex-1 bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-slate-100 text-xs cursor-pointer focus:outline-none ${borderFocus} hover:border-white/20 transition`}
        >
          <optgroup label="NASA Artemis South Pole Candidate Regions">
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.lat.toFixed(1)}°, {s.lon.toFixed(1)}°) — {s.terrainType}
              </option>
            ))}
          </optgroup>
          <optgroup label="Custom Coordinates">
            <option value="custom">Enter Custom Surface Coordinates…</option>
          </optgroup>
        </select>
      </div>

      {/* Custom Coordinates Sub-panel */}
      {showCustomModal && (
        <div className="p-3 bg-black/80 border border-white/10 rounded-2xl space-y-2.5 mt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-mono">Latitude (-90° to +90°)</label>
              <input
                type="number"
                step="0.01"
                min="-90"
                max="90"
                value={customLat}
                onChange={handleLatChange}
                className={`w-full bg-[#03060c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none ${borderFocus}`}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1 font-mono">Longitude (-180° to +180°)</label>
              <input
                type="number"
                step="0.01"
                min="-180"
                max="180"
                value={customLon}
                onChange={handleLonChange}
                className={`w-full bg-[#03060c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none ${borderFocus}`}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 block mb-1 font-mono">Mission Identifier (Optional)</label>
            <input
              type="text"
              value={customName}
              onChange={handleNameChange}
              placeholder="e.g. VIPER Drill Site Alpha"
              className={`w-full bg-[#03060c] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none ${borderFocus}`}
            />
          </div>

          {errorMsg && (
            <p className="text-[11px] text-red-400 font-medium font-mono">{errorMsg}</p>
          )}

          {isHighLatitude && !errorMsg && (
            <p className="text-[10px] text-amber-400/90 leading-tight font-mono">
              Note: Polar illumination conditions are most distinct below −80° latitude.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default SitePicker;
