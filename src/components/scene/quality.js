/**
 * Quality tiers and automatic hardware performance probe / downgrade system.
 */

export const TIERS = {
  low: {
    name: 'low',
    resolution: 129,
    shadowMapSize: 1024,
    dpr: 1.0,
    rockCount: 40,
    starCount: 800,
    antialias: false,
  },
  medium: {
    name: 'medium',
    resolution: 257,
    shadowMapSize: 2048,
    dpr: 1.5,
    rockCount: 120,
    starCount: 1500,
    antialias: true,
  },
  high: {
    name: 'high',
    resolution: 385,
    shadowMapSize: 2048,
    dpr: 2.0,
    rockCount: 250,
    starCount: 2500,
    antialias: true,
  },
}

/**
 * Returns tier configuration for a given tier name.
 */
export function getTierConfig(tierName = 'medium') {
  return TIERS[tierName] || TIERS.medium
}

/**
 * Creates an automatic performance monitor that probes frame time
 * over the initial 90 rendered frames on medium tier, downgrading to low if < 24 fps.
 *
 * @param {Object} options
 * @param {() => void} options.renderFrame - Triggers one render call
 * @param {(downgradedTier: string) => void} options.onDowngrade - Callback when tier drops
 * @returns {{ recordFrame: () => void, isProbing: () => boolean, cancel: () => void }}
 */
export function createPerformanceProbe({ renderFrame, onDowngrade }) {
  let frameCount = 0
  let probeStartTime = null
  let isProbing = true
  let rafId = null
  const TARGET_PROBE_FRAMES = 90
  const MIN_ACCEPTABLE_FPS = 24.0

  const probeStep = (time) => {
    if (!isProbing) return
    if (!probeStartTime) probeStartTime = time

    renderFrame()
    frameCount++

    if (frameCount >= TARGET_PROBE_FRAMES) {
      const elapsed = time - probeStartTime
      const avgFps = (frameCount * 1000) / Math.max(1, elapsed)
      isProbing = false

      if (avgFps < MIN_ACCEPTABLE_FPS) {
        onDowngrade('low')
      }
      return
    }

    rafId = requestAnimationFrame(probeStep)
  }

  // Start the probe
  rafId = requestAnimationFrame(probeStep)

  return {
    recordFrame: () => {},
    isProbing: () => isProbing,
    cancel: () => {
      isProbing = false
      if (rafId) cancelAnimationFrame(rafId)
    },
  }
}
