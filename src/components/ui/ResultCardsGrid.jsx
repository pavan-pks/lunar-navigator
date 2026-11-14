import React from 'react';

/**
 * ResultCardsGrid:
 * Sleek, rectangular single-value result cards prioritizing immediate answers
 * for mission planners at a glance.
 * Uses dark glassmorphism (translucent #111827) and monospace typography.
 */
export function ResultCardsGrid({
  live,
  stats,
  verdict,
  powerEfficiencyPct,
  timeToSunset,
  timeToEarthset,
  className = ''
}) {
  const sunElStr = live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`;
  const earthElStr = live.earthEl > 0 ? `+${live.earthEl.toFixed(1)}°` : `${live.earthEl.toFixed(1)}°`;
  const commsWindowStr = `${(stats.earthVisibleFraction * 100).toFixed(0)}% Coverage`;
  const peakDarkStr = `${stats.longestDarkHours} Hours`;
  const timeToEarthsetStr = timeToEarthset !== null ? `${timeToEarthset} Hours` : 'No Earthset';
  const timeToSunsetStr = timeToSunset !== null ? `${timeToSunset} Hours` : 'Continuous Light';
  const solarGenStr = `${powerEfficiencyPct}% Nominal`;

  const cards = [
    {
      title: 'SUN ELEVATION',
      value: sunElStr,
      subtext: live.sunEl > 0 ? 'Grazing Solar Angle' : 'Sub-Horizon (Darkness)',
      color: live.sunEl > 0 ? 'text-amber-300' : 'text-rose-400',
      badge: live.sunEl > 0 ? 'SUNLIT' : 'ECLIPSE',
      badgeColor: live.sunEl > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    {
      title: 'TIME TO SUNSET',
      value: timeToSunsetStr,
      subtext: timeToSunset !== null ? 'Until Thermal Blackout' : 'Perpetual Ridge Illumination',
      color: 'text-amber-300',
      badge: 'POWER',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      title: 'PEAK DARKNESS',
      value: peakDarkStr,
      subtext: stats.longestDarkHours > 48 ? 'Heavy Battery Discharge' : 'Within Cryo Battery Margins',
      color: stats.longestDarkHours > 48 ? 'text-amber-400' : 'text-emerald-400',
      badge: 'SURVIVAL',
      badgeColor: stats.longestDarkHours > 48 ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
    },
    {
      title: 'SOLAR GENERATION',
      value: solarGenStr,
      subtext: 'Photovoltaic Array Yield',
      color: 'text-amber-300',
      badge: 'YIELD',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    },
    {
      title: 'EARTH ELEVATION',
      value: earthElStr,
      subtext: live.earthEl > 0 ? 'Direct DSN Lock' : 'Occulted by Rim Terrain',
      color: live.earthEl > 0 ? 'text-cyan-300' : 'text-rose-400',
      badge: live.earthEl > 0 ? 'LOCKED' : 'LOS',
      badgeColor: live.earthEl > 0 ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
    },
    {
      title: 'COMMS WINDOW',
      value: commsWindowStr,
      subtext: 'Direct-to-Earth Line of Sight',
      color: 'text-cyan-300',
      badge: 'DSN',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    {
      title: 'TIME TO EARTHSET',
      value: timeToEarthsetStr,
      subtext: timeToEarthset !== null ? 'Until RF Occultation' : 'Permanent DSN Visibility',
      color: 'text-cyan-300',
      badge: 'TELEMETRY',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
    },
    {
      title: 'MISSION STATUS',
      value: verdict.badge,
      subtext: verdict.status === 'VIABLE' ? 'Flight Certified (GO)' : 'Review Power Reserves',
      color: verdict.status === 'VIABLE' ? 'text-emerald-400' : verdict.status === 'MARGINAL' ? 'text-amber-400' : 'text-rose-400',
      badge: verdict.status,
      badgeColor: verdict.status === 'VIABLE' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
    }
  ];

  return (
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {cards.map((c, i) => (
        <div
          key={i}
          className="bg-[#111827]/85 backdrop-blur-xl border border-white/10 rounded-2xl p-3.5 shadow-[0_10px_25px_rgba(0,0,0,0.7)] flex flex-col justify-between hover:border-cyan-500/40 transition-all duration-200"
        >
          <div className="flex items-center justify-between gap-1 mb-1.5">
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 truncate">
              {c.title}
            </span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${c.badgeColor}`}>
              {c.badge}
            </span>
          </div>

          <div className={`text-xl sm:text-2xl font-mono font-extrabold tracking-tight ${c.color} my-0.5 truncate`}>
            {c.value}
          </div>

          <div className="text-[10px] font-mono text-slate-400 truncate">
            {c.subtext}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ResultCardsGrid;
