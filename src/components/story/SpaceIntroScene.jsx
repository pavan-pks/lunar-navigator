import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * src/components/story/SpaceIntroScene.jsx
 * Authentic NASA Mission Flow:
 * 1. Deep Space Overview (Sun, Earth, Moon)
 * 2. Smooth zoom to Lunar Orbit (Moon revolves in 3D, options appear on side without covering Moon)
 * 3. Earth Launch & Translunar Trajectory (camera pans to Earth, spacecraft launches along real cislunar arc)
 * 4. Lunar Orbit Insertion & Powered Descent to South Pole landing coordinates -> Touchdown!
 */
export function SpaceIntroScene({
  onReachedMoon,
  onSkipIntro,
  sites = [],
  selectedSiteId = 'shackleton',
  onSelectSite,
  launchDate = '2027-03-08T00:00:00Z',
  onLaunchDateChange,
  transitDays = 4,
  onTransitDaysChange
}) {
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);
  const sceneElementsRef = useRef(null);

  // Phases: 'overview' -> 'zooming-to-moon' -> 'moon-orbit' -> 'panning-to-earth' -> 'transit' -> 'lunar-descent'
  const [phase, setPhase] = useState('overview');
  const [showMoonTrekGIS, setShowMoonTrekGIS] = useState(false);
  const [flightTelemetry, setFlightTelemetry] = useState({
    status: 'STANDBY',
    velocity: '0.0 km/s',
    progress: 0,
    stage: 'Orbit Prep'
  });

  const activeSite = sites.find(s => s.id === selectedSiteId) || sites[0] || {
    name: 'Shackleton Crater Rim',
    lat: -89.9,
    lon: 129.8
  };

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
    // High-Resolution 2K Moon Map + 3D Crater Bump Displacement Map
    const moonTex = textureLoader.load('/textures/nasa_moon_2k.jpg');
    moonTex.colorSpace = THREE.SRGBColorSpace;
    const moonBumpTex = textureLoader.load('/textures/nasa_moon_bump_2k.jpg');

    // 4. Sun Sphere with SDO Texture
    const sunPos = new THREE.Vector3(-320, 60, -180);
    const sunGeo = new THREE.SphereGeometry(36, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex, color: 0xffffff });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.copy(sunPos);
    scene.add(sunMesh);

    // Glowing Sun Corona Halo
    const coronaGeo = new THREE.SphereGeometry(44, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({ color: 0xffd25a, transparent: true, opacity: 0.28, side: THREE.BackSide });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    coronaMesh.position.copy(sunPos);
    scene.add(coronaMesh);

    // Celestial Lighting
    const sunLight = new THREE.PointLight(0xfffaed, 4.5, 4000, 0.3);
    sunLight.position.copy(sunPos);
    scene.add(sunLight);

    const frontKeyLight = new THREE.DirectionalLight(0xfff5e6, 2.8);
    frontKeyLight.position.set(120, 140, 240);
    scene.add(frontKeyLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x334466, 1.4);
    scene.add(hemiLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    // 5. Bright Earth with NASA Blue Marble
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-30, 0, 40);
    scene.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(17, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.45,
      metalness: 0.1,
      emissive: 0x0a1c2e,
      emissiveIntensity: 0.35
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = (23.44 * Math.PI) / 180;
    earthGroup.add(earthMesh);

    // Atmospheric Halos
    const atmoGeo = new THREE.SphereGeometry(18.2, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32, side: THREE.BackSide });
    earthGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

    // 6. High-Resolution Bump-Mapped Moon Sphere
    const moonGroup = new THREE.Group();
    moonGroup.position.set(48, 8, 15);
    scene.add(moonGroup);

    const moonGeo = new THREE.SphereGeometry(10.5, 96, 96);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      bumpMap: moonBumpTex,
      bumpScale: 0.16,
      roughness: 0.72,
      metalness: 0.04,
      emissive: 0x181c24,
      emissiveIntensity: 0.3
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.rotation.y = Math.PI * 0.35;
    moonGroup.add(moonMesh);

    // Dedicated Moon highlight
    const moonSpot = new THREE.DirectionalLight(0xffffff, 2.0);
    moonSpot.position.set(80, 50, 90);
    moonSpot.target = moonGroup;
    scene.add(moonSpot);

    // South Pole Targeting Reticle
    const markerGeo = new THREE.RingGeometry(0.8, 1.25, 32);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const poleMarker = new THREE.Mesh(markerGeo, markerMat);
    poleMarker.position.set(0, -10.55, 0);
    poleMarker.rotation.x = Math.PI / 2;
    moonGroup.add(poleMarker);

    // 7. Spacecraft Model for Earth -> Moon Flight
    const spacecraftGroup = new THREE.Group();
    // Capsule Command Module
    const capsuleGeo = new THREE.ConeGeometry(0.7, 1.2, 16);
    const capsuleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.85, roughness: 0.2 });
    const capsule = new THREE.Mesh(capsuleGeo, capsuleMat);
    capsule.rotation.x = Math.PI / 2;
    spacecraftGroup.add(capsule);

    // Service Module
    const smGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.3, 16);
    const smMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.25 }); // Gold foil
    const sm = new THREE.Mesh(smGeo, smMat);
    sm.position.z = -1.0;
    sm.rotation.x = Math.PI / 2;
    spacecraftGroup.add(sm);

    // Solar Wings
    const wingGeo = new THREE.BoxGeometry(3.4, 0.45, 0.04);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.85, roughness: 0.2 });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.z = -1.0;
    spacecraftGroup.add(wings);

    // Thruster Engine Plume
    const plumeGeo = new THREE.ConeGeometry(0.4, 1.4, 12);
    const plumeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 });
    const plume = new THREE.Mesh(plumeGeo, plumeMat);
    plume.position.z = -2.1;
    plume.rotation.x = -Math.PI / 2;
    spacecraftGroup.add(plume);

    spacecraftGroup.visible = false;
    scene.add(spacecraftGroup);

    // 8. Translunar Injection (TLI) Trajectory Arc
    const p0 = new THREE.Vector3(-30, 8, 40); // Earth departure
    const p1 = new THREE.Vector3(-5, 32, 45);  // High transfer arc
    const p2 = new THREE.Vector3(26, 22, 28);  // Lunar approach
    const p3 = new THREE.Vector3(48, 8, 15);   // Moon insertion
    const tliCurve = new THREE.CubicBezierCurve3(p0, p1, p2, p3);

    const curvePoints = tliCurve.getPoints(90);
    const curveGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
    const curveMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 });
    const trajectoryLine = new THREE.Line(curveGeo, curveMat);
    trajectoryLine.visible = false;
    scene.add(trajectoryLine);

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
      spacecraftGroup,
      plume,
      trajectoryLine,
      tliCurve,
      phase: 'overview',
      progress: 0,
      zoomElapsed: 0
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

    // 9. ANIMATION LOOP
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Constant natural planetary rotations
      earthMesh.rotation.y += delta * 0.12;
      moonMesh.rotation.y += delta * 0.08; // Moon revolving!
      sunMesh.rotation.y += delta * 0.02;

      // Pulse reticle
      const s = 1.0 + Math.sin(elapsed * 4) * 0.18;
      poleMarker.scale.set(s, s, s);

      // Flickering rocket plume
      if (spacecraftGroup.visible) {
        plume.scale.set(1, 1 + Math.sin(elapsed * 25) * 0.25, 1);
      }

      const el = sceneElementsRef.current;
      if (!el) return;

      // PHASE A: ZOOMING TO MOON ORBIT
      if (el.phase === 'zooming-to-moon') {
        el.progress = Math.min(1.0, el.progress + delta * 0.45);
        const t = el.progress;
        const ease = 1 - Math.pow(1 - t, 3);

        const startCam = new THREE.Vector3(0, 140, 360);
        const moonCam = new THREE.Vector3(48, 2, 42); // Orbital pose looking at Moon
        camera.position.lerpVectors(startCam, moonCam, ease);

        const lookStart = new THREE.Vector3(0, 0, 0);
        const lookTarget = new THREE.Vector3(48, 8, 15);
        const look = new THREE.Vector3().lerpVectors(lookStart, lookTarget, ease);
        camera.lookAt(look);

        if (t >= 1.0) {
          el.phase = 'moon-orbit';
          setPhase('moon-orbit');
        }
      }

      // PHASE B: MOON ORBIT (Holding, Moon revolving in 3D, options open on side)
      else if (el.phase === 'moon-orbit') {
        // Gentle orbital drift
        camera.position.x = 48 + Math.sin(elapsed * 0.15) * 2.0;
        camera.position.y = 2 + Math.cos(elapsed * 0.1) * 1.0;
        camera.position.z = 42 + Math.cos(elapsed * 0.12) * 1.5;
        camera.lookAt(48, 8, 15);
      }

      // PHASE C: PANNING BACK TO EARTH FOR LAUNCH
      else if (el.phase === 'panning-to-earth') {
        el.progress = Math.min(1.0, el.progress + delta * 0.6);
        const t = el.progress;
        const ease = 1 - Math.pow(1 - t, 3);

        const startCam = new THREE.Vector3(48, 2, 42);
        const earthCam = new THREE.Vector3(-30, 24, 82);
        camera.position.lerpVectors(startCam, earthCam, ease);

        const lookStart = new THREE.Vector3(48, 8, 15);
        const lookEarth = new THREE.Vector3(-30, 0, 40);
        const look = new THREE.Vector3().lerpVectors(lookStart, lookEarth, ease);
        camera.lookAt(look);

        if (t >= 1.0) {
          el.phase = 'transit';
          setPhase('transit');
          el.progress = 0;
          spacecraftGroup.visible = true;
          trajectoryLine.visible = true;
        }
      }

      // PHASE D: TRANSLUNAR INJECTION & CISLUNAR FLIGHT (Earth -> Moon)
      else if (el.phase === 'transit') {
        el.progress = Math.min(1.0, el.progress + delta * 0.22); // ~4.5 seconds cislunar journey
        const t = el.progress;

        // Position on Bezier curve
        const pos = tliCurve.getPoint(t);
        spacecraftGroup.position.copy(pos);

        // Orient spacecraft along tangent vector
        const tangent = tliCurve.getTangent(t).normalize();
        spacecraftGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        // Dynamic Camera tracking spacecraft
        camera.position.set(pos.x + 8, pos.y + 12, pos.z + 18);
        camera.lookAt(pos);

        // Update In-Flight Telemetry
        const vel = (10.9 - t * 8.5).toFixed(1); // 10.9 km/s TLI decreasing to 1.62 km/s at Moon
        const pct = Math.floor(t * 100);
        setFlightTelemetry({
          status: 'TRANSLUNAR INJECTION',
          velocity: `${vel} km/s`,
          progress: pct,
          stage: t < 0.2 ? 'TLI Burn' : t < 0.85 ? 'Cislunar Coast' : 'Lunar Orbit Insertion'
        });

        if (t >= 1.0) {
          el.phase = 'lunar-descent';
          setPhase('lunar-descent');
          el.progress = 0;
        }
      }

      // PHASE E: LUNAR DESCENT TO SOUTH POLE RETICLE -> TOUCHDOWN!
      else if (el.phase === 'lunar-descent') {
        el.progress = Math.min(1.0, el.progress + delta * 0.5); // 2-second powered descent
        const t = el.progress;
        const ease = 1 - Math.pow(1 - t, 2);

        // Descent from orbit (48, 8, 15) to south pole marker (48, -2.5, 15)
        const orbitPos = new THREE.Vector3(48, 8, 15);
        const landPos = new THREE.Vector3(48, -2.5, 15);
        spacecraftGroup.position.lerpVectors(orbitPos, landPos, ease);

        // Camera closes in on touchdown
        camera.position.set(48 + (1 - ease) * 10, -2 + (1 - ease) * 8, 15 + 14);
        camera.lookAt(48, -2.5, 15);

        const altM = Math.max(0, Math.floor((1 - t) * 15000));
        setFlightTelemetry({
          status: 'POWERED DESCENT',
          velocity: `${(1.6 * (1 - t)).toFixed(1)} km/s`,
          progress: 100,
          stage: `Radar Alt: ${altM}m`
        });

        if (t >= 1.0) {
          el.phase = 'landed';
          if (onReachedMoon) onReachedMoon();
        }
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

  // Handler: User clicks "Zoom to Moon" from solar overview
  const handleInitiateApproach = () => {
    if (sceneElementsRef.current) {
      sceneElementsRef.current.phase = 'zooming-to-moon';
      sceneElementsRef.current.progress = 0;
      setPhase('zooming-to-moon');
    }
  };

  // Handler: User clicks "Launch Mission from Earth" after selecting options
  const handleLaunchFromEarth = () => {
    if (sceneElementsRef.current) {
      sceneElementsRef.current.phase = 'panning-to-earth';
      sceneElementsRef.current.progress = 0;
      setPhase('panning-to-earth');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* 1. OVERVIEW SCREEN: Center Card */}
      {phase === 'overview' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center p-6 bg-radial from-transparent via-black/20 to-black/70 pointer-events-none">
          <div className="max-w-lg w-full bg-black/45 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 space-y-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] pointer-events-auto text-center animate-in fade-in zoom-in-95 duration-500">
            <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold px-3 py-1 rounded-full bg-sky-500/10 border border-sky-400/30">
              NASA Space Apps Challenge 2026
            </span>
            <h1 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
              LUNAR <span className="text-sky-400 drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]">NAVIGATOR</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-light leading-relaxed">
              Explore lighting, shadows, and direct-to-Earth communication windows at candidate landing sites on the Moon’s South Pole.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={handleInitiateApproach}
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-black font-bold text-sm tracking-wide transition-all transform hover:scale-[1.03] shadow-[0_0_30px_rgba(56,189,248,0.55)] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>EXPLORE LUNAR SOUTH POLE</span>
              </button>
              <button
                onClick={onSkipIntro}
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/15 text-xs font-mono transition cursor-pointer"
              >
                Direct to Surface
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MOON ORBIT SCREEN: Side Options Card (Moon is revolving in 3D right next to it!) */}
      {phase === 'moon-orbit' && (
        <div className="absolute inset-0 z-20 flex items-center justify-start p-6 sm:p-10 pointer-events-none">
          <div className="max-w-md w-full bg-black/50 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 space-y-4 shadow-[0_10px_50px_rgba(0,0,0,0.8)] pointer-events-auto animate-in slide-in-from-left duration-500">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold block">
                  LUNAR ORBIT INSERTION
                </span>
                <h2 className="text-lg font-display font-bold text-white mt-0.5">
                  Target Landing Site & Date
                </h2>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            {/* Target Site Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                Landing Target:
              </label>
              <select
                value={selectedSiteId}
                onChange={(e) => onSelectSite && onSelectSite(e.target.value)}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-slate-200 text-xs font-mono cursor-pointer focus:outline-none focus:border-sky-400"
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`} S)
                  </option>
                ))}
              </select>
              {activeSite.notes && (
                <p className="text-[11px] text-slate-400 font-light leading-relaxed pt-1">
                  {activeSite.notes}
                </p>
              )}
            </div>

            {/* Earth Launch Date & Transit */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold block mb-1">
                  Earth Launch:
                </label>
                <input
                  type="date"
                  min="2027-01-01"
                  max="2028-01-10"
                  value={typeof launchDate === 'string' ? launchDate.slice(0, 10) : '2027-03-08'}
                  onChange={(e) => onLaunchDateChange && onLaunchDateChange(`${e.target.value}T00:00:00Z`)}
                  className="w-full bg-black/60 border border-white/15 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-400"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                    Transit:
                  </label>
                  <span className="text-[11px] font-mono text-sky-400 font-bold">{transitDays}d</span>
                </div>
                <input
                  type="range"
                  min={2}
                  max={8}
                  step={1}
                  value={transitDays}
                  onChange={(e) => onTransitDaysChange && onTransitDaysChange(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-900 rounded appearance-none cursor-pointer accent-sky-400 mt-2"
                />
              </div>
            </div>

            {/* Interactive NASA Moon Trek GIS Button */}
            <div className="pt-1">
              <button
                onClick={() => setShowMoonTrekGIS(true)}
                className="w-full py-2 px-3 rounded-xl bg-white/10 hover:bg-sky-500/20 border border-white/10 hover:border-sky-400/40 text-sky-300 text-[11px] font-mono transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>🗺️</span>
                <span>Inspect in NASA Moon Trek (Live GIS) ↗</span>
              </button>
            </div>

            {/* Launch CTA */}
            <div className="pt-1 space-y-2">
              <button
                onClick={handleLaunchFromEarth}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-black font-bold text-xs font-mono tracking-wide transition-all transform hover:scale-[1.02] shadow-[0_0_25px_rgba(56,189,248,0.5)] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>LAUNCH MISSION FROM EARTH</span>
              </button>
              <div className="text-[10px] text-slate-500 font-mono text-center">
                Pans back to Earth to simulate real translunar injection & descent trajectory
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. IN-FLIGHT TRANSLUNAR & POWERED DESCENT TELEMETRY HUD */}
      {(phase === 'transit' || phase === 'lunar-descent' || phase === 'panning-to-earth') && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 sm:p-10 font-mono">
          {/* Top Telemetry Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1 bg-black/60 backdrop-blur-xl p-3.5 rounded-2xl border border-sky-400/30 text-xs shadow-xl">
              <div className="text-sky-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                {flightTelemetry.status}
              </div>
              <div className="text-slate-300 text-[11px]">
                TARGET: {activeSite.name.toUpperCase()} ({activeSite.lat.toFixed(1)}° S)
              </div>
            </div>

            <div className="text-right bg-black/60 backdrop-blur-xl p-3.5 rounded-2xl border border-white/10 text-xs shadow-xl">
              <div className="text-slate-400 text-[10px]">CURRENT VELOCITY</div>
              <div className="text-emerald-400 font-bold text-base">{flightTelemetry.velocity}</div>
            </div>
          </div>

          {/* Bottom Trajectory Progress Gauge */}
          <div className="max-w-md mx-auto w-full space-y-2 bg-black/70 backdrop-blur-2xl p-4 rounded-3xl border border-sky-400/30 text-center shadow-2xl">
            <div className="flex justify-between text-xs text-sky-300 uppercase tracking-wider font-semibold">
              <span>{flightTelemetry.stage}</span>
              <span>{flightTelemetry.progress}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-sky-500/20">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-cyan-400 to-emerald-400 transition-all duration-100 rounded-full"
                style={{ width: `${flightTelemetry.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Earth Exit</span>
              <span>Cislunar Transfer</span>
              <span>Lunar Touchdown</span>
            </div>
          </div>
        </div>
      )}
      {/* 4. MODAL: EMBEDDED NASA MOON TREK GIS VIEWER */}
      {showMoonTrekGIS && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-3xl p-4 sm:p-6 flex flex-col items-center justify-center animate-in fade-in">
          <div className="max-w-4xl w-full h-[85vh] bg-black/70 border border-white/15 rounded-3xl p-4 sm:p-6 flex flex-col shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🌕</span>
                <div>
                  <h3 className="font-display font-bold text-white text-base">
                    NASA Moon Trek (trek.nasa.gov/moon)
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Target: {activeSite.name} ({activeSite.lat > 0 ? `+${activeSite.lat}°` : `${activeSite.lat}°`} S, {activeSite.lon > 0 ? `+${activeSite.lon}°` : `${activeSite.lon}°`} E)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMoonTrekGIS(false)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition cursor-pointer"
              >
                ✕ Close GIS
              </button>
            </div>

            <div className="flex-1 w-full rounded-2xl overflow-hidden border border-white/10 relative bg-black">
              <iframe
                title="NASA Moon Trek"
                src={`https://trek.nasa.gov/moon/#v=0.1&x=${activeSite.lon}&y=${activeSite.lat}&z=5`}
                className="w-full h-full border-0 rounded-2xl"
                allow="fullscreen"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpaceIntroScene;
