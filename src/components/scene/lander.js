import * as THREE from 'three'
import gsap from 'gsap'

/**
 * src/components/scene/lander.js
 * High-fidelity procedural lunar lander model (Artemis CLPS / Apollo LM archetype).
 * Baseline height: 3.0m with footpads resting precisely at Y = 0.
 *
 * Staging Architecture:
 * - descentStage: Multi-faceted gold MLI thermal foil chassis, 4 propellant tanks,
 *                 descent engine bell, equipment bays, 4 articulated landing legs,
 *                 honeycomb footpads, contact light probes, and crew egress ladder.
 * - ascentStage:  Upper white/silver crew cabin, reflective visor observation windows,
 *                 docking hatch, EVA handrails, 4 RCS thruster quads with 16 nozzles,
 *                 dual solar array wings, high-gain parabolic antenna dish, and beacons.
 *
 * @param {number} [initialHeight=3] - Target height in meters
 * @returns {{
 *   group: THREE.Group,
 *   descentStage: THREE.Group,
 *   ascentStage: THREE.Group,
 *   triggerAscent: (options?: { onUpdate?: () => void, onComplete?: () => void }) => gsap.core.Tween,
 *   resetLander: () => void,
 *   setHeight: (h: number) => void,
 *   dispose: () => void
 * }}
 */
export function buildLander(initialHeight = 3) {
  const group = new THREE.Group()
  const descentStage = new THREE.Group()
  const ascentStage = new THREE.Group()

  group.add(descentStage)
  group.add(ascentStage)

  const BASELINE_HEIGHT = 3.0

  // Aerospace Materials Palette
  const materials = [
    // 0: Gold Multi-Layer Insulation (MLI) thermal foil (descent stage & footpad covers)
    new THREE.MeshStandardMaterial({
      color: 0xdf8a08,
      metalness: 0.9,
      roughness: 0.22,
    }),
    // 1: Silver aluminized Kapton / polished thermal foil
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.18,
    }),
    // 2: White ceramic thermal barrier tiles & composite cabin shell
    new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      metalness: 0.25,
      roughness: 0.4,
    }),
    // 3: Dark titanium alloy for structural struts, trusses & gimbal mounts
    new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.35,
    }),
    // 4: Polished chrome oleo shock absorber inner pistons
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.08,
    }),
    // 5: Heat-discolored niobium / titanium main descent engine bell
    new THREE.MeshStandardMaterial({
      color: 0x27272a,
      metalness: 0.8,
      roughness: 0.45,
    }),
    // 6: Deep blue photovoltaic solar cells
    new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      metalness: 0.88,
      roughness: 0.15,
    }),
    // 7: Dark reflective visor glass for cockpit viewports
    new THREE.MeshStandardMaterial({
      color: 0x090d16,
      metalness: 0.96,
      roughness: 0.04,
    }),
    // 8: Gold mesh high-gain parabolic antenna dish
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.85,
      roughness: 0.25,
    }),
    // 9: Starboard navigation beacon (Green LED)
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    }),
    // 10: Port navigation beacon (Red LED)
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    }),
    // 11: Zenith beacon strobe (White LED)
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 1.0,
      roughness: 0.2,
    }),
  ]

  const [
    matGoldFoil,
    matSilverFoil,
    matCabinWhite,
    matTitanium,
    matChrome,
    matEngine,
    matSolar,
    matVisorGlass,
    matAntennaGold,
    matBeaconGreen,
    matBeaconRed,
    matBeaconWhite,
  ] = materials

  const geometries = []

  const trackMesh = (geo, mat) => {
    geometries.push(geo)
    const mesh = new THREE.Mesh(geo, mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  // =========================================================================
  // 1. DESCENT STAGE (Remains permanently grounded at Y = 0 on the terrain)
  // =========================================================================

  // Primary octagonal chassis wrapped in gold MLI thermal foil
  const descentBaseGeo = new THREE.CylinderGeometry(1.35, 1.45, 0.75, 8)
  const descentBase = trackMesh(descentBaseGeo, matGoldFoil)
  descentBase.position.set(0, 0.92, 0)
  descentBase.rotation.y = Math.PI / 8
  descentStage.add(descentBase)

  // Lower heat shield bulkhead barrier
  const heatShieldGeo = new THREE.CylinderGeometry(1.42, 1.42, 0.08, 8)
  const heatShield = trackMesh(heatShieldGeo, matTitanium)
  heatShield.position.set(0, 0.53, 0)
  heatShield.rotation.y = Math.PI / 8
  descentStage.add(heatShield)

  // 4 Spherical propellant tanks (2 oxidizer, 2 fuel) nested in quadrant pockets
  const tankRadius = 0.32
  const tankDist = 0.98
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2
    const tankGeo = new THREE.SphereGeometry(tankRadius, 16, 16)
    const tankMat = i % 2 === 0 ? matSilverFoil : matTitanium
    const tank = trackMesh(tankGeo, tankMat)
    tank.position.set(Math.cos(angle) * tankDist, 0.92, Math.sin(angle) * tankDist)
    descentStage.add(tank)

    // Tank mounting bands
    const bandGeo = new THREE.TorusGeometry(tankRadius * 1.02, 0.015, 6, 24)
    const band = trackMesh(bandGeo, matTitanium)
    band.position.copy(tank.position)
    band.rotation.x = Math.PI / 2
    descentStage.add(band)
  }

  // Scientific equipment bays & modular payload lockers on chassis facets
  const bayGeo = new THREE.BoxGeometry(0.35, 0.45, 0.2)
  const bayPositions = [
    { x: -1.25, z: 0.5, rotY: 0.3 },
    { x: 1.25, z: 0.5, rotY: -0.3 },
    { x: 0, z: -1.35, rotY: 0 },
  ]
  bayPositions.forEach((pos) => {
    const bay = trackMesh(bayGeo, matSilverFoil)
    bay.position.set(pos.x, 0.95, pos.z)
    bay.rotation.y = pos.rotY
    descentStage.add(bay)
  })

  // Main throttleable descent engine bell
  const engineBellGeo = new THREE.ConeGeometry(0.48, 0.72, 24, 1, true)
  const engineBell = trackMesh(engineBellGeo, matEngine)
  engineBell.position.set(0, 0.46, 0)
  engineBell.rotation.x = Math.PI // Flared downward
  descentStage.add(engineBell)

  // Engine cooling ring ribs
  for (let r = 0; r < 3; r++) {
    const ribRadius = 0.22 + r * 0.1
    const ribGeo = new THREE.TorusGeometry(ribRadius, 0.012, 6, 24)
    const rib = trackMesh(ribGeo, matTitanium)
    rib.position.set(0, 0.55 - r * 0.12, 0)
    rib.rotation.x = Math.PI / 2
    descentStage.add(rib)
  }

  // =========================================================================
  // LANDING GEAR ASSEMBLY (Part of Descent Stage, Y: 0.0 to 1.1)
  // =========================================================================
  const legRadius = 2.45
  const footpadRadius = 0.34
  const footpadHeight = 0.07

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4 // 45, 135, 225, 315 deg
    const footX = Math.cos(angle) * legRadius
    const footZ = Math.sin(angle) * legRadius
    const hipX = Math.cos(angle) * 1.18
    const hipZ = Math.sin(angle) * 1.18
    const hipY = 1.08
    const footY = footpadHeight / 2

    // Dished honeycomb footpad
    const padGeo = new THREE.CylinderGeometry(footpadRadius * 0.85, footpadRadius, footpadHeight, 20)
    const footpad = trackMesh(padGeo, matGoldFoil)
    footpad.position.set(footX, footY, footZ)
    descentStage.add(footpad)

    // Outer footpad retention rim
    const rimGeo = new THREE.TorusGeometry(footpadRadius, 0.015, 6, 20)
    const rim = trackMesh(rimGeo, matTitanium)
    rim.position.set(footX, footY + 0.02, footZ)
    rim.rotation.x = Math.PI / 2
    descentStage.add(rim)

    // Surface contact probe wire ("Contact Light!") extending beneath footpad
    const probeGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.28, 4)
    const probe = trackMesh(probeGeo, matTitanium)
    probe.position.set(footX, footY + 0.05, footZ)
    probe.rotation.z = 0.2
    descentStage.add(probe)

    // Primary shock-absorber strut: Outer titanium cylinder + Inner chrome piston
    const strutVec = new THREE.Vector3(footX - hipX, footY - hipY, footZ - hipZ)
    const strutLen = strutVec.length()
    const strutDir = strutVec.clone().normalize()
    const strutMid = new THREE.Vector3((footX + hipX) / 2, (footY + hipY) / 2, (footZ + hipZ) / 2)

    // Outer shock sleeve (upper half)
    const outerSleeveGeo = new THREE.CylinderGeometry(0.055, 0.055, strutLen * 0.55, 12)
    const outerSleeve = trackMesh(outerSleeveGeo, matTitanium)
    const sleevePos = hipX !== undefined
      ? new THREE.Vector3(hipX, hipY, hipZ).add(strutDir.clone().multiplyScalar(strutLen * 0.28))
      : strutMid
    outerSleeve.position.copy(sleevePos)
    outerSleeve.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strutDir)
    descentStage.add(outerSleeve)

    // Inner chrome hydraulic piston (lower half)
    const innerPistonGeo = new THREE.CylinderGeometry(0.038, 0.038, strutLen * 0.52, 12)
    const innerPiston = trackMesh(innerPistonGeo, matChrome)
    const pistonPos = new THREE.Vector3(footX, footY, footZ).sub(strutDir.clone().multiplyScalar(strutLen * 0.26))
    innerPiston.position.copy(pistonPos)
    innerPiston.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), strutDir)
    descentStage.add(innerPiston)

    // Dual A-frame secondary deployment trusses
    for (let side = -1; side <= 1; side += 2) {
      const braceHipX = Math.cos(angle + side * 0.28) * 1.05
      const braceHipZ = Math.sin(angle + side * 0.28) * 1.05
      const braceVec = new THREE.Vector3(footX - braceHipX, footY - 0.72, footZ - braceHipZ)
      const braceGeo = new THREE.CylinderGeometry(0.026, 0.026, braceVec.length(), 8)
      const braceMesh = trackMesh(braceGeo, matTitanium)
      braceMesh.position.set((footX + braceHipX) / 2, (footY + 0.72) / 2, (footZ + braceHipZ) / 2)
      braceMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), braceVec.clone().normalize())
      descentStage.add(braceMesh)
    }

    // Crew Egress Ladder on Forward (+Z quadrant, angle ~ 45° or 135°) Strut
    if (i === 0) {
      const ladderRungCount = 7
      const rungWidth = 0.26
      const rungGeo = new THREE.CylinderGeometry(0.012, 0.012, rungWidth, 6)
      for (let r = 0; r < ladderRungCount; r++) {
        const frac = 0.2 + (r / ladderRungCount) * 0.75
        const rungPos = new THREE.Vector3(hipX, hipY, hipZ).add(strutDir.clone().multiplyScalar(strutLen * frac))
        const rungMesh = trackMesh(rungGeo, matTitanium)
        rungMesh.position.copy(rungPos).add(new THREE.Vector3(0, 0.04, 0))
        rungMesh.rotation.y = angle + Math.PI / 2
        rungMesh.rotation.z = Math.PI / 2
        descentStage.add(rungMesh)
      }
    }
  }

  // =========================================================================
  // 2. ASCENT STAGE (Crew Cabin, RCS, Antenna, Solar Panels, Navigation)
  // =========================================================================

  // Faceted white thermal barrier avionics deck
  const upperCabinGeo = new THREE.CylinderGeometry(1.05, 1.25, 0.92, 8)
  const upperCabin = trackMesh(upperCabinGeo, matCabinWhite)
  upperCabin.position.set(0, 1.76, 0)
  upperCabin.rotation.y = Math.PI / 8
  ascentStage.add(upperCabin)

  // Silver mid-deck interstage adapter ring
  const interstageGeo = new THREE.CylinderGeometry(1.28, 1.32, 0.12, 8)
  const interstage = trackMesh(interstageGeo, matSilverFoil)
  interstage.position.set(0, 1.32, 0)
  interstage.rotation.y = Math.PI / 8
  ascentStage.add(interstage)

  // Forward Cockpit Observation Windows (Reflective Visor Glass)
  const windowGeo = new THREE.BoxGeometry(0.32, 0.22, 0.04)
  const windowLeft = trackMesh(windowGeo, matVisorGlass)
  windowLeft.position.set(-0.35, 1.9, 1.05)
  windowLeft.rotation.y = -0.25
  windowLeft.rotation.x = -0.15
  ascentStage.add(windowLeft)

  const windowRight = trackMesh(windowGeo, matVisorGlass)
  windowRight.position.set(0.35, 1.9, 1.05)
  windowRight.rotation.y = 0.25
  windowRight.rotation.x = -0.15
  ascentStage.add(windowRight)

  // Top Crew Hatch / Docking Collar Ring
  const hatchGeo = new THREE.TorusGeometry(0.36, 0.04, 8, 24)
  const hatch = trackMesh(hatchGeo, matTitanium)
  hatch.position.set(0, 2.24, 0)
  hatch.rotation.x = Math.PI / 2
  ascentStage.add(hatch)

  const hatchDoorGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.03, 16)
  const hatchDoor = trackMesh(hatchDoorGeo, matSilverFoil)
  hatchDoor.position.set(0, 2.23, 0)
  ascentStage.add(hatchDoor)

  // Safety EVA Tubular Handrails
  const railGeo = new THREE.TorusGeometry(0.95, 0.015, 6, 24, Math.PI * 1.2)
  const handrail = trackMesh(railGeo, matTitanium)
  handrail.position.set(0, 2.26, 0)
  handrail.rotation.x = Math.PI / 2
  ascentStage.add(handrail)

  // 4 RCS Thruster Pods mounted on diagonal corners of the cabin
  const rcsRadius = 1.15
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4
    const podX = Math.cos(angle) * rcsRadius
    const podZ = Math.sin(angle) * rcsRadius
    const podY = 1.68

    // Pod housing box
    const podBoxGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12)
    const podBox = trackMesh(podBoxGeo, matTitanium)
    podBox.position.set(podX, podY, podZ)
    podBox.rotation.y = angle
    ascentStage.add(podBox)

    // 4 Miniature Thruster Nozzles per cluster
    const nozzleDirections = [
      { dx: 0.07, dy: 0, dz: 0, rotZ: -Math.PI / 2 },
      { dx: -0.07, dy: 0, dz: 0, rotZ: Math.PI / 2 },
      { dx: 0, dy: 0.07, dz: 0, rotZ: 0 },
      { dx: 0, dy: -0.07, dz: 0, rotZ: Math.PI },
    ]
    nozzleDirections.forEach((nd) => {
      const nozzleGeo = new THREE.ConeGeometry(0.022, 0.05, 8, 1, true)
      const nozzle = trackMesh(nozzleGeo, matTitanium)
      nozzle.position.set(podX + nd.dx, podY + nd.dy, podZ + nd.dz)
      nozzle.rotation.z = nd.rotZ
      ascentStage.add(nozzle)
    })
  }

  // Articulated Solar Array Wings (Attached to Ascent Stage)
  const panelW = 1.12
  const panelH = 0.62
  const panelT = 0.025

  for (let s = -1; s <= 1; s += 2) {
    const panelGroup = new THREE.Group()
    panelGroup.position.set(s * 1.25, 2.38, 0)
    panelGroup.rotation.z = -s * 0.32

    const frameGeo = new THREE.BoxGeometry(panelW, panelH, panelT)
    const frame = trackMesh(frameGeo, matGoldFoil)
    panelGroup.add(frame)

    const cellGeo = new THREE.PlaneGeometry(panelW * 0.94, panelH * 0.92)
    const cells = trackMesh(cellGeo, matSolar)
    cells.position.set(0, 0, panelT / 2 + 0.002)
    panelGroup.add(cells)

    const boomGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.42, 8)
    const boom = trackMesh(boomGeo, matTitanium)
    boom.position.set(-s * 0.22, -0.15, 0)
    boom.rotation.z = s * (Math.PI / 4)
    panelGroup.add(boom)

    ascentStage.add(panelGroup)
  }

  // High-Gain Parabolic Dish Antenna & Communications Mast
  const mastGeo = new THREE.CylinderGeometry(0.032, 0.038, 0.48, 8)
  const commMast = trackMesh(mastGeo, matTitanium)
  commMast.position.set(0.42, 2.45, 0.42)
  ascentStage.add(commMast)

  const gimbalGeo = new THREE.SphereGeometry(0.065, 12, 12)
  const gimbal = trackMesh(gimbalGeo, matTitanium)
  gimbal.position.set(0.42, 2.7, 0.42)
  ascentStage.add(gimbal)

  const dishGeo = new THREE.ConeGeometry(0.38, 0.12, 24, 1, true)
  const dish = trackMesh(dishGeo, matAntennaGold)
  dish.position.set(0.42, 2.78, 0.42)
  dish.rotation.x = -Math.PI / 3.2
  dish.rotation.z = Math.PI / 5.5
  ascentStage.add(dish)

  const hornGeo = new THREE.ConeGeometry(0.035, 0.09, 8)
  const horn = trackMesh(hornGeo, matTitanium)
  horn.position.set(0.42, 2.86, 0.46)
  horn.rotation.x = -Math.PI / 3.2
  ascentStage.add(horn)

  // LiDAR / Mastcam Sensor Mast
  const navMastGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.58, 8)
  const navMast = trackMesh(navMastGeo, matTitanium)
  navMast.position.set(-0.45, 2.48, -0.35)
  ascentStage.add(navMast)

  const navSensorGeo = new THREE.BoxGeometry(0.14, 0.08, 0.12)
  const navSensor = trackMesh(navSensorGeo, matSilverFoil)
  navSensor.position.set(-0.45, 2.78, -0.35)
  ascentStage.add(navSensor)

  for (let c = -1; c <= 1; c += 2) {
    const lensGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.03, 12)
    const lens = trackMesh(lensGeo, matVisorGlass)
    lens.position.set(-0.45 + c * 0.04, 2.78, -0.28)
    lens.rotation.x = Math.PI / 2
    ascentStage.add(lens)
  }

  // Navigation Beacons
  const beaconGeo = new THREE.SphereGeometry(0.03, 8, 8)
  const beaconGreen = trackMesh(beaconGeo, matBeaconGreen)
  beaconGreen.position.set(1.18, 2.15, 0)
  ascentStage.add(beaconGreen)

  const beaconRed = trackMesh(beaconGeo, matBeaconRed)
  beaconRed.position.set(-1.18, 2.15, 0)
  ascentStage.add(beaconRed)

  const beaconZenith = trackMesh(beaconGeo, matBeaconWhite)
  beaconZenith.position.set(0, 2.32, -0.7)
  ascentStage.add(beaconZenith)

  // =========================================================================
  // Dynamic scaling and Apollo-Style Ascent Staging
  // =========================================================================
  const setHeight = (h) => {
    const validH = Number.isFinite(h) && h > 0 ? h : BASELINE_HEIGHT
    const scale = validH / BASELINE_HEIGHT
    group.scale.set(scale, scale, scale)
  }

  setHeight(initialHeight)

  /**
   * Triggers realistic Apollo-style lunar ascent staging.
   * Animates only the ascentStage moving up and arcing downrange into orbit,
   * leaving descentStage permanently grounded at heightAt(0, 0).
   */
  const triggerAscent = ({ onUpdate, onComplete } = {}) => {
    // Starting relative position (0, 0, 0)
    const p0 = new THREE.Vector3(0, 0, 0)
    // Vertical climb to 18m, then pitchover downrange (+X east, -Z north)
    const pMid = new THREE.Vector3(12, 45, -25)
    // Insertion into high lunar orbit altitude
    const pOrbit = new THREE.Vector3(75, 140, -160)

    const curve = new THREE.QuadraticBezierCurve3(p0, pMid, pOrbit)
    const animState = { t: 0 }

    return gsap.to(animState, {
      t: 1.0,
      duration: 3.2,
      ease: 'power2.in',
      onUpdate: () => {
        const t = animState.t
        const pos = curve.getPoint(t)
        ascentStage.position.copy(pos)

        // Pitch downrange along flight tangent
        const tangent = curve.getTangent(t).normalize()
        const flightQuat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          tangent
        )
        ascentStage.quaternion.slerp(flightQuat, 0.25)

        if (onUpdate) onUpdate()
      },
      onComplete: () => {
        if (onComplete) onComplete()
      },
    })
  }

  const resetLander = () => {
    ascentStage.position.set(0, 0, 0)
    ascentStage.quaternion.identity()
  }

  const dispose = () => {
    geometries.forEach((g) => g.dispose())
    materials.forEach((m) => m.dispose())
  }

  return {
    group,
    descentStage,
    ascentStage,
    triggerAscent,
    resetLander,
    setHeight,
    dispose,
  }
}

export default buildLander
