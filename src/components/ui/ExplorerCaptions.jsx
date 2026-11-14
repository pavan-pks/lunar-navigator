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
    <div className="bg-[#070b14]/85 p-5 rounded-3xl border border-white/10 space-y-4 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-base text-amber-400">🧭</span>
          <span className="font-display font-bold text-slate-100 uppercase tracking-wider text-xs">
            Explorer Mode Insights: {siteName}
          </span>
        </div>
        <button
          onClick={() => setShowGlossary(true)}
          className="text-xs text-sky-400 hover:text-sky-300 font-mono transition-colors cursor-pointer px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20"
        >
          Open Lunar Glossary ↗
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
        {captions.map((c, idx) => (
          <div
            key={idx}
            className="p-3.5 bg-black/60 rounded-2xl border border-white/5 space-y-1.5 shadow-sm"
          >
            <div className="flex items-center gap-2 text-slate-200 font-semibold text-xs">
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
