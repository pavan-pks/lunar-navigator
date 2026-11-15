import React from 'react';

/**
 * Minimalist Astronomical Reticle & Subtle Vector Leader Line.
 * Understated, elegant typography and whisper-thin vectors inspired by high-end astronomy instruments.
 */
export function TargetingReticle({ targetName, targetCoords, craterScreenPos, isLocked = true }) {
  const hasCraterPos = craterScreenPos && Number.isFinite(craterScreenPos.x) && Number.isFinite(craterScreenPos.y);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {/* 1. MINIMAL PINPOINT DOT ON TARGET (no dashed leader line) */}
      {hasCraterPos && (
        <svg className="absolute inset-0 w-full h-full">
          {/* Subtle minimal pinpoint dot */}
          <circle cx={craterScreenPos.x} cy={craterScreenPos.y} r="2.5" fill="#f5f5f5" fillOpacity="0.85" />
          <circle cx={craterScreenPos.x} cy={craterScreenPos.y} r="7" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        </svg>
      )}

      {/* 2. MINIMALIST CENTER OPTICAL CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 flex items-center justify-center">
        {/* Subtle 1px circle */}
        <div className="w-24 h-24 rounded-full border border-white/10 flex items-center justify-center relative">
          {/* Whisper-thin crosshair ticks */}
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-white/25"></div>
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-[1px] h-3 bg-white/25"></div>
          <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-[1px] bg-white/25"></div>
          <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-[1px] bg-white/25"></div>

          {/* Tiny center point */}
          <div className="w-1.5 h-1.5 rounded-full bg-white/80"></div>
        </div>

        {/* Minimal Understated Target Label with 2-line max-width and tooltip */}
        <div
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-center w-max max-w-[14rem] px-2"
          title={targetName}
        >
          <div className="text-[11px] font-sans font-medium tracking-[0.15em] sm:tracking-[0.25em] text-[#f5f5f5] uppercase drop-shadow-sm line-clamp-2 text-balance leading-tight">
            {targetName}
          </div>
          {targetCoords && (
            <div className="text-[10px] font-mono font-light tracking-wider text-neutral-400 mt-0.5">
              {targetCoords.lat > 0 ? `+${targetCoords.lat.toFixed(2)}°` : `${targetCoords.lat.toFixed(2)}°`} · {targetCoords.lon > 0 ? `+${targetCoords.lon.toFixed(2)}°` : `${targetCoords.lon.toFixed(2)}°`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TargetingReticle;
