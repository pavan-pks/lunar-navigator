import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

/**
 * src/components/story/SpaceIntroScene.jsx
 * 3D Solar System & Lunar South Pole approach experience.
 *
 * States:
 * - 'space': Solar system overview with Sun, Earth, Moon orbit.
 * - 'zooming': Cinematic camera swoop from Earth orbit to Lunar South Pole.
 * - 'moon': Close orbital view of the Moon South Pole with candidate landing targets highlighted.
 */
export function SpaceIntroScene({ onReachedMoon, isZooming, targetSite }) {
  const mountRef = useRef(null);
  const animFrameRef = useRef(null);
  const sceneElementsRef = useRef(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    camera.position.set(0, 180, 420);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // 2. Starfield
    const starCount = 3500;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 1200 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const tint = 0.85 + Math.random() * 0.15;
      starColors[i * 3] = tint;
      starColors[i * 3 + 1] = tint;
      starColors[i * 3 + 2] = tint + Math.random() * 0.1;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, transparent: true, opacity: 0.85 });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);

    // 3. Central Sun with Corona Flare
    const sunPos = new THREE.Vector3(-450, 60, -250);
    const sunGeo = new THREE.SphereGeometry(38, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3d1 });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.copy(sunPos);
    scene.add(sunMesh);

    // Sun light source
    const sunLight = new THREE.PointLight(0xffffff, 3.2, 3000, 0.4);
    sunLight.position.copy(sunPos);
    scene.add(sunLight);

    const ambLight = new THREE.AmbientLight(0x222a3d, 0.6);
    scene.add(ambLight);

    // 4. Texture Loader
    const textureLoader = new THREE.TextureLoader();
    const earthTex = textureLoader.load('/textures/earth.jpg');
    earthTex.colorSpace = THREE.SRGBColorSpace;
    const moonTex = textureLoader.load('/textures/moon.jpg');
    moonTex.colorSpace = THREE.SRGBColorSpace;

    // 5. Earth Model
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-60, 0, 50);
    scene.add(earthGroup);

    const earthGeo = new THREE.SphereGeometry(18, 48, 48);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTex,
      roughness: 0.7,
      metalness: 0.1
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    // Earth atmosphere glow
    const atmoGeo = new THREE.SphereGeometry(19.2, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    earthGroup.add(atmoMesh);

    // 6. Moon Model
    const moonGroup = new THREE.Group();
    moonGroup.position.set(35, 12, 10);
    scene.add(moonGroup);

    const moonGeo = new THREE.SphereGeometry(11, 48, 48);
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.95,
      metalness: 0.05
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.rotation.y = Math.PI * 0.4;
    moonGroup.add(moonMesh);

    // South pole marker reticle
    const markerGeo = new THREE.RingGeometry(0.8, 1.2, 32);
    const markerMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide });
    const poleMarker = new THREE.Mesh(markerGeo, markerMat);
    poleMarker.position.set(0, -11.05, 0);
    poleMarker.rotation.x = Math.PI / 2;
    moonGroup.add(poleMarker);

    // Orbit rings
    const orbitPts = [];
    for (let i = 0; i <= 64; i++) {
      const a = (i / 64) * Math.PI * 2;
      orbitPts.push(new THREE.Vector3(Math.cos(a) * 95, 0, Math.sin(a) * 95));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18 });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    earthGroup.add(orbitLine);

    // Store state in ref
    sceneElementsRef.current = {
      scene,
      camera,
      renderer,
      earthMesh,
      moonMesh,
      moonGroup,
      earthGroup,
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

      // Earth & Moon idle rotation
      earthMesh.rotation.y += delta * 0.1;
      moonMesh.rotation.y += delta * 0.05;

      // Pulse pole marker
      const s = 1.0 + Math.sin(elapsed * 4) * 0.25;
      poleMarker.scale.set(s, s, s);

      const el = sceneElementsRef.current;
      if (!el) return;

      if (el.phase === 'zooming') {
        el.zoomProgress = Math.min(1.0, el.zoomProgress + delta * 0.45);
        const t = el.zoomProgress;
        // Cubic ease out
        const ease = 1 - Math.pow(1 - t, 3);

        // Interpolate camera from space overview (0, 180, 420) to close Moon South Pole (35, -2, 28)
        const startPos = new THREE.Vector3(0, 180, 420);
        const targetPos = new THREE.Vector3(35, -5, 26);
        camera.position.lerpVectors(startPos, targetPos, ease);

        const lookStart = new THREE.Vector3(0, 0, 0);
        const lookTarget = new THREE.Vector3(35, 10, 10);
        const currentLook = new THREE.Vector3().lerpVectors(lookStart, lookTarget, ease);
        camera.lookAt(currentLook);

        if (t >= 1.0) {
          el.phase = 'moon';
          if (onReachedMoon) onReachedMoon();
        }
      } else if (el.phase === 'moon') {
        // Subtle drift in orbital close-up
        camera.position.x = 35 + Math.sin(elapsed * 0.2) * 1.5;
        camera.position.y = -5 + Math.cos(elapsed * 0.15) * 1.0;
        camera.lookAt(35, 10, 10);
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

  return <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-auto" />;
}

export default SpaceIntroScene;
