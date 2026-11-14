import React, { useState, useEffect, useRef } from 'react';

const CHARS = '0123456789ABCDEF+-°%h';

/**
 * High-tech aerospace number-scrambling decipher text component.
 * On value change, rapidly cycles random characters for 350ms before resolving to final text.
 */
export function ScrambleValue({ value, durationMs = 380, className = '' }) {
  const [displayText, setDisplayText] = useState(String(value));
  const animRef = useRef(null);
  const targetStr = String(value);

  useEffect(() => {
    let startTime = performance.now();
    const len = targetStr.length;

    if (animRef.current) cancelAnimationFrame(animRef.current);

    const updateScramble = (now) => {
      const elapsed = now - startTime;
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
