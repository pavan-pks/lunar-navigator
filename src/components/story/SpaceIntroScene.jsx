import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createPRNG } from '../scene/noise.js';

/**
 * Convert lunar latitude and longitude to 3D sphere cartesian coordinates.
 * Matches standard NASA Clementine/LRO equirectangular UV mapping.
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
 * Creates a high-precision landing target beacon that lies flush against the lunar surface.
 */
function createLandingReticle() {
  const group = new THREE.Group();

  // Central pinpoint beacon dot right on the lunar surface
  const dotGeo = new THREE.SphereGeometry(0.22, 16, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  group.add(dot);

  // Inner sharp reticle ring
  const innerRingGeo = new THREE.RingGeometry(0.45, 0.65, 32);
  const innerRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  group.add(innerRing);

  // Outer pulsing targeting ring
  const outerRingGeo = new THREE.RingGeometry(0.95, 1.25, 32);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  group.add(outerRing);

  // 4 Crosshair ticks along the surface tangent
  const tickMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const tickGeo = new THREE.PlaneGeometry(0.08, 0.45);
  for (let i = 0; i < 4; i++) {
    const tick = new THREE.Mesh(tickGeo, tickMat);
    const angle = (i * Math.PI) / 2;
    tick.position.set(Math.cos(angle) * 1.5, Math.sin(angle) * 1.5, 0);
    tick.rotation.z = angle + Math.PI / 2;
    group.add(tick);
  }

  group.userData = { outerRing };
  return group;
}

/**
 * Creates a detailed 3D Artemis / CLPS orbital spacecraft model.
 * Features conical command module, cylindrical service module with gold MLI blanket,
 * 4 X-wing photovoltaic solar arrays, and high-gain antenna.
 */
function createOrbitalSpacecraft() {
  const group = new THREE.Group();

  // 1. Crew Capsule / Command Module (conical aeroshell)
  const capsuleGeo = new THREE.ConeGeometry(0.32, 0.42, 16);
  const capsuleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.4 });
  const capsule = new THREE.Mesh(capsuleGeo, capsuleMat);
  capsule.position.set(0, 0.32, 0);
  group.add(capsule);

  // Visor observation window
  const windowGeo = new THREE.BoxGeometry(0.12, 0.07, 0.04);
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x090d16 });
  const windowMesh = new THREE.Mesh(windowGeo, windowMat);
  windowMesh.position.set(0, 0.32, 0.2);
  group.add(windowMesh);

  // Docking mechanism
  const dockGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.06, 12);
  const dockMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85 });
  const dock = new THREE.Mesh(dockGeo, dockMat);
  dock.position.set(0, 0.54, 0);
  group.add(dock);

  // 2. Service Module (cylindrical propulsion & power core)
  const smGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.38, 16);
  const smMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.6 });
  const sm = new THREE.Mesh(smGeo, smMat);
  sm.position.set(0, 0, 0);
  group.add(sm);

  // Gold foil MLI thermal blanket segment
  const goldBandGeo = new THREE.CylinderGeometry(0.325, 0.325, 0.16, 16);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xdf8a08, roughness: 0.25, metalness: 0.88 });
  const goldBand = new THREE.Mesh(goldBandGeo, goldMat);
  goldBand.position.set(0, -0.05, 0);
  group.add(goldBand);

  // Main orbital maneuvering engine nozzle
  const engineGeo = new THREE.ConeGeometry(0.15, 0.26, 16, 1, true);
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.8 });
  const engine = new THREE.Mesh(engineGeo, engineMat);
  engine.position.set(0, -0.3, 0);
  group.add(engine);

  // 3. Four Solar Array Wings in X-Wing Configuration (Artemis Orion style)
  const solarMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.18, metalness: 0.85 });
  const wingW = 0.52;
  const wingH = 0.15;
  const wingGeo = new THREE.BoxGeometry(wingW, wingH, 0.015);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const wing = new THREE.Mesh(wingGeo, solarMat);
    wing.position.set(Math.cos(angle) * 0.55, 0.05, Math.sin(angle) * 0.55);
    wing.rotation.y = angle;
    wing.rotation.z = 0.22;
    group.add(wing);
  }

  // 4. Steerable High-Gain Antenna
  const dishGeo = new THREE.ConeGeometry(0.11, 0.045, 12, 1, true);
  const dishMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3, metalness: 0.85 });
  const dish = new THREE.Mesh(dishGeo, dishMat);
  dish.position.set(0.32, 0.12, 0);
  dish.rotation.z = Math.PI / 3;
  group.add(dish);

  group.scale.set(1.5, 1.5, 1.5);
  return group;
}

/**
 * src/components/story/SpaceIntroScene.jsx
 * 1. Deep Space Overview (Sun, Earth, Moon).
 * 2. Smooth zoom to Lunar Orbit:
 *    - Moon revolves in 3D right in front of user.
 *    - Interactive: Drag to spin Moon 360°, click ANY spot on Moon to point & set landing target!
 *    - Labeled landmark pins directly on the Moon (Shackleton, Malapert, Haworth, IM-1, Chandrayaan-3, Apollo 11).
 *    - Minimal glassmorphism card on side without covering Moon.
 * 3. Direct descent to selected coordinates -> Touchdown!
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

  // Phases: 'overview' | 'zooming-to-moon' | 'moon-orbit' | 'descent'
  const [phase, setPhase] = useState('overview');
  const [customPointedCoords, setCustomPointedCoords] = useState(null);
  const [screenLabels, setScreenLabels] = useState([]);

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
    const starPrng = createPRNG(54321);
    for (let i = 0; i < starCount; i++) {
      const r = 900 + starPrng() * 900;
      const theta = starPrng() * Math.PI * 2;
      const phi = Math.acos(2 * starPrng() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const val = 0.8 + starPrng() * 0.2;
      starColors[i * 3] = val;
      starColors[i * 3 + 1] = val;
      starColors[i * 3 + 2] = val + starPrng() * 0.08;
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
    // Initial tilt to nicely reveal the lunar South Pole landing areas
    moonMesh.rotation.set(-0.25, 0, 0);
    moonGroup.add(moonMesh);

    // Moon Dedicated Highlight
    const moonSpot = new THREE.DirectionalLight(0xffffff, 2.0);
    moonSpot.position.set(80, 50, 90);
    moonSpot.target = moonGroup;
    scene.add(moonSpot);

    // Mapped Landmark 3D Pins on Moon (Direct children of moonMesh to stay locked to craters!)
    const pinGroup = new THREE.Group();
    moonMesh.add(pinGroup);

    const landmarkPins = [];
    sites.forEach((site) => {
      const pinPos = latLonToVector3(site.lat, site.lon, MOON_RADIUS + 0.12);
      const pinGeo = new THREE.SphereGeometry(0.3, 16, 16);
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

    // Dynamic Landing Reticle Marker (Direct child of moonMesh, sits flush on lunar surface!)
    const targetReticle = createLandingReticle();
    const initReticlePos = latLonToVector3(activeSite.lat, activeSite.lon, MOON_RADIUS + 0.04);
    targetReticle.position.copy(initReticlePos);
    const initNormal = initReticlePos.clone().normalize();
    targetReticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), initNormal);
    moonMesh.add(targetReticle);

    // Detailed 3D Orbital Spacecraft (Artemis / CLPS orbiter)
    const orbitalSpacecraft = createOrbitalSpacecraft();
    moonGroup.add(orbitalSpacecraft);

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
      landmarkPins,
      orbitalSpacecraft,
      phase: 'overview',
      progress: 0,
      startCamPos: null,
      craftDescentStart: null
    };

    // 7. Interactive Free 3D Drag-to-Rotate & Click-to-Point Landing Target on Moon
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };
    let dragDistance = 0;
    let hasUserInteracted = false;

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
        hasUserInteracted = true;
        // Camera-relative free 3D rotation in all axes (yaw, pitch, diagonal) without any clamping
        const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

        const qYaw = new THREE.Quaternion().setFromAxisAngle(camUp, dx * 0.007);
        const qPitch = new THREE.Quaternion().setFromAxisAngle(camRight, dy * 0.007);

        el.moonMesh.quaternion.premultiply(qYaw);
        el.moonMesh.quaternion.premultiply(qPitch);
      }
    };

    const onPointerUp = (e) => {
      isDragging = false;
      const el = sceneElementsRef.current;
      if (!el || el.phase !== 'moon-orbit') return;

      // Click to point a landing spot on the Moon
      if (dragDistance < 6) {
        hasUserInteracted = true;
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
            const normal = hitPin.position.clone().normalize();
            targetReticle.position.copy(normal.clone().multiplyScalar(MOON_RADIUS + 0.04));
            targetReticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            return;
          }
        }

        // Check if user clicked anywhere on the Moon surface
        const intersects = raycaster.intersectObject(moonMesh, false);
        if (intersects.length > 0) {
          const hit = intersects[0];
          const localPoint = moonMesh.worldToLocal(hit.point.clone());
          const r = localPoint.length();
          const lat = Math.asin(Math.max(-1, Math.min(1, localPoint.y / r))) * (180 / Math.PI);
          let theta = Math.atan2(localPoint.z, -localPoint.x);
          if (theta < 0) theta += Math.PI * 2;
          let lon = theta * (180 / Math.PI) - 180;
          if (lon < -180) lon += 360;
          if (lon > 180) lon -= 360;

          // Position target reticle flush with the lunar surface tangent
          const normal = localPoint.clone().normalize();
          targetReticle.position.copy(normal.clone().multiplyScalar(MOON_RADIUS + 0.04));
          targetReticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);

          const latStr = `${Math.abs(lat).toFixed(1)}°${lat < 0 ? 'S' : 'N'}`;
          const lonStr = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
          const pointed = {
            id: `pointed-${lat.toFixed(1)}-${lon.toFixed(1)}`,
            name: `Landing Spot (${latStr}, ${lonStr})`,
            lat,
            lon,
            terrainType: lat < -80 ? 'crater-rim' : 'plain'
          };
          setCustomPointedCoords(pointed);
          if (onSelectSite) onSelectSite(pointed);
        }
      }
    };

    // Wheel zoom in/out on Moon orbit
    const onWheel = (e) => {
      const el = sceneElementsRef.current;
      if (!el || el.phase !== 'moon-orbit') return;
      e.preventDefault();
      const moonWorld = new THREE.Vector3();
      el.moonMesh.getWorldPosition(moonWorld);
      const camDir = camera.position.clone().sub(moonWorld);
      const dist = camDir.length();
      const newDist = Math.max(17, Math.min(65, dist + e.deltaY * 0.025));
      camDir.normalize().multiplyScalar(newDist);
      camera.position.copy(moonWorld.clone().add(camDir));
      camera.lookAt(moonWorld);
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('wheel', onWheel, { passive: false });
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

    // 8. ANIMATION LOOP
    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Constant natural planetary rotations
      earthMesh.rotation.y += delta * 0.12;
      sunMesh.rotation.y += delta * 0.02;

      // Pulse outer reticle ring
      const outerRing = targetReticle.userData?.outerRing;
      if (outerRing) {
        const s = 1.0 + Math.sin(elapsed * 4) * 0.15;
        outerRing.scale.set(s, s, s);
        outerRing.material.opacity = 0.5 + Math.sin(elapsed * 4) * 0.3;
      }

      const el = sceneElementsRef.current;
      if (!el) return;

      // In moon-orbit, gently rotate moon only before user touches it
      if (el.phase === 'moon-orbit' && !hasUserInteracted && !isDragging) {
        const idleSpin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.025);
        moonMesh.quaternion.multiply(idleSpin);
      }

      // Project 3D landmark pins to 2D screen labels
      if (el.phase === 'moon-orbit') {
        const labels = [];
        const moonCenter = new THREE.Vector3();
        moonMesh.getWorldPosition(moonCenter);

        landmarkPins.forEach((pin) => {
          const worldPos = new THREE.Vector3();
          pin.getWorldPosition(worldPos);

          // Check if facing the camera
          const dirToCam = camera.position.clone().sub(worldPos).normalize();
          const normal = worldPos.clone().sub(moonCenter).normalize();
          const dot = dirToCam.dot(normal);

          if (dot > 0.15) {
            const screenPos = worldPos.clone().project(camera);
            const x = (screenPos.x * 0.5 + 0.5) * width;
            const y = (-screenPos.y * 0.5 + 0.5) * height;
            labels.push({
              id: pin.userData.siteId,
              name: pin.userData.siteName.replace(' (Odysseus)', '').replace(' (Shiv Shakti Point)', '').replace(' Crater Rim', '').replace(' Massif', ''),
              lat: pin.userData.lat,
              x,
              y
            });
          }
        });
        setScreenLabels(labels);
      } else {
        if (screenLabels.length > 0) setScreenLabels([]);
      }

      // Orbital Spacecraft motion in moon-orbit
      if (el.phase === 'moon-orbit' && el.orbitalSpacecraft) {
        const orbitAngle = elapsed * 0.35;
        const orbitRadius = MOON_RADIUS + 3.4;
        el.orbitalSpacecraft.position.set(
          Math.cos(orbitAngle) * orbitRadius,
          Math.sin(orbitAngle * 1.4) * 1.5,
          Math.sin(orbitAngle) * orbitRadius
        );
        const tangent = new THREE.Vector3(
          -Math.sin(orbitAngle),
          Math.cos(orbitAngle * 1.4) * 0.4,
          Math.cos(orbitAngle)
        ).normalize();
        el.orbitalSpacecraft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      }

      // PHASE A: ZOOMING TO MOON ORBIT
      if (el.phase === 'zooming-to-moon') {
        el.progress = Math.min(1.0, el.progress + delta * 0.5);
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

      // PHASE B: DESCENT TO CHOSEN SURFACE COORDINATES
      else if (el.phase === 'descent') {
        el.progress = Math.min(1.0, el.progress + delta * 0.65);
        const t = el.progress;
        const ease = 1 - Math.pow(1 - t, 3);

        const targetWorld = new THREE.Vector3();
        targetReticle.getWorldPosition(targetWorld);

        const moonWorld = new THREE.Vector3();
        moonMesh.getWorldPosition(moonWorld);
        const normalWorld = targetWorld.clone().sub(moonWorld).normalize();

        // Orbital spacecraft descends directly to targeted landing spot
        if (el.orbitalSpacecraft) {
          const craftStart = el.craftDescentStart || el.orbitalSpacecraft.position.clone();
          const targetHover = targetWorld.clone().add(normalWorld.clone().multiplyScalar(0.3));
          el.orbitalSpacecraft.position.lerpVectors(craftStart, targetHover, ease);
          el.orbitalSpacecraft.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), normalWorld);
        }

        const startCam = el.startCamPos || new THREE.Vector3(48, 2, 42);
        const closeCam = targetWorld.clone().add(normalWorld.clone().multiplyScalar(4.5));
        camera.position.lerpVectors(startCam, closeCam, ease);
        camera.lookAt(targetWorld);

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
      container.removeEventListener('wheel', onWheel);
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

  // Update reticle position whenever selected site or coordinates change
  useEffect(() => {
    const el = sceneElementsRef.current;
    if (!el || !el.targetReticle || customPointedCoords) return;
    const currentSite = sites.find(s => s.id === selectedSiteId) || sites[0];
    if (currentSite) {
      const pos = latLonToVector3(currentSite.lat, currentSite.lon, 10.5 + 0.04);
      el.targetReticle.position.copy(pos);
      const normal = pos.clone().normalize();
      el.targetReticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    }
  }, [selectedSiteId, sites, customPointedCoords]);

  // Handlers
  const handleInitiateApproach = () => {
    if (sceneElementsRef.current) {
      sceneElementsRef.current.phase = 'zooming-to-moon';
      sceneElementsRef.current.progress = 0;
      setPhase('zooming-to-moon');
    }
  };

  const handleDescendToSite = () => {
    if (sceneElementsRef.current) {
      sceneElementsRef.current.phase = 'descent';
      sceneElementsRef.current.progress = 0;
      sceneElementsRef.current.startCamPos = sceneElementsRef.current.camera.position.clone();
      if (sceneElementsRef.current.orbitalSpacecraft) {
        sceneElementsRef.current.craftDescentStart = sceneElementsRef.current.orbitalSpacecraft.position.clone();
      }
      setPhase('descent');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Dynamic 3D Landmark Labels Screen Overlay */}
      {phase === 'moon-orbit' && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {screenLabels.map((lbl) => (
            <div
              key={lbl.id}
              style={{
                position: 'absolute',
                left: `${lbl.x}px`,
                top: `${lbl.y}px`,
                transform: 'translate(-50%, -130%)'
              }}
              className="bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-lg border-0 shadow-lg text-[10px] font-mono text-slate-200 pointer-events-auto cursor-pointer hover:bg-sky-500 hover:text-black transition flex items-center gap-1"
              onClick={() => {
                setCustomPointedCoords(null);
                if (onSelectSite) onSelectSite(lbl.id);
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              <span>{lbl.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* 1. OVERVIEW SCREEN: Center Card */}
      {phase === 'overview' && (
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-center p-6 bg-radial from-transparent via-black/20 to-black/70 pointer-events-none">
          <div className="max-w-lg w-full bg-black/45 backdrop-blur-2xl border-0 rounded-3xl p-6 sm:p-8 space-y-5 shadow-[0_10px_50px_rgba(0,0,0,0.8)] pointer-events-auto text-center animate-in fade-in zoom-in-95 duration-500">
            <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold px-3 py-1 rounded-full bg-sky-500/10">
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
                className="w-full sm:flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-black font-bold text-xs tracking-wider uppercase font-mono transition-all transform hover:scale-[1.02] shadow-[0_0_30px_rgba(56,189,248,0.5)] cursor-pointer flex items-center justify-center gap-2 border-0"
              >
                <span>Enter Lunar Orbit</span>
                <span className="text-sm">&rarr;</span>
              </button>
              <button
                onClick={onSkipIntro}
                className="w-full sm:w-auto py-3.5 px-5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-mono transition cursor-pointer border-0"
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
          <div className="max-w-md w-full bg-slate-950/70 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-6 space-y-4 shadow-[0_20px_60px_rgba(0,0,0,0.85)] pointer-events-auto animate-in slide-in-from-left duration-400">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[10px] font-mono tracking-widest text-sky-400 uppercase font-bold block">
                  ORBITAL TARGETING
                </span>
                <h2 className="text-lg font-display font-bold text-white mt-0.5">
                  Point Landing Spot & Date
                </h2>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
            </div>

            {/* Interactive Instructions */}
            <div className="bg-sky-500/10 border border-sky-400/20 rounded-2xl p-3 text-[11px] font-mono text-sky-300 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping shrink-0"></span>
              <span><strong>Interactive:</strong> Drag to rotate Moon 360°. Click any spot on the Moon to designate landing coordinates.</span>
            </div>

            {/* Target Site Selector */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-mono">
                <span className="text-slate-400 uppercase font-semibold">Selected Coordinates:</span>
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
                className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-xs font-mono cursor-pointer focus:outline-none focus:border-sky-400 transition"
              >
                {customPointedCoords && (
                  <option value="custom">{activeSite.name}</option>
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
                  className="w-full bg-black/60 border border-white/10 rounded-xl px-2.5 py-1.5 text-slate-200 text-xs font-mono focus:outline-none focus:border-sky-400"
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

            {/* Descent CTA */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleDescendToSite}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-400 to-cyan-400 hover:from-sky-300 hover:to-cyan-300 text-black font-bold text-xs font-mono tracking-wider uppercase transition-all transform hover:scale-[1.02] shadow-[0_0_25px_rgba(56,189,248,0.5)] cursor-pointer flex items-center justify-center gap-2 border-0"
              >
                <span>Initiate Powered Descent</span>
                <span className="text-sm">&rarr;</span>
              </button>
              <div className="text-[10px] text-slate-400 font-mono text-center">
                Target touchdown: {activeSite.name}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpaceIntroScene;
