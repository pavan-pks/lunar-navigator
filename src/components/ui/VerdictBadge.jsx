import React, { useState } from 'react';

/**
 * src/components/ui/VerdictBadge.jsx
 * Mission flight readiness & viability verdict badge with expandable telemetry criteria.
 */
export function VerdictBadge({ verdict, compact = false }) {
  const [showReasons, setShowReasons] = useState(false);

  if (!verdict) return null;

  const { level = 'risky', reasons = [] } = verdict;

  let badgeClass = 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
  let dotClass = 'bg-amber-400';
  let title = 'MARGINAL // RISKY';

  if (level === 'viable') {
    badgeClass = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    dotClass = 'bg-emerald-400';
    title = 'FLIGHT VIABLE // GO';
  } else if (level === 'not-viable') {
    badgeClass = 'bg-red-500/10 border-red-500/40 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
    dotClass = 'bg-red-400';
    title = 'UNACCEPTABLE // NO-GO';
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold font-mono tracking-wider uppercase backdrop-blur-md ${badgeClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass} animate-pulse`}></span>
        <span>{title}</span>
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono tracking-widest uppercase backdrop-blur-md ${badgeClass}`}>
          <span className={`w-2 h-2 rounded-full ${dotClass} shadow-[0_0_8px_currentColor] animate-pulse`}></span>
          <span>{title}</span>
        </div>

        {reasons.length > 0 && (
          <button
            onClick={() => setShowReasons(!showReasons)}
            className="text-[11px] text-slate-400 hover:text-sky-300 transition-colors font-mono cursor-pointer flex items-center gap-1"
          >
            <span>{showReasons ? '▲ Hide Criteria' : '▼ Mission Flight Rules'}</span>
          </button>
        )}
      </div>

      {showReasons && reasons.length > 0 && (
        <ul className="text-[11px] text-slate-300 bg-black/60 p-3 rounded-xl border border-white/10 space-y-1.5 font-mono shadow-inner">
          {reasons.map((r, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-slate-500 text-[10px] font-bold mt-0.5">[{idx + 1}]</span>
              <span className="leading-relaxed">{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default VerdictBadge;
