# WMS·SIM — Warehouse Multi-Agent Routing Simulator

A real-time multi-agent simulation engine that assigns tasks to autonomous robots, computes collision-free paths, and delivers live fleet analytics — all in a single browser tab.

Built for a hackathon in **Rust + React**.

---

## Features

- **3 Planning Algorithms** switchable live:
  - `A* (independent)` — fast, no collision avoidance
  - `Prioritized Planning` — space-time A*, guaranteed collision-free
  - `CBS (Conflict-Based Search)` — optimal multi-agent pathfinding
- **Hungarian Algorithm** — O(n³) optimal task-to-robot assignment
- **Live Fleet Analytics** — throughput, SLA rate, avg path length, collision count
- **Business ROI Panel** — configurable $/collision and $/late-order, live P&L
- **Throughput Sparkline** — orders/tick history over last 60 ticks
- **Algorithm Benchmark** — runs both algorithms for N ticks, side-by-side comparison
- **Interactive Layout Editor** — place shelves, pickup stations, dropoff bays mid-simulation
- **Heatmap** — traffic intensity overlay per corridor
- **Robot Inspector** — click any robot to see its state, order, and path
- **Pause / Resume / Step-tick** — walk through the simulation tick by tick
- **Single binary deploy** — Rust serves the built frontend via `tower-http`

---

## Architecture

```
backend/   Rust · Axum · Tokio · WebSocket
  src/
    main.rs         — server, WebSocket handler, broadcast loop
    grid.rs         — 20×30 warehouse grid, cell types
    robot.rs        — robot state machine
    orders.rs       — order lifecycle
    pathfinding.rs  — A* and space-time A*
    planner.rs      — Hungarian assignment, Prioritized, CBS
    simulation.rs   — tick loop, command handler
    messages.rs     — WebSocket message types (serde JSON)

frontend/  React · TypeScript · Vite · Canvas API
  src/
    App.tsx
    components/     WarehouseCanvas, MetricsPanel, Controls, OrderHistory, Instructions
    hooks/          useWebSocket.ts
    pages/          LandingPage.tsx
    types.ts
```

---

## Running locally

**Requirements:** Rust (stable), Node.js 18+

```bash
# Terminal 1 — backend
cd backend
cargo run

# Terminal 2 — frontend dev server (proxies /ws to :3001)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## Production build (single binary)

```bash
cd frontend && npm run build   # outputs frontend/dist/
cd ../backend && cargo run     # serves dist/ + /ws on :3001
```

Open http://localhost:3001

---

## WebSocket Protocol

### Server → Client (every tick)
```json
{ "type": "state", "tick": 42, "paused": false,
  "robots": [{ "id": 0, "row": 3, "col": 5, "state": "moving_to_pickup", "path": [[3,6],[3,7]] }],
  "orders": [{ "id": 1, "pickup": [0,5], "dropoff": [19,10], "status": "assigned" }],
  "metrics": { "throughput": 12, "collisions": 0, "algorithm": "cbs", "tps": 5 } }
```

### Client → Server
```json
{ "type": "set_speed",      "tps": 10 }
{ "type": "set_algorithm",  "algorithm": "cbs" }
{ "type": "add_robots",     "count": 1 }
{ "type": "remove_robot" }
{ "type": "reset_simulation" }
{ "type": "set_paused",     "paused": true }
{ "type": "step_tick" }
{ "type": "stress_test" }
{ "type": "run_benchmark",  "ticks": 150 }
{ "type": "toggle_obstacle","row": 3, "col": 5 }
{ "type": "set_cell",       "row": 0, "col": 5, "cell_type": "pickup" }
```

---

## Tech stack

`Rust` · `Axum` · `Tokio` · `WebSocket` · `React` · `TypeScript` · `Canvas API` · `Vite`
