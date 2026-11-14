/**
 * src/lib/metrics.js
 * Mission window metrics, timeline statistics, shadow calculations, and viability verdict.
 */

import {
  SUN_UP_DEG,
  EARTH_UP_DEG,
  DEFAULT_TRANSIT_DAYS,
  DEFAULT_OBJECT_HEIGHT_M,
  VERDICT
} from './config.js';

/**
 * Calculates landing UTC date from launch date and transit duration in days.
 */
export function landingDate(launchDate, transitDays = DEFAULT_TRANSIT_DAYS) {
  const d = typeof launchDate === 'string' ? new Date(launchDate) : new Date(launchDate.getTime());
  const transitMs = transitDays * 24 * 3600 * 1000;
  return new Date(d.getTime() + transitMs);
}

/**
 * Calculates geometric shadow length in meters cast by an upright object of heightM.
 * Returns Infinity if the Sun is on or below the horizon (sunEl <= 0).
 */
export function shadowLength(heightM = DEFAULT_OBJECT_HEIGHT_M, sunElDeg) {
  if (typeof sunElDeg !== 'number' || !Number.isFinite(sunElDeg) || sunElDeg <= 0) {
    return Infinity;
  }
  const rad = sunElDeg * (Math.PI / 180);
  const tanVal = Math.tan(rad);
  if (tanVal <= 1e-9) {
    return Infinity;
  }
  return heightM / tanVal;
}

/**
 * Computes window statistics over a sampled ephemeris series.
 * 
 * series: { t: number[], sunEl: number[], sunAz: number[], earthEl: number[], earthAz: number[] }
 */
export function computeWindowStats(series) {
  if (!series || !series.t || series.t.length === 0) {
    return {
      windowHours: 0,
      sunlitHours: 0,
      sunlitFraction: 0,
      longestDarkHours: 0,
      longestDarkStartT: 0,
      meanSunEl: 0,
      maxSunEl: 0,
      earthVisibleHours: 0,
      earthVisibleFraction: 0,
      longestEarthGapHours: 0,
      sunsetCount: 0
    };
  }

  const { t, sunEl, earthEl } = series;
  const n = t.length;
  const windowHours = n > 1 ? t[n - 1] - t[0] : 0;

  if (windowHours === 0) {
    const isSun = sunEl[0] > SUN_UP_DEG;
    const isEarth = earthEl[0] > EARTH_UP_DEG;
    return {
      windowHours: 0,
      sunlitHours: 0,
      sunlitFraction: isSun ? 1 : 0,
      longestDarkHours: isSun ? 0 : 0,
      longestDarkStartT: 0,
      meanSunEl: sunEl[0],
      maxSunEl: sunEl[0],
      earthVisibleHours: 0,
      earthVisibleFraction: isEarth ? 1 : 0,
      longestEarthGapHours: 0,
      sunsetCount: 0
    };
  }

  // Discrete interval integration over sampled steps
  let sunlitHours = 0;
  let sunlitSum = 0;
  let sunlitSampleCount = 0;
  let maxSunEl = -Infinity;
  let earthVisibleHours = 0;
  let sunsetCount = 0;

  let longestDarkHours = 0;
  let longestDarkStartT = 0;
  let currentDarkHours = 0;
  let currentDarkStartT = 0;

  let longestEarthGapHours = 0;
  let currentEarthGapHours = 0;

  for (let i = 0; i < n; i++) {
    const el = sunEl[i];
    if (el > maxSunEl) {
      maxSunEl = el;
    }
    if (el > SUN_UP_DEG) {
      sunlitSum += el;
      sunlitSampleCount++;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    const dt = t[i + 1] - t[i];
    const s0 = sunEl[i] > SUN_UP_DEG;
    const s1 = sunEl[i + 1] > SUN_UP_DEG;

    // Detect sunset transition (sunlit -> dark)
    if (s0 && !s1) {
      sunsetCount++;
    }

    // Solar illumination duration for interval i
    if (s0) {
      sunlitHours += dt;
      currentDarkHours = 0;
    } else {
      if (currentDarkHours === 0) {
        currentDarkStartT = t[i];
      }
      currentDarkHours += dt;
      if (currentDarkHours > longestDarkHours) {
        longestDarkHours = currentDarkHours;
        longestDarkStartT = currentDarkStartT;
      }
    }

    // Earth visibility duration for interval i
    const e0 = earthEl[i] > EARTH_UP_DEG;
    if (e0) {
      earthVisibleHours += dt;
      currentEarthGapHours = 0;
    } else {
      currentEarthGapHours += dt;
      if (currentEarthGapHours > longestEarthGapHours) {
        longestEarthGapHours = currentEarthGapHours;
      }
    }
  }

  // Finalize ongoing darkness gap
  if (currentDarkHours > longestDarkHours) {
    longestDarkHours = currentDarkHours;
    longestDarkStartT = currentDarkStartT;
  }

  // Finalize ongoing Earth gap
  if (currentEarthGapHours > longestEarthGapHours) {
    longestEarthGapHours = currentEarthGapHours;
  }

  const sunlitFraction = Math.max(0, Math.min(1, sunlitHours / windowHours));
  const earthVisibleFraction = Math.max(0, Math.min(1, earthVisibleHours / windowHours));
  const meanSunEl = sunlitSampleCount > 0 ? sunlitSum / sunlitSampleCount : 0;

  return {
    windowHours: Math.round(windowHours * 10) / 10,
    sunlitHours: Math.round(sunlitHours * 10) / 10,
    sunlitFraction: Math.round(sunlitFraction * 1000) / 1000,
    longestDarkHours: Math.round(longestDarkHours * 10) / 10,
    longestDarkStartT: Math.round(longestDarkStartT * 10) / 10,
    meanSunEl: Math.round(meanSunEl * 100) / 100,
    maxSunEl: Math.round(maxSunEl * 100) / 100,
    earthVisibleHours: Math.round(earthVisibleHours * 10) / 10,
    earthVisibleFraction: Math.round(earthVisibleFraction * 1000) / 1000,
    longestEarthGapHours: Math.round(longestEarthGapHours * 10) / 10,
    sunsetCount
  };
}

/**
 * Finds hours until the next occurrence of kind ('sunset' | 'sunrise' | 'earthset' | 'earthrise')
 * strictly after tRel. Returns null if no transition occurs in the remaining window.
 */
export function timeToNext(series, tRel, kind) {
  if (!series || !series.t || series.t.length < 2) {
    return null;
  }

  const { t, sunEl, earthEl } = series;
  const n = t.length;

  const targetAngles = (kind === 'sunset' || kind === 'sunrise') ? sunEl : earthEl;
  const threshold = (kind === 'sunset' || kind === 'sunrise') ? SUN_UP_DEG : EARTH_UP_DEG;
  const lookForTransitionToUp = (kind === 'sunrise' || kind === 'earthrise');

  // Find start index matching tRel
  let startIdx = 0;
  while (startIdx < n - 1 && t[startIdx + 1] <= tRel) {
    startIdx++;
  }

  for (let i = startIdx; i < n - 1; i++) {
    const t0 = t[i];
    const t1 = t[i + 1];
    const val0 = targetAngles[i];
    const val1 = targetAngles[i + 1];

    const up0 = val0 > threshold;
    const up1 = val1 > threshold;

    if (lookForTransitionToUp) {
      // Down -> Up (rise)
      if (!up0 && up1) {
        const frac = (threshold - val0) / (val1 - val0);
        const tEvent = t0 + frac * (t1 - t0);
        if (tEvent > tRel + 1e-4) {
          return Math.round((tEvent - tRel) * 10) / 10;
        }
      }
    } else {
      // Up -> Down (set)
      if (up0 && !up1) {
        const frac = (threshold - val0) / (val1 - val0);
        const tEvent = t0 + frac * (t1 - t0);
        if (tEvent > tRel + 1e-4) {
          return Math.round((tEvent - tRel) * 10) / 10;
        }
      }
    }
  }

  return null;
}

/**
 * Determines mission viability verdict and reasons based on computed window stats.
 * Returns: { level: 'viable' | 'risky' | 'not-viable', reasons: string[] }
 */
export function getVerdict(stats) {
  if (!stats) {
    return { level: 'not-viable', reasons: ['No telemetry or ephemeris data available'] };
  }

  const { sunlitFraction, longestDarkHours, earthVisibleFraction } = stats;
  const reasons = [];

  // Check NOT-VIABLE conditions first
  const isTooDark = sunlitFraction < VERDICT.notViable.maxSunlit;
  const isDarkTooLong = longestDarkHours > VERDICT.notViable.minDarkHours;

  if (isTooDark || isDarkTooLong) {
    if (isTooDark) {
      reasons.push(
        `Low solar illumination: ${(sunlitFraction * 100).toFixed(1)}% is below the 40.0% viability floor.`
      );
    }
    if (isDarkTooLong) {
      reasons.push(
        `Longest darkness of ${longestDarkHours} h exceeds the 120 h maximum survival limit.`
      );
    }
    return { level: 'not-viable', reasons };
  }

  // Check VIABLE conditions
  const hasGoodSun = sunlitFraction >= VERDICT.viable.minSunlit;
  const hasShortDarkness = longestDarkHours <= VERDICT.viable.maxDarkHours;
  const hasGoodEarth = earthVisibleFraction >= VERDICT.viable.minEarth;

  if (hasGoodSun && hasShortDarkness && hasGoodEarth) {
    reasons.push(
      `Strong solar coverage: ${(sunlitFraction * 100).toFixed(1)}% sunlit (exceeds ${VERDICT.viable.minSunlit * 100}% threshold).`
    );
    reasons.push(
      `Manageable darkness: longest dark period is ${longestDarkHours} h (limit: ${VERDICT.viable.maxDarkHours} h).`
    );
    reasons.push(
      `Robust Earth line-of-sight: ${(earthVisibleFraction * 100).toFixed(1)}% direct communication visibility.`
    );
    return { level: 'viable', reasons };
  }

  // Otherwise RISKY
  if (!hasGoodSun) {
    reasons.push(
      `Marginal solar power: ${(sunlitFraction * 100).toFixed(1)}% sunlit (viable requires >= ${VERDICT.viable.minSunlit * 100}%).`
    );
  }
  if (!hasShortDarkness) {
    reasons.push(
      `Extended darkness: longest period of ${longestDarkHours} h exceeds preferred 48 h battery reserve.`
    );
  }
  if (!hasGoodEarth) {
    reasons.push(
      `Constrained Earth line-of-sight: ${(earthVisibleFraction * 100).toFixed(1)}% visibility requires comms relay.`
    );
  }

  return { level: 'risky', reasons };
}
