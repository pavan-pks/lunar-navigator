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
import { getHorizonElevationMask } from './geometry.js';

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
export function computeWindowStats(series, { useHorizonMask = false, site = null } = {}) {
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

  const { t, sunEl, earthEl, sunAz = [], earthAz = [] } = series;
  const n = t.length;
  const windowHours = n > 1 ? t[n - 1] - t[0] : 0;

  const checkSunlit = (idx) => {
    const mask = useHorizonMask ? getHorizonElevationMask(site, sunAz[idx] || 0) : 0;
    return (sunEl[idx] - mask) > SUN_UP_DEG;
  };

  const checkEarthVis = (idx) => {
    const mask = useHorizonMask ? getHorizonElevationMask(site, earthAz[idx] || 0) : 0;
    return (earthEl[idx] - mask) > EARTH_UP_DEG;
  };

  if (windowHours === 0) {
    const isSun = checkSunlit(0);
    const isEarth = checkEarthVis(0);
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
    if (checkSunlit(i)) {
      sunlitSum += el;
      sunlitSampleCount++;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    const dt = t[i + 1] - t[i];
    const s0 = checkSunlit(i);
    const s1 = checkSunlit(i + 1);

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
    const e0 = checkEarthVis(i);
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

/**
 * Computes a rigorous 4-factor multi-disciplinary landing suitability index [0-100].
 * Pillars:
 * 1. Solar Illumination (35% weight): Cumulative daylight availability over mission window.
 * 2. Night Survival (25% weight): Resistance to continuous cryogenic nocturnal blackout.
 * 3. Earth Direct Comms (25% weight): Direct-to-Earth line-of-sight availability.
 * 4. Terrain Slope & Safety (15% weight): Lander footpad safety margin relative to 15° tip-over limit.
 */
export function computeSuitabilityScore(stats, site) {
  if (!stats) {
    return {
      totalScore: 0,
      grade: 'N/A',
      gradeLetter: 'N/A',
      pillars: {}
    };
  }

  // 1. Solar Score (0-100)
  const sunPct = Math.max(0, Math.min(100, (stats.sunlitFraction ?? 0) * 100));
  const solarScore = sunPct;

  // 2. Night Survival Score (0-100)
  const darkH = Math.max(0, stats.longestDarkHours ?? 0);
  let nightScore = 100;
  if (darkH === 0) {
    nightScore = 100;
  } else if (darkH <= 24) {
    nightScore = 85;
  } else if (darkH <= 48) {
    nightScore = 70;
  } else if (darkH <= 72) {
    nightScore = 50;
  } else if (darkH <= 120) {
    nightScore = 30;
  } else {
    nightScore = Math.max(0, 100 - (darkH / (stats.windowHours || 336)) * 100);
  }

  // 3. Earth Comms Score (0-100)
  const earthPct = Math.max(0, Math.min(100, (stats.earthVisibleFraction ?? 0) * 100));
  const commScore = earthPct;

  // 4. Terrain Slope Score (0-100)
  const slope = typeof site?.nominalSlopeDeg === 'number' ? site.nominalSlopeDeg : 5.0;
  const slopeScore = Math.max(0, Math.min(100, Math.round((1 - slope / 15.0) * 100)));

  // Weighted composite score (weights sum to 1.0)
  const totalScore = Math.round(
    0.35 * solarScore +
    0.25 * nightScore +
    0.25 * commScore +
    0.15 * slopeScore
  );

  let grade = 'Not Recommended';
  let gradeLetter = 'C';
  if (totalScore >= 80) {
    grade = 'Optimal Landing Suitability';
    gradeLetter = 'A';
  } else if (totalScore >= 60) {
    grade = 'Viable with Constraints';
    gradeLetter = 'B';
  } else {
    grade = 'High Risk / Challenging';
    gradeLetter = 'C';
  }

  return {
    totalScore,
    grade,
    gradeLetter,
    pillars: {
      solar: { label: 'Solar Illumination', weight: 0.35, score: Math.round(solarScore), value: `${Math.round(sunPct)}%` },
      night: { label: 'Night Survival', weight: 0.25, score: Math.round(nightScore), value: `${darkH}h max` },
      comms: { label: 'Earth Line-of-Sight', weight: 0.25, score: Math.round(commScore), value: `${Math.round(earthPct)}%` },
      slope: { label: 'Terrain Slope Safety', weight: 0.15, score: Math.round(slopeScore), value: `${slope.toFixed(1)}°` }
    }
  };
}
