import React, { useState, useEffect, useRef } from 'react'
import { Scene3D } from '../components/scene'

const SITE_PRESETS = [
  { id: 'shackleton', name: 'Shackleton Crater Rim', terrainType: 'crater-rim' },
  { id: 'malapert', name: 'Malapert Massif', terrainType: 'massif' },
  { id: 'plain-test', name: 'South Pole Plain (Test)', terrainType: 'plain' },
  { id: 'apollo11', name: 'Mare Tranquillitatis (Apollo 11)', terrainType: 'plain' },
]

export default function PavanSandbox() {
  // Angle controls
  const [sunEl, setSunEl] = useState(2.0)
  const [sunAz, setSunAz] = useState(180.0)
  const [earthEl, setEarthEl] = useState(5.0)
  const [earthAz, setEarthAz] = useState(20.0)

  // Configuration controls
  const [selectedSiteId, setSelectedSiteId] = useState('shackleton')
  const [viewMode, setViewMode] = useState('orbit')
  const [quality, setQuality] = useState('auto')
  const [showHud, setShowHud] = useState(true)
  const [showShadowRuler, setShowShadowRuler] = useState(true)
  const [landerHeight, setLanderHeight] = useState(3)

  // Compare test (side-by-side)
  const [compareTest, setCompareTest] = useState(false)
  const [compareSiteId, setCompareSiteId] = useState('malapert')

  // Simulation state
  const [isSimulating, setIsSimulating] = useState(false)
  const simRef = useRef({ lastTime: null, azimuth: 180.0, baseEarthAz: 20.0 })

  // Live FPS Counter
  const [fps, setFps] = useState(0)
  const [frameTimeMs, setFrameTimeMs] = useState(0)
  const fpsRef = useRef({ frames: 0, lastCheck: performance.now(), lastFrame: performance.now() })

  // Active site preset
  const currentSite = SITE_PRESETS.find((s) => s.id === selectedSiteId) || SITE_PRESETS[0]
  const secondSite = SITE_PRESETS.find((s) => s.id === compareSiteId) || SITE_PRESETS[1]

  // Lunar day animation loop
  useEffect(() => {
    if (!isSimulating) {
      simRef.current.lastTime = null
      return
    }

    let animId
    const step = (time) => {
      if (!simRef.current.lastTime) {
        simRef.current.lastTime = time
        simRef.current.azimuth = sunAz
        simRef.current.baseEarthAz = earthAz
      }

      const dt = (time - simRef.current.lastTime) / 1000
      simRef.current.lastTime = time

      // 360 degrees in ~20 seconds = 18 deg/sec
      const newAz = (simRef.current.azimuth + dt * 18) % 360
      simRef.current.azimuth = newAz

      const azRad = (newAz * Math.PI) / 180
      // Fake but plausible low-elevation sun variation at south pole
      const newEl = Number((1.5 + 1.2 * Math.sin(2 * azRad)).toFixed(2))

      // Slowly oscillating / drifting Earth (sub-Earth libration approximation)
      const newEarthAz = Number(((simRef.current.baseEarthAz + Math.sin(azRad) * 3 + 360) % 360).toFixed(1))
      const newEarthEl = Number((5.0 + Math.cos(azRad) * 1.5).toFixed(1))

      setSunAz(Number(newAz.toFixed(1)))
      setSunEl(newEl)
      setEarthAz(newEarthAz)
      setEarthEl(newEarthEl)

      animId = requestAnimationFrame(step)
    }

    animId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animId)
  }, [isSimulating])

  // FPS Counter loop
  useEffect(() => {
    let animId
    const countFps = (time) => {
      const dt = time - fpsRef.current.lastFrame
      fpsRef.current.lastFrame = time
      fpsRef.current.frames++

      if (time - fpsRef.current.lastCheck >= 500) {
        const measuredFps = Math.round((fpsRef.current.frames * 1000) / (time - fpsRef.current.lastCheck))
        setFps(measuredFps)
        setFrameTimeMs(Number(dt.toFixed(1)))
        fpsRef.current.frames = 0
        fpsRef.current.lastCheck = time
      }
      animId = requestAnimationFrame(countFps)
    }
    animId = requestAnimationFrame(countFps)
    return () => cancelAnimationFrame(animId)
  }, [])

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden', background: '#090d16', color: '#e2e8f0' }}>
      {/* Left Control Panel */}
      <div
        style={{
          width: '340px',
          minWidth: '340px',
          height: '100%',
          overflowY: 'auto',
          padding: '16px',
          boxSizing: 'border-box',
          background: '#111827',
          borderRight: '1px solid #1f2937',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          fontSize: '13px',
        }}
      >
        <div style={{ borderBottom: '1px solid #374151', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#60a5fa' }}>
              Lunar Scene Sandbox
            </h2>
            <div
              style={{
                background: fps < 24 ? '#7f1d1d' : '#065f46',
                color: '#fff',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
            >
              {fps} FPS ({frameTimeMs} ms)
            </div>
          </div>
          <p style={{ margin: '4px 0 0 0', color: '#9ca3af', fontSize: '11px' }}>
            Pavan's independent 3D visual test harness (P-01)
          </p>
        </div>

        {/* Lunar Day Simulation Button */}
        <div>
          <button
            onClick={() => setIsSimulating((prev) => !prev)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              background: isSimulating ? '#dc2626' : '#2563eb',
              color: '#ffffff',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {isSimulating ? '⏹ Stop Simulation' : '▶ Simulate Lunar Day (~20s loop)'}
          </button>
        </div>

        {/* Angles: Sun */}
        <div style={{ background: '#1f2937', padding: '12px', borderRadius: '6px' }}>
          <div style={{ fontWeight: 'bold', color: '#fbbf24', marginBottom: '8px' }}>
            ☀️ Sun Position
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Elevation:</span>
              <span style={{ fontFamily: 'monospace', color: '#fef08a' }}>{sunEl.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="-10"
              max="30"
              step="0.1"
              value={sunEl}
              onChange={(e) => setSunEl(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
              <span>-10°</span>
              <span>0° (horizon)</span>
              <span>+30°</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Azimuth:</span>
              <span style={{ fontFamily: 'monospace', color: '#fef08a' }}>{sunAz.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="0.5"
              value={sunAz}
              onChange={(e) => setSunAz(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
              <span>0° (N)</span>
              <span>90° (E)</span>
              <span>180° (S)</span>
              <span>270° (W)</span>
            </div>
          </div>
        </div>

        {/* Angles: Earth */}
        <div style={{ background: '#1f2937', padding: '12px', borderRadius: '6px' }}>
          <div style={{ fontWeight: 'bold', color: '#60a5fa', marginBottom: '8px' }}>
            🌍 Earth Position
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Elevation:</span>
              <span style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{earthEl.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="-10"
              max="20"
              step="0.1"
              value={earthEl}
              onChange={(e) => setEarthEl(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
              <span>-10°</span>
              <span>0° (horizon)</span>
              <span>+20°</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span>Azimuth:</span>
              <span style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{earthAz.toFixed(1)}°</span>
            </div>
            <input
              type="range"
              min="0"
              max="360"
              step="0.5"
              value={earthAz}
              onChange={(e) => setEarthAz(parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#6b7280' }}>
              <span>0° (N)</span>
              <span>90° (E)</span>
              <span>180° (S)</span>
              <span>270° (W)</span>
            </div>
          </div>
        </div>

        {/* Site & Scene Settings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#d1d5db' }}>Site Selection:</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151',
              }}
            >
              {SITE_PRESETS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.terrainType})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', color: '#d1d5db' }}>View Mode:</label>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: '#1f2937',
                  color: '#fff',
                  border: '1px solid #374151',
                }}
              >
                <option value="orbit">Orbit</option>
                <option value="astronaut">Astronaut</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', color: '#d1d5db' }}>Quality Tier:</label>
              <select
                value={quality}
                onChange={(e) => setQuality(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: '#1f2937',
                  color: '#fff',
                  border: '1px solid #374151',
                }}
              >
                <option value="auto">Auto</option>
                <option value="low">Low (no GPU)</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '4px', color: '#d1d5db' }}>Lander Height (m):</label>
            <input
              type="number"
              min="1"
              max="20"
              step="0.5"
              value={landerHeight}
              onChange={(e) => setLanderHeight(parseFloat(e.target.value) || 3)}
              style={{
                width: '100%',
                padding: '6px 8px',
                borderRadius: '4px',
                background: '#1f2937',
                color: '#fff',
                border: '1px solid #374151',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showHud}
                onChange={(e) => setShowHud(e.target.checked)}
              />
              Show HUD Overlay
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showShadowRuler}
                onChange={(e) => setShowShadowRuler(e.target.checked)}
              />
              Show Shadow Ruler
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#38bdf8' }}>
              <input
                type="checkbox"
                checked={compareTest}
                onChange={(e) => setCompareTest(e.target.checked)}
              />
              Compare Test (Dual WebGL Scenes)
            </label>
          </div>

          {compareTest && (
            <div style={{ background: '#1e293b', padding: '10px', borderRadius: '6px', border: '1px solid #38bdf8' }}>
              <label style={{ display: 'block', marginBottom: '4px', color: '#93c5fd' }}>Scene B Site:</label>
              <select
                value={compareSiteId}
                onChange={(e) => setCompareSiteId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  background: '#0f172a',
                  color: '#fff',
                  border: '1px solid #334155',
                }}
              >
                {SITE_PRESETS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.terrainType})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
      <div
        style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: compareTest ? 'row' : 'column',
          background: '#000000',
          position: 'relative',
        }}
      >
        <div style={{ flex: 1, height: '100%', position: 'relative', borderRight: compareTest ? '2px solid #334155' : 'none' }}>
          <Scene3D
            sunEl={sunEl}
            sunAz={sunAz}
            earthEl={earthEl}
            earthAz={earthAz}
            siteId={currentSite.id}
            terrainType={currentSite.terrainType}
            viewMode={viewMode}
            quality={quality}
            label={`${currentSite.name} [Scene A]`}
            landerHeight={landerHeight}
            showHud={showHud}
            showShadowRuler={showShadowRuler}
          />
        </div>

        {compareTest && (
          <div style={{ flex: 1, height: '100%', position: 'relative' }}>
            <Scene3D
              sunEl={sunEl}
              sunAz={sunAz}
              earthEl={earthEl}
              earthAz={earthAz}
              siteId={secondSite.id}
              terrainType={secondSite.terrainType}
              viewMode={viewMode}
              quality={quality}
              label={`${secondSite.name} [Scene B]`}
              landerHeight={landerHeight}
              showHud={showHud}
              showShadowRuler={showShadowRuler}
            />
          </div>
        )}
      </div>
    </div>
  )
}
