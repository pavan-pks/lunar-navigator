import React, { useState } from 'react';
import { X, Copy, Check } from 'lucide-react';

/**
 * Minimal Mission Report Modal (UI only — no backend).
 * Displays a formatted summary of the active landing site analysis.
 * "Copy to Clipboard" copies the plain-text version.
 */
export function ReportModal({ isOpen, onClose, site, stats, live, verdict, launchDate, transitDays }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const landing = (() => {
    try {
      const d = new Date(launchDate);
      d.setDate(d.getDate() + transitDays);
      return d.toISOString().slice(0, 10);
    } catch {
      return 'N/A';
    }
  })();

  const sunElStr = live?.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live?.sunEl?.toFixed(1) ?? '--'}°`;
  const earthElStr = live?.earthEl > 0 ? `+${live.earthEl.toFixed(1)}°` : `${live?.earthEl?.toFixed(1) ?? '--'}°`;
  const commsStr = `${((stats?.earthVisibleFraction ?? 0) * 100).toFixed(0)}%`;
  const peakDarkStr = `${stats?.longestDarkHours ?? '--'}h`;
  const solarYield = `${Math.min(100, Math.max(0, Math.sin(((live?.sunEl ?? 0) * Math.PI) / 180) * 100 * 2.5)).toFixed(0)}%`;

  const rows = [
    ['Site', site?.name ?? 'Unknown'],
    ['Latitude', site?.lat > 0 ? `+${site.lat.toFixed(3)}° N` : `${site?.lat?.toFixed(3) ?? '--'}° S`],
    ['Longitude', site?.lon > 0 ? `+${site.lon.toFixed(3)}° E` : `${site?.lon?.toFixed(3) ?? '--'}°`],
    ['Launch Date', launchDate?.slice(0, 10) ?? 'N/A'],
    ['Landing Date', landing],
    ['Transit', `${transitDays} day${transitDays !== 1 ? 's' : ''}`],
    ['─────────────────', '──────────'],
    ['Sun Elevation', sunElStr],
    ['Earth Elevation', earthElStr],
    ['Solar Yield', solarYield],
    ['Peak Darkness', peakDarkStr],
    ['Comms Window', commsStr],
    ['─────────────────', '──────────'],
    ['Flight Status', verdict?.badge ?? 'Pending'],
  ];

  const plainText = [
    'LUNAR NAVIGATOR — SITE ANALYSIS REPORT',
    `Generated: ${new Date().toUTCString()}`,
    '',
    ...rows.map(([k, v]) => k.startsWith('─') ? k : `${k.padEnd(20)} ${v}`),
  ].join('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(plainText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal panel */}
      <div className="relative w-full max-w-sm mx-6 bg-[#0a0a0a] border border-white/8 rounded-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <div>
            <span className="text-[9px] font-sans font-light tracking-[0.3em] text-[#a3a3a3] uppercase block">
              Mission Analysis
            </span>
            <span className="text-sm font-sans font-light text-[#f5f5f5]">Site Report</span>
          </div>
          <button onClick={onClose} className="text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-none p-1">
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-1">
          {rows.map(([key, val], i) =>
            key.startsWith('─') ? (
              <div key={i} className="border-t border-white/5 my-3" />
            ) : (
              <div key={i} className="flex justify-between items-baseline gap-4">
                <span className="text-[10px] font-sans font-light tracking-[0.15em] text-[#a3a3a3] uppercase shrink-0">
                  {key}
                </span>
                <span className="text-xs font-mono font-light text-[#f5f5f5] text-right">{val}</span>
              </div>
            )
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex justify-between items-center">
          <span className="text-[9px] font-sans text-[#a3a3a3] font-light">
            Lunar Navigator · NASA Space Apps
          </span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-[10px] font-sans tracking-wider text-[#f5f5f5] border border-white/15 hover:border-white/50 px-3 py-1.5 transition cursor-none"
          >
            {copied ? <Check size={10} /> : <Copy size={10} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
