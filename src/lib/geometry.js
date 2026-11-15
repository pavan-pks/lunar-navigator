/**
 * src/lib/geometry.js
 * Spherical astronomy geometry for lunar landing site navigation.
 * Computes topocentric Sun and Earth elevation & azimuth from sub-solar
 * and sub-Earth coordinates.
 */

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

/**
 * Normalizes an angle in degrees to [0, 360).
 */
export function normalize360(deg) {
  return ((deg % 360) + 360) % 360;
}

/**
 * Normalizes an angle in degrees to [-180, 180).
 */
export function normalize180(deg) {
  return (((deg + 180) % 360) + 360) % 360 - 180;
}

/**
 * Interpolates an angle in degrees along the shortest arc.
 * Result is in [-180, 180).
 */
export function lerpAngle180(a0, a1, frac) {
  const diff = normalize180(a1 - a0);
  return normalize180(a0 + frac * diff);
}

/**
 * Interpolates an azimuth angle in degrees along the shortest arc.
 * Result is in [0, 360).
 */
export function lerpAzimuth(az0, az1, frac) {
  const diff = normalize180(az1 - az0);
  return normalize360(az0 + frac * diff);
}

/**
 * Converts ISO 8601 UTC date string or Date to hours since startUTC.
 */
export function hoursSince(startUTC, date) {
  const startMs = typeof startUTC === 'string' ? new Date(startUTC).getTime() : startUTC.getTime();
  const dateMs = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  return (dateMs - startMs) / 3600000;
}

/**
 * Converts hours since startUTC to a UTC Date object.
 */
export function dateFromHours(startUTC, hours) {
  const startMs = typeof startUTC === 'string' ? new Date(startUTC).getTime() : startUTC.getTime();
  return new Date(startMs + hours * 3600000);
}

/**
 * Core spherical trigonometry calculation.
 * Computes elevation and azimuth of a celestial target given its sub-body point.
 * 
 * Formula:
 * sin(el) = sin φ · sin φt + cos φ · cos φt · cos(λt − λ)
 * az      = atan2( cos φt · sin(λt − λ),  cos φ · sin φt − sin φ · cos φt · cos(λt − λ) ) -> 0..360
 */
export function calculateElAz(siteLat, siteLon, targetLat, targetLon) {
  // Clamp latitude to ±89.9999° to avoid pole singularities
  const clampedLat = Math.max(-89.9999, Math.min(89.9999, Number(siteLat) || 0));
  const safeLon = Number(siteLon) || 0;

  const phi = clampedLat * DEG2RAD;
  const lam = safeLon * DEG2RAD;
  const phiT = targetLat * DEG2RAD;
  const lamT = targetLon * DEG2RAD;

  const dLam = lamT - lam;

  const sinEl = Math.sin(phi) * Math.sin(phiT) + Math.cos(phi) * Math.cos(phiT) * Math.cos(dLam);
  const clampedSinEl = Math.max(-1, Math.min(1, sinEl));
  const el = Math.asin(clampedSinEl) * RAD2DEG;

  const y = Math.cos(phiT) * Math.sin(dLam);
  const x = Math.cos(phi) * Math.sin(phiT) - Math.sin(phi) * Math.cos(phiT) * Math.cos(dLam);
  const az = normalize360(Math.atan2(y, x) * RAD2DEG);

  return { el, az };
}

/**
 * Interpolates sub-body coordinates from ephemeris arrays at tHours.
 */
function interpolateSubPoint(latArr, lonArr, tHours, stepHours = 1) {
  const n = latArr.length;
  const maxHours = (n - 1) * stepHours;

  if (tHours < 0 || tHours > maxHours) {
    throw new RangeError(`tHours ${tHours} outside ephemeris range [0, ${maxHours}]`);
  }

  const stepFloat = tHours / stepHours;
  const i0 = Math.floor(stepFloat);
  const frac = stepFloat - i0;

  if (frac <= 1e-9 || i0 >= n - 1) {
    return { lat: latArr[i0], lon: lonArr[i0] };
  }

  const i1 = i0 + 1;
  const lat = latArr[i0] + frac * (latArr[i1] - latArr[i0]);
  const lon = lerpAngle180(lonArr[i0], lonArr[i1], frac);

  return { lat, lon };
}

/**
 * Computes Sun elevation and azimuth seen from (lat, lon) on Moon at tHours.
 */
export function sunAltAz(lat, lon, tHours, ephem) {
  if (!ephem || !ephem.subSolarLat || !ephem.subSolarLon) {
    throw new Error('Invalid ephemeris object provided to sunAltAz');
  }
  const sub = interpolateSubPoint(ephem.subSolarLat, ephem.subSolarLon, tHours, ephem.stepHours || 1);
  return calculateElAz(lat, lon, sub.lat, sub.lon);
}

/**
 * Computes Earth elevation and azimuth seen from (lat, lon) on Moon at tHours.
 */
export function earthAltAz(lat, lon, tHours, ephem) {
  if (!ephem || !ephem.subEarthLat || !ephem.subEarthLon) {
    throw new Error('Invalid ephemeris object provided to earthAltAz');
  }
  const sub = interpolateSubPoint(ephem.subEarthLat, ephem.subEarthLon, tHours, ephem.stepHours || 1);
  return calculateElAz(lat, lon, sub.lat, sub.lon);
}

/**
 * Samples a continuous time series for a site over durationHours.
 * Returns { t, sunEl, sunAz, earthEl, earthAz } with t relative to startHours (0 to durationHours).
 */
export function sampleSeries(site, startHours, durationHours, ephem, stepHours = 1) {
  const lat = typeof site === 'object' && site !== null ? (site.lat ?? 0) : Number(site) || 0;
  const lon = typeof site === 'object' && site !== null ? (site.lon ?? 0) : 0;

  const t = [];
  const sunEl = [];
  const sunAz = [];
  const earthEl = [];
  const earthAz = [];

  const safeStart = Number.isFinite(startHours) ? startHours : 0;
  const steps = Math.floor(durationHours / stepHours) + 1;

  for (let s = 0; s < steps; s++) {
    const tRel = s * stepHours;
    const absHours = safeStart + tRel;

    let sAlt = { el: 0, az: 0 };
    let eAlt = { el: 0, az: 0 };

    try {
      sAlt = sunAltAz(lat, lon, absHours, ephem);
      eAlt = earthAltAz(lat, lon, absHours, ephem);
    } catch {
      // Clamped boundary fallback
      const maxHours = ((ephem.subSolarLat?.length || 1) - 1) * (ephem.stepHours || 1);
      const clampedH = Math.max(0, Math.min(maxHours, absHours || 0));
      try {
        sAlt = sunAltAz(lat, lon, clampedH, ephem);
        eAlt = earthAltAz(lat, lon, clampedH, ephem);
      } catch {
        sAlt = { el: 0, az: 0 };
        eAlt = { el: 0, az: 0 };
      }
    }

    t.push(tRel);
    sunEl.push(Number.isFinite(sAlt?.el) ? Math.round(sAlt.el * 1000) / 1000 : 0);
    sunAz.push(Number.isFinite(sAlt?.az) ? Math.round(sAlt.az * 1000) / 1000 : 0);
    earthEl.push(Number.isFinite(eAlt?.el) ? Math.round(eAlt.el * 1000) / 1000 : 0);
    earthAz.push(Number.isFinite(eAlt?.az) ? Math.round(eAlt.az * 1000) / 1000 : 0);
  }

  return { t, sunEl, sunAz, earthEl, earthAz };
}

/**
 * Evaluates the 4 angles at relative time tRel via interpolation.
 * Elevation is linearly interpolated.
 * Azimuth is shortest-arc interpolated to avoid discontinuous 359° -> 0° jumps.
 */
export function valuesAt(series, tRel) {
  if (!series || !series.t || series.t.length === 0) {
    return { sunEl: 0, sunAz: 0, earthEl: 0, earthAz: 0 };
  }

  const { t, sunEl, sunAz, earthEl, earthAz } = series;
  const n = t.length;

  if (tRel <= t[0]) {
    return {
      sunEl: sunEl[0],
      sunAz: sunAz[0],
      earthEl: earthEl[0],
      earthAz: earthAz[0]
    };
  }

  if (tRel >= t[n - 1]) {
    return {
      sunEl: sunEl[n - 1],
      sunAz: sunAz[n - 1],
      earthEl: earthEl[n - 1],
      earthAz: earthAz[n - 1]
    };
  }

  // Binary search for interval
  let low = 0;
  let high = n - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (t[mid] <= tRel) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const i0 = Math.max(0, high);
  const i1 = Math.min(n - 1, i0 + 1);

  if (i0 === i1) {
    return {
      sunEl: sunEl[i0],
      sunAz: sunAz[i0],
      earthEl: earthEl[i0],
      earthAz: earthAz[i0]
    };
  }

  const dt = t[i1] - t[i0];
  const frac = dt > 0 ? (tRel - t[i0]) / dt : 0;

  return {
    sunEl: Math.round((sunEl[i0] + frac * (sunEl[i1] - sunEl[i0])) * 1000) / 1000,
    sunAz: Math.round(lerpAzimuth(sunAz[i0], sunAz[i1], frac) * 1000) / 1000,
    earthEl: Math.round((earthEl[i0] + frac * (earthEl[i1] - earthEl[i0])) * 1000) / 1000,
    earthAz: Math.round(lerpAzimuth(earthAz[i0], earthAz[i1], frac) * 1000) / 1000
  };
}
