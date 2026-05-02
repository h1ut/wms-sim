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
  const [revenuePerOrder, setRevenuePerOrder] = useState(200);
  const [collisionCost,   setCollisionCost]   = useState(500);
  const [latePenalty,     setLatePenalty]     = useState(80);
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
        background:   connected ? '#20bf6b10' : '#e8454510',
        borderColor:  connected ? 'var(--green)' : 'var(--red)',
      }}>
        <span style={{ color: connected ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>
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
      <Stat label="Algorithm"  value={
        metrics.algorithm === 'prioritized' ? 'Prioritized' :
        metrics.algorithm === 'cbs'         ? 'CBS'         :
        metrics.algorithm === 'whca'        ? 'WHCA*'       : 'A* Indep.'
      } accent />
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
        <span style={s.roiInputLabel}>$/delivery</span>
        <input type="number" value={revenuePerOrder} min={0} step={50}
          onChange={e => setRevenuePerOrder(Number(e.target.value))}
          style={s.roiInput} />
      </div>
      <div style={s.roiInputRow}>
        <span style={s.roiInputLabel}>$/collision</span>
        <input type="number" value={collisionCost} min={0} step={100}
          onChange={e => setCollisionCost(Number(e.target.value))}
          style={s.roiInput} />
      </div>
      <div style={s.roiInputRow}>
        <span style={s.roiInputLabel}>$/SLA miss</span>
        <input type="number" value={latePenalty} min={0} step={20}
          onChange={e => setLatePenalty(Number(e.target.value))}
          style={s.roiInput} />
      </div>
      {(() => {
        const revenue   = metrics.throughput * revenuePerOrder;
        const colCost   = metrics.collisions * collisionCost;
        const lateCost  = lateCount * latePenalty;
        const net       = revenue - colCost - lateCost;
        return <>
          <Stat label="Revenue"    value={`+$${revenue.toLocaleString()}`} accent />
          <Stat label="Collisions" value={colCost > 0 ? `-$${colCost.toLocaleString()}` : '$0'} warn={colCost > 0} />
          <Stat label="SLA misses" value={lateCost > 0 ? `-$${lateCost.toLocaleString()}` : '$0'} warn={lateCost > 0} />
          <Stat label="Net P&L"   value={`${net >= 0 ? '+' : ''}$${net.toLocaleString()}`}
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
        color: warn ? 'var(--red)' : accent ? 'var(--green)' : 'var(--text)',
      }}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div style={{ borderTop: '1px solid var(--border)', margin: '7px 0' }} />;
}

function LegendRow({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
      <div style={{ width: 8, height: 8, borderRadius: 0, background: color, flexShrink: 0 }} />
      <span style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: '0.03em' }}>{label}</span>
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
    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
      <div style={bt.hdr}>
        <span />
        <span style={{ color: 'var(--blue)' }}>Prioritized</span>
        <span style={{ color: 'var(--orange)' }}>A* Indep.</span>
      </div>
      <BRow label="Orders" pVal={p.throughput} aVal={a.throughput} higherBetter />
      <BRow label="Collisions" pVal={p.collisions} aVal={a.collisions} higherBetter={false} />
      <BRow label="Avg path" pVal={p.avg_path_length} aVal={a.avg_path_length} higherBetter={false} decimals />
      <div style={{ color: pWins ? 'var(--green)' : 'var(--red)', fontWeight: 700, marginTop: 6, fontSize: 10, letterSpacing: '0.04em' }}>
        {pWins ? '✓ PRIORITIZED WINS' : '✗ A* WINS'}
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
      <span style={{ color: 'var(--text-dim)' }}>{label}</span>
      <span style={{ color: pBetter ? 'var(--green)' : 'var(--text)', fontWeight: pBetter ? 700 : 400 }}>{fmt(pVal)}</span>
      <span style={{ color: !pBetter ? 'var(--green)' : 'var(--text)', fontWeight: !pBetter ? 700 : 400 }}>{fmt(aVal)}</span>
    </div>
  );
}

const bt = {
  hdr: {
    display: 'grid',
    gridTemplateColumns: '60px 1fr 1fr',
    gap: 4,
    marginBottom: 4,
    fontSize: 10,
    letterSpacing: '0.03em',
  },
} as const;

const s = {
  panel: {
    width: '100%',
    background: 'var(--surface)',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 3,
    overflowY: 'auto' as const,
    fontFamily: 'var(--sans)',
    fontSize: 11,
    color: 'var(--text-muted)',
    flexShrink: 0,
  },
  badge: {
    border: '1px solid',
    borderRadius: 0,
    padding: '4px 8px',
    textAlign: 'center' as const,
    marginBottom: 8,
    fontSize: 10,
    letterSpacing: '0.08em',
  },
  scoreBox: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: 'var(--bg)',
    borderRadius: 0,
    padding: '10px 12px',
    marginBottom: 4,
    border: '1px solid var(--border)',
  },
  gradeLetter: {
    fontSize: 34,
    fontWeight: 900,
    lineHeight: 1,
    fontFamily: 'var(--display)',
  },
  scoreRight: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 2,
  },
  scoreNum: {
    fontSize: 18,
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
    fontFamily: 'var(--mono)',
  },
  scoreLabel: {
    fontSize: 9,
    color: 'var(--text-dim)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    fontFamily: 'var(--sans)',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    color: 'var(--text-dim)',
    fontSize: 11,
    fontFamily: 'var(--sans)',
  },
  rowValue: {
    fontWeight: 600,
    fontSize: 11,
    fontFamily: 'var(--mono)',
  },
  sectionLabel: {
    fontSize: 9,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: 'var(--text-dim)',
    marginTop: 2,
    paddingTop: 2,
    fontFamily: 'var(--sans)',
  },
  roiInputRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  roiInputLabel: {
    color: 'var(--text-dim)',
    fontSize: 11,
    fontFamily: 'var(--sans)',
  },
  roiInput: {
    width: 68,
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
    borderRadius: 0,
    padding: '2px 6px',
    fontFamily: 'var(--mono)',
    fontSize: 11,
  },
} as const;
