mod grid;
mod messages;
mod orders;
mod pathfinding;
mod planner;
mod robot;
mod simulation;

use std::{sync::Arc, time::Duration};

use axum::{
    extract::{
        ws::{Message, WebSocket},
        State, WebSocketUpgrade,
    },
    response::IntoResponse,
    routing::get,
    Router,
};
use tower_http::services::{ServeDir, ServeFile};
use futures_util::{SinkExt, StreamExt};
use tokio::sync::{broadcast, Mutex};

use messages::{ClientCommand, ServerMessage};
use simulation::SimulationState;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

type SharedState = Arc<Mutex<SimulationState>>;
/// Broadcast channel carrying serialized JSON strings to all connected clients.
type Broadcaster = Arc<broadcast::Sender<String>>;
type AppState = (SharedState, Broadcaster);

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .init();

    let (tx, _rx) = broadcast::channel::<String>(128);
    let broadcaster: Broadcaster = Arc::new(tx);
    let shared: SharedState = Arc::new(Mutex::new(SimulationState::new()));

    // Simulation loop — runs tick() at the configured TPS, broadcasts state.
    {
        let shared = Arc::clone(&shared);
        let broadcaster = Arc::clone(&broadcaster);
        tokio::spawn(async move {
            loop {
                let (tps, maybe_json) = {
                    let mut sim = shared.lock().await;
                    if !sim.paused { sim.tick(); }
                    let tps = sim.tps;
                    let json = sim.to_state_message_json();
                    (tps, json)
                };
                if let Some(json) = maybe_json {
                    // Ignore send errors — no clients connected is fine.
                    let _ = broadcaster.send(json);
                }
                let interval_ms = 1000u64 / tps.max(1) as u64;
                tokio::time::sleep(Duration::from_millis(interval_ms)).await;
            }
        });
    }

    let app_state: AppState = (Arc::clone(&shared), Arc::clone(&broadcaster));

    // Serve the frontend build. Falls back to index.html for SPA routing.
    let serve_dir = ServeDir::new("dist").fallback(ServeFile::new("dist/index.html"));

    let app = Router::new()
        .route("/ws", get(ws_handler))
        .with_state(app_state)
        .fallback_service(serve_dir);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .expect("Failed to bind port 3001");

    tracing::info!("Warehouse sim server listening on ws://0.0.0.0:3001/ws");
    axum::serve(listener, app)
        .await
        .expect("Server error");
}

// ---------------------------------------------------------------------------
// WebSocket handler
// ---------------------------------------------------------------------------

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(app_state): State<AppState>,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| handle_socket(socket, app_state))
}

async fn handle_socket(socket: WebSocket, (shared, broadcaster): AppState) {
    let (mut ws_tx, mut ws_rx) = socket.split();

    // Send the one-time init message (grid layout).
    {
        let sim = shared.lock().await;
        let init: ServerMessage = sim.to_init_message();
        match serde_json::to_string(&init) {
            Ok(json) => {
                if ws_tx.send(Message::Text(json)).await.is_err() {
                    return; // client already gone
                }
            }
            Err(e) => {
                tracing::error!("Failed to serialize init message: {e}");
                return;
            }
        }
    }

    // Subscribe to the broadcast channel BEFORE spawning the forward task.
    let mut rx = broadcaster.subscribe();

    // Task A: forward broadcast messages → WebSocket client.
    let mut send_task = tokio::spawn(async move {
        loop {
            match rx.recv().await {
                Ok(json) => {
                    if ws_tx.send(Message::Text(json)).await.is_err() {
                        break;
                    }
                }
                Err(broadcast::error::RecvError::Lagged(n)) => {
                    tracing::warn!("Client lagged {n} messages — skipping");
                }
                Err(broadcast::error::RecvError::Closed) => break,
            }
        }
    });

    // Task B: receive commands WebSocket client → simulation.
    let broadcaster_recv = Arc::clone(&broadcaster);
    let mut recv_task = tokio::spawn(async move {
        while let Some(result) = ws_rx.next().await {
            match result {
                Ok(Message::Text(text)) => {
                    match serde_json::from_str::<ClientCommand>(&text) {
                        Ok(cmd) => {
                            // Handle command and release the lock immediately.
                            let benchmark_job = {
                                let mut sim = shared.lock().await;
                                sim.handle_command(cmd)
                                // Lock released here.
                            };
                            // If it's a benchmark, run it off the hot path in a
                            // background task — the live simulation keeps ticking.
                            if let Some((snapshot, ticks)) = benchmark_job {
                                let bc = Arc::clone(&broadcaster_recv);
                                tokio::spawn(async move {
                                    let payload = snapshot.run_benchmark(ticks);
                                    let msg = messages::ServerMessage::BenchmarkResult(payload);
                                    if let Ok(json) = serde_json::to_string(&msg) {
                                        let _ = bc.send(json);
                                    }
                                });
                            }
                        }
                        Err(e) => tracing::warn!("Unknown command: {e} — raw: {text}"),
                    }
                }
                Ok(Message::Close(_)) | Err(_) => break,
                _ => {} // Binary, Ping, Pong — ignore
            }
        }
    });

    // When either task ends (client disconnect / server shutdown), abort the other.
    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    }
    tracing::info!("Client disconnected");
}
