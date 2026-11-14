/**
 * src/lib/config.js
 * Mission planning configuration constants and evaluation thresholds.
 * 
 * NOTE: These thresholds represent illustrative planning criteria designed for
 * comparative mission trade studies in this application, and do not represent
 * official NASA, ESA, or ISRO flight flight readiness criteria.
 */

// Elevation threshold for the upper limb of the Sun above the lunar horizon (degrees)
// Moon has no atmospheric refraction; solar semi-diameter is ~0.267°
export const SUN_UP_DEG = -0.27;

// Elevation threshold for geometric line-of-sight to Earth geocenter (degrees)
export const EARTH_UP_DEG = 0.0;

// Default mission duration parameters
export const DEFAULT_TRANSIT_DAYS = 4;
export const DEFAULT_MISSION_DAYS = 14;
export const DEFAULT_OBJECT_HEIGHT_M = 3.0;

// Mission window viability thresholds
export const VERDICT = {
  viable: {
    minSunlit: 0.75,       // >= 75% sunlit over the mission duration
    maxDarkHours: 48,      // <= 48 hours maximum continuous darkness
    minEarth: 0.50         // >= 50% line-of-sight direct Earth communication
  },
  notViable: {
    maxSunlit: 0.40,       // < 40% sunlit
    minDarkHours: 120      // > 120 hours continuous darkness (severe cold survival risk)
  }
};
