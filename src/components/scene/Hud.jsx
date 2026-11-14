import React from 'react'

/**
 * True-Dark Minimalist HUD Overlay for Scene3D & Surface Simulation.
 * Sits over the WebGL canvas with pointer-events: none (buttons re-enable pointer-events).
 *
 * @param {Object} props
 * @param {string} [props.label] - Site name / time label
 * @param {number} [props.sunEl] - Sun elevation in degrees
 * @param {number} [props.sunAz] - Sun azimuth in degrees
 * @param {number} [props.earthEl] - Earth elevation in degrees
 * @param {number} [props.earthAz] - Earth azimuth in degrees
 * @param {number} [props.landerHeight] - Lander height in meters
 * @param {string} [props.viewMode] - 'orbit' | 'astronaut'
 * @param {(mode: string) => void} [props.onToggleViewMode] - Callback to toggle view mode
 * @param {() => void} [props.onLookSun] - Astronaut quick-look at Sun
 * @param {() => void} [props.onLookEarth] - Astronaut quick-look at Earth
 * @param {() => void} [props.onLookNorth] - Astronaut quick-look at North
 * @param {string} [props.quality] - Active quality tier ('low', 'medium', 'high', 'auto')
 * @param {boolean} [props.isSimulating] - Whether the 20s sweeping day simulation is running
 * @param {() => void} [props.onToggleSimulation] - Toggle for 20s day simulation
 * @param {() => void} [props.onReturnToOrbit] - Callback to return to orbit view
 * @param {boolean} [props.showShadowRuler] - Whether shadow ruler is visible
 * @param {() => void} [props.onToggleShadowRuler] - Toggle shadow ruler
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
  isSimulating = false,
  onToggleSimulation,
  onReturnToOrbit,
  showShadowRuler = true,
  onToggleShadowRuler,
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
        padding: '12px 16px',
        boxSizing: 'border-box',
        color: '#f5f5f5',
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
          gap: '12px',
          width: '100%',
        }}
      >
        {/* Top-Left: Return to Orbit & Site Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onReturnToOrbit && (
            <button
              onClick={onReturnToOrbit}
              style={{
                pointerEvents: 'auto',
                background: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                color: '#f5f5f5',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                letterSpacing: '0.05em',
                fontWeight: '500',
                textTransform: 'uppercase',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffffff'
                e.currentTarget.style.color = '#000000'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
                e.currentTarget.style.color = '#f5f5f5'
              }}
              title="Return to 3D Orbital Moon View"
            >
              ↖ Return to Orbit
            </button>
          )}

          <div
            style={{
              background: 'rgba(0, 0, 0, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '5px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              lineHeight: 1.3,
              backdropFilter: 'blur(8px)',
              textShadow: '0 2px 4px rgba(0,0,0,0.8)',
            }}
          >
            <div style={{ fontWeight: '500', color: '#f5f5f5', letterSpacing: '0.02em' }}>
              {label || 'Lunar Surface Simulation'}
            </div>
            <div style={{ fontSize: '10px', color: '#a3a3a3', fontFamily: 'monospace' }}>
              H={heightM}m · Tier: {quality}
            </div>
          </div>
        </div>

        {/* Top-Right: Simulation Sweep Toggle & Illustrative Tag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onToggleSimulation && (
            <button
              onClick={onToggleSimulation}
              style={{
                pointerEvents: 'auto',
                background: isSimulating ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: isSimulating ? '#000000' : '#f5f5f5',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '600',
                letterSpacing: '0.05em',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
              }}
              title="Simulate complete 360° lunar sun cycle in 20 seconds"
            >
              <span>{isSimulating ? '⏸ Pause Sweep' : '▶ 20s Day Sweep'}</span>
            </button>
          )}

          {onToggleShadowRuler && (
            <button
              onClick={onToggleShadowRuler}
              style={{
                pointerEvents: 'auto',
                background: showShadowRuler ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#f5f5f5',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
              title="Toggle metric shadow measurement ruler"
            >
              📏 Ruler
            </button>
          )}

          <div
            style={{
              background: 'rgba(0, 0, 0, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '5px 8px',
              borderRadius: '6px',
              fontSize: '10px',
              fontWeight: '500',
              color: '#a3a3a3',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              backdropFilter: 'blur(8px)',
            }}
          >
            Illustrative Terrain
          </div>
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
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.75)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            padding: '6px 14px',
            borderRadius: '24px',
            pointerEvents: 'auto',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          }}
        >
          <button
            onClick={onLookSun}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f5f5f5',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#000000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#f5f5f5'
            }}
          >
            ☀️ Look at Sun
          </button>
          <button
            onClick={onLookEarth}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f5f5f5',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#000000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#f5f5f5'
            }}
          >
            🌍 Look at Earth
          </button>
          <button
            onClick={onLookNorth}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f5f5f5',
              borderRadius: '16px',
              padding: '4px 12px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#000000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#f5f5f5'
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
          gap: '12px',
          width: '100%',
        }}
      >
        {/* Bottom-Left: Live Angles & Shadow Length Readout */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '11px',
            lineHeight: 1.4,
            backdropFilter: 'blur(8px)',
            maxWidth: '70%',
            textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          }}
        >
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontFamily: 'monospace' }}>
            <span style={{ color: safeSunEl > -0.27 ? '#f5f5f5' : '#737373' }}>
              ☀️ Sun {safeSunEl.toFixed(1)}° el / {safeSunAz.toFixed(1)}° az
            </span>
            <span style={{ color: safeEarthEl > 0 ? '#d4d4d4' : '#737373' }}>
              🌍 Earth {safeEarthEl.toFixed(1)}° el / {safeEarthAz.toFixed(1)}° az
            </span>
            {isSimulating && (
              <span style={{ color: '#22c55e', fontWeight: 'bold' }}>
                ● 20s SWEEPING
              </span>
            )}
          </div>
          <div style={{ color: '#a3a3a3', marginTop: '3px', fontSize: '10.5px', fontFamily: 'monospace' }}>
            {shadowText}
          </div>
        </div>

        {/* Bottom-Right: Orbit | Astronaut View Mode Toggle Button */}
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={() => onToggleViewMode && onToggleViewMode(viewMode === 'orbit' ? 'astronaut' : 'orbit')}
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#f5f5f5',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.color = '#000000'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 0, 0, 0.75)'
              e.currentTarget.style.color = '#f5f5f5'
            }}
          >
            {viewMode === 'orbit' ? '👨‍🚀 Astronaut EVA View' : '🪐 Orbit Mast View'}
          </button>
        </div>
      </div>
    </div>
  )
}
