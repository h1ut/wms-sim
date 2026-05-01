// ---------------------------------------------------------------------------
// Cell encoding (matches Rust CellType)
// ---------------------------------------------------------------------------
export const CELL_EMPTY   = 0;
export const CELL_SHELF   = 1;
export const CELL_PICKUP  = 2;
export const CELL_DROPOFF = 3;

export type CellValue = 0 | 1 | 2 | 3;

// ---------------------------------------------------------------------------
// Server → Client messages
// ---------------------------------------------------------------------------

export interface InitMessage {
  type: 'init';
  rows: number;
  cols: number;
  cells: CellValue[][];
}

export type RobotState =
  | 'idle'
  | 'moving_to_pickup'
  | 'picking'
  | 'moving_to_dropoff'
  | 'dropping';

export interface Robot {
  id: number;
  row: number;
  col: number;
  state: RobotState;
  task_id: number | null;
  /** Planned future cells [[row, col], ...] */
  path: [number, number][];
}

export type OrderStatus = 'pending' | 'assigned' | 'in_progress' | 'completed';

export interface Order {
  id: number;
  pickup: [number, number];
  dropoff: [number, number];
  status: OrderStatus;
  robot_id: number | null;
  created_tick: number;
  completed_tick: number | null;
}

export interface Metrics {
  throughput: number;
  active_robots: number;
  avg_path_length: number;
  collisions: number;
  algorithm: string;
  tps: number;
}

export interface StateMessage {
  type: 'state';
  tick: number;
  robots: Robot[];
  orders: Order[];
  metrics: Metrics;
  cells: CellValue[][];
  paused: boolean;
}

export interface AlgoStats {
  throughput: number;
  collisions: number;
  avg_path_length: number;
}

export interface BenchmarkResultMessage {
  type: 'benchmark_result';
  ticks: number;
  prioritized: AlgoStats;
  astar: AlgoStats;
}

export type ServerMessage = InitMessage | StateMessage | BenchmarkResultMessage;

// ---------------------------------------------------------------------------
// Client → Server commands
// ---------------------------------------------------------------------------

export type PlacementMode = 'obstacle' | 'pickup' | 'dropoff' | 'erase';

export type ClientCommand =
  | { type: 'set_speed'; tps: number }
  | { type: 'add_robots'; count: number }
  | { type: 'toggle_obstacle'; row: number; col: number }
  | { type: 'set_cell'; row: number; col: number; cell_type: 'empty' | 'shelf' | 'pickup' | 'dropoff' }
  | { type: 'set_algorithm'; algorithm: 'astar' | 'prioritized' | 'cbs' }
  | { type: 'stress_test' }
  | { type: 'remove_robot' }
  | { type: 'reset_simulation' }
  | { type: 'set_paused'; paused: boolean }
  | { type: 'step_tick' }
  | { type: 'run_benchmark'; ticks: number };
