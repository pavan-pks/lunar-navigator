/**
 * src/lib/calendarData.js
 * Precomputes and caches full-year landing viability matrix across all candidate sites.
 */

import { sampleSeries, hoursSince } from './geometry.js';
import { computeWindowStats, getVerdict } from './metrics.js';

let calendarCache = null;

/**
 * Builds landing date opportunity matrix for sites across a range of dates.
 * 
 * sites: Array<Site>
 * ephem: Ephemeris
 * options: { startDateStr = '2027-01-01', stepDays = 3, numSteps = 120, missionDays = 14 }
 */
export function buildCalendar(
  sites,
  ephem,
  {
    startDateStr = '2027-01-01',
    stepDays = 3,
    numSteps = 120,
    missionDays = 14
  } = {}
) {
  const cacheKey = `${startDateStr}_${stepDays}_${numSteps}_${missionDays}_${sites.map(s => s.id).join(',')}`;
  if (calendarCache && calendarCache.key === cacheKey) {
    return calendarCache.data;
  }

  const dates = [];
  const matrix = {};

  sites.forEach(site => {
    matrix[site.id] = {};
  });

  const durationHours = missionDays * 24;
  const baseDate = new Date(`${startDateStr}T00:00:00Z`);

  for (let step = 0; step < numSteps; step++) {
    const curDate = new Date(baseDate.getTime() + step * stepDays * 24 * 3600 * 1000);
    const dateStr = curDate.toISOString().slice(0, 10);
    dates.push(dateStr);

    const startHours = Math.max(0, hoursSince(ephem.startUTC, curDate));

    // Boundary check
    const maxEphemHours = (ephem.subSolarLat.length - 1) * (ephem.stepHours || 1);
    if (startHours + durationHours > maxEphemHours) {
      break;
    }

    sites.forEach(site => {
      const series = sampleSeries(site, startHours, durationHours, ephem, 2); // 2h step for fast calendar matrix
      const stats = computeWindowStats(series);
      const verdict = getVerdict(stats);

      matrix[site.id][dateStr] = {
        level: verdict.level,
        sunlitFraction: stats.sunlitFraction,
        longestDarkHours: stats.longestDarkHours,
        earthVisibleFraction: stats.earthVisibleFraction
      };
    });
  }

  const result = { dates, matrix };
  calendarCache = { key: cacheKey, data: result };
  return result;
}

/**
 * Finds top 3 ranked landing windows for a specific site.
 */
export function getBestWindowsForSite(siteId, calendarData, limit = 3) {
  if (!calendarData || !calendarData.matrix || !calendarData.matrix[siteId]) {
    return [];
  }

  const siteEntries = calendarData.matrix[siteId];
  const list = Object.entries(siteEntries).map(([dateStr, metrics]) => ({
    dateStr,
    ...metrics
  }));

  // Rank by: 1) level === 'viable' first, 2) highest sunlitFraction, 3) lowest longestDarkHours
  list.sort((a, b) => {
    const levelScore = { viable: 3, risky: 2, 'not-viable': 1 };
    const diffLevel = (levelScore[b.level] || 0) - (levelScore[a.level] || 0);
    if (diffLevel !== 0) return diffLevel;

    if (b.sunlitFraction !== a.sunlitFraction) {
      return b.sunlitFraction - a.sunlitFraction;
    }
    return a.longestDarkHours - b.longestDarkHours;
  });

  return list.slice(0, limit);
}
