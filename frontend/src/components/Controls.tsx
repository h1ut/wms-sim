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
        Speed&nbsp;<strong style={{ color: '#f7b731' }}>{tps} TPS</strong>
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
            background:  placementMode === mode ? '#2d3561' : 'transparent',
            borderColor: placementMode === mode ? '#f7b731'  : '#252545',
            color:       placementMode === mode ? '#f7b731'  : '#7070a0',
          }}
        >
          {label}
        </button>
      ))}

      <Sep />

      {/* Pause / Step */}
      <button
        onClick={() => onSend({ type: 'set_paused', paused: !paused })}
        style={{ ...s.btn, background: paused ? '#fd9644' : '#2d3561', minWidth: 72 }}
      >
        {paused ? '▶ Resume' : '⏸ Pause'}
      </button>
      <Btn label="⏭ Step" onClick={() => onSend({ type: 'step_tick' })} color={paused ? '#45aaf2' : '#1e2a40'} />

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
          background: stressFlash ? '#20bf6b' : '#e84545',
          transition: 'background 0.3s',
        }}
      >
        {stressFlash ? '✓ Launched!' : '🚨 Stress Test'}
      </button>

      <Btn
        label={showHeatmap ? '🌡 Heat ON' : '🌡 Heatmap'}
        onClick={onToggleHeatmap}
        color={showHeatmap ? '#a55eea' : '#2d3561'}
      />

      <Sep />

      <Btn label="🔄 Reset" onClick={() => onSend({ type: 'reset_simulation' })} color="#3a1a1a" />
      <Btn label="⚡ Benchmark" onClick={() => onSend({ type: 'run_benchmark', ticks: 150 })} color="#1a4060" />
    </div>
  );
}

function Sep() {
  return <div style={{ width: 1, height: 24, background: '#252545', flexShrink: 0 }} />;
}

function Btn({ label, onClick, color = '#2d3561' }: {
  label: string; onClick: () => void; color?: string;
}) {
  return (
    <button onClick={onClick} style={{ ...s.btn, background: color }}>{label}</button>
  );
}

const s = {
  bar: {
    height: 44,
    background: '#13132a',
    borderTop: '1px solid #252545',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 12px',
    fontFamily: 'monospace',
    fontSize: 11,
    color: '#a0a0c0',
    flexShrink: 0,
    overflowX: 'auto' as const,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  slider: {
    accentColor: '#f7b731',
    cursor: 'pointer',
    width: 80,
  },
  select: {
    background: '#1a1a2e',
    color: '#e0e0f0',
    border: '1px solid #252545',
    borderRadius: 4,
    padding: '2px 4px',
    fontFamily: 'monospace',
    fontSize: 11,
    cursor: 'pointer',
  },
  modeBtn: {
    border: '1px solid',
    borderRadius: 4,
    padding: '3px 8px',
    fontFamily: 'monospace',
    fontSize: 11,
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s',
  },
  btn: {
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '4px 9px',
    fontFamily: 'monospace',
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: 700,
    flexShrink: 0,
  },
  robotGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  iconBtn: {
    width: 20,
    height: 20,
    background: '#2d3561',
    border: 'none',
    borderRadius: 3,
    color: '#e0e0f0',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  robotCount: {
    fontSize: 11,
    color: '#e0e0f0',
    minWidth: 36,
    textAlign: 'center' as const,
  },
} as const;
