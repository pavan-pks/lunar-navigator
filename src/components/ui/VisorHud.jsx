import React, { useState, useEffect } from 'react';

/**
 * src/components/ui/VisorHud.jsx
 * Fullscreen Artemis astronaut helmet-visor HUD with telemetry tape, gauges, and reticle.
 */
export function VisorHud({
  isOpen,
  onClose,
  sunEl = 2.4,
  earthEl = 8.6,
  siteName = 'Shackleton Rim',
  distanceM = 1420
}) {
  const [heading, setHeading] = useState(180);
  const [o2Pct, setO2Pct] = useState(94);
  const [batteryPct, setBatteryPct] = useState(88);
  const [waterPct, setWaterPct] = useState(91);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setHeading(prev => (prev + 0.2) % 360);
    }, 100);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none font-mono text-[#8dffc0] flex flex-col justify-between p-6 sm:p-10">
      {/* Visor Vignette & Curved Glass Shader Effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_70%_at_50%_50%,rgba(0,30,20,0)_55%,rgba(0,10,8,0.75)_100%)] shadow-[inset_0_0_120px_rgba(0,0,0,0.85)] pointer-events-none" />

      {/* Top Heading Tape */}
      <div className="relative mx-auto w-full max-w-lg h-12 border-b border-[#8dffc0]/60 bg-[#00140c]/40 rounded-t-xl overflow-hidden flex items-center justify-center">
        <div className="absolute top-1 text-[11px] font-bold px-2 py-0.5 bg-[#00140c]/80 rounded border border-[#8dffc0]/30">
          HDG {Math.round(heading)}° • LUNAR SOUTH
        </div>
        <div className="absolute bottom-0 w-full flex justify-between px-4 text-[9px] text-[#8dffc0]/70 pb-0.5">
          <span>150°</span>
          <span>160°</span>
          <span>170°</span>
          <span className="font-bold text-[#ffd25a]">180° S</span>
          <span>190°</span>
          <span>200°</span>
          <span>210°</span>
        </div>
        <div className="absolute bottom-0 w-2 h-2 border-b-2 border-l-2 border-r-2 border-[#ffd25a] -translate-x-1/2 left-1/2" />
      </div>

      {/* Center Reticle & Target Distance */}
      <div className="relative flex flex-col items-center justify-center space-y-2 pointer-events-none">
        <div className="w-14 h-14 rounded-full border border-[#8dffc0]/40 flex items-center justify-center relative">
          <div className="w-1.5 h-1.5 rounded-full bg-[#8dffc0] shadow-[0_0_8px_#8dffc0]" />
          <div className="absolute top-0 w-0.5 h-2 bg-[#8dffc0]/60" />
          <div className="absolute bottom-0 w-0.5 h-2 bg-[#8dffc0]/60" />
          <div className="absolute left-0 w-2 h-0.5 bg-[#8dffc0]/60" />
          <div className="absolute right-0 w-2 h-0.5 bg-[#8dffc0]/60" />
        </div>
        <div className="text-center bg-[#00140c]/60 px-4 py-1.5 rounded-xl border border-[#8dffc0]/30">
          <div className="text-2xl font-bold tracking-tight text-white drop-shadow-[0_0_8px_rgba(141,255,192,0.8)]">
            {distanceM} <span className="text-sm font-normal text-[#8dffc0]">m</span>
          </div>
          <div className="text-[11px] text-[#8dffc0]/80">NEXT STATION: {siteName.toUpperCase()}</div>
        </div>
      </div>

      {/* Middle Row: Left Gauges, Right Celestial Vectors */}
      <div className="relative flex items-center justify-between w-full pointer-events-none">
        {/* Left xEMU Consumables Gauges */}
        <div className="flex gap-4 p-3 bg-[#00140c]/50 rounded-2xl border border-[#8dffc0]/30 backdrop-blur-xs">
          {/* O2 */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px]">O₂</span>
            <div className="w-3.5 h-24 border border-[#8dffc0]/60 rounded-sm relative overflow-hidden bg-black/40">
              <div className="absolute bottom-0 w-full bg-[#8dffc0]" style={{ height: `${o2Pct}%` }} />
            </div>
            <span className="text-[10px] font-bold">{o2Pct}%</span>
          </div>

          {/* Battery */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px]">PWR</span>
            <div className="w-3.5 h-24 border border-[#8dffc0]/60 rounded-sm relative overflow-hidden bg-black/40">
              <div className="absolute bottom-0 w-full bg-[#ffd25a]" style={{ height: `${batteryPct}%` }} />
            </div>
            <span className="text-[10px] font-bold text-[#ffd25a]">{batteryPct}%</span>
          </div>

          {/* Water */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px]">H₂O</span>
            <div className="w-3.5 h-24 border border-[#8dffc0]/60 rounded-sm relative overflow-hidden bg-black/40">
              <div className="absolute bottom-0 w-full bg-[#38bdf8]" style={{ height: `${waterPct}%` }} />
            </div>
            <span className="text-[10px] font-bold text-[#38bdf8]">{waterPct}%</span>
          </div>
        </div>

        {/* Right Celestial Readout */}
        <div className="p-3 bg-[#00140c]/50 rounded-2xl border border-[#8dffc0]/30 backdrop-blur-xs text-right space-y-1.5 text-xs">
          <div>
            <span className="text-[9px] text-[#8dffc0]/70 block">SUN ELEVATION</span>
            <span className="font-bold text-base text-[#ffd25a]">+{sunEl.toFixed(1)}°</span>
          </div>
          <div>
            <span className="text-[9px] text-[#8dffc0]/70 block">EARTH LINE-OF-SIGHT</span>
            <span className="font-bold text-base text-[#8dffc0]">+{earthEl.toFixed(1)}° DIRECT</span>
          </div>
          <div className="text-[10px] text-[#8dffc0]/60 pt-1 border-t border-[#8dffc0]/20">
            RAD: 0.12 mSv/h (NOMINAL)
          </div>
        </div>
      </div>

      {/* Bottom Dock Control */}
      <div className="relative mx-auto pointer-events-auto flex items-center gap-3 pt-2">
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-xl bg-[#c5221f]/80 hover:bg-[#c5221f] text-white font-bold text-xs border border-red-500/50 shadow-lg cursor-pointer transition"
        >
          Exit Helmet Visor
        </button>
      </div>
    </div>
  );
}

export default VisorHud;
