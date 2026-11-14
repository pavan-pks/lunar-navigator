import React from 'react'

/**
 * Context-Aware Minimalist HUD Overlay for Scene3D & Lunar Universe.
 * Selectively renders metrics per viewMode, eliminating all overlap using strict Flexbox containers.
 *
 * ViewMode Contracts:
 * - 'orbit': Show global telemetry, target selection, and day-sweep simulation controls.
 * - 'astronaut' / 'surface': Hide orbital target lists. Show only local environmental metrics
 *                           (Shadow Ruler distance/ratio, live Sun/Earth elevation, quick-look buttons, Return to Orbit).
 * - 'compare': Strip away all environmental controls; show only side-by-side flexbox comparison cards.
 *
 * @param {Object} props
 */
export default function Hud({
  label = '',
  siteId = 'shackleton',
  sites = [],
  onSelectSite,
  sunEl = 2.0,
  sunAz = 180.0,
  earthEl = 5.0,
  earthAz = 20.0,
  landerHeight = 3,
  viewMode = 'orbit',
  onToggleViewMode,
  onLookSun,
  onLookEarth,
  onLookNorth,
  quality = 'auto',
  isSimulating = false,
  onToggleSimulation,
  onReturnToOrbit,
  showShadowRuler = true,
  onToggleShadowRuler,
  isComparison = false,
  comparisonData = null,
}) {
  const safeSunEl = Number.isFinite(sunEl) ? sunEl : 2.0
  const safeSunAz = Number.isFinite(sunAz) ? sunAz : 180.0
  const safeEarthEl = Number.isFinite(earthEl) ? earthEl : 5.0
  const safeEarthAz = Number.isFinite(earthAz) ? earthAz : 20.0
  const heightM = Number.isFinite(landerHeight) && landerHeight > 0 ? landerHeight : 3

  // Local environmental shadow readout
  let shadowText = ''
  if (safeSunEl <= -0.27) {
    shadowText = 'Sun below horizon (lunar night)'
  } else if (safeSunEl < 0.1) {
    shadowText = 'Shadow: >150 m (grazing horizon angle)'
  } else {
    const elRad = (safeSunEl * Math.PI) / 180
    const rawLen = heightM / Math.tan(elRad)
    const ratio = rawLen / heightM
    if (rawLen >= 150) {
      shadowText = `Shadow: >150 m, ${ratio.toFixed(0)}× lander height`
    } else {
      shadowText = `Shadow: ${rawLen.toFixed(1)} m, ${ratio.toFixed(0)}× lander height`
    }
  }

  const isAstronautView = viewMode === 'astronaut' || viewMode === 'surface'

  // =========================================================================
  // VIEW 1: COMPARISON MODE (Stripped-down side-by-side flexbox cards)
  // =========================================================================
  if (isComparison) {
    return (
      <div className="absolute inset-0 p-4 sm:p-6 pointer-events-none flex flex-col justify-between overflow-hidden text-neutral-100 font-sans select-none">
        {/* Header flex block */}
        <div className="flex flex-col gap-4 pointer-events-auto max-w-2xl w-full">
          <div className="bg-black/85 backdrop-blur-md p-4 rounded-xl border border-white/10 flex flex-col gap-1 shadow-2xl">
            <span className="text-[10px] font-sans tracking-[0.25em] uppercase text-neutral-400">
              Comparative Trade Study
            </span>
            <div className="text-base font-light text-white tracking-wide">
              Dual-Site Polar Illumination Analysis
            </div>
          </div>

          {/* Side-by-side flex comparison cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {/* Site A Card */}
            <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/15 flex flex-col gap-3 shadow-lg">
              <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-mono">
                Site A
              </span>
              <div className="text-sm font-medium text-white">
                {comparisonData?.siteA?.name || label || 'Primary Landing Site'}
              </div>
              <div className="flex flex-col gap-1 text-[11px] font-mono text-neutral-400">
                <span>Solar Coverage: {comparisonData?.siteA?.sunlitPct ?? '86.4%'}</span>
                <span>Terrain: {comparisonData?.siteA?.terrainType || 'Crater Rim'}</span>
                <span>Max Darkness: {comparisonData?.siteA?.maxDarkness ?? '52h'}</span>
              </div>
            </div>

            {/* Site B Card */}
            <div className="bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/15 flex flex-col gap-3 shadow-lg">
              <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-mono">
                Site B
              </span>
              <div className="text-sm font-medium text-white">
                {comparisonData?.siteB?.name || 'Malapert Massif'}
              </div>
              <div className="flex flex-col gap-1 text-[11px] font-mono text-neutral-400">
                <span>Solar Coverage: {comparisonData?.siteB?.sunlitPct ?? '74.2%'}</span>
                <span>Terrain: {comparisonData?.siteB?.terrainType || 'Massif Ridge'}</span>
                <span>Max Darkness: {comparisonData?.siteB?.maxDarkness ?? '84h'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info badge */}
        <div className="flex flex-row justify-end items-center pointer-events-auto">
          <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-md border border-white/10 text-[10px] font-mono text-neutral-400 uppercase tracking-wider">
            Comparison Matrix Active
          </div>
        </div>
      </div>
    )
  }

  // =========================================================================
  // VIEW 2: CONTEXT-AWARE SINGLE VIEW (Orbit vs. Astronaut / Surface)
  // =========================================================================
  return (
    <div className="absolute inset-0 p-4 sm:p-6 pointer-events-none flex flex-col justify-between overflow-hidden text-neutral-100 font-sans select-none">
      {/* ── TOP SECTION: Flex container pushing downward ── */}
      <div className="flex flex-row justify-between items-start gap-4 w-full">
        {/* Top-Left Flex Column (gap-4) */}
        <div className="flex flex-col gap-4 max-w-sm pointer-events-auto">
          {/* Surface View: Return to Orbit Button */}
          {isAstronautView && onReturnToOrbit && (
            <button
              onClick={onReturnToOrbit}
              className="bg-black/80 hover:bg-white hover:text-black text-neutral-100 border border-white/20 px-3.5 py-2 rounded-lg text-[11px] font-sans font-medium tracking-wider uppercase backdrop-blur-md transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-lg"
              title="Trigger Apollo ascent staging and return to lunar orbit"
            >
              <span>↖ Return to Orbit</span>
              <span className="text-[9px] opacity-60 font-mono">(Ascent Stage)</span>
            </button>
          )}

          {/* Site Telemetry Card */}
          <div className="bg-black/75 backdrop-blur-md border border-white/12 p-3.5 rounded-xl shadow-lg flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-sans font-medium text-white tracking-wide">
                {label || (isAstronautView ? 'Surface EVA Station' : 'Orbital Survey')}
              </span>
            </div>
            <div className="text-[10px] text-neutral-400 font-mono flex items-center gap-2">
              <span>H={heightM}m</span>
              <span>·</span>
              <span>Tier: {quality}</span>
              <span>·</span>
              <span className="uppercase text-neutral-300">
                {isAstronautView ? 'EVA Local' : 'Orbital'}
              </span>
            </div>

            {/* Orbit View ONLY: Target site selection list */}
            {!isAstronautView && sites.length > 0 && onSelectSite && (
              <div className="pt-2 border-t border-white/10 flex flex-col gap-1">
                <span className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase">
                  Target Landing Site:
                </span>
                <select
                  value={siteId}
                  onChange={(e) => onSelectSite(e.target.value)}
                  className="bg-black/90 border border-white/20 text-white text-[11px] rounded px-2 py-1 focus:outline-none cursor-pointer"
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.terrainType})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right Flex Column (gap-4) */}
        <div className="flex flex-col gap-4 items-end pointer-events-auto">
          <div className="flex items-center gap-2">
            {/* Orbit View ONLY: 20s Day Sweep Simulation Controls */}
            {!isAstronautView && onToggleSimulation && (
              <button
                onClick={onToggleSimulation}
                className={`border px-3 py-1.5 rounded-lg text-[11px] font-sans font-medium tracking-wide backdrop-blur-md transition-all duration-200 cursor-pointer flex items-center gap-2 shadow-lg ${
                  isSimulating
                    ? 'bg-white text-black border-white'
                    : 'bg-black/75 text-neutral-200 border-white/20 hover:border-white'
                }`}
                title="Simulate complete 360° lunar sun cycle in 20 seconds"
              >
                <span>{isSimulating ? '⏸ Pause Day Sweep' : '▶ 20s Day Sweep'}</span>
              </button>
            )}

            {/* Surface View ONLY: Shadow Ruler Toggle */}
            {isAstronautView && onToggleShadowRuler && (
              <button
                onClick={onToggleShadowRuler}
                className={`border px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-medium backdrop-blur-md transition-all duration-200 cursor-pointer shadow-lg ${
                  showShadowRuler
                    ? 'bg-white/20 text-white border-white/40'
                    : 'bg-black/70 text-neutral-400 border-white/15 hover:border-white/30'
                }`}
                title="Toggle metric shadow ruler on the ground"
              >
                📏 Shadow Ruler
              </button>
            )}

            {/* Illustrative Terrain Tag */}
            <div className="bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
              Illustrative Terrain
            </div>
          </div>
        </div>
      </div>

      {/* ── CENTER SECTION: Astronaut Mode Quick-Look Controls ONLY ── */}
      {isAstronautView && (
        <div className="self-center pointer-events-auto flex flex-col gap-2 items-center">
          <div className="bg-black/80 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2">
            <button
              onClick={onLookSun}
              className="bg-transparent hover:bg-white hover:text-black text-neutral-200 border border-white/15 px-3 py-1 rounded-full text-[11px] font-sans transition-all duration-150 cursor-pointer"
            >
              ☀️ Look at Sun
            </button>
            <button
              onClick={onLookEarth}
              className="bg-transparent hover:bg-white hover:text-black text-neutral-200 border border-white/15 px-3 py-1 rounded-full text-[11px] font-sans transition-all duration-150 cursor-pointer"
            >
              🌍 Look at Earth
            </button>
            <button
              onClick={onLookNorth}
              className="bg-transparent hover:bg-white hover:text-black text-neutral-200 border border-white/15 px-3 py-1 rounded-full text-[11px] font-sans transition-all duration-150 cursor-pointer"
            >
              🧭 Look North
            </button>
          </div>
        </div>
      )}

      {/* ── BOTTOM SECTION: Flex container pushing downward ── */}
      <div className="flex flex-row justify-between items-end gap-4 w-full">
        {/* Bottom-Left Flex Column (gap-4) */}
        <div className="flex flex-col gap-4 max-w-md pointer-events-auto">
          {/* Surface View: Local Environmental Metrics Card */}
          {isAstronautView ? (
            <div className="bg-black/80 backdrop-blur-md border border-white/15 p-3.5 rounded-xl shadow-xl flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
                <span className={safeSunEl > -0.27 ? 'text-white' : 'text-neutral-500'}>
                  ☀️ Sun: {safeSunEl.toFixed(1)}° el / {safeSunAz.toFixed(1)}° az
                </span>
                <span className={safeEarthEl > 0 ? 'text-neutral-200' : 'text-neutral-500'}>
                  🌍 Earth: {safeEarthEl.toFixed(1)}° el / {safeEarthAz.toFixed(1)}° az
                </span>
              </div>
              <div className="text-[11px] font-mono text-neutral-300 border-t border-white/10 pt-1.5 flex items-center gap-2">
                <span className="text-neutral-400">📏</span>
                <span>{shadowText}</span>
              </div>
            </div>
          ) : (
            /* Orbit View: Orbital Lighting Status Card */
            <div className="bg-black/75 backdrop-blur-md border border-white/12 p-3 rounded-xl shadow-lg flex flex-col gap-1 text-[11px] font-mono">
              <div className="flex items-center gap-2 text-white">
                <span>☀️ Solar Vector:</span>
                <span>{safeSunEl.toFixed(1)}° el / {safeSunAz.toFixed(1)}° az</span>
              </div>
              <span className="text-[10px] text-neutral-400">
                {safeSunEl > 0 ? 'Direct Solar Illumination' : 'In Grazing Rim Shadow'}
                {isSimulating && ' · 20s Sweep Active'}
              </span>
            </div>
          )}
        </div>

        {/* Bottom-Right Flex Column: View Mode Switcher */}
        <div className="flex flex-col gap-4 items-end pointer-events-auto">
          {onToggleViewMode && (
            <button
              onClick={() => onToggleViewMode(isAstronautView ? 'orbit' : 'astronaut')}
              className="bg-black/80 hover:bg-white hover:text-black text-white border border-white/25 px-4 py-2.5 rounded-xl text-xs font-sans font-medium tracking-wider backdrop-blur-md transition-all duration-200 cursor-pointer shadow-xl flex items-center gap-2"
            >
              <span>{isAstronautView ? '🪐 Orbit Mast View' : '👨‍🚀 Astronaut EVA View'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
