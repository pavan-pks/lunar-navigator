import * as THREE from 'three'
import { hashString, createPRNG, createNoise2D, createFBM2D } from './noise.js'

/**
 * Builds a deterministic 400m x 400m authentic lunar terrain patch tailored
 * specifically to the unique geological profile and coordinates of each landing site.
 *
 * @param {Object} options
 * @param {string} [options.siteId='shackleton'] - Unique site identifier used as seed
 * @param {string} [options.terrainType='plain'] - 'crater-rim' | 'massif' | 'plain'
 * @param {Object} [options.site=null] - Full site metadata including lat, lon, and terrainType
 * @param {number} [options.resolution=257] - Grid resolution (e.g. 129, 257, 385)
 * @returns {{ mesh: THREE.Mesh, heightAt: (x: number, z: number) => number, originPadHeight: number, dispose: () => void }}
 */
export function buildTerrain({ siteId = 'shackleton', terrainType = 'plain', site = null, resolution = 257 } = {}) {
  const targetId = (site?.id || siteId || 'shackleton').toLowerCase()
  const lat = Number.isFinite(site?.lat) ? site.lat : (targetId === 'shackleton' ? -89.9 : targetId === 'malapert' ? -86.0 : targetId === 'apollo11' ? 0.67 : 0)
  const lon = Number.isFinite(site?.lon) ? site.lon : 0

  const seed = hashString(`${targetId}_${lat.toFixed(2)}_${lon.toFixed(2)}_${terrainType}`)
  const prng = createPRNG(seed)
  const fbmRoughness = createFBM2D(seed + 101, { octaves: 4, lacunarity: 2.0, gain: 0.5 })
  const microNoise = createNoise2D(seed + 202)

  // Determine site-specific craterlet count and distribution
  const isMare = targetId.includes('apollo11') || targetId.includes('apollo12') || targetId.includes('tranquillitatis') || targetId.includes('procellarum')
  const isCanyonOrValley = targetId.includes('apollo17') || targetId.includes('apollo15')
  const isViolentCrater = targetId.includes('tycho') || targetId.includes('copernicus')

  const numCraterlets = isMare ? 14 : isViolentCrater ? 42 : Math.floor(25 + prng() * 12)
  const craterlets = []
  for (let i = 0; i < numCraterlets; i++) {
    let cx = (prng() * 2 - 1) * 180
    let cz = (prng() * 2 - 1) * 180
    const d0 = Math.hypot(cx, cz)
    if (d0 < 16) {
      cx += cx >= 0 ? 18 : -18
      cz += cz >= 0 ? 18 : -18
    }
    const radius = (isMare ? 1.8 : 2.5) + prng() * (isViolentCrater ? 15 : 10)
    const depth = radius * (0.20 + prng() * 0.12)
    const rimHeight = depth * (0.25 + prng() * 0.12)
    const maxInfluence = radius * 2.0
    craterlets.push({ cx, cz, radius, depth, rimHeight, maxInfluence })
  }

  // Base profile function tailored to each specific landing site
  function rawHeight(x, z) {
    let h = 0

    // ── 1. SHACKLETON CRATER RIM (-89.9° South Pole Knife-Edge Ridge) ──
    if (targetId.includes('shackleton') || (Math.abs(lat) > 88.5 && terrainType === 'crater-rim')) {
      // Connecting Ridge oriented along azimuth ~130°
      const cosA = Math.cos(130 * Math.PI / 180)
      const sinA = Math.sin(130 * Math.PI / 180)
      const ridgeDist = -x * sinA + z * cosA // Cross-ridge distance
      const alongRidge = x * cosA + z * sinA // Along-ridge distance

      // Sharp knife-edge ridge at ridgeDist = 0
      const rimRidge = 7.5 * Math.exp(-Math.pow(ridgeDist / 28, 2))
      // Southwest side (inside crater) plunges 35° into pitch-black perpetual shadow (-48m)
      const insideSlope = ridgeDist > 0 ? -48.0 * Math.tanh(ridgeDist / 65) : 0
      // Northeast side drops into outer highland ejecta (-16m)
      const outsideSlope = ridgeDist < 0 ? -16.0 * (1.0 - Math.exp(ridgeDist / 90)) : 0
      // Undulations along the ridge crest
      const crestWave = 2.4 * Math.sin(alongRidge / 45)

      h = rimRidge + insideSlope + outsideSlope + crestWave
    }

    // ── 2. MALAPERT MASSIF (-86.0° Giant Mountain Summit) ──
    else if (targetId.includes('malapert')) {
      // Mountain summit rising +38m above surroundings with steep scree slopes
      const summit = 38.0 * Math.exp(-Math.pow(x / 130, 2) - Math.pow((z - 20) / 160, 2))
      // Stepped terraces created by ancient impact collapse
      const stepTerrace = 3.5 * Math.sin(x / 25) * Math.exp(-Math.pow(z / 100, 2))
      const generalSlope = -0.05 * x + 0.03 * z
      h = summit + stepTerrace + generalSlope
    }

    // ── 3. APOLLO 11 TRANQUILITY BASE (Mare Tranquillitatis Flat Basalt) ──
    else if (targetId.includes('apollo11') || targetId.includes('tranquillitatis')) {
      // Classic flat basalt volcanic plain: very low rolling relief (1-2.5m)
      h = 1.4 * Math.sin(x / 75) * Math.cos(z / 85) + 0.8 * Math.cos((x + z) / 110)
      // Cat's Paw small shallow craterlet nearby at (+35m, -28m)
      const distCP = Math.hypot(x - 35, z + 28)
      if (distCP < 18) {
        h -= (1.0 - Math.pow(distCP / 18, 2)) * 3.2
      }
    }

    // ── 4. APOLLO 17 TAURUS-LITTROW (Deep Canyon Valley between Towering Massifs) ──
    else if (targetId.includes('apollo17')) {
      // Narrow valley floor flanked by towering North Massif (+36m) and South Massif (+40m)
      const northMassif = z > 35 ? 36.0 * Math.pow((z - 35) / 150, 1.3) : 0
      const southMassif = z < -35 ? 40.0 * Math.pow(Math.abs(z + 35) / 150, 1.3) : 0
      // Lee-Lincoln fault scarp running diagonally across the valley (+5.5m step)
      const scarpLine = x * 0.7 + z * 0.3
      const scarpStep = 5.5 * Math.tanh((scarpLine - 10) / 18)
      h = northMassif + southMassif + scarpStep
    }

    // ── 5. APOLLO 15 HADLEY RILLE (Deep Canyon Rille & Mountain Slopes) ──
    else if (targetId.includes('apollo15')) {
      // Sinuous Hadley Rille canyon plunging -32m on East side
      const rilleCurve = 45.0 + Math.sin(z / 40) * 22
      const distToRille = x - rilleCurve
      const rilleDepth = Math.abs(distToRille) < 35 ? -32.0 * Math.cos((distToRille / 35) * (Math.PI / 2)) : 0
      // Apennine mountain flank rising on the West side
      const apennineSlope = x < -20 ? 28.0 * Math.pow(Math.abs(x + 20) / 160, 1.2) : 0
      h = rilleDepth + apennineSlope
    }

    // ── 6. CHANDRAYAAN-3 (Shiv Shakti Point - Southern Highland Undulating Plains) ──
    else if (targetId.includes('chandrayaan3') || targetId.includes('shiv')) {
      // Rolling hummocky southern highland terrain with gentle mounds
      h = 3.8 * Math.sin(x / 55) * Math.cos(z / 65) + 2.2 * Math.cos(x / 35 - z / 45)
      // Subtle slope toward Manzinus crater to the south
      h += -0.04 * z
    }

    // ── 7. TYCHO CRATER (Violent Fresh Impact Melt & Terraced Ridges) ──
    else if (targetId.includes('tycho') || isViolentCrater) {
      // Chaotic fractured impact melt floor with sharp terraced ridges
      const terracedRims = 14.0 * Math.sin(x / 30) * Math.cos(z / 35)
      const centralOutcrop = 22.0 * Math.exp(-Math.pow((x - 40) / 45, 2) - Math.pow((z + 30) / 45, 2))
      const collapseSlopes = -18.0 * Math.exp(-Math.pow((x + 60) / 70, 2))
      h = terracedRims + centralOutcrop + collapseSlopes
    }

    // ── 8. OCEANUS PROCELLARUM / APOLLO 12 (Mare Basalt with Wrinkle Ridge) ──
    else if (targetId.includes('procellarum') || targetId.includes('apollo12')) {
      // Flat basalt plain with prominent arched wrinkle ridge (+8.5m) crossing north-south
      const wrinkleRidge = 8.5 * Math.exp(-Math.pow((x - 25) / 22, 2))
      const mareRoll = 1.2 * Math.sin(x / 70) * Math.cos(z / 90)
      h = wrinkleRidge + mareRoll
    }

    // ── 9. POLAR PSR CRATER BOWLS (Haworth, Faustini, de Gerlache) ──
    else if (targetId.includes('haworth') || targetId.includes('faustini') || targetId.includes('de-gerlache')) {
      // Deep bowl interior with steep 28° crater rim wall blocking sunlight
      const rimWall = z > 15 ? 28.0 * Math.pow((z - 15) / 140, 1.4) : 0
      const bowlFloor = z <= 15 ? -24.0 * (1.0 - Math.exp((z - 15) / 80)) : 0
      h = rimWall + bowlFloor
    }

    // ── 10. GENERIC / CUSTOM COORDINATE ADAPTIVE TERRAIN ──
    else if (terrainType === 'crater-rim' || Math.abs(lat) > 75) {
      // Polar or crater-rim terrain
      const rimRadius = 380
      const distToCenter = Math.hypot(x, z - 380)
      const delta = distToCenter - rimRadius
      const rimRidge = 6.5 * Math.exp(-Math.pow(delta / 30, 2))
      const insideSlope = delta < 0 ? -36.0 * Math.tanh(-delta / 65) : 0
      const outsideSlope = delta > 0 ? -15.0 * (1.0 - Math.exp(-delta / 100)) : 0
      h = rimRidge + insideSlope + outsideSlope
    } else if (terrainType === 'massif') {
      const ridge = 32.0 * Math.exp(-Math.pow(x / 140, 2) - Math.pow((z - 20) / 180, 2))
      const slope = -0.04 * x + 0.02 * z
      h = ridge + slope
    } else {
      // Low rolling plains
      h = 2.8 * Math.sin(x / 65) * Math.cos(z / 75) + 1.4 * Math.cos((x + z) / 95)
    }

    // Add fBm micro-roughness (tailored by site type)
    const roughScale = isMare ? 0.9 : isViolentCrater ? 2.2 : 1.4
    const rough = fbmRoughness(x * 0.025, z * 0.025) * roughScale
    const fine = microNoise(x * 0.08, z * 0.08) * (isMare ? 0.2 : 0.38)
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
        h += -c.depth * (1.0 - u * u)
      } else if (u < 2.0) {
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

  // Determine site-specific geological regolith albedo base
  // Mare: dark basalt (0.23 - 0.28). Highland/Polar: bright anorthosite (0.44 - 0.54). Tycho: brilliant rays (0.58).
  const baseAlbedo = isMare ? 0.24 : isViolentCrater ? 0.54 : (Math.abs(lat) > 80 ? 0.44 : 0.36)
  const redTint = isMare ? 1.04 : 0.98
  const blueTint = Math.abs(lat) > 80 ? 1.05 : 0.99

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i)
    const z = posAttr.getZ(i)
    const y = heightAt(x, z)
    posAttr.setY(i, y)

    // Per-vertex geological coloration
    const heightNorm = (y - minH) / hRange
    const coordHash = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
    const micro = (coordHash - Math.floor(coordHash)) * 0.08
    const shade = baseAlbedo + heightNorm * 0.16 + micro
    const clampedShade = Math.max(0.18, Math.min(0.72, shade))

    colors[i * 3 + 0] = clampedShade * redTint
    colors[i * 3 + 1] = clampedShade
    colors[i * 3 + 2] = clampedShade * blueTint
  }

  posAttr.needsUpdate = true
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    roughness: isMare ? 0.90 : 1.0,
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
