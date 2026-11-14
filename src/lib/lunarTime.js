/**
 * src/lib/lunarTime.js
 * Real-time lunar astronomical calculations:
 * - Lunar phase & illumination percentage
 * - Sub-solar latitude (lunar season)
 * - Earth-Moon geometric distance & radio latency
 * - Coordinated Lunar Time (LTC)
 */

export function getLunarTime(date = new Date()) {
  const timeMs = date.getTime();

  // Known new moon reference: Jan 11, 2024 11:57 UTC
  const refNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const synodicMonthDays = 29.53058867;
  const synodicMonthMs = synodicMonthDays * 86400000;

  const diffMs = timeMs - refNewMoon;
  const phaseCycle = ((diffMs % synodicMonthMs) + synodicMonthMs) % synodicMonthMs;
  const phaseFraction = phaseCycle / synodicMonthMs; // 0 to 1

  // Moon age in days
  const moonAgeDays = phaseFraction * synodicMonthDays;

  // Illumination percentage (0% at new moon, 100% at full moon)
  const illumPct = Math.round((1 - Math.cos(phaseFraction * 2 * Math.PI)) / 2 * 100);

  // Phase name
  let phaseName = 'New Moon';
  if (phaseFraction < 0.03 || phaseFraction > 0.97) phaseName = 'New Moon';
  else if (phaseFraction < 0.22) phaseName = 'Waxing Crescent';
  else if (phaseFraction < 0.28) phaseName = 'First Quarter';
  else if (phaseFraction < 0.47) phaseName = 'Waxing Gibbous';
  else if (phaseFraction < 0.53) phaseName = 'Full Moon';
  else if (phaseFraction < 0.72) phaseName = 'Waning Gibbous';
  else if (phaseFraction < 0.78) phaseName = 'Third Quarter';
  else phaseName = 'Waning Crescent';

  // Sub-solar latitude (tilt of lunar axis ~1.54° relative to ecliptic)
  // J2000 epoch days
  const d = (timeMs / 86400000) - 10957.5;
  const sunLon = (280.460 + 0.9856474 * d) % 360;
  const subSolarLat = -1.54 * Math.sin((sunLon * Math.PI) / 180);

  // Earth-Moon distance (mean 384,400 km, varying 363,300 to 405,500 km)
  const meanAnomaly = (134.963 + 13.064993 * d) % 360;
  const distKm = Math.round(384400 - 20905 * Math.cos((meanAnomaly * Math.PI) / 180));
  const lightSeconds = (distKm / 299792.458).toFixed(2);

  // Coordinated Lunar Time (clock at lunar prime meridian)
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  const ltcHours = ((utcHours + 24) % 24);
  const ltcH = Math.floor(ltcHours);
  const ltcM = Math.floor((ltcHours - ltcH) * 60);

  return {
    phaseFraction,
    phaseName,
    illumPct,
    moonAgeDays: moonAgeDays.toFixed(1),
    subSolarLat: subSolarLat.toFixed(2),
    distKm,
    lightSeconds,
    ltcString: `${String(ltcH).padStart(2, '0')}:${String(ltcM).padStart(2, '0')} LTC`,
    utcString: date.toUTCString().slice(17, 25) + ' UTC'
  };
}
