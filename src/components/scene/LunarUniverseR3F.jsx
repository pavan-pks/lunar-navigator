import React, { useRef, useMemo, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
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
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
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

/**
 * Cache for 3D billboard sprite textures to avoid garbage collection spikes.
 */
const spriteTextureCache = new Map();

function getSpotSpriteTexture(spot, isSelected) {
  const key = `${spot.id}_${isSelected ? 'active' : 'idle'}`;
  if (spriteTextureCache.has(key)) return spriteTextureCache.get(key);

  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');

  const bgAlpha = isSelected ? 0.95 : 0.78;
  const borderColor = isSelected ? '#38bdf8' : 'rgba(255, 255, 255, 0.35)';
  const borderWidth = isSelected ? 3.5 : 1.5;

  ctx.fillStyle = `rgba(10, 12, 18, ${bgAlpha})`;
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;

  // Draw pill
  const x = 6, y = 6, w = 372, h = 84, r = 24;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Category Accent Dot
  const dotColor =
    spot.category === 'artemis' ? '#38bdf8' :
    spot.category === 'historic' ? '#fbbf24' :
    spot.category === 'pole' ? '#c084fc' : '#94a3b8';
  ctx.fillStyle = dotColor;
  ctx.beginPath();
  ctx.arc(36, 48, 10, 0, Math.PI * 2);
  ctx.fill();

  // Text Title
  ctx.fillStyle = isSelected ? '#ffffff' : '#f8fafc';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(spot.shortName || spot.name, 58, 44);

  // Subtitle / Coordinates
  ctx.fillStyle = isSelected ? '#93c5fd' : '#94a3b8';
  ctx.font = '500 20px monospace';
  const latStr = `${Math.abs(spot.lat).toFixed(1)}°${spot.lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(spot.lon).toFixed(1)}°${spot.lon >= 0 ? 'E' : 'W'}`;
  ctx.fillText(`${latStr}, ${lonStr}`, 58, 72);

  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  spriteTextureCache.set(key, tex);
  return tex;
}

/**
 * Structured Moon Mesh with authentic NASA Clementine/LOLA 2K maps.
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
function LunarSpotLabelItem({ landmark, isSelected, onSelectSite }) {
  const { camera } = useThree();
  const spriteRef = useRef(null);
  const stemRef = useRef(null);
  const dotRef = useRef(null);

  const { pos, normal, pinTop, texture } = useMemo(() => {
    const p = latLonToVector3(landmark.lat, landmark.lon, MOON_RADIUS);
    const n = p.clone().normalize();
    const top = p.clone().addScaledVector(n, 0.42);
    const tex = getSpotSpriteTexture(landmark, isSelected);
    return { pos: p, normal: n, pinTop: top, texture: tex };
  }, [landmark, isSelected]);

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

  // Occlude spots that rotate beyond the visible lunar horizon
  useFrame(() => {
    if (!spriteRef.current) return;
    const camDir = camera.position.clone().sub(pos).normalize();
    const dot = normal.dot(camDir);

    if (dot < 0.05) {
      spriteRef.current.visible = false;
      if (stemRef.current) stemRef.current.visible = false;
      if (dotRef.current) dotRef.current.visible = false;
    } else {
      spriteRef.current.visible = true;
      if (stemRef.current) stemRef.current.visible = true;
      if (dotRef.current) dotRef.current.visible = true;

      const alpha = THREE.MathUtils.clamp((dot - 0.05) / 0.15, 0, 1);
      spriteRef.current.material.opacity = alpha * (isSelected ? 1.0 : 0.88);
      if (stemRef.current) stemRef.current.material.opacity = alpha * 0.45;
      if (dotRef.current) dotRef.current.material.opacity = alpha;
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
        scale={[1.5, 0.38, 1]}
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
 */
function LunarSpotLabels({ landmarks, selectedSiteId, onSelectSite }) {
  return (
    <group>
      {landmarks.map((lm) => (
        <LunarSpotLabelItem
          key={lm.id}
          landmark={lm}
          isSelected={selectedSiteId === lm.id}
          onSelectSite={onSelectSite}
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
 * Sleek Minimalist Geometric Spacecraft.
 */
export const SpacecraftModel = forwardRef(({ thrusterActive = false }, ref) => {
  return (
    <group ref={ref}>
      {/* 1. Command Module / Crew Cabin */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.30, 0.38, 16]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.60, 0]} castShadow>
        <coneGeometry args={[0.22, 0.20, 16]} />
        <meshStandardMaterial color="#e5e5e5" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* 2. Service Module */}
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
            <mesh position={[cos * 0.35, -0.16, sin * 0.35]} rotation={[sin * 0.45, 0, -cos * 0.45]} castShadow>
              <cylinderGeometry args={[0.018, 0.018, 0.38, 8]} />
              <meshStandardMaterial color="#d4af37" roughness={0.4} metalness={0.8} />
            </mesh>
            <mesh position={[cos * 0.48, -0.28, sin * 0.48]}>
              <cylinderGeometry args={[0.07, 0.07, 0.02, 12]} />
              <meshStandardMaterial color="#e5e5e5" roughness={0.3} metalness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* 6. Four Solar Array Wings */}
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

      {/* 7. Active Braking Thruster Exhaust */}
      <ThrusterParticles active={thrusterActive} />
    </group>
  );
});

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
      camera.position.lerp(new THREE.Vector3(0, 10, 24), delta * 2.0);
      camera.lookAt(0, 0, 0);
      return;
    }

    if (isComparing) {
      camera.position.lerp(new THREE.Vector3(0, 10, 30), delta * 2.0);
      if (orbitControlsRef.current) {
        orbitControlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), delta * 2.0);
      }
      return;
    }

    if (isDescending && spacecraftRef.current && orbitControlsRef.current) {
      const spPos = spacecraftRef.current.position;
      const spNorm = spPos.clone().normalize();
      const desiredPos = spPos.clone().addScaledVector(spNorm, 4.2).add(new THREE.Vector3(0, 1.4, 0));
      camera.position.lerp(desiredPos, delta * 3.5);
      orbitControlsRef.current.target.lerp(spPos, delta * 4.5);
      orbitControlsRef.current.update();
      return;
    }

    if (hasLanded && spacecraftRef.current && orbitControlsRef.current) {
      const spPos = spacecraftRef.current.position;
      if (viewMode === 'orbit') {
        const offset = targetNormal.clone().multiplyScalar(3.2).add(new THREE.Vector3(0.5, 0.8, 0.5));
        const desiredPos = spPos.clone().add(offset);
        camera.position.lerp(desiredPos, delta * 3.0);
        orbitControlsRef.current.target.lerp(spPos, delta * 3.0);
        orbitControlsRef.current.update();
      }
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
}) {
  const { camera, invalidate } = useThree();
  const fallbackOrbitAngleRef = useRef(0);
  const orbitAngleRef = propOrbitAngleRef || fallbackOrbitAngleRef;

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
      const tangent = new THREE.Vector3(nx - x, ny - y, nz - z).normalize();
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      spacecraftRef.current.quaternion.slerp(targetQuat, 0.15);
    }

    if (onUpdateCraterScreenPos && camera) {
      const v = targetPos.clone().project(camera);
      const isBehind = targetNormal.dot(camera.position.clone().sub(targetPos)) < 0;
      if (isBehind || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) {
        onUpdateCraterScreenPos(null);
      } else {
        const x = (v.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-v.y * 0.5 + 0.5) * window.innerHeight;
        onUpdateCraterScreenPos({ x, y });
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

      <Stars radius={250} depth={80} count={3500} factor={4} saturation={0} fade speed={0.4} />

      <directionalLight
        position={[sunDir.x * 50, sunDir.y * 50, sunDir.z * 50]}
        intensity={2.8}
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

      <hemisphereLight args={['#e2e8f0', '#0a0a0a', 0.20]} />
      <ambientLight intensity={0.16} />

      {/* 3. Authentic NASA 2K Moon with Point-and-Click Custom Targeting */}
      <StructuredMoon onPickCoord={onPickCustomCoord} />

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

      {/* 6. Spacecraft Model */}
      <SpacecraftModel ref={spacecraftRef} thrusterActive={thrusterActive} />

      {/* 7. Distant Earth Marker */}
      <mesh position={earthPos}>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial color="#e2e8f0" />
      </mesh>

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
  const invalidateRef = useRef(null);
  const orbitAngleRef = useRef(0);
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

  // Cinematic Spherical Spiral Orbital Descent & Precision Surface Alignment
  const triggerCinematicDescent = (onComplete) => {
    if (!spacecraftRef.current) return;
    setIsDescending?.(true);

    const lat = selectedSite.lat;
    const lon = selectedSite.lon;
    const targetPos = latLonToVector3(lat, lon, MOON_RADIUS);
    const targetNormal = targetPos.clone().normalize();
    const touchdownPos = targetPos.clone().addScaledVector(targetNormal, 0.28);

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
      duration: 6.8,
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
      const siteToFocus = targetSite || selectedSite;
      if (!siteToFocus || !orbitControlsRef.current) return;
      const targetVec = latLonToVector3(siteToFocus.lat, siteToFocus.lon, MOON_RADIUS);
      const norm = targetVec.clone().normalize();
      const targetCamPos = norm.clone().multiplyScalar(16.5);

      gsap.to(orbitControlsRef.current.object.position, {
        x: targetCamPos.x,
        y: targetCamPos.y,
        z: targetCamPos.z,
        duration: 1.4,
        ease: 'power2.inOut',
        onUpdate: () => {
          orbitControlsRef.current?.update();
          if (invalidateRef.current) invalidateRef.current();
        },
      });
      gsap.to(orbitControlsRef.current.target, {
        x: 0,
        y: 0,
        z: 0,
        duration: 1.4,
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
            onSelectSite={onSelectSite}
            onPickCustomCoord={onSelectCustomCoord}
            showLabels={showLabels}
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
