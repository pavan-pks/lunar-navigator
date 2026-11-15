import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * src/components/ui/VerdictBadge.jsx
 * Mission viability status badge with clear, restrained plain-English criteria.
 */
export function VerdictBadge({ verdict, compact = false }) {
  const [showReasons, setShowReasons] = useState(false);

  if (!verdict) return null;

  const { level = 'risky', reasons = [] } = verdict;

  let badgeClass = 'bg-amber-500/10 border-amber-500/30 text-amber-300';
  let dotClass = 'bg-amber-400';
  let title = 'Caution';

  if (level === 'viable') {
    badgeClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
    dotClass = 'bg-emerald-400';
    title = 'Viable';
  } else if (level === 'not-viable') {
    badgeClass = 'bg-rose-500/10 border-rose-500/30 text-rose-300';
    dotClass = 'bg-rose-400';
    title = 'Not Recommended';
  }

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-sans font-medium tracking-wide backdrop-blur-md ${badgeClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
        <span>{title}</span>
      </span>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-sans font-medium tracking-wide backdrop-blur-md ${badgeClass}`}>
          <span className={`w-2 h-2 rounded-full ${dotClass} shadow-[0_0_6px_currentColor]`}></span>
          <span>{title}</span>
        </div>

        {reasons.length > 0 && (
          <button
            type="button"
            onClick={() => setShowReasons(!showReasons)}
            className="text-[11px] text-neutral-400 hover:text-white transition cursor-pointer flex items-center gap-1 font-sans"
          >
            <span>{showReasons ? 'Hide Criteria' : 'Assessment Criteria'}</span>
            {showReasons ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {showReasons && reasons.length > 0 && (
        <ul className="text-[11px] text-neutral-300 bg-black/60 p-3 rounded-lg border border-white/10 space-y-1.5 font-sans leading-relaxed">
          {reasons.map((r, idx) => (
            <li key={idx} className="flex items-start gap-2">
              <span className="text-neutral-500">•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default VerdictBadge;
