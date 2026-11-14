import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { buildTerrain } from './terrain.js'
import { buildLander } from './lander.js'
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

  const getResolution = (q) => {
    if (q === 'low') return 129
    if (q === 'high') return 385
    return 257
  }

  // (a) Initialize Three.js scene, renderer, camera & controls
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
    camera.position.set(28, 16, 36)

    // Directional light & target setup
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.8)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.width = quality === 'low' ? 1024 : 2048
    sunLight.shadow.mapSize.height = quality === 'low' ? 1024 : 2048
    sunLight.shadow.camera.left = -220
    sunLight.shadow.camera.right = 220
    sunLight.shadow.camera.top = 220
    sunLight.shadow.camera.bottom = -220
    sunLight.shadow.camera.near = 1
    sunLight.shadow.camera.far = 1300
    sunLight.shadow.bias = -0.0005
    sunLight.shadow.normalBias = 0.3
    scene.add(sunLight)
    scene.add(sunLight.target)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05)
    scene.add(ambientLight)

    // P-04 Lander Model
    const lander = buildLander(landerHeight)
    scene.add(lander.group)

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

    // Camera controller (OrbitControls with terrain height constraint)
    const cameraController = createCameraController({
      camera,
      domElement: canvas,
      invalidate,
      getPadY: () => ctxRef.current?.originPadHeight ?? 0,
      getHeightAt: (x, z) => ctxRef.current?.heightAt(x, z) ?? 0,
      quality,
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
      lander,
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

  // (b) Lightweight effect for angle, light, and lander scale changes
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    const safeSunEl = Number.isFinite(sunEl) ? sunEl : 2.0
    const safeSunAz = Number.isFinite(sunAz) ? sunAz : 180.0

    // Coordinate convention: +Y up, +X east, -Z north
    // Direction toward body: x = cos(el) * sin(az), y = sin(el), z = -cos(el) * cos(az)
    const elRad = (safeSunEl * Math.PI) / 180
    const azRad = (safeSunAz * Math.PI) / 180

    const dirX = Math.cos(elRad) * Math.sin(azRad)
    const dirY = Math.sin(elRad)
    const dirZ = -Math.cos(elRad) * Math.cos(azRad)

    if (ctx.sunLight) {
      const dist = 500
      const padY = ctx.originPadHeight || 0
      ctx.sunLight.position.set(dirX * dist, padY + Math.max(dirY * dist, 0.5), dirZ * dist)
      ctx.sunLight.target.position.set(0, padY, 0)
      ctx.sunLight.target.updateMatrixWorld()
      ctx.sunLight.intensity = safeSunEl > -0.27 ? 2.8 : 0.0
    }

    if (ctx.lander) {
      ctx.lander.setHeight(landerHeight)
    }

    ctx.invalidate()
  }, [sunEl, sunAz, earthEl, earthAz, landerHeight, viewMode])

  // (c) Terrain rebuild effect (only on siteId, terrainType, quality, heightmapUrl)
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return

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

    // Update camera controls focus to lander
    if (ctx.cameraController) {
      ctx.cameraController.updateTarget(terrain.originPadHeight)
    }

    // Update sun light target
    if (ctx.sunLight) {
      ctx.sunLight.target.position.set(0, terrain.originPadHeight, 0)
      ctx.sunLight.target.updateMatrixWorld()
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
        {label || siteId} · {terrainType} · H={landerHeight}m
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
    </div>
  )
}
