import React, { useEffect, useRef } from 'react'
import * as THREE from 'three'

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

  // (a) Initialize Three.js scene, renderer, camera, and basic scaffolding
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let isDisposed = false
    let renderRequested = false
    let animFrameId = null

    // Determine max pixel ratio based on quality tier
    const tierMaxDpr = quality === 'low' ? 1.0 : quality === 'medium' ? 1.5 : 2.0
    const pixelRatio = Math.min(window.devicePixelRatio || 1, tierMaxDpr)

    // Renderer setup
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
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 2000)
    // Starting position (+Y up, +X east, -Z north)
    camera.position.set(70, 40, 90)
    camera.lookAt(0, 0, 0)

    // P-02 Test cube and basic lighting
    const cubeGeo = new THREE.BoxGeometry(6, 6, 6)
    const cubeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.8,
      metalness: 0.1,
    })
    const testCube = new THREE.Mesh(cubeGeo, cubeMat)
    testCube.position.set(0, 3, 0)
    testCube.castShadow = true
    testCube.receiveShadow = true
    scene.add(testCube)

    // Simple test ground plane
    const groundGeo = new THREE.PlaneGeometry(80, 80)
    groundGeo.rotateX(-Math.PI / 2)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 })
    const testGround = new THREE.Mesh(groundGeo, groundMat)
    testGround.position.set(0, 0, 0)
    testGround.receiveShadow = true
    scene.add(testGround)

    // Test directional light & ambient
    const testLight = new THREE.DirectionalLight(0xffffff, 2.5)
    testLight.position.set(40, 30, -50)
    testLight.castShadow = true
    scene.add(testLight)

    const testAmbient = new THREE.AmbientLight(0xffffff, 0.15)
    scene.add(testAmbient)

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

    // ResizeObserver handler
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

    // Store references in ctxRef for props update effects
    ctxRef.current = {
      renderer,
      scene,
      camera,
      testCube,
      testLight,
      invalidate,
      dispose: () => {
        isDisposed = true
        if (animFrameId) cancelAnimationFrame(animFrameId)
        resizeObserver.disconnect()

        // Remove canvas from DOM
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas)
        }

        // Dispose geometries and materials
        cubeGeo.dispose()
        cubeMat.dispose()
        groundGeo.dispose()
        groundMat.dispose()

        // Dispose renderer & force context loss
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

  // (b) Lightweight effect for angle and prop changes (never rebuilds scene)
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    // Safe clamp for incoming angles
    const safeSunEl = Number.isFinite(sunEl) ? sunEl : 2.0
    const safeSunAz = Number.isFinite(sunAz) ? sunAz : 180.0

    // Coordinate convention: +Y up, +X east, -Z north
    // Direction toward body: x = cos(el) * sin(az), y = sin(el), z = -cos(el) * cos(az)
    const elRad = (safeSunEl * Math.PI) / 180
    const azRad = (safeSunAz * Math.PI) / 180

    const dirX = Math.cos(elRad) * Math.sin(azRad)
    const dirY = Math.sin(elRad)
    const dirZ = -Math.cos(elRad) * Math.cos(azRad)

    // Update test light position and test cube rotation to verify prop reactivity
    if (ctx.testLight) {
      ctx.testLight.position.set(dirX * 60, Math.max(dirY * 60, 0.5), dirZ * 60)
    }
    if (ctx.testCube) {
      ctx.testCube.rotation.y = azRad
    }

    ctx.invalidate()
  }, [sunEl, sunAz, earthEl, earthAz, landerHeight, viewMode])

  // (c) Terrain / site / heightmap updates
  useEffect(() => {
    const ctx = ctxRef.current
    if (!ctx) return

    // For P-02, trigger an invalidate on site change
    ctx.invalidate()
  }, [siteId, terrainType, heightmapUrl])

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
      {/* P-02 skeleton info watermark */}
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
        {label || siteId} · P-02 Scene Skeleton
      </div>
    </div>
  )
}
