/**
 * src/lib/urlState.js
 * Serializes and restores mission planning state to/from the URL query/hash.
 * Preserves #nointro.
 */

export function parseUrlState(search = window.location.search, hash = window.location.hash) {
  const params = new URLSearchParams(search);
  const noIntro = hash.includes('nointro') || params.get('intro') === '0';

  const siteId = params.get('site') || null;
  const launch = params.get('launch') || null;
  const transit = params.has('transit') ? parseInt(params.get('transit'), 10) : null;
  const slip = params.has('slip') ? parseInt(params.get('slip'), 10) : null;
  const mode = params.get('mode') || null; // 'planner' | 'explorer'
  const tab = params.get('tab') || null; // 'metrics' | 'timeline' | 'battery' | 'calendar' | 'compare'
  const t = params.has('t') ? parseFloat(params.get('t')) : null;

  // Compare scenario params
  const cmpMode = params.get('cmpMode') || null; // 'sites' | 'dates'
  const siteB = params.get('siteB') || null;
  const launchB = params.get('launchB') || null;

  return {
    noIntro,
    siteId,
    launch,
    transit,
    slip,
    mode,
    tab,
    t,
    cmpMode,
    siteB,
    launchB
  };
}

export function buildUrlState({
  siteId,
  launchDate,
  transitDays,
  slipDays,
  mode,
  tab,
  t,
  compareMode,
  scenarioB,
  noIntro = true
}) {
  const params = new URLSearchParams();

  if (siteId) params.set('site', siteId);
  if (launchDate) params.set('launch', launchDate.slice(0, 10));
  if (transitDays !== undefined && transitDays !== 4) params.set('transit', transitDays);
  if (slipDays) params.set('slip', slipDays);
  if (mode && mode !== 'planner') params.set('mode', mode);
  if (tab && tab !== 'metrics') params.set('tab', tab);
  if (t !== undefined && t > 0.5) params.set('t', t.toFixed(1));

  if (compareMode && compareMode !== 'sites') params.set('cmpMode', compareMode);
  if (scenarioB?.siteId && scenarioB.siteId !== 'malapert') params.set('siteB', scenarioB.siteId);
  if (scenarioB?.launchDate) params.set('launchB', scenarioB.launchDate.slice(0, 10));

  const query = params.toString();
  const hash = noIntro ? '#nointro' : '';
  const search = query ? `?${query}` : '';

  return `${window.location.pathname}${search}${hash}`;
}
