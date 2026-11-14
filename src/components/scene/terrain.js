import * as THREE from 'three'
import { hashString, createPRNG, createNoise2D, createFBM2D } from './noise.js'

/**
 * Builds a deterministic 400m x 400m lunar terrain patch.
 *
 * @param {Object} options
 * @param {string} [options.siteId='shackleton'] - Unique site identifier used as seed
 * @param {string} [options.terrainType='plain'] - 'crater-rim' | 'massif' | 'plain'
 * @param {number} [options.resolution=257] - Grid resolution (e.g. 129, 257, 385)
 * @returns {{ mesh: THREE.Mesh, heightAt: (x: number, z: number) => number, originPadHeight: number, dispose: () => void }}
 */
export function buildTerrain({ siteId = 'shackleton', terrainType = 'plain', resolution = 257 } = {}) {
  const seed = hashString(`${siteId}_${terrainType}`)
  const prng = createPRNG(seed)
  const fbmRoughness = createFBM2D(seed + 101, { octaves: 4, lacunarity: 2.0, gain: 0.5 })
  const microNoise = createNoise2D(seed + 202)

  // Generate 25 to 35 small craterlets
  const numCraterlets = Math.floor(25 + prng() * 12)
  const craterlets = []
  for (let i = 0; i < numCraterlets; i++) {
    let cx = (prng() * 2 - 1) * 180
    let cz = (prng() * 2 - 1) * 180
    const d0 = Math.hypot(cx, cz)
    if (d0 < 16) {
      cx += cx >= 0 ? 18 : -18
      cz += cz >= 0 ? 18 : -18
    }
    const radius = 2.5 + prng() * 11.5 // 2.5m to 14m
    const depth = radius * (0.22 + prng() * 0.12)
    const rimHeight = depth * (0.28 + prng() * 0.12)
    const maxInfluence = radius * 2.0
    craterlets.push({ cx, cz, radius, depth, rimHeight, maxInfluence })
  }

  // Base profile function before landing pad flattening
  function rawHeight(x, z) {
    let h = 0

    if (terrainType === 'crater-rim') {
      // Large crater (radius ~500m) with center to the south at (0, 500)
      // At origin (0, 0), distance is exactly 500m, placing the lander right on the rim ridge
      const craterCenterZ = 500
      const distToCenter = Math.hypot(x, z - craterCenterZ)
      const rimRadius = 500
      const delta = distToCenter - rimRadius // < 0 inside crater, > 0 outside

      // Sharp rim ridge peak
      const rimRidge = 6.0 * Math.exp(-Math.pow(delta / 32, 2))

      // Inside crater floor slopes steeply downward
      const insideSlope = delta < 0 ? -38.0 * Math.tanh(-delta / 70) : 0

      // Outside slope drops gently into the ejecta blanket
      const outsideSlope = delta > 0 ? -16.0 * (1.0 - Math.exp(-delta / 110)) : 0

      h = rimRidge + insideSlope + outsideSlope
    } else if (terrainType === 'massif') {
      // Broad mountain massif / ridge peak near origin
      const ridge = 34.0 * Math.exp(-Math.pow(x / 150, 2) - Math.pow((z - 25) / 200, 2))
      const slope = -0.04 * x + 0.02 * z
      h = ridge + slope
    } else {
      // Rolling plains with low undulations (2-4m)
      h = 2.8 * Math.sin(x / 65) * Math.cos(z / 75) + 1.4 * Math.cos((x + z) / 95)
    }

    // Add fBm roughness (1.0 to 1.6m amplitude) + fine micro-noise
    const rough = fbmRoughness(x * 0.025, z * 0.025) * 1.5
    const fine = microNoise(x * 0.08, z * 0.08) * 0.35
    h += rough + fine

    // Add craterlets with fast bounding box rejection
    for (let i = 0; i < craterlets.length; i++) {
      const c = craterlets[i]
      const dx = x - c.cx
      const maxInf = c.maxInfluence
      if (dx < -maxInf || dx > maxInf) continue

      const dz = z - c.cz
      if (dz < -maxInf || dz > maxInf) continue

      const dist = Math.hypot(dx, dz)
      const u = dist / c.radius

      if (u < 1.0) {
        // Bowl inside crater
        h += -c.depth * (1.0 - u * u)
      } else if (u < 2.0) {
        // Raised rim around crater
        const rimDist = (u - 1.0) / 0.35
        h += c.rimHeight * Math.exp(-rimDist * rimDist)
      }
    }

    return h
  }

  // Precompute pad height at origin
  const originPadHeight = rawHeight(0, 0)

  // Full composite height function with flat landing pad at origin
  function evaluateHeight(x, z) {
    const raw = rawHeight(x, z)
    const distToOrigin = Math.hypot(x, z)

    // Level pad of 8m radius, smooth blend between 8m and 16m
    if (distToOrigin <= 8.0) {
      return originPadHeight
    } else if (distToOrigin < 16.0) {
      const t = (distToOrigin - 8.0) / 8.0
      const smoothT = t * t * (3.0 - 2.0 * t) // Hermite smoothstep
      return (1.0 - smoothT) * originPadHeight + smoothT * raw
    }
    return raw
  }

  // Generate grid values for fast bilinear heightAt lookups
  const res = Math.max(16, resolution)
  const size = 400
  const halfSize = size / 2
  const grid = new Float32Array(res * res)
  const step = size / (res - 1)

  for (let iz = 0; iz < res; iz++) {
    const z = -halfSize + iz * step
    for (let ix = 0; ix < res; ix++) {
      const x = -halfSize + ix * step
      grid[iz * res + ix] = evaluateHeight(x, z)
    }
  }

  /**
   * Fast bilinear height lookup function callable outside the mesh.
   */
  function heightAt(x, z) {
    const cx = Math.max(-halfSize, Math.min(halfSize, x))
    const cz = Math.max(-halfSize, Math.min(halfSize, z))

    const u = (cx + halfSize) / step
    const v = (cz + halfSize) / step

    const ix = Math.min(res - 2, Math.floor(u))
    const iz = Math.min(res - 2, Math.floor(v))

    const fx = u - ix
    const fz = v - iz

    const h00 = grid[iz * res + ix]
    const h10 = grid[iz * res + (ix + 1)]
    const h01 = grid[(iz + 1) * res + ix]
    const h11 = grid[(iz + 1) * res + (ix + 1)]

    const top = h00 * (1.0 - fx) + h10 * fx
    const bot = h01 * (1.0 - fx) + h11 * fx

    return top * (1.0 - fz) + bot * fz
  }

  // Construct Three.js PlaneGeometry in X-Z plane
  const geometry = new THREE.PlaneGeometry(size, size, res - 1, res - 1)
  geometry.rotateX(-Math.PI / 2)

  const posAttr = geometry.attributes.position
  const count = posAttr.count
  const colors = new Float32Array(count * 3)

  let minH = Infinity
  let maxH = -Infinity
  for (let i = 0; i < grid.length; i++) {
    if (grid[i] < minH) minH = grid[i]
    if (grid[i] > maxH) maxH = grid[i]
  }
  const hRange = Math.max(1.0, maxH - minH)

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i)
    const z = posAttr.getZ(i)
    const y = heightAt(x, z)
    posAttr.setY(i, y)

    // Per-vertex lunar regolith color variation (grey 0.35 to 0.58)
    const heightNorm = (y - minH) / hRange
    // Fast pseudo-noise from coordinate hash for vertex shading without extra 2D noise cost
    const coordHash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
    const micro = (coordHash - Math.floor(coordHash)) * 0.08
    const shade = 0.36 + heightNorm * 0.16 + micro
    const clampedShade = Math.max(0.32, Math.min(0.6, shade))

    colors[i * 3 + 0] = clampedShade
    colors[i * 3 + 1] = clampedShade
    colors[i * 3 + 2] = clampedShade * 1.02
  }

  posAttr.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    roughness: 1.0,
    metalness: 0.0,
    vertexColors: true,
  })

  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.castShadow = true

  const dispose = () => {
    geometry.dispose()
    material.dispose()
  }

  return {
    mesh,
    heightAt,
    originPadHeight,
    dispose,
  }
}
