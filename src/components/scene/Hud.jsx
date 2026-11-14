import React from 'react'

/**
 * HUD Overlay for Scene3D.
 * Sits over the WebGL canvas with pointer-events: none (buttons re-enable pointer-events).
 *
 * @param {Object} props
 * @param {string} props.label - Site name / time label
 * @param {number} props.sunEl - Sun elevation in degrees
 * @param {number} props.sunAz - Sun azimuth in degrees
 * @param {number} props.earthEl - Earth elevation in degrees
 * @param {number} props.earthAz - Earth azimuth in degrees
 * @param {number} props.landerHeight - Lander height in meters
 * @param {string} props.viewMode - 'orbit' | 'astronaut'
 * @param {(mode: string) => void} props.onToggleViewMode - Callback to toggle view mode
 * @param {() => void} [props.onLookSun] - Astronaut quick-look at Sun
 * @param {() => void} [props.onLookEarth] - Astronaut quick-look at Earth
 * @param {() => void} [props.onLookNorth] - Astronaut quick-look at North
 * @param {string} [props.quality] - Active quality tier ('low', 'medium', 'high', 'auto')
 */
export default function Hud({
  label = '',
  sunEl = 2.0,
  sunAz = 180.0,
  earthEl = 5.0,
  earthAz = 20.0,
  landerHeight = 3,
  viewMode = 'orbit',
  onToggleViewMode,
  onLookSun,
  onLookEarth,
  onLookNorth,
  quality = 'auto',
}) {
  const safeSunEl = Number.isFinite(sunEl) ? sunEl : 2.0
  const safeSunAz = Number.isFinite(sunAz) ? sunAz : 180.0
  const safeEarthEl = Number.isFinite(earthEl) ? earthEl : 5.0
  const safeEarthAz = Number.isFinite(earthAz) ? earthAz : 20.0
  const heightM = Number.isFinite(landerHeight) && landerHeight > 0 ? landerHeight : 3

  // Compute shadow readout according to spec
  let shadowText = ''
  if (safeSunEl <= -0.27) {
    shadowText = 'Sun below horizon (lunar night)'
  } else if (safeSunEl < 0.1) {
    shadowText = 'Shadow: >150 m (very long, grazing angle)'
  } else {
    const elRad = (safeSunEl * Math.PI) / 180
    const rawLen = heightM / Math.tan(elRad)
    const ratio = rawLen / heightM
    if (rawLen >= 150) {
      shadowText = `Shadow: >150 m, ${ratio.toFixed(0)}× lander height`
    } else {
      shadowText = `Shadow: ${rawLen.toFixed(1)} m, ${ratio.toFixed(0)}× lander height`
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '10px 12px',
        boxSizing: 'border-box',
        color: '#f1f5f9',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
      }}
    >
      {/* Top Header Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '8px',
          width: '100%',
        }}
      >
        {/* Top-Left: Label & Quality Tier */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid #334155',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            lineHeight: 1.3,
            maxWidth: '65%',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div style={{ fontWeight: '600', color: '#60a5fa', wordBreak: 'break-word' }}>
            {label || 'Lunar Surface'}
          </div>
          <div style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'monospace' }}>
            H={heightM}m · Tier: {quality}
          </div>
        </div>

        {/* Top-Right: Illustrative Honesty Tag */}
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid #475569',
            padding: '3px 7px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: '600',
            color: '#cbd5e1',
            letterSpacing: '0.03em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          Illustrative terrain
        </div>
      </div>

      {/* Center Action Row: Astronaut Mode Quick-Look Controls */}
      {viewMode === 'astronaut' && (
        <div
          style={{
            alignSelf: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '6px',
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid #334155',
            padding: '6px 10px',
            borderRadius: '20px',
            pointerEvents: 'auto',
            backdropFilter: 'blur(6px)',
          }}
        >
          <button
            onClick={onLookSun}
            style={{
              background: 'rgba(234, 179, 8, 0.15)',
              border: '1px solid #eab308',
              color: '#fef08a',
              borderRadius: '12px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ☀️ Look at Sun
          </button>
          <button
            onClick={onLookEarth}
            style={{
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid #38bdf8',
              color: '#bae6fd',
              borderRadius: '12px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🌍 Look at Earth
          </button>
          <button
            onClick={onLookNorth}
            style={{
              background: 'rgba(148, 163, 184, 0.15)',
              border: '1px solid #94a3b8',
              color: '#f1f5f9',
              borderRadius: '12px',
              padding: '4px 10px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🧭 Look North
          </button>
        </div>
      )}

      {/* Bottom Footer Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          gap: '8px',
          width: '100%',
        }}
      >
        {/* Bottom-Left: Live Angles & Shadow Length Readout */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.88)',
            border: '1px solid #334155',
            padding: '6px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            lineHeight: 1.4,
            backdropFilter: 'blur(4px)',
            maxWidth: '75%',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontFamily: 'monospace' }}>
            <span style={{ color: safeSunEl > -0.27 ? '#fef08a' : '#94a3b8' }}>
              ☀️ Sun {safeSunEl.toFixed(1)}° el / {safeSunAz.toFixed(1)}° az
            </span>
            <span style={{ color: safeEarthEl > 0 ? '#93c5fd' : '#94a3b8' }}>
              🌍 Earth {safeEarthEl.toFixed(1)}° el / {safeEarthAz.toFixed(1)}° az
            </span>
          </div>
          <div style={{ color: '#cbd5e1', marginTop: '2px', fontSize: '10.5px' }}>
            {shadowText}
          </div>
        </div>

        {/* Bottom-Right: Orbit | Astronaut View Mode Toggle Button */}
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={() => onToggleViewMode && onToggleViewMode(viewMode === 'orbit' ? 'astronaut' : 'orbit')}
            style={{
              background: 'rgba(30, 41, 59, 0.9)',
              border: '1px solid #60a5fa',
              color: '#93c5fd',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '11px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
              whiteSpace: 'nowrap',
            }}
          >
            {viewMode === 'orbit' ? '👨‍🚀 Astronaut View' : '🪐 Orbit View'}
          </button>
        </div>
      </div>
    </div>
  )
}
