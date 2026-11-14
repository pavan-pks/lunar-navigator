import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Camera controller managing Orbit camera mode (and prepared for Astronaut mode).
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
  controls.enableDamping = quality === 'high'
  controls.dampingFactor = 0.05
  controls.minDistance = 6
  controls.maxDistance = 350
  // Prevent camera from dipping underneath flat ground plane (85 degrees = ~1.48 rad)
  controls.maxPolarAngle = 1.48

  const updateTarget = (padY) => {
    controls.target.set(0, padY + 1.5, 0)
    controls.update()
  }

  // Initial target
  updateTarget(getPadY())

  const handleChange = () => {
    // Keep camera above local terrain height
    const groundY = getHeightAt(camera.position.x, camera.position.z)
    if (camera.position.y < groundY + 1.2) {
      camera.position.y = groundY + 1.2
    }
    invalidate()
  }

  controls.addEventListener('change', handleChange)

  const dispose = () => {
    controls.removeEventListener('change', handleChange)
    controls.dispose()
  }

  return {
    controls,
    updateTarget,
    dispose,
  }
}
