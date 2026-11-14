import * as THREE from 'three'

/**
 * Procedural lunar lander model built from geometric primitives.
 * Baseline lander height is designed at 3.0m with feet touching Y = 0.
 *
 * @param {number} [initialHeight=3] - Target height in meters
 * @returns {{ group: THREE.Group, setHeight: (h: number) => void, dispose: () => void }}
 */
export function buildLander(initialHeight = 3) {
  const group = new THREE.Group()
  const BASELINE_HEIGHT = 3.0

  // Shared reusable materials
  const materials = [
    // Body upper stage (silver / light metallic)
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.7,
      roughness: 0.3,
    }),
    // Lower stage foil (gold thermal insulation)
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.8,
      roughness: 0.25,
    }),
    // Structural struts & engine bell (dark titanium alloy)
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.4,
    }),
    // Solar panel array (dark blue photovoltaic cells)
    new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      metalness: 0.85,
      roughness: 0.2,
    }),
    // Antenna dish (reflective silver/white)
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.9,
      roughness: 0.2,
    }),
  ]

  const [matBodySilver, matBodyGold, matStruts, matSolar, matAntenna] = materials
  const geometries = []

  const trackMesh = (geo, mat) => {
    geometries.push(geo)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  // 1. Lower descent stage (gold octagonal base, Y: 0.55 to 1.35)
  const lowerBaseGeo = new THREE.CylinderGeometry(1.3, 1.4, 0.8, 8)
  const lowerBase = trackMesh(lowerBaseGeo, matBodyGold)
  lowerBase.position.set(0, 0.95, 0)
  lowerBase.rotation.y = Math.PI / 8
  group.add(lowerBase)

  // 2. Upper ascent / avionics cabin (silver octagonal prism, Y: 1.35 to 2.25)
  const upperCabinGeo = new THREE.CylinderGeometry(1.0, 1.15, 0.9, 8)
  const upperCabin = trackMesh(upperCabinGeo, matBodySilver)
  upperCabin.position.set(0, 1.8, 0)
  upperCabin.rotation.y = Math.PI / 8
  group.add(upperCabin)

  // 3. Central descent engine bell (pointing downward underneath lower stage)
  const engineGeo = new THREE.ConeGeometry(0.42, 0.65, 16, 1, true)
  const engineBell = trackMesh(engineGeo, matStruts)
  engineBell.position.set(0, 0.45, 0)
  engineBell.rotation.x = Math.PI // Point flared cone down
  group.add(engineBell)

  // 4. Four landing legs with footpads and cross-braces
  const legRadius = 2.4
  const footpadRadius = 0.32
  const footpadHeight = 0.08

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4 // 45, 135, 225, 315 deg
    const footX = Math.cos(angle) * legRadius
    const footZ = Math.sin(angle) * legRadius
    const hipX = Math.cos(angle) * 1.1
    const hipZ = Math.sin(angle) * 1.1
    const hipY = 1.05
    const footY = footpadHeight / 2

    // Footpad (flat cylinder on ground at Y = 0)
    const padGeo = new THREE.CylinderGeometry(footpadRadius, footpadRadius, footpadHeight, 16)
    const footpad = trackMesh(padGeo, matBodyGold)
    footpad.position.set(footX, footY, footZ)
    group.add(footpad)

    // Primary landing strut connecting hip to footpad
    const strutVec = new THREE.Vector3(footX - hipX, footY - hipY, footZ - hipZ)
    const strutLen = strutVec.length()
    const strutGeo = new THREE.CylinderGeometry(0.045, 0.045, strutLen, 8)
    const strutMesh = trackMesh(strutGeo, matStruts)

    // Position and orient cylinder along vector
    const midX = (footX + hipX) / 2
    const midY = (footY + hipY) / 2
    const midZ = (footZ + hipZ) / 2
    strutMesh.position.set(midX, midY, midZ)
    strutMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strutVec.clone().normalize())
    group.add(strutMesh)

    // Secondary side brace strut
    const braceHipX = Math.cos(angle + 0.3) * 0.95
    const braceHipZ = Math.sin(angle + 0.3) * 0.95
    const braceVec = new THREE.Vector3(footX - braceHipX, footY - 0.7, footZ - braceHipZ)
    const braceGeo = new THREE.CylinderGeometry(0.03, 0.03, braceVec.length(), 6)
    const braceMesh = trackMesh(braceGeo, matStruts)
    braceMesh.position.set((footX + braceHipX) / 2, (footY + 0.7) / 2, (footZ + braceHipZ) / 2)
    braceMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), braceVec.clone().normalize())
    group.add(braceMesh)
  }

  // 5. Dual solar panel wings on top deck
  const panelWidth = 0.95
  const panelHeight = 0.55
  const panelThick = 0.03

  const solarGeo = new THREE.BoxGeometry(panelWidth, panelHeight, panelThick)
  // Left solar panel
  const solarLeft = trackMesh(solarGeo, matSolar)
  solarLeft.position.set(-1.05, 2.3, 0)
  solarLeft.rotation.z = -0.35 // Tilted towards sunlight
  group.add(solarLeft)

  // Right solar panel
  const solarRight = trackMesh(solarGeo, matSolar)
  solarRight.position.set(1.05, 2.3, 0)
  solarRight.rotation.z = 0.35
  group.add(solarRight)

  // 6. Steerable high-gain antenna (dish + mast) on cabin roof
  const mastGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.55, 8)
  const mast = trackMesh(mastGeo, matStruts)
  mast.position.set(0.35, 2.45, 0.35)
  group.add(mast)

  const dishGeo = new THREE.ConeGeometry(0.3, 0.1, 16, 1, true)
  const dish = trackMesh(dishGeo, matAntenna)
  dish.position.set(0.35, 2.75, 0.35)
  dish.rotation.x = -Math.PI / 3 // Tilted toward Earth
  dish.rotation.z = Math.PI / 6
  group.add(dish)

  // Function to dynamically update height/scale without recreating geometry
  const setHeight = (h) => {
    const validH = Number.isFinite(h) && h > 0 ? h : BASELINE_HEIGHT
    const scale = validH / BASELINE_HEIGHT
    group.scale.set(scale, scale, scale)
  }

  // Set initial scale
  setHeight(initialHeight)

  const dispose = () => {
    geometries.forEach((g) => g.dispose())
    materials.forEach((m) => m.dispose())
  }

  return {
    group,
    setHeight,
    dispose,
  }
}
