import React, { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { buildTerrain } from './terrain.js'
import { buildLander } from './lander.js'
import { buildRocks } from './rocks.js'
import { buildSky } from './sky.js'
import { buildCompassRing } from './compass.js'
import { createCameraController } from './cameraModes.js'

/**
 * Scene3D component
 * Visual contract:
 * @param {number} sunEl - Sun elevation in degrees (-10 to 30)
 * @param {number} sunAz - Sun azimuth in degrees (0 to 360, clockwise from north: N=0, E=90, S=180, W=270)
 * @param {number} earthEl - Earth elevation in degrees (-10 to 20)
 * @param {number} earthAz - Earth azimuth in degrees (0 to 360)
 * @param {string} siteId - Site identifier (e.g. 'shackleton', 'malapert')
 * @param {string} terrainType - 'crater-rim' | 'massif' | 'plain'
 * @param {string} viewMode - 'orbit' | 'astronaut'
 * @param {string} quality - 'auto' | 'low' | 'medium' | 'high'
 * @param {string} label - Display label
 * @param {number} landerHeight - Lander height in meters (default 3)
 * @param {boolean} showHud - Show HUD overlay (default true)
 * @param {boolean} showShadowRuler - Show shadow ruler (default true)
 * @param {string} [heightmapUrl] - Optional stretch goal heightmap URL
 */
export default function Scene3D({
  sunEl = 2.0,
  sunAz = 180.0,
  earthEl = 5.0,
  earthAz = 20.0,
  siteId = 'shackleton',
  terrainType = 'plain',
  viewMode = 'orbit',
  quality = 'auto',
  label = '',
  landerHeight = 3,
  showHud = true,
  showShadowRuler = true,
  heightmapUrl,
}) {
  const containerRef = useRef(null)
  const ctxRef = useRef(null)
  const [notification, setNotification] = useState('')

  const getResolution = (q) => {
    if (q === 'low') return 129
    if (q === 'high') return 385
    return 257
  }

  // (a) Initialize Three.js scene, renderer, camera & controllers
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isDisposed = false
    let renderRequested = false
    let animFrameId = null

    const tierMaxDpr = quality === 'low' ? 1.0 : quality === 'medium' ? 1.5 : 2.0
    const pixelRatio = Math.min(window.devicePixelRatio || 1, tierMaxDpr)

    let renderer
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: quality !== 'low',
        powerPreference: 'default',
      })
    } catch (err) {
      console.error('Failed to create WebGLRenderer:', err)
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

    // Scene & Camera
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2500)
    camera.position.set(70, 40, 90)

    // Harsh directional Sun light with tuned orthographic shadow frustum
    const sunLight = new THREE.DirectionalLight(0xffffff, 3.0)
    sunLight.castShadow = true
    const shadowMapDim = quality === 'low' ? 1024 : 2048
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
    const lander = buildLander(landerHeight)
    scene.add(lander.group)

    // Sky system: Stars, Sun disk, Earth marker
    const sky = buildSky({ quality })
    scene.add(sky.group)

    // Compass ring at 190m radius
    const compass = buildCompassRing()
    scene.add(compass.group)

    // Invalidate function for on-demand rendering
    const invalidate = () => {
      if (isDisposed || renderRequested) return
      renderRequested = true
      animFrameId = requestAnimationFrame(() => {
        renderRequested = false
        if (isDisposed) return
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
      quality,
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
      rocksData: null,
      cameraController,
      terrainData: null,
      originPadHeight: 0,
      heightAt: () => 0,
      invalidate,
      dispose: () => {
        isDisposed = true
        if (animFrameId) cancelAnimationFrame(animFrameId)
        resizeObserver.disconnect()
        cameraController.dispose()

        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas)
        }

        lander.dispose()
        sky.dispose()
        compass.dispose()

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
  }, [quality])

  // (b) Lightweight effect for angles, sun light, shadows, earthshine, lander scale, sky bodies, and viewMode
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    const safeSunEl = Number.isFinite(sunEl) ? sunEl : 2.0
    const safeSunAz = Number.isFinite(sunAz) ? sunAz : 180.0
    const safeEarthEl = Number.isFinite(earthEl) ? earthEl : 5.0
    const safeEarthAz = Number.isFinite(earthAz) ? earthAz : 20.0

    const sunElRad = (safeSunEl * Math.PI) / 180
    const sunAzRad = (safeSunAz * Math.PI) / 180

    const sunDirX = Math.cos(sunElRad) * Math.sin(sunAzRad)
    const sunDirY = Math.sin(sunElRad)
    const sunDirZ = -Math.cos(sunElRad) * Math.cos(sunAzRad)

    let sunIntensity = 0.0
    if (safeSunEl > -0.27) {
      sunIntensity = 3.0
    } else if (safeSunEl > -0.37) {
      sunIntensity = 3.0 * ((safeSunEl - (-0.37)) / 0.1)
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

    const earthElRad = (safeEarthEl * Math.PI) / 180
    const earthAzRad = (safeEarthAz * Math.PI) / 180

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
      ctx.earthLight.intensity = safeEarthEl > 0 ? 0.04 : 0.0
    }

    if (ctx.sky) {
      ctx.sky.update(safeSunEl, safeSunAz, safeEarthEl, safeEarthAz, padY)
    }

    if (ctx.lander) {
      ctx.lander.setHeight(landerHeight)
    }

    if (ctx.cameraController) {
      ctx.cameraController.setMode(viewMode, {
        sunEl: safeSunEl,
        sunAz: safeSunAz,
        earthEl: safeEarthEl,
        earthAz: safeEarthAz,
      })
    }

    ctx.invalidate()
  }, [sunEl, sunAz, earthEl, earthAz, landerHeight, viewMode])

  // (c) Terrain and rocks rebuild effect (only on siteId, terrainType, quality, heightmapUrl)
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    // Clean up previous rocks
    if (ctx.rocksData) {
      ctx.scene.remove(ctx.rocksData.mesh)
      ctx.rocksData.dispose()
      ctx.rocksData = null
    }

    // Clean up previous terrain
    if (ctx.terrainData) {
      ctx.scene.remove(ctx.terrainData.mesh)
      ctx.terrainData.dispose()
      ctx.terrainData = null
    }

    const resolution = getResolution(quality)
    const terrain = buildTerrain({ siteId, terrainType, resolution })
    ctx.terrainData = terrain
    ctx.heightAt = terrain.heightAt
    ctx.originPadHeight = terrain.originPadHeight
    ctx.scene.add(terrain.mesh)

    // Position lander feet on pad height at (0, 0)
    if (ctx.lander) {
      ctx.lander.group.position.set(0, terrain.originPadHeight, 0)
    }

    // Build rocks and landmark scatter
    const rocks = buildRocks({ siteId, quality, heightAt: terrain.heightAt })
    ctx.rocksData = rocks
    ctx.scene.add(rocks.mesh)

    // Update compass ring elevation
    if (ctx.compass) {
      ctx.compass.updatePadY(terrain.originPadHeight)
    }

    // Update camera controls focus to lander
    if (ctx.cameraController) {
      ctx.cameraController.updateTarget(terrain.originPadHeight)
    }

    // Update sun & earth light targets and sky bodies
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
      ctx.sky.update(sunEl, sunAz, earthEl, earthAz, terrain.originPadHeight)
    }

    ctx.invalidate()
  }, [siteId, terrainType, quality, heightmapUrl])

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
      {/* Top watermark tags */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          color: '#e2e8f0',
          fontSize: '12px',
          fontFamily: 'monospace',
          pointerEvents: 'none',
          background: 'rgba(15, 23, 42, 0.75)',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #334155',
        }}
      >
        {label || siteId} · {terrainType} · {viewMode === 'astronaut' ? 'Astronaut 1.7m view' : 'Orbit view'}
      </div>

      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          color: '#cbd5e1',
          fontSize: '11px',
          fontFamily: 'sans-serif',
          pointerEvents: 'none',
          background: 'rgba(30, 41, 59, 0.85)',
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #475569',
        }}
      >
        Illustrative terrain
      </div>

      {/* Astronaut view quick-look action bar */}
      {viewMode === 'astronaut' && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            background: 'rgba(15, 23, 42, 0.85)',
            padding: '6px 12px',
            borderRadius: '24px',
            border: '1px solid #334155',
            backdropFilter: 'blur(4px)',
            zIndex: 10,
          }}
        >
          <button
            onClick={() => ctxRef.current?.cameraController?.lookAtSun(sunEl, sunAz)}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: '1px solid #eab308',
              background: 'rgba(234, 179, 8, 0.15)',
              color: '#fef08a',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            ☀️ Look at Sun
          </button>
          <button
            onClick={() => ctxRef.current?.cameraController?.lookAtEarth(earthEl, earthAz)}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: '1px solid #38bdf8',
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#bae6fd',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🌍 Look at Earth
          </button>
          <button
            onClick={() => ctxRef.current?.cameraController?.lookNorth()}
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              border: '1px solid #94a3b8',
              background: 'rgba(148, 163, 184, 0.15)',
              color: '#f1f5f9',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            🧭 Look North
          </button>
        </div>
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
}
