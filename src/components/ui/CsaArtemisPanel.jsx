import React from 'react';

/**
 * Educational & Mission-Context Panel:
 * Minimalist design presenting CSA (Canadian Space Agency) Moon Exploration
 * contributions under the NASA Artemis framework.
 */
export function CsaArtemisPanel({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#050505]/90 flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300 font-sans select-none">
      <div className="max-w-2xl w-full border border-white/10 rounded-3xl p-8 sm:p-10 space-y-6 bg-[#050505] relative drop-shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <span className="text-[10px] font-sans font-light tracking-[0.25em] text-[#a3a3a3] uppercase block">
              International Partnership
            </span>
            <h2 className="text-xl font-sans font-light text-[#f5f5f5] tracking-tight mt-1">
              Canadian Space Agency · Lunar Exploration
            </h2>
          </div>

          <button
            onClick={onClose}
            className="text-xs font-sans text-[#a3a3a3] hover:text-[#f5f5f5] border border-white/10 px-3 py-1.5 rounded-full transition cursor-pointer"
          >
            Close ↗
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 text-xs font-sans font-light text-[#f5f5f5] leading-relaxed">
          <p>
            Under the <strong>NASA Artemis Accords</strong>, the international lunar coalition coordinates advanced robotic and crewed capabilities at the lunar South Pole.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="border border-white/5 rounded-2xl p-4 space-y-1.5">
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Canadarm3 AI Robotics
              </span>
              <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
                Autonomous robotic manipulator system for the Lunar Gateway station, enabling external inspection and deep-space scientific payloads.
              </p>
            </div>

            <div className="border border-white/5 rounded-2xl p-4 space-y-1.5">
              <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
                Polar Lunar Rover
              </span>
              <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
                Dedicated micro-rover carrying volatile spectrometers to prospect hydrogen and subsurface water ice deposits within Permanently Shadowed Regions.
              </p>
            </div>
          </div>

          <div className="border border-white/5 rounded-2xl p-4 space-y-1.5">
            <span className="text-[10px] font-sans font-light tracking-[0.18em] text-[#a3a3a3] uppercase block">
              Astronaut Flight Assignments
            </span>
            <p className="text-[11px] text-[#a3a3a3] leading-relaxed">
              CSA Astronaut Jeremy Hansen joins the Artemis II crew on humanity’s first crewed lunar mission in over five decades, advancing polar orbital trajectory operations.
            </p>
          </div>

          <div className="pt-2 flex justify-between items-center text-[11px] text-[#a3a3a3]">
            <span>Reference Document:</span>
            <a
              href="https://www.asc-csa.gc.ca/eng/astronomy/moon-exploration/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#f5f5f5] border-b border-white/20 hover:border-white transition pb-0.5"
            >
              CSA Moon Exploration Portal ↗
            </a>
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="text-xs font-sans text-[#a3a3a3] hover:text-[#f5f5f5] transition cursor-pointer"
          >
            Acknowledge & Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}

export default CsaArtemisPanel;
