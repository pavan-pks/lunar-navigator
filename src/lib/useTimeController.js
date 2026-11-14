/**
 * src/lib/useTimeController.js
 * React hook driving a continuous mission simulation clock using requestAnimationFrame.
 * Automatically pauses when document is hidden to conserve GPU/CPU cycles.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export const SPEED_OPTIONS = [6, 12, 24, 48];

export function useTimeController({ maxHours = 336, initialSpeed = 12 } = {}) {
  const [tRel, setTRel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(initialSpeed);

  const tRelRef = useRef(0);
  tRelRef.current = tRel;

  const maxHoursRef = useRef(maxHours);
  maxHoursRef.current = maxHours;

  const speedRef = useRef(speed);
  speedRef.current = speed;

  const playingRef = useRef(playing);
  playingRef.current = playing;

  const animFrameId = useRef(null);
  const lastTimeRef = useRef(null);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying(p => !p), []);

  const setTime = useCallback((timeOrFn) => {
    setTRel(prev => {
      const next = typeof timeOrFn === 'function' ? timeOrFn(prev) : timeOrFn;
      const clamped = Math.max(0, Math.min(maxHoursRef.current, next));
      return Math.round(clamped * 100) / 100;
    });
  }, []);

  // Animation frame loop
  useEffect(() => {
    if (!playing) {
      lastTimeRef.current = null;
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
      return;
    }

    const tick = (now) => {
      if (lastTimeRef.current !== null) {
        const deltaSeconds = (now - lastTimeRef.current) / 1000;
        // Advance time in simulation hours
        const deltaHours = deltaSeconds * speedRef.current;
        const nextTime = tRelRef.current + deltaHours;

        if (nextTime >= maxHoursRef.current) {
          // Loop around to 0
          setTRel(0);
        } else {
          setTRel(Math.round(nextTime * 100) / 100);
        }
      }

      lastTimeRef.current = now;
      animFrameId.current = requestAnimationFrame(tick);
    };

    animFrameId.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
        animFrameId.current = null;
      }
    };
  }, [playing]);

  // Pause automatically when user switches away from the browser tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && playingRef.current) {
        setPlaying(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return {
    tRel,
    setTRel: setTime,
    playing,
    play,
    pause,
    toggle,
    speed,
    setSpeed
  };
}
