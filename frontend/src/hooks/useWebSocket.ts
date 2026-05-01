import { useCallback, useEffect, useRef, useState } from 'react';
import type { BenchmarkResultMessage, ClientCommand, Metrics, Order, Robot, ServerMessage } from '../types';
import { CELL_EMPTY } from '../types';
import type { CellValue } from '../types';

export interface SimState {
  connected: boolean;
  tick: number;
  rows: number;
  cols: number;
  cells: CellValue[][];
  robots: Robot[];
  orders: Order[];
  metrics: Metrics;
  heatmap: number[][];
  // SLA / gamification (computed client-side)
  slaLimit: number;
  onTimeCount: number;
  lateCount: number;
  score: number;
  // Live throughput sparkline: delta orders/tick, last 60 values
  paused: boolean;
  throughputHistory: number[];
  benchmarkResult: BenchmarkResultMessage | null;
}

function makeEmpty2D(rows: number, cols: number, fill = 0): number[][] {
  return Array.from({ length: rows }, () => Array(cols).fill(fill));
}

const DEFAULT_ROWS = 20;
const DEFAULT_COLS = 30;
const SLA_LIMIT    = 150; // ticks — order must complete within this

const HEAT_DECAY   = 0.97;
const HEAT_VISIT   = 2.0;
const HEAT_MAX_CAP = 60.0;

const DEFAULT_STATE: SimState = {
  connected: false,
  tick: 0,
  rows: DEFAULT_ROWS,
  cols: DEFAULT_COLS,
  cells: Array.from({ length: DEFAULT_ROWS }, () =>
    Array(DEFAULT_COLS).fill(CELL_EMPTY) as CellValue[]
  ),
  robots: [],
  orders: [],
  metrics: {
    throughput: 0, active_robots: 0, avg_path_length: 0,
    collisions: 0, algorithm: 'prioritized', tps: 5,
  },
  heatmap: makeEmpty2D(DEFAULT_ROWS, DEFAULT_COLS),
  slaLimit: SLA_LIMIT,
  onTimeCount: 0,
  lateCount: 0,
  score: 0,
  paused: false,
  throughputHistory: [],
  benchmarkResult: null,
};

function calcScore(throughput: number, onTime: number, late: number, collisions: number): number {
  const total = onTime + late;
  const onTimeRate = total > 0 ? onTime / total : 1;
  return Math.floor((throughput * onTimeRate * 10) / (1 + collisions * 0.05));
}

export function useWebSocket(url: string) {
  const [state, setState] = useState<SimState>(DEFAULT_STATE);
  const wsRef         = useRef<WebSocket | null>(null);
  const reconnectRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heatRef       = useRef<number[][]>(makeEmpty2D(DEFAULT_ROWS, DEFAULT_COLS));
  // Track which order IDs have been classified for SLA (so we don't double-count).
  const seenCompletedRef = useRef<Set<number>>(new Set());
  const onTimeRef        = useRef(0);
  const lateRef          = useRef(0);
  const prevThroughputRef = useRef(0);
  const throughputHistRef = useRef<number[]>([]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen  = () => setState(prev => ({ ...prev, connected: true }));
    ws.onerror = () => ws.close();
    ws.onclose = () => {
      setState(prev => ({ ...prev, connected: false }));
      reconnectRef.current = setTimeout(connect, 2000);
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      let msg: ServerMessage;
      try { msg = JSON.parse(event.data) as ServerMessage; }
      catch { return; }

      if (msg.type === 'init') {
        heatRef.current = makeEmpty2D(msg.rows, msg.cols);
        setState(prev => ({
          ...prev, rows: msg.rows, cols: msg.cols,
          cells: msg.cells as CellValue[][],
          heatmap: makeEmpty2D(msg.rows, msg.cols),
        }));
        return;
      }

      if (msg.type === 'benchmark_result') {
        setState(prev => ({ ...prev, benchmarkResult: msg }));
        return;
      }

      if (msg.type === 'state') {
        // ── Heatmap ──
        const heat = heatRef.current;
        const hrows = heat.length;
        const hcols = hrows > 0 ? heat[0].length : 0;
        for (let r = 0; r < hrows; r++)
          for (let c = 0; c < hcols; c++)
            heat[r][c] *= HEAT_DECAY;
        for (const robot of msg.robots) {
          if (robot.row < hrows && robot.col < hcols)
            heat[robot.row][robot.col] = Math.min(heat[robot.row][robot.col] + HEAT_VISIT, HEAT_MAX_CAP);
        }
        const heatmap = heat.map(row => row.map(v => Math.min(v / HEAT_MAX_CAP, 1)));

        // ── SLA classification ──
        for (const order of msg.orders) {
          if (order.status === 'completed' && order.completed_tick != null
              && !seenCompletedRef.current.has(order.id)) {
            seenCompletedRef.current.add(order.id);
            const duration = order.completed_tick - order.created_tick;
            if (duration <= SLA_LIMIT) onTimeRef.current++;
            else lateRef.current++;
          }
        }
        const score = calcScore(
          msg.metrics.throughput, onTimeRef.current, lateRef.current, msg.metrics.collisions
        );

        // ── Throughput sparkline ──
        const delta = Math.max(0, msg.metrics.throughput - prevThroughputRef.current);
        prevThroughputRef.current = msg.metrics.throughput;
        const hist = throughputHistRef.current;
        hist.push(delta);
        if (hist.length > 60) hist.shift();
        const throughputHistory = [...hist];

        setState(prev => ({
          ...prev,
          tick: msg.tick, robots: msg.robots, orders: msg.orders,
          metrics: msg.metrics, cells: msg.cells as CellValue[][],
          paused: msg.paused,
          heatmap,
          onTimeCount: onTimeRef.current,
          lateCount:   lateRef.current,
          score,
          throughputHistory,
        }));
      }
    };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((cmd: ClientCommand) => {
    if (wsRef.current?.readyState === WebSocket.OPEN)
      wsRef.current.send(JSON.stringify(cmd));
  }, []);

  return { state, send };
}
