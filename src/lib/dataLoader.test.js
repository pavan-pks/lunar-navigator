import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAllData, clearDataCache } from './dataLoader.js';

describe('dataLoader.js tests', () => {
  beforeEach(() => {
    clearDataCache();
    vi.restoreAllMocks();
  });

  it('successfully loads and validates mocked datasets', async () => {
    const mockSites = [{ id: 'test-site', name: 'Test Site', lat: -80, lon: 20 }];
    const mockEphem = {
      startUTC: '2027-01-01T00:00:00Z',
      stepHours: 1,
      subSolarLat: [0.1],
      subSolarLon: [10.0],
      subEarthLat: [6.0],
      subEarthLon: [5.0]
    };

    global.fetch = vi.fn((url) => {
      if (url.includes('sites.json')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockSites) });
      }
      if (url.includes('global_ephem.json')) {
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockEphem) });
      }
      return Promise.reject(new Error(`Not found: ${url}`));
    });

    const data = await loadAllData();
    expect(data.sites).toEqual(mockSites);
    expect(data.ephem).toEqual(mockEphem);

    // Subsequent call returns cached promise without re-fetching
    const data2 = await loadAllData();
    expect(data2).toBe(data);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('throws helpful error if fetch fails', async () => {
    global.fetch = vi.fn(() => Promise.resolve({ ok: false, status: 404 }));
    await expect(loadAllData()).rejects.toThrow('Failed to load sites');
  });

  it('throws if ephemeris arrays have mismatched lengths', async () => {
    const mockSites = [{ id: 'site' }];
    const mockEphem = {
      subSolarLat: [0.1, 0.2],
      subSolarLon: [10.0], // mismatch
      subEarthLat: [6.0, 6.1],
      subEarthLon: [5.0, 5.1]
    };

    global.fetch = vi.fn((url) => {
      if (url.includes('sites.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockSites) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(mockEphem) });
    });

    await expect(loadAllData()).rejects.toThrow('mismatched lengths');
  });
});
