/**
 * src/lib/captions.js
 * Generates plain-language educational captions and mission insights for Explorer Mode.
 */

import { shadowLength } from './metrics.js';

export function getExplorerCaptions({ stats, liveAngles, objectHeightM = 3.0, siteName = 'This site' }) {
  if (!stats) return [];

  const captions = [];

  // 1. Solar Elevation & Extreme Polar Shadowing
  const sunEl = liveAngles?.sunEl ?? stats.meanSunEl;
  const shadowM = shadowLength(objectHeightM, sunEl);
  if (sunEl > 0 && Number.isFinite(shadowM)) {
    const multiple = (shadowM / objectHeightM).toFixed(1);
    captions.push({
      icon: '📐',
      title: 'Horizon Grazing & Giant Shadows',
      text: `At ${siteName}, the Sun hovers only ${sunEl.toFixed(1)}° above the horizon. A ${objectHeightM}m tall lander casts a shadow ${shadowM.toFixed(0)} meters long (${multiple}× its height)!`
    });
  } else {
    captions.push({
      icon: '🌑',
      title: 'Surface Nighttime',
      text: `The Sun is currently below the local horizon. The site is in complete lunar darkness and relies entirely on battery and thermal survival systems.`
    });
  }

  // 2. Earth Direct Line-of-Sight & Communications
  const earthPercent = (stats.earthVisibleFraction * 100).toFixed(0);
  if (stats.earthVisibleFraction >= 0.8) {
    captions.push({
      icon: '📡',
      title: 'Continuous Earth Communications',
      text: `Earth remains in direct line-of-sight for ${earthPercent}% of the mission. The lander can transmit high-definition video and telemetry directly to Deep Space Network antennas.`
    });
  } else if (stats.earthVisibleFraction >= 0.4) {
    captions.push({
      icon: '🛰️',
      title: 'Intermittent Earth Line-of-Sight',
      text: `Earth is visible ${earthPercent}% of the mission due to lunar libration (wobble). Ground teams must buffer data during occulted periods or rely on lunar orbital relay satellites.`
    });
  } else {
    captions.push({
      icon: '⚠️',
      title: 'Earth Shadow Zone',
      text: `Earth is visible only ${earthPercent}% of the time. Without an orbital communications relay satellite, ground controllers will experience blackout periods.`
    });
  }

  // 3. Thermal Survival & Dark Duration
  const darkDays = (stats.longestDarkHours / 24).toFixed(1);
  if (stats.longestDarkHours <= 48) {
    captions.push({
      icon: '🛡️',
      title: 'Manageable Thermal Night',
      text: `The longest darkness lasts only ${stats.longestDarkHours} hours (${darkDays} days). Moderate battery capacity is sufficient to keep electronics above freezing (-40°C).`
    });
  } else {
    captions.push({
      icon: '❄️',
      title: 'Extreme Cryogenic Freeze Hazard',
      text: `The longest darkness lasts ${stats.longestDarkHours} hours (${darkDays} days). Surface temperatures plunge to -180°C (-292°F), requiring radioisotope heater units (RHUs) or heavy battery reserves.`
    });
  }

  // 4. Polar Axis Geometry Fact
  captions.push({
    icon: '🪐',
    title: 'Minimal Axial Tilt',
    text: `Because the Moon’s rotational axis is tilted only 1.54° (compared to Earth’s 23.4°), seasonal variations are minimal. High ridges at the poles can bask in sunlight nearly year-round.`
  });

  return captions;
}
