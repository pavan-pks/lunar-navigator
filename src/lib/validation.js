import { hoursSince, dateFromHours } from './geometry.js';

/**
 * Computes the temporal bounds covered by the global ephemeris dataset.
 *
 * @param {Object} ephem - Global ephemeris object with startUTC, stepHours, and subSolarLat
 * @returns {{ startUTC: string, endUTC: string, totalHours: number, count: number, stepHours: number, startDate: Date, endDate: Date }}
 */
export function computeEphemerisRange(ephem) {
  if (!ephem || !ephem.startUTC || !Array.isArray(ephem.subSolarLat) || ephem.subSolarLat.length === 0) {
    const fallbackStart = new Date('2027-01-01T00:00:00Z');
    return {
      startUTC: fallbackStart.toISOString(),
      endUTC: fallbackStart.toISOString(),
      totalHours: 0,
      count: 0,
      stepHours: 1,
      startDate: fallbackStart,
      endDate: fallbackStart
    };
  }

  const stepHours = Number(ephem.stepHours) || 1;
  const count = ephem.subSolarLat.length;
  const totalHours = (count - 1) * stepHours;
  const startDate = new Date(ephem.startUTC);
  const endDate = new Date(startDate.getTime() + totalHours * 3600 * 1000);

  return {
    startUTC: ephem.startUTC,
    endUTC: endDate.toISOString(),
    totalHours,
    count,
    stepHours,
    startDate,
    endDate
  };
}

/**
 * Validates mission planning temporal inputs (launch date, transit duration, launch slip).
 * Clamps out-of-range values and generates inline warnings/errors.
 *
 * @param {Object} params
 * @param {string|Date} params.launchDate - Scheduled launch date
 * @param {number} params.transitDays - Trans-lunar transit time in days (typically 3 to 5 days)
 * @param {number} params.slipDays - Launch slip window delay in days (0 to 30)
 * @param {number} [params.missionDays=14] - Planned surface duration in days
 * @param {Object} params.ephem - Global ephemeris dataset
 * @returns {Object} Validation summary, warnings, and clamped operational values
 */
export function validateMissionInputs({
  launchDate,
  transitDays = 3,
  slipDays = 0,
  missionDays = 14,
  ephem
}) {
  const errors = [];
  const warnings = [];

  const range = computeEphemerisRange(ephem);

  // 1. Validate transit days (typical lunar transit: 1 to 14 days)
  let validTransit = Number(transitDays);
  if (!Number.isFinite(validTransit) || validTransit < 0) {
    errors.push('Transit duration must be a non-negative number.');
    validTransit = 3;
  } else if (validTransit > 14) {
    warnings.push('Transit duration exceeds standard lunar trajectory (1-14 days).');
    validTransit = Math.min(validTransit, 30);
  }

  // 2. Validate launch slip (0 to 30 days)
  let validSlip = Number(slipDays);
  if (!Number.isFinite(validSlip) || validSlip < 0) {
    errors.push('Launch slip must be non-negative.');
    validSlip = 0;
  } else if (validSlip > 30) {
    warnings.push('Launch slip clamped to maximum 30-day operational margin.');
    validSlip = 30;
  }

  // 3. Validate launch date parse
  let parsedLaunch = new Date(launchDate);
  if (isNaN(parsedLaunch.getTime())) {
    errors.push('Invalid launch date format.');
    parsedLaunch = new Date(range.startUTC);
  }

  // 4. Calculate landing date and ephemeris bounds
  const totalOffsetHours = (validTransit + validSlip) * 24;
  let landingDate = new Date(parsedLaunch.getTime() + totalOffsetHours * 3600 * 1000);
  let startHours = hoursSince(range.startUTC, landingDate);
  const missionDurationHours = (Number(missionDays) || 14) * 24;
  const endHours = startHours + missionDurationHours;

  let isOutsideRange = false;
  let clampedStartHours = startHours;

  if (range.totalHours > 0) {
    if (startHours < 0) {
      isOutsideRange = true;
      warnings.push(`Landing date is before ephemeris start (${range.startUTC.slice(0, 10)}). Telemetry clamped to start.`);
      clampedStartHours = 0;
      landingDate = new Date(range.startDate);
    } else if (endHours > range.totalHours) {
      isOutsideRange = true;
      warnings.push(`Mission window extends past ephemeris end (${range.endUTC.slice(0, 10)}). Telemetry clamped to coverage end.`);
      clampedStartHours = Math.max(0, range.totalHours - missionDurationHours);
      landingDate = dateFromHours(range.startUTC, clampedStartHours);
    }
  }

  return {
    isValid: errors.length === 0,
    isOutsideRange,
    errors,
    warnings,
    launchDate: parsedLaunch.toISOString(),
    transitDays: validTransit,
    slipDays: validSlip,
    landingDate: landingDate.toISOString(),
    startHours,
    clampedStartHours,
    ephemRange: range
  };
}
