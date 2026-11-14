/**
 * src/lib/lunarScore.js
 * Generative soundtrack for the lunar cinematic intro, synthesised with the Web Audio API (zero audio files).
 * Every sound is scheduled against the intro timeline so pause/seek/skip stay in sync.
 */

const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Chords per chapter (MIDI notes) with the pad's filter brightness
function chords(c) {
  return [
    { t0: 0, t1: 6.6, notes: [45, 52, 59, 60], cutoff: 800 },                        // Milky Way: A minor add9, distant
    { t0: 6.2, t1: c.sunDive + 0.4, notes: [41, 48, 52, 57], cutoff: 2400 },         // Sun: Fmaj7, expanding
    { t0: c.sunDive, t1: c.inner + 0.4, notes: [48, 55, 62, 64], cutoff: 1900 },     // Solar system: C add9, wonder
    { t0: c.inner, t1: c.earth + 0.4, notes: [40, 47, 50, 55, 62], cutoff: 1700 },   // Inner planets: E minor 7
    { t0: c.earth, t1: c.moon + 0.4, notes: [47, 50, 55, 62], cutoff: 1600 },        // Earth: G/B, warm
    { t0: c.moon, t1: c.arrive + 0.3, notes: [43, 50, 55, 58, 62], cutoff: 1800 },   // The Moon: G minor 7, stark silver
    { t0: c.arrive, t1: c.end + 2.0, notes: [45, 52, 57, 60, 64], cutoff: 2800 },    // Lunar South Pole: A minor 9, resolved
  ];
}

export class LunarScore {
  constructor(cues) {
    this.cues = cues;
    this.CHORDS = chords(cues);
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const ctx = this.ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 0.85;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.out.connect(comp).connect(ctx.destination);

    this.verb = ctx.createConvolver();
    this.verb.buffer = this.impulse(4.2);
    const wet = ctx.createGain();
    wet.gain.value = 0.85;
    this.verb.connect(wet).connect(this.out);

    this.pass = null;
    this.muted = false;
  }

  impulse(seconds) {
    const { ctx } = this;
    const len = Math.floor(ctx.sampleRate * seconds);
    const b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
      }
    }
    return b;
  }

  setMuted(m) {
    this.muted = m;
    this.out.gain.setTargetAtTime(m ? 0 : 0.85, this.ctx.currentTime, 0.08);
  }

  stop(fade = 0.35) {
    const p = this.pass;
    if (!p) return;
    this.pass = null;
    const now = this.ctx.currentTime;
    p.bus.gain.cancelScheduledValues(now);
    p.bus.gain.setValueAtTime(p.bus.gain.value, now);
    p.bus.gain.linearRampToValueAtTime(0, now + fade);
    setTimeout(() => {
      p.nodes.forEach((n) => {
        try { n.stop(); } catch {}
      });
      p.bus.disconnect();
    }, (fade + 0.1) * 1000);
  }

  close() {
    this.stop(1.2);
    setTimeout(() => this.ctx.close(), 1800);
  }

  start(t) {
    this.stop(0.2);
    const ctx = this.ctx;
    ctx.resume();
    const now = ctx.currentTime + 0.05;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0, now);
    bus.gain.linearRampToValueAtTime(1, now + 0.6);

    const send = ctx.createGain();
    send.gain.value = 0.55;
    bus.connect(this.out);
    bus.connect(send).connect(this.verb);

    const pass = { bus, nodes: [] };
    this.pass = pass;
    const at = (x) => Math.max(now, now + (x - t));
    const live = (x0, x1) => x1 > t;
    const track = (n) => { pass.nodes.push(n); return n; };

    // Schedule ambient chord pads
    for (const ch of this.CHORDS) {
      if (!live(ch.t0, ch.t1)) continue;
      const tStart = at(ch.t0);
      const tEnd = at(ch.t1);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(ch.cutoff, now);
      filter.connect(bus);

      for (const m of ch.notes) {
        const osc = track(ctx.createOscillator());
        osc.type = 'sawtooth';
        osc.frequency.value = midi(m) * (1 + (Math.random() - 0.5) * 0.004); // subtle detune

        const g = ctx.createGain();
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.08 / ch.notes.length, tStart + 0.8);
        g.gain.setValueAtTime(0.08 / ch.notes.length, tEnd - 0.5);
        g.gain.linearRampToValueAtTime(0.0001, tEnd + 1.2);

        osc.connect(g).connect(filter);
        osc.start(tStart);
        osc.stop(tEnd + 1.3);
      }
    }
  }
}
