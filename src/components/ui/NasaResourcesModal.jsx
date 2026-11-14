import React from 'react';

/**
 * src/components/ui/NasaResourcesModal.jsx
 * Official NASA and Space Agency partner resource portal:
 * - ASU LROC Quickmap
 * - NASA Moon Trek
 * - NASA JPL Horizons Ephemeris
 * - Canadian Space Agency (CSA) Moon Exploration
 */
export function NasaResourcesModal({ isOpen, onClose, selectedSite }) {
  if (!isOpen) return null;

  const lat = selectedSite?.lat ?? -89.9;
  const lon = selectedSite?.lon ?? 0.0;
  const siteName = selectedSite?.name ?? 'Lunar South Pole';

  // Deep-link to QuickMap South Pole stereographic projection (proj=10)
  const quickmapUrl = `https://quickmap.lroc.asu.edu/?extent=${(lat - 0.5).toFixed(2)}%2C${(lon - 0.5).toFixed(2)}%2C${(lat + 0.5).toFixed(2)}%2C${(lon + 0.5).toFixed(2)}&proj=10`;
  // Deep-link to NASA Moon Trek GIS portal
  const moonTrekUrl = `https://trek.nasa.gov/moon/#v=0.1&x=${lon.toFixed(2)}&y=${lat.toFixed(2)}&z=5`;
  // NASA JPL Horizons
  const horizonsUrl = 'https://ssd.jpl.nasa.gov/horizons/';
  // Canadian Space Agency Moon Exploration
  const csaUrl = 'https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/';

  const resources = [
    {
      title: 'ASU LROC Quickmap',
      agency: 'Arizona State University / NASA LRO',
      icon: '🗺️',
      badge: 'LOLA Topography & DEM',
      desc: 'High-resolution lunar reconnaissance orbiter imagery, laser altimeter elevation profiles, and crater slope maps for candidate south pole landing sites.',
      url: quickmapUrl,
      actionText: `Inspect ${siteName} in Quickmap`
    },
    {
      title: 'NASA Moon Trek',
      agency: 'NASA Solar System Treks Project',
      icon: '🌕',
      badge: 'Interactive 3D GIS',
      desc: 'NASA’s interactive 3D planetary GIS portal. Explore the lunar surface in 3D, view digital elevation models, and evaluate local horizon terrain obstruction.',
      url: moonTrekUrl,
      actionText: `Open ${siteName} in Moon Trek`
    },
    {
      title: 'JPL Horizons Ephemeris',
      agency: 'NASA Jet Propulsion Laboratory',
      icon: '🛰️',
      badge: 'Celestial Vectors & Ephemeris',
      desc: 'Calculates high-precision celestial coordinates, solar elevation, and Earth line-of-sight vectors as seen from any lunar surface coordinate.',
      url: horizonsUrl,
      actionText: 'Launch JPL Horizons Web App'
    },
    {
      title: 'CSA Moon Exploration',
      agency: 'Canadian Space Agency / Agence spatiale canadienne',
      icon: '🇨🇦',
      badge: 'Artemis Partner Architecture',
      desc: 'Discover Canada’s lunar exploration initiatives, including the Canadarm3 smart robotic system, the Canadian Lunar Rover, and astronaut participation in Artemis II.',
      url: csaUrl,
      actionText: 'Explore CSA Moon Portal'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-3xl p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-300 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-black/50 backdrop-blur-2xl border border-white/15 rounded-3xl p-6 sm:p-8 shadow-[0_10px_50px_rgba(0,0,0,0.9)] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/15 pb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛰️</span>
            <div>
              <h2 className="text-lg sm:text-xl font-display font-extrabold text-white">
                NASA & Partner Agency Resources
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official ephemeris data, laser altimetry, and space agency exploration portals.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-mono transition cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Resources Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 font-sans">
          {resources.map((res, i) => (
            <div
              key={i}
              className="bg-black/40 hover:bg-black/60 border border-white/10 hover:border-sky-400/40 rounded-2xl p-4 transition-all flex flex-col justify-between space-y-3 shadow-lg group"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{res.icon}</span>
                    <span className="font-display font-bold text-sm text-white group-hover:text-sky-300 transition-colors">
                      {res.title}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/25">
                    {res.badge}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  {res.agency}
                </div>
                <p className="text-[11px] text-slate-300 font-light leading-relaxed">
                  {res.desc}
                </p>
              </div>

              <a
                href={res.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between w-full px-3 py-2 rounded-xl bg-white/5 hover:bg-sky-500/20 border border-white/10 hover:border-sky-400/40 text-sky-300 text-xs font-mono font-semibold transition-all group-hover:translate-x-0.5"
              >
                <span className="truncate">{res.actionText}</span>
                <span className="text-[11px]">↗</span>
              </a>
            </div>
          ))}
        </div>

        {/* Selected Target Coordinates Readout */}
        <div className="flex items-center justify-between bg-black/40 border border-white/10 rounded-2xl px-4 py-2.5 text-xs font-mono text-slate-400">
          <div>
            Target Site: <strong className="text-slate-200">{siteName}</strong>
          </div>
          <div className="text-sky-400 font-bold">
            {lat > 0 ? `+${lat.toFixed(2)}°` : `${lat.toFixed(2)}°`} S, {lon > 0 ? `+${lon.toFixed(2)}°` : `${lon.toFixed(2)}°`} E
          </div>
        </div>
      </div>
    </div>
  );
}

export default NasaResourcesModal;
