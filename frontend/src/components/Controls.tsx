import { useState } from 'react';
import type { ClientCommand, PlacementMode } from '../types';

interface Props {
  tps: number;
  algorithm: string;
  showHeatmap: boolean;
  paused: boolean;
  robotCount: number;
  placementMode: PlacementMode;
  onSend: (cmd: ClientCommand) => void;
  onToggleHeatmap: () => void;
  onPlacementMode: (mode: PlacementMode) => void;
}

const MODES: { mode: PlacementMode; label: string; title: string }[] = [
  { mode: 'obstacle', label: '🚧 Obstacle', title: 'Click cells to add/remove shelves' },
  { mode: 'pickup',   label: '🟢 Pickup',   title: 'Click cells to place a pickup station' },
  { mode: 'dropoff',  label: '🔴 Dropoff',  title: 'Click cells to place a dropoff bay' },
  { mode: 'erase',    label: '🧹 Erase',    title: 'Click cells to clear them' },
];

export default function Controls({
  tps, algorithm, showHeatmap, paused, robotCount, placementMode,
  onSend, onToggleHeatmap, onPlacementMode,
}: Props) {
  const [stressFlash, setStressFlash] = useState(false);

  function handleStressTest() {
    onSend({ type: 'stress_test' });
    setStressFlash(true);
    setTimeout(() => setStressFlash(false), 1500);
  }

  return (
    <div style={s.bar}>
      {/* Speed */}
      <label style={s.label}>
        Speed&nbsp;<strong style={{ color: 'var(--accent)' }}>{tps} TPS</strong>
        <input type="range" min={1} max={20} value={tps} style={s.slider}
          onChange={e => onSend({ type: 'set_speed', tps: Number(e.target.value) })} />
      </label>

      {/* Algorithm */}
      <label style={s.label}>
        Algorithm
        <select value={algorithm} style={s.select}
          onChange={e => onSend({ type: 'set_algorithm', algorithm: e.target.value as 'astar' | 'prioritized' | 'cbs' })}>
          <option value="prioritized">Prioritized</option>
          <option value="whca">WHCA* (Cooperative)</option>
          <option value="cbs">CBS (Optimal)</option>
          <option value="astar">A* (independent)</option>
        </select>
      </label>

      <Sep />

      {/* Placement mode */}
      {MODES.map(({ mode, label, title }) => (
        <button
          key={mode}
          title={title}
          onClick={() => onPlacementMode(mode)}
          style={{
            ...s.modeBtn,
            background:  placementMode === mode ? 'var(--surface-2)' : 'transparent',
            borderColor: placementMode === mode ? 'var(--accent)'    : 'var(--border)',
            color:       placementMode === mode ? 'var(--accent)'    : 'var(--text-muted)',
          }}
        >
          {label}
        </button>
      ))}

      <Sep />

      {/* Pause / Step */}
      <button
        onClick={() => onSend({ type: 'set_paused', paused: !paused })}
        style={{ ...s.btn, background: paused ? 'var(--orange)' : 'var(--surface-2)', color: paused ? '#08080f' : 'var(--text)', minWidth: 72, borderColor: paused ? 'var(--orange)' : 'var(--border)' }}
      >
        {paused ? '▶ Resume' : '⏸ Pause'}
      </button>
      <Btn label="Step" onClick={() => onSend({ type: 'step_tick' })} color={paused ? 'var(--blue)' : 'var(--surface-2)'} textColor={paused ? '#08080f' : 'var(--text-muted)'} />

      <Sep />

      {/* Robot count */}
      <div style={s.robotGroup}>
        <button style={s.iconBtn} onClick={() => onSend({ type: 'remove_robot' })} title="Remove idle robot">−</button>
        <span style={s.robotCount}>{robotCount} 🤖</span>
        <button style={s.iconBtn} onClick={() => onSend({ type: 'add_robots', count: 1 })} title="Add robot">+</button>
      </div>

      <button
        onClick={handleStressTest}
        style={{
          ...s.btn,
          background: stressFlash ? 'var(--green)' : 'transparent',
          color: stressFlash ? '#08080f' : 'var(--red)',
          borderColor: stressFlash ? 'var(--green)' : 'var(--red)',
          transition: 'all 0.3s',
        }}
      >
        {stressFlash ? 'Launched!' : 'Stress Test'}
      </button>

      <Btn
        label={showHeatmap ? 'Heat ON' : 'Heatmap'}
        onClick={onToggleHeatmap}
        color={showHeatmap ? 'var(--purple)' : 'var(--surface-2)'}
        textColor={showHeatmap ? '#08080f' : 'var(--text-muted)'}
      />

      <Sep />

      <Btn label="Reset" onClick={() => onSend({ type: 'reset_simulation' })} color="var(--surface-2)" />
      <Btn label="Benchmark" onClick={() => onSend({ type: 'run_benchmark', ticks: 150 })} color="var(--surface-2)" />
    </div>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 20, background: 'var(--border)', flexShrink: 0 }} />;
}

function Btn({ label, onClick, color = 'var(--surface-2)', textColor }: {
  label: string; onClick: () => void; color?: string; textColor?: string;
}) {
  return (
    <button onClick={onClick} style={{ ...s.btn, background: color, color: textColor ?? 'var(--text)' }}>{label}</button>
  );
}

const s = {
  bar: {
    height: 44,
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 16px',
    fontFamily: 'var(--sans)',
    fontSize: 12,
    color: 'var(--text-muted)',
    flexShrink: 0,
    overflowX: 'auto' as const,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    fontFamily: 'var(--sans)',
  },
  slider: {
    accentColor: 'var(--accent)',
    cursor: 'pointer',
    width: 80,
  },
  select: {
    background: 'var(--bg)',
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    padding: '3px 6px',
    fontFamily: 'var(--sans)',
    fontSize: 12,
    cursor: 'pointer',
  },
  modeBtn: {
    border: '1px solid',
    borderRadius: 2,
    padding: '3px 9px',
    fontFamily: 'var(--sans)',
    fontSize: 12,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.12s',
  },
  btn: {
    color: 'var(--text)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    padding: '4px 10px',
    fontFamily: 'var(--sans)',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
    flexShrink: 0,
  },
  robotGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: {
    width: 22,
    height: 22,
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 2,
    color: 'var(--text)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    fontFamily: 'var(--sans)',
  },
  robotCount: {
    fontSize: 12,
    color: 'var(--text)',
    minWidth: 36,
    textAlign: 'center' as const,
    fontFamily: 'var(--mono)',
  },
} as const;
