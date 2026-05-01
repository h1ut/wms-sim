use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum OrderStatus {
    Pending,
    Assigned,
    InProgress,
    Completed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: usize,
    /// (row, col) of the pickup cell.
    pub pickup: (usize, usize),
    /// (row, col) of the dropoff cell.
    pub dropoff: (usize, usize),
    pub status: OrderStatus,
    pub robot_id: Option<usize>,
    pub created_tick: u64,
    pub completed_tick: Option<u64>,
}

impl Order {
    pub fn new(id: usize, pickup: (usize, usize), dropoff: (usize, usize), tick: u64) -> Self {
        Order {
            id,
            pickup,
            dropoff,
            status: OrderStatus::Pending,
            robot_id: None,
            created_tick: tick,
            completed_tick: None,
        }
    }

    pub fn is_active(&self) -> bool {
        !matches!(self.status, OrderStatus::Completed)
    }
}
