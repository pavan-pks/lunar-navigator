import { describe, it, expect } from 'vitest';
import { getExplorerCaptions } from './captions.js';

describe('captions.js tests', () => {
  it('generates educational captions for grazing polar daylight', () => {
    const stats = {
      meanSunEl: 2.0,
      sunlitFraction: 0.9,
      longestDarkHours: 24,
      earthVisibleFraction: 0.85
    };
    const liveAngles = { sunEl: 2.0, sunAz: 180, earthEl: 10, earthAz: 0 };

    const captions = getExplorerCaptions({ stats, liveAngles, objectHeightM: 3.0, siteName: 'Malapert' });
    expect(captions.length).toBeGreaterThanOrEqual(3);

    const shadowCaption = captions.find(c => c.title.includes('Shadow'));
    expect(shadowCaption).toBeDefined();
    expect(shadowCaption.text).toContain('Malapert');
    expect(shadowCaption.text).toContain('shadow');

    const earthCaption = captions.find(c => c.title.includes('Earth'));
    expect(earthCaption.title).toContain('Continuous Earth Communications');
    expect(earthCaption.text).toContain('85%');
  });

  it('generates dark thermal warning when dark hours are long', () => {
    const stats = {
      meanSunEl: -5.0,
      sunlitFraction: 0.2,
      longestDarkHours: 150,
      earthVisibleFraction: 0.2
    };
    const liveAngles = { sunEl: -5.0, sunAz: 180, earthEl: -2, earthAz: 0 };

    const captions = getExplorerCaptions({ stats, liveAngles, objectHeightM: 3.0 });
    const thermalCaption = captions.find(c => c.title.includes('Freeze'));
    expect(thermalCaption).toBeDefined();
    expect(thermalCaption.text).toContain('plunge to -180°C');
  });
});
