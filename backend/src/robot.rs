use serde::{Deserialize, Serialize};

/// What a robot is currently doing.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RobotState {
    /// No assigned task, waiting for orders.
    Idle,
    /// Navigating toward the pickup point.
    MovingToPickup,
    /// Arrived at pickup, waiting 1 tick.
    Picking,
    /// Navigating toward the dropoff point.
    MovingToDropoff,
    /// Arrived at dropoff, waiting 1 tick.
    Dropping,
}

/// A single autonomous robot (AGV).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Robot {
    pub id: usize,
    pub row: usize,
    pub col: usize,
    pub state: RobotState,
    /// The order currently assigned to this robot, if any.
    pub task_id: Option<usize>,
    /// Planned path: sequence of (row, col) steps, front = next step.
    #[serde(skip)]
    pub path: Vec<(usize, usize)>,
    /// Ticks remaining in the current Picking/Dropping wait.
    #[serde(skip)]
    pub wait_ticks: u32,
}

impl Robot {
    pub fn new(id: usize, row: usize, col: usize) -> Self {
        Robot {
            id,
            row,
            col,
            state: RobotState::Idle,
            task_id: None,
            path: Vec::new(),
            wait_ticks: 0,
        }
    }

    /// True if this robot can be assigned a new order.
    pub fn is_idle(&self) -> bool {
        self.state == RobotState::Idle
    }

    /// Assign an order to this robot.
    pub fn assign_task(&mut self, task_id: usize) {
        self.task_id = Some(task_id);
        self.state = RobotState::MovingToPickup;
        self.path.clear();
    }

    /// Called when the robot reaches the pickup cell. Starts the 1-tick wait.
    pub fn begin_pickup(&mut self) {
        self.state = RobotState::Picking;
        self.wait_ticks = 1;
        self.path.clear();
    }

    /// Called when the robot reaches the dropoff cell. Starts the 1-tick wait.
    pub fn begin_dropoff(&mut self) {
        self.state = RobotState::Dropping;
        self.wait_ticks = 1;
        self.path.clear();
    }

    /// Called after the pickup wait completes. Robot now heads to dropoff.
    pub fn finish_pickup(&mut self) {
        self.state = RobotState::MovingToDropoff;
        self.wait_ticks = 0;
    }

    /// Called after the dropoff wait completes. Robot becomes idle.
    pub fn finish_dropoff(&mut self) {
        self.state = RobotState::Idle;
        self.task_id = None;
        self.wait_ticks = 0;
    }

    /// Advance one step along the planned path. Returns the new position.
    /// Does nothing if the path is empty.
    pub fn step(&mut self) {
        if let Some((next_row, next_col)) = self.path.first().copied() {
            self.path.remove(0);
            self.row = next_row;
            self.col = next_col;
        }
    }

    /// Manhattan distance from current position to target.
    pub fn distance_to(&self, row: usize, col: usize) -> usize {
        self.row.abs_diff(row) + self.col.abs_diff(col)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_robot_is_idle() {
        let r = Robot::new(0, 5, 5);
        assert!(r.is_idle());
        assert_eq!(r.task_id, None);
        assert_eq!(r.state, RobotState::Idle);
    }

    #[test]
    fn assign_task_transitions_state() {
        let mut r = Robot::new(0, 0, 0);
        r.assign_task(42);
        assert_eq!(r.state, RobotState::MovingToPickup);
        assert_eq!(r.task_id, Some(42));
        assert!(!r.is_idle());
    }

    #[test]
    fn full_lifecycle() {
        let mut r = Robot::new(1, 0, 0);
        r.assign_task(7);
        assert_eq!(r.state, RobotState::MovingToPickup);

        r.begin_pickup();
        assert_eq!(r.state, RobotState::Picking);
        assert_eq!(r.wait_ticks, 1);

        r.finish_pickup();
        assert_eq!(r.state, RobotState::MovingToDropoff);

        r.begin_dropoff();
        assert_eq!(r.state, RobotState::Dropping);
        assert_eq!(r.wait_ticks, 1);

        r.finish_dropoff();
        assert_eq!(r.state, RobotState::Idle);
        assert_eq!(r.task_id, None);
        assert!(r.is_idle());
    }

    #[test]
    fn step_follows_path() {
        let mut r = Robot::new(0, 0, 0);
        r.path = vec![(0, 1), (0, 2), (1, 2)];
        r.step();
        assert_eq!((r.row, r.col), (0, 1));
        r.step();
        assert_eq!((r.row, r.col), (0, 2));
        r.step();
        assert_eq!((r.row, r.col), (1, 2));
        // Path exhausted — step is a no-op
        r.step();
        assert_eq!((r.row, r.col), (1, 2));
    }

    #[test]
    fn distance_to() {
        let r = Robot::new(0, 3, 4);
        assert_eq!(r.distance_to(3, 4), 0);
        assert_eq!(r.distance_to(5, 4), 2);
        assert_eq!(r.distance_to(3, 7), 3);
        assert_eq!(r.distance_to(0, 0), 7);
    }
}
