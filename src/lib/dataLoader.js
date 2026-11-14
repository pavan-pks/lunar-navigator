/**
 * src/lib/dataLoader.js
 * Asynchronous data loader for static lunar datasets with in-memory caching.
 */

let cachedDataPromise = null;

/**
 * Validates minimal schema requirements for loaded datasets.
 */
function validateLoadedData(sites, ephem) {
  if (!Array.isArray(sites) || sites.length === 0) {
    throw new Error('Invalid sites dataset: expected a non-empty array of sites.');
  }

  if (!ephem || typeof ephem !== 'object') {
    throw new Error('Invalid ephemeris dataset: ephemeris object missing.');
  }

  const requiredArrays = ['subSolarLat', 'subSolarLon', 'subEarthLat', 'subEarthLon'];
  for (const key of requiredArrays) {
    if (!Array.isArray(ephem[key]) || ephem[key].length === 0) {
      throw new Error(`Invalid ephemeris dataset: missing or empty array ${key}.`);
    }
  }

  const len = ephem.subSolarLat.length;
  if (
    ephem.subSolarLon.length !== len ||
    ephem.subEarthLat.length !== len ||
    ephem.subEarthLon.length !== len
  ) {
    throw new Error('Invalid ephemeris dataset: coordinate arrays have mismatched lengths.');
  }

  return { sites, ephem };
}

/**
 * Loads all primary datasets (`sites.json` and `global_ephem.json`).
 * Returns a cached Promise<{ sites, ephem }>.
 */
export function loadAllData() {
  if (cachedDataPromise) {
    return cachedDataPromise;
  }

  cachedDataPromise = (async () => {
    const basePath = import.meta.env.BASE_URL || '/';
    const cleanBase = basePath.endsWith('/') ? basePath : `${basePath}/`;

    const sitesUrl = `${cleanBase}data/sites.json`;
    const ephemUrl = `${cleanBase}data/global_ephem.json`;

    const [sitesRes, ephemRes] = await Promise.all([
      fetch(sitesUrl),
      fetch(ephemUrl)
    ]);

    if (!sitesRes.ok) {
      throw new Error(`Failed to load sites from ${sitesUrl}: HTTP ${sitesRes.status}`);
    }
    if (!ephemRes.ok) {
      throw new Error(`Failed to load ephemeris from ${ephemUrl}: HTTP ${ephemRes.status}`);
    }

    const [sites, ephem] = await Promise.all([
      sitesRes.json(),
      ephemRes.json()
    ]);

    return validateLoadedData(sites, ephem);
  })();

  return cachedDataPromise;
}

/**
 * Clears the in-memory cache (primarily for test harnesses).
 */
export function clearDataCache() {
  cachedDataPromise = null;
}
