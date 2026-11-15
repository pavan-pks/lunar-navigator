import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SpacecraftModel } from './LunarUniverseR3F.jsx';

/**
 * Deterministic surface elevation calculation for the South Pole local chunk.
 * Models crater rim ridge, slope descending into permanently shadowed crater bowl (PSR),
 * undulating ridges, and micro-craterlets.
 */
export function getSurfaceHeight(x, z) {
  const dist = Math.hypot(x, z);
  let h = 0;

  // Macro South Pole Crater Rim Profile:
  // z < -25: slopes down into deep crater bowl (PSR)
  // z > 25: slopes outward down the ejecta blanket
  // |z| <= 25: elevated crater rim ridge
  if (z < -25) {
    const t = Math.min(1, Math.abs(z + 25) / 380);
    h -= Math.pow(t, 1.8) * 44.0;
  } else if (z > 25) {
    const t = Math.min(1, (z - 25) / 450);
    h -= Math.pow(t, 1.4) * 16.0;
  } else {
    h += Math.cos((z / 25) * (Math.PI / 2)) * 3.8;
  }

  // Undulating rim ridges along X
  h += Math.sin(x * 0.012) * Math.cos(z * 0.008) * 4.5;
  h += Math.sin(x * 0.035 + z * 0.02) * 1.8;

  // Small impact craterlet 1
  const c1 = Math.hypot(x - 55, z - 70);
  if (c1 < 32) {
    h -= (1 - Math.pow(c1 / 32, 2)) * 6.5;
  }
  // Small impact craterlet 2
  const c2 = Math.hypot(x + 85, z - 40);
  if (c2 < 24) {
    h -= (1 - Math.pow(c2 / 24, 2)) * 4.8;
  }
  // Small impact craterlet 3
  const c3 = Math.hypot(x - 110, z + 95);
  if (c3 < 42) {
    h -= (1 - Math.pow(c3 / 42, 2)) * 8.5;
  }

  // Smooth landing pad zone (flattened 16m radius around [0, 0])
  if (dist < 16) {
    const factor = Math.min(1, dist / 16);
    h = h * factor * factor;
  }

  return h;
}

/**
 * Initializes astronaut camera positioning at eye-level (~2m above terrain).
 */
function SurfaceCameraSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(3.4, 2.0, 5.4);
    camera.lookAt(0, 1.3, 0);
  }, [camera]);
  return null;
}

/**
 * Organic Instanced Boulders Scatter.
 * Replaces generic primitives with 550+ organically deformed, multifaceted boulders.
 * Each boulder's Y-position is calculated against getSurfaceHeight(x, z) so it rests firmly
 * on the crater slopes, casting crisp grazing shadows.
 */
function InstancedBoulders({ count = 550 }) {
  const meshRef = useRef();

  // Deformed, irregular multifaceted lunar boulder geometry
  const boulderGeo = useMemo(() => {
    const geo = new THREE.DodecahedronGeometry(0.75, 1);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const n = Math.sin(v.x * 4.2) * Math.cos(v.y * 3.8) * Math.sin(v.z * 4.5);
      const flattenBottom = v.y < -0.1 ? 0.72 : 1.0;
      v.multiplyScalar(1.0 + n * 0.28);
      v.y *= flattenBottom;
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, []);

  const boulderMat = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#161616',
      roughness: 0.88,
      metalness: 0.05,
    });
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const dummy = new THREE.Object3D();
    const prng = (seed) => {
      let s = seed % 2147483647;
      if (s <= 0) s += 2147483646;
      return () => {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
      };
    };
    const rand = prng(104);

    let placed = 0;
    while (placed < count) {
      // Scatter within 480m radius around the lander
      const radius = 9 + Math.pow(rand(), 1.5) * 460;
      const angle = rand() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const y = getSurfaceHeight(x, z);

      // Varying scales: 75% small rocks (0.2m-0.6m), 20% medium (0.7m-1.4m), 5% large boulders (1.8m-3.2m)
      const roll = rand();
      let scale = 0.25 + rand() * 0.45;
      if (roll > 0.95) {
        scale = 1.8 + rand() * 1.4;
      } else if (roll > 0.75) {
        scale = 0.75 + rand() * 0.65;
      }

      const sx = scale * (0.8 + rand() * 0.4);
      const sy = scale * (0.6 + rand() * 0.5);
      const sz = scale * (0.8 + rand() * 0.4);

      dummy.position.set(x, y + sy * 0.45, z);
      dummy.rotation.set(
        (rand() - 0.5) * 0.4,
        rand() * Math.PI * 2,
        (rand() - 0.5) * 0.4
      );
      dummy.scale.set(sx, sy, sz);
      dummy.updateMatrix();

      meshRef.current.setMatrixAt(placed, dummy.matrix);
      placed++;
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [count]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[boulderGeo, boulderMat, count]}
      castShadow
      receiveShadow
    />
  );
}

/**
 * Localized Lunar Surface Simulation Chunk (Astronaut POV).
 * Centered at the landed spacecraft [0, 0, 0].
 * Features high-vertex 512x512 plane with macro displacement & micro normal mapping,
 * PCFSoftShadowMap with 4096x4096 resolution, 550+ instanced multifaceted boulders,
 * and dynamic grazing celestial ephemeris lighting.
 */
export function LocalSurfaceChunk({
  sunEl = 2.5,
  sunAz = 180,
  earthEl = 5.0,
  earthAz = 0.0,
  site = { id: 'shackleton', name: 'Shackleton Crater Rim' },
}) {
  const dirLightRef = useRef();
  const earthMeshRef = useRef();

  // Load NASA 2K bump map and Earth Blue Marble texture
  const [bumpTexture, earthTexture] = useTexture([
    '/textures/nasa_moon_bump_2k.jpg',
    '/textures/nasa_earth_bluemarble.jpg',
  ]);

  useMemo(() => {
    bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping;
    bumpTexture.repeat.set(6, 6);
  }, [bumpTexture]);

  // Seamless high-frequency procedural normal map for micro-detail (gravel/dust/chalky regolith)
  const normalTexture = useMemo(() => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    const heights = new Float32Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = y * size + x;
        const n1 = Math.sin(x * 0.12) * Math.cos(y * 0.12);
        const n2 = Math.sin(x * 0.35 + 1.2) * Math.sin(y * 0.35 + 2.1);
        const n3 = Math.sin(x * 0.8 + 0.5) * Math.cos(y * 0.8 + 1.8);
        const grit = (Math.sin(x * 3.14 * 10 + y * 7.2) + 1) * 0.5;
        heights[idx] = n1 * 0.5 + n2 * 0.3 + n3 * 0.15 + grit * 0.05;
      }
    }

    const strength = 1.9;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const xPrev = (x - 1 + size) % size;
        const xNext = (x + 1) % size;
        const yPrev = (y - 1 + size) % size;
        const yNext = (y + 1) % size;

        const dx = (heights[y * size + xNext] - heights[y * size + xPrev]) * strength;
        const dy = (heights[yNext * size + x] - heights[yPrev * size + x]) * strength;

        const len = Math.hypot(dx, dy, 1.0);
        const nx = -dx / len;
        const ny = -dy / len;
        const nz = 1.0 / len;

        const pIdx = (y * size + x) * 4;
        data[pIdx] = Math.floor((nx * 0.5 + 0.5) * 255);
        data[pIdx + 1] = Math.floor((ny * 0.5 + 0.5) * 255);
        data[pIdx + 2] = Math.floor((nz * 0.5 + 0.5) * 255);
        data[pIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(50, 50);
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Dense high-vertex 512x512 plane geometry
  const terrainGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2000, 2000, 512, 512);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // In plane geometry rotated -Math.PI / 2, plane Y maps to -world Z
      const zDisp = getSurfaceHeight(x, -y);
      pos.setZ(i, zDisp);
    }

    geo.computeVertexNormals();
    return geo;
  }, []);

  // Celestial Mechanics: Sun Position in local horizontal coordinates
  const sunDistance = 750;
  const sunElClamped = Math.max(-5, Math.min(45, sunEl));
  const elRad = (sunElClamped * Math.PI) / 180;
  const azRad = (sunAz * Math.PI) / 180;

  const sunX = sunDistance * Math.cos(elRad) * Math.sin(azRad);
  const sunY = sunDistance * Math.sin(elRad);
  const sunZ = sunDistance * Math.cos(elRad) * Math.cos(azRad);
  const sunPos = useMemo(() => new THREE.Vector3(sunX, sunY, sunZ), [sunX, sunY, sunZ]);

  // Celestial Mechanics: Earth Position in local sky
  const earthDistance = 650;
  const eElRad = (Math.max(0.5, earthEl) * Math.PI) / 180;
  const eAzRad = (earthAz * Math.PI) / 180;

  const earthX = earthDistance * Math.cos(eElRad) * Math.sin(eAzRad);
  const earthY = earthDistance * Math.sin(eElRad);
  const earthZ = earthDistance * Math.cos(eElRad) * Math.cos(eAzRad);
  const earthPos = useMemo(() => new THREE.Vector3(earthX, earthY, earthZ), [earthX, earthY, earthZ]);

  // Subtle Earth axial rotation animation
  useFrame((_, delta) => {
    if (earthMeshRef.current) {
      earthMeshRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <>
      {/* 0. Astronaut Camera Positioning (y: 2.0, eye-level) */}
      <SurfaceCameraSetup />

      {/* 1. Deep Space Starfield (Pitch-black #000000 void, no atmosphere/fog) */}
      <Stars radius={900} depth={150} count={5000} factor={4} fade />

      {/* 2. Grazing Polar Sunlight with Razor-Sharp Shadows (4096x4096) */}
      <directionalLight
        ref={dirLightRef}
        position={sunPos}
        intensity={sunEl > 0 ? 3.6 : 0.04}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={10}
        shadow-camera-far={1200}
        shadow-camera-left={-35}
        shadow-camera-right={35}
        shadow-camera-top={35}
        shadow-camera-bottom={-35}
        shadow-bias={-0.0001}
        shadow-normalBias={0.03}
      />

      {/* Atmospheric Realism: Subtle starlight bounce inside PSR craters (0.05 intensity) */}
      <ambientLight intensity={0.05} />

      {/* 3. High-Fidelity Regolith Surface Mesh (Displacement & Micro Normals) */}
      <mesh
        geometry={terrainGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#0e0e0e"
          roughness={0.9}
          metalness={0.0}
          displacementMap={bumpTexture}
          displacementScale={16.0}
          normalMap={normalTexture}
          normalScale={new THREE.Vector2(0.85, 0.85)}
        />
      </mesh>

      {/* 4. Organic Instanced Debris (550+ multifaceted boulders on slopes) */}
      <InstancedBoulders count={550} />

      {/* 5. The Landed Spacecraft (Centered at [0, 0, 0]) */}
      <group position={[0, 0.10, 0]}>
        <SpacecraftModel thrusterActive={false} isSeparated={true} scale={0.42} />
      </group>

      {/* 6. The Sun (Glowing Celestial Sphere in Sky) */}
      <mesh position={sunPos}>
        <sphereGeometry args={[18, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 7. The Earth (High in the Sky with Real-Time Ephemeris) */}
      <group position={earthPos}>
        <mesh ref={earthMeshRef} rotation={[0.4, 0, 0]}>
          <sphereGeometry args={[15, 32, 32]} />
          <meshStandardMaterial
            map={earthTexture}
            roughness={0.65}
            metalness={0.05}
          />
        </mesh>
      </group>

      {/* 8. Astronaut POV First-Person Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        target={[0, 1.3, 0]}
        minDistance={2.2}
        maxDistance={24.0}
        minPolarAngle={Math.PI / 3.8} // ~47° (look up at Earth and Sun)
        maxPolarAngle={Math.PI / 2.03} // ~88.5° (strictly cannot look under ground plane)
        rotateSpeed={0.65}
      />
    </>
  );
}

export default LocalSurfaceChunk;
