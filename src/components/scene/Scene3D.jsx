import React, { Component, useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import { buildTerrain } from './terrain.js'
import { buildLander } from './lander.js'
import { buildRocks } from './rocks.js'
import { buildSky } from './sky.js'
import { buildCompassRing } from './compass.js'
import { buildShadowRuler } from './ShadowRuler.js'
import { createCameraController } from './cameraModes.js'
import { getTierConfig, createPerformanceProbe } from './quality.js'
import Hud from './Hud.jsx'
import SkyDiagram from './SkyDiagram.jsx'

/**
 * Error boundary catching any uncaught render errors and rendering SkyDiagram fallback.
 */
class SceneErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.warn('Scene3D caught error, falling back to SkyDiagram:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ width: '100%', height: '100%', minHeight: 360, position: 'relative', background: '#090d16' }}>
          <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold' }}>
            ⚠️ 3D view is unavailable on this device
          </div>
          <SkyDiagram
            sunEl={this.props.sunEl}
            sunAz={this.props.sunAz}
            earthEl={this.props.earthEl}
            earthAz={this.props.earthAz}
            label={this.props.label}
          />
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Internal 3D scene implementation.
 */
const Scene3DInner = forwardRef(function Scene3DInner(
  {
    sunEl = 5.0,
    sunAz = 180.0,
    earthEl = 5.0,
    earthAz = 0.0,
    siteId = 'shackleton',
    sites = [],
    onSelectSite,
    site = null,
    terrainType = 'plain',
    viewMode: propViewMode,
    quality = 'auto',
    label = '',
    landerHeight = 3,
    showHud = true,
    showShadowRuler = true,
    showSlopeHazard = false,
    heightmapUrl,
    onTierChange,
    onReturnToOrbit,
    onToggleShadowRuler,
    onViewModeChange,
    isComparison = false,
    comparisonData = null,
  },
  ref
) {
  const containerRef = useRef(null)
  const ctxRef = useRef(null)
  const [internalViewMode, setInternalViewMode] = useState(propViewMode || 'orbit')
  const [activeTier, setActiveTier] = useState(quality === 'auto' ? 'medium' : quality)
  const [notification, setNotification] = useState('')
  const [webglError, setWebglError] = useState(false)
  const isAscendingRef = useRef(false)

  // Apollo-style staging: Detaches ascentStage, leaves descentStage grounded
  const handleReturnToOrbit = () => {
    if (isAscendingRef.current) return
    isAscendingRef.current = true

    if (ctxRef.current?.lander?.triggerAscent) {
      setNotification('Ascent stage ignited · Detaching from descent stage into orbit')
      setTimeout(() => setNotification(''), 3500)

      ctxRef.current.lander.triggerAscent({
        onUpdate: () => {
          ctxRef.current?.invalidate()
        },
        onComplete: () => {
          isAscendingRef.current = false
          if (onReturnToOrbit) onReturnToOrbit()
        },
      })
    } else if (onReturnToOrbit) {
      isAscendingRef.current = false
      onReturnToOrbit()
    }
  }

  // Sync internal view mode when prop changes
  useEffect(() => {
    if (propViewMode) setInternalViewMode(propViewMode)
  }, [propViewMode])

  // Track last valid numeric angles for robust NaN / undefined clamping
  const lastAngles = useRef({
    sunEl: 5.0,
    sunAz: 180.0,
    earthEl: 5.0,
    earthAz: 0.0,
  })

  // Validate and clamp incoming angles
  if (Number.isFinite(sunEl)) lastAngles.current.sunEl = Math.max(-10, Math.min(30, sunEl))
  if (Number.isFinite(sunAz)) lastAngles.current.sunAz = ((sunAz % 360) + 360) % 360
  if (Number.isFinite(earthEl)) lastAngles.current.earthEl = Math.max(-10, Math.min(20, earthEl))
  if (Number.isFinite(earthAz)) lastAngles.current.earthAz = ((earthAz % 360) + 360) % 360

  const validSunEl = lastAngles.current.sunEl
  const validSunAz = lastAngles.current.sunAz
  const validEarthEl = lastAngles.current.earthEl
  const validEarthAz = lastAngles.current.earthAz
  const validLanderHeight = Number.isFinite(landerHeight) && landerHeight > 0 ? landerHeight : 3

  const activeViewMode = propViewMode || internalViewMode

  // Expose camera quick looks, staging ascent, and invalidate methods via ref
  useImperativeHandle(
    ref,
    () => ({
      lookAtSun: () => ctxRef.current?.cameraController?.lookAtSun(validSunEl, validSunAz),
      lookAtEarth: () => ctxRef.current?.cameraController?.lookAtEarth(validEarthEl, validEarthAz),
      lookNorth: () => ctxRef.current?.cameraController?.lookNorth(),
      triggerAscent: (opts) => ctxRef.current?.lander?.triggerAscent(opts),
      invalidate: () => ctxRef.current?.invalidate(),
    }),
    [validSunEl, validSunAz, validEarthEl, validEarthAz]
  )

  useEffect(() => {
    const nextTier = quality === 'auto' ? 'medium' : quality
    setActiveTier(nextTier)
  }, [quality])

  // (a) Initialize Three.js scene, renderer, camera & controllers
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isDisposed = false
    let renderRequested = false
    let animFrameId = null
    let isOffscreen = false
    let isHidden = document.hidden

    const tierConfig = getTierConfig(activeTier)
    const pixelRatio = Math.min(window.devicePixelRatio || 1, tierConfig.dpr)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: tierConfig.antialias,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      })
    } catch (err) {
      console.warn('WebGLRenderer creation failed:', err)
      setWebglError(true)
      return
    }

    renderer.setPixelRatio(pixelRatio)
    renderer.setClearColor(0x000000, 1.0)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap

    const canvas = renderer.domElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    container.appendChild(canvas)

    // Context loss / restoration listeners
    const handleContextLost = (e) => {
      e.preventDefault()
      console.warn('WebGL context lost')
      setWebglError(true)
    }

    const handleContextRestored = () => {
      console.info('WebGL context restored')
      setWebglError(false)
      invalidate()
    }

    canvas.addEventListener('webglcontextlost', handleContextLost)
    canvas.addEventListener('webglcontextrestored', handleContextRestored)

    // Scene & Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2500)
    camera.position.set(70, 40, 90)

    // Harsh directional Sun light with tuned orthographic shadow frustum
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.0)
    sunLight.castShadow = true
    const shadowMapDim = tierConfig.shadowMapSize
    sunLight.shadow.mapSize.width = shadowMapDim
    sunLight.shadow.mapSize.height = shadowMapDim
    sunLight.shadow.camera.left = -240
    sunLight.shadow.camera.right = 240
    sunLight.shadow.camera.top = 240
    sunLight.shadow.camera.bottom = -240
    sunLight.shadow.camera.near = 5
    sunLight.shadow.camera.far = 1300
    sunLight.shadow.bias = -0.0003
    sunLight.shadow.normalBias = 0.25
    scene.add(sunLight)
    scene.add(sunLight.target)

    // Faint baseline ambient mimicking deep space starlight (0.02)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.02)
    scene.add(ambientLight)

    // Faint bluish Earthshine directional light (no shadow)
    const earthLight = new THREE.DirectionalLight(0x7dd3fc, 0.04)
    earthLight.castShadow = false
    scene.add(earthLight)
    scene.add(earthLight.target)

    // Lander Model
    const lander = buildLander(validLanderHeight)
    scene.add(lander.group)

    // Sky system: Stars, Sun disk, Earth marker
    const sky = buildSky({ quality: activeTier })
    scene.add(sky.group)

    // Compass ring at 190m radius
    const compass = buildCompassRing()
    scene.add(compass.group)

    // Shadow Ruler with metric ticks and end badge
    const shadowRuler = buildShadowRuler()
    scene.add(shadowRuler.group)

    // Invalidate function for on-demand rendering
    const invalidate = () => {
      if (isDisposed || renderRequested || isOffscreen || isHidden) return
      renderRequested = true
      animFrameId = requestAnimationFrame(() => {
        renderRequested = false
        if (isDisposed || isOffscreen || isHidden) return
        renderer.render(scene, camera)
      })
    }

    // Camera controller supporting Orbit and Astronaut modes
    const cameraController = createCameraController({
      camera,
      domElement: canvas,
      invalidate,
      getPadY: () => ctxRef.current?.originPadHeight ?? 0,
      getHeightAt: (x, z) => ctxRef.current?.heightAt(x, z) ?? 0,
      quality: activeTier,
      onNotification: (msg) => {
        setNotification(msg)
        setTimeout(() => setNotification(''), 3000)
      },
    })

    const handleResize = () => {
      if (isDisposed || !container) return
      const width = container.clientWidth || 360
      const height = container.clientHeight || 360
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
      invalidate()
    }

    const resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(container)
    handleResize()

    // IntersectionObserver to pause when offscreen
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      isOffscreen = !entry.isIntersecting
      if (!isOffscreen) invalidate()
    })
    intersectionObserver.observe(container)

    // Tab visibility change
    const handleVisibilityChange = () => {
      isHidden = document.hidden
      if (!isHidden) invalidate()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Performance probe for auto tier
    let perfProbe = null
    if (quality === 'auto') {
      perfProbe = createPerformanceProbe({
        renderFrame: () => renderer.render(scene, camera),
        onDowngrade: (newTier) => {
          setActiveTier(newTier)
          if (onTierChange) onTierChange(newTier)
        },
      })
    }

    ctxRef.current = {
      renderer,
      scene,
      camera,
      sunLight,
      ambientLight,
      earthLight,
      lander,
      sky,
      compass,
      shadowRuler,
      rocksData: null,
      cameraController,
      terrainData: null,
      originPadHeight: 0,
      heightAt: () => 0,
      invalidate,
      dispose: () => {
        isDisposed = true
        if (animFrameId) cancelAnimationFrame(animFrameId)
        if (perfProbe) perfProbe.cancel()

        canvas.removeEventListener('webglcontextlost', handleContextLost)
        canvas.removeEventListener('webglcontextrestored', handleContextRestored)
        resizeObserver.disconnect()
        intersectionObserver.disconnect()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
        cameraController.dispose()

        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas)
        }

        lander.dispose()
        sky.dispose()
        compass.dispose()
        shadowRuler.dispose()

        if (ctxRef.current?.rocksData) {
          ctxRef.current.rocksData.dispose()
        }

        if (ctxRef.current?.terrainData) {
          ctxRef.current.terrainData.dispose()
        }

        renderer.dispose()
        if (renderer.forceContextLoss) {
          renderer.forceContextLoss()
        }
      },
    }

    return () => {
      if (ctxRef.current) {
        ctxRef.current.dispose()
        ctxRef.current = null
      }
    }
  }, [activeTier])

  // (b) Lightweight effect for angles, sun light, shadows, earthshine, lander scale, sky bodies, shadow ruler, and viewMode
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    const sunElRad = (validSunEl * Math.PI) / 180
    const sunAzRad = (validSunAz * Math.PI) / 180

    const sunDirX = Math.cos(sunElRad) * Math.sin(sunAzRad)
    const sunDirY = Math.sin(sunElRad)
    const sunDirZ = -Math.cos(sunElRad) * Math.cos(sunAzRad)

    let sunIntensity = 0.0
    if (validSunEl > -0.27) {
      sunIntensity = 3.0
    } else if (validSunEl > -0.37) {
      sunIntensity = 3.0 * ((validSunEl - (-0.37)) / 0.1)
    }

    const padY = ctx.originPadHeight || 0

    if (ctx.sunLight) {
      const sunDist = 500
      ctx.sunLight.position.set(
        sunDirX * sunDist,
        padY + Math.max(sunDirY * sunDist, 0.1),
        sunDirZ * sunDist
      )
      ctx.sunLight.target.position.set(0, padY, 0)
      ctx.sunLight.target.updateMatrixWorld()
      ctx.sunLight.shadow.camera.updateProjectionMatrix()
      ctx.sunLight.intensity = sunIntensity
    }

    const earthElRad = (validEarthEl * Math.PI) / 180
    const earthAzRad = (validEarthAz * Math.PI) / 180

    const earthDirX = Math.cos(earthElRad) * Math.sin(earthAzRad)
    const earthDirY = Math.sin(earthElRad)
    const earthDirZ = -Math.cos(earthElRad) * Math.cos(earthAzRad)

    if (ctx.earthLight) {
      const earthDist = 300
      ctx.earthLight.position.set(
        earthDirX * earthDist,
        padY + Math.max(earthDirY * earthDist, 0.1),
        earthDirZ * earthDist
      )
      ctx.earthLight.target.position.set(0, padY, 0)
      ctx.earthLight.target.updateMatrixWorld()
      ctx.earthLight.intensity = validEarthEl > 0 ? 0.04 : 0.0
    }

    if (ctx.sky) {
      ctx.sky.update(validSunEl, validSunAz, validEarthEl, validEarthAz, padY)
    }

    if (ctx.lander) {
      ctx.lander.setHeight(validLanderHeight)
    }

    if (ctx.shadowRuler) {
      ctx.shadowRuler.update({
        sunEl: validSunEl,
        sunAz: validSunAz,
        landerHeight: validLanderHeight,
        padY,
        showShadowRuler,
      })
    }

    if (ctx.cameraController) {
      ctx.cameraController.setMode(activeViewMode, {
        sunEl: validSunEl,
        sunAz: validSunAz,
        earthEl: validEarthEl,
        earthAz: validEarthAz,
      })
    }

    ctx.invalidate()
  }, [validSunEl, validSunAz, validEarthEl, validEarthAz, validLanderHeight, showShadowRuler, activeViewMode])

  // (c) Terrain and rocks rebuild effect (only on siteId, terrainType, activeTier, heightmapUrl)
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    if (ctx.rocksData) {
      ctx.scene.remove(ctx.rocksData.mesh)
      ctx.rocksData.dispose()
      ctx.rocksData = null
    }

    if (ctx.terrainData) {
      ctx.scene.remove(ctx.terrainData.mesh)
      ctx.terrainData.dispose()
      ctx.terrainData = null
    }

    const tierConfig = getTierConfig(activeTier)
    const terrain = buildTerrain({ siteId, terrainType, site, resolution: tierConfig.resolution, showSlopeHazard })
    ctx.terrainData = terrain
    ctx.heightAt = terrain.heightAt
    ctx.originPadHeight = terrain.originPadHeight
    ctx.scene.add(terrain.mesh)

    if (ctx.lander) {
      ctx.lander.group.position.set(0, terrain.originPadHeight, 0)
    }

    const rocks = buildRocks({ siteId, terrainType, site, quality: activeTier, heightAt: terrain.heightAt })
    ctx.rocksData = rocks
    ctx.scene.add(rocks.mesh)

    if (ctx.compass) {
      ctx.compass.updatePadY(terrain.originPadHeight)
    }

    if (ctx.shadowRuler) {
      ctx.shadowRuler.update({
        sunEl: validSunEl,
        sunAz: validSunAz,
        landerHeight: validLanderHeight,
        padY: terrain.originPadHeight,
        showShadowRuler,
      })
    }

    if (ctx.cameraController) {
      ctx.cameraController.updateTarget(terrain.originPadHeight)
    }

    if (ctx.sunLight) {
      ctx.sunLight.target.position.set(0, terrain.originPadHeight, 0)
      ctx.sunLight.target.updateMatrixWorld()
      ctx.sunLight.shadow.camera.updateProjectionMatrix()
    }
    if (ctx.earthLight) {
      ctx.earthLight.target.position.set(0, terrain.originPadHeight, 0)
      ctx.earthLight.target.updateMatrixWorld()
    }
    if (ctx.sky) {
      ctx.sky.update(validSunEl, validSunAz, validEarthEl, validEarthAz, terrain.originPadHeight)
    }

    ctx.invalidate()
  }, [siteId, terrainType, site, activeTier, heightmapUrl, showSlopeHazard])

  // If WebGL failed to initialize or context is permanently lost, render fallback SkyDiagram
  if (webglError) {
    return (
      <div style={{ width: '100%', height: '100%', minHeight: '360px', position: 'relative', background: '#090d16' }}>
        <div style={{ background: '#7f1d1d', color: '#fecaca', padding: '8px 12px', fontSize: '12px', fontWeight: 'bold' }}>
          ⚠️ 3D view is unavailable on this device
        </div>
        <SkyDiagram
          sunEl={validSunEl}
          sunAz={validSunAz}
          earthEl={validEarthEl}
          earthAz={validEarthAz}
          label={label || siteId}
        />
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: '360px',
        position: 'relative',
        overflow: 'hidden',
        background: '#000000',
      }}
    >
      {/* Dynamic Context-Aware HUD overlay */}
      {showHud && (
        <Hud
          label={label || siteId}
          siteId={siteId}
          sites={sites}
          onSelectSite={onSelectSite}
          sunEl={validSunEl}
          sunAz={validSunAz}
          earthEl={validEarthEl}
          earthAz={validEarthAz}
          landerHeight={validLanderHeight}
          viewMode={activeViewMode}
          onToggleViewMode={(newMode) => {
            setInternalViewMode(newMode)
            if (onViewModeChange) onViewModeChange(newMode)
          }}
          onLookSun={() => ctxRef.current?.cameraController?.lookAtSun(validSunEl, validSunAz)}
          onLookEarth={() => ctxRef.current?.cameraController?.lookAtEarth(validEarthEl, validEarthAz)}
          onLookNorth={() => ctxRef.current?.cameraController?.lookNorth()}
          quality={activeTier}
          onReturnToOrbit={handleReturnToOrbit}
          showShadowRuler={showShadowRuler}
          onToggleShadowRuler={onToggleShadowRuler}
          isComparison={isComparison}
          comparisonData={comparisonData}
        />
      )}

      {/* Toast Notification message */}
      {notification && (
        <div
          style={{
            position: 'absolute',
            top: '56px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#b91c1c',
            color: '#ffffff',
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          ⚠️ {notification}
        </div>
      )}
    </div>
  )
})

/**
 * Scene3D wrapped with ErrorBoundary
 */
export const Scene3D = forwardRef(function Scene3D(props, ref) {
  return (
    <SceneErrorBoundary {...props}>
      <Scene3DInner ref={ref} {...props} />
    </SceneErrorBoundary>
  )
})

export default Scene3D
