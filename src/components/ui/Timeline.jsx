import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { SUN_UP_DEG, EARTH_UP_DEG } from '../../lib/config.js';
import { dateFromHours } from '../../lib/geometry.js';

/**
 * src/components/ui/Timeline.jsx
 * Quantitative solar & Earth elevation timeline with darkness shading and interactive cursor.
 */
export function Timeline({
  series,
  startUTC,
  tRel = 0,
  onSeek,
  colorVariant = 'sky',
  stats = null
}) {
  const isAmber = colorVariant === 'amber';
  const lineColor = isAmber ? '#fb923c' : '#38bdf8';
  const earthColor = '#34d399'; // Emerald for Earth

  // Downsample to max 350 points for snappy rendering
  const chartData = useMemo(() => {
    if (!series || !series.t || series.t.length === 0) return [];
    const n = series.t.length;
    const stride = Math.max(1, Math.ceil(n / 350));

    const points = [];
    for (let i = 0; i < n; i += stride) {
      const tVal = series.t[i];
      const sEl = series.sunEl[i];
      const eEl = series.earthEl[i];
      const isSunlit = sEl > SUN_UP_DEG;
      const isEarthVis = eEl > EARTH_UP_DEG;

      // Calculate approximate UTC date
      let utcStr = '';
      if (startUTC) {
        try {
          const d = dateFromHours(startUTC, tVal);
          utcStr = d.toISOString().slice(5, 16).replace('T', ' ');
        } catch {
          utcStr = `T+${tVal}h`;
        }
      }

      points.push({
        t: tVal,
        day: (tVal / 24).toFixed(1),
        sunEl: sEl,
        earthEl: eEl,
        utc: utcStr,
        // Visual indicator bands
        sunUp: isSunlit ? 1 : 0,
        darkness: isSunlit ? null : 0,
        earthVis: isEarthVis ? 1 : 0
      });
    }
    return points;
  }, [series, startUTC]);

  if (chartData.length === 0) {
    return (
      <div className="h-44 bg-slate-950/60 rounded-lg border border-slate-800/80 flex items-center justify-center text-xs text-slate-500">
        No ephemeris timeline data available.
      </div>
    );
  }

  const handleClick = (e) => {
    if (e && e.activePayload && e.activePayload.length > 0 && onSeek) {
      const clickedT = e.activePayload[0].payload.t;
      onSeek(clickedT);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-slate-300">Elevation Profile (14 Days)</span>
        <div className="flex items-center gap-3 font-mono text-[10px]">
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: lineColor }}></span> Sun
          </span>
          <span className="flex items-center gap-1 text-slate-400">
            <span className="w-2.5 h-0.5 rounded" style={{ backgroundColor: earthColor }}></span> Earth
          </span>
          <span className="flex items-center gap-1 text-slate-500">
            <span className="w-2 h-2 bg-slate-800 border border-slate-700 rounded-sm"></span> Night
          </span>
        </div>
      </div>

      <div className="h-48 w-full bg-slate-950/80 rounded-lg p-2 border border-slate-800/80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            onClick={handleClick}
            margin={{ top: 8, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="t"
              tickLine={false}
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(v) => `T+${v}h`}
            />
            <YAxis
              domain={['auto', 'auto']}
              tickLine={false}
              stroke="#64748b"
              fontSize={10}
              tickFormatter={(v) => `${v}°`}
            />

            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const p = payload[0].payload;
                return (
                  <div className="bg-slate-900/95 border border-slate-700 p-2 rounded shadow-xl font-mono text-xs text-slate-200">
                    <div className="text-[10px] text-slate-400 border-b border-slate-800 pb-1 mb-1">
                      T+{p.t}h ({p.day}d) — {p.utc} UTC
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Sun Elevation:</span>
                      <span className="font-bold" style={{ color: lineColor }}>
                        {p.sunEl > 0 ? `+${p.sunEl.toFixed(2)}°` : `${p.sunEl.toFixed(2)}°`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-slate-400">Earth Elevation:</span>
                      <span className="font-bold text-emerald-400">
                        {p.earthEl > 0 ? `+${p.earthEl.toFixed(2)}°` : `${p.earthEl.toFixed(2)}°`}
                      </span>
                    </div>
                  </div>
                );
              }}
            />

            {/* Lunar Horizon line */}
            <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />

            {/* Earth LOS Threshold */}
            <ReferenceLine y={EARTH_UP_DEG} stroke="#059669" strokeDasharray="2 2" strokeOpacity={0.4} />

            {/* Interactive Timeline Cursor */}
            <ReferenceLine x={tRel} stroke="#f8fafc" strokeWidth={1.5} />

            {/* Sun Elevation Line */}
            <Line
              type="monotone"
              dataKey="sunEl"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {/* Earth Elevation Line */}
            <Line
              type="monotone"
              dataKey="earthEl"
              stroke={earthColor}
              strokeWidth={1.2}
              strokeDasharray="4 2"
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible Telemetry Narrative */}
      {stats && (
        <p className="text-[11px] text-slate-400 font-mono leading-tight px-1">
          Sun is up <span className="text-slate-200 font-bold">{(stats.sunlitFraction * 100).toFixed(0)}%</span> of window ({stats.sunlitHours}h);{' '}
          longest night is <span className="text-slate-200 font-bold">{stats.longestDarkHours}h</span> starting day {(stats.longestDarkStartT / 24).toFixed(1)}.
        </p>
      )}
    </div>
  );
}

export default Timeline;
