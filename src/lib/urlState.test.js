import { describe, it, expect, vi, beforeEach } from 'vitest';
import { parseUrlState, buildUrlState } from './urlState.js';

describe('URL State Serialization', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: {
        search: '',
        hash: '',
        pathname: '/'
      }
    });
  });

  it('parses empty query params safely with noIntro check', () => {
    const state = parseUrlState('', '#nointro');
    expect(state.noIntro).toBe(true);
    expect(state.siteId).toBeNull();
  });

  it('parses valid mission params from search string', () => {
    const search = '?site=shackleton&launch=2027-03-08&transit=4&slip=5&mode=explorer&tab=timeline&t=48.5';
    const state = parseUrlState(search, '');
    expect(state.siteId).toBe('shackleton');
    expect(state.launch).toBe('2027-03-08');
    expect(state.transit).toBe(4);
    expect(state.slip).toBe(5);
    expect(state.mode).toBe('explorer');
    expect(state.tab).toBe('timeline');
    expect(state.t).toBe(48.5);
  });

  it('builds canonical URL state string preserving hash and query', () => {
    const url = buildUrlState({
      siteId: 'connecting-ridge',
      launchDate: '2027-04-10T00:00:00Z',
      transitDays: 3,
      slipDays: 7,
      mode: 'explorer',
      tab: 'battery',
      t: 12.0,
      noIntro: true
    });

    expect(url).toContain('site=connecting-ridge');
    expect(url).toContain('launch=2027-04-10');
    expect(url).toContain('transit=3');
    expect(url).toContain('slip=7');
    expect(url).toContain('mode=explorer');
    expect(url).toContain('tab=battery');
    expect(url).toContain('#nointro');
  });
});
