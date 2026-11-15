import React, { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

/**
 * LRO Surface Terrain Mesh.
 * Loads color + displacement textures from /textures/surface_<id>_{color|disp}.jpg.
 * Falls back to NASA LROC 1k color and bump maps if the specific textures 404.
 * Sun & Earth positions drive the directional light angle.
 */
function LroTerrain({ targetId, sunEl, sunAz }) {
  const colorUrl = `/textures/surface_${targetId}_color.jpg`;
  const dispUrl = `/textures/surface_${targetId}_disp.jpg`;
  const fallbackColor = '/textures/nasa_moon_lroc_1k.jpg';
  const fallbackDisp = '/textures/nasa_moon_bump_2k.jpg';

  // Try specific, fall back to defaults via error boundary in parent
  const [colorMap, dispMap] = useTexture(
    [colorUrl, dispUrl],
    (textures) => {
      textures.forEach(t => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(1, 1);
        t.needsUpdate = true;
      });
    }
  );

  // Sun position → directional light vector
  const sunAzRad = ((sunAz ?? 180) * Math.PI) / 180;
  const sunElRad = ((sunEl ?? 5) * Math.PI) / 180;
  const lightX = Math.cos(sunElRad) * Math.sin(sunAzRad);
  const lightY = Math.sin(sunElRad);
  const lightZ = Math.cos(sunElRad) * Math.cos(sunAzRad);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
      <planeGeometry args={[20, 20, 256, 256]} />
      <meshStandardMaterial
        map={colorMap}
        displacementMap={dispMap}
        displacementScale={1.2}
        roughness={0.92}
        metalness={0.02}
      />
      {/* Grazing-angle directional light mimicking polar sun */}
      <directionalLight
        position={[lightX * 20, lightY * 20, lightZ * 20]}
        intensity={sunEl > 0 ? 2.5 : 0.1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
    </mesh>
  );
}

/**
 * Fallback terrain using globally available NASA textures.
 */
function FallbackTerrain({ sunEl, sunAz }) {
  const [colorMap, dispMap] = useTexture([
    '/textures/nasa_moon_lroc_1k.jpg',
    '/textures/nasa_moon_bump_2k.jpg',
  ]);

  const sunAzRad = ((sunAz ?? 180) * Math.PI) / 180;
  const sunElRad = ((sunEl ?? 5) * Math.PI) / 180;
  const lightX = Math.cos(sunElRad) * Math.sin(sunAzRad);
  const lightY = Math.sin(sunElRad);
  const lightZ = Math.cos(sunElRad) * Math.cos(sunAzRad);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[20, 20, 128, 128]} />
      <meshStandardMaterial
        map={colorMap}
        displacementMap={dispMap}
        displacementScale={0.8}
        roughness={0.95}
        metalness={0.01}
      />
      <directionalLight
        position={[lightX * 20, lightY * 20, lightZ * 20]}
        intensity={sunEl > 0 ? 2.2 : 0.1}
        castShadow
      />
    </mesh>
  );
}

/**
 * Error boundary that swaps to fallback terrain on texture load failure.
 */
class TerrainErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return <FallbackTerrain sunEl={this.props.sunEl} sunAz={this.props.sunAz} />;
    }
    return this.props.children;
  }
}

/**
 * Lander marker — a slim white vertical rod.
 */
function LanderMarker() {
  return (
    <group position={[0, 0.05, 0]}>
      <mesh>
        <cylinderGeometry args={[0.015, 0.025, 0.4, 8]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} metalness={0.6} />
      </mesh>
      {/* Blinking beacon at top */}
      <mesh position={[0, 0.22, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

/**
 * Animated slow camera drift to give cinematic feel in surface view.
 */
function CameraOrbit({ enabled }) {
  const { camera } = useThree();
  const t = useRef(0);
  useFrame((_, delta) => {
    if (!enabled) return;
    t.current += delta * 0.03;
    camera.position.x = Math.sin(t.current) * 0.4;
    camera.position.z = 10 + Math.cos(t.current) * 0.2;
    camera.lookAt(0, 0, 0);
  });
  return null;
}

/**
 * Main exported LRO Surface View component.
 * Drop-in replacement for ScenePanel in surface viewMode.
 */
export function LroSurfaceView({ targetId = 'shackleton', sunEl = 5, sunAz = 180, label = 'Surface Station' }) {
  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows
        camera={{ position: [0, 6, 10], fov: 42, near: 0.1, far: 500 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85 }}
      >
        {/* Space backdrop */}
        <Stars radius={200} depth={60} count={3000} factor={3} fade />

        {/* Ambient fill — very dim to keep it moody */}
        <ambientLight intensity={0.06} />

        {/* Terrain */}
        <Suspense fallback={null}>
          <TerrainErrorBoundary sunEl={sunEl} sunAz={sunAz} targetId={targetId}>
            <LroTerrain targetId={targetId} sunEl={sunEl} sunAz={sunAz} />
          </TerrainErrorBoundary>
        </Suspense>

        {/* Lander */}
        <LanderMarker />

        {/* Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          minDistance={2}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2.1}
        />

        {/* Subtle auto-drift when user isn't interacting */}
        <CameraOrbit enabled={false} />
      </Canvas>

      {/* Surface HUD overlay — site label bottom-left */}
      <div className="absolute bottom-6 left-8 pointer-events-none">
        <span className="text-[9px] font-sans font-light tracking-[0.3em] text-[#a3a3a3] uppercase block">
          Surface Station EVA
        </span>
        <span className="text-sm font-sans font-light text-[#f5f5f5]">{label}</span>
        <div className="mt-1 text-[10px] font-mono text-[#a3a3a3]">
          Sun: {sunEl > 0 ? `+${sunEl.toFixed(1)}°` : `${sunEl.toFixed(1)}°`} elevation ·{' '}
          {sunEl > 0 ? 'Illuminated' : 'Night'}
        </div>
      </div>
    </div>
  );
}

export default LroSurfaceView;
