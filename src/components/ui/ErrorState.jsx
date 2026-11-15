import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * src/components/ui/ErrorState.jsx
 * Friendly failure card with action retry.
 */
export function ErrorState({ error, onRetry }) {
  return (
    <div className="min-h-screen bg-[#030508] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.1),transparent_70%)] pointer-events-none"></div>
      <div className="max-w-md w-full bg-[#070b14]/90 border border-red-500/30 rounded-3xl p-6 shadow-2xl text-center space-y-4 backdrop-blur-md relative z-10">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-2xl font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)]">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-display font-semibold text-white">Lunar Ephemeris Load Anomaly</h2>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {error?.message || 'Could not load required lunar datasets from local cache.'}
          </p>
        </div>
        <div className="text-[11px] text-slate-400 bg-black/60 p-3 rounded-xl border border-white/5 font-mono text-left overflow-x-auto leading-relaxed">
          <span className="text-slate-500 block mb-1">Required Datasets:</span>
          • public/data/sites.json<br />
          • public/data/global_ephem.json
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-xl text-xs transition-colors cursor-pointer shadow-[0_0_15px_rgba(56,189,248,0.3)]"
          >
            Re-attempt Dataset Ingestion
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
