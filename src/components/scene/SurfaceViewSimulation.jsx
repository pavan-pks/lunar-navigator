import React, { useState, useEffect, useRef } from 'react';
import Scene3D from './Scene3D.jsx';

/**
 * SurfaceViewSimulation.jsx
 *
 * Restores the beloved high-performance sandbox surface simulation:
 * - 400x400m procedural terrain tailored to the selected landing site
 * - Artemis / Apollo high-fidelity procedural lander grounded flush at pad height
 * - 20-second 360° sweeping lunar day simulation (18°/sec, polar grazing sun, libration)
 * - Orbit Mast View & Astronaut EVA Mode (1.7m eye-level, clamped pitch [-60°, +60°])
 * - Quick-look buttons: Look at Sun, Look at Earth, Look North
 * - Dynamic Metric Shadow Ruler opposite the sun
 * - True-Dark Minimalist HUD with live telemetry and Return to Orbit button
 */
export function SurfaceViewSimulation({
  site = { id: 'shackleton', name: 'Shackleton Crater Rim', terrainType: 'crater-rim' },
  sunEl = 2.0,
  sunAz = 180.0,
  earthEl = 5.0,
  earthAz = 20.0,
  onReturnToOrbit,
  quality = 'auto',
}) {
  const [viewMode, setViewMode] = useState('astronaut');
  const [showShadowRuler, setShowShadowRuler] = useState(true);

  // 20s sweeping lunar day cycle state
  const [isSimulating, setIsSimulating] = useState(true);
  const [simSunEl, setSimSunEl] = useState(Number.isFinite(sunEl) ? sunEl : 2.0);
  const [simSunAz, setSimSunAz] = useState(Number.isFinite(sunAz) ? sunAz : 180.0);
  const [simEarthEl, setSimEarthEl] = useState(Number.isFinite(earthEl) ? earthEl : 5.0);
  const [simEarthAz, setSimEarthAz] = useState(Number.isFinite(earthAz) ? earthAz : 20.0);

  const simRef = useRef({
    lastTime: null,
    azimuth: Number.isFinite(sunAz) ? sunAz : 180.0,
    baseEarthAz: Number.isFinite(earthAz) ? earthAz : 20.0,
  });

  // When not simulating, sync seamlessly with the incoming mission timeline / ephemeris
  useEffect(() => {
    if (!isSimulating) {
      if (Number.isFinite(sunEl)) setSimSunEl(sunEl);
      if (Number.isFinite(sunAz)) setSimSunAz(sunAz);
      if (Number.isFinite(earthEl)) setSimEarthEl(earthEl);
      if (Number.isFinite(earthAz)) setSimEarthAz(earthAz);
    }
  }, [sunEl, sunAz, earthEl, earthAz, isSimulating]);

  // 20-second 360° sweeping lunar day animation loop (18 deg/sec)
  useEffect(() => {
    if (!isSimulating) {
      simRef.current.lastTime = null;
      return;
    }

    let animId;
    const step = (time) => {
      if (!simRef.current.lastTime) {
        simRef.current.lastTime = time;
        simRef.current.azimuth = simSunAz;
        simRef.current.baseEarthAz = simEarthAz;
      }

      const dt = (time - simRef.current.lastTime) / 1000;
      simRef.current.lastTime = time;

      // 360 degrees in ~20 seconds = 18 deg/sec
      const newAz = (simRef.current.azimuth + dt * 18) % 360;
      simRef.current.azimuth = newAz;

      const azRad = (newAz * Math.PI) / 180;
      // Grazing low-elevation polar solar path (dipping between 0.3° and 2.7°)
      const newEl = Number((1.5 + 1.2 * Math.sin(2 * azRad)).toFixed(2));

      // Slowly oscillating Earth libration
      const newEarthAz = Number(((simRef.current.baseEarthAz + Math.sin(azRad) * 3 + 360) % 360).toFixed(1));
      const newEarthEl = Number((5.0 + Math.cos(azRad) * 1.5).toFixed(1));

      setSimSunAz(Number(newAz.toFixed(1)));
      setSimSunEl(newEl);
      setSimEarthAz(newEarthAz);
      setSimEarthEl(newEarthEl);

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating]);

  const activeSunEl = isSimulating ? simSunEl : sunEl;
  const activeSunAz = isSimulating ? simSunAz : sunAz;
  const activeEarthEl = isSimulating ? simEarthEl : earthEl;
  const activeEarthAz = isSimulating ? simEarthAz : earthAz;

  return (
    <div className="w-full h-full relative overflow-hidden bg-black select-none">
      <Scene3D
        siteId={site?.id || 'shackleton'}
        terrainType={site?.terrainType || 'crater-rim'}
        sunEl={activeSunEl}
        sunAz={activeSunAz}
        earthEl={activeEarthEl}
        earthAz={activeEarthAz}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        quality={quality}
        label={`${site?.name || 'Lunar Surface'} — Surface EVA`}
        landerHeight={3.0}
        showHud={true}
        showShadowRuler={showShadowRuler}
        onToggleShadowRuler={() => setShowShadowRuler((prev) => !prev)}
        isSimulating={isSimulating}
        onToggleSimulation={() => setIsSimulating((prev) => !prev)}
        onReturnToOrbit={onReturnToOrbit}
      />
    </div>
  );
}

export default SurfaceViewSimulation;
