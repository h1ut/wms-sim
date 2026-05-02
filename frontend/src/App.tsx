import { useCallback, useEffect, useRef, useState } from 'react';
import Controls from './components/Controls';
import Instructions from './components/Instructions';
import MetricsPanel from './components/MetricsPanel';
import OrderHistory from './components/OrderHistory';
import WarehouseCanvas from './components/WarehouseCanvas';
import { useWebSocket } from './hooks/useWebSocket';
import { useWindowSize } from './hooks/useWindowSize';
import LandingPage from './pages/LandingPage';
import type { PlacementMode } from './types';

const WS_URL = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`;

export default function App() {
  const { width } = useWindowSize();
  const mobile = width < 768;

  const [page, setPage]               = useState<'landing' | 'sim'>('landing');
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showHelp, setShowHelp]       = useState(false);
  const [placementMode, setPlacementMode] = useState<PlacementMode>('obstacle');
  const [sidebarWidth, setSidebarWidth]   = useState(240);
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [selectedRobotId, setSelectedRobotId] = useState<number | null>(null);
  const draggingRef = useRef(false);
  const dragStartX  = useRef(0);
  const dragStartW  = useRef(240);

  // On mobile sidebar is hidden by default; on desktop always visible.
  useEffect(() => {
    setSidebarOpen(!mobile);
  }, [mobile]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const delta = dragStartX.current - e.clientX;
      setSidebarWidth(Math.min(520, Math.max(180, dragStartW.current + delta)));
    };
    const onUp = () => { draggingRef.current = false; document.body.style.cursor = ''; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const { state, send } = useWebSocket(WS_URL);

  const handleCellClick = useCallback((row: number, col: number) => {
    switch (placementMode) {
      case 'obstacle':
        send({ type: 'toggle_obstacle', row, col });
        break;
      case 'pickup':
        send({ type: 'set_cell', row, col, cell_type: 'pickup' });
        break;
      case 'dropoff':
        send({ type: 'set_cell', row, col, cell_type: 'dropoff' });
        break;
      case 'erase':
        send({ type: 'set_cell', row, col, cell_type: 'empty' });
        break;
    }
  }, [placementMode, send]);

  if (page === 'landing') {
    return <LandingPage onLaunch={() => setPage('sim')} />;
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <header style={styles.header}>
        <button onClick={() => setPage('landing')} style={styles.backBtn}>← Home</button>
        <span style={styles.title}>WMS·SIM</span>
        <div style={styles.headerRight}>
          {state.paused && !mobile && <span style={{ fontSize: 10, color: 'var(--orange)', fontWeight: 700, letterSpacing: '0.08em' }}>PAUSED</span>}
          {!mobile && <span style={styles.tick}>TICK {state.tick.toLocaleString()}</span>}
          {/* Stats toggle — mobile only */}
          {mobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              style={{ ...styles.helpBtn, width: 'auto', padding: '0 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}
            >
              {sidebarOpen ? '✕ Stats' : '📊 Stats'}
            </button>
          )}
          <button onClick={() => setShowHelp(true)} style={styles.helpBtn} title="Instructions">?</button>
        </div>
      </header>

      {/* Main */}
      <div style={styles.main}>
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex' }}>
          <WarehouseCanvas
            rows={state.rows}
            cols={state.cols}
            cells={state.cells}
            robots={state.robots}
            orders={state.orders}
            heatmap={state.heatmap}
            showHeatmap={showHeatmap}
            placementMode={placementMode}
            selectedRobotId={selectedRobotId}
            onCellClick={handleCellClick}
            onRobotClick={setSelectedRobotId}
          />
          {selectedRobotId !== null && (() => {
            const r = state.robots.find(x => x.id === selectedRobotId);
            if (!r) return null;
            const order = r.task_id != null ? state.orders.find(o => o.id === r.task_id) : null;
            const stateLabel: Record<string, string> = {
              idle: 'Idle', moving_to_pickup: '→ Pickup', picking: 'Picking up',
              moving_to_dropoff: '→ Dropoff', dropping: 'Dropping off',
            };
            return (
              <div style={styles.inspector}>
                <div style={styles.inspectorTitle}>Robot #{r.id}</div>
                <div style={styles.inspectorRow}><span>State</span><span>{stateLabel[r.state] ?? r.state}</span></div>
                {order && <div style={styles.inspectorRow}><span>Order</span><span>#{order.id}</span></div>}
                {order && <div style={styles.inspectorRow}><span>Pickup</span><span>({order.pickup[0]},{order.pickup[1]})</span></div>}
                {order && <div style={styles.inspectorRow}><span>Dropoff</span><span>({order.dropoff[0]},{order.dropoff[1]})</span></div>}
                <div style={styles.inspectorRow}><span>Path</span><span>{r.path.length} steps</span></div>
                <button onClick={() => setSelectedRobotId(null)} style={styles.inspectorClose}>✕</button>
              </div>
            );
          })()}
        </div>

        {/* Drag handle — desktop only */}
        {!mobile && (
          <div
            style={styles.dragHandle}
            onMouseDown={e => {
              draggingRef.current = true;
              dragStartX.current  = e.clientX;
              dragStartW.current  = sidebarWidth;
              document.body.style.cursor = 'col-resize';
            }}
          />
        )}

        {/* Sidebar: normal flow on desktop, overlay on mobile */}
        {sidebarOpen && (
          <div style={mobile ? {
            ...styles.sidebar,
            position: 'absolute',
            top: 0, right: 0, bottom: 0,
            width: Math.min(width - 32, 300),
            zIndex: 30,
            boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
          } : {
            ...styles.sidebar,
            width: sidebarWidth,
          }}>
            <MetricsPanel
              tick={state.tick}
              metrics={state.metrics}
              robots={state.robots}
              orders={state.orders}
              connected={state.connected}
              score={state.score}
              onTimeCount={state.onTimeCount}
              lateCount={state.lateCount}
              slaLimit={state.slaLimit}
              throughputHistory={state.throughputHistory}
              benchmarkResult={state.benchmarkResult}
            />
            <OrderHistory orders={state.orders} currentTick={state.tick} />
          </div>
        )}
      </div>

      {/* Controls */}
      <Controls
        tps={state.metrics.tps}
        algorithm={state.metrics.algorithm}
        showHeatmap={showHeatmap}
        paused={state.paused}
        robotCount={state.robots.length}
        placementMode={placementMode}
        onSend={send}
        onToggleHeatmap={() => setShowHeatmap(h => !h)}
        onPlacementMode={setPlacementMode}
      />

      {/* Instructions overlay */}
      {showHelp && <Instructions onClose={() => setShowHelp(false)} />}
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontFamily: 'var(--sans)',
    overflow: 'hidden',
  },
  header: {
    height: 44,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
    gap: 12,
  },
  backBtn: {
    background: 'none',
    border: '1px solid var(--border-2)',
    color: 'var(--text-muted)',
    borderRadius: 2,
    padding: '3px 10px',
    fontFamily: 'var(--sans)',
    fontSize: 11,
    cursor: 'pointer',
    letterSpacing: '0.01em',
    transition: 'border-color 0.15s, color 0.15s',
  },
  title: {
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--accent)',
    letterSpacing: '0.02em',
    flex: 1,
    textAlign: 'center' as const,
    fontFamily: 'var(--display)',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  tick: {
    fontSize: 10,
    color: 'var(--text-dim)',
    letterSpacing: '0.06em',
    fontFamily: 'var(--mono)',
  },
  helpBtn: {
    width: 24,
    height: 24,
    borderRadius: 2,
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'var(--sans)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
    position: 'relative' as const,
  },
  inspector: {
    position: 'absolute' as const,
    top: 12,
    left: 12,
    background: 'var(--surface)',
    border: '1px solid var(--accent)',
    borderRadius: 0,
    padding: '12px 14px',
    fontFamily: 'var(--mono)',
    fontSize: 11,
    color: 'var(--text)',
    minWidth: 172,
    zIndex: 20,
    backdropFilter: 'blur(4px)',
  },
  inspectorTitle: {
    fontWeight: 700,
    fontSize: 12,
    color: 'var(--accent)',
    marginBottom: 10,
    letterSpacing: '0.02em',
    fontFamily: 'var(--display)',
  },
  inspectorRow: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    color: 'var(--text-muted)',
    marginBottom: 4,
    fontSize: 11,
    fontFamily: 'var(--sans)',
  },
  inspectorClose: {
    position: 'absolute' as const,
    top: 8,
    right: 10,
    background: 'none',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    fontSize: 12,
    padding: 0,
  },
  dragHandle: {
    width: 4,
    cursor: 'col-resize',
    background: 'transparent',
    flexShrink: 0,
    borderLeft: '1px solid var(--border)',
    transition: 'background 0.15s',
  } as const,
  sidebar: {
    display: 'flex',
    flexDirection: 'column' as const,
    overflowY: 'auto' as const,
    flexShrink: 0,
    background: 'var(--surface)',
    borderLeft: '1px solid var(--border)',
  },
} as const;
