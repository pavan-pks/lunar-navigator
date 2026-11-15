/**
 * src/lib/animation.js
 * Purposeful, restrained motion primitives adhering to NASA Space Apps standards:
 * - 150-220ms ease-out transitions for UI panels
 * - Respects prefers-reduced-motion
 */

export function isPrefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export const transitionFast = {
  duration: 0.18,
  ease: [0.16, 1, 0.3, 1] // snappy ease-out
};

export const transitionPanel = {
  duration: 0.20,
  ease: [0.16, 1, 0.3, 1]
};

export const panelVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0, transition: transitionPanel },
  exit: { opacity: 0, x: 20, transition: { duration: 0.15 } }
};

export const fadeVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitionFast },
  exit: { opacity: 0, transition: { duration: 0.12 } }
};
