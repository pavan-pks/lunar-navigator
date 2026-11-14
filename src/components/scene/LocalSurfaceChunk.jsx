import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { SpacecraftModel } from './LunarUniverseR3F.jsx';

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
 * Localized Lunar Surface Simulation Chunk (Astronaut POV).
 * Centered at the landed spacecraft [0, 0, 0].
 * Features a high-resolution 256x256 displaced plane simulating South Pole regolith,
 * grazing directional sunlight with razor-sharp 4096x4096 shadows,
 * Earth in the sky with real-time ephemeris libration, and an astronaut eye-level camera.
 */
export function LocalSurfaceChunk({
  sunEl = 2.5,
  sunAz = 180,
  earthEl = 5.0,
  earthAz = 0.0,
  site = { id: 'shackleton', name: 'Shackleton Crater Rim' },
}) {
  const { camera } = useThree();
  const dirLightRef = useRef();
  const earthMeshRef = useRef();

  // High-res Lunar Regolith and Earth Textures
  const [bumpTexture, earthTexture] = useTexture([
    '/textures/nasa_moon_bump_2k.jpg',
    '/textures/nasa_earth_bluemarble.jpg',
  ]);

  useMemo(() => {
    bumpTexture.wrapS = bumpTexture.wrapT = THREE.RepeatWrapping;
    bumpTexture.repeat.set(8, 8);
  }, [bumpTexture]);

  // Sculpt local terrain geometry: crater rim slope, ridge, and small craterlets
  const terrainGeometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(2400, 2400, 256, 256);
    const pos = geo.attributes.position;
    const v = new THREE.Vector2();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i); // In unrotated plane, y is the other horizontal axis (becomes -Z)
      v.set(x, y);
      const dist = v.length();

      let zDisp = 0; // Displacement along normal (becomes Y in world space)

      // 1. Crater Rim Macro Profile:
      // Landing ridge at center (y ≈ 0), sharp rim slope falling into crater bowl towards -Y
      if (y < -30) {
        // Falling into the permanent shadow crater bowl
        const falloff = Math.min(1, Math.abs(y + 30) / 400);
        zDisp -= Math.pow(falloff, 1.8) * 42.0;
      } else if (y > 30) {
        // Gentle outer rim ejecta slope
        const outerFalloff = Math.min(1, (y - 30) / 500);
        zDisp -= Math.pow(outerFalloff, 1.4) * 18.0;
      } else {
        // Crest of the rim ridge: slightly elevated ridge peak
        zDisp += Math.cos((y / 30) * (Math.PI / 2)) * 3.5;
      }

      // 2. Landing Pad Flattening Zone (smooth landing radius around [0, 0])
      if (dist < 18) {
        const flattenFactor = dist / 18;
        zDisp = zDisp * flattenFactor;
      }

      // 3. Realistic small craterlets scattered on the terrain
      const c1Dist = Math.hypot(x - 65, y - 80);
      if (c1Dist < 35) {
        zDisp -= (1 - Math.pow(c1Dist / 35, 2)) * 6.0;
      }
      const c2Dist = Math.hypot(x + 90, y - 45);
      if (c2Dist < 25) {
        zDisp -= (1 - Math.pow(c2Dist / 25, 2)) * 4.5;
      }
      const c3Dist = Math.hypot(x - 120, y + 110);
      if (c3Dist < 45) {
        zDisp -= (1 - Math.pow(c3Dist / 45, 2)) * 8.0;
      }

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
      {/* 0. Astronaut Camera Positioning (y: 2, eye-level) */}
      <SurfaceCameraSetup />

      {/* 1. Deep Space Starfield */}
      <Stars radius={900} depth={150} count={5000} factor={4} fade />

      {/* 2. Grazing Polar Sunlight with Razor-Sharp Shadows (4096x4096) */}
      <directionalLight
        ref={dirLightRef}
        position={sunPos}
        intensity={sunEl > 0 ? 3.4 : 0.08}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={50}
        shadow-camera-far={1200}
        shadow-camera-left={-28}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-camera-bottom={-28}
        shadow-bias={-0.0003}
      />

      {/* Ambient Starlight & Surface Bounce Light */}
      <hemisphereLight args={['#d4d4d4', '#050505', 0.22]} />
      <ambientLight intensity={0.16} />

      {/* 3. High-Resolution Regolith Surface Chunk (Local Plane) */}
      <mesh
        geometry={terrainGeometry}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        receiveShadow
      >
        <meshStandardMaterial
          color="#0c0c0c"
          bumpMap={bumpTexture}
          bumpScale={0.7}
          roughness={0.96}
          metalness={0.0}
        />
      </mesh>

      {/* 4. The Landed Spacecraft (Firmly centered at [0, 0, 0]) */}
      <group position={[0, 0.28, 0]}>
        <SpacecraftModel thrusterActive={false} />
      </group>

      {/* 5. The Sun (Glowing Celestial Sphere in Sky) */}
      <mesh position={sunPos}>
        <sphereGeometry args={[18, 32, 32]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* 6. The Earth (High in the Sky with Dynamic Elevation/Azimuth) */}
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

      {/* 7. Astronaut POV First-Person Camera Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        target={[0, 1.3, 0]}
        minDistance={2.2}
        maxDistance={22.0}
        minPolarAngle={Math.PI / 3.8} // ~47° (can look up at Earth and grazing Sun)
        maxPolarAngle={Math.PI / 2.03} // ~88.5° (strictly cannot look under ground plane)
        rotateSpeed={0.65}
      />
    </>
  );
}

export default LocalSurfaceChunk;
