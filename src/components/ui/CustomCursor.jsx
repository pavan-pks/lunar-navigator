import React, { useEffect, useRef } from 'react';

/**
 * CustomCursor:
 * A calm, delicate aerospace pointer accent.
 * The native system cursor remains fully visible and active at all times.
 */
export function CustomCursor() {
  const dotRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const dot = dotRef.current;
    if (!dot) return;

    const move = (e) => {
      dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    };

    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, []);

  return (
    <div
      ref={dotRef}
      className="hidden md:block fixed top-0 left-0 z-[9999] pointer-events-none select-none transition-opacity duration-150"
      style={{ willChange: 'transform', transform: 'translate(-9999px,-9999px)' }}
      aria-hidden="true"
    >
      <div style={{ transform: 'translate(-50%, -50%)' }}>
        <div className="w-5 h-5 rounded-full border border-sky-400/30 bg-sky-400/5 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-white/60" />
        </div>
      </div>
    </div>
  );
}

export default CustomCursor;
