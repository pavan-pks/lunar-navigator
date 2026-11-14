import React, { useRef, useMemo, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { LocalSurfaceChunk } from './LocalSurfaceChunk.jsx';

export const MOON_RADIUS = 6.0;
export const ORBIT_RADIUS = 8.6;

/**
 * Convert lunar latitude and longitude to 3D sphere cartesian coordinates.
 * South Pole (-90°) maps to -Y.
 */
export function latLonToVector3(lat, lon, radius = MOON_RADIUS) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

/**
 * Known Lunar South Pole geological landmarks with deterministic parameters.
 * Used to carve out recognizable craters (Shackleton, Malapert, etc.)
 * creating authentic relief that casts deep pitch-black shadows from grazing light.
 */
const SOUTH_POLE_FEATURES = [
  // Shackleton Crater: Deep bowl with raised rim crest right at the pole
  { id: 'shackleton', name: 'Shackleton', lat: -89.9, lon: 0.0, radiusDeg: 0.9, depth: 0.22, rimHeight: 0.08, type: 'crater' },
  // Malapert Mountain / Massif: Prominent high ridge
  { id: 'malapert', name: 'Malapert Mountain', lat: -86.0, lon: 0.0, radiusDeg: 2.2, height: 0.28, type: 'mountain' },
  // Connecting Ridge between Shackleton and de Gerlache
  { id: 'connecting-ridge', name: 'Connecting Ridge', lat: -89.4, lon: -135.0, radiusDeg: 1.1, height: 0.12, type: 'ridge' },
  // de Gerlache Crater
  { id: 'de-gerlache', name: 'de Gerlache', lat: -88.5, lon: -88.0, radiusDeg: 1.4, depth: 0.18, rimHeight: 0.06, type: 'crater' },
  // Haworth Crater
  { id: 'haworth', name: 'Haworth', lat: -87.4, lon: -5.0, radiusDeg: 1.5, depth: 0.20, rimHeight: 0.07, type: 'crater' },
  // Shoemaker Crater
  { id: 'shoemaker', name: 'Shoemaker', lat: -88.1, lon: 45.0, radiusDeg: 1.8, depth: 0.21, rimHeight: 0.07, type: 'crater' },
  // Faustini Crater
  { id: 'faustini', name: 'Faustini', lat: -87.3, lon: 77.0, radiusDeg: 1.6, depth: 0.19, rimHeight: 0.06, type: 'crater' },
  // Nobile Crater Rim
  { id: 'nobile', name: 'Nobile Rim', lat: -85.2, lon: 53.0, radiusDeg: 2.3, depth: 0.18, rimHeight: 0.06, type: 'crater' },
  // Amundsen Crater
  { id: 'amundsen', name: 'Amundsen Rim', lat: -84.5, lon: 82.8, radiusDeg: 2.6, depth: 0.20, rimHeight: 0.06, type: 'crater' },
  // Leibnitz Plateau
  { id: 'leibnitz', name: 'Leibnitz Plateau', lat: -85.8, lon: 30.0, radiusDeg: 1.8, height: 0.14, type: 'mountain' },
];

/**
 * Deterministic displacement evaluation for a given lat/lon.
 * Sinks crater interiors and elevates rims and massifs.
 */
function getSouthPoleDisplacement(lat, lon) {
  if (lat > -75) return 0;

  let totalDisp = 0;
  const lat1 = (lat * Math.PI) / 180;
  const lon1 = (lon * Math.PI) / 180;

  for (const f of SOUTH_POLE_FEATURES) {
    const lat2 = (f.lat * Math.PI) / 180;
    const lon2 = (f.lon * Math.PI) / 180;
    const cosD = Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon1 - lon2);
    const dDeg = (Math.acos(Math.max(-1, Math.min(1, cosD))) * 180) / Math.PI;

    if (f.type === 'mountain' || f.type === 'ridge') {
      if (dDeg < f.radiusDeg * 2.2) {
        const t = dDeg / f.radiusDeg;
        totalDisp += f.height * Math.exp(-t * t);
      }
    } else {
      // Crater bowl + sharp rim
      const R = f.radiusDeg;
      if (dDeg < R * 2.5) {
        if (dDeg <= R) {
          const normD = dDeg / R;
          totalDisp -= f.depth * (1.0 - normD * normD);
        }
        const delta = (dDeg - R) / (R * 0.25);
        totalDisp += f.rimHeight * Math.exp(-delta * delta);
      }
    }
  }

  return totalDisp;
}

/**
 * Structured Moon Mesh with Deterministic South Pole Topography and NASA textures.
 */
function StructuredMoon({ sunDir }) {
  const [colorMap, bumpMap] = useTexture([
    '/textures/nasa_moon_2k.jpg',
    '/textures/nasa_moon_bump_2k.jpg',
  ]);

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(MOON_RADIUS, 128, 128);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const radius = v.length();
      const phi = Math.acos(Math.max(-1, Math.min(1, v.y / radius)));
      const lat = 90 - (phi * 180) / Math.PI;
      const lon = ((Math.atan2(v.z, -v.x) * 180) / Math.PI) - 180;

      const disp = getSouthPoleDisplacement(lat, lon);
      if (disp !== 0) {
        const norm = v.clone().normalize();
        v.addScaledVector(norm, disp);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <mesh geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.06}
        roughness={0.94}
        metalness={0.02}
      />
    </mesh>
  );
}

/**
 * Sheer white/silver particle exhaust system.
 * Fires during retrograde and braking, snaps off at touchdown.
 */
function ThrusterParticles({ active = false }) {
  const pointsRef = useRef();
  const count = 30;

  const [positions, speeds] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 0.08;
      pos[i * 3 + 1] = -0.25 - Math.random() * 0.6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
      spd[i] = 0.8 + Math.random() * 1.4;
    }
    return [pos, spd];
  }, []);

  useFrame((_, delta) => {
    if (!active || !pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * delta * 2.5;
      // Reset particle if it travels too far
      if (arr[i * 3 + 1] < -1.1) {
        arr[i * 3] = (Math.random() - 0.5) * 0.08;
        arr[i * 3 + 1] = -0.25;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 0.08;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <group>
      {/* High-intensity inner plume core */}
      <mesh position={[0, -0.48, 0]}>
        <coneGeometry args={[0.07, 0.55, 12, 1, true]} />
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Sheer outer envelope */}
      <mesh position={[0, -0.68, 0]}>
        <coneGeometry args={[0.15, 0.95, 12, 1, true]} />
        <meshBasicMaterial
          color="#e2e8f0"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Streaking spark particles */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.035}
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

/**
 * Sleek Minimalist Geometric Spacecraft.
 * Crisp white body, graphite service module, gold thermal band, titanium engine,
 * 4 delicate landing struts with footpads, and 4 matte solar wings (zero blue!).
 */
export const SpacecraftModel = forwardRef(({ thrusterActive = false }, ref) => {
  return (
    <group ref={ref}>
      {/* 1. Command Module / Crew Cabin (Crisp white cylinder + nose cone) */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.30, 0.38, 16]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.60, 0]} castShadow>
        <coneGeometry args={[0.22, 0.20, 16]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* 2. Service Module (Dark graphite) */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.31, 0.31, 0.24, 16]} />
        <meshStandardMaterial color="#1f1f1f" roughness={0.5} metalness={0.8} />
      </mesh>

      {/* 3. Gold thermal insulation band around descent stage */}
      <mesh position={[0, -0.07, 0]} castShadow>
        <cylinderGeometry args={[0.315, 0.315, 0.12, 16]} />
        <meshStandardMaterial color="#d4af37" roughness={0.35} metalness={0.85} />
      </mesh>

      {/* 4. Main engine bell nozzle */}
      <mesh position={[0, -0.20, 0]} castShadow>
        <coneGeometry args={[0.14, 0.20, 16, 1, true]} />
        <meshStandardMaterial color="#262626" roughness={0.5} metalness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* 5. Four Landing Struts with Footpads */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return (
          <group key={i}>
            {/* Diagonal main strut */}
            <mesh position={[cos * 0.35, -0.16, sin * 0.35]} rotation={[sin * 0.45, 0, -cos * 0.45]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.38, 8]} />
              <meshStandardMaterial color="#d4af37" roughness={0.4} metalness={0.8} />
            </mesh>
            {/* Footpad at surface contact line */}
            <mesh position={[cos * 0.48, -0.28, sin * 0.48]}>
              <cylinderGeometry args={[0.07, 0.07, 0.02, 12]} />
              <meshStandardMaterial color="#e5e5e5" roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* 6. Four Solar Array Wings (Matte charcoal & silver — zero blue!) */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return (
          <group key={i} position={[cos * 0.46, 0.16, sin * 0.46]} rotation={[0, -angle, 0.12]}>
            <mesh castShadow>
              <boxGeometry args={[0.38, 0.12, 0.012]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.8} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.39, 0.13, 0.008]} />
              <meshStandardMaterial color="#a3a3a3" roughness={0.2} metalness={0.9} />
            </mesh>
          </group>
        );
      })}

      {/* 7. Thruster plume & particle streaks */}
      <ThrusterParticles active={thrusterActive} />
    </group>
  );
});

/**
 * Surface Landing Reticle Marker at candidate site.
 */
function TargetLandingReticle({ position, normal }) {
  const quat = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [normal]);

  return (
    <group position={position} quaternion={quat}>
      {/* Outer subtle ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.32, 0.35, 32]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* Center pinpoint */}
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/**
 * Camera Director and Tracking Rig.
 * Smoothly tracks spacecraft during descent and settles into a low-angle surface view on touchdown.
 */
function CameraDirector({
  mode,
  isDescending,
  hasLanded,
  spacecraftRef,
  targetPos,
  targetNormal,
  viewMode,
  isComparing = false,
  orbitControlsRef
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (mode === 'macro') {
      camera.position.lerp(new THREE.Vector3(0, 12, 28), delta * 2.0);
      camera.lookAt(0, 0, 0);
      return;
    }

    if (isComparing) {
      // Zoom out slightly to frame the entire Moon and both scenario targets
      camera.position.lerp(new THREE.Vector3(0, 10, 30), delta * 2.0);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), delta * 2.0);
      }
      return;
    }

    if (isDescending && spacecraftRef.current) {
      // Dynamic chase camera during descent!
      const spPos = spacecraftRef.current.position;
      const spNorm = spPos.clone().normalize();
      const desiredPos = spPos.clone()
        .addScaledVector(spNorm, 2.5)
        .add(new THREE.Vector3(1.2, 0.6, 1.2));
      camera.position.lerp(desiredPos, delta * 3.2);
      camera.lookAt(spPos);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.copy(spPos);
      }
      return;
    }

    if (hasLanded && spacecraftRef.current) {
      const spPos = spacecraftRef.current.position;
      if (viewMode === 'surface') {
        // Astronaut eye-level perspective (~1.7m EVA view) looking towards the lander and horizon
        const astronautEye = spPos.clone()
          .addScaledVector(targetNormal, 0.25)
          .add(new THREE.Vector3(0.75, -0.05, 0.75));
        camera.position.lerp(astronautEye, delta * 2.2);
        camera.lookAt(spPos.clone().addScaledVector(targetNormal, 0.20));
        if (orbitControlsRef.current) {
          orbitControlsRef.current.target.copy(spPos);
        }
      }
    }
  });

  return (
    <OrbitControls
      ref={orbitControlsRef}
      enableDamping
      dampingFactor={0.06}
      minDistance={hasLanded && viewMode === 'surface' ? 0.4 : 7.0}
      maxDistance={hasLanded && viewMode === 'surface' ? 6.0 : 50.0}
      rotateSpeed={0.8}
    />
  );
}

/**
 * The Unified R3F Scene Root.
 */
function UniverseScene({
  mode,
  selectedSite,
  sunEl = 5,
  sunAz = 180,
  onReachedOrbit,
  onLanderTouchdown,
  onUpdateCraterScreenPos,
  spacecraftRef,
  thrusterActive,
  isDescending,
  hasLanded,
  viewMode,
  isComparing = false,
  orbitControlsRef
}) {
  const { camera } = useThree();
  const orbitAngleRef = useRef(0);

  // Target vector and normal
  const targetPos = useMemo(() => {
    const lat = selectedSite?.lat ?? -89.9;
    const lon = selectedSite?.lon ?? 0;
    const disp = getSouthPoleDisplacement(lat, lon);
    return latLonToVector3(lat, lon, MOON_RADIUS + disp);
  }, [selectedSite]);

  const targetNormal = useMemo(() => targetPos.clone().normalize(), [targetPos]);

  // Grazing Polar Sunlight Vector
  const sunDir = useMemo(() => {
    const elRad = (sunEl * Math.PI) / 180;
    const azRad = (sunAz * Math.PI) / 180;
    return new THREE.Vector3(
      Math.cos(elRad) * Math.sin(azRad),
      Math.sin(elRad),
      Math.cos(elRad) * Math.cos(azRad)
    ).normalize();
  }, [sunEl, sunAz]);

  // Orbit rotation animation when in orbit and not descending/landed
  useFrame((_, delta) => {
    if (mode === 'orbit' && !isDescending && !hasLanded && spacecraftRef.current) {
      orbitAngleRef.current += delta * 0.25;
      const ang = orbitAngleRef.current;
      const x = Math.cos(ang) * ORBIT_RADIUS;
      const y = Math.sin(ang) * ORBIT_RADIUS * 0.96;
      const z = Math.sin(ang) * ORBIT_RADIUS * 0.28;
      spacecraftRef.current.position.set(x, y, z);

      // Orient forward along velocity tangent
      const vel = new THREE.Vector3(
        -Math.sin(ang) * ORBIT_RADIUS,
        Math.cos(ang) * ORBIT_RADIUS * 0.96,
        Math.cos(ang) * ORBIT_RADIUS * 0.28
      ).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vel);
      spacecraftRef.current.quaternion.copy(q);
    }

    // Project target crater position to screen coordinates for 2D reticle HUD
    if (targetPos && onUpdateCraterScreenPos) {
      const v = targetPos.clone().project(camera);
      const x = ((v.x + 1) * window.innerWidth) / 2;
      const y = ((-v.y + 1) * window.innerHeight) / 2;
      onUpdateCraterScreenPos({ x, y, visible: v.z < 1.0 });
    }
  });

  return (
    <>
      {/* 1. Deep Space Starfield */}
      <Stars radius={250} depth={80} count={4000} factor={3.5} fade />

      {/* 2. Grazing Polar Sun Directional Light (Deep, Pitch-Black Grazing Shadows) */}
      <directionalLight
        position={[sunDir.x * 45, sunDir.y * 45, sunDir.z * 45]}
        intensity={2.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={10}
        shadow-camera-far={80}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />

      {/* Faint ambient starlight/bounce fill so high-res displacement remains visible in shadows */}
      <hemisphereLight args={['#e2e8f0', '#0a0a0a', 0.22]} />
      <ambientLight intensity={0.18} />

      {/* 3. High-Fidelity Structured Moon */}
      <StructuredMoon sunDir={sunDir} />

      {/* 4. Target Landing Marker */}
      <TargetLandingReticle position={targetPos} normal={targetNormal} />

      {/* 5. The Spacecraft (Explicitly in the R3F scene tree!) */}
      <SpacecraftModel ref={spacecraftRef} thrusterActive={thrusterActive} />

      {/* 6. Distant Earth Marker */}
      <mesh position={[24, 6, -30]}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>

      {/* 7. Camera Rig & Controller */}
      <CameraDirector
        mode={mode}
        isDescending={isDescending}
        hasLanded={hasLanded}
        spacecraftRef={spacecraftRef}
        targetPos={targetPos}
        targetNormal={targetNormal}
        viewMode={viewMode}
        isComparing={isComparing}
        orbitControlsRef={orbitControlsRef}
      />
    </>
  );
}

/**
 * Main Exported R3F Lunar Universe Component with Imperative Handle.
 */
export const LunarUniverseR3F = forwardRef(function LunarUniverseR3F(
  {
    mode = 'orbit',
    sites = [],
    selectedSiteId = 'shackleton',
    onSelectSite,
    onReachedOrbit,
    onLanderTouchdown,
    onUpdateCraterScreenPos,
    sunEl = 5,
    sunAz = 180,
    earthEl = 5,
    earthAz = 0,
    customCoords = null,
    viewMode = 'orbit',
    isDescending = false,
    hasLanded = false,
    isComparing = false,
    setIsDescending,
    setHasLanded,
    setViewMode,
  },
  ref
) {
  const spacecraftRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const [thrusterActive, setThrusterActive] = useState(false);

  const selectedSite = useMemo(() => {
    if (customCoords) return customCoords;
    return sites.find((s) => s.id === selectedSiteId) || sites[0] || {
      id: 'shackleton',
      name: 'Shackleton Crater Rim',
      lat: -89.9,
      lon: 0.0,
    };
  }, [sites, selectedSiteId, customCoords]);

  // Trigger Multi-Phase GSAP Physics-Based Descent Trajectory
  const triggerCinematicDescent = (onComplete) => {
    if (!spacecraftRef.current) return;
    setIsDescending?.(true);

    const lat = selectedSite.lat;
    const lon = selectedSite.lon;
    const disp = getSouthPoleDisplacement(lat, lon);
    const targetPos = latLonToVector3(lat, lon, MOON_RADIUS + disp);
    const targetNormal = targetPos.clone().normalize();

    // Start position in orbit
    const p0 = spacecraftRef.current.position.clone();

    // Intermediate braking waypoint (parabolic arc corridor)
    const midPoint = p0.clone()
      .lerp(targetPos, 0.55)
      .normalize()
      .multiplyScalar(MOON_RADIUS + 2.8);

    // High gate / approach point directly above target
    const pApproach = targetPos.clone().addScaledVector(targetNormal, 1.4);

    // Final touchdown location (footpads resting on the surface)
    const pTouchdown = targetPos.clone().addScaledVector(targetNormal, 0.28);

    // Orientations
    const uprightQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      targetNormal
    );

    const animState = { progress: 0 };
    const tl = gsap.timeline({
      onComplete: () => {
        // Snap thrusters off the exact millisecond of touchdown!
        setThrusterActive(false);
        setIsDescending?.(false);
        setHasLanded?.(true);
        onLanderTouchdown?.();
        onComplete?.();
      },
    });

    // Phase 1: De-orbit Burn (1.2s)
    // Rotate engine nozzle forward retrograde, activate thrusters
    tl.to(
      {},
      {
        duration: 1.2,
        onStart: () => setThrusterActive(true),
        onUpdate: function () {
          const t = this.progress();
          if (spacecraftRef.current) {
            // Retrograde pitch maneuver
            const retrogradeQuat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              targetNormal.clone().negate()
            );
            spacecraftRef.current.quaternion.slerp(retrogradeQuat, t);
          }
        },
      }
    );

    // Phase 2: Parabolic Braking Curve (3.4s)
    // Follows parabolic arc down toward the target entry corridor
    tl.to(animState, {
      progress: 0.75,
      duration: 3.4,
      ease: 'power1.inOut',
      onUpdate: () => {
        if (!spacecraftRef.current) return;
        const normT = animState.progress / 0.75;
        // Quadratic bezier interpolation p0 -> midPoint -> pApproach
        const pos = new THREE.Vector3();
        pos.x = (1 - normT) * (1 - normT) * p0.x + 2 * (1 - normT) * normT * midPoint.x + normT * normT * pApproach.x;
        pos.y = (1 - normT) * (1 - normT) * p0.y + 2 * (1 - normT) * normT * midPoint.y + normT * normT * pApproach.y;
        pos.z = (1 - normT) * (1 - normT) * p0.z + 2 * (1 - normT) * normT * midPoint.z + normT * normT * pApproach.z;
        spacecraftRef.current.position.copy(pos);

        // Transition orientation toward upright normal
        spacecraftRef.current.quaternion.slerp(uprightQuat, 0.08);
      },
    });

    // Phase 3: Terminal Descent & Smooth Touchdown (2.0s, power2.out)
    // Straight vertical descent with upright alignment
    tl.to(animState, {
      progress: 1.0,
      duration: 2.0,
      ease: 'power2.out',
      onUpdate: () => {
        if (!spacecraftRef.current) return;
        const normT = (animState.progress - 0.75) / 0.25;
        spacecraftRef.current.position.lerpVectors(pApproach, pTouchdown, normT);
        spacecraftRef.current.quaternion.slerp(uprightQuat, 0.2);
      },
      onComplete: () => {
        // Snap thrusters off the exact millisecond it touches the surface!
        setThrusterActive(false);
      },
    });
  };

  useImperativeHandle(ref, () => ({
    startMissionTransition: () => {
      onReachedOrbit?.();
    },
    triggerCinematicDescent,
    resetToMacro: () => {
      setThrusterActive(false);
      setIsDescending?.(false);
      setHasLanded?.(false);
      setViewMode?.('orbit');
    },
    focusSite: () => {},
  }));

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        camera={{
          position: viewMode === 'surface' ? [3.4, 2.0, 5.4] : [0, 8, 22],
          fov: viewMode === 'surface' ? 48 : 42,
          near: 0.1,
          far: 2500,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
      >
        {viewMode === 'surface' ? (
          <LocalSurfaceChunk
            sunEl={sunEl}
            sunAz={sunAz}
            earthEl={earthEl}
            earthAz={earthAz}
            site={selectedSite}
          />
        ) : (
          <UniverseScene
            mode={mode}
            selectedSite={selectedSite}
            sunEl={sunEl}
            sunAz={sunAz}
            onReachedOrbit={onReachedOrbit}
            onLanderTouchdown={onLanderTouchdown}
            onUpdateCraterScreenPos={onUpdateCraterScreenPos}
            spacecraftRef={spacecraftRef}
            thrusterActive={thrusterActive}
            isDescending={isDescending}
            hasLanded={hasLanded}
            viewMode={viewMode}
            isComparing={isComparing}
            orbitControlsRef={orbitControlsRef}
          />
        )}
      </Canvas>
    </div>
  );
});

export default LunarUniverseR3F;
