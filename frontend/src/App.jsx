import React, { useState, useEffect, useRef } from 'react';

// Helper to format minutes from 16:00 offset into HH:MM
const valToTimeStr = (val) => {
  const totalMins = (960 + val) % 1440;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// Helper to parse HH:MM back into value (0 to 840)
const timeStrToVal = (str) => {
  const [h, m] = str.split(':').map(Number);
  let totalMins = h * 60 + m;
  if (totalMins < 960) {
    totalMins += 1440; // wrap day 2
  }
  return Math.min(840, Math.max(0, totalMins - 960));
};

const PRESETS = [
  { label: '❄️ Winter Solstice', start: '17:30', end: '05:30' },
  { label: '☀️ Summer Solstice', start: '20:00', end: '04:00' },
  { label: '🍁 Autumn Equinox', start: '18:00', end: '06:00' },
  { label: '🌙 Early Sunset Night', start: '16:30', end: '05:00' },
];

function App() {
  const [startVal, setStartVal] = useState(120); // 18:00
  const [endVal, setEndVal] = useState(780);   // 05:00
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sliderRef = useRef(null);
  const activeHandleRef = useRef(null);

  // Fetch calculations from Flask backend
  const fetchCalculations = async (startValLocal, endValLocal) => {
    setLoading(true);
    setError(null);
    const startTime = valToTimeStr(startValLocal);
    const endTime = valToTimeStr(endValLocal);

    try {
      const response = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_time: startTime, end_time: endTime })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to calculate');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalculations(startVal, endVal);
  }, [startVal, endVal]);

  // Handle Dragging
  const handlePointerDown = (handle, e) => {
    e.preventDefault();
    activeHandleRef.current = handle;
    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerMove = (e) => {
    if (!sliderRef.current || !activeHandleRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const percent = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    let rawVal = Math.round(percent * 840);
    rawVal = Math.round(rawVal / 5) * 5; // 5-minute steps

    if (activeHandleRef.current === 'start') {
      if (rawVal < endVal - 30) {
        setStartVal(Math.max(0, rawVal));
      }
    } else if (activeHandleRef.current === 'end') {
      if (rawVal > startVal + 30) {
        setEndVal(Math.min(840, rawVal));
      }
    }
  };

  const handlePointerUp = () => {
    activeHandleRef.current = null;
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerup', handlePointerUp);
  };

  // Direct adjustments via steppers
  const adjustTime = (handle, diffMinutes) => {
    if (handle === 'start') {
      let newVal = startVal + diffMinutes;
      if (newVal >= 0 && newVal < endVal - 30) {
        setStartVal(newVal);
      }
    } else {
      let newVal = endVal + diffMinutes;
      if (newVal <= 840 && newVal > startVal + 30) {
        setEndVal(newVal);
      }
    }
  };

  const getPercent = (val) => (val / 840) * 100;

  return (
    <div style={{ minHeight: '100vh', width: '100%', padding: '2rem 1rem 4rem' }}>
      <div className="stars-bg"></div>

      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #312e81, #4f46e5)', boxShadow: '0 8px 30px rgba(99, 102, 241, 0.3)', marginBottom: '1rem', fontSize: '1.75rem' }}>
            🌙
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.025em', margin: '0 0 0.5rem', background: 'linear-gradient(to right, #ffffff, #c7d2fe, #e0e7ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Al-Layl Night Calculator
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', maxW: '600px', margin: '0 auto', fontWeight: 500 }}>
            Divisions of the night (thirds, halves) and computed windows in a sleek Bento Box dashboard.
          </p>
        </header>

        {/* Bento Grid */}
        <div className="bento-grid">

          {/* Cell 1: Adjusters / Current Config (Col Span 2) */}
          <div className="bento-cell bento-col-2">
            <div>
              <div className="cell-title">
                <span>⏱️ Current Boundaries & Stepper Controls</span>
                <span style={{ fontSize: '0.8rem', color: '#6366f1', background: 'rgba(99, 102, 241, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                  Duration: {results ? results.night_duration_formatted : ''}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '1rem' }}>
                {/* Start controls */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b' }}>Start (Sunset)</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>{valToTimeStr(startVal)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <button className="stepper-btn" onClick={() => adjustTime('start', -60)}>-1h</button>
                    <button className="stepper-btn" onClick={() => adjustTime('start', 60)}>+1h</button>
                    <button className="stepper-btn" onClick={() => adjustTime('start', -5)}>-5m</button>
                    <button className="stepper-btn" onClick={() => adjustTime('start', 5)}>+5m</button>
                  </div>
                </div>

                {/* End controls */}
                <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#38bdf8' }}>End (Dawn)</span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '12px' }}>{valToTimeStr(endVal)}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    <button className="stepper-btn" onClick={() => adjustTime('end', -60)}>-1h</button>
                    <button className="stepper-btn" onClick={() => adjustTime('end', 60)}>+1h</button>
                    <button className="stepper-btn" onClick={() => adjustTime('end', -5)}>-5m</button>
                    <button className="stepper-btn" onClick={() => adjustTime('end', 5)}>+5m</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cell 2: Presets (Col Span 1) */}
          <div className="bento-cell bento-col-1">
            <div>
              <div className="cell-title">🚀 Quick Presets</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem' }}>
                {PRESETS.map((preset, idx) => {
                  const pStart = timeStrToVal(preset.start);
                  const pEnd = timeStrToVal(preset.end);
                  const isActive = startVal === pStart && endVal === pEnd;
                  return (
                    <button
                      key={idx}
                      className={`preset-pill ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        setStartVal(pStart);
                        setEndVal(pEnd);
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{preset.label}</div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>{preset.start} - {preset.end}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Cell 3: Interactive Slider (Col Span 3) */}
          <div className="bento-cell bento-col-3">
            <div>
              <div className="cell-title">🎚️ Drag to Adjust Night Range</div>

              <div className="timeline-slider-container" ref={sliderRef} style={{ marginTop: '1.5rem' }}>
                <div className="timeline-track"></div>
                <div className="timeline-highlight" style={{
                  left: `${getPercent(startVal)}%`,
                  width: `${getPercent(endVal) - getPercent(startVal)}%`
                }}></div>

                <div
                  className="slider-handle slider-handle-start"
                  style={{ left: `${getPercent(startVal)}%` }}
                  onPointerDown={(e) => handlePointerDown('start', e)}
                >
                  <div className="handle-tooltip">Start: {valToTimeStr(startVal)}</div>
                </div>

                <div
                  className="slider-handle slider-handle-end"
                  style={{ left: `${getPercent(endVal)}%` }}
                  onPointerDown={(e) => handlePointerDown('end', e)}
                >
                  <div className="handle-tooltip">End: {valToTimeStr(endVal)}</div>
                </div>
              </div>

              <div className="timeline-labels">
                <span>16:00</span>
                <span>18:30</span>
                <span>21:00</span>
                <span>23:30</span>
                <span>02:00</span>
                <span>04:30</span>
                <span>06:00</span>
              </div>
            </div>
          </div>

          {/* Cell 4: Visualizer (Col Span 3) */}
          {results && (
            <div className="bento-cell bento-col-3">
              <div>
                <div className="cell-title">📊 Live Divisions Visualizer</div>

                <div style={{ position: 'relative', width: '100%', height: '140px', background: 'rgba(2, 3, 10, 0.45)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)', overflow: 'hidden', marginTop: '0.75rem' }}>
                  {/* Shaded partitions */}
                  {(() => {
                    const startPct = getPercent(startVal);
                    const endPct = getPercent(endVal);
                    const secThirdVal = timeStrToVal(results.second_third_start);
                    const midpointVal = timeStrToVal(results.midpoint_start);
                    const thirdThirdVal = timeStrToVal(results.third_third_start);

                    const secThirdPct = getPercent(secThirdVal);
                    const midpointPct = getPercent(midpointVal);
                    const thirdThirdPct = getPercent(thirdThirdVal);
                    const midnightPct = getPercent(480);

                    return (
                      <>
                        {/* 1st Third */}
                        <div style={{
                          position: 'absolute',
                          left: `${startPct}%`,
                          width: `${secThirdPct - startPct}%`,
                          height: '100%',
                          background: 'linear-gradient(to bottom, rgba(49, 46, 129, 0.12), rgba(7, 6, 20, 0.4))',
                          borderRight: '1px dashed rgba(255,255,255,0.06)'
                        }} />

                        {/* 2nd Third */}
                        <div style={{
                          position: 'absolute',
                          left: `${secThirdPct}%`,
                          width: `${thirdThirdPct - secThirdPct}%`,
                          height: '100%',
                          background: 'linear-gradient(to bottom, rgba(67, 56, 202, 0.15), rgba(7, 6, 20, 0.4))',
                          borderRight: '1px dashed rgba(255,255,255,0.06)'
                        }} />

                        {/* 3rd Third */}
                        <div style={{
                          position: 'absolute',
                          left: `${thirdThirdPct}%`,
                          width: `${endPct - thirdThirdPct}%`,
                          height: '100%',
                          background: 'linear-gradient(to bottom, rgba(99, 102, 241, 0.12), rgba(7, 6, 20, 0.4))'
                        }} />

                        {/* Highlight Target Range */}
                        {results.to_calendar_midnight.exists && (
                          <div style={{
                            position: 'absolute',
                            left: `${secThirdPct}%`,
                            width: `${midnightPct - secThirdPct}%`,
                            height: '34px',
                            bottom: '12px',
                            background: 'linear-gradient(to right, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.03))',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: '#fbbf24',
                            boxShadow: '0 0 15px rgba(245, 158, 11, 0.08)',
                            zIndex: 3
                          }}>
                            ✨ Target Window: {results.to_calendar_midnight.duration_formatted}
                          </div>
                        )}

                        {/* Ticks & Text */}
                        <div style={{ position: 'absolute', top: '12px', left: `${startPct}%`, transform: 'translateX(-50%)', textAlign: 'center', zIndex: 5 }}>
                          <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: 600 }}>Sunset</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{results.start_time}</div>
                        </div>

                        <div style={{ position: 'absolute', top: '24px', left: `${secThirdPct}%`, transform: 'translateX(-50%)', textAlign: 'center', zIndex: 5 }}>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>2nd Third</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(7, 6, 20, 0.8)', padding: '2px 5px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>{results.second_third_start}</div>
                        </div>

                        <div style={{ position: 'absolute', top: '48px', left: `${midpointPct}%`, transform: 'translateX(-50%)', textAlign: 'center', zIndex: 4 }}>
                          <div style={{ borderLeft: '1.5px dotted #2dd4bf', height: '92px', position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: '0px', opacity: 0.6 }} />
                          <div style={{ fontSize: '0.65rem', color: '#2dd4bf', fontWeight: 600, background: 'rgba(7, 6, 20, 0.8)', padding: '2px 5px', borderRadius: '4px', border: '1px solid rgba(45, 212, 191, 0.2)' }}>🌙 Midpoint: {results.midpoint_start}</div>
                        </div>

                        <div style={{ position: 'absolute', bottom: '52px', left: `${midnightPct}%`, transform: 'translateX(-50%)', textAlign: 'center', zIndex: 4 }}>
                          <div style={{ borderLeft: '1.5px dashed #f43f5e', height: '88px', position: 'absolute', left: '50%', transform: 'translateX(-50%)', bottom: '0px', opacity: 0.5 }} />
                          <div style={{ fontSize: '0.65rem', color: '#f43f5e', fontWeight: 600, background: 'rgba(7, 6, 20, 0.8)', padding: '2px 5px', borderRadius: '4px', border: '1px solid rgba(244, 63, 94, 0.2)' }}>⏰ Midnight</div>
                        </div>

                        <div style={{ position: 'absolute', top: '24px', left: `${thirdThirdPct}%`, transform: 'translateX(-50%)', textAlign: 'center', zIndex: 5 }}>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 500 }}>3rd Third</div>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, background: 'rgba(7, 6, 20, 0.8)', padding: '2px 5px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>{results.third_third_start}</div>
                        </div>

                        <div style={{ position: 'absolute', top: '12px', left: `${endPct}%`, transform: 'translateX(-50%)', textAlign: 'center', zIndex: 5 }}>
                          <div style={{ fontSize: '0.7rem', color: '#38bdf8', fontWeight: 600 }}>Dawn</div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{results.end_time}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Cell 5: Result - 2nd Third Start (Col Span 1) */}
          {results && (
            <div className="bento-cell bento-col-1">
              <div>
                <div className="cell-title">
                  <span>✨ 2nd Third Starts</span>
                  <span className="info-icon" title="Marks the end of the first third of the night. Important division in prayer schedules.">?</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0' }} className="glow-text-indigo">
                  {results.second_third_start}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  Starts exactly {Math.round(results.night_duration_minutes / 3)} mins after sunset.
                </p>
              </div>
            </div>
          )}

          {/* Cell 6: Result - Islamic Midnight (Col Span 1) */}
          {results && (
            <div className="bento-cell bento-col-1">
              <div>
                <div className="cell-title">
                  <span>🌙 Midnight (Midpoint)</span>
                  <span className="info-icon" title="The exact middle point of the night (Nisf al-Layl). Begins the second half of the night.">?</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0' }} className="glow-text-teal">
                  {results.midpoint_start}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                  Starts exactly {Math.round(results.night_duration_minutes / 2)} mins after sunset.
                </p>
              </div>
            </div>
          )}

          {/* Cell 7: Result - To Calendar Midnight (Col Span 1) */}
          {results && (
            <div className="bento-cell bento-col-1">
              <div>
                <div className="cell-title">
                  <span>⏰ To Calendar Midnight</span>
                  <span className="info-icon" title="Calculated time duration from the start of the 2nd third of the night to 00:00.">?</span>
                </div>
                {results.to_calendar_midnight.exists ? (
                  <>
                    <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0' }} className="glow-text-gold">
                      {results.to_calendar_midnight.duration_formatted}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#fbbf24', opacity: 0.8, margin: 0 }}>
                      Interval: {results.to_calendar_midnight.start} → {results.to_calendar_midnight.end}
                    </p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', fontWeight: 700, margin: '0.75rem 0', color: '#64748b' }}>
                      N/A
                    </div>
                    <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                      2nd third starts after midnight.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Cell 8: Result - To Islamic Midnight (Col Span 1) */}
          {results && (
            <div className="bento-cell bento-col-1">
              <div>
                <div className="cell-title">
                  <span>🛡️ To Islamic Midnight</span>
                  <span className="info-icon" title="Calculated time duration from the start of the 2nd third of the night to the Islamic midpoint. Always equal to 1/6th of total night duration.">?</span>
                </div>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.5rem 0', color: '#2dd4bf' }} className="glow-text-teal">
                  {results.to_islamic_midnight.duration_formatted}
                </div>
                <p style={{ fontSize: '0.75rem', color: '#2dd4bf', opacity: 0.8, margin: 0 }}>
                  Interval: {results.to_islamic_midnight.start} → {results.to_islamic_midnight.end}
                </p>
              </div>
            </div>
          )}

          {/* Cell 9: Description / Educational Box (Col Span 2) */}
          <div className="bento-cell bento-col-2">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '1.25rem', marginTop: '-2px' }}>💡</span>
              <div style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.6 }}>
                <strong style={{ color: '#e2e8f0' }}>Bento Dashboard Guide:</strong> The layout displays divisions computed live by our Flask service.
                <br />
                In Islamic calculations, <em>Nisf al-Layl (Islamic Midnight)</em> is the midpoint between Maghrib (Sunset) and Fajr (Dawn).
                The duration between the start of the second third and the midpoint is always mathematically equal to exactly <strong>1/6th of the total night duration</strong> (represented in the teal card).
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;
