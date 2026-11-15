import React, { useRef, useMemo, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { createPRNG } from './noise.js';
import { isPrefersReducedMotion } from '../../lib/animation.js';
import { getTierConfig } from './quality.js';
import { LocalSurfaceChunk } from './LocalSurfaceChunk.jsx';
import { LUNAR_LANDMARKS } from '../../lib/lunarLandmarks.js';

export const MOON_RADIUS = 6.0;
export const ORBIT_RADIUS = 8.6;

/**
 * Convert lunar latitude and longitude to 3D sphere Cartesian coordinates.
 * South Pole (-90°) maps to -Y, North Pole (+90°) maps to +Y.
 * Prime Meridian (0° lon) is aligned with the center of the NASA equirectangular texture.
 */
export function latLonToVector3(lat, lon, radius = MOON_RADIUS) {
  const safeLat = Number.isFinite(Number(lat)) ? Number(lat) : -89.9;
  const safeLon = Number.isFinite(Number(lon)) ? Number(lon) : 0.0;
  const safeRadius = Number.isFinite(Number(radius)) ? Number(radius) : MOON_RADIUS;
  const phi = (90 - safeLat) * (Math.PI / 180);
  const theta = (safeLon + 180) * (Math.PI / 180);
  const x = -safeRadius * Math.sin(phi) * Math.cos(theta);
  const y = safeRadius * Math.cos(phi);
  const z = safeRadius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

/**
 * Convert 3D Cartesian coordinates on the sphere back to lunar latitude and longitude.
 */
export function vector3ToLatLon(vec) {
  const radius = vec.length();
  const phi = Math.acos(Math.max(-1, Math.min(1, vec.y / radius)));
  const lat = 90 - (phi * 180) / Math.PI;
  const theta = Math.atan2(vec.z, -vec.x);
  let lon = (theta * 180) / Math.PI - 180;
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;
  return {
    lat: parseFloat(lat.toFixed(3)),
    lon: parseFloat(lon.toFixed(3)),
  };
}

// Module-level reusable scratch objects to eliminate per-frame garbage collection and micro-stutter
const _tempCamDir = new THREE.Vector3();
const _tempTangent = new THREE.Vector3();
const _tempQuat = new THREE.Quaternion();
const _upVec = new THREE.Vector3(0, 1, 0);
const _tempProj = new THREE.Vector3();
const _tempCamDiff = new THREE.Vector3();
const _tempVecA = new THREE.Vector3();
const _tempVecB = new THREE.Vector3();
const _macroTarget = new THREE.Vector3(0, 10, 24);
const _compareTarget = new THREE.Vector3(0, 10, 30);
const _originTarget = new THREE.Vector3(0, 0, 0);

/**
 * Cache for 3D billboard sprite textures to avoid garbage collection spikes.
 */
const spriteTextureCache = new Map();

function getSpotSpriteTexture(spot, isSelected) {
  const key = `${spot.id}_${isSelected ? 'active' : 'idle'}_nameonly`;
  if (spriteTextureCache.has(key)) return spriteTextureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  const displayName = (spot.shortName || spot.name).toUpperCase();

  ctx.font = 'bold 30px "Space Grotesk", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Deep dark shadow halo for crystal-clear readability against terrain
  ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 2;

  // Crisp outline
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
  ctx.lineWidth = 5;
  ctx.strokeText(displayName, 256, 48);

  // Name text only
  ctx.fillStyle = isSelected ? '#38bdf8' : '#ffffff';
  ctx.fillText(displayName, 256, 48);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  spriteTextureCache.set(key, tex);
  return tex;
}

/**
 * Structured Moon Mesh with authentic NASA LOLA 2K maps.
 * Uses native Three.js equirectangular UV mapping and LOLA elevation bump relief.
 * Interactive: users can click anywhere on the Moon to pinpoint custom target coordinates.
 */
function StructuredMoon({ onPickCoord }) {
  const [colorMap, bumpMap] = useTexture([
    '/textures/nasa_moon_2k.jpg',
    '/textures/nasa_moon_bump_2k.jpg',
  ]);

  useEffect(() => {
    if (colorMap) {
      colorMap.anisotropy = 16;
      colorMap.colorSpace = THREE.SRGBColorSpace;
      colorMap.wrapS = THREE.RepeatWrapping;
      colorMap.wrapT = THREE.ClampToEdgeWrapping;
      colorMap.needsUpdate = true;
    }
    if (bumpMap) {
      bumpMap.anisotropy = 16;
      bumpMap.wrapS = THREE.RepeatWrapping;
      bumpMap.wrapT = THREE.ClampToEdgeWrapping;
      bumpMap.needsUpdate = true;
    }
  }, [colorMap, bumpMap]);

  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(MOON_RADIUS, 128, 128);
  }, []);

  const pointerDownRef = useRef({ x: 0, y: 0, time: 0 });

  return (
    <mesh
      geometry={geometry}
      receiveShadow
      castShadow
      onPointerDown={(e) => {
        pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
      }}
      onPointerUp={(e) => {
        const dx = e.clientX - pointerDownRef.current.x;
        const dy = e.clientY - pointerDownRef.current.y;
        const dt = Date.now() - pointerDownRef.current.time;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // If click moved less than 6px and finished under 450ms, it's an intentional click
        if (dist < 6 && dt < 450 && e.point && onPickCoord) {
          const coords = vector3ToLatLon(e.point);
          onPickCoord(coords);
        }
      }}
    >
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap}
        bumpScale={0.08}
        roughness={0.94}
        metalness={0.0}
      />
    </mesh>
  );
}

/**
 * 3D Landmark Label Item with horizon occlusion, surface pin, and billboard badge.
 */
function LunarSpotLabelItem({ landmark, isSelected, onSelectSite, camDist = 22 }) {
  const { camera } = useThree();
  const spriteRef = useRef(null);
  const stemRef = useRef(null);
  const dotRef = useRef(null);

  const { pos, normal, pinTop, texture } = useMemo(() => {
    const p = latLonToVector3(landmark.lat, landmark.lon, MOON_RADIUS);
    const n = p.clone().normalize();
    const top = p.clone().addScaledVector(n, 0.18);
    const tex = getSpotSpriteTexture(landmark, isSelected);
    return { pos: p, normal: n, pinTop: top, texture: tex };
  }, [landmark, isSelected]);

  // Scale badge slightly smaller when zoomed out to prevent crowding
  const badgeScale = useMemo(() => {
    const factor = camDist > 24 ? 0.75 : (camDist > 16 ? 0.9 : 1.0);
    return isSelected ? [1.15 * factor, 0.22 * factor, 1] : [0.95 * factor, 0.18 * factor, 1];
  }, [camDist, isSelected]);

  // Stem line geometry
  const stemGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      pos.x, pos.y, pos.z,
      pinTop.x, pinTop.y, pinTop.z,
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    return geo;
  }, [pos, pinTop]);

  // Occlude spots that rotate beyond the visible lunar horizon (zero GC allocation)
  useFrame(() => {
    if (!spriteRef.current) return;
    _tempCamDir.subVectors(camera.position, pos).normalize();
    const dot = normal.dot(_tempCamDir);

    if (dot < 0.05) {
      if (spriteRef.current.visible) {
        spriteRef.current.visible = false;
        if (stemRef.current) stemRef.current.visible = false;
        if (dotRef.current) dotRef.current.visible = false;
      }
    } else {
      if (!spriteRef.current.visible) {
        spriteRef.current.visible = true;
        if (stemRef.current) stemRef.current.visible = true;
        if (dotRef.current) dotRef.current.visible = true;
      }

      const alpha = THREE.MathUtils.clamp((dot - 0.05) / 0.15, 0, 1);
      const targetOpacity = alpha * (isSelected ? 1.0 : 0.88);
      if (Math.abs(spriteRef.current.material.opacity - targetOpacity) > 0.03) {
        spriteRef.current.material.opacity = targetOpacity;
        if (stemRef.current) stemRef.current.material.opacity = alpha * 0.45;
        if (dotRef.current) dotRef.current.material.opacity = alpha;
      }
    }
  });

  const dotColor =
    landmark.category === 'artemis' ? '#38bdf8' :
    landmark.category === 'historic' ? '#fbbf24' :
    landmark.category === 'pole' ? '#c084fc' : '#cbd5e1';

  return (
    <group>
      {/* Surface Beacon Dot */}
      <mesh ref={dotRef} position={pos.clone().addScaledVector(normal, 0.02)}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={isSelected ? '#ffffff' : dotColor} transparent />
      </mesh>

      {/* Surface Pulsing Ring if Selected */}
      {isSelected && (
        <mesh position={pos.clone().addScaledVector(normal, 0.025)}>
          <ringGeometry args={[0.08, 0.12, 24]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Vertical Pin Stem */}
      <line ref={stemRef} geometry={stemGeo}>
        <lineBasicMaterial color={isSelected ? '#38bdf8' : '#ffffff'} transparent opacity={0.35} />
      </line>

      {/* Billboard Sprite Badge */}
      <sprite
        ref={spriteRef}
        position={pinTop}
        scale={badgeScale}
        onClick={(e) => {
          e.stopPropagation();
          onSelectSite?.(landmark);
        }}
      >
        <spriteMaterial
          map={texture}
          transparent
          depthTest={false}
          sizeAttenuation={true}
        />
      </sprite>
    </group>
  );
}

/**
 * 3D Landmark Spot Labels Layer for candidate Artemis sites, Apollo landers, and craters.
 * Features distance-based level of detail, priority capping, and scale attenuation to eliminate overlapping clutter.
 */
function LunarSpotLabels({ landmarks, selectedSiteId, onSelectSite }) {
  const { camera } = useThree();
  const [camDist, setCamDist] = useState(22);

  useFrame(() => {
    const dist = camera.position.length();
    if (Math.abs(dist - camDist) > 1.5) {
      setCamDist(dist);
    }
  });

  const visibleLandmarks = useMemo(() => {
    return landmarks.filter((lm) => {
      if (lm.id === selectedSiteId) return true;
      if (camDist > 25) {
        return lm.category === 'artemis' || lm.category === 'pole';
      }
      if (camDist > 16) {
        return lm.category === 'artemis' || lm.category === 'pole' || lm.category === 'historic';
      }
      return true;
    }).slice(0, camDist > 25 ? 7 : (camDist > 16 ? 12 : 24));
  }, [landmarks, selectedSiteId, camDist]);

  return (
    <group>
      {visibleLandmarks.map((lm) => (
        <LunarSpotLabelItem
          key={lm.id}
          landmark={lm}
          isSelected={selectedSiteId === lm.id}
          onSelectSite={onSelectSite}
          camDist={camDist}
        />
      ))}
    </group>
  );
}

/**
 * Sheer white/silver particle exhaust system.
 * Fires during retrograde and braking, snaps off at touchdown.
 */
function ThrusterParticles({ active = false }) {
  const pointsRef = useRef();
  const count = 30;
  const prngRef = useRef(null);
  if (!prngRef.current) {
    prngRef.current = createPRNG(9876);
  }

  const [positions, speeds] = useMemo(() => {
    const prng = createPRNG(9876);
    const pos = new Float32Array(count * 3);
    const spd = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (prng() - 0.5) * 0.08;
      pos[i * 3 + 1] = -0.25 - prng() * 0.6;
      pos[i * 3 + 2] = (prng() - 0.5) * 0.08;
      spd[i] = 0.8 + prng() * 1.4;
    }
    return [pos, spd];
  }, []);

  useFrame((_, delta) => {
    if (!active || !pointsRef.current) return;
    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array;
    const prng = prngRef.current;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] -= speeds[i] * delta * 2.5;
      if (arr[i * 3 + 1] < -1.1) {
        arr[i * 3] = (prng() - 0.5) * 0.08;
        arr[i * 3 + 1] = -0.25;
        arr[i * 3 + 2] = (prng() - 0.5) * 0.08;
      }
    }
    posAttr.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <group>
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
 * Sleek Scaled Lunar Lander Module (Descent Stage + Crew Cabin).
 * Features gold MLI insulation foil, 4 shock-absorbing landing legs with footpads,
 * 4 attitude RCS thruster quads, cabin observation windows, and throttleable descent engine.
 */
export function LunarLanderModule({ thrusterActive = false, scale = 0.42 }) {
  return (
    <group scale={[scale, scale, scale]}>
      {/* 1. Crew Cabin / Avionics Deck */}
      <mesh position={[0, 0.45, 0]} castShadow>
        <cylinderGeometry args={[0.26, 0.32, 0.34, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.25} metalness={0.2} />
      </mesh>
      {/* Cabin Roof / Docking Tunnel */}
      <mesh position={[0, 0.66, 0]} castShadow>
        <cylinderGeometry args={[0.14, 0.20, 0.12, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
      </mesh>
      {/* Observation Windows */}
      <mesh position={[0, 0.48, 0.27]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.18, 0.08, 0.02]} />
        <meshStandardMaterial color="#0284c7" roughness={0.1} metalness={0.9} />
      </mesh>

      {/* 2. Descent Stage Core (Gold MLI Thermal Foil) */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.34, 0.32, 8]} />
        <meshStandardMaterial color="#d4af37" roughness={0.3} metalness={0.9} />
      </mesh>

      {/* 3. Four External Spherical Propellant Tanks */}
      {[0, 1, 2, 3].map((i) => {
        const ang = (i * Math.PI) / 2;
        return (
          <mesh key={i} position={[Math.cos(ang) * 0.28, 0.12, Math.sin(ang) * 0.28]} castShadow>
            <sphereGeometry args={[0.10, 16, 16]} />
            <meshStandardMaterial color="#d4af37" roughness={0.35} metalness={0.85} />
          </mesh>
        );
      })}

      {/* 4. Four RCS Reaction Control Thruster Quads (16 cold-gas nozzles) */}
      {[0, 1, 2, 3].map((i) => {
        const ang = (i * Math.PI) / 2 + Math.PI / 4;
        return (
          <group key={i} position={[Math.cos(ang) * 0.32, 0.46, Math.sin(ang) * 0.32]}>
            <mesh>
              <boxGeometry args={[0.04, 0.04, 0.04]} />
              <meshStandardMaterial color="#475569" roughness={0.5} metalness={0.8} />
            </mesh>
            <mesh position={[Math.cos(ang) * 0.03, 0, Math.sin(ang) * 0.03]}>
              <cylinderGeometry args={[0.012, 0.02, 0.04, 8]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
          </group>
        );
      })}

      {/* 5. Main Descent Engine Bell Nozzle */}
      <mesh position={[0, -0.10, 0]} castShadow>
        <coneGeometry args={[0.16, 0.22, 16, 1, true]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* 6. Four Articulated Landing Struts with Footpads */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2 + Math.PI / 4;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return (
          <group key={i}>
            {/* Primary Diagonal Strut */}
            <mesh position={[cos * 0.34, -0.06, sin * 0.34]} rotation={[sin * 0.48, 0, -cos * 0.48]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.42, 8]} />
              <meshStandardMaterial color="#d4af37" roughness={0.35} metalness={0.85} />
            </mesh>
            {/* Secondary Cross Brace */}
            <mesh position={[cos * 0.24, 0.04, sin * 0.24]} rotation={[sin * 0.2, 0, -cos * 0.2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.26, 8]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.4} metalness={0.8} />
            </mesh>
            {/* Circular Honeycomb Footpad */}
            <mesh position={[cos * 0.48, -0.22, sin * 0.48]}>
              <cylinderGeometry args={[0.075, 0.075, 0.02, 12]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* Main Throttleable Braking Exhaust Particles */}
      <ThrusterParticles active={thrusterActive} />
    </group>
  );
}

/**
 * Detachable Orbital Service / Propulsion Module (CSM / Propulsion Stage).
 * Features thermal radiators, high-gain parabolic communications dish,
 * and 4 large cross-shaped deployable Solar Array Wings.
 */
export function OrbitalServiceModule({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 0.42 }) {
  return (
    <group position={position} rotation={rotation} scale={[scale, scale, scale]}>
      {/* 1. Cylindrical Service Module Hull */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.33, 0.33, 0.38, 24]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.35} metalness={0.75} />
      </mesh>

      {/* Radiator Thermal Band */}
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.335, 0.335, 0.16, 24]} />
        <meshStandardMaterial color="#1e293b" roughness={0.6} metalness={0.9} />
      </mesh>

      {/* 2. Orbital Maneuvering System (OMS) Engine Bell */}
      <mesh position={[0, -0.28, 0]} castShadow>
        <coneGeometry args={[0.13, 0.20, 16, 1, true]} />
        <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* 3. Interstage Decoupler Collar Ring with Explosive Bolts */}
      <mesh position={[0, 0.21, 0]}>
        <cylinderGeometry args={[0.32, 0.34, 0.06, 24]} />
        <meshStandardMaterial color="#f59e0b" roughness={0.4} metalness={0.8} />
      </mesh>

      {/* 4. High-Gain Parabolic Communications Dish Antenna */}
      <group position={[0.36, 0.12, 0.18]} rotation={[0.4, 0.6, 0]}>
        {/* Support Strut */}
        <mesh position={[-0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 8]} />
          <meshStandardMaterial color="#64748b" />
        </mesh>
        {/* Parabolic Dish */}
        <mesh>
          <sphereGeometry args={[0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.2} metalness={0.9} side={THREE.DoubleSide} />
        </mesh>
        {/* Feed Horn */}
        <mesh position={[0, 0, 0.08]}>
          <coneGeometry args={[0.02, 0.06, 8]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* 5. Four Deployable Photovoltaic Solar Array Wings */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return (
          <group key={i} position={[cos * 0.52, 0.04, sin * 0.52]} rotation={[0, -angle, 0.08]}>
            {/* Hinge mount */}
            <mesh position={[-cos * 0.12, 0, -sin * 0.12]}>
              <boxGeometry args={[0.05, 0.04, 0.04]} />
              <meshStandardMaterial color="#475569" />
            </mesh>
            {/* Solar Cell Panel with Photovoltaic Blue/Dark Silicon Grid */}
            <mesh castShadow>
              <boxGeometry args={[0.48, 0.15, 0.014]} />
              <meshStandardMaterial color="#0284c7" roughness={0.2} metalness={0.85} />
            </mesh>
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[0.49, 0.16, 0.010]} />
              <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

/**
 * Unified Scaled Spacecraft Model with Detachable Staging.
 * In orbit: Combined stack (Lander attached atop the Orbital Service Module).
 * During descent & landed: Staging separates the two! The Service Module stays in orbit,
 * while the sleek Lunar Lander descends and touches down on the surface.
 */
export const SpacecraftModel = forwardRef(
  ({ thrusterActive = false, isSeparated = false, scale = 0.42 }, ref) => {
    return (
      <group ref={ref}>
        {/* Lunar Lander Stage */}
        <group position={[0, isSeparated ? 0 : 0.22, 0]}>
          <LunarLanderModule thrusterActive={thrusterActive} scale={scale} />
        </group>

        {/* Mated Service Module (Only attached when NOT separated) */}
        {!isSeparated && (
          <group position={[0, -0.16, 0]}>
            <OrbitalServiceModule scale={scale} />
          </group>
        )}
      </group>
    );
  }
);

/**
 * Target Landing Pad Reticle indicator on the Moon sphere.
 */
function TargetLandingReticle({ position, normal }) {
  const quat = useMemo(() => {
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
  }, [normal]);

  return (
    <group position={position} quaternion={quat}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <ringGeometry args={[0.32, 0.38, 32]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/**
 * Live Direct-to-Earth 3D Laser / DSN Telemetry Beam.
 * Connects the active lunar landing site to Earth with traveling telemetry data packets.
 */
function DirectToEarthLaserBeam({ targetPos, earthPos, earthEl = 5 }) {
  const isOccluded = earthEl <= 0;

  const lineGeo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints([targetPos, earthPos]);
  }, [targetPos, earthPos]);

  // Telemetry Packet Sparks traveling from Moon to Earth
  const sparksRef = useRef(null);
  const sparkCount = 20;
  const sparkProgress = useRef(Array.from({ length: sparkCount }, (_, i) => i / sparkCount));

  const sparkGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (!sparksRef.current) return;
    const pos = sparksRef.current.geometry.attributes.position.array;
    for (let i = 0; i < sparkCount; i++) {
      sparkProgress.current[i] = (sparkProgress.current[i] + delta * 0.28) % 1.0;
      const t = sparkProgress.current[i];
      pos[i * 3 + 0] = targetPos.x + (earthPos.x - targetPos.x) * t;
      pos[i * 3 + 1] = targetPos.y + (earthPos.y - targetPos.y) * t;
      pos[i * 3 + 2] = targetPos.z + (earthPos.z - targetPos.z) * t;
    }
    sparksRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <group>
      {/* Primary Laser Core */}
      <line geometry={lineGeo}>
        <lineBasicMaterial
          color={isOccluded ? '#ef4444' : '#00f0ff'}
          transparent
          opacity={isOccluded ? 0.25 : 0.75}
          blending={THREE.AdditiveBlending}
        />
      </line>

      {/* Volumetric Halo Beam */}
      <line geometry={lineGeo}>
        <lineBasicMaterial
          color={isOccluded ? '#991b1b' : '#38bdf8'}
          transparent
          opacity={isOccluded ? 0.12 : 0.35}
          blending={THREE.AdditiveBlending}
        />
      </line>

      {/* Animated Telemetry Packet Sparks */}
      {!isOccluded && (
        <points ref={sparksRef} geometry={sparkGeo}>
          <pointsMaterial
            color="#ffffff"
            size={0.18}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
          />
        </points>
      )}
    </group>
  );
}

/**
 * Photorealistic Distant Earth Globe with NASA Blue Marble Texture and Rayleigh Glow.
 */
function DistantEarthGlobe({ position }) {
  const earthTexture = useTexture('/textures/nasa_earth_bluemarble.jpg');
  const earthRef = useRef(null);

  useEffect(() => {
    if (earthTexture) {
      earthTexture.colorSpace = THREE.SRGBColorSpace;
      earthTexture.anisotropy = 16;
    }
  }, [earthTexture]);

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group position={position}>
      {/* Textured Earth Globe */}
      <mesh ref={earthRef} rotation={[0.4, 0, 0]}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.65}
          metalness={0.08}
        />
      </mesh>

      {/* Atmospheric Rayleigh Halo Ring */}
      <mesh>
        <sphereGeometry args={[1.62, 32, 32]} />
        <meshBasicMaterial
          color="#38bdf8"
          transparent
          opacity={0.28}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/**
 * Cesium-style Tactical Lunar Coordinate Graticule Grid.
 * Renders high-precision latitude parallels, longitude meridians,
 * polar circles, and true north axis vectors.
 */
function LunarGraticule({ visible = true }) {
  const graticuleLines = useMemo(() => {
    if (!visible) return null;
    const R = MOON_RADIUS * 1.002;
    const segments = 120;
    const lines = [];

    // 1. Latitude Parallels
    const latitudes = [
      { lat: 0, color: '#38bdf8', opacity: 0.45, key: 'lat-0-eq' },        // Equator
      { lat: 30, color: '#94a3b8', opacity: 0.20, key: 'lat-30' },
      { lat: -30, color: '#94a3b8', opacity: 0.20, key: 'lat-m30' },
      { lat: 60, color: '#94a3b8', opacity: 0.22, key: 'lat-60' },
      { lat: -60, color: '#94a3b8', opacity: 0.22, key: 'lat-m60' },
      { lat: 75, color: '#38bdf8', opacity: 0.38, key: 'lat-75-artemis' }, // Artemis / Polar
      { lat: -75, color: '#38bdf8', opacity: 0.38, key: 'lat-m75-artemis' },
      { lat: 80, color: '#a78bfa', opacity: 0.40, key: 'lat-80-basin' },   // South Polar Basin
      { lat: -80, color: '#a78bfa', opacity: 0.40, key: 'lat-m80-basin' },
      { lat: 85, color: '#c084fc', opacity: 0.32, key: 'lat-85' },
      { lat: -85, color: '#c084fc', opacity: 0.32, key: 'lat-m85' },
    ];

    latitudes.forEach(({ lat, color, opacity, key }) => {
      const pts = [];
      for (let i = 0; i <= segments; i++) {
        const lon = (i / segments) * 360 - 180;
        pts.push(latLonToVector3(lat, lon, R));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      lines.push({ key, geo, color, opacity });
    });

    // 2. Longitude Meridians
    const longitudes = [
      { lon: 0, color: '#38bdf8', opacity: 0.50, key: 'lon-0-prime' },     // Prime Meridian
      { lon: 45, color: '#94a3b8', opacity: 0.20, key: 'lon-45' },
      { lon: -45, color: '#94a3b8', opacity: 0.20, key: 'lon-m45' },
      { lon: 90, color: '#94a3b8', opacity: 0.25, key: 'lon-90-east' },   // East Limb
      { lon: -90, color: '#94a3b8', opacity: 0.25, key: 'lon-m90-west' }, // West Limb
      { lon: 135, color: '#94a3b8', opacity: 0.20, key: 'lon-135' },
      { lon: -135, color: '#94a3b8', opacity: 0.20, key: 'lon-m135' },
      { lon: 180, color: '#38bdf8', opacity: 0.35, key: 'lon-180-far' },   // 180° Meridian
    ];

    longitudes.forEach(({ lon, color, opacity, key }) => {
      const pts = [];
      const latSteps = 72;
      for (let i = 0; i <= latSteps; i++) {
        const lat = -90 + (i / latSteps) * 180;
        pts.push(latLonToVector3(lat, lon, R));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      lines.push({ key, geo, color, opacity });
    });

    // 3. Lunar Spin Axis (North & South Poles)
    const axisPts = [
      new THREE.Vector3(0, -MOON_RADIUS * 1.25, 0),
      new THREE.Vector3(0, MOON_RADIUS * 1.25, 0),
    ];
    const axisGeo = new THREE.BufferGeometry().setFromPoints(axisPts);
    lines.push({ key: 'axis', geo: axisGeo, color: '#38bdf8', opacity: 0.55 });

    return lines;
  }, [visible]);

  if (!visible || !graticuleLines) return null;

  return (
    <group>
      {graticuleLines.map((line) => (
        <line key={line.key} geometry={line.geo}>
          <lineBasicMaterial
            color={line.color}
            transparent
            opacity={line.opacity}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}

      {/* North Pole IAU Vector Cone */}
      <mesh position={[0, MOON_RADIUS * 1.25, 0]}>
        <coneGeometry args={[0.07, 0.24, 12]} />
        <meshBasicMaterial color="#38bdf8" />
      </mesh>

      {/* South Pole Vector Cone */}
      <mesh position={[0, -MOON_RADIUS * 1.25, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.07, 0.24, 12]} />
        <meshBasicMaterial color="#c084fc" />
      </mesh>
    </group>
  );
}

/**
 * Camera Director and Tracking Rig.
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
  const prevViewModeRef = useRef(viewMode);
  const prevLandedRef = useRef(hasLanded);

  useEffect(() => {
    const wasSurfaceOrLanded = prevViewModeRef.current === 'surface' || prevLandedRef.current;
    if (wasSurfaceOrLanded && viewMode === 'orbit' && !hasLanded && !isDescending) {
      if (orbitControlsRef.current) {
        gsap.to(orbitControlsRef.current.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => orbitControlsRef.current?.update(),
        });
      }
      gsap.to(camera.position, {
        x: 0,
        y: 8,
        z: 22,
        duration: 1.6,
        ease: 'power2.out',
      });
    }
    prevViewModeRef.current = viewMode;
    prevLandedRef.current = hasLanded;
  }, [viewMode, hasLanded, isDescending, camera, orbitControlsRef]);

  useFrame((_, delta) => {
    if (mode === 'macro') {
      camera.position.lerp(_macroTarget, delta * 2.0);
      camera.lookAt(0, 0, 0);
      return;
    }

    if (isComparing) {
      camera.position.lerp(_compareTarget, delta * 2.0);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.lerp(_originTarget, delta * 2.0);
      }
      return;
    }

    if (isDescending && spacecraftRef.current && orbitControlsRef.current) {
      const spPos = spacecraftRef.current.position;
      _tempVecA.copy(spPos).normalize();
      _tempVecB.copy(spPos).addScaledVector(_tempVecA, 3.8);
      _tempVecB.y += 1.2;
      camera.position.lerp(_tempVecB, delta * 3.0);
      orbitControlsRef.current.target.lerp(spPos, delta * 4.0);
      orbitControlsRef.current.update();
      return;
    }
  });

  return null;
}

/**
 * Complete Orbital Scene Graph.
 */
function UniverseScene({
  mode,
  selectedSite,
  onSelectSite,
  onPickCustomCoord,
  showLabels = true,
  showGraticule = true,
  showDsnBeam = true,
  sunEl,
  sunAz,
  earthEl,
  earthAz,
  onReachedOrbit,
  onLanderTouchdown,
  onUpdateCraterScreenPos,
  spacecraftRef,
  thrusterActive,
  isDescending,
  hasLanded,
  viewMode,
  isComparing = false,
  orbitControlsRef,
  onRegisterInvalidate,
  orbitAngleRef: propOrbitAngleRef,
  tierConfig,
}) {
  const { camera, invalidate } = useThree();
  const fallbackOrbitAngleRef = useRef(0);
  const orbitAngleRef = propOrbitAngleRef || fallbackOrbitAngleRef;
  const serviceModuleRef = useRef(null);
  const serviceOrbitAngleRef = useRef(0);
  const lastCraterPosRef = useRef(null);

  useEffect(() => {
    if (onRegisterInvalidate) onRegisterInvalidate(invalidate);
  }, [invalidate, onRegisterInvalidate]);

  // Target vector and normal
  const targetPos = useMemo(() => {
    const lat = selectedSite?.lat ?? -89.9;
    const lon = selectedSite?.lon ?? 0;
    return latLonToVector3(lat, lon, MOON_RADIUS);
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
      const nextAng = ang + 0.05;
      const nx = Math.cos(nextAng) * ORBIT_RADIUS;
      const ny = Math.sin(nextAng) * ORBIT_RADIUS * 0.96;
      const nz = Math.sin(nextAng) * ORBIT_RADIUS * 0.28;
      _tempTangent.set(nx - x, ny - y, nz - z).normalize();
      _tempQuat.setFromUnitVectors(_upVec, _tempTangent);
      spacecraftRef.current.quaternion.slerp(_tempQuat, 0.15);
    }

    // Orbit motion for the separated Service/Propulsion Module (stays in lunar parking orbit)
    if ((isDescending || hasLanded) && serviceModuleRef.current) {
      serviceOrbitAngleRef.current += delta * 0.22;
      const ang = serviceOrbitAngleRef.current;
      const x = Math.cos(ang) * ORBIT_RADIUS;
      const y = Math.sin(ang) * ORBIT_RADIUS * 0.96;
      const z = Math.sin(ang) * ORBIT_RADIUS * 0.28;
      serviceModuleRef.current.position.set(x, y, z);

      const nextAng = ang + 0.05;
      const nx = Math.cos(nextAng) * ORBIT_RADIUS;
      const ny = Math.sin(nextAng) * ORBIT_RADIUS * 0.96;
      const nz = Math.sin(nextAng) * ORBIT_RADIUS * 0.28;
      _tempTangent.set(nx - x, ny - y, nz - z).normalize();
      _tempQuat.setFromUnitVectors(_upVec, _tempTangent);
      serviceModuleRef.current.quaternion.slerp(_tempQuat, 0.15);
    }

    // Reticle screen position update: only notify App state if position shifts > 2px
    // to avoid re-rendering the root React component 60 times/sec.
    if (onUpdateCraterScreenPos && camera) {
      _tempProj.copy(targetPos).project(camera);
      _tempCamDiff.subVectors(camera.position, targetPos);
      const isBehind = targetNormal.dot(_tempCamDiff) < 0;
      if (isBehind || Math.abs(_tempProj.x) > 1.2 || Math.abs(_tempProj.y) > 1.2) {
        if (lastCraterPosRef.current !== null) {
          lastCraterPosRef.current = null;
          onUpdateCraterScreenPos(null);
        }
      } else {
        const x = (_tempProj.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-_tempProj.y * 0.5 + 0.5) * window.innerHeight;
        const last = lastCraterPosRef.current;
        if (!last || Math.abs(x - last.x) > 2.0 || Math.abs(y - last.y) > 2.0) {
          const rounded = { x: Math.round(x), y: Math.round(y) };
          lastCraterPosRef.current = rounded;
          onUpdateCraterScreenPos(rounded);
        }
      }
    }
  });

  // Earth Position Vector based on topocentric earthEl & earthAz
  const earthPos = useMemo(() => {
    return new THREE.Vector3(26, 8, -32);
  }, []);

  return (
    <>
      <OrbitControls
        ref={orbitControlsRef}
        enabled={mode !== 'macro'}
        enableDamping
        dampingFactor={0.06}
        minDistance={8}
        maxDistance={70}
        rotateSpeed={0.7}
      />

      <Stars radius={250} depth={80} count={tierConfig?.starCount || 1500} factor={4} saturation={0} fade speed={0.4} />

      <directionalLight
        position={[sunDir.x * 50, sunDir.y * 50, sunDir.z * 50]}
        intensity={2.8}
        castShadow
        shadow-mapSize-width={tierConfig?.shadowMapSize || 2048}
        shadow-mapSize-height={tierConfig?.shadowMapSize || 2048}
        shadow-camera-near={10}
        shadow-camera-far={80}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-bias={-0.0004}
      />

      {/* Balanced baseline ambient & hemisphere fill (Earthshine + cosmic background) */}
      <hemisphereLight args={['#e2e8f0', '#1e293b', 0.28]} />
      <ambientLight intensity={0.34} />

      {/* 3. Authentic NASA 2K Moon with Point-and-Click Custom Targeting */}
      <StructuredMoon onPickCoord={onPickCustomCoord} />

      {/* 3B. Cesium-Style Tactical Lunar Coordinate Graticule Grid */}
      <LunarGraticule visible={showGraticule} />

      {/* 4. On-Moon 3D Labels for Important Spots & Landmarks */}
      {showLabels && (
        <LunarSpotLabels
          landmarks={LUNAR_LANDMARKS}
          selectedSiteId={selectedSite?.id}
          onSelectSite={onSelectSite}
        />
      )}

      {/* 5. Target Landing Reticle at Active Destination */}
      <TargetLandingReticle position={targetPos} normal={targetNormal} />

      {/* 5B. Live Direct-to-Earth 3D Laser / DSN Telemetry Beam */}
      {showDsnBeam && (
        <DirectToEarthLaserBeam
          targetPos={targetPos}
          earthPos={earthPos}
          earthEl={earthEl}
        />
      )}

      {/* 6. Lunar Lander (Active Vehicle spiraling down to landing site or landed) */}
      <SpacecraftModel
        ref={spacecraftRef}
        thrusterActive={thrusterActive}
        isSeparated={isDescending || hasLanded}
        scale={0.42}
      />

      {/* 6B. Separated Orbital Service / Propulsion Module (Stays in Lunar Parking Orbit) */}
      {(isDescending || hasLanded) && (
        <group ref={serviceModuleRef}>
          <OrbitalServiceModule scale={0.42} />
        </group>
      )}

      {/* 7. Distant Earth Globe with NASA Blue Marble & Rayleigh Glow */}
      <DistantEarthGlobe position={earthPos} />

      {/* 8. Camera Rig & Controller */}
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
    onSelectCustomCoord,
    showLabels = true,
    showGraticule = true,
    showDsnBeam = true,
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
    quality = 'auto',
    setIsDescending,
    setHasLanded,
    setViewMode,
  },
  ref
) {
  const spacecraftRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const invalidateRef = useRef(null);
  const orbitAngleRef = useRef(0);
  const [thrusterActive, setThrusterActive] = useState(false);

  const [activeTier, setActiveTier] = useState(quality === 'auto' ? 'medium' : quality);
  useEffect(() => {
    if (quality !== 'auto') {
      setActiveTier(quality);
    }
  }, [quality]);
  const tierConfig = useMemo(() => getTierConfig(activeTier), [activeTier]);

  const selectedSite = useMemo(() => {
    if (customCoords) return customCoords;
    return (
      sites.find((s) => s.id === selectedSiteId) ||
      LUNAR_LANDMARKS.find((lm) => lm.id === selectedSiteId) ||
      sites[0] || {
        id: 'shackleton',
        name: 'Shackleton Crater Rim',
        lat: -89.9,
        lon: 0.0,
      }
    );
  }, [sites, selectedSiteId, customCoords]);

  // Cinematic Spherical Spiral Orbital Descent & Precision Surface Alignment
  const triggerCinematicDescent = (onComplete) => {
    if (!spacecraftRef.current) return;
    setIsDescending?.(true);

    const lat = selectedSite.lat;
    const lon = selectedSite.lon;
    const targetPos = latLonToVector3(lat, lon, MOON_RADIUS);
    const targetNormal = targetPos.clone().normalize();
    const touchdownPos = targetPos.clone().addScaledVector(targetNormal, 0.10);

    const startPos = spacecraftRef.current.position.clone();
    const startRadius = startPos.length();
    const targetRadius = touchdownPos.length();

    const startPhi = Math.asin(Math.max(-1, Math.min(1, startPos.y / startRadius)));
    const startTheta = Math.atan2(startPos.z, startPos.x);

    const targetPhi = Math.asin(Math.max(-1, Math.min(1, targetNormal.y)));
    const targetTheta = Math.atan2(targetNormal.z, targetNormal.x);

    let dTheta = targetTheta - startTheta;
    while (dTheta < 0) dTheta += Math.PI * 2;
    const totalSpiralTheta = dTheta + Math.PI * 2;

    const uprightQuat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      targetNormal
    );

    const getSpiralPoint = (t) => {
      const currentTheta = startTheta + totalSpiralTheta * t;
      const latT = t * t * (3 - 2 * t);
      const currentPhi = startPhi + (targetPhi - startPhi) * latT;

      const cosPhi = Math.cos(currentPhi);
      const sinPhi = Math.sin(currentPhi);
      const unit = new THREE.Vector3(
        cosPhi * Math.cos(currentTheta),
        sinPhi,
        cosPhi * Math.sin(currentTheta)
      );

      const altT = t < 0.75 
        ? Math.pow(t / 0.75, 1.4) * 0.75 
        : 0.75 + (1 - Math.pow(1 - (t - 0.75) / 0.25, 2)) * 0.25;
      const currentRadius = startRadius + (targetRadius - startRadius) * altT;

      return unit.multiplyScalar(currentRadius);
    };

    const animState = { t: 0 };
    gsap.to(animState, {
      t: 1.0,
      duration: 11.2,
      ease: 'power1.inOut',
      onStart: () => {
        setThrusterActive(false);
      },
      onUpdate: () => {
        if (!spacecraftRef.current) return;
        const t = animState.t;

        const pos = getSpiralPoint(t);
        spacecraftRef.current.position.copy(pos);

        if (t > 0.35 && t < 0.98) {
          setThrusterActive(true);
        }

        const eps = 0.005;
        const nextPos = getSpiralPoint(Math.min(1.0, t + eps));
        const prevPos = getSpiralPoint(Math.max(0.0, t - eps));
        const tangent = nextPos.clone().sub(prevPos).normalize();

        const flightQuat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          tangent
        );

        if (t > 0.75) {
          const blend = (t - 0.75) / 0.25;
          const blendSmooth = blend * blend * (3 - 2 * blend);
          spacecraftRef.current.quaternion.copy(flightQuat).slerp(uprightQuat, blendSmooth);
        } else {
          spacecraftRef.current.quaternion.slerp(flightQuat, 0.3);
        }

        if (invalidateRef.current) invalidateRef.current();
      },
      onComplete: () => {
        setThrusterActive(false);
        setIsDescending?.(false);
        setHasLanded?.(true);
        if (spacecraftRef.current) {
          spacecraftRef.current.position.copy(touchdownPos);
          spacecraftRef.current.quaternion.copy(uprightQuat);
        }
        // Smoothly tween camera to lander focus once, then keep OrbitControls completely unlocked
        if (orbitControlsRef.current) {
          const offset = targetNormal.clone().multiplyScalar(3.2).add(new THREE.Vector3(0.5, 0.8, 0.5));
          const finalCamPos = touchdownPos.clone().add(offset);
          gsap.to(orbitControlsRef.current.object.position, {
            x: finalCamPos.x,
            y: finalCamPos.y,
            z: finalCamPos.z,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => {
              orbitControlsRef.current?.update();
              if (invalidateRef.current) invalidateRef.current();
            },
          });
          gsap.to(orbitControlsRef.current.target, {
            x: touchdownPos.x,
            y: touchdownPos.y,
            z: touchdownPos.z,
            duration: 1.6,
            ease: 'power2.out',
          });
        }
        if (invalidateRef.current) invalidateRef.current();
        onLanderTouchdown?.();
        onComplete?.();
      },
    });
  };

  // High-Orbital Arc Ascent Trajectory
  const triggerCinematicAscent = (onComplete) => {
    if (!spacecraftRef.current) return;
    setIsDescending?.(false);

    const lat = selectedSite.lat;
    const lon = selectedSite.lon;
    const targetPos = latLonToVector3(lat, lon, MOON_RADIUS);
    const targetNormal = targetPos.clone().normalize();

    const start = spacecraftRef.current.position.clone();
    const orbitTarget = targetNormal.clone().multiplyScalar(ORBIT_RADIUS);
    let mid = new THREE.Vector3().addVectors(start, orbitTarget).multiplyScalar(0.5);
    mid.normalize().multiplyScalar(MOON_RADIUS * 1.45);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, orbitTarget);
    const animState = { t: 0 };
    setThrusterActive(true);

    gsap.to(animState, {
      t: 1.0,
      duration: 3.5,
      ease: 'power2.in',
      onStart: () => setThrusterActive(true),
      onUpdate: () => {
        if (!spacecraftRef.current) return;
        const currentT = animState.t;
        const pos = curve.getPoint(currentT);
        spacecraftRef.current.position.copy(pos);

        const tangent = curve.getTangent(currentT).normalize();
        const flightQuat = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          tangent
        );
        spacecraftRef.current.quaternion.slerp(flightQuat, 0.4);

        if (invalidateRef.current) invalidateRef.current();
      },
      onComplete: () => {
        setThrusterActive(false);
        setHasLanded?.(false);
        setIsDescending?.(false);
        if (invalidateRef.current) invalidateRef.current();
        onReachedOrbit?.();
        onComplete?.();
      },
    });
  };

  useImperativeHandle(ref, () => ({
    triggerCinematicDescent,
    triggerCinematicAscent,
    startMissionTransition: () => {
      if (orbitControlsRef.current) {
        gsap.to(orbitControlsRef.current.object.position, {
          x: 0,
          y: 8,
          z: 22,
          duration: 3.2,
          ease: 'power3.inOut',
          onUpdate: () => {
            orbitControlsRef.current?.update();
            if (invalidateRef.current) invalidateRef.current();
          },
          onComplete: () => {
            if (onReachedOrbit) onReachedOrbit();
          },
        });
      }
    },
    centerMoon: () => {
      if (orbitControlsRef.current) {
        gsap.to(orbitControlsRef.current.target, {
          x: 0,
          y: 0,
          z: 0,
          duration: 1.6,
          ease: 'power2.out',
          onUpdate: () => orbitControlsRef.current?.update(),
        });
        if (orbitControlsRef.current.object) {
          gsap.to(orbitControlsRef.current.object.position, {
            x: 0,
            y: 8,
            z: 22,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: () => {
              if (invalidateRef.current) invalidateRef.current();
            },
          });
        }
      }
    },
    resetToMacro: () => {
      setThrusterActive(false);
      setIsDescending?.(false);
      setHasLanded?.(false);
      setViewMode?.('orbit');
    },
    focusSite: (targetSite) => {
      let siteToFocus = null;
      if (typeof targetSite === 'object' && targetSite !== null) {
        siteToFocus = targetSite;
      } else if (typeof targetSite === 'string') {
        siteToFocus =
          sites.find((s) => s.id === targetSite) ||
          LUNAR_LANDMARKS.find((lm) => lm.id === targetSite);
      }
      if (!siteToFocus) siteToFocus = selectedSite;
      if (!siteToFocus || !Number.isFinite(Number(siteToFocus.lat)) || !Number.isFinite(Number(siteToFocus.lon))) return;
      if (!orbitControlsRef.current?.object) return;

      const targetVec = latLonToVector3(siteToFocus.lat, siteToFocus.lon, MOON_RADIUS);
      if (!Number.isFinite(targetVec.x) || !Number.isFinite(targetVec.y) || !Number.isFinite(targetVec.z)) return;

      const endDir = targetVec.clone().normalize();
      const endDist = 16.5;

      const cam = orbitControlsRef.current.object;
      const startCamPos = cam.position.clone();
      const startDist = Math.max(10, startCamPos.length());
      const startDir = startCamPos.clone().normalize();

      // Angular distance between current camera direction and target direction
      const dot = Math.max(-1, Math.min(1, startDir.dot(endDir)));
      const angleRad = Math.acos(dot);

      // Rotation axis along great-circle geodesic
      let axis = new THREE.Vector3().crossVectors(startDir, endDir);
      if (axis.lengthSq() < 0.0001) {
        axis = Math.abs(startDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        axis.cross(startDir).normalize();
      } else {
        axis.normalize();
      }

      if (isPrefersReducedMotion()) {
        cam.position.copy(endDir.multiplyScalar(endDist));
        orbitControlsRef.current?.target.set(0, 0, 0);
        orbitControlsRef.current?.update();
        if (invalidateRef.current) invalidateRef.current();
        return;
      }

      // Orbital survey apex boost (slight arc for farther moves)
      const arcAltitudeBoost = Math.max(2.5, Math.min(4.5, angleRad * 3.2));
      const flightDuration = Math.min(1.8, Math.max(1.2, angleRad * 0.85));

      gsap.killTweensOf(cam.position);
      gsap.killTweensOf(orbitControlsRef.current.target);

      const anim = { p: 0 };
      gsap.to(anim, {
        p: 1,
        duration: flightDuration,
        ease: 'power2.inOut',
        onUpdate: () => {
          const p = anim.p;
          // Exact great-circle geodesic direction
          const currentDir = startDir.clone().applyAxisAngle(axis, p * angleRad);

          // Geodetic ballistic altitude envelope: rises to high orbit, then descends into target
          const baseDist = startDist + (endDist - startDist) * p;
          const currentDist = baseDist + Math.sin(Math.PI * p) * arcAltitudeBoost;

          cam.position.copy(currentDir.multiplyScalar(currentDist));
          orbitControlsRef.current?.target.set(0, 0, 0);
          orbitControlsRef.current?.update();
          if (invalidateRef.current) invalidateRef.current();
        },
      });
    },
    focusSpacecraft: () => {
      if (!spacecraftRef.current || !orbitControlsRef.current?.object) return;
      const spPos = spacecraftRef.current.position.clone();
      const spNorm = spPos.clone().normalize();
      // Zoom close to spacecraft without clipping (distance ~3.2 units)
      const targetCamPos = spPos.clone().addScaledVector(spNorm, 3.2).add(new THREE.Vector3(0.5, 0.6, 0.5));

      gsap.killTweensOf(orbitControlsRef.current.object.position);
      gsap.killTweensOf(orbitControlsRef.current.target);

      gsap.to(orbitControlsRef.current.object.position, {
        x: targetCamPos.x,
        y: targetCamPos.y,
        z: targetCamPos.z,
        duration: 1.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          orbitControlsRef.current?.update();
          if (invalidateRef.current) invalidateRef.current();
        },
      });
      gsap.to(orbitControlsRef.current.target, {
        x: spPos.x,
        y: spPos.y,
        z: spPos.z,
        duration: 1.5,
        ease: 'power2.inOut',
      });
    },
  }));

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows
        onCreated={({ gl }) => {
          gl.shadowMap.enabled = true;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
        dpr={[1, tierConfig.dpr]}
        camera={{
          position: viewMode === 'surface' ? [3.4, 2.0, 5.4] : [0, 8, 22],
          fov: viewMode === 'surface' ? 48 : 42,
          near: 0.1,
          far: 2500,
        }}
        gl={{
          antialias: tierConfig.antialias,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.15,
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
            onSelectSite={onSelectSite}
            onPickCustomCoord={onSelectCustomCoord}
            showLabels={showLabels}
            showGraticule={showGraticule}
            showDsnBeam={showDsnBeam}
            sunEl={sunEl}
            sunAz={sunAz}
            earthEl={earthEl}
            earthAz={earthAz}
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
            orbitAngleRef={orbitAngleRef}
            tierConfig={tierConfig}
            onRegisterInvalidate={(inv) => {
              invalidateRef.current = inv;
            }}
          />
        )}
      </Canvas>
    </div>
  );
});

export default LunarUniverseR3F;
