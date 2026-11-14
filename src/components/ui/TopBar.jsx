import React from 'react';

/**
 * src/components/ui/TopBar.jsx
 * Main navigation and global simulation controls bar.
 */
export function TopBar({
  activeTab,
  onTabChange,
  uiMode,
  onUiModeChange,
  quality,
  onQualityChange,
  isFakeData = false
}) {
  const tabs = [
    { id: 'compare', label: 'Compare Sites' },
    { id: 'calendar', label: 'Mission Calendar' },
    { id: 'battery', label: 'Battery Simulator' }
  ];

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 text-slate-100 sticky top-0 z-40 select-none">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-slate-200 border border-slate-600 flex items-center justify-center shadow-inner">
            <span className="text-xs font-bold text-slate-950">☾</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-wider uppercase text-white">
                Lunar Navigator
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                Artemis / 2027
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Landing Site Solar & Line-of-Sight Analyzer
            </p>
          </div>
        </div>

        {/* Center: Tabs */}
        <nav className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-medium">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  isActive
                    ? 'bg-sky-600 text-white shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Right: Mode & Performance Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Data source badge */}
          <span
            title={isFakeData ? 'Synthetic ephemeris data in use' : 'Real NASA/JPL Horizons ephemeris'}
            className={`hidden md:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border ${
              isFakeData
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isFakeData ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            {isFakeData ? 'SAMPLE' : 'NASA/JPL'}
          </span>

          {/* Mode toggle */}
          <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs">
            <button
              onClick={() => onUiModeChange('planner')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                uiMode === 'planner'
                  ? 'bg-slate-800 text-sky-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dense telemetry, metrics, and quantitative charts for mission trade studies"
            >
              Planner
            </button>
            <button
              onClick={() => onUiModeChange('explorer')}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                uiMode === 'explorer'
                  ? 'bg-slate-800 text-amber-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Educational guided visuals, plain-language captions, and terrain overview"
            >
              Explorer
            </button>
          </div>

          {/* Quality tier */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
            <label htmlFor="topbar-quality" className="text-[11px]">3D:</label>
            <select
              id="topbar-quality"
              value={quality}
              onChange={(e) => onQualityChange(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-200 text-xs cursor-pointer focus:outline-none focus:border-sky-500"
            >
              <option value="auto">Auto Tier</option>
              <option value="high">High (4K shadows)</option>
              <option value="medium">Medium</option>
              <option value="low">Low (no shadows)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
