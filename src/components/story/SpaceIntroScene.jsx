import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * src/components/story/SpaceIntroScene.jsx
 * Accurate 3D Solar System rendering with official NASA textures:
 * - NASA SDO/STEREO 304Å Carrington extreme-UV Sun
 * - NASA SVS Blue Marble 2048 Earth
 * - NASA SVS LROC CGI Moon Kit Lunar Sphere
 */
export function SpaceIntroScene({
  onReachedMoon,
  isZooming,
  onStartZoom,
  onSkipIntro,
  sites = [],
  selectedSiteId = 'shackleton',
  onSelectSite
}) {
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);
  const sceneElementsRef = useRef(null);
  const [zoomPercent, setZoomPercent] = React.useState(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Perspective Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(0, 140, 360);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 2. High-Density Starfield
    const starCount = 4500;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 900 + Math.random() * 900;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const val = 0.8 + Math.random() * 0.2;
      starColors[i * 3] = val;
      starColors[i * 3 + 1] = val;
      starColors[i * 3 + 2] = val + Math.random() * 0.08;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.3, vertexColors: true, transparent: true, opacity: 0.85 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 3. Official NASA Textures
    const textureLoader = new THREE.TextureLoader();
    const sunTex = textureLoader.load('/textures/nasa_sun.jpg');
    sunTex.colorSpace = THREE.SRGBColorSpace;

    const earthTex = textureLoader.load('/textures/nasa_earth_bluemarble.jpg');
    earthTex.colorSpace = THREE.SRGBColorSpace;

    const moonTex = textureLoader.load('/textures/nasa_moon_lroc_1k.jpg');
    moonTex.colorSpace = THREE.SRGBColorSpace;

    // 4. Accurate Sun Sphere with NASA SDO Texture
    const sunPos = new THREE.Vector3(-360, 45, -220);
    const sunGeo = new THREE.SphereGeometry(32, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({
      map: sunTex,
      color: 0xfff5d6
    });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.copy(sunPos);
    scene.add(sunMesh);

    // Solar point light & ambient illumination
    const sunLight = new THREE.PointLight(0xffffff, 3.0, 3000, 0.4);
    sunLight.position.copy(sunPos);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x222838, 0.65);
    scene.add(ambientLight);

    // 5. Accurate Earth Sphere with NASA Blue Marble Texture
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-30, 0, 40);
    scene.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(16, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.75,
      metalness: 0.08
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = (23.44 * Math.PI) / 180; // Earth axial tilt
    earthGroup.add(earthMesh);

    // Atmospheric limb
    const atmoGeo = new THREE.SphereGeometry(17.1, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide
    });
    earthGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

    // 6. Accurate Moon Sphere with NASA SVS LROC CGI Moon Kit Texture
    const moonGroup = new THREE.Group();
    moonGroup.position.set(48, 8, 15);
    scene.add(moonGroup);

    const moonGeo = new THREE.SphereGeometry(10, 64, 64);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.98,
      metalness: 0.02
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.rotation.y = Math.PI * 0.35;
    moonGroup.add(moonMesh);

    // South pole targeting reticle
    const markerGeo = new THREE.RingGeometry(0.7, 1.1, 32);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const poleMarker = new THREE.Mesh(markerGeo, markerMat);
    poleMarker.position.set(0, -10.05, 0);
    poleMarker.rotation.x = Math.PI / 2;
    moonGroup.add(poleMarker);

    // Lunar Orbit Track
    const orbitPts = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * 85, 0, Math.sin(a) * 85));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.22 });
    earthGroup.add(new THREE.Line(orbitGeo, orbitMat));

    // Store state in ref
    sceneElementsRef.current = {
      scene,
      camera,
      renderer,
      earthMesh,
      moonMesh,
      moonGroup,
      sunMesh,
      poleMarker,
      zoomProgress: 0,
      phase: 'space' // 'space' | 'zooming' | 'moon'
    };

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Rotations
      earthMesh.rotation.y += delta * 0.12;
      moonMesh.rotation.y += delta * 0.06;
      sunMesh.rotation.y += delta * 0.02;

      // Pulse pole marker
      const s = 1.0 + Math.sin(elapsed * 4) * 0.2;
      poleMarker.scale.set(s, s, s);

      const el = sceneElementsRef.current;
      if (!el) return;

      if (el.phase === 'zooming') {
        el.zoomProgress = Math.min(1.0, el.zoomProgress + delta * 0.4);
        const t = el.zoomProgress;
        setZoomPercent(Math.floor(t * 100));

        // Smooth cubic ease out
        const ease = 1 - Math.pow(1 - t, 3);

        // Zoom from solar system overview to close Moon South Pole
        const startPos = new THREE.Vector3(0, 140, 360);
        const targetPos = new THREE.Vector3(48, -4, 28);
        camera.position.lerpVectors(startPos, targetPos, ease);

        const lookStart = new THREE.Vector3(0, 0, 0);
        const lookTarget = new THREE.Vector3(48, 6, 15);
        const currentLook = new THREE.Vector3().lerpVectors(lookStart, lookTarget, ease);
        camera.lookAt(currentLook);

        if (t >= 1.0) {
          el.phase = 'moon';
          if (onReachedMoon) onReachedMoon();
        }
      } else if (el.phase === 'moon') {
        // Slow orbital drift
        camera.position.x = 48 + Math.sin(elapsed * 0.2) * 1.5;
        camera.position.y = -4 + Math.cos(elapsed * 0.15) * 0.8;
        camera.lookAt(48, 6, 15);
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      starGeo.dispose();
      starMat.dispose();
      sunGeo.dispose();
      sunMat.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      moonGeo.dispose();
      moonMat.dispose();
    };
  }, []);

  // Trigger camera zoom when isZooming prop changes to true
  useEffect(() => {
    if (isZooming && sceneElementsRef.current && sceneElementsRef.current.phase === 'space') {
      sceneElementsRef.current.phase = 'zooming';
      sceneElementsRef.current.zoomProgress = 0;
    }
  }, [isZooming]);

  const activeSite = sites.find(s => s.id === selectedSiteId) || sites[0] || { name: 'Shackleton Crater Rim', lat: -89.9, lon: 129.8 };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Pre-Zoom Start Overlay */}
      {!isZooming && (
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center p-6 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none">
          <div className="max-w-2xl w-full bg-[#070b14]/85 backdrop-blur-xl border border-sky-500/25 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] pointer-events-auto">
            {/* Header Badge */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-semibold px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30">
                NASA Space Apps Challenge 2026
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                NASA/JPL Ephemeris Telemetry
              </span>
            </div>

            {/* Title & Mission Statement */}
            <div className="space-y-2">
              <h1 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
                LUNAR <span className="text-sky-400">NAVIGATOR</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light">
                South pole missions face extreme lighting and direct-to-Earth communication constraints.
                Simulate solar elevation, horizon shadows, and radio line-of-sight across candidate landing sites.
              </p>
            </div>

            {/* Target Site Picker */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-mono uppercase text-slate-400 font-semibold block">
                Target Landing Site:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sites.slice(0, 6).map((s) => {
                  const isSelected = s.id === selectedSiteId;
                  return (
                    <button
                      key={s.id}
                      onClick={() => onSelectSite && onSelectSite(s.id)}
                      className={`text-left p-2.5 rounded-xl border text-xs font-mono transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 text-sky-200 shadow-[0_0_15px_rgba(56,189,248,0.3)] font-semibold'
                          : 'bg-black/40 border-white/10 text-slate-300 hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="truncate font-medium">{s.name.replace(' (Odysseus)', '').replace(' (Shiv Shakti Point)', '')}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{s.lat.toFixed(1)}° S</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={onStartZoom}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-400 hover:from-sky-400 hover:to-sky-300 text-black font-semibold text-sm transition-all transform hover:scale-[1.02] shadow-[0_0_25px_rgba(56,189,248,0.5)] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>START MISSION: ZOOM TO MOON</span>
              </button>
              <button
                onClick={onSkipIntro}
                className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-transparent hover:bg-white/10 text-slate-300 border border-white/20 hover:border-white/40 text-xs font-mono transition cursor-pointer"
              >
                Direct to Navigator
              </button>
            </div>

            <div className="text-[10px] text-slate-500 font-mono text-center">
              Targeting: <strong className="text-slate-300">{activeSite.name}</strong> ({activeSite.lat.toFixed(1)}° S, {activeSite.lon.toFixed(1)}° E)
            </div>
          </div>
        </div>
      )}

      {/* In-Flight Zoom Telemetry HUD */}
      {isZooming && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-8 sm:p-12 font-mono">
          {/* Top Telemetry Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1 bg-black/60 backdrop-blur-md p-3.5 rounded-xl border border-sky-500/30 text-xs">
              <div className="text-sky-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                TRANSLUNAR INJECTION TRAJECTORY
              </div>
              <div className="text-slate-300 text-[11px]">
                TARGET: {activeSite.name.toUpperCase()} ({activeSite.lat.toFixed(2)}° S)
              </div>
            </div>

            <div className="text-right bg-black/60 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-xs">
              <div className="text-slate-400 text-[10px]">APPROACH VELOCITY</div>
              <div className="text-emerald-400 font-bold text-sm">1.62 km/s</div>
            </div>
          </div>

          {/* Bottom Reticle and Descent Gauge */}
          <div className="max-w-md mx-auto w-full space-y-3 bg-black/70 backdrop-blur-md p-4 rounded-2xl border border-sky-400/30 text-center">
            <div className="text-xs text-sky-300 uppercase tracking-widest font-semibold">
              APPROACHING LUNAR SOUTH POLE
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-sky-500/20">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-100 rounded-full"
                style={{ width: `${zoomPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>HIGH ORBIT</span>
              <span className="text-sky-400 font-bold">{zoomPercent}%</span>
              <span>SURFACE LOCK</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpaceIntroScene;
