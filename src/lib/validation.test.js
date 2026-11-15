import { describe, it, expect } from 'vitest';
import { computeEphemerisRange, validateMissionInputs } from './validation.js';

describe('Mission Inputs Validation', () => {
  const mockEphem = {
    startUTC: '2027-01-01T00:00:00Z',
    stepHours: 1,
    subSolarLat: new Array(100).fill(0)
  };

  it('computes ephemeris range correctly', () => {
    const range = computeEphemerisRange(mockEphem);
    expect(range.startUTC).toBe('2027-01-01T00:00:00Z');
    expect(range.totalHours).toBe(99);
    expect(range.count).toBe(100);
    expect(new Date(range.endUTC).getTime()).toBe(new Date('2027-01-01T00:00:00Z').getTime() + 99 * 3600 * 1000);
  });

  it('validates and computes valid mission parameters within bounds', () => {
    const res = validateMissionInputs({
      launchDate: '2027-01-01T00:00:00Z',
      transitDays: 3,
      slipDays: 0,
      missionDays: 1,
      ephem: mockEphem
    });

    expect(res.isValid).toBe(true);
    expect(res.isOutsideRange).toBe(false);
    expect(res.transitDays).toBe(3);
    expect(res.slipDays).toBe(0);
    expect(res.startHours).toBe(72);
  });

  it('flags warning and clamps when date falls outside ephemeris range', () => {
    const res = validateMissionInputs({
      launchDate: '2026-12-01T00:00:00Z',
      transitDays: 3,
      slipDays: 0,
      missionDays: 14,
      ephem: mockEphem
    });

    expect(res.isOutsideRange).toBe(true);
    expect(res.warnings.length).toBeGreaterThan(0);
    expect(res.clampedStartHours).toBe(0);
  });

  it('handles invalid numeric transit and slip values gracefully', () => {
    const res = validateMissionInputs({
      launchDate: '2027-01-01T00:00:00Z',
      transitDays: -5,
      slipDays: 45,
      ephem: mockEphem
    });

    expect(res.transitDays).toBe(3);
    expect(res.slipDays).toBe(30);
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});
