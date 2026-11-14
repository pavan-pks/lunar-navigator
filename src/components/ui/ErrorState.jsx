import React from 'react';

/**
 * src/components/ui/ErrorState.jsx
 * Friendly failure card with action retry.
 */
export function ErrorState({ error, onRetry }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-xl p-6 shadow-2xl text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-xl font-bold">
          !
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Dataset Loading Error</h2>
          <p className="text-sm text-slate-400 mt-1">
            {error?.message || 'Could not load required lunar datasets.'}
          </p>
        </div>
        <div className="text-xs text-slate-500 bg-slate-950 p-3 rounded font-mono text-left overflow-x-auto">
          Required files:<br />
          - public/data/sites.json<br />
          - public/data/global_ephem.json
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full py-2 px-4 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
          >
            Retry Loading
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorState;
