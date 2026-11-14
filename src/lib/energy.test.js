import { describe, it, expect } from 'vitest';
import { simulateBattery, getPanelFactor, DEFAULT_BATTERY_PARAMS } from './energy.js';

describe('energy.js battery simulation tests', () => {
  it('constant daylight with generation above load stays 100% full', () => {
    // 100 hours of constant Sun at 45°
    const t = Array.from({ length: 101 }, (_, i) => i);
    const sunEl = Array(101).fill(45.0);
    const sunAz = Array(101).fill(180.0);

    const result = simulateBattery(
      { t, sunEl, sunAz },
      {
        capacityWh: 1000,
        panelPeakW: 200,
        loadW: 60,
        nightHeaterW: 20,
        orientation: 'horizontal'
      }
    );

    // Generation: 200 * sin(45°) ≈ 141.4W > 60W load
    expect(result.depletedAtHour).toBeNull();
    expect(result.survivedHours).toBe(100);
    expect(result.minChargeWh).toBe(1000);
    expect(result.charge.every(c => c === 1000)).toBe(true);
    expect(result.summary).toContain('survives the whole');
  });

  it('constant darkness depletes battery at the expected hour', () => {
    // 50 hours of darkness (-10° sun elevation)
    const t = Array.from({ length: 51 }, (_, i) => i);
    const sunEl = Array(51).fill(-10.0);
    const sunAz = Array(51).fill(180.0);

    // Load = 60W + 20W night heater = 80W discharge rate
    // 1000Wh / 80W = 12.5 hours to full depletion
    const result = simulateBattery(
      { t, sunEl, sunAz },
      {
        capacityWh: 1000,
        panelPeakW: 200,
        loadW: 60,
        nightHeaterW: 20,
        orientation: 'horizontal'
      }
    );

    expect(result.depletedAtHour).toBe(13); // Hits 0 Wh at step 13 (after 13h)
    expect(result.survivedHours).toBe(13);
    expect(result.minChargeWh).toBe(0);
    expect(result.summary).toContain('Battery runs out');
  });

  it('vertical-tracking generates over 28x more power than horizontal at 2° polar elevation', () => {
    const el = 2.0;
    const az = 90.0;

    const factorHoriz = getPanelFactor(el, az, 'horizontal');
    const factorVertTrack = getPanelFactor(el, az, 'vertical-tracking');

    // sin(2°) ≈ 0.034899
    // cos(2°) ≈ 0.99939
    expect(factorHoriz).toBeCloseTo(Math.sin(2 * Math.PI / 180), 4);
    expect(factorVertTrack).toBeCloseTo(Math.cos(2 * Math.PI / 180), 4);

    const ratio = factorVertTrack / factorHoriz;
    expect(ratio).toBeGreaterThan(28);

    const genHoriz = 200 * factorHoriz;
    const genVert = 200 * factorVertTrack;

    expect(genHoriz).toBeLessThan(10); // ~6.98W
    expect(genVert).toBeGreaterThan(195); // ~199.88W
  });

  it('vertical-fixed generates power only when Sun azimuth faces panel azimuth', () => {
    const el = 2.0;

    // Panel faces south (180°)
    const factorFacing = getPanelFactor(el, 180, 'vertical-fixed', 180);
    expect(factorFacing).toBeCloseTo(Math.cos(2 * Math.PI / 180), 4);

    // Sun at 90° (perpendicular) -> cos(90°) = 0
    const factorPerp = getPanelFactor(el, 90, 'vertical-fixed', 180);
    expect(factorPerp).toBeCloseTo(0, 4);

    // Sun at 0° (behind panel) -> cos(180°) = -1 -> clamped to 0
    const factorBehind = getPanelFactor(el, 0, 'vertical-fixed', 180);
    expect(factorBehind).toBe(0);
  });

  it('handles empty or missing series gracefully', () => {
    const emptyResult = simulateBattery({ t: [] });
    expect(emptyResult.charge).toEqual([]);
    expect(emptyResult.depletedAtHour).toBeNull();
  });
});
