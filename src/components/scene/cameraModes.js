import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Camera controller managing Orbit camera mode.
 *
 * @param {Object} options
 * @param {THREE.PerspectiveCamera} options.camera
 * @param {HTMLElement} options.domElement
 * @param {() => void} options.invalidate
 * @param {() => number} [options.getPadY]
 * @param {(x: number, z: number) => number} [options.getHeightAt]
 * @param {string} [options.quality='auto']
 */
export function createCameraController({
  camera,
  domElement,
  invalidate,
  getPadY = () => 0,
  getHeightAt = () => 0,
  quality = 'auto',
}) {
  const controls = new OrbitControls(camera, domElement)

  // Quality tier settings: damping enabled only on high tier
  const isHighTier = quality === 'high'
  controls.enableDamping = isHighTier
  controls.dampingFactor = 0.05

  // Distance and angle limits per specification
  controls.minDistance = 10
  controls.maxDistance = 300
  controls.maxPolarAngle = 1.45 // ~83 degrees, prevents dipping below ground

  let isDampingActive = false
  let dampingAnimId = null

  // Ensure camera stays above local terrain elevation
  const clampCameraAboveTerrain = () => {
    const groundY = getHeightAt(camera.position.x, camera.position.z)
    const minY = groundY + 1.0
    if (camera.position.y < minY) {
      camera.position.y = minY
    }
  }

  // Smooth damping frame loop for high tier
  const startDampingLoop = () => {
    if (!isHighTier || isDampingActive) return
    isDampingActive = true

    const step = () => {
      clampCameraAboveTerrain()
      controls.update()
      invalidate()

      // Continue animating while controls are damping
      if (controls.state !== -1 || Math.abs(controls.getAzimuthalAngle()) > 0.0001) {
        dampingAnimId = requestAnimationFrame(step)
      } else {
        isDampingActive = false
      }
    }
    dampingAnimId = requestAnimationFrame(step)
  }

  const handleChange = () => {
    clampCameraAboveTerrain()
    invalidate()
  }

  const handleStart = () => {
    if (isHighTier) {
      startDampingLoop()
    }
  }

  controls.addEventListener('change', handleChange)
  controls.addEventListener('start', handleStart)

  const updateTarget = (padY = 0) => {
    controls.target.set(0, padY + 2, 0)
    clampCameraAboveTerrain()
    controls.update()
    invalidate()
  }

  const resetInitialPosition = (padY = 0) => {
    camera.position.set(70, padY + 40, 90)
    updateTarget(padY)
  }

  const dispose = () => {
    if (dampingAnimId) cancelAnimationFrame(dampingAnimId)
    controls.removeEventListener('change', handleChange)
    controls.removeEventListener('start', handleStart)
    controls.dispose()
  }

  return {
    controls,
    updateTarget,
    resetInitialPosition,
    clampCameraAboveTerrain,
    dispose,
  }
}
