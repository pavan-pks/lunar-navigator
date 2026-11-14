import React from 'react';

/**
 * Game-Like Targeting Computer Reticle & Dynamic SVG Callout Lines.
 * Sits in the center viewport and draws a diegetic telemetry link to the side panels.
 */
export function TargetingReticle({ targetName, targetCoords, craterScreenPos, isLocked = true }) {
  const hasCraterPos = craterScreenPos && Number.isFinite(craterScreenPos.x) && Number.isFinite(craterScreenPos.y);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {/* 1. DYNAMIC SVG CALLOUT LINE FROM CRATER TO TELEMETRY SIDEBAR */}
      {hasCraterPos && (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="cyanLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.2" />
            </linearGradient>
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Line connecting to Left Sidebar */}
          <polyline
            points={`
              ${craterScreenPos.x},${craterScreenPos.y} 
              ${Math.max(120, craterScreenPos.x - 90)},${craterScreenPos.y - 40} 
              280,${craterScreenPos.y - 40}
            `}
            fill="none"
            stroke="url(#cyanLineGrad)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            filter="url(#cyanGlow)"
          />

          {/* Pulsing beacon ring right at crater location */}
          <circle
            cx={craterScreenPos.x}
            cy={craterScreenPos.y}
            r="6"
            fill="none"
            stroke="#00f0ff"
            strokeWidth="1.5"
          >
            <animate attributeName="r" values="4;14;4" dur="2s" repeatCount="indefinite" />
            <animate attributeName="stroke-opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx={craterScreenPos.x} cy={craterScreenPos.y} r="2.5" fill="#00f0ff" />
        </svg>
      )}

      {/* 2. STATIC AEROSPACE TARGETING CROSSHAIR IN DEAD CENTER */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 flex items-center justify-center">
        {/* Corner Brackets */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400 shadow-[0_0_8px_#00f0ff]"></div>
        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400 shadow-[0_0_8px_#00f0ff]"></div>
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400 shadow-[0_0_8px_#00f0ff]"></div>
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400 shadow-[0_0_8px_#00f0ff]"></div>

        {/* Outer Circular Reticle Ring */}
        <div className="w-28 h-28 rounded-full border border-cyan-500/30 flex items-center justify-center relative">
          {/* 4 Cardinal Crosshair Ticks */}
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-cyan-400"></div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-cyan-400"></div>
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-cyan-400"></div>
          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-3 h-0.5 bg-cyan-400"></div>

          {/* Inner Reticle & Pulsing Dot */}
          <div className="w-12 h-12 rounded-full border border-cyan-400/50 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#00f0ff] animate-pulse"></div>
          </div>
        </div>

        {/* Diegetic Telemetry Tags around Crosshair */}
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-center whitespace-nowrap">
          <div className="text-[10px] font-mono tracking-widest text-cyan-300 font-bold bg-black/60 px-2 py-0.5 rounded border border-cyan-500/40">
            {isLocked ? `TARGET LOCK: ${targetName.toUpperCase()}` : 'SEEKING ACQUISITION'}
          </div>
          {targetCoords && (
            <div className="text-[9px] font-mono text-slate-400 mt-0.5">
              LAT {targetCoords.lat > 0 ? `+${targetCoords.lat.toFixed(1)}°` : `${targetCoords.lat.toFixed(1)}°`} | LON {targetCoords.lon > 0 ? `+${targetCoords.lon.toFixed(1)}°` : `${targetCoords.lon.toFixed(1)}°`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TargetingReticle;
