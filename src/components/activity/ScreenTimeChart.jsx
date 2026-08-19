import { useEffect, useState, useMemo } from 'react';

const STORAGE_KEY = 'qc_screen_time_v1';

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function formatShortDate(d) {
  try {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch { return String(d); }
}

export default function ScreenTimeChart() {
  const [data, setData] = useState(() => read());

  useEffect(() => {
    const reload = () => setData(read());
    window.addEventListener('storage', reload);
    window.addEventListener('qc:screen-time:updated', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('qc:screen-time:updated', reload);
    };
  }, []);

  const total = Object.values(data).reduce((s, v) => s + (v || 0), 0);

  // aggregate stored entries into day buckets (local calendar days)
  const daily = useMemo(() => {
    const map = {};
    Object.entries(data || {}).forEach(([k, v]) => {
      const d = new Date(k);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      map[key] = (map[key] || 0) + Number(v || 0);
    });
    return map;
  }, [data]);

  // last 7 calendar days (including today)
  const last7 = useMemo(() => {
    const arr = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      arr.push(d);
    }
    return arr;
  }, []);

  const valuesSec = useMemo(() => {
    return last7.map(d => {
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const v = daily[key] || 0;
      return Number(v) / 1000; // convert to seconds to match big-count
    });
  }, [daily, last7]);

  const sumSec = valuesSec.reduce((s, x) => s + x, 0);

  const anyData = Object.keys(data || {}).length > 0;

  const maxVal = Math.max(...valuesSec, 1);

  return (
    <div className="screen-time-chart">
      <div className="big-count">{Math.round(total/1000)}s</div>
      <small className="muted">Today</small>

      {anyData ? (
        <svg className="screen-time-graph" viewBox="0 0 100 48" preserveAspectRatio="none" aria-hidden>
          {(() => {
            const w = 100, h = 30, padTop = 4, padBottom = 8;
            const n = valuesSec.length;
            const coords = valuesSec.map((v, i) => {
              const x = (i / (n - 1)) * w;
              const norm = v / (maxVal || 1);
              const y = padTop + (1 - norm) * h;
              return `${x},${y}`;
            }).join(' ');

            // Y ticks: 0, mid, max
            const yTicks = [0, Math.round(maxVal / 2), Math.round(maxVal)];

            return (
              <>
                {/* grid lines */}
                {yTicks.map((t, idx) => {
                  const yy = padTop + (1 - (t / (maxVal || 1))) * h;
                  return <line key={`g${idx}`} x1={0} y1={yy} x2={w} y2={yy} stroke="var(--border-subtle)" strokeWidth={0.2} opacity={0.5} />;
                })}

                <polyline fill="none" stroke="var(--accent, #3b82f6)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" points={coords} />

                {/* Y labels (right side) */}
                {yTicks.map((t, idx) => {
                  const yy = padTop + (1 - (t / (maxVal || 1))) * h;
                  return <text key={`y${idx}`} x={2} y={yy - 1} fontSize={3.2} fill="var(--text-muted)">{t}s</text>;
                })}

                {/* X labels */}
                {last7.map((d, i) => {
                  const x = (i / (n - 1)) * w;
                  const label = d.toLocaleDateString(undefined, { weekday: 'short' });
                  return (
                    <g key={`x${i}`} transform={`translate(${x},${padTop + h + 2})`}>
                      <text x={0} y={6} fontSize={3.2} fill="var(--text-muted)" textAnchor="middle">{label}</text>
                    </g>
                  );
                })}
              </>
            );
          })()}
        </svg>
      ) : (
        <div className="empty-hint">Not enough screen-time data to show a graph.</div>
      )}
    </div>
  );
}
