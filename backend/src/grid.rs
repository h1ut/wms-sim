use serde::{Deserialize, Serialize};

pub const ROWS: usize = 20;
pub const COLS: usize = 30;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CellType {
    Empty,
    Shelf,
    Pickup,
    Dropoff,
}

impl CellType {
    /// Returns true if a robot can stand on this cell.
    pub fn is_passable(self) -> bool {
        matches!(self, CellType::Empty | CellType::Pickup | CellType::Dropoff)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Grid {
    pub rows: usize,
    pub cols: usize,
    cells: Vec<Vec<CellType>>,
}

impl Grid {
    /// Build the hardcoded 20×30 warehouse layout.
    ///
    /// Layout description:
    /// - Horizontal corridors at rows: 0, 5, 10, 15, 19
    /// - Vertical corridors at cols: 0, 5, 10, 15, 20, 25, 29
    /// - All other cells are shelves
    /// - Pickup  points (P): (0,5),  (0,15),  (19,5),  (19,15)
    /// - Dropoff points (D): (0,10), (0,20), (19,10), (19,20)
    pub fn new_warehouse() -> Self {
        let corridor_rows: &[usize] = &[0, 5, 10, 15, 19];
        let corridor_cols: &[usize] = &[0, 5, 10, 15, 20, 25, 29];

        let pickup_cells: &[(usize, usize)] = &[(0, 5), (0, 15), (19, 5), (19, 15)];
        let dropoff_cells: &[(usize, usize)] = &[(0, 10), (0, 20), (19, 10), (19, 20)];

        let mut cells = vec![vec![CellType::Empty; COLS]; ROWS];

        for row in 0..ROWS {
            for col in 0..COLS {
                let in_corridor_row = corridor_rows.contains(&row);
                let in_corridor_col = corridor_cols.contains(&col);

                if in_corridor_row || in_corridor_col {
                    cells[row][col] = CellType::Empty;
                } else {
                    cells[row][col] = CellType::Shelf;
                }
            }
        }

        // Overlaying special cells (they sit on corridor rows so already Empty,
        // but we set them explicitly for clarity)
        for &(r, c) in pickup_cells {
            cells[r][c] = CellType::Pickup;
        }
        for &(r, c) in dropoff_cells {
            cells[r][c] = CellType::Dropoff;
        }

        Grid { rows: ROWS, cols: COLS, cells }
    }

    /// Get the cell type at (row, col). Returns None if out of bounds.
    pub fn get(&self, row: usize, col: usize) -> Option<CellType> {
        self.cells.get(row)?.get(col).copied()
    }

    /// Returns true if the cell exists and is passable.
    pub fn is_passable(&self, row: usize, col: usize) -> bool {
        self.get(row, col).map(|c| c.is_passable()).unwrap_or(false)
    }

    /// Toggle a cell between Empty and Shelf (for runtime obstacle editing).
    /// Pickup and Dropoff cells cannot be toggled.
    pub fn toggle_obstacle(&mut self, row: usize, col: usize) -> bool {
        if row >= self.rows || col >= self.cols {
            return false;
        }
        match self.cells[row][col] {
            CellType::Empty => {
                self.cells[row][col] = CellType::Shelf;
                true
            }
            CellType::Shelf => {
                self.cells[row][col] = CellType::Empty;
                true
            }
            _ => false, // Cannot toggle Pickup/Dropoff
        }
    }

    /// Return all cells of a given type.
    pub fn cells_of_type(&self, kind: CellType) -> Vec<(usize, usize)> {
        let mut result = Vec::new();
        for row in 0..self.rows {
            for col in 0..self.cols {
                if self.cells[row][col] == kind {
                    result.push((row, col));
                }
            }
        }
        result
    }

    /// Set a cell to any specific type (used for user-placed pickups/dropoffs).
    /// Returns false if out of bounds.
    pub fn set_cell(&mut self, row: usize, col: usize, kind: CellType) -> bool {
        if row >= self.rows || col >= self.cols {
            return false;
        }
        self.cells[row][col] = kind;
        true
    }

    /// Expose the raw cell grid (read-only slice).
    pub fn cells(&self) -> &Vec<Vec<CellType>> {
        &self.cells
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn grid_dimensions() {
        let g = Grid::new_warehouse();
        assert_eq!(g.rows, ROWS);
        assert_eq!(g.cols, COLS);
    }

    #[test]
    fn corridor_cells_are_passable() {
        let g = Grid::new_warehouse();
        // Horizontal corridor row 0, various cols
        assert!(g.is_passable(0, 0));
        assert!(g.is_passable(0, 7));
        // Vertical corridor col 0, various rows
        assert!(g.is_passable(3, 0));
    }

    #[test]
    fn shelf_cells_are_impassable() {
        let g = Grid::new_warehouse();
        // (1, 1) is not a corridor row or col → Shelf
        assert!(!g.is_passable(1, 1));
        assert!(!g.is_passable(3, 3));
    }

    #[test]
    fn pickup_and_dropoff_placed_correctly() {
        let g = Grid::new_warehouse();
        assert_eq!(g.get(0, 5), Some(CellType::Pickup));
        assert_eq!(g.get(0, 15), Some(CellType::Pickup));
        assert_eq!(g.get(19, 5), Some(CellType::Pickup));
        assert_eq!(g.get(19, 15), Some(CellType::Pickup));

        assert_eq!(g.get(0, 10), Some(CellType::Dropoff));
        assert_eq!(g.get(0, 20), Some(CellType::Dropoff));
        assert_eq!(g.get(19, 10), Some(CellType::Dropoff));
        assert_eq!(g.get(19, 20), Some(CellType::Dropoff));
    }

    #[test]
    fn pickup_dropoff_are_passable() {
        let g = Grid::new_warehouse();
        assert!(g.is_passable(0, 5));
        assert!(g.is_passable(0, 10));
    }

    #[test]
    fn cells_of_type_counts() {
        let g = Grid::new_warehouse();
        assert_eq!(g.cells_of_type(CellType::Pickup).len(), 4);
        assert_eq!(g.cells_of_type(CellType::Dropoff).len(), 4);
    }

    #[test]
    fn out_of_bounds_returns_none() {
        let g = Grid::new_warehouse();
        assert_eq!(g.get(ROWS, 0), None);
        assert_eq!(g.get(0, COLS), None);
    }

    #[test]
    fn toggle_obstacle() {
        let mut g = Grid::new_warehouse();
        // A corridor cell can be turned into a shelf and back
        assert_eq!(g.get(0, 1), Some(CellType::Empty));
        g.toggle_obstacle(0, 1);
        assert_eq!(g.get(0, 1), Some(CellType::Shelf));
        g.toggle_obstacle(0, 1);
        assert_eq!(g.get(0, 1), Some(CellType::Empty));
    }

    #[test]
    fn toggle_obstacle_ignores_pickup_dropoff() {
        let mut g = Grid::new_warehouse();
        let toggled = g.toggle_obstacle(0, 5); // Pickup
        assert!(!toggled);
        assert_eq!(g.get(0, 5), Some(CellType::Pickup));
    }
}
