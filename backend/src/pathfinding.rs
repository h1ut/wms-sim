use std::collections::{BinaryHeap, HashMap};
use std::cmp::Ordering;

use crate::grid::Grid;

/// A (row, col) position in the warehouse grid.
pub type Pos = (usize, usize);

// ---------------------------------------------------------------------------
// A* — single-agent, static obstacles only
// ---------------------------------------------------------------------------

/// Node in the A* open set.
#[derive(Copy, Clone, Eq, PartialEq)]
struct AStarNode {
    /// f = g + h
    f: usize,
    /// Cost from start to this node.
    g: usize,
    pos: Pos,
}

// BinaryHeap is a max-heap; we want min-f, so reverse the ordering.
impl Ord for AStarNode {
    fn cmp(&self, other: &Self) -> Ordering {
        other.f.cmp(&self.f).then_with(|| other.g.cmp(&self.g))
    }
}

impl PartialOrd for AStarNode {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// Manhattan distance heuristic.
fn heuristic(a: Pos, b: Pos) -> usize {
    a.0.abs_diff(b.0) + a.1.abs_diff(b.1)
}

/// 4-directional neighbours of `pos` that are passable according to `grid`.
fn neighbours(pos: Pos, grid: &Grid) -> Vec<Pos> {
    let (r, c) = pos;
    let mut result = Vec::with_capacity(4);

    // Up
    if r > 0 && grid.is_passable(r - 1, c) {
        result.push((r - 1, c));
    }
    // Down
    if r + 1 < grid.rows && grid.is_passable(r + 1, c) {
        result.push((r + 1, c));
    }
    // Left
    if c > 0 && grid.is_passable(r, c - 1) {
        result.push((r, c - 1));
    }
    // Right
    if c + 1 < grid.cols && grid.is_passable(r, c + 1) {
        result.push((r, c + 1));
    }

    result
}

/// Reconstruct the path from `came_from` map.
fn reconstruct_path(came_from: &HashMap<Pos, Pos>, mut current: Pos) -> Vec<Pos> {
    let mut path = vec![current];
    while let Some(&prev) = came_from.get(&current) {
        path.push(prev);
        current = prev;
    }
    path.reverse();
    // Drop the start node — caller already knows where they are.
    if path.len() > 1 {
        path.remove(0);
    } else {
        path.clear(); // start == goal
    }
    path
}

/// Run A* from `start` to `goal` on the given grid.
///
/// Returns `Some(path)` where `path` is a sequence of cells to visit
/// (not including `start`, including `goal`), or `None` if unreachable.
pub fn astar(grid: &Grid, start: Pos, goal: Pos) -> Option<Vec<Pos>> {
    if start == goal {
        return Some(vec![]);
    }
    if !grid.is_passable(start.0, start.1) || !grid.is_passable(goal.0, goal.1) {
        return None;
    }

    let mut open: BinaryHeap<AStarNode> = BinaryHeap::new();
    let mut came_from: HashMap<Pos, Pos> = HashMap::new();
    let mut g_score: HashMap<Pos, usize> = HashMap::new();

    g_score.insert(start, 0);
    open.push(AStarNode { f: heuristic(start, goal), g: 0, pos: start });

    while let Some(AStarNode { pos: current, g, .. }) = open.pop() {
        if current == goal {
            return Some(reconstruct_path(&came_from, current));
        }

        // Skip if we already found a better path to this node.
        if g > *g_score.get(&current).unwrap_or(&usize::MAX) {
            continue;
        }

        for neighbour in neighbours(current, grid) {
            let tentative_g = g + 1; // uniform-cost grid
            if tentative_g < *g_score.get(&neighbour).unwrap_or(&usize::MAX) {
                came_from.insert(neighbour, current);
                g_score.insert(neighbour, tentative_g);
                let f = tentative_g + heuristic(neighbour, goal);
                open.push(AStarNode { f, g: tentative_g, pos: neighbour });
            }
        }
    }

    None // No path found
}

// ---------------------------------------------------------------------------
// Space-time A* — for Prioritized Planning
// ---------------------------------------------------------------------------
//
// `reserved` maps (row, col, time_step) → true for cells that are blocked
// at that particular tick (used by higher-priority robots' planned paths).

pub type SpaceTimeReservation = HashMap<(usize, usize, usize), ()>;

#[derive(Copy, Clone, Eq, PartialEq)]
struct STNode {
    f: usize,
    g: usize,
    pos: Pos,
    t: usize,
}

impl Ord for STNode {
    fn cmp(&self, other: &Self) -> Ordering {
        other.f.cmp(&self.f).then_with(|| other.g.cmp(&self.g))
    }
}

impl PartialOrd for STNode {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

/// Space-time A*: plan a path from `start` to `goal`, avoiding cells reserved
/// by `reservation` at each time step. `start_t` is the current tick.
///
/// Returns `Some(path)` (steps after start) or `None` if unreachable within
/// `max_t` ticks.
pub fn astar_spacetime(
    grid: &Grid,
    start: Pos,
    goal: Pos,
    start_t: usize,
    reservation: &SpaceTimeReservation,
    max_t: usize,
) -> Option<Vec<Pos>> {
    if start == goal {
        return Some(vec![]);
    }
    if !grid.is_passable(start.0, start.1) || !grid.is_passable(goal.0, goal.1) {
        return None;
    }

    type STKey = (Pos, usize); // (pos, t)
    let mut open: BinaryHeap<STNode> = BinaryHeap::new();
    let mut came_from: HashMap<STKey, STKey> = HashMap::new();
    let mut g_score: HashMap<STKey, usize> = HashMap::new();

    let start_key = (start, start_t);
    g_score.insert(start_key, 0);
    open.push(STNode { f: heuristic(start, goal), g: 0, pos: start, t: start_t });

    while let Some(STNode { pos: current, g, t, .. }) = open.pop() {
        if current == goal {
            // Reconstruct path (positions only)
            let mut path = vec![current];
            let mut key: STKey = (current, t);
            while let Some(&prev) = came_from.get(&key) {
                path.push(prev.0);
                key = prev;
            }
            path.reverse();
            if path.len() > 1 {
                path.remove(0);
            } else {
                path.clear();
            }
            return Some(path);
        }

        let current_key = (current, t);
        if g > *g_score.get(&current_key).unwrap_or(&usize::MAX) {
            continue;
        }

        let next_t = t + 1;
        if next_t > max_t {
            continue;
        }

        // Possible actions: move to neighbour or wait in place
        let mut candidates = neighbours(current, grid);
        candidates.push(current); // wait action

        for next_pos in candidates {
            // Check space-time reservation
            if reservation.contains_key(&(next_pos.0, next_pos.1, next_t)) {
                continue;
            }
            let tentative_g = g + 1;
            let next_key = (next_pos, next_t);
            if tentative_g < *g_score.get(&next_key).unwrap_or(&usize::MAX) {
                came_from.insert(next_key, current_key);
                g_score.insert(next_key, tentative_g);
                let f = tentative_g + heuristic(next_pos, goal);
                open.push(STNode { f, g: tentative_g, pos: next_pos, t: next_t });
            }
        }
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::grid::Grid;

    fn warehouse() -> Grid {
        Grid::new_warehouse()
    }

    // ---- A* tests ----

    #[test]
    fn astar_same_start_and_goal() {
        let g = warehouse();
        let path = astar(&g, (0, 0), (0, 0)).expect("should return empty path");
        assert!(path.is_empty());
    }

    #[test]
    fn astar_adjacent_cells() {
        let g = warehouse();
        // Row 0 is a corridor — (0,0) and (0,1) are both passable
        let path = astar(&g, (0, 0), (0, 1)).expect("path should exist");
        assert_eq!(path, vec![(0, 1)]);
    }

    #[test]
    fn astar_short_corridor_path() {
        let g = warehouse();
        // Along corridor row 0 from col 0 to col 4
        let path = astar(&g, (0, 0), (0, 4)).expect("path should exist");
        assert_eq!(path.len(), 4);
        assert_eq!(*path.last().unwrap(), (0, 4));
    }

    #[test]
    fn astar_path_ends_at_goal() {
        let g = warehouse();
        let goal = (19, 29);
        let path = astar(&g, (0, 0), goal).expect("path should exist");
        assert_eq!(*path.last().unwrap(), goal);
    }

    #[test]
    fn astar_path_is_connected() {
        let g = warehouse();
        let start = (0, 0);
        let goal = (10, 10);
        let path = astar(&g, start, goal).expect("path should exist");

        let mut prev = start;
        for &step in &path {
            let row_diff = prev.0.abs_diff(step.0);
            let col_diff = prev.1.abs_diff(step.1);
            assert!(
                row_diff + col_diff == 1,
                "non-adjacent step {:?} → {:?}",
                prev,
                step
            );
            prev = step;
        }
    }

    #[test]
    fn astar_path_stays_passable() {
        let g = warehouse();
        let path = astar(&g, (0, 0), (19, 29)).expect("path should exist");
        for &(r, c) in &path {
            assert!(g.is_passable(r, c), "impassable cell ({},{}) in path", r, c);
        }
    }

    #[test]
    fn astar_blocked_goal_returns_none() {
        let g = warehouse();
        // (1,1) is a shelf — impassable
        assert!(astar(&g, (0, 0), (1, 1)).is_none());
    }

    #[test]
    fn astar_blocked_start_returns_none() {
        let g = warehouse();
        assert!(astar(&g, (1, 1), (0, 0)).is_none());
    }

    #[test]
    fn astar_pickup_to_dropoff() {
        let g = warehouse();
        // Pickup (0,5) → Dropoff (0,10) — should exist along corridor row 0
        let path = astar(&g, (0, 5), (0, 10)).expect("path should exist");
        assert_eq!(*path.last().unwrap(), (0, 10));
        assert!(path.len() <= 10); // Manhattan distance is 5
    }

    // ---- Space-time A* tests ----

    #[test]
    fn spacetime_no_reservation() {
        let g = warehouse();
        let reservation = SpaceTimeReservation::new();
        let path = astar_spacetime(&g, (0, 0), (0, 5), 0, &reservation, 50)
            .expect("path should exist");
        assert_eq!(*path.last().unwrap(), (0, 5));
    }

    #[test]
    fn spacetime_detours_around_reserved_cell() {
        let g = warehouse();
        let mut reservation = SpaceTimeReservation::new();
        // Block (0,3) at t=3 (the natural path would pass through it)
        for t in 0..20 {
            reservation.insert((0, 3, t), ());
        }
        let path = astar_spacetime(&g, (0, 0), (0, 5), 0, &reservation, 50)
            .expect("path should exist even with reservation");
        // Path should still reach goal
        assert_eq!(*path.last().unwrap(), (0, 5));
        // Path should never pass through (0,3)
        for &(r, c) in &path {
            assert!(!(r == 0 && c == 3), "path passed through reserved cell");
        }
    }

    #[test]
    fn spacetime_same_start_goal() {
        let g = warehouse();
        let reservation = SpaceTimeReservation::new();
        let path = astar_spacetime(&g, (0, 0), (0, 0), 0, &reservation, 50)
            .expect("empty path");
        assert!(path.is_empty());
    }
}
