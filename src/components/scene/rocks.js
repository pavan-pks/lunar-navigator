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
export function buildRocks({ siteId = 'shackleton', quality = 'auto', heightAt = () => 0 } = {}) {
  const seed = hashString(`${siteId}_rocks_scatter`)
  const prng = createPRNG(seed)

  // Quality tier instance count
  let count = 120
  if (quality === 'low') count = 40
  else if (quality === 'high') count = 250

  // Base distorted icosahedron for angular lunar rock silhouette
  const baseGeo = new THREE.IcosahedronGeometry(1.0, 1)
  const posAttr = baseGeo.attributes.position
  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i)
    const vy = posAttr.getY(i)
    const vz = posAttr.getZ(i)

    // Deterministic vertex jitter
    const jx = Math.sin(vx * 14.3 + vy * 31.7 + vz * 47.1) * 0.22
    const jy = Math.cos(vx * 29.1 + vy * 17.5 + vz * 33.3) * 0.22
    const jz = Math.sin(vx * 37.9 + vy * 43.1 + vz * 19.7) * 0.22

    posAttr.setXYZ(i, vx + jx, vy + jy, vz + jz)
  }
  posAttr.needsUpdate = true
  baseGeo.computeVertexNormals()

  const material = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.95,
    metalness: 0.05,
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

  // First 4 instances are landmark boulders (3 to 6m, 40 to 110m away)
  const numLandmarks = Math.min(4, Math.floor(count * 0.1))

  for (let i = 0; i < count; i++) {
    let x, z, scaleUniform

    if (i < numLandmarks) {
      // Landmark boulder: distance 45m to 110m away
      const angle = (i * ((Math.PI * 2) / numLandmarks)) + prng() * 0.5
      const dist = 45.0 + prng() * 65.0
      x = Math.cos(angle) * dist
      z = Math.sin(angle) * dist
      scaleUniform = 3.2 + prng() * 2.6 // 3.2m to 5.8m
    } else {
      // General scatter: kept outside the 10m landing pad
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
      scaleUniform = 0.25 + prng() * 1.75 // 0.25m to 2.0m
    }

    // Irregular non-uniform scale for rock fragments
    const sx = scaleUniform * (0.8 + prng() * 0.4)
    const sy = scaleUniform * (0.6 + prng() * 0.4)
    const sz = scaleUniform * (0.8 + prng() * 0.4)
    scale.set(sx, sy, sz)

    // Position on terrain with slight sink so rocks never float
    const groundY = heightAt(x, z)
    const sinkAmount = sy * 0.25
    position.set(x, groundY + sy * 0.7 - sinkAmount, z)

    // Random rotation
    rotation.set(prng() * Math.PI, prng() * Math.PI * 2, prng() * Math.PI)
    quaternion.setFromEuler(rotation)

    matrix.compose(position, quaternion, scale)
    instancedMesh.setMatrixAt(i, matrix)

    // Slight regolith color variation per rock
    const rockTone = 0.32 + prng() * 0.22
    color.setRGB(rockTone, rockTone, rockTone * 1.03)
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
