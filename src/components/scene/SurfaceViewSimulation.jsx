import React, { useState, useRef } from 'react';
import { Play, Pause, ArrowLeft, BarChart2, FileText, Sun, Globe, Compass, Ruler, AlertTriangle, Eye, Orbit, User } from 'lucide-react';
import Scene3D from './Scene3D.jsx';
import VisorHud from '../ui/VisorHud.jsx';

/**
 * SurfaceViewSimulation.jsx
 *
 * High-performance photorealistic local surface simulation:
 * - 400x400m procedural terrain tailored to the selected landing site
 * - Artemis / Apollo high-fidelity procedural lander grounded flush at pad height
 * - Orbit Mast View & Astronaut EVA Mode (1.7m eye-level, clamped pitch [-60°, +60°])
 * - Quick-look controls: Look at Sun, Look at Earth, Look North
 * - Dynamic Metric Shadow Ruler opposite the sun
 * - Astronaut Helmet Visor HUD Mode with heading tape, life-support telemetry & reticle
 * - Real-time Artemis Landing Slope Safety & Hazard Colormap (<6° Safe, 6°-15° Caution, >15° Hazard)
 * - Dedicated Return to Orbit, Metrics/Analysis, and Mission Report triggers
 * - Floating Lunar Daylight Cycle playback controller
 */
export function SurfaceViewSimulation({
  site = { id: 'shackleton', name: 'Shackleton Crater Rim', terrainType: 'crater-rim' },
  sunEl = 2.0,
  sunAz = 180.0,
  earthEl = 5.0,
  earthAz = 20.0,
  onReturnToOrbit,
  onOpenReport,
  onOpenAnalysis,
  quality = 'auto',
  timeCtrl = null,
  maxHours = 336,
}) {
  const [viewMode, setViewMode] = useState('astronaut');
  const [showShadowRuler, setShowShadowRuler] = useState(true);
  const [showVisor, setShowVisor] = useState(false);
  const [showSlopeHazard, setShowSlopeHazard] = useState(false);
  const scene3DRef = useRef(null);

  const safeSunEl = Number.isFinite(sunEl) ? sunEl : 2.0;
  const safeSunAz = Number.isFinite(sunAz) ? sunAz : 180.0;
  const safeEarthEl = Number.isFinite(earthEl) ? earthEl : 5.0;
  const safeEarthAz = Number.isFinite(earthAz) ? earthAz : 20.0;

  const cycleSpeed = () => {
    if (!timeCtrl) return;
    const speeds = [1, 10, 24, 60, 120];
    const currentIndex = speeds.indexOf(timeCtrl.speed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    timeCtrl.setSpeed(nextSpeed);
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-black select-none">
      <Scene3D
        ref={scene3DRef}
        siteId={site?.id || 'shackleton'}
        terrainType={site?.terrainType || 'crater-rim'}
        site={site}
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
        showSlopeHazard={showSlopeHazard}
        onToggleShadowRuler={() => setShowShadowRuler((prev) => !prev)}
        onReturnToOrbit={onReturnToOrbit}
      />

      {/* ── TOP LEFT: RETURN TO ORBIT BUTTON & SITE BADGE ── */}
      <div className="absolute top-4 sm:top-5 left-4 sm:left-6 z-30 pointer-events-auto flex items-center gap-3">
        <button
          type="button"
          onClick={onReturnToOrbit}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-black font-semibold text-xs tracking-wider uppercase hover:bg-neutral-200 transition-all shadow-2xl cursor-pointer"
          title="Exit surface simulation and return to orbital survey"
        >
          <ArrowLeft size={13} />
          <span>Return to Orbit</span>
        </button>

        <div className="hidden md:flex flex-col">
          <span className="text-[10px] font-sans font-light tracking-widest text-[#a3a3a3] uppercase block leading-tight">
            Astronaut EVA POV
          </span>
          <span className="text-xs font-sans text-white font-medium leading-tight truncate max-w-[14rem]">
            {site?.name || 'Lunar Target'}
          </span>
        </div>
      </div>

      {/* ── TOP RIGHT: METRICS & REPORT MODAL TRIGGERS ── */}
      <div className="absolute top-4 sm:top-5 right-4 sm:right-6 z-30 pointer-events-auto flex items-center gap-2">
        {onOpenAnalysis && (
          <button
            type="button"
            onClick={onOpenAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-neutral-300 hover:text-white hover:border-white/40 text-xs font-sans transition cursor-pointer shadow-xl"
            title="Open quantitative timeline, battery simulator, and mission calendar"
          >
            <BarChart2 size={13} />
            <span>Metrics</span>
          </button>
        )}

        {onOpenReport && (
          <button
            type="button"
            onClick={onOpenReport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/85 backdrop-blur-md border border-white/20 text-neutral-300 hover:text-white hover:border-white/40 text-xs font-sans transition cursor-pointer shadow-xl"
            title="Open printable mission report"
          >
            <FileText size={13} />
            <span>Report</span>
          </button>
        )}
      </div>

      {/* ── TOP CENTER: ASTRONAUT SURFACE ACTION BAR ── */}
      <div className="absolute top-4 sm:top-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-1.5 sm:gap-2 bg-black/90 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full shadow-2xl max-w-[90vw] overflow-x-auto no-scrollbar">
        {/* Toggle between Astronaut EVA POV and Orbital Mast view */}
        <button
          type="button"
          onClick={() => setViewMode((prev) => (prev === 'astronaut' ? 'orbit' : 'astronaut'))}
          className="border border-white/20 bg-white/10 hover:bg-white hover:text-black text-white px-2.5 sm:px-3 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0"
          title="Toggle between Astronaut EVA POV and Orbital Mast view"
        >
          {viewMode === 'astronaut' ? (
            <>
              <Orbit className="w-3.5 h-3.5 text-purple-300" />
              <span>Orbit Mast</span>
            </>
          ) : (
            <>
              <User className="w-3.5 h-3.5 text-sky-300" />
              <span>Astronaut View</span>
            </>
          )}
        </button>

        <div className="w-px h-3.5 bg-white/20 mx-0.5 shrink-0" />

        {/* Quick Orientation Controls */}
        <button
          type="button"
          onClick={() => scene3DRef.current?.lookAtSun?.()}
          className="text-neutral-300 hover:text-white hover:bg-white/10 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1.5 shrink-0"
          title="Orient camera toward the Sun"
        >
          <Sun className="w-3.5 h-3.5 text-amber-400" />
          <span>Sun</span>
        </button>

        <button
          type="button"
          onClick={() => scene3DRef.current?.lookAtEarth?.()}
          className="text-neutral-300 hover:text-white hover:bg-white/10 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1.5 shrink-0"
          title="Orient camera toward the Earth"
        >
          <Globe className="w-3.5 h-3.5 text-sky-400" />
          <span>Earth</span>
        </button>

        <button
          type="button"
          onClick={() => scene3DRef.current?.lookNorth?.()}
          className="text-neutral-300 hover:text-white hover:bg-white/10 px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1.5 shrink-0"
          title="Orient camera toward Lunar True North"
        >
          <Compass className="w-3.5 h-3.5 text-rose-400" />
          <span>North</span>
        </button>

        <div className="w-px h-3.5 bg-white/20 mx-0.5 shrink-0" />

        {/* Ruler Toggle */}
        <button
          type="button"
          onClick={() => setShowShadowRuler((prev) => !prev)}
          className={`px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1.5 shrink-0 ${
            showShadowRuler
              ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-800/40'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle metric shadow ruler"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Ruler</span>
        </button>

        {/* Slope Hazard Heatmap Toggle */}
        <button
          type="button"
          onClick={() => setShowSlopeHazard((prev) => !prev)}
          className={`px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1.5 shrink-0 ${
            showSlopeHazard
              ? 'text-amber-300 bg-amber-950/50 border border-amber-600/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Artemis Landing Slope Safety & Hazard Heatmap"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Slope Map</span>
        </button>

        {/* Astronaut Helmet Visor HUD Toggle */}
        <button
          type="button"
          onClick={() => setShowVisor((prev) => !prev)}
          className={`px-2 sm:px-2.5 py-1 rounded-full text-[11px] font-sans font-medium tracking-wide transition-all duration-150 cursor-pointer flex items-center gap-1.5 shrink-0 ${
            showVisor
              ? 'text-emerald-300 bg-emerald-950/50 border border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
              : 'text-neutral-400 hover:text-white hover:bg-white/10'
          }`}
          title="Toggle Fullscreen Astronaut Helmet Visor HUD"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Visor</span>
        </button>
      </div>

      {/* Slope Hazard Legend Overlay when active */}
      {showSlopeHazard && (
        <div className="absolute top-18 left-1/2 -translate-x-1/2 z-25 pointer-events-none flex items-center gap-3 bg-black/85 border border-white/15 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider text-neutral-300 shadow-xl">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>&lt;6° Safe</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            <span>6°-15° Caution</span>
          </span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span>&gt;15° Hazard</span>
          </span>
        </div>
      )}

      {/* Astronaut Visor HUD Overlay */}
      <VisorHud
        isOpen={showVisor}
        onClose={() => setShowVisor(false)}
        sunEl={safeSunEl}
        earthEl={safeEarthEl}
        siteName={site?.name || 'Lunar Surface'}
      />

      {/* ── FLOATING BOTTOM LUNAR CYCLE PLAYBACK BAR ── */}
      {timeCtrl && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 pointer-events-auto max-w-xl w-[calc(100vw-2.5rem)] bg-black/90 backdrop-blur-md border border-white/20 px-4 py-2.5 rounded-2xl shadow-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-sans text-neutral-300">
            {/* Play/Pause & Speed Multiplier */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => timeCtrl.toggle()}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-black font-semibold hover:bg-neutral-200 transition cursor-pointer shadow-md"
                title={timeCtrl.playing ? 'Pause lunar daylight cycle' : 'Play lunar daylight cycle'}
              >
                {timeCtrl.playing ? <Pause size={12} className="fill-current" /> : <Play size={12} className="fill-current" />}
                <span>{timeCtrl.playing ? 'Pause Cycle' : 'Play Cycle'}</span>
              </button>

              <button
                type="button"
                onClick={cycleSpeed}
                className="text-[11px] font-mono px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition cursor-pointer border border-white/10"
                title="Cycle simulation speed"
              >
                {timeCtrl.speed}x (1h/s)
              </button>
            </div>

            {/* Live Sun Angle & Mission Time */}
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className={safeSunEl > 0 ? 'text-amber-300 font-medium' : 'text-neutral-400'}>
                Sun {safeSunEl > 0 ? `+${safeSunEl.toFixed(1)}°` : `${safeSunEl.toFixed(1)}°`}
              </span>
              <span className="text-white/20">•</span>
              <span className="text-neutral-200">
                MET {Math.floor(timeCtrl.tRel / 24)}d {Math.floor(timeCtrl.tRel % 24)}h
              </span>
            </div>
          </div>

          {/* Time Scrubber Slider */}
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={maxHours}
              step={0.1}
              value={timeCtrl.tRel}
              onChange={(e) => timeCtrl.seek(parseFloat(e.target.value))}
              className="w-full h-1 bg-white/25 rounded appearance-none cursor-pointer accent-sky-400"
              aria-label="Scrub lunar cycle time"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default SurfaceViewSimulation;
