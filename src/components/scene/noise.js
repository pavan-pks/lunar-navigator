/**
 * Lightweight, zero-dependency seeded noise utilities
 * Includes 32-bit FNV-1a hash, Mulberry32 PRNG, 2D Value Noise, and 2D fBm.
 */

// 32-bit FNV-1a hash for deterministic seeding from strings
export function hashString(str = '') {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 16777619) >>> 0
  }
  return h
}

// Mulberry32 fast 32-bit PRNG returning float in [0, 1)
export function createPRNG(seed) {
  let s = (seed >>> 0) || 1337
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Quintic smoothstep curve for artifact-free interpolation
function quintic(t) {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/**
 * Creates a seeded 2D smooth noise function returning values in [-1, 1].
 */
export function createNoise2D(seed = 0) {
  const prng = createPRNG(seed)
  // Build permutation table
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1))
    const tmp = p[i]
    p[i] = p[j]
    p[j] = tmp
  }
  const perm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255]
  }

  // Pre-generate 256 random 2D gradient vectors on unit circle
  const gradX = new Float32Array(256)
  const gradY = new Float32Array(256)
  for (let i = 0; i < 256; i++) {
    const angle = prng() * Math.PI * 2
    gradX[i] = Math.cos(angle)
    gradY[i] = Math.sin(angle)
  }

  return function noise2D(x, y) {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)

    const fx = x - x0
    const fy = y - y0

    const xi = x0 & 255
    const yi = y0 & 255

    const g00 = perm[perm[xi] + yi]
    const g10 = perm[perm[xi + 1] + yi]
    const g01 = perm[perm[xi] + yi + 1]
    const g11 = perm[perm[xi + 1] + yi + 1]

    const d00 = gradX[g00] * fx + gradY[g00] * fy
    const d10 = gradX[g10] * (fx - 1) + gradY[g10] * fy
    const d01 = gradX[g01] * fx + gradY[g01] * (fy - 1)
    const d11 = gradX[g11] * (fx - 1) + gradY[g11] * (fy - 1)

    const u = quintic(fx)
    const v = quintic(fy)

    const nx0 = d00 * (1 - u) + d10 * u
    const nx1 = d01 * (1 - u) + d11 * u

    return nx0 * (1 - v) + nx1 * v
  }
}

/**
 * Seeded 2D Fractal Brownian Motion (fBm)
 */
export function createFBM2D(seed = 0, { octaves = 4, lacunarity = 2.0, gain = 0.5 } = {}) {
  const noise = createNoise2D(seed)

  return function fbm(x, y) {
    let sum = 0
    let amp = 1
    let freq = 1
    let max = 0

    for (let i = 0; i < octaves; i++) {
      sum += noise(x * freq, y * freq) * amp
      max += amp
      amp *= gain
      freq *= lacunarity
    }

    return sum / max
  }
}
