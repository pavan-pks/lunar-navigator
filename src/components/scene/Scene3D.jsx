// STUB: Pavan replaces this with the real 3D scene (task P-02 onward).
// The props are the contract: see docs/INTEGRATION_README.md section 5.4.
export default function Scene3D(props) {
  const f = (v) => (typeof v === 'number' ? v.toFixed(1) : '–')
  return (
    <div style={{ height: 320, border: '1px dashed #888', padding: 8, fontSize: 13 }}>
      <b>Scene3D stub</b> ({props.label ?? props.siteId})<br />
      Sun el {f(props.sunEl)}° az {f(props.sunAz)}° · Earth el {f(props.earthEl)}° az {f(props.earthAz)}°
    </div>
  )
}
