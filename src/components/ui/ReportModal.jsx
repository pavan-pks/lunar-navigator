import React, { useState } from 'react';
import { X, Copy, Check, Printer, Download } from 'lucide-react';
import { shadowLength } from '../../lib/metrics.js';

/**
 * Professional Flight Mission Evaluation Report Modal.
 * Print-optimized document for engineering evaluation with window.print() PDF export.
 * Includes complete assumptions, data provenance, and flight rule criteria.
 */
export function ReportModal({
  isOpen,
  onClose,
  site,
  stats,
  live,
  verdict,
  launchDate,
  transitDays,
  slipDays = 0,
  landingDateStr,
  ephem,
  missionDays = 14,
  useHorizonMask = false
}) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const latStr = site?.lat >= 0 ? `+${site.lat.toFixed(3)}° N` : `${Math.abs(site?.lat ?? 0).toFixed(3)}° S`;
  const lonStr = site?.lon >= 0 ? `+${site.lon.toFixed(3)}° E` : `${Math.abs(site?.lon ?? 0).toFixed(3)}° W`;

  const sunPct = stats ? (stats.sunlitFraction * 100).toFixed(1) : '--';
  const commsPct = stats ? (stats.earthVisibleFraction * 100).toFixed(1) : '--';
  const longestDark = stats?.longestDarkHours ?? '--';
  const shadowM = shadowLength(3.0, live?.sunEl ?? 0);
  const shadowStr = Number.isFinite(shadowM) ? `${shadowM.toFixed(1)} m` : 'Horizon Blocked';

  const handlePrint = () => {
    window.print();
  };

  const plainTextReport = `
================================================================================
                    LUNAR NAVIGATOR — MISSION EVALUATION REPORT
================================================================================
Generated: ${new Date().toUTCString()}
Evaluation Standard: NASA Space Apps Challenge 2026

1. TARGET IDENTIFICATION & GEODETIC COORDINATES
--------------------------------------------------------------------------------
Site Name:        ${site?.name ?? 'Unknown'}
Site Identifier:  ${site?.id ?? 'N/A'}
Terrain Class:    ${site?.terrainType ?? 'Illustrative'}
Latitude:         ${latStr}
Longitude:        ${lonStr}

2. TEMPORAL MISSION FLIGHT PROFILE
--------------------------------------------------------------------------------
Launch Date:      ${launchDate ? launchDate.slice(0, 10) : 'N/A'}
Transit Duration: ${transitDays} days
Launch Slip:      ${slipDays} days
Landing Date:     ${landingDateStr || 'N/A'} 00:00 UTC
Mission Duration: ${missionDays} days (${missionDays * 24} hours)

3. FLIGHT RULE VIABILITY VERDICT
--------------------------------------------------------------------------------
Verdict:          ${verdict?.level?.toUpperCase() ?? 'PENDING'}
Evaluation Rules:
${(verdict?.reasons || []).map((r, i) => `  [${i + 1}] ${r}`).join('\n')}

4. KEY QUANTITATIVE METRICS
--------------------------------------------------------------------------------
Solar Illumination:         ${sunPct}% (${stats?.sunlitHours ?? 0} hours)
Peak Continuous Darkness:   ${longestDark} hours
Earth Direct Line-of-Sight: ${commsPct}%
Lander 3m Mast Shadow:      ${shadowStr}
Current Sun Elevation:      ${live?.sunEl !== undefined ? `${live.sunEl.toFixed(2)}°` : '--'}
Current Earth Elevation:    ${live?.earthEl !== undefined ? `${live.earthEl.toFixed(2)}°` : '--'}

5. MODEL ASSUMPTIONS & PROVENANCE
--------------------------------------------------------------------------------
Ephemeris Data Source:     NASA/JPL Horizons Ephemeris System (DE440 Numerical Ephemeris, Δ < 0.008°)
Topographic Elevation:     ${useHorizonMask ? 'NASA LOLA regional azimuthal horizon elevation mask active' : 'Smooth spherical datum (R = 1,737.4 km)'}
Sunrise Horizon Criterion: Sun elevation > -0.27° (0.267° solar angular semi-diameter)
Line-of-Sight Criterion:   Earth elevation > 0.0°
Disclaimer:                This report is generated for educational and comparative trade
                           study purposes and is not affiliated with or endorsed by NASA.
================================================================================
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(plainTextReport).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded p-6 shadow-2xl text-xs font-mono text-neutral-300 space-y-4 max-h-[90vh] overflow-y-auto print:max-h-none print:border-none print:bg-white print:text-black print:p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 print:border-black">
          <div>
            <div className="text-[10px] text-sky-400 font-bold uppercase tracking-widest print:text-neutral-600">
              NASA Space Apps 2026 // Mission Trade Study
            </div>
            <h2 className="text-base font-sans font-bold text-white print:text-black mt-0.5">
              Landing Site Evaluation Report
            </h2>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="p-1.5 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-colors"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-colors"
              title="Copy plain-text report"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white transition-colors"
              aria-label="Close report"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Section 1: Site & Target */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-900/60 rounded border border-neutral-800 print:bg-transparent print:border-neutral-300">
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block">Candidate Landing Site</span>
            <span className="text-neutral-100 font-bold text-sm print:text-black">{site?.name || 'Selected Site'}</span>
            <span className="text-neutral-400 text-[11px] block print:text-neutral-600">{latStr}, {lonStr}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-500 uppercase block">Flight Rule Viability</span>
            <span className={`font-bold text-sm uppercase ${
              verdict?.level === 'viable' ? 'text-emerald-400 print:text-emerald-700' :
              verdict?.level === 'not-viable' ? 'text-red-400 print:text-red-700' : 'text-amber-400 print:text-amber-700'
            }`}>
              {verdict?.level || 'Pending'}
            </span>
            <span className="text-[10px] text-neutral-400 block print:text-neutral-600">
              {verdict?.reasons?.[0] || 'Nominal margins'}
            </span>
          </div>
        </div>

        {/* Section 2: Temporal Schedule */}
        <div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 font-semibold">
            Temporal Profile
          </div>
          <div className="grid grid-cols-4 gap-2 text-[11px] bg-neutral-900/40 p-2.5 rounded border border-neutral-800 print:bg-transparent print:border-neutral-300">
            <div>
              <span className="text-neutral-500 text-[10px] block">Launch:</span>
              <span className="text-neutral-200 print:text-black font-semibold">{launchDate?.slice(0, 10)}</span>
            </div>
            <div>
              <span className="text-neutral-500 text-[10px] block">Transit:</span>
              <span className="text-neutral-200 print:text-black">{transitDays}d</span>
            </div>
            <div>
              <span className="text-neutral-500 text-[10px] block">Slip Margin:</span>
              <span className="text-neutral-200 print:text-black">+{slipDays}d</span>
            </div>
            <div>
              <span className="text-neutral-500 text-[10px] block">Touchdown:</span>
              <span className="text-sky-300 print:text-black font-bold">{landingDateStr}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Key Performance Metrics */}
        <div>
          <div className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5 font-semibold">
            Mission Environmental Metrics
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-2.5 bg-neutral-900/60 rounded border border-neutral-800 print:bg-transparent print:border-neutral-300">
              <span className="text-[10px] text-neutral-500 uppercase block">Solar Illumination</span>
              <span className="text-base font-bold text-neutral-100 print:text-black">{sunPct}%</span>
              <span className="text-[10px] text-neutral-400 block">{stats?.sunlitHours ?? 0}h in daylight</span>
            </div>

            <div className="p-2.5 bg-neutral-900/60 rounded border border-neutral-800 print:bg-transparent print:border-neutral-300">
              <span className="text-[10px] text-neutral-500 uppercase block">Continuous Darkness</span>
              <span className={`text-base font-bold ${Number(longestDark) > 48 ? 'text-amber-400 print:text-amber-700' : 'text-neutral-100 print:text-black'}`}>
                {longestDark}h
              </span>
              <span className="text-[10px] text-neutral-400 block">Peak nocturnal drain</span>
            </div>

            <div className="p-2.5 bg-neutral-900/60 rounded border border-neutral-800 print:bg-transparent print:border-neutral-300">
              <span className="text-[10px] text-neutral-500 uppercase block">Earth RF Link</span>
              <span className="text-base font-bold text-neutral-100 print:text-black">{commsPct}%</span>
              <span className="text-[10px] text-neutral-400 block">Direct Line-of-Sight</span>
            </div>
          </div>
        </div>

        {/* Section 4: Physical Modeling Assumptions */}
        <div className="p-3 bg-neutral-900/30 rounded border border-neutral-800 text-[10px] text-neutral-400 space-y-1 print:bg-transparent print:border-neutral-300 print:text-neutral-700">
          <div className="font-semibold text-neutral-300 print:text-black uppercase tracking-wider">
            Scientific Assumptions & Provenance
          </div>
          <div>• Ephemeris: NASA/JPL Horizons System (target Moon 301, observer geocenter 500@399).</div>
          <div>• Geometric model: Smooth-sphere lunar datum (R = 1,737.4 km). Local slope and micro-topography are illustrative.</div>
          <div>• Thresholds: Sun elevation &gt; -0.27° defines sun up; Earth elevation &gt; 0° defines RF visibility.</div>
          <div>• Disclaimer: Not affiliated with or endorsed by NASA. Produced for Space Apps 2026.</div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 print:hidden">
          <span className="text-[10px] text-neutral-500">
            Document generated locally. Ready for archival or distribution.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="px-3 py-1.5 rounded border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 transition-colors text-xs"
            >
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold transition-colors text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
