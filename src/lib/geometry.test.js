import { describe, it, expect } from 'vitest';
import {
  calculateElAz,
  normalize360,
  normalize180,
  lerpAngle180,
  lerpAzimuth,
  hoursSince,
  dateFromHours,
  sunAltAz,
  earthAltAz,
  sampleSeries,
  valuesAt,
  getHorizonElevationMask
} from './geometry.js';

describe('geometry.js spherical astronomy tests', () => {
  it('site at sub-solar point has elevation ≈ 90°', () => {
    const { el, az } = calculateElAz(10, 45, 10, 45);
    expect(el).toBeCloseTo(90, 4);
    expect(Number.isFinite(az)).toBe(true);
  });

  it('site at antipode of sub-solar point has elevation ≈ -90°', () => {
    // Sub-solar at (10, 45), antipode at (-10, -135)
    const { el } = calculateElAz(-10, -135, 10, 45);
    expect(el).toBeCloseTo(-90, 4);
  });

  it('equatorial site 90° east of sub-solar point has elevation ≈ 0°', () => {
    // Sub-solar at (0, 0), site at (0, 90)
    const { el, az } = calculateElAz(0, 90, 0, 0);
    expect(el).toBeCloseTo(0, 4);
    // Since target is 90° west of site, azimuth should be 270° (due west)
    expect(az).toBeCloseTo(270, 4);
  });

  it('does not produce NaN at the lunar poles (-90° and +90°)', () => {
    const southPole = calculateElAz(-90, 0, 1.5, 30);
    expect(Number.isNaN(southPole.el)).toBe(false);
    expect(Number.isNaN(southPole.az)).toBe(false);
    expect(southPole.el).toBeGreaterThan(-90);
    expect(southPole.el).toBeLessThan(90);

    const northPole = calculateElAz(90, 0, 1.5, 30);
    expect(Number.isNaN(northPole.el)).toBe(false);
    expect(Number.isNaN(northPole.az)).toBe(false);
  });

  it('interpolates azimuth across the 359° -> 0° boundary cleanly', () => {
    // Midpoint between 359° and 1° should be 0°
    const mid1 = lerpAzimuth(359, 1, 0.5);
    expect(mid1).toBeCloseTo(0, 4);

    // Midpoint between 359.5° and 0.5° should be 0°
    const mid2 = lerpAzimuth(359.5, 0.5, 0.5);
    expect(mid2).toBeCloseTo(0, 4);

    // Quarter point between 350° and 10°
    const quarter = lerpAzimuth(350, 10, 0.25);
    expect(quarter).toBeCloseTo(355, 4);
  });

  it('handles longitude wrap across ±180° boundary', () => {
    // 179° to -179° is a 2° difference across the 180° meridian
    const midLon = lerpAngle180(179, -179, 0.5);
    // Either 180 or -180 is the same meridian
    expect(Math.abs(midLon)).toBeCloseTo(180, 4);

    const stepLon = lerpAngle180(178, -178, 0.25);
    expect(stepLon).toBeCloseTo(179, 4);
  });

  it('correctly calculates hoursSince and dateFromHours', () => {
    const startUTC = '2027-01-01T00:00:00Z';
    const d1 = '2027-01-01T12:00:00Z';
    expect(hoursSince(startUTC, d1)).toBe(12);

    const d2 = dateFromHours(startUTC, 36);
    expect(d2.toISOString()).toBe('2027-01-02T12:00:00.000Z');
  });

  it('interpolates ephemeris with sunAltAz and earthAltAz', () => {
    const mockEphem = {
      startUTC: '2027-01-01T00:00:00Z',
      stepHours: 1,
      subSolarLat: [0.0, 0.2, 0.4],
      subSolarLon: [179.0, -179.0, -177.0], // wraps across 180°
      subEarthLat: [6.0, 6.1, 6.2],
      subEarthLon: [5.0, 5.1, 5.2]
    };

    // At t=0
    const s0 = sunAltAz(0, 179, 0, mockEphem);
    expect(s0.el).toBeCloseTo(90, 4);

    // At t=0.5 (halfway between 179° and -179°, i.e. 180°, subSolarLat is 0.1°)
    const sHalf = sunAltAz(0.1, 180, 0.5, mockEphem);
    expect(sHalf.el).toBeCloseTo(90, 2);

    const sEquator = sunAltAz(0, 180, 0.5, mockEphem);
    expect(sEquator.el).toBeCloseTo(89.9, 2);

    // Earth at t=1
    const e1 = earthAltAz(6.1, 5.1, 1, mockEphem);
    expect(e1.el).toBeCloseTo(90, 4);

    // Out of range throws RangeError
    expect(() => sunAltAz(0, 0, -1, mockEphem)).toThrow(RangeError);
    expect(() => sunAltAz(0, 0, 5, mockEphem)).toThrow(RangeError);
  });

  it('sampleSeries and valuesAt produce valid continuous series', () => {
    const mockEphem = {
      startUTC: '2027-01-01T00:00:00Z',
      stepHours: 1,
      subSolarLat: [0, 0, 0, 0, 0],
      subSolarLon: [0, -1, -2, -3, -4],
      subEarthLat: [5, 5, 5, 5, 5],
      subEarthLon: [0, 0, 0, 0, 0]
    };

    const site = { lat: 0, lon: 0 };
    const series = sampleSeries(site, 0, 4, mockEphem, 1);

    expect(series.t).toEqual([0, 1, 2, 3, 4]);
    expect(series.sunEl.length).toBe(5);
    expect(series.sunEl[0]).toBeCloseTo(90, 2); // overhead at t=0
    expect(series.sunEl[1]).toBeCloseTo(89, 2);

    // Interpolate at tRel = 0.5
    const atHalf = valuesAt(series, 0.5);
    expect(atHalf.sunEl).toBeCloseTo(89.5, 2);
    expect(Number.isFinite(atHalf.sunAz)).toBe(true);

    // Clamp at edges
    const beforeStart = valuesAt(series, -1);
    expect(beforeStart.sunEl).toBe(series.sunEl[0]);

    const afterEnd = valuesAt(series, 10);
    expect(afterEnd.sunEl).toBe(series.sunEl[4]);
  });

  it('handles degenerate or null inputs gracefully in valuesAt', () => {
    expect(valuesAt(null, 5)).toEqual({ sunEl: 0, sunAz: 0, earthEl: 0, earthAz: 0 });
    expect(valuesAt({ t: [] }, 5)).toEqual({ sunEl: 0, sunAz: 0, earthEl: 0, earthAz: 0 });
  });

  it('normalizes angles properly', () => {
    expect(normalize360(-10)).toBe(350);
    expect(normalize360(370)).toBe(10);
    expect(normalize360(0)).toBe(0);

    expect(normalize180(190)).toBe(-170);
    expect(normalize180(-190)).toBe(170);
    expect(normalize180(180)).toBe(-180);
  });

  it('computes azimuthal regional horizon elevation masks accurately for landing sites', () => {
    // Shackleton crater rim mask profile
    const shackletonSouthwest = getHorizonElevationMask('shackleton', 225);
    const shackletonNortheast = getHorizonElevationMask('shackleton', 45);
    expect(shackletonSouthwest).toBeGreaterThan(1.0);
    expect(shackletonNortheast).toBeLessThan(0.4);

    // Malapert Mountain Massif summit has exceptionally low horizon mask
    const malapertHorizon = getHorizonElevationMask('malapert', 0);
    expect(malapertHorizon).toBeLessThanOrEqual(0.45);
    expect(malapertHorizon).toBeGreaterThanOrEqual(-0.15);

    // Apollo 11 flat mare plain should have 0.0° mask
    expect(getHorizonElevationMask('apollo11', 120)).toBe(0.0);
  });
});
