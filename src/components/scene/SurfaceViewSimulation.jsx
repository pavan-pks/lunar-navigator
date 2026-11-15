import React, { useState, useRef } from 'react';
import Scene3D from './Scene3D.jsx';

/**
 * SurfaceViewSimulation.jsx
 *
 * Restores the high-performance local surface view:
 * - 400x400m procedural terrain tailored to the selected landing site
 * - Artemis / Apollo high-fidelity procedural lander grounded flush at pad height
 * - Orbit Mast View & Astronaut EVA Mode (1.7m eye-level, clamped pitch [-60°, +60°])
 * - Quick-look controls: Look at Sun, Look at Earth, Look North
 * - Dynamic Metric Shadow Ruler opposite the sun
 * - Clean floating controls avoiding any HUD overlap with the main app navigation
 */
export function SurfaceViewSimulation({
  site = { id: 'shackleton', name: 'Shackleton Crater Rim', terrainType: 'crater-rim' },
  sunEl = 2.0,
  sunAz = 180.0,
  earthEl = 5.0,
  earthAz = 20.0,
  onReturnToOrbit,
  quality = 'auto',
}) {
  const [viewMode, setViewMode] = useState('astronaut');
  const [showShadowRuler, setShowShadowRuler] = useState(true);
  const scene3DRef = useRef(null);

  const safeSunEl = Number.isFinite(sunEl) ? sunEl : 2.0;
  const safeSunAz = Number.isFinite(sunAz) ? sunAz : 180.0;
  const safeEarthEl = Number.isFinite(earthEl) ? earthEl : 5.0;
  const safeEarthAz = Number.isFinite(earthAz) ? earthAz : 20.0;

  return (
    <div className="w-full h-full relative overflow-hidden bg-black select-none">
      <Scene3D
        ref={scene3DRef}
        siteId={site?.id || 'shackleton'}
        terrainType={site?.terrainType || 'crater-rim'}
        sunEl={safeSunEl}
        sunAz={safeSunAz}
        earthEl={safeEarthEl}
        earthAz={safeEarthAz}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        quality={quality}
        label={`${site?.name || 'Lunar Surface'} — Surface EVA`}
        landerHeight={3.0}
        showHud={false}
        showShadowRuler={showShadowRuler}
        onToggleShadowRuler={() => setShowShadowRuler((prev) => !prev)}
        onReturnToOrbit={onReturnToOrbit}
      />

      {/* Floating Astronaut Surface Action Bar placed on top */}
      <div className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 bg-black/90 border border-white/20 px-3 py-1.5 rounded-full">
        <button
          onClick={() => setViewMode((prev) => (prev === 'astronaut' ? 'orbit' : 'astronaut'))}
          className="border border-white/20 bg-white/10 hover:bg-white hover:text-black text-white px-3 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-200 cursor-pointer flex items-center gap-1.5"
          title="Toggle between Astronaut EVA POV and Orbital Mast view"
        >
          <span>{viewMode === 'astronaut' ? '🪐 Orbit Mast' : '👨‍🚀 Astronaut View'}</span>
        </button>

        <div className="w-px h-3.5 bg-white/20 mx-0.5" />

        <button
          onClick={() => scene3DRef.current?.lookAtSun?.()}
          className="text-neutral-300 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1"
          title="Orient camera toward the Sun"
        >
          <span>☀️ Sun</span>
        </button>

        <button
          onClick={() => scene3DRef.current?.lookAtEarth?.()}
          className="text-neutral-300 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1"
          title="Orient camera toward the Earth"
        >
          <span>🌍 Earth</span>
        </button>

        <button
          onClick={() => scene3DRef.current?.lookNorth?.()}
          className="text-neutral-300 hover:text-white hover:bg-white/10 px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1"
          title="Orient camera toward Lunar True North"
        >
          <span>🧭 North</span>
        </button>

        <div className="w-px h-3.5 bg-white/20 mx-0.5" />

        <button
          onClick={() => setShowShadowRuler((prev) => !prev)}
          className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1 ${
            showShadowRuler
              ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle metric shadow ruler"
        >
          <span>📏 Ruler</span>
        </button>
      </div>
    </div>
  );
}

export default SurfaceViewSimulation;
