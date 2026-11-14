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
    <div className="w-full h-80 sm:h-96 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 relative shadow-inner">
      <Suspense
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400 text-xs space-y-2">
            <div className="w-8 h-8 border-2 border-sky-500/30 border-t-sky-400 rounded-full animate-spin"></div>
            <span className="font-mono">Initializing Three.js WebGL Engine…</span>
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
