import React from 'react';

/**
 * Educational & Mission-Context Panel
 * Acknowledges Artemis international partner contributions, specifically citing
 * the Canadian Space Agency (CSA) Moon Exploration portal and initiatives.
 */
export function CsaArtemisPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="max-w-2xl w-full bg-[#111827]/95 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-5 shadow-[0_25px_70px_rgba(0,0,0,0.9)] font-sans select-none relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400 font-mono font-bold text-xs">
              CSA
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-400 block">
                INTERNATIONAL PARTNER ALIGNMENT
              </span>
              <h2 className="text-lg font-display font-bold text-white">
                CSA Moon Exploration & Artemis Framework
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-sm font-mono transition cursor-pointer border border-slate-700"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs font-mono text-slate-300 leading-relaxed">
          <p>
            Under the <strong>NASA Artemis Accords</strong>, the international lunar coalition brings together key space agencies (NASA, CSA, ESA, JAXA) to establish sustainable human and robotic presence at the lunar South Pole.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="bg-black/40 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
              <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                Canadarm3 AI Robotics
              </span>
              <p className="text-[11px] text-slate-400 leading-snug">
                Autonomous robotic arm and dexterous tool system for the Lunar Gateway station, enabling external repairs and deep-space scientific payloads.
              </p>
            </div>

            <div className="bg-black/40 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
              <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">
                Canadian Lunar Rover
              </span>
              <p className="text-[11px] text-slate-400 leading-snug">
                Dedicated polar micro-rover equipped with volatile spectrometers to prospect water ice in Permanently Shadowed Regions (PSRs).
              </p>
            </div>
          </div>

          <div className="bg-black/40 border border-slate-800 rounded-2xl p-3.5 space-y-1.5">
            <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
              Astronaut Flight Assignments & Deep Space Health
            </span>
            <p className="text-[11px] text-slate-400 leading-snug">
              CSA Astronaut Jeremy Hansen flies aboard Artemis II on humanity’s first crewed lunar flyby since 1972, laying biomedical foundations for permanent polar habitation.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Official Reference Portal:
            </span>
            <a
              href="https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-[10px] transition font-bold"
            >
              CSA Moon Exploration Portal &rarr;
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono transition cursor-pointer border border-slate-700"
          >
            Acknowledge & Return
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsaArtemisPanel;
