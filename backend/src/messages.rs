use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Server → Client
// ---------------------------------------------------------------------------

/// Top-level envelope for all server-to-client messages.
/// Serde will add a `"type"` field matching the variant name.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    /// Sent once on WebSocket connection: static grid layout.
    Init(InitPayload),
    /// Sent every tick: full simulation snapshot.
    State(StatePayload),
    /// Sent once after a RunBenchmark command completes.
    BenchmarkResult(BenchmarkPayload),
}

/// One-time init payload: grid dimensions and cell types.
#[derive(Debug, Clone, Serialize)]
pub struct InitPayload {
    pub rows: usize,
    pub cols: usize,
    /// 2-D array: 0=Empty, 1=Shelf, 2=Pickup, 3=Dropoff
    pub cells: Vec<Vec<u8>>,
}

/// Per-tick snapshot payload.
#[derive(Debug, Clone, Serialize)]
pub struct StatePayload {
    pub tick: u64,
    pub robots: Vec<RobotMsg>,
    pub orders: Vec<OrderMsg>,
    pub metrics: MetricsMsg,
    /// Grid resent every tick so the frontend reflects obstacle toggles.
    /// 0=Empty 1=Shelf 2=Pickup 3=Dropoff
    pub cells: Vec<Vec<u8>>,
    pub paused: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct RobotMsg {
    pub id: usize,
    pub row: usize,
    pub col: usize,
    pub state: &'static str,
    pub task_id: Option<usize>,
    /// Planned future positions — frontend draws path preview.
    pub path: Vec<[usize; 2]>,
}

#[derive(Debug, Clone, Serialize)]
pub struct OrderMsg {
    pub id: usize,
    pub pickup: [usize; 2],
    pub dropoff: [usize; 2],
    pub status: &'static str,
    pub robot_id: Option<usize>,
    pub created_tick: u64,
    pub completed_tick: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct MetricsMsg {
    /// Total completed orders since sim start.
    pub throughput: usize,
    /// Robots currently executing a task.
    pub active_robots: usize,
    /// Exponential moving average of path length.
    pub avg_path_length: f64,
    /// Cumulative collision count (same-cell occupancy).
    pub collisions: usize,
    /// Current algorithm name.
    pub algorithm: &'static str,
    /// Current simulated ticks-per-second.
    pub tps: u32,
}

/// Per-algorithm stats returned by the benchmark runner.
#[derive(Debug, Clone, Serialize)]
pub struct AlgoStats {
    pub throughput: usize,
    pub collisions: usize,
    pub avg_path_length: f64,
}

/// Payload for a completed benchmark run.
#[derive(Debug, Clone, Serialize)]
pub struct BenchmarkPayload {
    /// How many ticks each algorithm ran.
    pub ticks: u32,
    pub prioritized: AlgoStats,
    pub astar: AlgoStats,
}

// ---------------------------------------------------------------------------
// Client → Server
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientCommand {
    SetSpeed { tps: u32 },
    AddRobots { count: usize },
    ToggleObstacle { row: usize, col: usize },
    /// Explicitly set a cell to a given type: "empty"|"shelf"|"pickup"|"dropoff"
    SetCell { row: usize, col: usize, cell_type: String },
    SetAlgorithm { algorithm: String },
    StressTest,
    RemoveRobot,
    ResetSimulation,
    SetPaused { paused: bool },
    StepTick,
    /// Run N ticks silently with both algorithms and return a comparison.
    RunBenchmark { ticks: u32 },
}
