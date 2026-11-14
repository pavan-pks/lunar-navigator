import { describe, it, expect } from 'vitest';
import { buildCalendar, getBestWindowsForSite } from './calendarData.js';

describe('calendarData.js tests', () => {
  const mockSites = [
    { id: 'site-a', name: 'Site A', lat: -85, lon: 0, terrainType: 'massif' },
    { id: 'site-b', name: 'Site B', lat: 0, lon: 0, terrainType: 'plain' }
  ];

  const mockEphem = {
    startUTC: '2027-01-01T00:00:00Z',
    stepHours: 1,
    subSolarLat: Array(1000).fill(1.5),
    subSolarLon: Array.from({ length: 1000 }, (_, i) => (75 - (360 * i) / 708) % 360),
    subEarthLat: Array(1000).fill(6.0),
    subEarthLon: Array(1000).fill(5.0)
  };

  it('builds calendar matrix with expected structure and memoizes cache', () => {
    const cal = buildCalendar(mockSites, mockEphem, {
      startDateStr: '2027-01-01',
      stepDays: 5,
      numSteps: 5,
      missionDays: 7
    });

    expect(cal.dates.length).toBe(5);
    expect(cal.matrix['site-a']).toBeDefined();
    expect(cal.matrix['site-b']).toBeDefined();

    const entry = cal.matrix['site-a'][cal.dates[0]];
    expect(entry).toHaveProperty('level');
    expect(entry).toHaveProperty('sunlitFraction');
    expect(entry).toHaveProperty('longestDarkHours');

    // Test memoization cache
    const cal2 = buildCalendar(mockSites, mockEphem, {
      startDateStr: '2027-01-01',
      stepDays: 5,
      numSteps: 5,
      missionDays: 7
    });
    expect(cal2).toBe(cal);
  });

  it('ranks best windows properly for a given site', () => {
    const mockCal = {
      matrix: {
        'site-a': {
          '2027-01-01': { level: 'risky', sunlitFraction: 0.6, longestDarkHours: 50 },
          '2027-01-05': { level: 'viable', sunlitFraction: 0.95, longestDarkHours: 10 },
          '2027-01-10': { level: 'viable', sunlitFraction: 0.85, longestDarkHours: 20 },
          '2027-01-15': { level: 'not-viable', sunlitFraction: 0.2, longestDarkHours: 140 }
        }
      }
    };

    const best = getBestWindowsForSite('site-a', mockCal, 2);
    expect(best.length).toBe(2);
    expect(best[0].dateStr).toBe('2027-01-05'); // Highest viable
    expect(best[1].dateStr).toBe('2027-01-10'); // Second viable
  });
});
