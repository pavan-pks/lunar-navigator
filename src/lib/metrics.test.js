import { describe, it, expect } from 'vitest';
import {
  landingDate,
  shadowLength,
  computeWindowStats,
  timeToNext,
  getVerdict,
  computeSuitabilityScore
} from './metrics.js';
import { SUN_UP_DEG, EARTH_UP_DEG } from './config.js';

describe('metrics.js tests', () => {
  it('calculates landingDate accurately', () => {
    const launch = new Date('2027-03-01T12:00:00Z');
    const landing = landingDate(launch, 4);
    expect(landing.toISOString()).toBe('2027-03-05T12:00:00.000Z');
  });

  it('calculates shadowLength with proper horizon boundaries', () => {
    // Height 3m, 45° sun elevation -> tan(45°) = 1 -> 3m shadow
    expect(shadowLength(3, 45)).toBeCloseTo(3, 3);

    // Height 3m, 30° sun elevation -> tan(30°) = 0.57735 -> ~5.196m shadow
    expect(shadowLength(3, 30)).toBeCloseTo(3 / Math.tan(30 * Math.PI / 180), 3);

    // Height 3m, 0.5° grazing sun elevation -> ~343.76m shadow
    expect(shadowLength(3, 0.5)).toBeCloseTo(343.76, 1);

    // Zero or negative elevation produces Infinity
    expect(shadowLength(3, 0)).toBe(Infinity);
    expect(shadowLength(3, -5)).toBe(Infinity);
    expect(shadowLength(3, NaN)).toBe(Infinity);
  });

  it('computes stats for a 100% all-sunlit series', () => {
    const hours = 100;
    const t = Array.from({ length: hours + 1 }, (_, i) => i);
    const sunEl = Array(hours + 1).fill(5.0); // always up
    const earthEl = Array(hours + 1).fill(10.0); // always up

    const stats = computeWindowStats({ t, sunEl, earthEl, sunAz: [], earthAz: [] });

    expect(stats.windowHours).toBe(100);
    expect(stats.sunlitHours).toBe(100);
    expect(stats.sunlitFraction).toBe(1.0);
    expect(stats.longestDarkHours).toBe(0);
    expect(stats.longestDarkStartT).toBe(0);
    expect(stats.meanSunEl).toBe(5.0);
    expect(stats.maxSunEl).toBe(5.0);
    expect(stats.earthVisibleHours).toBe(100);
    expect(stats.earthVisibleFraction).toBe(1.0);
    expect(stats.longestEarthGapHours).toBe(0);
    expect(stats.sunsetCount).toBe(0);

    const verdict = getVerdict(stats);
    expect(verdict.level).toBe('viable');
    expect(verdict.reasons.length).toBeGreaterThanOrEqual(2);
  });

  it('computes stats for a 100% all-dark series', () => {
    const hours = 100;
    const t = Array.from({ length: hours + 1 }, (_, i) => i);
    const sunEl = Array(hours + 1).fill(-10.0); // always dark
    const earthEl = Array(hours + 1).fill(5.0);

    const stats = computeWindowStats({ t, sunEl, earthEl, sunAz: [], earthAz: [] });

    expect(stats.windowHours).toBe(100);
    expect(stats.sunlitHours).toBe(0);
    expect(stats.sunlitFraction).toBe(0.0);
    expect(stats.longestDarkHours).toBe(100);
    expect(stats.longestDarkStartT).toBe(0);
    expect(stats.meanSunEl).toBe(0);
    expect(stats.sunsetCount).toBe(0);

    const verdict = getVerdict(stats);
    expect(verdict.level).toBe('not-viable');
    expect(verdict.reasons.some(r => r.includes('Low solar illumination'))).toBe(true);
  });

  it('computes stats for a series with exactly one 60h dark gap', () => {
    // 0..20: sunlit (5°)
    // 20..80: dark (-5°, duration = 60h from index 20 to 79)
    // 80..100: sunlit (5°)
    const t = Array.from({ length: 101 }, (_, i) => i);
    const sunEl = t.map(hour => (hour >= 20 && hour < 80 ? -5.0 : 5.0));
    const earthEl = Array(101).fill(8.0);

    const stats = computeWindowStats({ t, sunEl, earthEl, sunAz: [], earthAz: [] });

    expect(stats.windowHours).toBe(100);
    expect(stats.longestDarkHours).toBe(60);
    expect(stats.longestDarkStartT).toBe(20);
    expect(stats.sunlitHours).toBe(40);
    expect(stats.sunlitFraction).toBe(0.40);
    expect(stats.sunsetCount).toBe(1);

    // sunlitFraction = 0.40 (not < 0.40), longestDarkHours = 60 (<= 120, but > 48) -> 'risky'
    const verdict = getVerdict(stats);
    expect(verdict.level).toBe('risky');
    expect(verdict.reasons.some(r => r.includes('48 h battery reserve'))).toBe(true);
  });

  it('computes stats with Earth visible half the time', () => {
    // 0..50: Earth visible (5°) -> indices 0..49
    // 50..100: Earth occulted (-5°) -> indices 50..99
    const t = Array.from({ length: 101 }, (_, i) => i);
    const sunEl = Array(101).fill(4.0); // 100% sunlit
    const earthEl = t.map(hour => (hour < 50 ? 5.0 : -5.0));

    const stats = computeWindowStats({ t, sunEl, earthEl, sunAz: [], earthAz: [] });

    expect(stats.earthVisibleHours).toBe(50);
    expect(stats.earthVisibleFraction).toBe(0.50);
    expect(stats.longestEarthGapHours).toBe(50);

    // sunlit = 100%, dark = 0h, earth = 50% (meets minEarth 0.50) -> 'viable'
    const verdict = getVerdict(stats);
    expect(verdict.level).toBe('viable');
  });

  it('correctly triggers not-viable verdict on extreme darkness (>120h)', () => {
    const stats = {
      sunlitFraction: 0.45,
      longestDarkHours: 130, // exceeds 120h
      earthVisibleFraction: 0.8
    };
    const verdict = getVerdict(stats);
    expect(verdict.level).toBe('not-viable');
    expect(verdict.reasons.some(r => r.includes('130 h exceeds the 120 h'))).toBe(true);
  });

  it('evaluates timeToNext for sunset and sunrise transitions', () => {
    // t: [0, 10, 20, 30, 40]
    // sunEl: [2, 1, -1, -2, 3]
    // Sunset occurs between t=10 and t=20 (crossing SUN_UP_DEG = -0.27)
    // Sunrise occurs between t=30 and t=40
    const t = [0, 10, 20, 30, 40];
    const sunEl = [2, 1, -1, -2, 3];
    const earthEl = [5, 5, 5, 5, 5];
    const series = { t, sunEl, earthEl, sunAz: [], earthAz: [] };

    // At t=0, next sunset
    const dtSunset = timeToNext(series, 0, 'sunset');
    expect(dtSunset).toBeGreaterThan(10);
    expect(dtSunset).toBeLessThan(20);

    // At t=25 (in night), next sunrise
    const dtSunrise = timeToNext(series, 25, 'sunrise');
    expect(dtSunrise).toBeGreaterThan(5);
    expect(dtSunrise).toBeLessThan(15);

    // When no transition exists in remaining window
    const noSunset = timeToNext(series, 25, 'sunset');
    expect(noSunset).toBeNull();
  });

  it('computes 4-factor suitability score accurately', () => {
    const stats = {
      windowHours: 336,
      sunlitFraction: 1.0,
      longestDarkHours: 0,
      earthVisibleFraction: 0.9
    };
    const site = { nominalSlopeDeg: 4.5 };
    const result = computeSuitabilityScore(stats, site);

    expect(result.totalScore).toBeGreaterThanOrEqual(85);
    expect(result.gradeLetter).toBe('A');
    expect(result.pillars.solar.score).toBe(100);
    expect(result.pillars.night.score).toBe(100);
    expect(result.pillars.comms.score).toBe(90);
    expect(result.pillars.slope.score).toBe(70);
  });
});
