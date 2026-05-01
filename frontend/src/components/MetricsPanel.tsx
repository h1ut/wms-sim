import { useState } from 'react';
import type { BenchmarkResultMessage, Metrics, Order, Robot } from '../types';

interface Props {
  tick: number;
  metrics: Metrics;
  robots: Robot[];
  orders: Order[];
  connected: boolean;
  score: number;
  onTimeCount: number;
  lateCount: number;
  slaLimit: number;
  throughputHistory: number[];
  benchmarkResult: BenchmarkResultMessage | null;
}

function grade(score: number): { letter: string; color: string } {
  if (score >= 800) return { letter: 'S', color: '#f7b731' };
  if (score >= 400) return { letter: 'A', color: '#20bf6b' };
  if (score >= 150) return { letter: 'B', color: '#45aaf2' };
  if (score >= 40)  return { letter: 'C', color: '#fd9644' };
  return              { letter: 'D', color: '#e84545' };
}

export default function MetricsPanel({
  tick, metrics, robots, orders, connected,
  score, onTimeCount, lateCount, slaLimit,
  throughputHistory, benchmarkResult,
}: Props) {
  const [collisionCost, setCollisionCost] = useState(500);
  const [lateCost,      setLateCost]      = useState(200);
  const pending    = orders.filter(o => o.status === 'pending').length;
  const assigned   = orders.filter(o => o.status === 'assigned').length;
  const inProgress = orders.filter(o => o.status === 'in_progress').length;
  const total      = onTimeCount + lateCount;
  const onTimePct  = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;
  const g          = grade(score);

  return (
    <div style={s.panel}>
      {/* Connection badge */}
      <div style={{
        ...s.badge,
        background:   connected ? '#20bf6b18' : '#e8454518',
        borderColor:  connected ? '#20bf6b'   : '#e84545',
      }}>
        <span style={{ color: connected ? '#20bf6b' : '#e84545', fontWeight: 700 }}>
          {connected ? '● LIVE' : '○ DISCONNECTED'}
        </span>
      </div>

      {/* Score */}
      <div style={s.scoreBox}>
        <span style={{ ...s.gradeLetter, color: g.color }}>{g.letter}</span>
        <div style={s.scoreRight}>
          <span style={s.scoreNum}>{score.toLocaleString()}</span>
          <span style={s.scoreLabel}>efficiency score</span>
        </div>
      </div>

      <Divider />

      <Stat label="Tick"       value={tick.toLocaleString()} />
      <Stat label="Algorithm"  value={metrics.algorithm === 'prioritized' ? 'Prioritized' : metrics.algorithm === 'cbs' ? 'CBS' : 'A* Indep.'} accent />
      <Stat label="Speed"      value={`${metrics.tps} TPS`} />

      <Divider />

      <Stat label="Throughput"   value={`${metrics.throughput}`} />
      <Stat label="Active robots" value={`${metrics.active_robots} / ${robots.length}`} />
      <Stat label="Avg path len" value={metrics.avg_path_length.toFixed(1)} />
      <Stat label="Collisions"   value={String(metrics.collisions)}
            warn={metrics.collisions > 0} />

      <Divider />

      <div style={s.sectionLabel}>SLA ({slaLimit} ticks)</div>
      <Stat label="On-time rate"  value={`${onTimePct}%`}
            accent={onTimePct >= 80} warn={onTimePct < 60} />
      <Stat label="On time"       value={String(onTimeCount)} />
      <Stat label="Late"          value={String(lateCount)}
            warn={lateCount > 0} />

      <Divider />

      <div style={s.sectionLabel}>Orders</div>
      <Stat label="Pending"     value={String(pending)} />
      <Stat label="Assigned"    value={String(assigned)} />
      <Stat label="In progress" value={String(inProgress)} />

      <Divider />

      <div style={s.sectionLabel}>Legend</div>
      <LegendRow color="#0f9b8e" label="Pickup cell (★)" />
      <LegendRow color="#e84545" label="Dropoff cell (◆)" />
      <LegendRow color="#f7b731" label="Moving / Cargo" />
      <LegendRow color="#20bf6b" label="Picking up" />
      <LegendRow color="#a55eea" label="Dropping off" />
      <LegendRow color="#778ca3" label="Idle" />

      <Divider />

      <div style={s.sectionLabel}>Throughput / tick</div>
      <Sparkline data={throughputHistory} />

      <Divider />

      <div style={s.sectionLabel}>ROI estimate</div>
      <div style={s.roiInputRow}>
        <span style={s.roiInputLabel}>$/collision</span>
        <input type="number" value={collisionCost} min={0} step={100}
          onChange={e => setCollisionCost(Number(e.target.value))}
          style={s.roiInput} />
      </div>
      <div style={s.roiInputRow}>
        <span style={s.roiInputLabel}>$/late order</span>
        <input type="number" value={lateCost} min={0} step={50}
          onChange={e => setLateCost(Number(e.target.value))}
          style={s.roiInput} />
      </div>
      {(() => {
        const losses  = metrics.collisions * collisionCost + lateCount * lateCost;
        const revenue = onTimeCount * 50;
        const net     = revenue - losses;
        return <>
          <Stat label="Losses"  value={`-$${losses.toLocaleString()}`}  warn={losses > 0} />
          <Stat label="Revenue" value={`+$${revenue.toLocaleString()}`} accent />
          <Stat label="Net P&L" value={`$${net.toLocaleString()}`}
                accent={net >= 0} warn={net < 0} />
        </>;
      })()}

      {benchmarkResult && <>
        <Divider />
        <div style={s.sectionLabel}>Benchmark · {benchmarkResult.ticks} ticks</div>
        <BenchmarkTable result={benchmarkResult} />
      </>}
    </div>
  );
}

function Stat({ label, value, accent, warn }: {
  label: string; value: string; accent?: boolean; warn?: boolean;
}) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={{
        ...s.rowValue,
        color: warn ? '#e84545' : accent ? '#20bf6b' : '#e0e0f0',
      }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid #1e1e3a', margin: '7px 0' }} />;
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span style={{ color: '#606090', fontSize: 10 }}>{label}</span>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div style={{ height: 30 }} />;
  const max = Math.max(...data, 1);
  const W = 172, H = 30;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * (H - 2) - 1}`)
    .join(' ');
  return (
    <svg width={W} height={H} style={{ display: 'block', marginBottom: 4 }}>
      <polyline points={pts} fill="none" stroke="#f7b731" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}

function BenchmarkTable({ result }: { result: BenchmarkResultMessage }) {
  const { prioritized: p, astar: a } = result;
  const pWins = p.throughput >= a.throughput && p.collisions <= a.collisions;
  return (
    <div style={{ fontSize: 10, color: '#a0a0c0' }}>
      <div style={bt.hdr}>
        <span />
        <span style={{ color: '#45aaf2' }}>Prioritized</span>
        <span style={{ color: '#fd9644' }}>A* Indep.</span>
      </div>
      <BRow label="Orders" pVal={p.throughput} aVal={a.throughput} higherBetter />
      <BRow label="Collisions" pVal={p.collisions} aVal={a.collisions} higherBetter={false} />
      <BRow label="Avg path" pVal={p.avg_path_length} aVal={a.avg_path_length} higherBetter={false} decimals />
      <div style={{ color: pWins ? '#20bf6b' : '#e84545', fontWeight: 700, marginTop: 4, fontSize: 10 }}>
        {pWins ? '✓ Prioritized wins' : '✗ A* wins (fewer ticks?)'}
      </div>
    </div>
  );
}

function BRow({ label, pVal, aVal, higherBetter, decimals }: {
  label: string; pVal: number; aVal: number; higherBetter: boolean; decimals?: boolean;
}) {
  const fmt = (v: number) => decimals ? v.toFixed(1) : String(v);
  const pBetter = higherBetter ? pVal >= aVal : pVal <= aVal;
  return (
    <div style={bt.hdr}>
      <span style={{ color: '#50508a' }}>{label}</span>
      <span style={{ color: pBetter ? '#20bf6b' : '#e0e0f0', fontWeight: pBetter ? 700 : 400 }}>{fmt(pVal)}</span>
      <span style={{ color: !pBetter ? '#20bf6b' : '#e0e0f0', fontWeight: !pBetter ? 700 : 400 }}>{fmt(aVal)}</span>
    </div>
  );
}

const bt = {
  hdr: {
    display: 'grid',
    gridTemplateColumns: '56px 1fr 1fr',
    gap: 4,
    marginBottom: 3,
    fontSize: 10,
  },
} as const;

const s = {
  panel: {
    width: '100%',
    background: '#13132a',
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 3,
    overflowY: 'auto' as const,
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#a0a0c0',
    flexShrink: 0,
  },
  badge: {
    border: '1px solid',
    borderRadius: 4,
    padding: '3px 6px',
    textAlign: 'center' as const,
    marginBottom: 6,
    fontSize: 10,
  },
  scoreBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    background: '#0f0f22',
    borderRadius: 6,
    padding: '8px 10px',
    marginBottom: 2,
    border: '1px solid #1e1e3a',
  },
  gradeLetter: {
    fontSize: 32,
    fontWeight: 900,
    lineHeight: 1,
  },
  scoreRight: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  scoreNum: {
    fontSize: 18,
    fontWeight: 700,
    color: '#e0e0f0',
  },
  scoreLabel: {
    fontSize: 9,
    color: '#5050a0',
    letterSpacing: '0.06em',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    color: '#50508a',
    fontSize: 10,
  },
  rowValue: {
    fontWeight: 700,
    fontSize: 11,
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#404070',
    marginTop: 1,
  },
  roiInputRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  roiInputLabel: {
    color: '#50508a',
    fontSize: 10,
  },
  roiInput: {
    width: 64,
    background: '#0f0f22',
    border: '1px solid #252545',
    color: '#e0e0f0',
    borderRadius: 3,
    padding: '1px 4px',
    fontFamily: 'monospace',
    fontSize: 10,
  },
} as const;
