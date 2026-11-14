import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { LunarScore } from '../../lib/lunarScore.js';

const CUES = {
  sunDive: 7.0,
  wide: 11.5,
  inner: 13.5,
  earth: 16.5,
  moon: 20.5,
  arrive: 24.5,
  end: 30.0
};

const CHAPTERS = [
  { name: 'Milky Way', start: 0, title: 'The Milky Way', text: 'A few hundred billion stars. One of them is ours.' },
  { name: 'Sun', start: 5.5, title: 'The Sun', text: 'Our star, providing 1,361 W/m² of unattenuated AM0 solar flux to lunar orbit.' },
  { name: 'Solar System', start: CUES.sunDive + 0.2, title: 'The Solar System Today', text: 'Inner rocky worlds and planetary orbits to scale.' },
  { name: 'Inner Planets', start: CUES.inner, title: 'The Inner Planets', text: 'Mercury, Venus, Earth and the Moon close to the Sun.' },
  { name: 'Earth', start: CUES.earth, title: 'Earth', text: 'Home, mission control, and the Deep Space Network.' },
  { name: 'The Moon', start: CUES.moon, title: 'The Moon', text: '384,400 km away. A radio signal takes 1.28 seconds to reach mission control.' },
  { name: 'South Pole', start: CUES.arrive, title: 'The Lunar South Pole', text: 'Jagged crater rims, 1.5° grazing sun, and cryogenic ice traps. Plan your Artemis mission.' }
];

export function LunarIntro({ onDone }) {
  const mountRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [soundOn, setSoundOn] = useState(true);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [timelinePct, setTimelinePct] = useState(0);
  const [isTitled, setIsTitled] = useState(true);

  const introStateRef = useRef({
    time: 0,
    playing: false,
    score: null,
    renderer: null,
    scene: null,
    camera: null,
    done: false
  });

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    // Three.js renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 10000);
    const scene = new THREE.Scene();

    // Starfield
    const starCount = 4000;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 800 + Math.random() * 800;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      starPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      starPos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      starPos[i * 3 + 2] = r * Math.cos(ph);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.2, transparent: true, opacity: 0.8 });
    scene.add(new THREE.Points(starGeo, starMat));

    // Textures - Official NASA SVS imagery
    const loader = new THREE.TextureLoader();
    const sunTex = loader.load('/textures/nasa_sun.jpg');
    sunTex.colorSpace = THREE.SRGBColorSpace;
    const earthTex = loader.load('/textures/nasa_earth_bluemarble.jpg');
    earthTex.colorSpace = THREE.SRGBColorSpace;
    const moonTex = loader.load('/textures/nasa_moon_lroc_1k.jpg');
    moonTex.colorSpace = THREE.SRGBColorSpace;

    // Sun with NASA SDO texture
    const sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(22, 48, 48),
      new THREE.MeshBasicMaterial({ map: sunTex, color: 0xfff5d6 })
    );
    sunMesh.position.set(-220, 45, -200);
    scene.add(sunMesh);

    const sunLight = new THREE.PointLight(0xffffff, 3.2, 3000, 0.4);
    sunLight.position.copy(sunMesh.position);
    scene.add(sunLight);
    scene.add(new THREE.AmbientLight(0x222638, 0.65));

    // Earth with NASA Blue Marble texture
    const earthGroup = new THREE.Group();
    earthGroup.position.set(0, 0, 0);
    scene.add(earthGroup);

    const earthMesh = new THREE.Mesh(
      new THREE.SphereGeometry(14, 64, 64),
      new THREE.MeshStandardMaterial({ map: earthTex, roughness: 0.75, metalness: 0.08 })
    );
    earthMesh.rotation.z = (23.44 * Math.PI) / 180; // Earth axial tilt
    earthGroup.add(earthMesh);

    // Atmospheric limb
    const atmoGeo = new THREE.SphereGeometry(14.8, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.18, side: THREE.BackSide });
    earthGroup.add(new THREE.Mesh(atmoGeo, atmoMat));

    // Moon with NASA LROC CGI Moon Kit texture
    const moonGroup = new THREE.Group();
    scene.add(moonGroup);
    const moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(7.5, 64, 64),
      new THREE.MeshStandardMaterial({ map: moonTex, roughness: 0.98, metalness: 0.02 })
    );
    moonGroup.add(moonMesh);

    // Initial pose
    camera.position.set(0, 80, 240);
    camera.lookAt(0, 0, 0);

    const state = introStateRef.current;
    state.renderer = renderer;
    state.scene = scene;
    state.camera = camera;
    state.score = new LunarScore(CUES);

    // Window resize
    const handleResize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation loop
    let lastTime = performance.now();
    let animId = 0;

    const tick = (now) => {
      animId = requestAnimationFrame(tick);
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (state.playing && !state.done) {
        state.time += dt;
        if (state.time >= CUES.end) {
          state.done = true;
          if (onDone) onDone();
          return;
        }
      }

      const t = state.time;
      setTimelinePct((t / CUES.end) * 100);

      // Determine active chapter
      let ci = 0;
      CHAPTERS.forEach((c, idx) => {
        if (t >= c.start) ci = idx;
      });
      setChapterIdx(ci);

      // Dynamic rotations
      earthMesh.rotation.y += dt * 0.2;
      moonMesh.rotation.y += dt * 0.1;

      // Position Moon in orbit around Earth
      const moonAngle = (t * 0.3) % (Math.PI * 2);
      const orbitR = 55;
      moonGroup.position.set(Math.cos(moonAngle) * orbitR, 6, Math.sin(moonAngle) * orbitR);

      // Camera choreography
      if (t < CUES.sunDive) {
        // Deep space overview
        const u = t / CUES.sunDive;
        camera.position.set(0, 140 - u * 40, 320 - u * 100);
        camera.lookAt(sunMesh.position);
      } else if (t < CUES.inner) {
        // Dive into the inner solar system
        const u = (t - CUES.sunDive) / (CUES.inner - CUES.sunDive);
        camera.position.lerpVectors(new THREE.Vector3(0, 100, 220), new THREE.Vector3(30, 45, 120), u);
        camera.lookAt(0, 0, 0);
      } else if (t < CUES.moon) {
        // Flyby Earth
        const u = (t - CUES.inner) / (CUES.moon - CUES.inner);
        camera.position.lerpVectors(new THREE.Vector3(30, 45, 120), new THREE.Vector3(earthGroup.position.x + 20, 14, earthGroup.position.z + 32), u);
        camera.lookAt(earthGroup.position);
      } else {
        // Close approach to Lunar South Pole
        const u = Math.min(1.0, (t - CUES.moon) / (CUES.arrive - CUES.moon));
        const moonPos = moonGroup.position;
        // Target just under the south pole of Moon
        const southPoleCam = new THREE.Vector3(moonPos.x, moonPos.y - 7.5, moonPos.z + 14);
        camera.position.lerpVectors(camera.position, southPoleCam, dt * 2.0);
        camera.lookAt(moonPos);
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      if (state.score) state.score.close();
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const handleBegin = () => {
    setIsTitled(false);
    const state = introStateRef.current;
    state.playing = true;
    if (soundOn && state.score) {
      state.score.start(state.time);
    }
  };

  const handleTogglePlay = () => {
    const state = introStateRef.current;
    const next = !isPlaying;
    setIsPlaying(next);
    state.playing = next;
    if (state.score) {
      next ? state.score.start(state.time) : state.score.stop();
    }
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    const state = introStateRef.current;
    if (state.score) {
      state.score.setMuted(!next);
    }
  };

  const handleSkip = () => {
    const state = introStateRef.current;
    state.done = true;
    if (state.score) state.score.stop();
    if (onDone) onDone();
  };

  const currentChapter = CHAPTERS[chapterIdx] || CHAPTERS[0];

  return (
    <div className="fixed inset-0 z-50 bg-black text-white font-sans select-none overflow-hidden">
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Title Screen Overlay */}
      {isTitled && (
        <div className="absolute inset-0 z-20 flex flex-col justify-center items-start p-8 sm:p-20 bg-black/60 backdrop-blur-xs">
          <div className="max-w-xl space-y-5 animate-in fade-in duration-700">
            <span className="text-xs font-mono tracking-widest text-sky-400 uppercase font-semibold">
              NASA Space Apps Challenge 2026 presents
            </span>
            <h1 className="text-4xl sm:text-6xl font-display font-bold text-white tracking-tight">
              LUNAR <span className="text-sky-400">NAVIGATOR</span>
            </h1>
            <p className="text-base text-slate-300 leading-relaxed font-light">
              Plan and simulate human sorties at the Lunar South Pole with authentic NASA/JPL Horizons ephemeris data.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBegin}
                className="px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-slate-200 transition-all transform hover:scale-105 cursor-pointer shadow-lg"
              >
                Begin
              </button>
              <button
                onClick={handleSkip}
                className="px-6 py-3.5 rounded-full bg-transparent text-slate-300 font-medium text-sm hover:text-white border border-white/30 hover:border-white/60 transition-colors cursor-pointer"
              >
                Skip to Navigator
              </button>
            </div>
            <p className="text-xs text-slate-500 font-mono pt-4">
              Best with sound on. Procedural Web Audio API synthesizer.
            </p>
          </div>
        </div>
      )}

      {/* In-Flight Chapter Subtitle */}
      {!isTitled && (
        <div className="absolute left-6 sm:left-12 bottom-24 max-w-lg z-20 pointer-events-none transition-all duration-300">
          <h2 className="text-2xl sm:text-4xl font-display font-light text-white mb-2 drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]">
            {currentChapter.title}
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed font-light drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {currentChapter.text}
          </p>
        </div>
      )}

      {/* Floating Controls Bar */}
      {!isTitled && (
        <div className="absolute top-6 right-6 z-20 flex items-center gap-2 font-mono text-xs">
          <button
            onClick={handleTogglePlay}
            className="px-3.5 py-1.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-slate-200 transition"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={handleToggleSound}
            className="px-3.5 py-1.5 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 text-slate-200 transition"
          >
            {soundOn ? 'Sound On' : 'Sound Off'}
          </button>
          <button
            onClick={handleSkip}
            className="px-4 py-1.5 rounded-full bg-white text-black font-semibold hover:bg-slate-200 transition"
          >
            Skip to Navigator
          </button>
        </div>
      )}

      {/* Bottom Timeline Scrubber */}
      {!isTitled && (
        <div className="absolute left-6 right-6 sm:left-12 sm:right-12 bottom-8 z-20">
          <div className="w-full h-1 bg-white/20 relative rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all duration-100" style={{ width: `${timelinePct}%` }}></div>
          </div>
          <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-2">
            <span>Milky Way</span>
            <span>Sun</span>
            <span>Solar System</span>
            <span>Earth</span>
            <span>The Moon</span>
            <span>South Pole</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LunarIntro;
