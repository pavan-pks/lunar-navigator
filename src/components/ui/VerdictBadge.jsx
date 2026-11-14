import React, { useState } from 'react';

/**
 * src/components/ui/VerdictBadge.jsx
 * Accessible mission window viability badge with expandable reasons list.
 */
export function VerdictBadge({ verdict, compact = false }) {
  const [showReasons, setShowReasons] = useState(false);

  if (!verdict) return null;

  const { level = 'risky', reasons = [] } = verdict;

  let badgeClass = 'bg-amber-500/10 border-amber-500/40 text-amber-300';
  let icon = '⚠️';
  let title = 'RISKY';

  if (level === 'viable') {
    badgeClass = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300';
    icon = '✓';
    title = 'VIABLE';
  } else if (level === 'not-viable') {
    badgeClass = 'bg-red-500/10 border-red-500/40 text-red-300';
    icon = '✕';
    title = 'NOT VIABLE';
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-bold font-mono tracking-wide ${badgeClass}`}>
        <span>{icon}</span>
        <span>{title}</span>
      </span>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold font-mono tracking-wide ${badgeClass}`}>
          <span>{icon}</span>
          <span>{title}</span>
        </div>

        {reasons.length > 0 && (
          <button
            onClick={() => setShowReasons(!showReasons)}
            className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2 transition-colors cursor-pointer"
          >
            {showReasons ? 'Hide Criteria' : 'Evaluation Criteria'}
          </button>
        )}
      </div>

      {showReasons && reasons.length > 0 && (
        <ul className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
          {reasons.map((r, idx) => (
            <li key={idx} className="flex items-start gap-1.5">
              <span className="text-slate-500">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default VerdictBadge;
