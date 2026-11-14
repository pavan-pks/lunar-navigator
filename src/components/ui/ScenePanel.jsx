import React, { Suspense } from 'react';

// Lazy-load Pavan's 3D Scene
const Scene3D = React.lazy(() => import('../scene/Scene3D.jsx'));

/**
 * src/components/ui/ScenePanel.jsx
 * Container for the 3D WebGL scene with graceful fallback and HUD configuration.
 */
export function ScenePanel({
  siteId = 'plain',
  terrainType = 'plain',
  sunEl = 0,
  sunAz = 180,
  earthEl = 0,
  earthAz = 0,
  viewMode = 'orbit',
  quality = 'auto',
  label = 'Lunar Site',
  landerHeight = 3.0,
  showHud = true,
  showShadowRuler = true
}) {
  return (
    <div className="w-full h-80 sm:h-96 bg-[#02040a] rounded-2xl overflow-hidden border border-white/10 relative shadow-[0_8px_30px_rgba(0,0,0,0.8)] group">
      {/* Subtle corner reticles for aerospace HUD feel */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-sky-400/40 pointer-events-none z-10"></div>
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-sky-400/40 pointer-events-none z-10"></div>
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-sky-400/40 pointer-events-none z-10"></div>
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-sky-400/40 pointer-events-none z-10"></div>

      <Suspense
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center bg-[#02040a] text-slate-400 text-xs space-y-3">
            <div className="w-9 h-9 border-2 border-sky-500/20 border-t-sky-400 rounded-full animate-spin"></div>
            <div className="text-center font-mono">
              <span className="text-slate-300 block font-semibold text-xs tracking-wider uppercase">Loading WebGL Synthetic Lunar Mesh</span>
              <span className="text-[10px] text-slate-500">LOLA DEM Elevation & Ray-Casting Shadows</span>
            </div>
          </div>
        }
      >
        <Scene3D
          siteId={siteId}
          terrainType={terrainType}
          sunEl={sunEl}
          sunAz={sunAz}
          earthEl={earthEl}
          earthAz={earthAz}
          viewMode={viewMode}
          quality={quality}
          label={label}
          landerHeight={landerHeight}
          showHud={showHud}
          showShadowRuler={showShadowRuler}
        />
      </Suspense>
    </div>
  );
}

export default ScenePanel;
