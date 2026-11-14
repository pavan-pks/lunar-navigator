import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { simulateBattery, DEFAULT_BATTERY_PARAMS } from '../../lib/energy.js';
import { sampleSeries, hoursSince } from '../../lib/geometry.js';
import { landingDate } from '../../lib/metrics.js';

export const BATTERY_PRESETS = [
  {
    name: 'Small Lander (Default)',
    params: { capacityWh: 1000, panelPeakW: 200, loadW: 60, nightHeaterW: 20, orientation: 'horizontal' }
  },
  {
    name: 'CubeSat / Micro-Lander',
    params: { capacityWh: 160, panelPeakW: 40, loadW: 12, nightHeaterW: 5, orientation: 'vertical-tracking' }
  },
  {
    name: 'VIPER / Heavy Rover',
    params: { capacityWh: 4000, panelPeakW: 600, loadW: 180, nightHeaterW: 50, orientation: 'vertical-tracking' }
  }
];

/**
 * src/components/ui/BatteryPanel.jsx
 * Interactive solar generation and electrochemical battery charge simulation.
 */
export function BatteryPanel({
  sites,
  ephem,
  scenarioA,
  scenarioB,
  missionDays = 14
}) {
  const [params, setParams] = useState(DEFAULT_BATTERY_PARAMS);

  const siteA = scenarioA.customSite || sites.find(s => s.id === scenarioA.siteId) || sites[0];
  const siteB = scenarioB.customSite || sites.find(s => s.id === scenarioB.siteId) || sites[1] || sites[0];

  const landingA = landingDate(scenarioA.launchDate, scenarioA.transitDays);
  const landingB = landingDate(scenarioB.launchDate, scenarioB.transitDays);

  const startHoursA = Math.max(0, hoursSince(ephem.startUTC, landingA));
  const startHoursB = Math.max(0, hoursSince(ephem.startUTC, landingB));

  const durationHours = missionDays * 24;

  const seriesA = useMemo(() => {
    return sampleSeries(siteA, startHoursA, durationHours, ephem, 1);
  }, [siteA, startHoursA, durationHours, ephem]);

  const seriesB = useMemo(() => {
    return sampleSeries(siteB, startHoursB, durationHours, ephem, 1);
  }, [siteB, startHoursB, durationHours, ephem]);

  const simA = useMemo(() => simulateBattery(seriesA, params), [seriesA, params]);
  const simB = useMemo(() => simulateBattery(seriesB, params), [seriesB, params]);

  // Merge charge series for Recharts
  const chartData = useMemo(() => {
    const n = Math.min(simA.charge.length, simB.charge.length);
    const stride = Math.max(1, Math.ceil(n / 200));
    const points = [];

    for (let i = 0; i < n; i += stride) {
      const tHour = seriesA.t[i] || i;
      points.push({
        t: tHour,
        day: (tHour / 24).toFixed(1),
        chargeA: simA.charge[i],
        chargeB: simB.charge[i],
        genA: simA.generationW[i],
        genB: simB.generationW[i]
      });
    }
    return points;
  }, [simA, simB, seriesA.t]);

  const handlePresetSelect = (preset) => {
    setParams(prev => ({ ...prev, ...preset.params }));
  };

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="border-b border-slate-800 pb-3">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Battery Storage & Solar PV Array Simulator</span>
          <span className="text-xs font-mono font-normal px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            Energy Balance
          </span>
        </h2>
        <p className="text-xs text-slate-400">
          Simulate diurnal solar harvesting, survival heater electrical drain, and battery depth-of-discharge.
        </p>
      </div>

      {/* Physics Explainer Card */}
      <div className="p-3.5 bg-sky-950/20 border border-sky-500/30 rounded-xl text-xs text-sky-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <span className="font-bold text-sky-400 uppercase tracking-wider text-[11px] block">
            Physics Insight: Polar Solar Mast Geometry
          </span>
          <p className="leading-relaxed text-slate-300 text-[11px]">
            Near lunar poles (&gt;80° S), the Sun skims low at 1.5° to 3.0° above the horizon. A flat horizontal panel catches almost no flux (sin 2° ≈ 3.5%), whereas a vertical tracking array faces the grazing beam directly (cos 2° ≈ 99.9%), capturing <strong>over 28× more power</strong>.
          </p>
        </div>
      </div>

      {/* Presets and Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware Architecture Configuration */}
        <div className="lg:col-span-1 bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">Power Subsystem Specs</span>
            <span className="text-[10px] text-slate-500 font-mono">Parameters</span>
          </div>

          {/* Quick Archetype Presets */}
          <div className="space-y-1">
            <label className="text-slate-400 text-[11px] block">Quick Hardware Preset:</label>
            <div className="grid grid-cols-1 gap-1.5">
              {BATTERY_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className="py-1 px-2.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded text-left text-[11px] text-slate-300 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span>{preset.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{preset.params.capacityWh} Wh</span>
                </button>
              ))}
            </div>
          </div>

          {/* Orientation Selector */}
          <div className="space-y-1 pt-1">
            <label htmlFor="battery-orientation-select" className="text-slate-400 block text-[11px]">Solar Array Orientation:</label>
            <select
              id="battery-orientation-select"
              value={params.orientation}
              onChange={(e) => setParams({ ...params, orientation: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs cursor-pointer focus:outline-none focus:border-sky-500"
            >
              <option value="horizontal">Horizontal (Flat Deck Mounted)</option>
              <option value="vertical-tracking">Vertical Sun-Tracking Mast (Rotates with Sun)</option>
              <option value="vertical-fixed">Vertical Fixed Mast (Fixed Azimuth)</option>
            </select>
          </div>

          {params.orientation === 'vertical-fixed' && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Fixed Mast Azimuth:</span>
                <span className="font-mono text-slate-200">{params.panelAz}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={params.panelAz}
                onChange={(e) => setParams({ ...params, panelAz: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-400 cursor-pointer"
              />
            </div>
          )}

          {/* Sliders */}
          <div className="space-y-3 pt-1">
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Battery Capacity:</span>
                <span className="font-mono text-sky-400 font-bold">{params.capacityWh} Wh</span>
              </div>
              <input
                type="range"
                min="200"
                max="5000"
                step="100"
                value={params.capacityWh}
                onChange={(e) => setParams({ ...params, capacityWh: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Solar Array Peak Rating:</span>
                <span className="font-mono text-amber-400 font-bold">{params.panelPeakW} W</span>
              </div>
              <input
                type="range"
                min="30"
                max="1000"
                step="10"
                value={params.panelPeakW}
                onChange={(e) => setParams({ ...params, panelPeakW: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Avionics & Payload Load:</span>
                <span className="font-mono text-slate-200">{params.loadW} W</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={params.loadW}
                onChange={(e) => setParams({ ...params, loadW: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-slate-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-slate-400">Lunar Night Survival Heater:</span>
                <span className="font-mono text-slate-200">{params.nightHeaterW} W</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={params.nightHeaterW}
                onChange={(e) => setParams({ ...params, nightHeaterW: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none accent-slate-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Battery Charge Simulation Chart */}
        <div className="lg:col-span-2 bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Battery Charge Profile (State of Charge Wh)
            </span>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Scenario A
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Scenario B
              </span>
            </div>
          </div>

          <div className="h-64 w-full bg-slate-950/80 rounded-lg p-2 border border-slate-800/80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="t" tickLine={false} stroke="#64748b" fontSize={10} tickFormatter={(v) => `T+${v}h`} />
                <YAxis domain={[0, params.capacityWh]} tickLine={false} stroke="#64748b" fontSize={10} tickFormatter={(v) => `${v}Wh`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-slate-900/95 border border-slate-700 p-2.5 rounded shadow-xl font-mono text-xs text-slate-200 space-y-1">
                        <div className="text-[10px] text-slate-400 border-b border-slate-800 pb-1">
                          T+{p.t}h ({p.day} days)
                        </div>
                        <div className="flex justify-between gap-4 text-sky-400">
                          <span>A Charge:</span>
                          <span className="font-bold">{p.chargeA} Wh ({p.genA}W gen)</span>
                        </div>
                        <div className="flex justify-between gap-4 text-amber-400">
                          <span>B Charge:</span>
                          <span className="font-bold">{p.chargeB} Wh ({p.genB}W gen)</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={params.capacityWh} stroke="#64748b" strokeDasharray="2 2" strokeOpacity={0.3} />

                <Line type="monotone" dataKey="chargeA" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="chargeB" stroke="#fb923c" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Outcome Narrative Sentences */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 bg-slate-950 rounded-lg border border-sky-500/30 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block">Scenario A Result</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">{simA.summary}</p>
              <div className="font-mono text-[10px] text-slate-500 pt-1">
                Min reserve: <span className="text-slate-300 font-bold">{simA.minChargeWh} Wh</span> | Survived: {simA.survivedHours}h
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-amber-500/30 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">Scenario B Result</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">{simB.summary}</p>
              <div className="font-mono text-[10px] text-slate-500 pt-1">
                Min reserve: <span className="text-slate-300 font-bold">{simB.minChargeWh} Wh</span> | Survived: {simB.survivedHours}h
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatteryPanel;
