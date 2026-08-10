/**
 * Chart primitives — plain inline SVG, no charting dependency.
 *
 * Deliberate constraints, applied across every chart here:
 *  - Thin marks, recessive grid, no chart junk. The ink belongs to the data.
 *  - Direct value labels wherever a colour sits below 3:1 on white, so the
 *    swatch never has to carry the meaning on its own.
 *  - Hover tooltips on every plotted form; a bare stat tile is the only
 *    exception because there is nothing to hover.
 *  - One y-axis, always. No dual-scale charts.
 *  - Colours come from the validated --viz-* tokens, assigned in fixed slot
 *    order so a filtered-out series never repaints the survivors.
 */
import React, { useState, useMemo, useRef } from 'react';

const VIZ = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)'];

export const inr = (n: number): string => {
  const v = Number(n) || 0;
  if (Math.abs(v) >= 10000000) return `${(v / 10000000).toFixed(2)} Cr`;
  if (Math.abs(v) >= 100000) return `${(v / 100000).toFixed(2)} L`;
  if (Math.abs(v) >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
};

export const inrFull = (n: number): string =>
  '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

/* ------------------------------------------------------------------ Panel */

export const Panel: React.FC<{
  title: string; hint?: string; right?: React.ReactNode; children: React.ReactNode; span?: number;
}> = ({ title, hint, right, children, span }) => (
  <section className="viz-panel" style={span ? { gridColumn: `span ${span}` } : undefined}>
    <header className="viz-panel-head">
      <div>
        <h3 className="viz-panel-title">{title}</h3>
        {hint && <p className="viz-panel-hint">{hint}</p>}
      </div>
      {right}
    </header>
    {children}
  </section>
);

/* -------------------------------------------------------------- Stat tile */

export const Stat: React.FC<{
  label: string; value: string; sub?: string; tone?: 'neutral' | 'good' | 'critical' | 'warning';
}> = ({ label, value, sub, tone = 'neutral' }) => (
  <div className="viz-stat">
    <span className="viz-stat-label">{label}</span>
    <span className={`viz-stat-value tone-${tone}`}>{value}</span>
    {sub && <span className="viz-stat-sub">{sub}</span>}
  </div>
);

/* ------------------------------------------------------- Trend (area+line) */

export const Trend: React.FC<{
  data: Array<{ date: string; amount: number; count: number }>;
  height?: number;
}> = ({ data, height = 190 }) => {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const W = 760;
  const H = height;
  const padL = 4, padR = 4, padT = 12, padB = 22;

  const { pts, max, area } = useMemo(() => {
    const m = Math.max(1, ...data.map(d => d.amount));
    const innerW = W - padL - padR;
    const innerH = H - padT - padB;
    const step = data.length > 1 ? innerW / (data.length - 1) : 0;
    const p = data.map((d, i) => ({
      x: padL + i * step,
      y: padT + innerH - (d.amount / m) * innerH,
      d
    }));
    const line = p.map(q => `${q.x.toFixed(1)},${q.y.toFixed(1)}`).join(' ');
    return {
      pts: p, max: m,
      area: `${padL},${padT + innerH} ${line} ${padL + (data.length - 1) * step},${padT + innerH}`
    };
  }, [data, H]);

  if (!data.length) return <Empty note="No collections in this window." />;

  const hv = hover !== null ? pts[hover] : null;

  return (
    <div className="viz-trend" ref={wrapRef}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img"
           aria-label={`Daily collections. Peak ${inrFull(max)}.`}
           onMouseLeave={() => setHover(null)}
           onMouseMove={(e) => {
             const box = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
             const rel = ((e.clientX - box.left) / box.width) * W;
             let best = 0, bd = Infinity;
             pts.forEach((q, i) => { const d = Math.abs(q.x - rel); if (d < bd) { bd = d; best = i; } });
             setHover(best);
           }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--viz-1)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--viz-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={padL} x2={W - padR}
                y1={padT + (H - padT - padB) * f} y2={padT + (H - padT - padB) * f}
                stroke="var(--viz-grid)" strokeWidth="1" />
        ))}
        <line x1={padL} x2={W - padR} y1={H - padB} y2={H - padB} stroke="var(--line)" strokeWidth="1" />

        <polygon points={area} fill="url(#trendFill)" />
        <polyline points={pts.map(q => `${q.x},${q.y}`).join(' ')}
                  fill="none" stroke="var(--viz-1)" strokeWidth="2"
                  strokeLinejoin="round" strokeLinecap="round" />

        {hv && (
          <g>
            <line x1={hv.x} x2={hv.x} y1={padT} y2={H - padB} stroke="var(--line-strong)" strokeWidth="1" />
            {/* 2px surface ring keeps the marker legible over the fill */}
            <circle cx={hv.x} cy={hv.y} r="5" fill="var(--viz-1)" stroke="var(--viz-surface)" strokeWidth="2" />
          </g>
        )}

        <text x={padL} y={H - 6} className="viz-axis-text">{data[0]?.date.slice(5)}</text>
        <text x={W - padR} y={H - 6} textAnchor="end" className="viz-axis-text">
          {data[data.length - 1]?.date.slice(5)}
        </text>
        <text x={padL} y={padT - 2} className="viz-axis-text">peak {inr(max)}</text>
      </svg>

      {hv && (
        <div className="viz-tip" style={{ left: `${(hv.x / W) * 100}%` }}>
          <strong>{inrFull(hv.d.amount)}</strong>
          <span>{hv.d.date} · {hv.d.count} receipt{hv.d.count === 1 ? '' : 's'}</span>
        </div>
      )}
    </div>
  );
};

/* --------------------------------------------------------- Horizontal bars */

export const Bars: React.FC<{
  data: Array<{ label: string; value: number; note?: string }>;
  format?: (n: number) => string;
  colorBySlot?: boolean;
}> = ({ data, format = inrFull, colorBySlot = false }) => {
  const max = Math.max(1, ...data.map(d => d.value));
  if (!data.length) return <Empty note="Nothing recorded yet." />;
  return (
    <ul className="viz-bars">
      {data.map((d, i) => (
        <li key={d.label} className="viz-bar-row" title={`${d.label}: ${format(d.value)}`}>
          <span className="viz-bar-label">{d.label}</span>
          <span className="viz-bar-track">
            <span className="viz-bar-fill"
                  style={{
                    width: `${Math.max(d.value > 0 ? 2 : 0, (d.value / max) * 100)}%`,
                    background: colorBySlot ? VIZ[i % VIZ.length] : 'var(--viz-1)'
                  }} />
          </span>
          {/* Direct value label: required relief for the sub-3:1 slots, and
              simply faster to read than a legend lookup. */}
          <span className="viz-bar-value">{format(d.value)}{d.note && <em>{d.note}</em>}</span>
        </li>
      ))}
    </ul>
  );
};

/* ------------------------------------------------------ Composition (100%) */

export const Composition: React.FC<{
  data: Array<{ label: string; value: number }>;
  format?: (n: number) => string;
}> = ({ data, format = (n) => String(n) }) => {
  const total = data.reduce((a, d) => a + d.value, 0);
  if (!total) return <Empty note="Nothing to break down yet." />;
  return (
    <div>
      <div className="viz-comp" role="img" aria-label={data.map(d => `${d.label} ${d.value}`).join(', ')}>
        {data.map((d, i) => d.value > 0 && (
          <span key={d.label} className="viz-comp-seg"
                style={{ width: `${(d.value / total) * 100}%`, background: VIZ[i % VIZ.length] }}
                title={`${d.label}: ${format(d.value)}`} />
        ))}
      </div>
      {/* Legend is always present for two or more series, so identity never
          rests on colour alone. */}
      <ul className="viz-legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="viz-dot" style={{ background: VIZ[i % VIZ.length] }} />
            <span className="viz-legend-label">{d.label}</span>
            <span className="viz-legend-value">{format(d.value)}</span>
            <span className="viz-legend-pct">{total ? Math.round((d.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* --------------------------------------------------------------- Recovery */

export const Recovery: React.FC<{ pct: number; collected: number; billed: number }> = ({ pct, collected, billed }) => (
  <div className="viz-recovery">
    <div className="viz-recovery-head">
      <span className="viz-recovery-pct">{pct}%</span>
      <span className="viz-recovery-of">of {inrFull(billed)} billed</span>
    </div>
    <span className="viz-bar-track tall">
      <span className="viz-bar-fill" style={{ width: `${Math.min(100, Math.max(pct > 0 ? 2 : 0, pct))}%` }} />
    </span>
    <div className="viz-recovery-foot">
      <span><strong>{inrFull(collected)}</strong> collected</span>
      <span>{inrFull(Math.max(0, billed - collected))} outstanding</span>
    </div>
  </div>
);

/* ------------------------------------------------------------------ Empty */

export const Empty: React.FC<{ note: string }> = ({ note }) => (
  <p className="viz-empty">{note}</p>
);

/* ------------------------------------------------------------ Table view */

export const TableView: React.FC<{
  columns: string[]; rows: Array<Array<string | number>>;
}> = ({ columns, rows }) => (
  <div className="viz-table-wrap">
    <table className="viz-table">
      <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);
