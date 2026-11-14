import React, { useState, useEffect, useRef } from 'react'

/**
 * Pure SVG and CSS schematic launch and transit trajectory animation.
 *
 * @param {Object} props
 * @param {number} [props.progress] - Progress from 0.0 (launch) to 1.0 (landing)
 * @param {string} [props.launchLabel='Earth Launch (Kennedy)'] - Label at Earth
 * @param {string} [props.landingLabel='Lunar Landing (South Pole)'] - Label at Moon
 * @param {boolean} [props.autoplay=false] - Whether animation loops automatically
 * @param {number|string} [props.height=240] - Container height
 */
export default function LaunchAnimation({
  progress: controlledProgress,
  launchLabel = 'Earth Launch',
  landingLabel = 'Lunar Landing',
  autoplay = true,
  height = 240,
}) {
  const [autoProgress, setAutoProgress] = useState(0.0)
  const animRef = useRef(null)
  const lastTimeRef = useRef(null)

  // Use controlled progress if provided, otherwise internal autoplay progress
  const isControlled = typeof controlledProgress === 'number' && Number.isFinite(controlledProgress)
  const currentProgress = isControlled
    ? Math.max(0, Math.min(1, controlledProgress))
    : autoProgress

  useEffect(() => {
    if (isControlled || !autoplay) return

    const durationMs = 12000 // 12-second trajectory loop
    const step = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time
      const dt = time - lastTimeRef.current
      lastTimeRef.current = time

      setAutoProgress((prev) => {
        const next = prev + dt / durationMs
        return next > 1.08 ? 0.0 : next
      })

      animRef.current = requestAnimationFrame(step)
    }

    animRef.current = requestAnimationFrame(step)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [autoplay, isControlled])

  // Clamped display progress for spatial math
  const p = Math.min(1.0, currentProgress)

  // Parametric Bezier curve points:
  // P0 = Earth exit (92, 120)
  // P1 = High transfer arc control (230, 40)
  // P2 = Lunar approach control (440, 50)
  // P3 = Lunar orbit entry (525, 105)
  // P4 = Lunar surface touchdown (535, 102)
  const computePositionAndAngle = (t) => {
    let x, y, dx, dy

    if (t <= 0.85) {
      // Normalised sub-progress [0 .. 1] for translunar transfer
      const u = t / 0.85
      const u2 = u * u
      const u3 = u2 * u
      const inv = 1 - u
      const inv2 = inv * inv
      const inv3 = inv2 * inv

      // Cubic Bezier
      const p0 = { x: 92, y: 120 }
      const p1 = { x: 230, y: 40 }
      const p2 = { x: 440, y: 50 }
      const p3 = { x: 520, y: 105 }

      x = inv3 * p0.x + 3 * inv2 * u * p1.x + 3 * inv * u2 * p2.x + u3 * p3.x
      y = inv3 * p0.y + 3 * inv2 * u * p1.y + 3 * inv * u2 * p2.y + u3 * p3.y

      // Tangent derivative
      dx = 3 * inv2 * (p1.x - p0.x) + 6 * inv * u * (p2.x - p1.x) + 3 * u2 * (p3.x - p2.x)
      dy = 3 * inv2 * (p1.y - p0.y) + 6 * inv * u * (p2.y - p1.y) + 3 * u2 * (p3.y - p2.y)
    } else {
      // Final 15%: Powered descent from orbit to south pole landing pad
      const u = (t - 0.85) / 0.15
      const startX = 520
      const startY = 105
      const endX = 536
      const endY = 102

      x = startX + (endX - startX) * u
      y = startY + (endY - startY) * u - Math.sin(u * Math.PI) * 12

      dx = endX - startX
      dy = endY - startY - Math.cos(u * Math.PI) * 12 * Math.PI
    }

    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    return { x, y, angle }
  }

  const { x: craftX, y: craftY, angle: craftAngle } = computePositionAndAngle(p)

  // Mission phase description
  let phaseText = 'Trans-Lunar Injection (TLI)'
  if (p >= 0.98) phaseText = 'Touchdown on Lunar Surface'
  else if (p >= 0.85) phaseText = 'Powered Descent Initiation (PDI)'
  else if (p >= 0.7) phaseText = 'Lunar Orbit Insertion (LOI)'
  else if (p >= 0.15) phaseText = 'Translunar Coast (~4 days)'

  return (
    <div
      style={{
        width: '100%',
        height: typeof height === 'number' ? `${height}px` : height,
        background: '#090d16',
        borderRadius: '8px',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        color: '#f8fafc',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        userSelect: 'none',
      }}
    >
      <svg
        viewBox="0 0 600 240"
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Earth gradient */}
          <radialGradient id="earthGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="45%" stopColor="#2563eb" />
            <stop offset="90%" stopColor="#1e3a8a" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>

          {/* Moon gradient */}
          <radialGradient id="moonGrad" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#cbd5e1" />
            <stop offset="60%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </radialGradient>

          {/* Glow filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Transfer Trajectory Curve */}
        <path
          d="M 92,120 C 230,40 440,50 520,105 Q 528,90 536,102"
          fill="none"
          stroke="#0284c7"
          strokeWidth="2"
          strokeDasharray="4,4"
          opacity="0.6"
        />

        {/* Earth & Atmosphere Glow */}
        <circle cx="60" cy="120" r="38" fill="rgba(56, 189, 248, 0.12)" />
        <circle cx="60" cy="120" r="32" fill="url(#earthGrad)" filter="url(#glow)" />
        {/* Simple continents */}
        <ellipse cx="55" cy="112" rx="14" ry="10" fill="#15803d" opacity="0.65" />
        <ellipse cx="68" cy="130" rx="10" ry="12" fill="#ca8a04" opacity="0.6" />
        {/* Atmosphere rim */}
        <circle cx="60" cy="120" r="32" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8" />
        <text x="60" y="172" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#60a5fa">
          {launchLabel}
        </text>

        {/* Moon */}
        <circle cx="540" cy="120" r="24" fill="rgba(203, 213, 225, 0.08)" />
        <circle cx="540" cy="120" r="20" fill="url(#moonGrad)" />
        {/* Simple craterlets */}
        <circle cx="534" cy="115" r="4" fill="#334155" opacity="0.6" />
        <circle cx="544" cy="125" r="3" fill="#334155" opacity="0.6" />
        <circle cx="536" cy="104" r="2.5" fill="#ef4444" opacity="0.8" />
        {/* South Pole Landing indicator */}
        <text x="540" y="160" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#94a3b8">
          {landingLabel}
        </text>

        {/* Moving Craft */}
        <g transform={`translate(${craftX}, ${craftY}) rotate(${craftAngle})`}>
          {p < 0.85 ? (
            /* Transit Stage: Rocket with engine plume */
            <>
              {/* Engine plume flame */}
              <polygon points="-8,-2 -15,0 -8,2" fill="#f59e0b" />
              <polygon points="-8,-1 -18,0 -8,1" fill="#ef4444" />
              {/* Rocket Body */}
              <rect x="-6" y="-3" width="12" height="6" rx="2" fill="#e2e8f0" stroke="#0f172a" strokeWidth="0.8" />
              {/* Nose cone */}
              <polygon points="6,-3 11,0 6,3" fill="#38bdf8" />
              {/* Solar panels */}
              <rect x="-2" y="-7" width="4" height="4" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="0.5" />
              <rect x="-2" y="3" width="4" height="4" fill="#1e3a8a" stroke="#60a5fa" strokeWidth="0.5" />
            </>
          ) : (
            /* Descent Lander Stage */
            <>
              {/* Landing legs */}
              <line x1="-3" y1="-2" x2="-6" y2="-5" stroke="#94a3b8" strokeWidth="1" />
              <line x1="-3" y1="2" x2="-6" y2="5" stroke="#94a3b8" strokeWidth="1" />
              <line x1="3" y1="-2" x2="6" y2="-5" stroke="#94a3b8" strokeWidth="1" />
              <line x1="3" y1="2" x2="6" y2="5" stroke="#94a3b8" strokeWidth="1" />
              {/* Lander gold body */}
              <polygon points="-4,-4 4,-4 5,4 -5,4" fill="#d97706" />
              {/* Silver cabin */}
              <circle cx="0" cy="-1" r="3.2" fill="#f1f5f9" />
              {/* Descent engine flame during powered descent */}
              {p < 0.98 && <polygon points="-2,4 0,9 2,4" fill="#38bdf8" opacity="0.8" />}
            </>
          )}
        </g>

        {/* Header Title & Mandatory Honesty Caption */}
        <text x="24" y="26" fill="#38bdf8" fontSize="13" fontWeight="bold">
          Trans-Lunar Trajectory & Descent
        </text>
        <text x="576" y="26" textAnchor="end" fill="#94a3b8" fontSize="10" fontStyle="italic">
          Illustrative, not to scale
        </text>

        {/* Telemetry Status Bar */}
        <rect x="24" y="210" width="552" height="6" rx="3" fill="#1e293b" />
        <rect x="24" y="210" width={552 * p} height="6" rx="3" fill="#38bdf8" />

        <text x="24" y="202" fill="#e2e8f0" fontSize="11" fontWeight="600">
          Phase: <tspan fill="#38bdf8">{phaseText}</tspan>
        </text>
        <text x="576" y="202" textAnchor="end" fill="#94a3b8" fontSize="10" fontFamily="monospace">
          Progress: {(p * 100).toFixed(0)}%
        </text>
      </svg>
    </div>
  )
}
