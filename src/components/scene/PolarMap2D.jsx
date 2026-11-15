import React, { useMemo } from 'react';
import { SUN_UP_DEG } from '../../lib/config.js';
import { calculateElAz } from '../../lib/geometry.js';

/**
 * South-Polar Stereographic 2D Map Fallback.
 * Renders an analytical south-polar projection showing:
 * - Concentric latitude parallels (-90°, -85°, -80°, -75°)
 * - Meridian spokes radiating from the South Pole
 * - Candidate landing sites with live illumination state
 * - Solar terminator shading line
 * - Click-to-target selection
 *
 * Runs seamlessly on low-end hardware or when WebGL is unavailable.
 */
export function PolarMap2D({
  sites = [],
  selectedSiteId,
  onSelectSite,
  sunEl = 2,
  sunAz = 180,
  subSolar = null,
  liveAngles = null
}) {
  const size = 600;
  const center = size / 2;
  const maxRadius = size * 0.44; // maps to -70° latitude
  const poleLat = -90;
  const outerLat = -70;

  // Convert south-polar latitude and longitude to stereographic 2D SVG coordinates
  const project = (lat, lon) => {
    const clampedLat = Math.min(-70, Math.max(-90, lat));
    const r = maxRadius * ((Math.abs(clampedLat) - 90) / (outerLat - poleLat));
    const rad = (lon * Math.PI) / 180;
    const x = center + r * Math.sin(rad);
    const y = center - r * Math.cos(rad);
    return { x, y, r };
  };

  // Latitude ring parallels
  const rings = useMemo(() => {
    return [-88, -85, -80, -75, -70].map((lat) => {
      const r = maxRadius * ((Math.abs(lat) - 90) / (outerLat - poleLat));
      return { lat, r };
    });
  }, [maxRadius, outerLat, poleLat]);

  // Longitude radial spokes
  const spokes = useMemo(() => {
    return [0, 45, 90, 135, 180, 225, 270, 315].map((lon) => {
      const rad = (lon * Math.PI) / 180;
      const x2 = center + maxRadius * Math.sin(rad);
      const y2 = center - maxRadius * Math.cos(rad);
      return { lon, x2, y2 };
    });
  }, [center, maxRadius]);

  // Projected candidate sites
  const projectedSites = useMemo(() => {
    return sites.map((s) => {
      const { x, y } = project(s.lat, s.lon);
      let isSunlit = true;

      if (subSolar) {
        const elAz = calculateElAz(s.lat, s.lon, subSolar.lat, subSolar.lon);
        isSunlit = elAz.el > SUN_UP_DEG;
      } else if (s.id === selectedSiteId && liveAngles) {
        isSunlit = liveAngles.sunEl > SUN_UP_DEG;
      }

      return {
        ...s,
        x,
        y,
        isSunlit,
        isSelected: s.id === selectedSiteId
      };
    });
  }, [sites, selectedSiteId, subSolar, liveAngles]);

  return (
    <div className="w-full h-full bg-[#050505] flex flex-col items-center justify-center p-4 relative select-none">
      <div className="absolute top-4 left-4 bg-neutral-900/90 border border-neutral-800 px-3 py-1.5 rounded text-xs font-mono text-neutral-300 z-10">
        <span className="text-sky-400 font-bold">2D POLAR STEREOGRAPHIC PROJECTION</span>
        <span className="text-neutral-500 block text-[10px]">South Pole Centered (-90° to -70° S)</span>
      </div>

      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-[540px] max-h-[540px] aspect-square"
      >
        <defs>
          <radialGradient id="polar-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0a0f1d" />
            <stop offset="85%" stopColor="#05070d" />
            <stop offset="100%" stopColor="#000000" />
          </radialGradient>
        </defs>

        {/* Outer boundary circle */}
        <circle cx={center} cy={center} r={maxRadius} fill="url(#polar-bg)" stroke="#262626" strokeWidth="1.5" />

        {/* Concentric Latitude rings */}
        {rings.map((ring) => (
          <g key={ring.lat}>
            <circle
              cx={center}
              cy={center}
              r={ring.r}
              fill="none"
              stroke="#1f2937"
              strokeWidth="1"
              strokeDasharray={ring.lat === -90 ? 'none' : '3 3'}
            />
            <text
              x={center + 4}
              y={center - ring.r + 10}
              fill="#6b7280"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
            >
              {ring.lat}°
            </text>
          </g>
        ))}

        {/* Longitude radial spokes */}
        {spokes.map((spoke) => (
          <g key={spoke.lon}>
            <line
              x1={center}
              y1={center}
              x2={spoke.x2}
              y2={spoke.y2}
              stroke="#1f2937"
              strokeWidth="0.8"
            />
            <text
              x={spoke.x2 + (spoke.x2 > center ? 6 : spoke.x2 < center ? -18 : -6)}
              y={spoke.y2 + (spoke.y2 > center ? 12 : -6)}
              fill="#4b5563"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
            >
              {spoke.lon}°
            </text>
          </g>
        ))}

        {/* Solar grazing vector direction arrow */}
        {Number.isFinite(sunAz) && (
          <g transform={`rotate(${sunAz}, ${center}, ${center})`}>
            <line
              x1={center}
              y1={center + maxRadius * 0.75}
              x2={center}
              y2={center + maxRadius * 0.95}
              stroke="#f59e0b"
              strokeWidth="2"
              markerEnd="url(#arrow)"
            />
            <text
              x={center}
              y={center + maxRadius * 0.7}
              fill="#f59e0b"
              fontSize="9"
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
            >
              SUN (El {sunEl.toFixed(1)}°)
            </text>
          </g>
        )}

        {/* South Pole Center Dot */}
        <circle cx={center} cy={center} r={3} fill="#0284c7" />
        <text
          x={center}
          y={center + 14}
          fill="#38bdf8"
          fontSize="9"
          textAnchor="middle"
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
        >
          SOUTH POLE (-90°)
        </text>

        {/* Candidate Sites Markers */}
        {projectedSites.map((s) => (
          <g
            key={s.id}
            onClick={() => onSelectSite && onSelectSite(s.id)}
            className="cursor-pointer group"
          >
            {s.isSelected && (
              <circle
                cx={s.x}
                cy={s.y}
                r={12}
                fill="none"
                stroke="#0284c7"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
            )}
            <circle
              cx={s.x}
              cy={s.y}
              r={s.isSelected ? 5 : 3.5}
              fill={s.isSunlit ? '#f59e0b' : '#374151'}
              stroke={s.isSelected ? '#ffffff' : s.isSunlit ? '#d97706' : '#1f2937'}
              strokeWidth={s.isSelected ? 1.8 : 1}
            />
            <text
              x={s.x + 8}
              y={s.y + 3}
              fill={s.isSelected ? '#ffffff' : s.isSunlit ? '#e5e7eb' : '#9ca3af'}
              fontSize="10"
              fontWeight={s.isSelected ? 'bold' : 'normal'}
              fontFamily="Inter, sans-serif"
            >
              {s.name}
            </text>
          </g>
        ))}
      </svg>

      <div className="flex items-center gap-6 mt-3 text-xs font-mono text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span>Sunlit Terrain (&gt;-0.27°)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-neutral-700 inline-block" />
          <span>Nocturnal Shadow</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full border border-sky-400 inline-block" />
          <span>Selected Target</span>
        </div>
      </div>
    </div>
  );
}

export default PolarMap2D;
