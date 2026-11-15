import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

/**
 * Persistent Mission Verdict Strip.
 * Displays Viable / Risky / Not viable flight rule status with 3 core engineering metrics:
 * 1. Sunlit percentage
 * 2. Longest continuous darkness duration
 * 3. Earth direct line-of-sight percentage
 *
 * Restrained engineering tone without decorative glow or emojis.
 */
export function VerdictStrip({
  verdict,
  stats,
  live,
  siteName = 'Target Site'
}) {
  const [expanded, setExpanded] = useState(false);

  if (!verdict || !stats) return null;

  const { level = 'risky', reasons = [] } = verdict;

  const sunPct = (stats.sunlitFraction * 100).toFixed(0);
  const commsPct = (stats.earthVisibleFraction * 100).toFixed(0);
  const darkHours = stats.longestDarkHours;

  let badgeStyle = 'bg-amber-950/40 border-amber-600/50 text-amber-300';
  let badgeIcon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
  let verdictText = 'RISKY';

  if (level === 'viable') {
    badgeStyle = 'bg-emerald-950/40 border-emerald-600/50 text-emerald-300';
    badgeIcon = <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    verdictText = 'VIABLE';
  } else if (level === 'not-viable') {
    badgeStyle = 'bg-red-950/40 border-red-600/50 text-red-300';
    badgeIcon = <XCircle className="w-3.5 h-3.5 text-red-400" />;
    verdictText = 'NOT VIABLE';
  }

  return (
    <div className="w-full bg-neutral-950/90 border-b border-neutral-800 text-neutral-300 text-xs font-mono select-none backdrop-blur-md z-20">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Verdict badge */}
        <div className="flex items-center gap-3">
          <div className={`px-2.5 py-1 rounded border flex items-center gap-1.5 font-bold tracking-wider text-[11px] ${badgeStyle}`}>
            {badgeIcon}
            <span>{verdictText}</span>
          </div>
          <span className="text-neutral-400 font-sans text-xs font-medium">
            {siteName}
          </span>
          {reasons.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(prev => !prev)}
              className="text-[11px] text-neutral-400 hover:text-neutral-200 transition-colors flex items-center gap-1 border-b border-neutral-700/60 pb-0.5 cursor-pointer"
              aria-expanded={expanded}
            >
              <span>Criteria ({reasons.length})</span>
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Center / Right: 3 Key Metrics */}
        <div className="flex items-center gap-6 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500 uppercase text-[10px]">Sunlit:</span>
            <span className="text-neutral-100 font-bold tabular-nums">{sunPct}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-500 uppercase text-[10px]">Max Darkness:</span>
            <span className={`font-bold tabular-nums ${darkHours > 48 ? 'text-amber-400' : 'text-neutral-100'}`}>
              {darkHours} h
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-500 uppercase text-[10px]">Earth LOS:</span>
            <span className="text-neutral-100 font-bold tabular-nums">{commsPct}%</span>
          </div>

          {live && (
            <div className="hidden md:flex items-center gap-3 pl-4 border-l border-neutral-800 text-neutral-400 text-[10px]">
              <span>Sun El: <strong className="text-neutral-200 tabular-nums">{live.sunEl > 0 ? `+${live.sunEl.toFixed(1)}°` : `${live.sunEl.toFixed(1)}°`}</strong></span>
              <span>Earth El: <strong className="text-neutral-200 tabular-nums">{live.earthEl > 0 ? `+${live.earthEl.toFixed(1)}°` : `${live.earthEl.toFixed(1)}°`}</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Expanded Flight Rule Reasons */}
      {expanded && reasons.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 py-2.5 border-t border-neutral-800/80 bg-neutral-900/60">
          <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1 font-semibold">
            Flight Rule Evaluation Criteria:
          </div>
          <ul className="space-y-1 text-[11px] text-neutral-300">
            {reasons.map((r, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-neutral-500">[{idx + 1}]</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default VerdictStrip;
