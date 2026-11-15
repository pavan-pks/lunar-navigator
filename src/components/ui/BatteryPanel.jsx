import React, { useState, useMemo } from 'react';
import { Zap } from 'lucide-react';
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
    name: 'Standard Artemis Lander',
    params: { capacityWh: 1000, panelPeakW: 200, loadW: 60, nightHeaterW: 20, orientation: 'horizontal' }
  },
  {
    name: 'Micro-Payload / CubeSat',
    params: { capacityWh: 160, panelPeakW: 40, loadW: 12, nightHeaterW: 5, orientation: 'vertical-tracking' }
  },
  {
    name: 'VIPER Heavy Science Rover',
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
      <div className="border-b border-sky-500/20 pb-4">
        <h2 className="text-xl font-display font-bold text-white flex items-center gap-2.5">
          <span>Battery Storage & Solar PV Array Simulator</span>
          <span className="text-xs font-mono font-normal px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
            ELECTROCHEMICAL BALANCE
          </span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Simulate diurnal solar harvesting, survival heater electrical drain, and battery depth-of-discharge across polar terrain.
        </p>
      </div>

      {/* Physics Explainer Card */}
      <div className="p-4 bg-[#050c18] border border-sky-500/25 rounded-3xl text-xs text-sky-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg backdrop-blur-md">
        <div className="space-y-1">
          <span className="font-display font-bold text-sky-400 uppercase tracking-widest text-[11px] flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-sky-400" />
            <span>Orbital Physics Insight: Polar Solar Mast Geometry</span>
          </span>
          <p className="leading-relaxed text-slate-300 text-[11px]">
            Near lunar poles (&gt;80° S), the Sun skims low at 1.5° to 3.0° above the horizon. A flat horizontal deck panel catches almost negligible flux (sin 2° ≈ 3.5%), whereas a vertical tracking array faces the grazing beam directly (cos 2° ≈ 99.9%), capturing <strong>over 28× more usable energy</strong>.
          </p>
        </div>
      </div>

      {/* Presets and Controls Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hardware Architecture Configuration */}
        <div className="lg:col-span-1 bg-[#070b14]/85 p-5 rounded-3xl border border-white/10 space-y-4 text-xs shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <span className="font-display font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Power Subsystem Architecture
            </span>
            <span className="text-[10px] text-slate-500 font-mono">SPEC_V1.4</span>
          </div>

          {/* Quick Archetype Presets */}
          <div className="space-y-1.5">
            <label className="text-slate-400 text-[11px] font-mono block">Vehicle Architecture Preset:</label>
            <div className="grid grid-cols-1 gap-2">
              {BATTERY_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => handlePresetSelect(preset)}
                  className="py-2 px-3 bg-black/40 hover:bg-white/5 border border-white/10 rounded-xl text-left text-[11px] text-slate-200 transition-all flex items-center justify-between cursor-pointer hover:border-sky-500/40"
                >
                  <span className="font-medium">{preset.name}</span>
                  <span className="text-[10px] text-sky-400 font-mono">{preset.params.capacityWh} Wh</span>
                </button>
              ))}
            </div>
          </div>

          {/* Orientation Selector */}
          <div className="space-y-1.5 pt-2">
            <label htmlFor="battery-orientation-select" className="text-slate-400 block text-[11px] font-mono">Solar Array Configuration:</label>
            <select
              id="battery-orientation-select"
              value={params.orientation}
              onChange={(e) => setParams({ ...params, orientation: e.target.value })}
              className="w-full bg-[#03060c] border border-white/10 rounded-xl p-2.5 text-slate-100 text-xs cursor-pointer focus:outline-none focus:border-sky-500 hover:border-sky-500/40 transition"
            >
              <option value="horizontal">Horizontal (Flat Lander Deck)</option>
              <option value="vertical-tracking">Vertical Sun-Tracking Mast (Rotary Actuator)</option>
              <option value="vertical-fixed">Vertical Fixed Mast (Fixed Horizon Azimuth)</option>
            </select>
          </div>

          {params.orientation === 'vertical-fixed' && (
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">Fixed Panel Azimuth:</span>
                <span className="font-mono text-sky-400 font-bold">{params.panelAz}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="5"
                value={params.panelAz}
                onChange={(e) => setParams({ ...params, panelAz: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none accent-sky-400 cursor-pointer"
              />
            </div>
          )}

          {/* Sliders */}
          <div className="space-y-3.5 pt-2">
            <div>
              <div className="flex justify-between text-[11px] mb-1 font-mono">
                <span className="text-slate-400">Battery Capacity:</span>
                <span className="text-sky-400 font-bold">{params.capacityWh} Wh</span>
              </div>
              <input
                type="range"
                min="200"
                max="5000"
                step="100"
                value={params.capacityWh}
                onChange={(e) => setParams({ ...params, capacityWh: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none accent-sky-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-mono">
                <span className="text-slate-400">Solar Array Peak Rating:</span>
                <span className="text-amber-400 font-bold">{params.panelPeakW} W</span>
              </div>
              <input
                type="range"
                min="30"
                max="1000"
                step="10"
                value={params.panelPeakW}
                onChange={(e) => setParams({ ...params, panelPeakW: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-mono">
                <span className="text-slate-400">Avionics & Core Load:</span>
                <span className="text-slate-200 font-bold">{params.loadW} W</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={params.loadW}
                onChange={(e) => setParams({ ...params, loadW: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none accent-slate-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-1 font-mono">
                <span className="text-slate-400">Night Survival Electric Heater:</span>
                <span className="text-slate-200 font-bold">{params.nightHeaterW} W</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={params.nightHeaterW}
                onChange={(e) => setParams({ ...params, nightHeaterW: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none accent-slate-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Battery Charge Simulation Chart */}
        <div className="lg:col-span-2 bg-[#070b14]/85 p-5 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between shadow-lg backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="font-display font-bold text-slate-200 uppercase tracking-wider text-[11px]">
              Electrochemical State-of-Charge (SoC Wh)
            </span>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span> Scenario Alpha
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fb923c]"></span> Scenario Bravo
              </span>
            </div>
          </div>

          <div className="h-68 w-full bg-[#020409] rounded-2xl p-2.5 border border-white/10 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="t" tickLine={false} stroke="#475569" fontSize={10} tickFormatter={(v) => `T+${v}h`} />
                <YAxis domain={[0, params.capacityWh]} tickLine={false} stroke="#475569" fontSize={10} tickFormatter={(v) => `${v}Wh`} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const p = payload[0].payload;
                    return (
                      <div className="bg-[#03060c]/95 border border-white/20 p-3 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.8)] font-mono text-xs text-slate-200 space-y-1 backdrop-blur-md">
                        <div className="text-[10px] text-slate-400 border-b border-white/10 pb-1 font-semibold">
                          T+{p.t}h ({p.day} days)
                        </div>
                        <div className="flex justify-between gap-4 text-sky-400">
                          <span>Alpha Charge:</span>
                          <span className="font-bold">{p.chargeA} Wh ({p.genA}W gen)</span>
                        </div>
                        <div className="flex justify-between gap-4 text-amber-400">
                          <span>Bravo Charge:</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="p-3.5 bg-black/50 rounded-2xl border border-sky-500/30 text-xs space-y-1.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 block font-mono">Scenario Alpha Assessment</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">{simA.summary}</p>
              <div className="font-mono text-[10px] text-slate-500 pt-1 border-t border-white/5">
                Minimum Reserve: <strong className="text-sky-300">{simA.minChargeWh} Wh</strong> | Survived: {simA.survivedHours}h
              </div>
            </div>

            <div className="p-3.5 bg-black/50 rounded-2xl border border-amber-500/30 text-xs space-y-1.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block font-mono">Scenario Bravo Assessment</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">{simB.summary}</p>
              <div className="font-mono text-[10px] text-slate-500 pt-1 border-t border-white/5">
                Minimum Reserve: <strong className="text-amber-300">{simB.minChargeWh} Wh</strong> | Survived: {simB.survivedHours}h
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BatteryPanel;
