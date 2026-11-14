import * as THREE from 'three'

/**
 * Creates a text sprite badge for shadow length readout.
 */
function createRulerTextSprite() {
  const canvas = document.createElement('canvas')
  canvas.width = 192
  canvas.height = 64
  const ctx = canvas.getContext('2d')

  const texture = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(16, 5.3, 1)

  const updateText = (text) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Pill badge background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.roundRect(6, 8, 180, 48, 12)
    ctx.fill()
    ctx.stroke()

    // Metric text
    ctx.fillStyle = '#f8fafc'
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 96, 32)

    texture.needsUpdate = true
  }

  return { sprite, texture, mat, updateText }
}

/**
 * Procedural Shadow Ruler.
 * Casts a metric measurement line on the ground opposite the Sun's azimuth,
 * with 10m tick marks and an end badge showing shadow length.
 *
 * @returns {{ group: THREE.Group, update: Function, dispose: Function }}
 */
export function buildShadowRuler() {
  const group = new THREE.Group()

  // Material for ruler lines and ticks
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    linewidth: 2,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  })

  // Pre-allocate buffer for main line + up to 16 ticks (17 line segments = 34 vertices)
  const maxVertices = 68
  const positions = new Float32Array(maxVertices * 3)
  const lineGeo = new THREE.BufferGeometry()
  lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  lineGeo.setDrawRange(0, 0)

  const lineMesh = new THREE.LineSegments(lineGeo, lineMat)
  group.add(lineMesh)

  const { sprite: textSprite, texture: textTex, mat: spriteMat, updateText } = createRulerTextSprite()
  group.add(textSprite)

  let lastText = ''

  /**
   * Updates shadow ruler position, direction, tick marks, and length badge.
   *
   * @param {Object} params
   * @param {number} params.sunEl - Sun elevation in degrees
   * @param {number} params.sunAz - Sun azimuth in degrees
   * @param {number} params.landerHeight - Lander height in meters
   * @param {number} params.padY - Elevation of the landing pad
   * @param {boolean} params.showShadowRuler - Whether ruler is enabled
   */
  const update = ({
    sunEl = 2.0,
    sunAz = 180.0,
    landerHeight = 3.0,
    padY = 0.0,
    showShadowRuler = true,
  } = {}) => {
    // Hidden if disabled or Sun is below horizon
    if (!showShadowRuler || sunEl <= -0.27) {
      group.visible = false
      return
    }

    group.visible = true

    // Compute shadow length: H / tan(sunEl), capped at 150m
    const elRad = Math.max(0.001, (sunEl * Math.PI) / 180)
    const rawLen = landerHeight / Math.tan(elRad)
    const isCapped = rawLen >= 150.0
    const shadowLen = Math.min(150.0, Math.max(0.5, rawLen))

    // Shadow direction on ground is opposite the Sun's azimuth
    // azSun: N=0, E=90, S=180, W=270. Direction toward Sun: (sin(az), -cos(az))
    // Shadow direction points opposite: dx = -sin(az), dz = cos(az)
    const azRad = (sunAz * Math.PI) / 180
    const dx = -Math.sin(azRad)
    const dz = Math.cos(azRad)

    // Perpendicular vector for tick marks
    const px = -dz
    const pz = dx

    const y = padY + 0.06 // Slight offset above terrain pad
    let vIdx = 0

    // 1. Main spine line from origin to shadow tip
    positions[vIdx++] = 0
    positions[vIdx++] = y
    positions[vIdx++] = 0

    positions[vIdx++] = dx * shadowLen
    positions[vIdx++] = y
    positions[vIdx++] = dz * shadowLen

    // 2. Metric tick marks every 10 meters
    for (let d = 10; d <= shadowLen; d += 10) {
      const cx = dx * d
      const cz = dz * d
      const tickHalfWidth = d % 50 === 0 ? 1.0 : 0.5

      positions[vIdx++] = cx - px * tickHalfWidth
      positions[vIdx++] = y
      positions[vIdx++] = cz - pz * tickHalfWidth

      positions[vIdx++] = cx + px * tickHalfWidth
      positions[vIdx++] = y
      positions[vIdx++] = cz + pz * tickHalfWidth
    }

    lineGeo.setDrawRange(0, vIdx / 3)
    lineGeo.attributes.position.needsUpdate = true

    // 3. Position end badge sprite
    const tipX = dx * shadowLen
    const tipZ = dz * shadowLen
    textSprite.position.set(tipX + px * 2.0, y + 1.2, tipZ + pz * 2.0)

    const displayText = isCapped ? 'Shadow >150 m' : `Shadow ${shadowLen.toFixed(0)} m`
    if (displayText !== lastText) {
      lastText = displayText
      updateText(displayText)
    }
  }

  const dispose = () => {
    lineGeo.dispose()
    lineMat.dispose()
    textTex.dispose()
    spriteMat.dispose()
  }

  return {
    group,
    update,
    dispose,
  }
}
