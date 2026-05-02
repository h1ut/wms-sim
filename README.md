# WMS·SIM — Warehouse Multi-Agent Routing Simulator

A real-time multi-agent simulation engine that assigns tasks to autonomous robots, computes collision-free paths, and delivers live fleet analytics — all in a single browser tab.

Built for a hackathon in **Rust + React**.

---

## Features

- **4 Planning Algorithms** switchable live:
  - `A* (independent)` — fast, no collision avoidance
  - `Prioritized Planning` — space-time A*, guaranteed collision-free, fixed priority by robot ID
  - `WHCA* (Cooperative)` — space-time A* with dynamic per-tick priority based on journey urgency; shorter planning window (30 ticks) makes it faster than Prioritized in dense scenarios
  - `CBS (Conflict-Based Search)` — iterative conflict resolution with vertex + swap conflict detection
- **Hungarian Algorithm** — O(n³) optimal task-to-robot assignment
- **Live Fleet Analytics** — throughput, SLA rate, avg path length, collision count
- **Business ROI Panel** — configurable $/collision and $/late-order, live P&L estimate
- **Throughput Sparkline** — orders/tick history
- **Algorithm Benchmark** — runs Prioritized vs A* for N ticks, side-by-side stats
- **Interactive Layout Editor** — place shelves, pickup stations, dropoff bays mid-simulation
- **Heatmap** — traffic intensity overlay per corridor
- **Robot Inspector** — click any robot to see its state, assigned order, and planned path
- **Pause / Resume / Step-tick** — walk through the simulation one tick at a time
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
    planner.rs      — Hungarian assignment, A*, Prioritized, WHCA*, CBS
    simulation.rs   — tick loop, command handler, algorithm selector
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
# Terminal 1 — backend (WebSocket + API on :3001)
cd backend
cargo run

# Terminal 2 — frontend dev server (proxies /ws → :3001)
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Production build (single binary, single port)

```bash
# 1. Build the frontend — outputs directly into backend/dist/
cd frontend
npm run build

# 2. Run the backend — serves frontend + WebSocket on :3001
cd ../backend
cargo run --release
```

Open **http://localhost:3001**

---

## Docker

```bash
# Build and run
docker build -t wms-sim .
docker run -p 3001:3001 wms-sim
```

Open **http://localhost:3001**

---

## Deploy to Railway (free tier)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Railway auto-detects the `Dockerfile` and builds it
4. Set the exposed port to **3001** in Railway's settings if not auto-detected
5. Your app is live at `https://<your-project>.up.railway.app`

---

## WebSocket Protocol

### Server → Client (every tick)
```json
{ "type": "state", "tick": 42, "paused": false,
  "robots": [{ "id": 0, "row": 3, "col": 5, "state": "moving_to_pickup", "path": [[3,6],[3,7]] }],
  "orders": [{ "id": 1, "pickup": [0,5], "dropoff": [19,10], "status": "assigned" }],
  "metrics": { "throughput": 12, "collisions": 0, "algorithm": "whca", "tps": 5 } }
```

### Client → Server
```json
{ "type": "set_speed",      "tps": 10 }
{ "type": "set_algorithm",  "algorithm": "prioritized" }
{ "type": "set_algorithm",  "algorithm": "whca" }
{ "type": "set_algorithm",  "algorithm": "cbs" }
{ "type": "set_algorithm",  "algorithm": "astar" }
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
