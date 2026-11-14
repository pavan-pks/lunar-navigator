import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

/**
 * Camera controller managing Orbit and Astronaut camera modes.
 *
 * @param {Object} options
 * @param {THREE.PerspectiveCamera} options.camera
 * @param {HTMLElement} options.domElement
 * @param {() => void} options.invalidate
 * @param {() => number} [options.getPadY]
 * @param {(x: number, z: number) => number} [options.getHeightAt]
 * @param {string} [options.quality='auto']
 * @param {(msg: string) => void} [options.onNotification]
 */
export function createCameraController({
  camera,
  domElement,
  invalidate,
  getPadY = () => 0,
  getHeightAt = () => 0,
  quality = 'auto',
  onNotification = () => {},
}) {
  let mode = 'orbit' // 'orbit' | 'astronaut'
  const isHighTier = quality === 'high'

  // OrbitControls setup
  const orbitControls = new OrbitControls(camera, domElement)
  orbitControls.enableDamping = isHighTier
  orbitControls.dampingFactor = 0.05
  orbitControls.minDistance = 10
  orbitControls.maxDistance = 300
  orbitControls.maxPolarAngle = 1.45

  // Astronaut mode variables
  // Standing position: 8-11m away from lander on the pad
  const ASTRONAUT_OFFSET_X = 6.0
  const ASTRONAUT_OFFSET_Z = 10.0
  const EYE_HEIGHT = 1.7

  let currentYaw = 0 // radians clockwise from North
  let currentPitch = 0 // radians (-60 deg to +60 deg)
  const MAX_PITCH = (60 * Math.PI) / 180
  const MIN_PITCH = (-60 * Math.PI) / 180

  let isDragging = false
  let lastPointerX = 0
  let lastPointerY = 0

  let animLookId = null
  let isDampingActive = false
  let dampingAnimId = null

  // Ensure camera stays above local terrain elevation in orbit mode
  const clampCameraAboveTerrain = () => {
    if (mode !== 'orbit') return
    const groundY = getHeightAt(camera.position.x, camera.position.z)
    const minY = groundY + 1.0
    if (camera.position.y < minY) {
      camera.position.y = minY
    }
  }

  // Updates camera view matrix in astronaut mode from yaw and pitch
  const updateAstronautLook = () => {
    const padY = getPadY()
    const posX = ASTRONAUT_OFFSET_X
    const posZ = ASTRONAUT_OFFSET_Z
    const groundY = getHeightAt(posX, posZ)
    const posY = groundY + EYE_HEIGHT

    camera.position.set(posX, posY, posZ)

    // Direction vector: x = cos(pitch)*sin(yaw), y = sin(pitch), z = -cos(pitch)*cos(yaw)
    const cosP = Math.cos(currentPitch)
    const dirX = cosP * Math.sin(currentYaw)
    const dirY = Math.sin(currentPitch)
    const dirZ = -cosP * Math.cos(currentYaw)

    camera.lookAt(posX + dirX * 50, posY + dirY * 50, posZ + dirZ * 50)
    invalidate()
  }

  // Pointer event handlers for Astronaut mode look controls
  const onPointerDown = (e) => {
    if (mode !== 'astronaut') return
    isDragging = true
    lastPointerX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0
    lastPointerY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? 0
  }

  const onPointerMove = (e) => {
    if (mode !== 'astronaut' || !isDragging) return
    const clientX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? lastPointerX
    const clientY = e.clientY ?? (e.touches && e.touches[0]?.clientY) ?? lastPointerY

    const dx = clientX - lastPointerX
    const dy = clientY - lastPointerY
    lastPointerX = clientX
    lastPointerY = clientY

    const sensitivity = 0.0035
    // Dragging right increases yaw (clockwise); dragging up increases pitch
    currentYaw = (currentYaw + dx * sensitivity + Math.PI * 2) % (Math.PI * 2)
    currentPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, currentPitch - dy * sensitivity))

    updateAstronautLook()
  }

  const onPointerUp = () => {
    isDragging = false
  }

  // Keyboard arrow keys for Astronaut mode
  const onKeyDown = (e) => {
    if (mode !== 'astronaut') return
    const keyStep = (2.5 * Math.PI) / 180
    if (e.key === 'ArrowLeft') {
      currentYaw = (currentYaw - keyStep + Math.PI * 2) % (Math.PI * 2)
      updateAstronautLook()
    } else if (e.key === 'ArrowRight') {
      currentYaw = (currentYaw + keyStep + Math.PI * 2) % (Math.PI * 2)
      updateAstronautLook()
    } else if (e.key === 'ArrowUp') {
      currentPitch = Math.min(MAX_PITCH, currentPitch + keyStep)
      updateAstronautLook()
    } else if (e.key === 'ArrowDown') {
      currentPitch = Math.max(MIN_PITCH, currentPitch - keyStep)
      updateAstronautLook()
    }
  }

  domElement.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('keydown', onKeyDown)

  // Smooth look-at animation helper
  const animateLookTo = (targetYaw, targetPitch) => {
    if (animLookId) cancelAnimationFrame(animLookId)

    // Shortest angular difference for yaw
    let diffYaw = ((targetYaw - currentYaw + Math.PI) % (Math.PI * 2)) - Math.PI
    if (diffYaw < -Math.PI) diffYaw += Math.PI * 2

    const startYaw = currentYaw
    const startPitch = currentPitch
    const clampedTargetPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, targetPitch))
    const diffPitch = clampedTargetPitch - startPitch

    const startTime = performance.now()
    const duration = 500 // 500 ms smooth transition

    const step = (now) => {
      const elapsed = now - startTime
      const t = Math.min(1.0, elapsed / duration)
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3)

      currentYaw = (startYaw + diffYaw * ease + Math.PI * 2) % (Math.PI * 2)
      currentPitch = startPitch + diffPitch * ease
      updateAstronautLook()

      if (t < 1.0) {
        animLookId = requestAnimationFrame(step)
      } else {
        animLookId = null
      }
    }

    animLookId = requestAnimationFrame(step)
  }

  // Astronaut quick-look commands
  const lookAtSun = (sunEl = 2, sunAz = 180) => {
    const yaw = ((sunAz * Math.PI) / 180 + Math.PI * 2) % (Math.PI * 2)
    const pitch = (sunEl * Math.PI) / 180
    animateLookTo(yaw, pitch)
  }

  const lookAtEarth = (earthEl = 5, earthAz = 20) => {
    if (earthEl <= 0) {
      onNotification('Earth is below the horizon')
      return false
    }
    const yaw = ((earthAz * Math.PI) / 180 + Math.PI * 2) % (Math.PI * 2)
    const pitch = (earthEl * Math.PI) / 180
    animateLookTo(yaw, pitch)
    return true
  }

  const lookNorth = () => {
    animateLookTo(0, 0)
  }

  // Mode switching
  const setMode = (newMode, { sunEl = 2, sunAz = 180, earthEl = 5, earthAz = 20 } = {}) => {
    if (newMode === mode) return
    mode = newMode

    if (mode === 'astronaut') {
      orbitControls.enabled = false
      camera.fov = 70
      camera.updateProjectionMatrix()

      // Initial orientation: face the Sun if up, else face North
      if (sunEl > -0.27) {
        currentYaw = ((sunAz * Math.PI) / 180 + Math.PI * 2) % (Math.PI * 2)
        currentPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, (sunEl * Math.PI) / 180))
      } else {
        currentYaw = 0
        currentPitch = 0
      }
      updateAstronautLook()
    } else {
      // Orbit mode
      if (animLookId) cancelAnimationFrame(animLookId)
      orbitControls.enabled = true
      camera.fov = 50
      camera.updateProjectionMatrix()
      const padY = getPadY()
      camera.position.set(70, padY + 40, 90)
      orbitControls.target.set(0, padY + 2, 0)
      orbitControls.update()
      clampCameraAboveTerrain()
      invalidate()
    }
  }

  // Damping loop for high tier orbit mode
  const startDampingLoop = () => {
    if (!isHighTier || isDampingActive || mode !== 'orbit') return
    isDampingActive = true

    const step = () => {
      clampCameraAboveTerrain()
      orbitControls.update()
      invalidate()

      if (orbitControls.state !== -1 || Math.abs(orbitControls.getAzimuthalAngle()) > 0.0001) {
        dampingAnimId = requestAnimationFrame(step)
      } else {
        isDampingActive = false
      }
    }
    dampingAnimId = requestAnimationFrame(step)
  }

  const handleOrbitChange = () => {
    if (mode === 'orbit') {
      clampCameraAboveTerrain()
      invalidate()
    }
  }

  const handleOrbitStart = () => {
    if (isHighTier && mode === 'orbit') {
      startDampingLoop()
    }
  }

  orbitControls.addEventListener('change', handleOrbitChange)
  orbitControls.addEventListener('start', handleOrbitStart)

  const updateTarget = (padY = 0) => {
    if (mode === 'orbit') {
      orbitControls.target.set(0, padY + 2, 0)
      clampCameraAboveTerrain()
      orbitControls.update()
    } else {
      updateAstronautLook()
    }
    invalidate()
  }

  const dispose = () => {
    if (animLookId) cancelAnimationFrame(animLookId)
    if (dampingAnimId) cancelAnimationFrame(dampingAnimId)
    orbitControls.removeEventListener('change', handleOrbitChange)
    orbitControls.removeEventListener('start', handleOrbitStart)
    orbitControls.dispose()

    domElement.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('keydown', onKeyDown)
  }

  return {
    controls: orbitControls,
    setMode,
    lookAtSun,
    lookAtEarth,
    lookNorth,
    updateTarget,
    dispose,
  }
}
