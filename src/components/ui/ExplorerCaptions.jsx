import React, { useState } from 'react';
import { getExplorerCaptions } from '../../lib/captions.js';
import { Glossary } from './Glossary.jsx';

/**
 * src/components/ui/ExplorerCaptions.jsx
 * Educational cards and guided insights designed for students and public exploration.
 */
export function ExplorerCaptions({
  stats,
  liveAngles,
  siteName = 'Candidate Site',
  objectHeightM = 3.0
}) {
  const [showGlossary, setShowGlossary] = useState(false);

  const captions = getExplorerCaptions({
    stats,
    liveAngles,
    objectHeightM,
    siteName
  });

  return (
    <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-base">🧭</span>
          <span className="font-bold text-slate-200 uppercase tracking-wider text-xs">
            Explorer Mode Insights: {siteName}
          </span>
        </div>
        <button
          onClick={() => setShowGlossary(true)}
          className="text-xs text-sky-400 hover:text-sky-300 font-medium underline underline-offset-2 transition-colors cursor-pointer"
        >
          Open Lunar Glossary ↗
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {captions.map((c, idx) => (
          <div
            key={idx}
            className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 space-y-1"
          >
            <div className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
              <span>{c.icon}</span>
              <span>{c.title}</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              {c.text}
            </p>
          </div>
        ))}
      </div>

      <Glossary isOpen={showGlossary} onClose={() => setShowGlossary(false)} />
    </div>
  );
}

export default ExplorerCaptions;
