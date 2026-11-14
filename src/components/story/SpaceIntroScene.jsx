import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * Convert lunar latitude and longitude to 3D sphere cartesian coordinates.
 */
function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

/**
 * src/components/story/SpaceIntroScene.jsx
 * Authentic NASA Mission Flow:
 * 1. Deep Space Overview (Sun, Earth, Moon).
 * 2. Smooth zoom to Lunar Orbit:
 *    - Moon revolves in 3D right in front of user.
 *    - Interactive: Drag to spin Moon 360°, click ANY spot on Moon to point & set landing target!
 *    - Landmark pins mapped directly on Moon (Shackleton, Malapert, Haworth, IM-1, Chandrayaan-3, Apollo 11).
 *    - Minimal glassmorphism options card on side (Target, Launch Date, Transit).
 * 3. Physics-based Flight:
 *    - Camera pans to Earth.
 *    - Spacecraft departs Earth along real cislunar TLI transfer curve.
 *    - Spacecraft executes Lunar Orbit Insertion (LOI) braking burn and completes a circular lunar orbit.
 *    - Powered Descent Initiative (PDI) burns down to the pointed landing target -> Touchdown!
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

  // Phases: 'overview' | 'zooming-to-moon' | 'moon-orbit' | 'panning-to-earth' | 'transit-tli' | 'lunar-orbit-insertion' | 'powered-descent'
  const [phase, setPhase] = useState('overview');
  const [customPointedCoords, setCustomPointedCoords] = useState(null);
  const [flightTelemetry, setFlightTelemetry] = useState({
    status: 'STANDBY',
    velocity: '0.0 km/s',
    progress: 0,
    stage: 'Orbit Preparation'
  });

  const activeSite = customPointedCoords
    ? { id: 'pointed-site', name: `Pointed Site (${customPointedCoords.lat.toFixed(1)}°, ${customPointedCoords.lon.toFixed(1)}°)`, lat: customPointedCoords.lat, lon: customPointedCoords.lon, terrainType: 'plain' }
    : (sites.find(s => s.id === selectedSiteId) || sites[0] || { name: 'Shackleton Crater Rim', lat: -89.9, lon: 129.8 });

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

    // 6. High-Resolution 2K Bump-Mapped Moon Sphere
    const MOON_RADIUS = 10.5;
    const moonGroup = new THREE.Group();
    moonGroup.position.set(48, 8, 15);
    scene.add(moonGroup);

    const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, 96, 96);
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

    // Moon Dedicated Highlight
    const moonSpot = new THREE.DirectionalLight(0xffffff, 2.0);
    moonSpot.position.set(80, 50, 90);
    moonSpot.target = moonGroup;
    scene.add(moonSpot);

    // Mapped Landmark 3D Pins on Moon
    const pinGroup = new THREE.Group();
    moonGroup.add(pinGroup);

    const landmarkPins = [];
    sites.forEach((site) => {
      const pinPos = latLonToVector3(site.lat, site.lon, MOON_RADIUS + 0.15);
      const pinGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const isSelected = site.id === selectedSiteId;
      const pinMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x38bdf8 : (site.lat < -80 ? 0xffd25a : 0x10b981)
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pinPos);
      pinMesh.userData = { siteId: site.id, siteName: site.name, lat: site.lat, lon: site.lon };
      pinGroup.add(pinMesh);
      landmarkPins.push(pinMesh);
    });

    // Dynamic Landing Reticle Marker
    const markerGeo = new THREE.RingGeometry(0.8, 1.25, 32);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const targetReticle = new THREE.Mesh(markerGeo, markerMat);
    // Initial position at active site coordinates
    const initReticlePos = latLonToVector3(activeSite.lat, activeSite.lon, MOON_RADIUS + 0.08);
    targetReticle.position.copy(initReticlePos);
    targetReticle.lookAt(targetReticle.position.clone().multiplyScalar(2));
    moonGroup.add(targetReticle);

    // 7. Spacecraft Model with Rocket Plume
    const spacecraftGroup = new THREE.Group();
    const capsuleGeo = new THREE.ConeGeometry(0.7, 1.2, 16);
    const capsuleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.85, roughness: 0.2 });
    const capsule = new THREE.Mesh(capsuleGeo, capsuleMat);
    capsule.rotation.x = Math.PI / 2;
    spacecraftGroup.add(capsule);

    const smGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.3, 16);
    const smMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.25 });
    const sm = new THREE.Mesh(smGeo, smMat);
    sm.position.z = -1.0;
    sm.rotation.x = Math.PI / 2;
    spacecraftGroup.add(sm);

    const wingGeo = new THREE.BoxGeometry(3.4, 0.45, 0.04);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.85, roughness: 0.2 });
    const wings = new THREE.Mesh(wingGeo, wingMat);
    wings.position.z = -1.0;
    spacecraftGroup.add(wings);

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
    const p1 = new THREE.Vector3(-5, 34, 48);  // High transfer arc
    const p2 = new THREE.Vector3(26, 22, 28);  // Cislunar coast
    const p3 = new THREE.Vector3(48, 8, 30);   // Lunar approach insertion point
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
      targetReticle,
      spacecraftGroup,
      plume,
      trajectoryLine,
      tliCurve,
      landmarkPins,
      phase: 'overview',
      progress: 0,
      orbitAngle: 0
    };

    // 9. Interactive Drag-to-Rotate & Click-to-Point Landing Target on Moon
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };
    let dragDistance = 0;

    const onPointerDown = (e) => {
      isDragging = true;
      dragDistance = 0;
      prevPointer = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      dragDistance += Math.abs(dx) + Math.abs(dy);
      prevPointer = { x: e.clientX, y: e.clientY };

      const el = sceneElementsRef.current;
      if (el && el.phase === 'moon-orbit') {
        el.moonGroup.rotation.y += dx * 0.005;
        el.moonGroup.rotation.x = Math.max(-0.6, Math.min(0.6, el.moonGroup.rotation.x + dy * 0.005));
      }
    };

    const onPointerUp = (e) => {
      isDragging = false;
      const el = sceneElementsRef.current;
      if (!el || el.phase !== 'moon-orbit') return;

      // If user clicked (drag distance < 6px), raycast to point a landing spot on the Moon!
      if (dragDistance < 6) {
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);

        // Check if user clicked an existing landmark pin
        const pinIntersects = raycaster.intersectObjects(landmarkPins, false);
        if (pinIntersects.length > 0) {
          const hitPin = pinIntersects[0].object;
          if (hitPin.userData?.siteId && onSelectSite) {
            onSelectSite(hitPin.userData.siteId);
            setCustomPointedCoords(null);
            targetReticle.position.copy(hitPin.position);
            targetReticle.lookAt(targetReticle.position.clone().multiplyScalar(2));
            return;
          }
        }

        // Check if user clicked anywhere on the Moon surface
        const intersects = raycaster.intersectObject(moonMesh, false);
        if (intersects.length > 0) {
          const hit = intersects[0];
          const localPoint = moonGroup.worldToLocal(hit.point.clone());
          const r = localPoint.length();
          const lat = Math.asin(Math.max(-1, Math.min(1, localPoint.y / r))) * (180 / Math.PI);
          let lon = Math.atan2(localPoint.z, -localPoint.x) * (180 / Math.PI) - 180;
          if (lon < -180) lon += 360;
          if (lon > 180) lon -= 360;

          // Position target reticle
          targetReticle.position.copy(localPoint.clone().normalize().multiplyScalar(MOON_RADIUS + 0.08));
          targetReticle.lookAt(targetReticle.position.clone().multiplyScalar(2));

          const pointed = {
            id: `pointed-${lat.toFixed(1)}-${lon.toFixed(1)}`,
            name: `Landing Site (${lat.toFixed(1)}° S, ${lon.toFixed(1)}° E)`,
            lat,
            lon,
            terrainType: lat < -80 ? 'crater-rim' : 'plain'
          };
          setCustomPointedCoords(pointed);
          if (onSelectSite) onSelectSite(pointed);
        }
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

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

    // 10. ANIMATION LOOP
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Constant natural planetary rotations
      earthMesh.rotation.y += delta * 0.12;
      sunMesh.rotation.y += delta * 0.02;

      // Pulse reticle
      const s = 1.0 + Math.sin(elapsed * 4) * 0.18;
      targetReticle.scale.set(s, s, s);

      // Flickering rocket plume
      if (spacecraftGroup.visible) {
        plume.scale.set(1, 1 + Math.sin(elapsed * 25) * 0.25, 1);
      }

      const el = sceneElementsRef.current;
      if (!el) return;

      // In moon-orbit, gently rotate moon if not actively dragging
      if (el.phase === 'moon-orbit' && !isDragging) {
        moonMesh.rotation.y += delta * 0.04;
      }

      // PHASE A: ZOOMING TO MOON ORBIT
      if (el.phase === 'zooming-to-moon') {
        el.progress = Math.min(1.0, el.progress + delta * 0.45);
        const t = el.progress;
        const ease = 1 - Math.pow(1 - t, 3);

        const startCam = new THREE.Vector3(0, 140, 360);
        const moonCam = new THREE.Vector3(48, 2, 42);
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

      // PHASE B: PANNING BACK TO EARTH FOR LAUNCH
      else if (el.phase === 'panning-to-earth') {
        el.progress = Math.min(1.0, el.progress + delta * 0.65);
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
          el.phase = 'transit-tli';
          setPhase('transit-tli');
          el.progress = 0;
          spacecraftGroup.visible = true;
          trajectoryLine.visible = true;
        }
      }

      // PHASE C: TRANSLUNAR INJECTION & CISLUNAR FLIGHT (Earth -> Lunar Approach)
      else if (el.phase === 'transit-tli') {
        el.progress = Math.min(1.0, el.progress + delta * 0.28); // ~3.5 seconds
        const t = el.progress;

        const pos = tliCurve.getPoint(t);
        spacecraftGroup.position.copy(pos);

        const tangent = tliCurve.getTangent(t).normalize();
        spacecraftGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);

        camera.position.set(pos.x + 8, pos.y + 10, pos.z + 16);
        camera.lookAt(pos);

        const vel = (10.9 - t * 8.5).toFixed(1);
        setFlightTelemetry({
          status: 'TRANSLUNAR INJECTION',
          velocity: `${vel} km/s`,
          progress: Math.floor(t * 60),
          stage: t < 0.25 ? 'TLI Burn (Translunar Injection)' : 'Cislunar Coast Trajectory'
        });

        if (t >= 1.0) {
          // Arrived at Moon approach -> transition to Lunar Orbit Insertion (LOI)!
          el.phase = 'lunar-orbit-insertion';
          setPhase('lunar-orbit-insertion');
          el.progress = 0;
          el.orbitAngle = -Math.PI / 2;
        }
      }

      // PHASE D: LUNAR ORBIT INSERTION (LOI) - Braking Burn & Circular Lunar Orbit!
      else if (el.phase === 'lunar-orbit-insertion') {
        el.progress = Math.min(1.0, el.progress + delta * 0.35); // ~2.8 seconds
        const t = el.progress;

        // Circular Orbit radius around Moon
        const orbitRadius = 14.2;
        el.orbitAngle += delta * 1.8;
        const angle = el.orbitAngle;

        // Position on 3D lunar orbit plane
        const orbitX = 48 + Math.cos(angle) * orbitRadius;
        const orbitY = 8 + Math.sin(angle * 0.5) * 3.5;
        const orbitZ = 15 + Math.sin(angle) * orbitRadius;
        spacecraftGroup.position.set(orbitX, orbitY, orbitZ);

        // Turn retrograde for braking burn
        const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle)).normalize();
        spacecraftGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), tangent);

        camera.position.set(48 + Math.cos(angle + 0.5) * 26, 12, 15 + Math.sin(angle + 0.5) * 26);
        camera.lookAt(48, 8, 15);

        setFlightTelemetry({
          status: 'LUNAR ORBIT INSERTION (LOI)',
          velocity: '1.63 km/s',
          progress: 60 + Math.floor(t * 25),
          stage: '100 km Circular Lunar Orbit • Braking Burn'
        });

        if (t >= 1.0) {
          // Ready for powered descent to landing target!
          el.phase = 'powered-descent';
          setPhase('powered-descent');
          el.progress = 0;
        }
      }

      // PHASE E: POWERED DESCENT INITIATIVE (PDI) - Descent to Targeted Spot -> Touchdown!
      else if (el.phase === 'powered-descent') {
        el.progress = Math.min(1.0, el.progress + delta * 0.45); // ~2.2 seconds
        const t = el.progress;
        const ease = 1 - Math.pow(1 - t, 2);

        // Target landing spot in world coordinates
        const targetWorld = new THREE.Vector3();
        targetReticle.getWorldPosition(targetWorld);

        const startDeorbit = new THREE.Vector3(48 + 12, 12, 15);
        spacecraftGroup.position.lerpVectors(startDeorbit, targetWorld, ease);

        // Upright vertical orientation as it touches down
        const surfaceNormal = targetWorld.clone().sub(moonGroup.position).normalize();
        spacecraftGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal);

        camera.position.set(targetWorld.x + (1 - ease) * 8 + 3, targetWorld.y + 4, targetWorld.z + 10);
        camera.lookAt(targetWorld);

        const altM = Math.max(0, Math.floor((1 - t) * 12000));
        setFlightTelemetry({
          status: 'POWERED DESCENT (PDI)',
          velocity: `${(1.6 * (1 - t)).toFixed(1)} km/s`,
          progress: 85 + Math.floor(t * 15),
          stage: altM > 0 ? `Radar Alt: ${altM}m • Terminal Descent` : 'Touchdown Confirmed!'
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
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
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

  // Handler: User initiates approach from solar overview
  const handleInitiateApproach = () => {
    if (sceneElementsRef.current) {
      sceneElementsRef.current.phase = 'zooming-to-moon';
      sceneElementsRef.current.progress = 0;
      setPhase('zooming-to-moon');
    }
  };

  // Handler: User launches mission after selecting / pointing coordinates
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
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

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
              Explore polar illumination, grazing shadows, and direct-to-Earth communication windows at candidate lunar landing sites.
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

      {/* 2. MOON ORBIT SCREEN: Interactive Moon + Side Options Card */}
      {phase === 'moon-orbit' && (
        <div className="absolute inset-0 z-20 flex items-center justify-between p-6 sm:p-10 pointer-events-none">
          {/* Left Side Options Panel (Does NOT cover the Moon!) */}
          <div className="max-w-md w-full bg-black/50 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 space-y-4 shadow-[0_10px_50px_rgba(0,0,0,0.8)] pointer-events-auto animate-in slide-in-from-left duration-500">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold block">
                  LUNAR ORBIT HOLDING
                </span>
                <h2 className="text-lg font-display font-bold text-white mt-0.5">
                  Point Target & Launch Date
                </h2>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>

            {/* Interactive Instructions Badge */}
            <div className="bg-sky-500/10 border border-sky-400/30 rounded-2xl p-2.5 text-[11px] font-mono text-sky-300 flex items-center gap-2">
              <span className="text-base">👆</span>
              <span><strong>Interactive:</strong> Drag to spin Moon. Click <em>anywhere on Moon</em> to point your landing spot!</span>
            </div>

            {/* Target Site Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400 uppercase font-semibold">Landing Target:</span>
                <span className="text-sky-400 font-bold">{activeSite.lat > 0 ? `+${activeSite.lat.toFixed(1)}°` : `${activeSite.lat.toFixed(1)}°`} S, {activeSite.lon > 0 ? `+${activeSite.lon.toFixed(1)}°` : `${activeSite.lon.toFixed(1)}°`} E</span>
              </div>
              <select
                value={customPointedCoords ? 'custom' : selectedSiteId}
                onChange={(e) => {
                  if (e.target.value === 'custom') {
                    // keep custom
                  } else {
                    setCustomPointedCoords(null);
                    if (onSelectSite) onSelectSite(e.target.value);
                  }
                }}
                className="w-full bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-slate-200 text-xs font-mono cursor-pointer focus:outline-none focus:border-sky-400"
              >
                {customPointedCoords && (
                  <option value="custom">🎯 {activeSite.name}</option>
                )}
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.lat > 0 ? `+${s.lat.toFixed(1)}°` : `${s.lat.toFixed(1)}°`} S)
                  </option>
                ))}
              </select>
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

            {/* Launch CTA */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleLaunchFromEarth}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-black font-bold text-xs font-mono tracking-wide transition-all transform hover:scale-[1.02] shadow-[0_0_25px_rgba(56,189,248,0.5)] cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀</span>
                <span>LAUNCH MISSION FROM EARTH</span>
              </button>
              <div className="text-[10px] text-slate-500 font-mono text-center">
                Pans back to Earth &rarr; TLI burn &rarr; Lunar Orbit Insertion &rarr; Powered Descent
              </div>
            </div>
          </div>

          {/* Right Floating Badge showing Mapped Places */}
          <div className="hidden lg:block bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-xs font-mono space-y-2 pointer-events-auto">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block border-b border-white/10 pb-1">
              Mapped Polar Landmarks
            </span>
            <div className="space-y-1 text-[11px]">
              {sites.slice(0, 5).map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    setCustomPointedCoords(null);
                    if (onSelectSite) onSelectSite(s.id);
                  }}
                  className={`px-2 py-1 rounded-lg cursor-pointer transition flex items-center justify-between gap-3 ${
                    s.id === selectedSiteId && !customPointedCoords ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="truncate max-w-[140px]">{s.name.replace(' (Odysseus)', '').replace(' (Shiv Shakti Point)', '')}</span>
                  <span className="text-[10px] opacity-70">{s.lat.toFixed(1)}° S</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. IN-FLIGHT TRANSLUNAR & ORBIT INSERTION TELEMETRY HUD */}
      {(phase === 'transit-tli' || phase === 'lunar-orbit-insertion' || phase === 'powered-descent' || phase === 'panning-to-earth') && (
        <div className="absolute inset-0 z-30 pointer-events-none flex flex-col justify-between p-6 sm:p-10 font-mono">
          {/* Top Telemetry Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1 bg-black/60 backdrop-blur-xl p-3.5 rounded-2xl border border-sky-400/30 text-xs shadow-xl">
              <div className="text-sky-400 font-bold uppercase tracking-wider flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping"></span>
                {flightTelemetry.status}
              </div>
              <div className="text-slate-300 text-[11px]">
                TARGET: {activeSite.name.toUpperCase()} ({activeSite.lat.toFixed(1)}° S, {activeSite.lon.toFixed(1)}° E)
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
              <span>LOI Orbit (100km)</span>
              <span>PDI Landing</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpaceIntroScene;
