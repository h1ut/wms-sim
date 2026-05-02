//! Core simulation state and per-tick logic.
//!
//! Tick order (per spec):
//!   1. Generate new orders
//!   2. Assign orders to idle robots
//!   3. Compute paths
//!   4. Move robots one step
//!   5. Handle pickups / dropoffs

use std::collections::HashSet;

use rand::Rng;
use serde_json;

use crate::{
    grid::{CellType, Grid},
    messages::{
        AlgoStats, BenchmarkPayload, ClientCommand, InitPayload, MetricsMsg, OrderMsg, RobotMsg,
        ServerMessage, StatePayload,
    },
    orders::{Order, OrderStatus},
    planner,
    robot::{Robot, RobotState},
};

// ---------------------------------------------------------------------------
// Algorithm selector
// ---------------------------------------------------------------------------

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Algorithm {
    AStar,
    Prioritized,
    CBS,
    WHCA,
}

impl Algorithm {
    pub fn name(self) -> &'static str {
        match self {
            Algorithm::AStar       => "astar",
            Algorithm::Prioritized => "prioritized",
            Algorithm::CBS         => "cbs",
            Algorithm::WHCA        => "whca",
        }
    }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Maximum number of non-completed orders in the system.
const MAX_ACTIVE_ORDERS: usize = 24;
/// Probability per tick that a new order is generated.
const ORDER_SPAWN_PROB: f64 = 0.35;
/// Spawn positions (row, col) for new robots — all on corridor intersections.
const SPAWN_POSITIONS: &[(usize, usize)] = &[
    (5, 5),  (5, 15),  (5, 25),
    (10, 5), (10, 15), (10, 25),
    (15, 5), (15, 15), (15, 25),
    (0, 25), (0, 1),   (19, 25),
    (0, 0),  (19, 0),  (5, 0),
    (10, 0), (15, 0),  (0, 29),
    (19, 29),(10, 29),
];

// ---------------------------------------------------------------------------
// SimulationState
// ---------------------------------------------------------------------------

#[derive(Clone)]
pub struct SimulationState {
    pub grid: Grid,
    pub robots: Vec<Robot>,
    pub orders: Vec<Order>,

    pub tick: u64,
    pub tps: u32,
    pub algorithm: Algorithm,
    pub paused: bool,

    // Metrics
    pub throughput: usize,
    pub collisions: usize,
    pub avg_path_length: f64,

    // Counters
    next_robot_id: usize,
    next_order_id: usize,

}

impl SimulationState {
    pub fn new() -> Self {
        let mut sim = SimulationState {
            grid: Grid::new_warehouse(),
            robots: Vec::new(),
            orders: Vec::new(),
            tick: 0,
            tps: 5,
            algorithm: Algorithm::Prioritized,
            paused: false,
            throughput: 0,
            collisions: 0,
            avg_path_length: 0.0,
            next_robot_id: 0,
            next_order_id: 0,
        };
        sim.add_robots(1);
        sim
    }

    // ------------------------------------------------------------------
    // Public mutators (used by tick and command handler)
    // ------------------------------------------------------------------

    pub fn add_robots(&mut self, count: usize) {
        let count = count.min(SPAWN_POSITIONS.len().saturating_sub(self.robots.len()));
        for _ in 0..count {
            let spawn_idx = self.next_robot_id % SPAWN_POSITIONS.len();
            let (r, c) = SPAWN_POSITIONS[spawn_idx];
            self.robots.push(Robot::new(self.next_robot_id, r, c));
            self.next_robot_id += 1;
        }
    }

    pub fn spawn_order(&mut self) {
        let pickups = self.grid.cells_of_type(CellType::Pickup);
        let dropoffs = self.grid.cells_of_type(CellType::Dropoff);
        if pickups.is_empty() || dropoffs.is_empty() {
            return;
        }
        let mut rng = rand::thread_rng();
        let pickup = pickups[rng.gen_range(0..pickups.len())];
        let dropoff = dropoffs[rng.gen_range(0..dropoffs.len())];
        self.orders.push(Order::new(self.next_order_id, pickup, dropoff, self.tick));
        self.next_order_id += 1;
    }

    // ------------------------------------------------------------------
    // Main tick
    // ------------------------------------------------------------------

    pub fn tick(&mut self) {
        self.tick += 1;

        // 1. Generate new orders ------------------------------------------------
        let active = self.orders.iter().filter(|o| o.is_active()).count();
        if active < MAX_ACTIVE_ORDERS {
            let mut rng = rand::thread_rng();
            if rng.gen_bool(ORDER_SPAWN_PROB) {
                self.spawn_order();
            }
        }

        // 2. Assign orders to idle robots ----------------------------------------
        planner::assign_tasks(&mut self.robots, &mut self.orders);

        // 3. Compute paths -------------------------------------------------------
        let (total_steps, paths_computed) = match self.algorithm {
            Algorithm::AStar => {
                planner::compute_paths_astar(&self.grid, &mut self.robots, &self.orders)
            }
            Algorithm::Prioritized => planner::compute_paths_prioritized(
                &self.grid, &mut self.robots, &self.orders, self.tick as usize,
            ),
            Algorithm::CBS => planner::compute_paths_cbs(
                &self.grid, &mut self.robots, &self.orders, self.tick as usize,
            ),
            Algorithm::WHCA => planner::compute_paths_whca(
                &self.grid, &mut self.robots, &self.orders, self.tick as usize,
            ),
        };
        if paths_computed > 0 {
            let tick_avg = total_steps as f64 / paths_computed as f64;
            // Exponential moving average (α = 0.15)
            self.avg_path_length = 0.85 * self.avg_path_length + 0.15 * tick_avg;
        }

        // 4. Move robots ---------------------------------------------------------
        for robot in &mut self.robots {
            if matches!(robot.state, RobotState::MovingToPickup | RobotState::MovingToDropoff) {
                robot.step();
            }
        }

        // Detect collisions (same-cell occupancy after moving).
        {
            let mut seen: HashSet<(usize, usize)> = HashSet::new();
            for robot in &self.robots {
                if !seen.insert((robot.row, robot.col)) {
                    self.collisions += 1;
                }
            }
        }

        // 5. Handle pickups / dropoffs -------------------------------------------
        //
        // Process Picking/Dropping robots FIRST so that a robot that transitions
        // to Picking in the arrival check below is not also finished this same tick.

        // Step 5a: advance wait timers for robots already in Picking/Dropping.
        let mut finished_task_ids: Vec<usize> = Vec::new();
        for robot in &mut self.robots {
            match robot.state {
                RobotState::Picking => {
                    if robot.wait_ticks > 0 {
                        robot.wait_ticks -= 1;
                    }
                    if robot.wait_ticks == 0 {
                        robot.finish_pickup();
                    }
                }
                RobotState::Dropping => {
                    if robot.wait_ticks > 0 {
                        robot.wait_ticks -= 1;
                    }
                    if robot.wait_ticks == 0 {
                        if let Some(tid) = robot.task_id {
                            finished_task_ids.push(tid);
                        }
                        robot.finish_dropoff();
                    }
                }
                _ => {}
            }
        }

        // Mark completed orders.
        for tid in finished_task_ids {
            if let Some(order) = self.orders.iter_mut().find(|o| o.id == tid) {
                order.status = OrderStatus::Completed;
                order.completed_tick = Some(self.tick);
                self.throughput += 1;
            }
        }

        // Step 5b: check for arrivals (must happen AFTER the waiting pass above).
        // We need to look up each robot's order, so iterate by index.
        for i in 0..self.robots.len() {
            match self.robots[i].state {
                RobotState::MovingToPickup => {
                    let at_pickup = self.robots[i].task_id.and_then(|tid| {
                        self.orders.iter().find(|o| o.id == tid)
                    }).map(|order| {
                        self.robots[i].row == order.pickup.0
                            && self.robots[i].col == order.pickup.1
                            && self.robots[i].path.is_empty()
                    }).unwrap_or(false);

                    if at_pickup {
                        self.robots[i].begin_pickup();
                        // Update order to InProgress.
                        if let Some(tid) = self.robots[i].task_id {
                            if let Some(order) = self.orders.iter_mut().find(|o| o.id == tid) {
                                order.status = OrderStatus::InProgress;
                            }
                        }
                    }
                }
                RobotState::MovingToDropoff => {
                    let at_dropoff = self.robots[i].task_id.and_then(|tid| {
                        self.orders.iter().find(|o| o.id == tid)
                    }).map(|order| {
                        self.robots[i].row == order.dropoff.0
                            && self.robots[i].col == order.dropoff.1
                            && self.robots[i].path.is_empty()
                    }).unwrap_or(false);

                    if at_dropoff {
                        self.robots[i].begin_dropoff();
                    }
                }
                _ => {}
            }
        }
    }

    // ------------------------------------------------------------------
    // Command handler
    // ------------------------------------------------------------------

    /// Handle a client command. Most commands mutate state and return `None`.
    /// `RunBenchmark` returns `Some((snapshot, ticks))` — the caller should
    /// run the benchmark in a background task so the mutex is not held.
    pub fn handle_command(&mut self, cmd: ClientCommand) -> Option<(SimulationState, u32)> {
        match cmd {
            ClientCommand::SetSpeed { tps } => {
                self.tps = tps.clamp(1, 30);
            }
            ClientCommand::AddRobots { count } => {
                self.add_robots(count.min(20));
            }
            ClientCommand::ToggleObstacle { row, col } => {
                self.grid.toggle_obstacle(row, col);
                // Clear paths that go through the toggled cell.
                for robot in &mut self.robots {
                    if robot.path.iter().any(|&(r, c)| r == row && c == col) {
                        robot.path.clear();
                    }
                }
            }
            ClientCommand::SetCell { row, col, cell_type } => {
                let kind = match cell_type.as_str() {
                    "pickup"  => CellType::Pickup,
                    "dropoff" => CellType::Dropoff,
                    "shelf"   => CellType::Shelf,
                    _         => CellType::Empty,
                };
                self.grid.set_cell(row, col, kind);
                // Invalidate robot paths through that cell.
                for robot in &mut self.robots {
                    if robot.path.iter().any(|&(r, c)| r == row && c == col) {
                        robot.path.clear();
                    }
                }
            }
            ClientCommand::SetAlgorithm { algorithm } => {
                self.algorithm = match algorithm.as_str() {
                    "astar" => Algorithm::AStar,
                    "cbs"   => Algorithm::CBS,
                    "whca"  => Algorithm::WHCA,
                    _       => Algorithm::Prioritized,
                };
            }
            ClientCommand::StressTest => {
                self.add_robots(10);
                for _ in 0..10 {
                    self.spawn_order();
                }
            }
            ClientCommand::RemoveRobot => {
                // Remove the last idle robot; ignore if none are idle.
                if let Some(i) = self.robots.iter().rposition(|r| r.is_idle()) {
                    self.robots.remove(i);
                }
            }
            ClientCommand::ResetSimulation => {
                let tps       = self.tps;
                let algorithm = self.algorithm;
                *self = SimulationState::new();
                self.tps       = tps;
                self.algorithm = algorithm;
            }
            ClientCommand::SetPaused { paused } => {
                self.paused = paused;
            }
            ClientCommand::StepTick => {
                self.tick();
            }
            ClientCommand::RunBenchmark { ticks } => {
                // Clone is fast (just heap data). Return the snapshot; the caller
                // runs the heavy benchmark outside the mutex lock.
                return Some((self.clone(), ticks.min(300)));
            }
        }
        None
    }

    /// Clone the current state, run `ticks` ticks with each algorithm, return a comparison.
    /// The live simulation is not affected.
    pub fn run_benchmark(&self, ticks: u32) -> BenchmarkPayload {
        let run = |algorithm: Algorithm| -> AlgoStats {
            let mut sim = self.clone();
            sim.algorithm = algorithm;
            sim.throughput = 0;
            sim.collisions = 0;
            sim.avg_path_length = 0.0;
            for _ in 0..ticks {
                sim.tick();
            }
            AlgoStats {
                throughput: sim.throughput,
                collisions: sim.collisions,
                avg_path_length: (sim.avg_path_length * 100.0).round() / 100.0,
            }
        };

        BenchmarkPayload {
            ticks,
            prioritized: run(Algorithm::Prioritized),
            astar:        run(Algorithm::AStar),
        }
    }

    // ------------------------------------------------------------------
    // Message builders
    // ------------------------------------------------------------------

    pub fn to_init_message(&self) -> ServerMessage {
        ServerMessage::Init(InitPayload {
            rows: self.grid.rows,
            cols: self.grid.cols,
            cells: encode_cells(&self.grid),
        })
    }

    /// Serialize the current state to a JSON string (returns None on error).
    pub fn to_state_message_json(&self) -> Option<String> {
        let payload = StatePayload {
            tick: self.tick,
            robots: self.robots.iter().map(robot_to_msg).collect(),
            orders: {
                // All active orders + last 25 completed (for history panel).
                let mut msgs: Vec<_> = self.orders.iter()
                    .filter(|o| o.is_active())
                    .map(order_to_msg)
                    .collect();
                let completed: Vec<_> = self.orders.iter()
                    .filter(|o| matches!(o.status, OrderStatus::Completed))
                    .rev()
                    .take(25)
                    .map(order_to_msg)
                    .collect();
                msgs.extend(completed);
                msgs
            },
            metrics: MetricsMsg {
                throughput: self.throughput,
                active_robots: self
                    .robots
                    .iter()
                    .filter(|r| !r.is_idle())
                    .count(),
                avg_path_length: (self.avg_path_length * 100.0).round() / 100.0,
                collisions: self.collisions,
                algorithm: self.algorithm.name(),
                tps: self.tps,
            },
            cells: encode_cells(&self.grid),
            paused: self.paused,
        };
        let msg = ServerMessage::State(payload);
        serde_json::to_string(&msg).ok()
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn encode_cells(grid: &Grid) -> Vec<Vec<u8>> {
    grid.cells()
        .iter()
        .map(|row| {
            row.iter()
                .map(|&c| match c {
                    CellType::Empty => 0,
                    CellType::Shelf => 1,
                    CellType::Pickup => 2,
                    CellType::Dropoff => 3,
                })
                .collect()
        })
        .collect()
}

fn robot_to_msg(robot: &Robot) -> RobotMsg {
    RobotMsg {
        id: robot.id,
        row: robot.row,
        col: robot.col,
        state: match robot.state {
            RobotState::Idle => "idle",
            RobotState::MovingToPickup => "moving_to_pickup",
            RobotState::Picking => "picking",
            RobotState::MovingToDropoff => "moving_to_dropoff",
            RobotState::Dropping => "dropping",
        },
        task_id: robot.task_id,
        path: robot.path.iter().map(|&(r, c)| [r, c]).collect(),
    }
}

fn order_to_msg(order: &Order) -> OrderMsg {
    OrderMsg {
        id: order.id,
        pickup: [order.pickup.0, order.pickup.1],
        dropoff: [order.dropoff.0, order.dropoff.1],
        status: match order.status {
            OrderStatus::Pending => "pending",
            OrderStatus::Assigned => "assigned",
            OrderStatus::InProgress => "in_progress",
            OrderStatus::Completed => "completed",
        },
        robot_id: order.robot_id,
        created_tick: order.created_tick,
        completed_tick: order.completed_tick,
    }
}
