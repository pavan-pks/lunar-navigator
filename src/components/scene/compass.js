import * as THREE from 'three'

/**
 * Creates a text sprite for cardinal directions (N, E, S, W).
 */
function createCardinalSprite(text, isNorth = false) {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const ctx = canvas.getContext('2d')

  // Background badge
  ctx.fillStyle = isNorth ? 'rgba(239, 68, 68, 0.85)' : 'rgba(30, 41, 59, 0.8)'
  ctx.strokeStyle = isNorth ? '#fca5a5' : '#94a3b8'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(48, 48, 42, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // Cardinal letter
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 44px system-ui, -apple-system, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 48, 48)

  const texture = new THREE.CanvasTexture(canvas)
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false })
  const sprite = new THREE.Sprite(mat)
  sprite.scale.set(16, 16, 1)
  return { sprite, texture, mat }
}

/**
 * Procedural 3D Compass Ring at radius 190m.
 * Labels N (North, -Z), E (East, +X), S (South, +Z), W (West, -X).
 *
 * @returns {{ group: THREE.Group, updatePadY: (padY: number) => void, dispose: () => void }}
 */
export function buildCompassRing() {
  const group = new THREE.Group()
  const RADIUS = 190
  const HEIGHT = 3.0

  // 1. Ring circle geometry
  const segments = 128
  const points = []
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2
    points.push(new THREE.Vector3(Math.cos(theta) * RADIUS, HEIGHT, Math.sin(theta) * RADIUS))
  }
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points)
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  })
  const ringLine = new THREE.Line(lineGeo, lineMat)
  group.add(ringLine)

  // 2. Cardinal sprites (North is -Z, East is +X, South is +Z, West is -X)
  const cardinals = [
    { label: 'N', x: 0, z: -RADIUS, isNorth: true },
    { label: 'E', x: RADIUS, z: 0, isNorth: false },
    { label: 'S', x: 0, z: RADIUS, isNorth: false },
    { label: 'W', x: -RADIUS, z: 0, isNorth: false },
  ]

  const spriteAssets = []
  cardinals.forEach(({ label, x, z, isNorth }) => {
    const { sprite, texture, mat } = createCardinalSprite(label, isNorth)
    sprite.position.set(x, HEIGHT + 4, z)
    group.add(sprite)
    spriteAssets.push({ sprite, texture, mat, baseX: x, baseZ: z })
  })

  const updatePadY = (padY = 0) => {
    group.position.y = padY
  }

  const dispose = () => {
    lineGeo.dispose()
    lineMat.dispose()
    spriteAssets.forEach(({ texture, mat }) => {
      texture.dispose()
      mat.dispose()
    })
  }

  return {
    group,
    updatePadY,
    dispose,
  }
}
