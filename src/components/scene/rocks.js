import * as THREE from 'three'
import { hashString, createPRNG } from './noise.js'

/**
 * Builds an InstancedMesh of procedural lunar rocks and scatter boulders.
 *
 * @param {Object} options
 * @param {string} [options.siteId='shackleton'] - Deterministic seed
 * @param {string} [options.quality='auto'] - 'low' (40), 'medium' (120), 'high' (250)
 * @param {(x: number, z: number) => number} options.heightAt - Ground elevation lookup
 * @returns {{ mesh: THREE.InstancedMesh, dispose: () => void }}
 */
export function buildRocks({ siteId = 'shackleton', quality = 'auto', heightAt = () => 0, site = null, terrainType = 'plain' } = {}) {
  const targetId = (site?.id || siteId || 'shackleton').toLowerCase()
  const isMare = targetId.includes('apollo11') || targetId.includes('apollo12') || targetId.includes('tranquillitatis') || targetId.includes('procellarum')
  const isViolent = targetId.includes('tycho') || targetId.includes('apollo17') || targetId.includes('shackleton')

  const seed = hashString(`${targetId}_rocks_scatter`)
  const prng = createPRNG(seed)

  // Quality tier instance count
  let count = isMare ? 60 : 120
  if (quality === 'low') count = isMare ? 25 : 40
  else if (quality === 'high') count = isMare ? 130 : 260

  // Realistic subdivided geometry with natural geological fracture noise
  const baseGeo = new THREE.IcosahedronGeometry(1.0, 2)
  const posAttr = baseGeo.attributes.position
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i)
    const vy = posAttr.getY(i)
    const vz = posAttr.getZ(i)

    // Multi-harmonic fracture displacement
    const n1 = Math.sin(vx * 4.3 + vy * 5.7 + vz * 3.1) * 0.20
    const n2 = Math.cos(vx * 8.4 - vy * 7.2 + vz * 6.5) * 0.10
    const n3 = Math.sin(vx * 15.1 + vy * 13.5 - vz * 14.7) * 0.05
    const disp = 1.0 + n1 + n2 + n3

    // Flatten bottom slightly so it embeds naturally into the dust
    const flattenedY = vy < -0.2 ? vy * 0.65 : vy

    posAttr.setXYZ(i, vx * disp, flattenedY * disp, vz * disp)
  }
  posAttr.needsUpdate = true
  baseGeo.computeVertexNormals()

  // Authentic lunar anorthosite / basalt regolith color (charcoal ash grey, no artificial blue)
  const rockColor = isMare ? 0x222428 : (isViolent ? 0x44474f : 0x36383e)
  const material = new THREE.MeshStandardMaterial({
    color: rockColor,
    roughness: 0.98,
    metalness: 0.02,
  })

  const instancedMesh = new THREE.InstancedMesh(baseGeo, material, count)
  instancedMesh.castShadow = true
  instancedMesh.receiveShadow = true

  const matrix = new THREE.Matrix4()
  const position = new THREE.Vector3()
  const rotation = new THREE.Euler()
  const quaternion = new THREE.Quaternion()
  const scale = new THREE.Vector3()
  const color = new THREE.Color()

  // First 2 instances are landmark boulders (1.4m to 2.4m, 40 to 90m away)
  const numLandmarks = Math.min(2, Math.floor(count * 0.05))

  for (let i = 0; i < count; i++) {
    let x, z, scaleUniform

    if (i < numLandmarks) {
      // Natural weathered boulder
      const angle = (i * ((Math.PI * 2) / numLandmarks)) + prng() * 0.5
      const dist = 40.0 + prng() * 50.0
      x = Math.cos(angle) * dist
      z = Math.sin(angle) * dist
      scaleUniform = 1.4 + prng() * 1.0
    } else {
      // General regolith rock scatter: power-law sizing with mostly pebbles and cobbles
      let valid = false
      let attempts = 0
      while (!valid && attempts < 20) {
        attempts++
        x = (prng() * 2.0 - 1.0) * 180.0
        z = (prng() * 2.0 - 1.0) * 180.0
        const distToCenter = Math.hypot(x, z)
        if (distToCenter >= 10.5) {
          valid = true
        }
      }
      if (!valid) {
        x += x >= 0 ? 12 : -12
        z += z >= 0 ? 12 : -12
      }
      // Power-law distribution: mostly 0.15m to 0.6m small rocks, occasionally up to 1.1m
      const p = Math.pow(prng(), 2.2)
      scaleUniform = 0.15 + p * 0.95
    }

    // Irregular non-uniform scale for rock fragments
    const sx = scaleUniform * (0.85 + prng() * 0.3)
    const sy = scaleUniform * (0.65 + prng() * 0.3)
    const sz = scaleUniform * (0.85 + prng() * 0.3)
    scale.set(sx, sy, sz)

    // Position on terrain embedded into soil
    const groundY = heightAt(x, z)
    const sinkAmount = sy * 0.35
    position.set(x, groundY + sy * 0.45 - sinkAmount, z)

    // Random rotation
    rotation.set(prng() * Math.PI, prng() * Math.PI * 2, prng() * Math.PI)
    quaternion.setFromEuler(rotation)

    matrix.compose(position, quaternion, scale)
    instancedMesh.setMatrixAt(i, matrix)

    // Subtle regolith dust tone variation per rock
    const rockTone = 0.20 + prng() * 0.14
    color.setRGB(rockTone * 0.98, rockTone, rockTone * 1.02)
    instancedMesh.setColorAt(i, color)
  }

  instancedMesh.instanceMatrix.needsUpdate = true
  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true
  }

  const dispose = () => {
    baseGeo.dispose()
    material.dispose()
  }

  return {
    mesh: instancedMesh,
    dispose,
  }
}
