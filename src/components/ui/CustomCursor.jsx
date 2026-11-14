import React, { useEffect, useRef } from 'react';

/**
 * Custom minimalist crosshair cursor.
 * Hides the system cursor globally; renders a delicate 20px white crosshair
 * that follows the mouse with zero lag (direct DOM transform — no React re-renders).
 */
export function CustomCursor() {
  const dotRef = useRef(null);

  useEffect(() => {
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
      className="fixed top-0 left-0 z-[9999] pointer-events-none select-none"
      style={{ willChange: 'transform', transform: 'translate(-9999px,-9999px)' }}
      aria-hidden="true"
    >
      {/* Translate origin to center of cursor */}
      <div style={{ transform: 'translate(-50%, -50%)' }}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          {/* Horizontal arm */}
          <line x1="0" y1="10" x2="8" y2="10" stroke="white" strokeWidth="0.8" strokeOpacity="0.9" />
          <line x1="12" y1="10" x2="20" y2="10" stroke="white" strokeWidth="0.8" strokeOpacity="0.9" />
          {/* Vertical arm */}
          <line x1="10" y1="0" x2="10" y2="8" stroke="white" strokeWidth="0.8" strokeOpacity="0.9" />
          <line x1="10" y1="12" x2="10" y2="20" stroke="white" strokeWidth="0.8" strokeOpacity="0.9" />
          {/* Center dot */}
          <circle cx="10" cy="10" r="1.2" fill="white" fillOpacity="0.95" />
        </svg>
      </div>
    </div>
  );
}

export default CustomCursor;
