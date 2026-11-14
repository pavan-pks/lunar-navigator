import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';

/**
 * Convert lunar latitude and longitude to 3D sphere cartesian coordinates.
 */
export function latLonToVector3(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

/**
 * Creates high-precision landing target reticle flush with lunar surface.
 */
function createLandingReticle() {
  const group = new THREE.Group();

  const dotGeo = new THREE.SphereGeometry(0.2, 16, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  group.add(dot);

  const innerRingGeo = new THREE.RingGeometry(0.4, 0.58, 32);
  const innerRingMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  group.add(innerRing);

  const outerRingGeo = new THREE.RingGeometry(0.85, 1.15, 32);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  group.add(outerRing);

  const tickMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  const tickGeo = new THREE.PlaneGeometry(0.08, 0.4);
  for (let i = 0; i < 4; i++) {
    const tick = new THREE.Mesh(tickGeo, tickMat);
    const angle = (i * Math.PI) / 2;
    tick.position.set(Math.cos(angle) * 1.4, Math.sin(angle) * 1.4, 0);
    tick.rotation.z = angle + Math.PI / 2;
    group.add(tick);
  }

  group.userData = { outerRing };
  return group;
}

/**
 * Creates an Artemis Orion / CLPS orbital spacecraft 3D model with engine nozzle.
 */
function createOrbitalSpacecraft() {
  const group = new THREE.Group();

  const capsuleGeo = new THREE.ConeGeometry(0.3, 0.4, 16);
  const capsuleMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3, metalness: 0.4 });
  const capsule = new THREE.Mesh(capsuleGeo, capsuleMat);
  capsule.position.set(0, 0.3, 0);
  group.add(capsule);

  const windowGeo = new THREE.BoxGeometry(0.1, 0.06, 0.04);
  const windowMat = new THREE.MeshBasicMaterial({ color: 0x0a101d });
  const windowMesh = new THREE.Mesh(windowGeo, windowMat);
  windowMesh.position.set(0, 0.3, 0.18);
  group.add(windowMesh);

  const smGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.36, 16);
  const smMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.6 });
  const sm = new THREE.Mesh(smGeo, smMat);
  group.add(sm);

  const goldGeo = new THREE.CylinderGeometry(0.305, 0.305, 0.15, 16);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xdf8a08, roughness: 0.25, metalness: 0.88 });
  const goldBand = new THREE.Mesh(goldGeo, goldMat);
  goldBand.position.set(0, -0.05, 0);
  group.add(goldBand);

  // Engine nozzle
  const engineGeo = new THREE.ConeGeometry(0.14, 0.24, 16, 1, true);
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.5, metalness: 0.8 });
  const engine = new THREE.Mesh(engineGeo, engineMat);
  engine.position.set(0, -0.28, 0);
  group.add(engine);

  // 4 X-Wing Solar Arrays
  const solarMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.18, metalness: 0.85 });
  const wingGeo = new THREE.BoxGeometry(0.5, 0.14, 0.015);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const wing = new THREE.Mesh(wingGeo, solarMat);
    wing.position.set(Math.cos(angle) * 0.52, 0.05, Math.sin(angle) * 0.52);
    wing.rotation.y = angle;
    wing.rotation.z = 0.2;
    group.add(wing);
  }

  // Engine Plasma Thrust Particle Cone (Additive Blended)
  const plumeGeo = new THREE.ConeGeometry(0.2, 1.2, 16, 1, true);
  plumeGeo.translate(0, -0.6, 0);
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const plume = new THREE.Mesh(plumeGeo, plumeMat);
  plume.position.set(0, -0.28, 0);
  group.add(plume);
  group.userData = { plume };

  group.scale.set(1.4, 1.4, 1.4);
  return group;
}

/**
 * Creates Ground Dust Kickup Ring Mesh (Regolith kickup at 50m to touchdown).
 */
function createGroundDustRing() {
  const ringGeo = new THREE.RingGeometry(0.2, 1.4, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  return ring;
}

/**
 * Displace lunar mesh vertices in the South Pole region (lat < -75°) based on LOLA data.
 */
function applyLolaSouthPoleTopography(geometry, radius) {
  const posAttr = geometry.attributes.position;
  const count = posAttr.count;

  const features = [
    { lat: -89.9, lon: 129.8, rDeg: 1.8, depth: -0.35, rimHeight: 0.14 },
    { lat: -85.9, lon: 357.0, rDeg: 3.2, depth: 0.0, rimHeight: 0.42 },
    { lat: -87.4, lon: 355.0, rDeg: 2.2, depth: -0.28, rimHeight: 0.11 },
    { lat: -87.3, lon: 84.3, rDeg: 2.0, depth: -0.26, rimHeight: 0.10 },
    { lat: -85.2, lon: 53.5, rDeg: 3.5, depth: -0.22, rimHeight: 0.09 },
    { lat: -84.5, lon: 85.6, rDeg: 3.8, depth: -0.25, rimHeight: 0.18 }
  ];

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);

    const curR = Math.hypot(x, y, z);
    const lat = Math.asin(Math.max(-1, Math.min(1, y / curR))) * (180 / Math.PI);

    if (lat < -75) {
      let theta = Math.atan2(z, -x);
      if (theta < 0) theta += Math.PI * 2;
      let lon = theta * (180 / Math.PI) - 180;
      if (lon < -180) lon += 360;
      if (lon > 180) lon -= 360;

      let deltaR = 0;
      for (let f = 0; f < features.length; f++) {
        const feat = features[f];
        const dLat = lat - feat.lat;
        let dLon = (lon - feat.lon) * Math.cos((feat.lat * Math.PI) / 180);
        const distDeg = Math.hypot(dLat, dLon);

        if (distDeg < feat.rDeg * 2.2) {
          const u = distDeg / feat.rDeg;
          if (feat.depth < 0) {
            if (u < 1.0) {
              deltaR += feat.depth * (1.0 - u * u);
            } else if (u < 2.0) {
              const rimDist = (u - 1.0) / 0.4;
              deltaR += feat.rimHeight * Math.exp(-rimDist * rimDist);
            }
          } else {
            deltaR += feat.rimHeight * Math.exp(-Math.pow(distDeg / feat.rDeg, 2));
          }
        }
      }

      if (deltaR !== 0) {
        const factor = (radius + deltaR) / curR;
        posAttr.setXYZ(i, x * factor, y * factor, z * factor);
      }
    }
  }

  posAttr.needsUpdate = true;
  geometry.computeVertexNormals();
}

/**
 * Cinematic 3D Space Universe & Targeting Computer:
 * Implements diegetic lock-on auto-rotation, scanning cursor hover,
 * LOLA South Pole topography, grazing shadows, and cinematic GSAP descent sequence.
 */
export const CinematicSpaceUniverse = forwardRef(function CinematicSpaceUniverse(
  {
    mode = 'macro',
    sites = [],
    selectedSiteId = 'shackleton',
    onSelectSite,
    onReachedOrbit,
    onLanderTouchdown,
    onUpdateCraterScreenPos,
    sunEl = 5.0,
    sunAz = 180.0,
    earthEl = 5.0,
    earthAz = 0.0,
    customCoords = null,
    onPointCustomCoords
  },
  ref
) {
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    moonMesh: null,
    moonGroup: null,
    earthMesh: null,
    sunMesh: null,
    grazingSunLight: null,
    targetReticle: null,
    hoverRing: null,
    landmarkPins: [],
    orbitalSpacecraft: null,
    groundDustRing: null,
    mode: 'macro',
    transitionProgress: 0,
    hasUserInteracted: false,
    zoomDistance: 32,
    satelliteState: 'orbiting',
    cameraShakeIntensity: 0
  });

  const [hoverScan, setHoverScan] = useState(null); // { lat, lon, screenX, screenY }

  const activeSite = customCoords
    ? { id: 'pointed-site', name: `Landing Reticle (${customCoords.lat.toFixed(1)}°, ${customCoords.lon.toFixed(1)}°)`, lat: customCoords.lat, lon: customCoords.lon }
    : (sites.find(s => s.id === selectedSiteId) || sites[0] || { name: 'Shackleton Crater Rim', lat: -89.9, lon: 129.8 });

  // Expose trigger methods to parent via ref
  useImperativeHandle(ref, () => ({
    startMissionTransition: () => {
      const s = stateRef.current;
      if (!s) return;
      s.mode = 'transition';
      s.transitionProgress = 0;
    },
    resetToMacro: () => {
      const s = stateRef.current;
      if (!s) return;
      s.mode = 'macro';
      s.transitionProgress = 0;
      s.hasUserInteracted = false;
      s.satelliteState = 'orbiting';
      if (s.orbitalSpacecraft?.userData?.plume) {
        s.orbitalSpacecraft.userData.plume.material.opacity = 0;
      }
    },
    focusSite: (siteId) => {
      const s = stateRef.current;
      if (!s || !s.moonMesh) return;
      const targetSite = sites.find(st => st.id === siteId);
      if (!targetSite) return;

      // Diegetic Lock-on: Smoothly auto-rotate Moon so the chosen crater centers dead-center!
      const targetVec = latLonToVector3(targetSite.lat, targetSite.lon, 1).normalize();
      const desiredDir = new THREE.Vector3(0, 0, 1); // Directly facing camera in z-axis
      const qTarget = new THREE.Quaternion().setFromUnitVectors(targetVec, desiredDir);

      gsap.to(s.moonMesh.quaternion, {
        x: qTarget.x,
        y: qTarget.y,
        z: qTarget.z,
        w: qTarget.w,
        duration: 1.4,
        ease: 'power2.out',
        onUpdate: () => {
          s.moonMesh.quaternion.normalize();
        }
      });
      s.hasUserInteracted = true;
    },
    // Trigger the Cinematic Descent Sequence (GSAP timeline with retro propulsion & dust)
    triggerCinematicDescent: (onComplete) => {
      executeCinematicDescent(onComplete);
    }
  }));

  // Cinematic GSAP Lander Descent Sequence
  const executeCinematicDescent = (onComplete) => {
    const s = stateRef.current;
    if (!s || !s.orbitalSpacecraft || !s.targetReticle || !s.moonMesh) return;

    s.satelliteState = 'descending';
    const craft = s.orbitalSpacecraft;
    const plume = craft.userData?.plume;
    const dust = s.groundDustRing;

    // Get touchdown target world coordinates
    const targetWorld = new THREE.Vector3();
    s.targetReticle.getWorldPosition(targetWorld);

    const moonWorld = new THREE.Vector3();
    s.moonMesh.getWorldPosition(moonWorld);
    const surfaceNormal = targetWorld.clone().sub(moonWorld).normalize();

    // High de-orbit start point
    const deorbitStart = targetWorld.clone().add(surfaceNormal.clone().multiplyScalar(16)).add(new THREE.Vector3(5, 4, 3));
    craft.position.copy(deorbitStart);

    // Parabolic waypoint at 50m scale
    const waypoint50m = targetWorld.clone().add(surfaceNormal.clone().multiplyScalar(4.5));
    const touchdownPad = targetWorld.clone().add(surfaceNormal.clone().multiplyScalar(0.2));

    // Align dust ring flush at landing pad
    if (dust) {
      dust.position.copy(targetWorld.clone().add(surfaceNormal.clone().multiplyScalar(0.02)));
      dust.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal);
      dust.material.opacity = 0;
      dust.scale.set(0.1, 0.1, 0.1);
    }

    // GSAP Master Descent Timeline
    const tl = gsap.timeline({
      onComplete: () => {
        s.satelliteState = 'landed';
        if (plume) plume.material.opacity = 0;
        if (onLanderTouchdown) onLanderTouchdown();
        if (onComplete) onComplete();
      }
    });

    // 1. Activate Retro-Propulsion Plasma Plume
    if (plume) {
      tl.to(plume.material, { opacity: 0.85, duration: 0.3, ease: 'power1.in' }, 0);
    }

    // 2. Parabolic Descent along Curve to 50m above ground
    tl.to(craft.position, {
      x: waypoint50m.x,
      y: waypoint50m.y,
      z: waypoint50m.z,
      duration: 1.8,
      ease: 'power2.inOut'
    }, 0);

    // 3. Final Touchdown Descent to Pad
    tl.to(craft.position, {
      x: touchdownPad.x,
      y: touchdownPad.y,
      z: touchdownPad.z,
      duration: 1.2,
      ease: 'power1.out'
    }, 1.8);

    // 4. Trigger expanding regolith dust ring at 50m
    if (dust) {
      tl.to(dust.material, { opacity: 0.6, duration: 0.4 }, 1.8);
      tl.to(dust.scale, { x: 4.5, y: 4.5, z: 4.5, duration: 1.4, ease: 'power2.out' }, 1.8);
      tl.to(dust.material, { opacity: 0, duration: 0.8, ease: 'power1.out' }, 2.4);
    }

    // 5. Touchdown impact: execute 0.5s high-frequency procedural camera shake
    tl.add(() => {
      s.cameraShakeIntensity = 0.55;
      gsap.to(s, {
        cameraShakeIntensity: 0,
        duration: 0.5,
        ease: 'power2.out'
      });
      if (plume) {
        gsap.to(plume.material, { opacity: 0, duration: 0.2 });
      }
    }, 3.0);
  };

  useEffect(() => {
    stateRef.current.mode = mode;
  }, [mode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene, Camera, High-Performance WebGL Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 12000);
    camera.position.set(0, 160, 420);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    container.appendChild(renderer.domElement);

    // 2. High-Density Deep Space Starfield
    const starCount = 5000;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 1200 + Math.random() * 1200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const val = 0.8 + Math.random() * 0.2;
      starColors[i * 3] = val;
      starColors[i * 3 + 1] = val;
      starColors[i * 3 + 2] = val + Math.random() * 0.1;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.4, vertexColors: true, transparent: true, opacity: 0.9 });
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

    // 4. Glowing Sun Core & Corona
    const sunPos = new THREE.Vector3(-340, 70, -200);
    const sunGeo = new THREE.SphereGeometry(38, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex, color: 0xffffff });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.copy(sunPos);
    scene.add(sunMesh);

    const coronaGeo = new THREE.SphereGeometry(46, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({ color: 0xffd25a, transparent: true, opacity: 0.32, side: THREE.BackSide });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    coronaMesh.position.copy(sunPos);
    scene.add(coronaMesh);

    const sunPointLight = new THREE.PointLight(0xfffaec, 4.2, 5000, 0.2);
    sunPointLight.position.copy(sunPos);
    scene.add(sunPointLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.04);
    scene.add(ambientLight);

    // 5. Earth in Orbit
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-36, 0, 48);
    scene.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(18, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.45,
      metalness: 0.1,
      emissive: 0x091b2e,
      emissiveIntensity: 0.35
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = (23.44 * Math.PI) / 180;
    earthGroup.add(earthMesh);

    const atmoGeo = new THREE.SphereGeometry(19.3, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32, side: THREE.BackSide });
    earthGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

    // 6. High-Resolution LOLA Topographic Moon Sphere with PBR Regolith
    const MOON_RADIUS = 10.5;
    const moonGroup = new THREE.Group();
    moonGroup.position.set(48, 8, 15);
    scene.add(moonGroup);

    const moonGeo = new THREE.SphereGeometry(MOON_RADIUS, 128, 128);
    applyLolaSouthPoleTopography(moonGeo, MOON_RADIUS);

    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      bumpMap: moonBumpTex,
      bumpScale: 0.28,
      roughness: 0.96,
      metalness: 0.0,
      emissive: 0x050608,
      emissiveIntensity: 0.1
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    moonMesh.rotation.set(-0.35, 0, 0);
    moonGroup.add(moonMesh);

    // High-Resolution Grazing Sun Directional Light (4096 shadow map)
    const grazingSunLight = new THREE.DirectionalLight(0xfff8ee, 3.8);
    grazingSunLight.castShadow = true;
    grazingSunLight.shadow.mapSize.width = 4096;
    grazingSunLight.shadow.mapSize.height = 4096;
    grazingSunLight.shadow.camera.near = 1;
    grazingSunLight.shadow.camera.far = 160;
    grazingSunLight.shadow.camera.left = -14;
    grazingSunLight.shadow.camera.right = 14;
    grazingSunLight.shadow.camera.top = 14;
    grazingSunLight.shadow.camera.bottom = -14;
    grazingSunLight.shadow.bias = -0.00015;
    grazingSunLight.target = moonGroup;
    scene.add(grazingSunLight);

    // Scanning Mode: Illuminated hover ring cast on the lunar surface
    const hoverRingGeo = new THREE.RingGeometry(0.25, 0.45, 32);
    const hoverRingMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    const hoverRing = new THREE.Mesh(hoverRingGeo, hoverRingMat);
    moonMesh.add(hoverRing);

    // Mapped Landmark 3D Pins
    const landmarkPins = [];
    sites.forEach((site) => {
      const pinPos = latLonToVector3(site.lat, site.lon, MOON_RADIUS + 0.12);
      const pinGeo = new THREE.SphereGeometry(0.32, 16, 16);
      const isSelected = site.id === selectedSiteId;
      const pinMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x38bdf8 : (site.lat < -80 ? 0xffd25a : 0x10b981)
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pinPos);
      pinMesh.userData = { siteId: site.id, siteName: site.name, lat: site.lat, lon: site.lon };
      moonMesh.add(pinMesh);
      landmarkPins.push(pinMesh);
    });

    // Dynamic Landing Reticle
    const targetReticle = createLandingReticle();
    const initReticlePos = latLonToVector3(activeSite.lat, activeSite.lon, MOON_RADIUS + 0.04);
    targetReticle.position.copy(initReticlePos);
    const initNormal = initReticlePos.clone().normalize();
    targetReticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), initNormal);
    moonMesh.add(targetReticle);

    // 3D Orbital Spacecraft / Lander
    const orbitalSpacecraft = createOrbitalSpacecraft();
    moonGroup.add(orbitalSpacecraft);

    // Ground Dust Kickup Ring
    const groundDustRing = createGroundDustRing();
    moonGroup.add(groundDustRing);

    // Save state
    stateRef.current = {
      scene,
      camera,
      renderer,
      moonMesh,
      moonGroup,
      earthMesh,
      sunMesh,
      grazingSunLight,
      targetReticle,
      hoverRing,
      landmarkPins,
      orbitalSpacecraft,
      groundDustRing,
      mode: mode,
      transitionProgress: 0,
      hasUserInteracted: false,
      zoomDistance: 32,
      satelliteState: 'orbiting',
      cameraShakeIntensity: 0
    };

    // 7. Interactive Free Drag-to-Rotate & Scanning Mode Hover
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
      const s = stateRef.current;
      if (!s) return;

      if (isDragging) {
        const dx = e.clientX - prevPointer.x;
        const dy = e.clientY - prevPointer.y;
        dragDistance += Math.abs(dx) + Math.abs(dy);
        prevPointer = { x: e.clientX, y: e.clientY };

        if (s.mode === 'orbit' || s.mode === 'compare') {
          s.hasUserInteracted = true;
          const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
          const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

          const qYaw = new THREE.Quaternion().setFromAxisAngle(camUp, dx * 0.007);
          const qPitch = new THREE.Quaternion().setFromAxisAngle(camRight, dy * 0.007);

          s.moonMesh.quaternion.premultiply(qYaw);
          s.moonMesh.quaternion.premultiply(qPitch);
        }
      } else {
        // Scanning Mode (Hover State): cast illuminated ring on Moon surface + floating coordinate readout
        if (s.mode === 'orbit' && s.hoverRing && s.moonMesh) {
          const rect = container.getBoundingClientRect();
          mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(mouse, camera);

          const intersects = raycaster.intersectObject(s.moonMesh, false);
          if (intersects.length > 0) {
            const hit = intersects[0];
            const localPoint = s.moonMesh.worldToLocal(hit.point.clone());
            const r = localPoint.length();
            const lat = Math.asin(Math.max(-1, Math.min(1, localPoint.y / r))) * (180 / Math.PI);
            let theta = Math.atan2(localPoint.z, -localPoint.x);
            if (theta < 0) theta += Math.PI * 2;
            let lon = theta * (180 / Math.PI) - 180;
            if (lon < -180) lon += 360;
            if (lon > 180) lon -= 360;

            const normal = localPoint.clone().normalize();
            s.hoverRing.position.copy(normal.clone().multiplyScalar(MOON_RADIUS + 0.03));
            s.hoverRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
            s.hoverRing.material.opacity = 0.75;

            setHoverScan({
              lat,
              lon,
              screenX: e.clientX,
              screenY: e.clientY
            });
          } else {
            s.hoverRing.material.opacity = 0;
            setHoverScan(null);
          }
        }
      }
    };

    const onPointerUp = (e) => {
      isDragging = false;
      const s = stateRef.current;
      if (!s || (s.mode !== 'orbit' && s.mode !== 'compare')) return;

      if (dragDistance < 6) {
        s.hasUserInteracted = true;
        const rect = container.getBoundingClientRect();
        mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);

        // Click on landmark pin
        const pinIntersects = raycaster.intersectObjects(landmarkPins, false);
        if (pinIntersects.length > 0) {
          const hitPin = pinIntersects[0].object;
          if (hitPin.userData?.siteId && onSelectSite) {
            onSelectSite(hitPin.userData.siteId);
            return;
          }
        }

        // Click anywhere on Moon surface to designate landing site
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

          if (onPointCustomCoords) {
            onPointCustomCoords({ lat, lon });
          }
        }
      }
    };

    const onWheel = (e) => {
      const s = stateRef.current;
      if (!s || (s.mode !== 'orbit' && s.mode !== 'compare')) return;
      e.preventDefault();
      s.zoomDistance = Math.max(16, Math.min(60, s.zoomDistance + e.deltaY * 0.03));
    };

    container.addEventListener('pointerdown', onPointerDown);
    container.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

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

      earthMesh.rotation.y += delta * 0.1;
      sunMesh.rotation.y += delta * 0.02;

      // Pulse reticle
      const outerRing = targetReticle.userData?.outerRing;
      if (outerRing) {
        const sScale = 1.0 + Math.sin(elapsed * 4) * 0.15;
        outerRing.scale.set(sScale, sScale, sScale);
        outerRing.material.opacity = 0.5 + Math.sin(elapsed * 4) * 0.3;
      }

      const s = stateRef.current;
      if (!s) return;

      // Idle spin before user interaction in orbit
      if ((s.mode === 'orbit' || s.mode === 'compare') && !s.hasUserInteracted && !isDragging) {
        const idleSpin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.02);
        moonMesh.quaternion.multiply(idleSpin);
      }

      // Orbital Spacecraft circular orbit when not descending
      if (s.orbitalSpacecraft && s.satelliteState === 'orbiting') {
        const orbitAngle = elapsed * 0.35;
        const orbitRadius = MOON_RADIUS + 3.2;
        s.orbitalSpacecraft.position.set(
          Math.cos(orbitAngle) * orbitRadius,
          Math.sin(orbitAngle * 1.4) * 1.4,
          Math.sin(orbitAngle) * orbitRadius
        );
        const tangent = new THREE.Vector3(
          -Math.sin(orbitAngle),
          Math.cos(orbitAngle * 1.4) * 0.35,
          Math.cos(orbitAngle)
        ).normalize();
        s.orbitalSpacecraft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      }

      // Project target reticle to 2D screen coordinate for dynamic SVG callout line
      if (s.targetReticle && onUpdateCraterScreenPos) {
        const reticleWorld = new THREE.Vector3();
        s.targetReticle.getWorldPosition(reticleWorld);

        const moonWorld = new THREE.Vector3();
        s.moonMesh.getWorldPosition(moonWorld);
        const dirToCam = camera.position.clone().sub(reticleWorld).normalize();
        const normal = reticleWorld.clone().sub(moonWorld).normalize();

        // Only emit if reticle is facing towards camera
        if (dirToCam.dot(normal) > 0.05) {
          const screenPos = reticleWorld.clone().project(camera);
          const x = (screenPos.x * 0.5 + 0.5) * width;
          const y = (-screenPos.y * 0.5 + 0.5) * height;
          onUpdateCraterScreenPos({ x, y });
        } else {
          onUpdateCraterScreenPos(null);
        }
      }

      // CAMERA PATHING & TRANSITIONS
      if (s.mode === 'macro') {
        const panAngle = elapsed * 0.04;
        const macroCamPos = new THREE.Vector3(
          Math.sin(panAngle) * 80 + 20,
          150 + Math.sin(elapsed * 0.05) * 15,
          400 + Math.cos(panAngle) * 40
        );
        camera.position.lerp(macroCamPos, 0.04);
        camera.lookAt(0, 10, 0);
      } else if (s.mode === 'transition') {
        s.transitionProgress = Math.min(1.0, s.transitionProgress + delta * 0.45);
        const t = s.transitionProgress;
        const ease = 1 - Math.pow(1 - t, 3);

        const startCam = new THREE.Vector3(0, 160, 420);
        const earthWaypoint = new THREE.Vector3(-18, 22, 90);
        const moonOrbitCam = new THREE.Vector3(48, 12, 15 + s.zoomDistance);

        const p0 = startCam;
        const p1 = earthWaypoint;
        const p2 = moonOrbitCam;
        const currentCamPos = new THREE.Vector3()
          .copy(p0).multiplyScalar((1 - ease) * (1 - ease))
          .add(p1.clone().multiplyScalar(2 * (1 - ease) * ease))
          .add(p2.clone().multiplyScalar(ease * ease));

        camera.position.copy(currentCamPos);

        const lookStart = new THREE.Vector3(0, 0, 0);
        const lookMoon = new THREE.Vector3(48, 8, 15);
        const currentLook = new THREE.Vector3().lerpVectors(lookStart, lookMoon, ease);
        camera.lookAt(currentLook);

        if (t >= 1.0) {
          s.mode = 'orbit';
          if (onReachedOrbit) onReachedOrbit();
        }
      } else if (s.mode === 'orbit' || s.mode === 'compare') {
        const moonCenter = new THREE.Vector3(48, 8, 15);
        const targetCamPos = new THREE.Vector3(48, 12, 15 + s.zoomDistance);

        // Procedural camera shake on touchdown impact
        if (s.cameraShakeIntensity > 0.001) {
          const shakeX = (Math.random() - 0.5) * s.cameraShakeIntensity * 2.5;
          const shakeY = (Math.random() - 0.5) * s.cameraShakeIntensity * 2.5;
          targetCamPos.x += shakeX;
          targetCamPos.y += shakeY;
        }

        camera.position.lerp(targetCamPos, 0.08);
        camera.lookAt(moonCenter);
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

  // Update dynamic grazing sunlight position
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !s.grazingSunLight || !s.moonGroup) return;

    const azRad = (sunAz * Math.PI) / 180;
    const elRad = (sunEl * Math.PI) / 180;
    const dist = 65;

    const lx = dist * Math.cos(elRad) * Math.sin(azRad);
    const ly = dist * Math.sin(elRad);
    const lz = dist * Math.cos(elRad) * Math.cos(azRad);

    const moonCenter = new THREE.Vector3(48, 8, 15);
    s.grazingSunLight.position.set(moonCenter.x + lx, moonCenter.y + ly, moonCenter.z + lz);
  }, [sunEl, sunAz]);

  // Update reticle position when active site changes
  useEffect(() => {
    const s = stateRef.current;
    if (!s || !s.targetReticle || !s.moonMesh) return;
    const pos = latLonToVector3(activeSite.lat, activeSite.lon, 10.5 + 0.04);
    s.targetReticle.position.copy(pos);
    const normal = pos.clone().normalize();
    s.targetReticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }, [activeSite]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none">
      {/* 3D Canvas Mount (Captures drag and scroll across center 60% of screen) */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating Cursor Coordinate Tag in Scanning Mode */}
      {hoverScan && (
        <div
          style={{
            position: 'fixed',
            left: `${hoverScan.screenX + 16}px`,
            top: `${hoverScan.screenY + 16}px`
          }}
          className="pointer-events-none z-30 bg-black/75 backdrop-blur-md px-2.5 py-1 rounded border border-cyan-400/50 shadow-lg font-mono text-[9px] text-cyan-300"
        >
          SCAN: {Math.abs(hoverScan.lat).toFixed(1)}°{hoverScan.lat < 0 ? 'S' : 'N'}, {Math.abs(hoverScan.lon).toFixed(1)}°{hoverScan.lon >= 0 ? 'E' : 'W'}
        </div>
      )}
    </div>
  );
});

export default CinematicSpaceUniverse;
