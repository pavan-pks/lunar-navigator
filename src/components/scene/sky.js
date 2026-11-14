import * as THREE from 'three'

/**
 * Creates a procedural 256x128 Earth texture using Canvas 2D.
 * Blue ocean, green/brown continent patches, and swirling white cloud streaks.
 */
function createProceduralEarthTexture() {
  const width = 256
  const height = 128
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')

  // 1. Deep ocean base
  ctx.fillStyle = '#1e3a8a'
  ctx.fillRect(0, 0, width, height)

  // 2. Continental landmass blobs
  const continents = [
    { x: 50, y: 45, r: 28, color: '#15803d' },
    { x: 65, y: 70, r: 24, color: '#166534' },
    { x: 130, y: 40, r: 26, color: '#ca8a04' },
    { x: 145, y: 75, r: 28, color: '#b45309' },
    { x: 190, y: 55, r: 34, color: '#15803d' },
    { x: 210, y: 90, r: 20, color: '#b45309' },
    { x: 128, y: 118, r: 35, color: '#f1f5f9' }, // Antarctica
    { x: 128, y: 10, r: 25, color: '#f8fafc' }, // Arctic
  ]

  continents.forEach(({ x, y, r, color }) => {
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 0.75, 0.2, 0, Math.PI * 2)
    ctx.fill()
  })

  // 3. Swirling cloud formations
  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
  for (let i = 0; i < 9; i++) {
    const cy = 20 + i * 11
    ctx.beginPath()
    ctx.moveTo(0, cy)
    ctx.bezierCurveTo(width * 0.25, cy - 8, width * 0.5, cy + 10, width * 0.75, cy - 6)
    ctx.bezierCurveTo(width * 0.9, cy + 4, width, cy, width, cy)
    ctx.lineTo(width, cy + 6)
    ctx.bezierCurveTo(width * 0.75, cy, width * 0.5, cy + 16, width * 0.25, cy - 2)
    ctx.lineTo(0, cy + 6)
    ctx.closePath()
    ctx.fill()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  return texture
}

/**
 * Creates a text sprite with a legible "Earth" label.
 */
function createTextSprite(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 64
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
  ctx.strokeStyle = '#38bdf8'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(8, 12, 112, 40, 8)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 32)

  const texture = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(34, 17, 1)
  return { sprite, texture, mat }
}

/**
 * Procedural deep space sky system:
 * - Starfield Points (radius 900) with dynamic daylight/nighttime dimming
 * - Emissive Sun disk at distance 800 (real angular diameter ~0.53°)
 * - Earth sphere marker with procedural texture (real angular diameter ~1.9°) and label sprite
 *
 * @param {Object} options
 * @param {string} [options.quality='auto']
 * @returns {{ group: THREE.Group, update: Function, dispose: Function }}
 */
export function buildSky({ quality = 'auto' } = {}) {
  const group = new THREE.Group()

  // 1. Starfield setup
  let starCount = 1500
  if (quality === 'low') starCount = 800
  else if (quality === 'high') starCount = 2500

  const starGeo = new THREE.BufferGeometry()
  const starPositions = new Float32Array(starCount * 3)
  const starSphereRadius = 900

  for (let i = 0; i < starCount; i++) {
    // Uniform sphere sampling
    const u = Math.random() * 2 - 1
    const theta = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.max(0, 1 - u * u)) * starSphereRadius
    starPositions[i * 3 + 0] = r * Math.cos(theta)
    starPositions[i * 3 + 1] = u * starSphereRadius
    starPositions[i * 3 + 2] = r * Math.sin(theta)
  }

  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.5,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  })
  const starPoints = new THREE.Points(starGeo, starMat)
  group.add(starPoints)

  // 2. Sun disk (angular radius ~0.265°, R_sphere = 800 * tan(0.265°) ≈ 3.7m)
  const sunGeo = new THREE.SphereGeometry(3.7, 16, 16)
  const sunMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
    depthWrite: false,
  })
  const sunMesh = new THREE.Mesh(sunGeo, sunMat)
  group.add(sunMesh)

  // 3. Earth marker (angular radius ~0.95°, R_sphere = 800 * tan(0.95°) ≈ 13.3m)
  const earthTexture = createProceduralEarthTexture()
  const earthGeo = new THREE.SphereGeometry(13.3, 24, 24)
  const earthMat = new THREE.MeshBasicMaterial({
    map: earthTexture,
    fog: false,
    depthWrite: false,
  })
  const earthMesh = new THREE.Mesh(earthGeo, earthMat)
  group.add(earthMesh)

  // Earth label sprite
  const { sprite: earthLabel, texture: labelTex, mat: labelMat } = createTextSprite('Earth')
  group.add(earthLabel)

  /**
   * Updates positions of Sun disk, Earth marker, and star opacity based on current angles.
   */
  const update = (sunEl, sunAz, earthEl, earthAz, padY = 0) => {
    const safeSunEl = Number.isFinite(sunEl) ? sunEl : 2.0
    const safeSunAz = Number.isFinite(sunAz) ? sunAz : 180.0
    const safeEarthEl = Number.isFinite(earthEl) ? earthEl : 5.0
    const safeEarthAz = Number.isFinite(earthAz) ? earthAz : 20.0

    // Coordinate convention: +Y up, +X east, -Z north
    // x = cos(el) * sin(az), y = sin(el), z = -cos(el) * cos(az)
    const sunElRad = (safeSunEl * Math.PI) / 180
    const sunAzRad = (safeSunAz * Math.PI) / 180
    const sunDist = 800

    const sunX = Math.cos(sunElRad) * Math.sin(sunAzRad) * sunDist
    const sunY = padY + Math.sin(sunElRad) * sunDist
    const sunZ = -Math.cos(sunElRad) * Math.cos(sunAzRad) * sunDist

    sunMesh.position.set(sunX, sunY, sunZ)
    const isSunUp = safeSunEl > -0.27
    sunMesh.visible = isSunUp

    // Stars dim to 0.35 during lunar day, full opacity at night
    starMat.opacity = isSunUp ? 0.35 : 0.95

    // Earth positioning
    const earthElRad = (safeEarthEl * Math.PI) / 180
    const earthAzRad = (safeEarthAz * Math.PI) / 180
    const earthDist = 800

    const earthX = Math.cos(earthElRad) * Math.sin(earthAzRad) * earthDist
    const earthY = padY + Math.sin(earthElRad) * earthDist
    const earthZ = -Math.cos(earthElRad) * Math.cos(earthAzRad) * earthDist

    earthMesh.position.set(earthX, earthY, earthZ)
    earthLabel.position.set(earthX, earthY + 18, earthZ)

    const isEarthVisible = safeEarthEl > 0
    earthMesh.visible = isEarthVisible
    earthLabel.visible = isEarthVisible
  }

  const dispose = () => {
    starGeo.dispose()
    starMat.dispose()
    sunGeo.dispose()
    sunMat.dispose()
    earthGeo.dispose()
    earthMat.dispose()
    earthTexture.dispose()
    labelTex.dispose()
    labelMat.dispose()
  }

  return {
    group,
    update,
    dispose,
  }
}
