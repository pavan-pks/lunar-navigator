import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { createPRNG } from './noise.js';
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
 * Creates minimalist, whisper-thin landing reticle flush with lunar surface.
 */
function createLandingReticle() {
  const group = new THREE.Group();

  const dotGeo = new THREE.SphereGeometry(0.18, 16, 16);
  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  group.add(dot);

  const innerRingGeo = new THREE.RingGeometry(0.38, 0.48, 32);
  const innerRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.45 });
  const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
  group.add(innerRing);

  const outerRingGeo = new THREE.RingGeometry(0.85, 0.95, 32);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.25
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  group.add(outerRing);

  group.userData = { outerRing };
  return group;
}

/**
 * Creates an Artemis Orion / CLPS orbital spacecraft 3D model with subtle thruster.
 */
function createOrbitalSpacecraft() {
  const group = new THREE.Group();

  const capsuleGeo = new THREE.ConeGeometry(0.3, 0.4, 16);
  const capsuleMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4, metalness: 0.3 });
  const capsule = new THREE.Mesh(capsuleGeo, capsuleMat);
  capsule.position.set(0, 0.3, 0);
  group.add(capsule);

  const smGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.36, 16);
  const smMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d4, roughness: 0.4, metalness: 0.5 });
  const sm = new THREE.Mesh(smGeo, smMat);
  group.add(sm);

  const goldGeo = new THREE.CylinderGeometry(0.305, 0.305, 0.15, 16);
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 });
  const goldBand = new THREE.Mesh(goldGeo, goldMat);
  goldBand.position.set(0, -0.05, 0);
  group.add(goldBand);

  const engineGeo = new THREE.ConeGeometry(0.14, 0.24, 16, 1, true);
  const engineMat = new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.5, metalness: 0.8 });
  const engine = new THREE.Mesh(engineGeo, engineMat);
  engine.position.set(0, -0.28, 0);
  group.add(engine);

  // 4 Solar Array Wings
  const solarMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.2, metalness: 0.8 });
  const wingGeo = new THREE.BoxGeometry(0.5, 0.14, 0.015);
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const wing = new THREE.Mesh(wingGeo, solarMat);
    wing.position.set(Math.cos(angle) * 0.52, 0.05, Math.sin(angle) * 0.52);
    wing.rotation.y = angle;
    wing.rotation.z = 0.2;
    group.add(wing);
  }

  // Soft, Natural Warm Exhaust Plume
  const plumeGeo = new THREE.ConeGeometry(0.18, 1.0, 16, 1, true);
  plumeGeo.translate(0, -0.5, 0);
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xfff7ed,
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
 * Creates subtle, realistic lunar dust kickup ring.
 */
function createGroundDustRing() {
  const ringGeo = new THREE.RingGeometry(0.2, 1.2, 32);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x737373,
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
 * Cinematic 3D Space Universe & Minimalist Astronomical Camera:
 * Fluid, slow cinematic pacing (expo.inOut) and restrained, aesthetic lighting.
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

  const [hoverScan, setHoverScan] = useState(null);

  const activeSite = customCoords
    ? { id: 'pointed-site', name: `Reticle (${customCoords.lat.toFixed(1)}°, ${customCoords.lon.toFixed(1)}°)`, lat: customCoords.lat, lon: customCoords.lon }
    : (sites.find(s => s.id === selectedSiteId) || sites[0] || { name: 'Shackleton Crater Rim', lat: -89.9, lon: 129.8 });

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

      const targetVec = latLonToVector3(targetSite.lat, targetSite.lon, 1).normalize();
      const desiredDir = new THREE.Vector3(0, 0, 1);
      const qTarget = new THREE.Quaternion().setFromUnitVectors(targetVec, desiredDir);

      // Fluid, cinematic camera / moon auto-alignment
      gsap.to(s.moonMesh.quaternion, {
        x: qTarget.x,
        y: qTarget.y,
        z: qTarget.z,
        w: qTarget.w,
        duration: 2.2,
        ease: 'expo.inOut',
        onUpdate: () => {
          s.moonMesh.quaternion.normalize();
        }
      });
      s.hasUserInteracted = true;
    },
    triggerCinematicDescent: (onComplete) => {
      executeCinematicDescent(onComplete);
    }
  }));

  // Cinematic GSAP Descent (Fluid film pacing with expo.inOut)
  const executeCinematicDescent = (onComplete) => {
    const s = stateRef.current;
    if (!s || !s.orbitalSpacecraft || !s.targetReticle || !s.moonMesh) return;

    s.satelliteState = 'descending';
    const craft = s.orbitalSpacecraft;
    const plume = craft.userData?.plume;
    const dust = s.groundDustRing;

    const targetWorld = new THREE.Vector3();
    s.targetReticle.getWorldPosition(targetWorld);

    const moonWorld = new THREE.Vector3();
    s.moonMesh.getWorldPosition(moonWorld);
    const surfaceNormal = targetWorld.clone().sub(moonWorld).normalize();

    const deorbitStart = targetWorld.clone().add(surfaceNormal.clone().multiplyScalar(16)).add(new THREE.Vector3(5, 4, 3));
    craft.position.copy(deorbitStart);

    const waypoint50m = targetWorld.clone().add(surfaceNormal.clone().multiplyScalar(4.5));
    const touchdownPad = targetWorld.clone().add(surfaceNormal.clone().multiplyScalar(0.2));

    if (dust) {
      dust.position.copy(targetWorld.clone().add(surfaceNormal.clone().multiplyScalar(0.02)));
      dust.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), surfaceNormal);
      dust.material.opacity = 0;
      dust.scale.set(0.1, 0.1, 0.1);
    }

    const tl = gsap.timeline({
      onComplete: () => {
        s.satelliteState = 'landed';
        if (plume) plume.material.opacity = 0;
        if (onLanderTouchdown) onLanderTouchdown();
        if (onComplete) onComplete();
      }
    });

    if (plume) {
      tl.to(plume.material, { opacity: 0.5, duration: 0.6, ease: 'power2.in' }, 0);
    }

    tl.to(craft.position, {
      x: waypoint50m.x,
      y: waypoint50m.y,
      z: waypoint50m.z,
      duration: 2.6,
      ease: 'expo.inOut'
    }, 0);

    tl.to(craft.position, {
      x: touchdownPad.x,
      y: touchdownPad.y,
      z: touchdownPad.z,
      duration: 1.6,
      ease: 'power2.out'
    }, 2.6);

    if (dust) {
      tl.to(dust.material, { opacity: 0.4, duration: 0.5 }, 2.6);
      tl.to(dust.scale, { x: 4.2, y: 4.2, z: 4.2, duration: 1.8, ease: 'power2.out' }, 2.6);
      tl.to(dust.material, { opacity: 0, duration: 1.0, ease: 'power1.out' }, 3.4);
    }

    tl.add(() => {
      s.cameraShakeIntensity = 0.35;
      gsap.to(s, {
        cameraShakeIntensity: 0,
        duration: 0.5,
        ease: 'power2.out'
      });
      if (plume) {
        gsap.to(plume.material, { opacity: 0, duration: 0.3 });
      }
    }, 4.2);
  };

  useEffect(() => {
    stateRef.current.mode = mode;
  }, [mode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

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

    // High-Density Deep Space Starfield (Subtle, soft silver points)
    const starCount = 4500;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starPrng = createPRNG(7777);
    for (let i = 0; i < starCount; i++) {
      const r = 1200 + starPrng() * 1200;
      const theta = starPrng() * Math.PI * 2;
      const phi = Math.acos(2 * starPrng() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const val = 0.65 + starPrng() * 0.25;
      starColors[i * 3] = val;
      starColors[i * 3 + 1] = val;
      starColors[i * 3 + 2] = val;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.2, vertexColors: true, transparent: true, opacity: 0.75 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // Textures
    const textureLoader = new THREE.TextureLoader();
    const sunTex = textureLoader.load('/textures/nasa_sun.jpg');
    sunTex.colorSpace = THREE.SRGBColorSpace;
    const earthTex = textureLoader.load('/textures/nasa_earth_bluemarble.jpg');
    earthTex.colorSpace = THREE.SRGBColorSpace;
    const moonTex = textureLoader.load('/textures/nasa_moon_2k.jpg');
    moonTex.colorSpace = THREE.SRGBColorSpace;
    const moonBumpTex = textureLoader.load('/textures/nasa_moon_bump_2k.jpg');

    // Sun Sphere & Subtle Warm Corona
    const sunPos = new THREE.Vector3(-340, 70, -200);
    const sunGeo = new THREE.SphereGeometry(38, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({ map: sunTex, color: 0xfffcf5 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.copy(sunPos);
    scene.add(sunMesh);

    const coronaGeo = new THREE.SphereGeometry(44, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({ color: 0xfff8ee, transparent: true, opacity: 0.16, side: THREE.BackSide });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    coronaMesh.position.copy(sunPos);
    scene.add(coronaMesh);

    const sunPointLight = new THREE.PointLight(0xfffaec, 4.0, 5000, 0.2);
    sunPointLight.position.copy(sunPos);
    scene.add(sunPointLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.03);
    scene.add(ambientLight);

    // Earth in Orbit
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-36, 0, 48);
    scene.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(18, 64, 64);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.5,
      metalness: 0.1,
      emissive: 0x050d17,
      emissiveIntensity: 0.25
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthMesh.rotation.z = (23.44 * Math.PI) / 180;
    earthGroup.add(earthMesh);

    const atmoGeo = new THREE.SphereGeometry(19.2, 48, 48);
    const atmoMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.18, side: THREE.BackSide });
    earthGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

    // High-Resolution LOLA Moon Sphere
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
      emissive: 0x040507,
      emissiveIntensity: 0.08
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.castShadow = true;
    moonMesh.receiveShadow = true;
    moonMesh.rotation.set(-0.35, 0, 0);
    moonGroup.add(moonMesh);

    // Grazing Directional Sunlight
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

    // Minimalist Scanning Hover Ring
    const hoverRingGeo = new THREE.RingGeometry(0.25, 0.35, 32);
    const hoverRingMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    const hoverRing = new THREE.Mesh(hoverRingGeo, hoverRingMat);
    moonMesh.add(hoverRing);

    // Mapped Landmark 3D Pins (Muted off-white/silver)
    const landmarkPins = [];
    sites.forEach((site) => {
      const pinPos = latLonToVector3(site.lat, site.lon, MOON_RADIUS + 0.1);
      const pinGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const isSelected = site.id === selectedSiteId;
      const pinMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xffffff : 0x737373
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pinPos);
      pinMesh.userData = { siteId: site.id, siteName: site.name, lat: site.lat, lon: site.lon };
      moonMesh.add(pinMesh);
      landmarkPins.push(pinMesh);
    });

    const targetReticle = createLandingReticle();
    const initReticlePos = latLonToVector3(activeSite.lat, activeSite.lon, MOON_RADIUS + 0.04);
    targetReticle.position.copy(initReticlePos);
    const initNormal = initReticlePos.clone().normalize();
    targetReticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), initNormal);
    moonMesh.add(targetReticle);

    const orbitalSpacecraft = createOrbitalSpacecraft();
    moonGroup.add(orbitalSpacecraft);

    const groundDustRing = createGroundDustRing();
    moonGroup.add(groundDustRing);

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

          const qYaw = new THREE.Quaternion().setFromAxisAngle(camUp, dx * 0.006);
          const qPitch = new THREE.Quaternion().setFromAxisAngle(camRight, dy * 0.006);

          s.moonMesh.quaternion.premultiply(qYaw);
          s.moonMesh.quaternion.premultiply(qPitch);
        }
      } else {
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
            s.hoverRing.material.opacity = 0.5;

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

        const pinIntersects = raycaster.intersectObjects(landmarkPins, false);
        if (pinIntersects.length > 0) {
          const hitPin = pinIntersects[0].object;
          if (hitPin.userData?.siteId && onSelectSite) {
            onSelectSite(hitPin.userData.siteId);
            return;
          }
        }

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
      s.zoomDistance = Math.max(16, Math.min(60, s.zoomDistance + e.deltaY * 0.025));
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

    let clock = new THREE.Clock();
    const animate = () => {
      animFrameRef.current = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      earthMesh.rotation.y += delta * 0.08;
      sunMesh.rotation.y += delta * 0.015;

      const outerRing = targetReticle.userData?.outerRing;
      if (outerRing) {
        const sScale = 1.0 + Math.sin(elapsed * 2.5) * 0.08;
        outerRing.scale.set(sScale, sScale, sScale);
        outerRing.material.opacity = 0.2 + Math.sin(elapsed * 2.5) * 0.1;
      }

      const s = stateRef.current;
      if (!s) return;

      if ((s.mode === 'orbit' || s.mode === 'compare') && !s.hasUserInteracted && !isDragging) {
        const idleSpin = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.015);
        moonMesh.quaternion.multiply(idleSpin);
      }

      if (s.orbitalSpacecraft && s.satelliteState === 'orbiting') {
        const orbitAngle = elapsed * 0.28;
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

      if (s.targetReticle && onUpdateCraterScreenPos) {
        const reticleWorld = new THREE.Vector3();
        s.targetReticle.getWorldPosition(reticleWorld);

        const moonWorld = new THREE.Vector3();
        s.moonMesh.getWorldPosition(moonWorld);
        const dirToCam = camera.position.clone().sub(reticleWorld).normalize();
        const normal = reticleWorld.clone().sub(moonWorld).normalize();

        if (dirToCam.dot(normal) > 0.05) {
          const screenPos = reticleWorld.clone().project(camera);
          const x = (screenPos.x * 0.5 + 0.5) * width;
          const y = (-screenPos.y * 0.5 + 0.5) * height;
          onUpdateCraterScreenPos({ x, y });
        } else {
          onUpdateCraterScreenPos(null);
        }
      }

      if (s.mode === 'macro') {
        const panAngle = elapsed * 0.03;
        const macroCamPos = new THREE.Vector3(
          Math.sin(panAngle) * 80 + 20,
          150 + Math.sin(elapsed * 0.04) * 12,
          400 + Math.cos(panAngle) * 40
        );
        camera.position.lerp(macroCamPos, 0.03);
        camera.lookAt(0, 10, 0);
      } else if (s.mode === 'transition') {
        s.transitionProgress = Math.min(1.0, s.transitionProgress + delta * 0.38);
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

        if (s.cameraShakeIntensity > 0.001) {
          const shakeTime = Date.now() * 0.02;
          const shakeX = Math.sin(shakeTime) * s.cameraShakeIntensity * 0.9;
          const shakeY = Math.cos(shakeTime * 1.3) * s.cameraShakeIntensity * 0.9;
          targetCamPos.x += shakeX;
          targetCamPos.y += shakeY;
        }

        camera.position.lerp(targetCamPos, 0.06);
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

  useEffect(() => {
    const s = stateRef.current;
    if (!s || !s.targetReticle || !s.moonMesh) return;
    const pos = latLonToVector3(activeSite.lat, activeSite.lon, 10.5 + 0.04);
    s.targetReticle.position.copy(pos);
    const normal = pos.clone().normalize();
    s.targetReticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }, [activeSite]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#050505]">
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {hoverScan && (
        <div
          style={{
            position: 'fixed',
            left: `${hoverScan.screenX + 16}px`,
            top: `${hoverScan.screenY + 16}px`
          }}
          className="pointer-events-none z-30 bg-black/80 px-2 py-0.5 rounded border border-white/10 font-mono text-[9px] text-[#f5f5f5] tracking-wider"
        >
          {Math.abs(hoverScan.lat).toFixed(1)}°{hoverScan.lat < 0 ? 'S' : 'N'} · {Math.abs(hoverScan.lon).toFixed(1)}°{hoverScan.lon >= 0 ? 'E' : 'W'}
        </div>
      )}
    </div>
  );
});

export default CinematicSpaceUniverse;
