/**
 * Web Audio API synthesized sound generator for NASA Artemis Mission Control.
 * Zero external audio files required; operates via client-side synthesis.
 */

let audioCtx = null;
let isAudioMuted = true;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isMuted() {
  return isAudioMuted;
}

export function setMuted(muted) {
  isAudioMuted = muted;
}

/**
 * Authentic NASA Quindar-style telemetry tone (intro/outro beep ~2524Hz).
 */
export function playTelemetryPing(frequency = 2524, duration = 0.12) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Graceful silent fallback if Web Audio is blocked
  }
}

/**
 * Low-frequency rumble simulating thruster ignition / orbital flyby.
 */
export function playThrustRumble(duration = 2.4) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(58, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(32, ctx.currentTime + duration);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(40, ctx.currentTime);
    subOsc.frequency.exponentialRampToValueAtTime(24, ctx.currentTime + duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(140, ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(80, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.4);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    subOsc.start();
    osc.stop(ctx.currentTime + duration);
    subOsc.stop(ctx.currentTime + duration);
  } catch (err) {
    // Ignore audio errors
  }
}

/**
 * High-tech reticle lock confirmation chirp.
 */
export function playTargetLock() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const t = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1240, t);
    osc1.frequency.setValueAtTime(1860, t + 0.05);

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(620, t);
    osc2.frequency.setValueAtTime(930, t + 0.05);

    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.16);
    osc2.stop(t + 0.16);
  } catch (err) {
    // Ignore
  }
}

/**
 * Procedural Soothing Space Ambient Music Soundscape (Web Audio API).
 * Generates an evolving, calming cosmic pad with gentle breathing LFO filter swells.
 */
let ambientNodes = null;

export function startSpaceAmbientMusic() {
  if (isAudioMuted || ambientNodes) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Master ambient gain with smooth fade-in
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 2.5);
    masterGain.connect(ctx.destination);

    // Warm resonant lowpass filter
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, ctx.currentTime);
    filter.Q.setValueAtTime(2.5, ctx.currentTime);
    filter.connect(masterGain);

    // Filter LFO for breathing cosmic swell effect (~16-second cycle)
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.065, ctx.currentTime);
    lfoGain.gain.setValueAtTime(180, ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    // Four harmonic soothing celestial oscillators (C maj9 cosmic chord)
    // C2 (65.4Hz), G2 (98.0Hz), E3 (164.8Hz), B3 (246.9Hz)
    const chordFreqs = [65.41, 97.99, 164.81, 246.94];
    const oscs = [];

    chordFreqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();

      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq + (Math.random() - 0.5) * 0.35, ctx.currentTime);

      oscGain.gain.setValueAtTime(0.05 / (idx + 1), ctx.currentTime);

      osc.connect(oscGain);
      oscGain.connect(filter);
      osc.start();
      oscs.push(osc);
    });

    // Sub-bass root drone (C1 = 32.7Hz)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(32.7, ctx.currentTime);
    subGain.gain.setValueAtTime(0.07, ctx.currentTime);
    subOsc.connect(subGain);
    subGain.connect(filter);
    subOsc.start();
    oscs.push(subOsc);

    ambientNodes = { masterGain, filter, lfo, oscs };
  } catch (err) {
    // Fallback silent
  }
}

export function stopSpaceAmbientMusic() {
  if (!ambientNodes) return;
  try {
    const ctx = getAudioContext();
    if (ctx && ambientNodes.masterGain) {
      ambientNodes.masterGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      const currentNodes = ambientNodes;
      ambientNodes = null;
      setTimeout(() => {
        try {
          currentNodes.oscs.forEach((osc) => {
            try { osc.stop(); } catch (e) {}
          });
          try { currentNodes.lfo.stop(); } catch (e) {}
        } catch (e) {}
      }, 1300);
    } else {
      ambientNodes = null;
    }
  } catch (err) {
    ambientNodes = null;
  }
}

export function toggleSpaceAmbientMusic(forceState) {
  if (forceState === false || (forceState === undefined && ambientNodes)) {
    stopSpaceAmbientMusic();
  } else {
    startSpaceAmbientMusic();
  }
}
