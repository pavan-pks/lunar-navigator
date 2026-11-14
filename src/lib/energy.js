/**
 * src/lib/energy.js
 * Lunar surface battery and solar photovoltaic power simulation.
 * 
 * NOTE ON POLAR SOLAR ARCHITECTURE:
 * Near the lunar poles (latitudes > 80° S/N), the Sun skims low across the local horizon,
 * rarely rising more than 1.5° to 3.0° in elevation. Under these grazing angles:
 * - A HORIZONTAL panel intercepts almost zero flux: sin(2°) ≈ 0.035 (3.5% effective area).
 * - A VERTICAL panel intercepts the grazing beam directly: cos(2°) ≈ 0.999 (99.9% effective area).
 * Therefore, vertical cylindrical or steerable vertical solar masts (like those on NASA's VIPER
 * and Artemis Human Landing System) produce over 28x more energy than horizontal panels.
 */

import { SUN_UP_DEG } from './config.js';

const DEG2RAD = Math.PI / 180;

export const DEFAULT_BATTERY_PARAMS = {
  capacityWh: 1000,
  panelPeakW: 200,
  loadW: 60,
  nightHeaterW: 20,
  orientation: 'horizontal', // 'horizontal' | 'vertical-fixed' | 'vertical-tracking'
  panelAz: 180,              // degrees (used only when orientation === 'vertical-fixed')
  startChargeFraction: 1.0
};

/**
 * Calculates instantaneous solar panel geometry efficiency factor [0, 1].
 */
export function getPanelFactor(sunElDeg, sunAzDeg, orientation = 'horizontal', panelAzDeg = 180) {
  if (sunElDeg <= SUN_UP_DEG) {
    return 0.0;
  }

  // Moon has no atmospheric refraction; clamp effective elevation to >= 0
  const elEff = Math.max(0, sunElDeg) * DEG2RAD;

  switch (orientation) {
    case 'vertical-tracking': {
      // Panel rotates to continuously face the Sun azimuth
      return Math.max(0, Math.cos(elEff));
    }
    case 'vertical-fixed': {
      // Fixed vertical panel facing panelAzDeg
      const dAz = (sunAzDeg - panelAzDeg) * DEG2RAD;
      return Math.max(0, Math.cos(elEff) * Math.cos(dAz));
    }
    case 'horizontal':
    default: {
      // Flat horizontal panel facing the lunar zenith
      return Math.max(0, Math.sin(elEff));
    }
  }
}

/**
 * Simulates battery charge level hour-by-hour across a mission series.
 * 
 * series: { t: number[], sunEl: number[], sunAz: number[] }
 * params: optional Partial<DEFAULT_BATTERY_PARAMS>
 */
export function simulateBattery(series, params = {}) {
  const cfg = { ...DEFAULT_BATTERY_PARAMS, ...params };

  if (!series || !series.t || series.t.length === 0) {
    return {
      charge: [],
      generationW: [],
      netPowerW: [],
      depletedAtHour: null,
      survivedHours: 0,
      minChargeWh: 0,
      summary: 'No telemetry data available for simulation.'
    };
  }

  const { t, sunEl, sunAz } = series;
  const n = t.length;

  let currentCharge = cfg.capacityWh * Math.max(0, Math.min(1, cfg.startChargeFraction));
  let minCharge = currentCharge;
  let depletedAtHour = null;

  const charge = [Math.round(currentCharge * 10) / 10];
  const generationW = [];
  const netPowerW = [];

  const initialFactor = getPanelFactor(sunEl[0], sunAz?.[0] ?? 0, cfg.orientation, cfg.panelAz);
  const initialGen = cfg.panelPeakW * initialFactor;
  const initialSunUp = sunEl[0] > SUN_UP_DEG;
  const initialNet = initialGen - cfg.loadW - (initialSunUp ? 0 : cfg.nightHeaterW);
  generationW.push(Math.round(initialGen * 10) / 10);
  netPowerW.push(Math.round(initialNet * 10) / 10);

  for (let i = 0; i < n - 1; i++) {
    const dt = t[i + 1] - t[i];
    const el = sunEl[i];
    const az = sunAz?.[i] ?? 0;
    const isSunlit = el > SUN_UP_DEG;

    const factor = getPanelFactor(el, az, cfg.orientation, cfg.panelAz);
    const genW = cfg.panelPeakW * factor;
    const loadTotalW = cfg.loadW + (isSunlit ? 0 : cfg.nightHeaterW);
    const netW = genW - loadTotalW;

    currentCharge += netW * dt;

    if (currentCharge <= 1e-4) {
      currentCharge = 0;
      if (depletedAtHour === null) {
        depletedAtHour = Math.round(t[i + 1] * 10) / 10;
      }
    } else if (currentCharge > cfg.capacityWh) {
      currentCharge = cfg.capacityWh;
    }

    if (currentCharge < minCharge) {
      minCharge = currentCharge;
    }

    charge.push(Math.round(currentCharge * 10) / 10);
    generationW.push(Math.round(genW * 10) / 10);
    netPowerW.push(Math.round(netW * 10) / 10);
  }

  const totalHours = t[n - 1] - t[0];
  const survivedHours = depletedAtHour !== null ? depletedAtHour : totalHours;

  let summary = '';
  if (depletedAtHour !== null) {
    const days = (depletedAtHour / 24).toFixed(1);
    summary = `Battery runs out after ${days} days (${depletedAtHour.toFixed(0)} h), before the Sun returns.`;
  } else {
    const days = (totalHours / 24).toFixed(1);
    summary = `Battery survives the whole ${days}-day mission window (minimum reserve: ${minCharge.toFixed(0)} Wh).`;
  }

  return {
    charge,
    generationW,
    netPowerW,
    depletedAtHour,
    survivedHours,
    minChargeWh: Math.round(minCharge * 10) / 10,
    summary
  };
}
