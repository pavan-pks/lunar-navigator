import React from 'react'

/**
 * Lightweight SVG Sky Projection Diagram.
 * Zero-GPU / WebGL fallback view plotting celestial coordinates (Sun and Earth).
 *
 * @param {Object} props
 * @param {number} [props.sunEl=5] - Sun elevation in degrees (-10 to 40)
 * @param {number} [props.sunAz=180] - Sun azimuth in degrees (0 to 360)
 * @param {number} [props.earthEl=5] - Earth elevation in degrees (-10 to 40)
 * @param {number} [props.earthAz=0] - Earth azimuth in degrees (0 to 360)
 * @param {string} [props.label=''] - Optional location or time label
 * @param {number|string} [props.height=320] - Component height
 */
export default function SkyDiagram({
  sunEl = 5.0,
  sunAz = 180.0,
  earthEl = 5.0,
  earthAz = 0.0,
  label = '',
  height = 320,
}) {
  // Safe clamped fallbacks
  const safeSunEl = Number.isFinite(sunEl) ? sunEl : 5.0
  const safeSunAz = Number.isFinite(sunAz) ? ((sunAz % 360) + 360) % 360 : 180.0
  const safeEarthEl = Number.isFinite(earthEl) ? earthEl : 5.0
  const safeEarthAz = Number.isFinite(earthAz) ? ((earthAz % 360) + 360) % 360 : 0.0

  // SVG coordinate system mapping
  // X: Azimuth 0 to 360 -> X: 60 to 560 (width 500)
  // Y: Elevation -10 to 40 -> Y: 240 down to 40 (height 200)
  const mapX = (az) => 60 + (az / 360) * 500
  const mapY = (el) => {
    const clampedEl = Math.max(-10, Math.min(40, el))
    return 240 - ((clampedEl - (-10)) / 50) * 200
  }

  const sunX = mapX(safeSunAz)
  const sunY = mapY(safeSunEl)
  const earthX = mapX(safeEarthAz)
  const earthY = mapY(safeEarthEl)
  const horizonY = mapY(0) // 200

  const isSunUp = safeSunEl > -0.27
  const isEarthUp = safeEarthEl > 0

  const cardinals = [
    { name: 'N', az: 0 },
    { name: 'NE', az: 45 },
    { name: 'E', az: 90 },
    { name: 'SE', az: 135 },
    { name: 'S', az: 180 },
    { name: 'SW', az: 225 },
    { name: 'W', az: 270 },
    { name: 'NW', az: 315 },
    { name: 'N', az: 360 },
  ]

  const elevationLines = [30, 20, 10, 0, -10]

  return (
    <div
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        background: '#090d16',
        borderRadius: '6px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <svg
        viewBox="0 0 620 280"
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#020617" />
            <stop offset="100%" stopColor="#0b0f19" />
          </linearGradient>
          <linearGradient id="groundGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fef08a" stopOpacity="1" />
            <stop offset="40%" stopColor="#eab308" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#ca8a04" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Sky & Ground background areas */}
        <rect x="60" y="40" width="500" height={horizonY - 40} fill="url(#skyGrad)" />
        <rect x="60" y={horizonY} width="500" height={240 - horizonY} fill="url(#groundGrad)" />

        {/* Elevation grid lines */}
        {elevationLines.map((el) => {
          const y = mapY(el)
          const isHorizon = el === 0
          return (
            <g key={el}>
              <line
                x1="60"
                y1={y}
                x2="560"
                y2={y}
                stroke={isHorizon ? '#38bdf8' : '#334155'}
                strokeWidth={isHorizon ? '2' : '1'}
                strokeDasharray={isHorizon ? 'none' : '2,4'}
              />
              <text
                x="52"
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill={isHorizon ? '#38bdf8' : '#64748b'}
                fontFamily="monospace"
              >
                {el > 0 ? `+${el}°` : `${el}°`}
              </text>
            </g>
          )
        })}

        {/* Azimuth vertical lines & Compass labels */}
        {cardinals.map(({ name, az }, idx) => {
          const x = mapX(az)
          const isMajor = name === 'N' || name === 'E' || name === 'S' || name === 'W'
          return (
            <g key={idx}>
              <line
                x1={x}
                y1="40"
                x2={x}
                y2="240"
                stroke="#1e293b"
                strokeWidth={isMajor ? '1.5' : '1'}
                strokeDasharray={isMajor ? 'none' : '2,4'}
              />
              <text
                x={x}
                y="256"
                textAnchor="middle"
                fontSize={isMajor ? '11' : '9'}
                fontWeight={isMajor ? 'bold' : 'normal'}
                fill={isMajor ? (name === 'N' ? '#ef4444' : '#e2e8f0') : '#64748b'}
              >
                {name}
              </text>
              <text
                x={x}
                y="268"
                textAnchor="middle"
                fontSize="8"
                fill="#475569"
                fontFamily="monospace"
              >
                {az}°
              </text>
            </g>
          )
        })}

        {/* Horizon label banner */}
        <text
          x="65"
          y={horizonY - 4}
          fill="#38bdf8"
          fontSize="9"
          fontWeight="bold"
          letterSpacing="0.05em"
        >
          HORIZON (0°)
        </text>

        {/* Earth Marker */}
        <g>
          {isEarthUp ? (
            <>
              <circle cx={earthX} cy={earthY} r="9" fill="#0284c7" />
              <circle cx={earthX} cy={earthY} r="7" fill="#38bdf8" />
              <circle cx={earthX - 2} cy={earthY - 2} r="3" fill="#22c55e" opacity="0.8" />
              <circle cx={earthX + 2} cy={earthY + 2} r="2" fill="#ffffff" opacity="0.7" />
            </>
          ) : (
            <circle
              cx={earthX}
              cy={earthY}
              r="7"
              fill="none"
              stroke="#0284c7"
              strokeWidth="2"
              strokeDasharray="2,2"
              opacity="0.6"
            />
          )}
          <text
            x={earthX}
            y={earthY - 12}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#7dd3fc"
          >
            Earth ({safeEarthEl.toFixed(1)}°, {safeEarthAz.toFixed(0)}°)
          </text>
        </g>

        {/* Sun Marker */}
        <g>
          {isSunUp ? (
            <>
              <circle cx={sunX} cy={sunY} r="16" fill="url(#sunGlow)" />
              <circle cx={sunX} cy={sunY} r="6" fill="#ffffff" />
            </>
          ) : (
            <circle
              cx={sunX}
              cy={sunY}
              r="6"
              fill="none"
              stroke="#eab308"
              strokeWidth="2"
              strokeDasharray="2,2"
              opacity="0.6"
            />
          )}
          <text
            x={sunX}
            y={sunY + 18}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="#fef08a"
          >
            Sun ({safeSunEl.toFixed(1)}°, {safeSunAz.toFixed(0)}°)
          </text>
        </g>

        {/* Chart Title & Watermark */}
        <text x="60" y="24" fill="#60a5fa" fontSize="12" fontWeight="bold">
          {label ? `${label} · 2D Sky Diagram` : 'Lunar Celestial Sky Diagram'}
        </text>
        <text x="560" y="24" textAnchor="end" fill="#64748b" fontSize="10">
          Azimuth 0°–360° · Elevation −10°–+40°
        </text>
      </svg>
    </div>
  )
}
