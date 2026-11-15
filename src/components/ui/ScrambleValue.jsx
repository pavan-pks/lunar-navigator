import React, { useState, useEffect, useRef } from 'react';

const CHARS = '0123456789ABCDEF+-°%h';

/**
 * High-tech aerospace number-scrambling decipher text component.
 * On value change, rapidly cycles random characters for 350ms before resolving to final text.
 */
export function ScrambleValue({ value, durationMs = 380, className = '' }) {
  const [displayText, setDisplayText] = useState(String(value));
  const animRef = useRef(null);
  const lastUpdateRef = useRef(0);
  const targetStr = String(value);

  useEffect(() => {
    const now = performance.now();
    const timeSinceLast = now - lastUpdateRef.current;
    lastUpdateRef.current = now;

    // During rapid numerical changes (timeline playback/scrubbing), update directly
    // to avoid visual text vibrating and prevent hundreds of React RAF re-renders.
    if (timeSinceLast < 450) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      setDisplayText(targetStr);
      return;
    }

    let startTime = now;
    const len = targetStr.length;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const updateScramble = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);

      // How many characters have locked in
      const lockedChars = Math.floor(progress * len);

      let scrambled = '';
      for (let i = 0; i < len; i++) {
        if (i < lockedChars || targetStr[i] === ' ' || targetStr[i] === '.' || targetStr[i] === ':') {
          scrambled += targetStr[i];
        } else {
          scrambled += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
      }

      setDisplayText(scrambled);

      if (progress < 1.0) {
        animRef.current = requestAnimationFrame(updateScramble);
      } else {
        setDisplayText(targetStr);
      }
    };

    animRef.current = requestAnimationFrame(updateScramble);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value, durationMs]);

  return <span className={className}>{displayText}</span>;
}

export default ScrambleValue;
