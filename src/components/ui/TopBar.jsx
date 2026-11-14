import React from 'react';

/**
 * src/components/ui/TopBar.jsx
 * Cinematic Aerospace Navigation & Mission Operations Header.
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
    { id: 'compare', label: 'Site Comparison', icon: '◬' },
    { id: 'calendar', label: 'Launch Windows', icon: '▦' },
    { id: 'battery', label: 'Energy & Power', icon: '⚡' }
  ];

  return (
    <header className="bg-[#04070d]/85 backdrop-blur-xl border-b border-sky-500/15 text-slate-100 sticky top-0 z-40 select-none shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
      <div className="max-w-7xl mx-auto px-4 h-15 flex items-center justify-between gap-4">
        {/* Brand with Lunar Seal */}
        <div className="flex items-center gap-3.5">
          <div className="relative group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-900 via-sky-950 to-slate-900 border border-sky-400/30 flex items-center justify-center shadow-[0_0_15px_rgba(56,189,248,0.2)]">
              <span className="text-sm font-bold text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">☾</span>
            </div>
            <div className="absolute -inset-0.5 rounded-xl bg-sky-400/20 blur-xs -z-10 group-hover:opacity-100 transition duration-500"></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-sm tracking-widest uppercase bg-gradient-to-r from-white via-slate-100 to-sky-300 bg-clip-text text-transparent">
                Lunar Navigator
              </span>
              <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold shadow-xs">
                ARTEMIS-III // 2027
              </span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-tight flex items-center gap-1.5 hidden sm:flex">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              NASA/JPL Horizons Ephemeris • Polar Illumination & Line-of-Sight
            </p>
          </div>
        </div>

        {/* Center: Mission Operations Tabs */}
        <nav className="flex items-center bg-[#070b14]/90 p-1 rounded-xl border border-white/10 shadow-inner">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-500/20 to-sky-400/10 text-sky-300 border border-sky-400/40 shadow-[0_0_12px_rgba(56,189,248,0.25)] font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="text-[11px] opacity-70">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Telemetry Source & View Modes */}
        <div className="flex items-center gap-3">
          {/* Data source badge */}
          <div
            title={isFakeData ? 'Synthetic ephemeris data in use' : 'Real NASA/JPL Horizons ephemeris'}
            className={`hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-lg border backdrop-blur-md shadow-xs ${
              isFakeData
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isFakeData ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span className="font-bold">{isFakeData ? 'SAMPLE DATA' : 'JPL // HORIZONS'}</span>
          </div>

          {/* Mode Toggle: Planner vs Explorer */}
          <div className="flex items-center bg-[#070b14]/90 rounded-xl p-0.5 border border-white/10 text-xs">
            <button
              onClick={() => onUiModeChange('planner')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium text-[11px] ${
                uiMode === 'planner'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Dense telemetry, metrics, and quantitative charts for mission trade studies"
            >
              Planner
            </button>
            <button
              onClick={() => onUiModeChange('explorer')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer font-medium text-[11px] ${
                uiMode === 'explorer'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Educational guided visuals, plain-language captions, and terrain overview"
            >
              Explorer
            </button>
          </div>

          {/* Quality Tier Selector */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-400">
            <select
              id="topbar-quality"
              value={quality}
              onChange={(e) => onQualityChange(e.target.value)}
              className="bg-[#070b14]/90 border border-white/10 rounded-lg px-2 py-1 text-slate-300 text-xs cursor-pointer focus:outline-none focus:border-sky-500 hover:border-sky-500/40 transition"
            >
              <option value="auto">Auto Quality</option>
              <option value="high">High (4K Shadows)</option>
              <option value="medium">Medium</option>
              <option value="low">Low (Power Saver)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
}

export default TopBar;
