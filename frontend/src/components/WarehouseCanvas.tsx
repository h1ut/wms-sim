import { useCallback, useEffect, useRef } from 'react';
import type { CellValue, Order, PlacementMode, Robot } from '../types';
import { CELL_DROPOFF, CELL_PICKUP, CELL_SHELF } from '../types';

interface Props {
  rows: number;
  cols: number;
  cells: CellValue[][];
  robots: Robot[];
  orders: Order[];
  heatmap: number[][];
  showHeatmap: boolean;
  placementMode: PlacementMode;
  selectedRobotId: number | null;
  onCellClick: (row: number, col: number) => void;
  onRobotClick: (id: number | null) => void;
}

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  empty:     '#1a1a2e',
  shelf:     '#2d3561',
  pickup:    '#0f9b8e',
  dropoff:   '#e84545',
  grid:      '#222240',
  pathFill:  'rgba(247,183,49,0.18)',
  pathLine:  'rgba(247,183,49,0.5)',
  robotIdle: '#778ca3',
  robotMove: '#f7b731',
  robotPick: '#20bf6b',
  robotDrop: '#a55eea',
  cargo:     '#f7b731',
} as const;

function robotBodyColor(state: Robot['state']): string {
  switch (state) {
    case 'idle':              return C.robotIdle;
    case 'moving_to_pickup':  return C.robotMove;
    case 'picking':           return C.robotPick;
    case 'moving_to_dropoff': return C.robotMove;
    case 'dropping':          return C.robotDrop;
  }
}

// Direction of travel: look at next path step.
function travelAngle(robot: Robot): number {
  if (robot.path.length === 0) return 0;
  const [nr, nc] = robot.path[0];
  const dr = nr - robot.row;
  const dc = nc - robot.col;
  if (dc === 1)  return 0;          // right
  if (dr === 1)  return Math.PI / 2; // down
  if (dc === -1) return Math.PI;     // left
  return -Math.PI / 2;              // up
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WarehouseCanvas({
  rows, cols, cells, robots, orders,
  heatmap, showHeatmap, placementMode, selectedRobotId, onCellClick, onRobotClick,
}: Props) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const containerRef= useRef<HTMLDivElement>(null);

  const cellSize = useCallback((): number => {
    const el = containerRef.current;
    if (!el) return 20;
    return Math.floor(Math.min(el.clientWidth / cols, el.clientHeight / rows));
  }, [cols, rows]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const cs = cellSize();
    canvas.width  = cs * cols;
    canvas.height = cs * rows;

    // ── Cells ──────────────────────────────────────────────────────────────
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[r]?.[c] ?? 0;
        ctx.fillStyle =
          cell === CELL_SHELF   ? C.shelf   :
          cell === CELL_PICKUP  ? C.pickup  :
          cell === CELL_DROPOFF ? C.dropoff : C.empty;
        ctx.fillRect(c * cs, r * cs, cs, cs);
        ctx.strokeStyle = C.grid;
        ctx.lineWidth   = 0.5;
        ctx.strokeRect(c * cs, r * cs, cs, cs);
      }
    }

    // ── Heatmap ────────────────────────────────────────────────────────────
    if (showHeatmap) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const v = heatmap[r]?.[c] ?? 0;
          if (v < 0.01) continue;
          ctx.fillStyle = heatColor(v);
          ctx.fillRect(c * cs, r * cs, cs, cs);
        }
      }
    }

    // ── Path previews ──────────────────────────────────────────────────────
    for (const robot of robots) {
      if (robot.path.length === 0) continue;
      ctx.fillStyle = C.pathFill;
      for (const [pr, pc] of robot.path)
        ctx.fillRect(pc * cs + 1, pr * cs + 1, cs - 2, cs - 2);

      ctx.beginPath();
      ctx.strokeStyle = C.pathLine;
      ctx.lineWidth   = 1.5;
      ctx.moveTo(robot.col * cs + cs / 2, robot.row * cs + cs / 2);
      for (const [pr, pc] of robot.path)
        ctx.lineTo(pc * cs + cs / 2, pr * cs + cs / 2);
      ctx.stroke();
    }

    // ── Order markers ──────────────────────────────────────────────────────
    for (const order of orders) {
      if (order.status === 'completed') continue;
      drawStar(ctx,
        order.pickup[1] * cs + cs / 2, order.pickup[0] * cs + cs / 2, cs * 0.2, C.pickup);
      drawDiamond(ctx,
        order.dropoff[1] * cs + cs / 2, order.dropoff[0] * cs + cs / 2, cs * 0.2, C.dropoff);
    }

    // ── Robots (AGV sprites) ───────────────────────────────────────────────
    for (const robot of robots) {
      const cx = robot.col * cs + cs / 2;
      const cy = robot.row * cs + cs / 2;
      drawAGV(ctx, cx, cy, cs, robot, robot.id === selectedRobotId);
    }
  }, [rows, cols, cells, robots, orders, heatmap, showHeatmap, cellSize, selectedRobotId]);

  useEffect(() => { draw(); }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => draw());
    obs.observe(el);
    return () => obs.disconnect();
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cs   = cellSize();
    const col  = Math.floor((e.clientX - rect.left)  / cs);
    const row  = Math.floor((e.clientY - rect.top) / cs);
    if (row < 0 || row >= rows || col < 0 || col >= cols) return;
    const hit = robots.find(r => r.row === row && r.col === col);
    if (hit) { onRobotClick(hit.id === selectedRobotId ? null : hit.id); return; }
    onRobotClick(null);
    onCellClick(row, col);
  }, [cellSize, rows, cols, robots, selectedRobotId, onCellClick, onRobotClick]);

  const cursorStyle =
    placementMode === 'erase'   ? 'not-allowed' :
    placementMode === 'pickup'  ? 'cell' :
    placementMode === 'dropoff' ? 'cell' : 'crosshair';

  return (
    <div
      ref={containerRef}
      style={{ flex: 1, overflow: 'hidden', display: 'flex',
               alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}
    >
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        style={{ cursor: cursorStyle, imageRendering: 'pixelated' }}
      />
    </div>
  );
}

// ── AGV sprite ────────────────────────────────────────────────────────────────

function drawAGV(ctx: CanvasRenderingContext2D, cx: number, cy: number, cs: number, robot: Robot, selected = false) {
  if (selected) {
    ctx.beginPath();
    ctx.arc(cx, cy, cs * 0.48, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const angle    = travelAngle(robot);
  const bodyColor = robotBodyColor(robot.state);
  const carrying = robot.state === 'moving_to_dropoff' || robot.state === 'dropping';
  const w  = cs * 0.46; // half-width
  const h  = cs * 0.32; // half-height

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, -w + 1, -h + 1, w * 2, h * 2, h * 0.35);
  ctx.fill();

  // Body
  ctx.fillStyle = bodyColor;
  roundRect(ctx, -w, -h, w * 2, h * 2, h * 0.35);
  ctx.fill();

  // Top highlight stripe
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, -w, -h, w * 2, h * 0.6, h * 0.35);
  ctx.fill();

  // White border
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 0.8;
  roundRect(ctx, -w, -h, w * 2, h * 2, h * 0.35);
  ctx.stroke();

  // Fork tines (pointing forward = +x direction before rotation)
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillRect(w - 1, -h * 0.55, cs * 0.2, h * 0.22);
  ctx.fillRect(w - 1,  h * 0.33, cs * 0.2, h * 0.22);

  // Wheels (four corners)
  ctx.fillStyle = '#111130';
  for (const [wx, wy] of [
    [-w * 0.72, -h], [-w * 0.72, h],
    [ w * 0.55, -h], [ w * 0.55,  h],
  ]) {
    ctx.beginPath();
    ctx.ellipse(wx, wy, cs * 0.065, cs * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Status LED (top-right of body)
  ctx.beginPath();
  ctx.arc(w * 0.6, -h * 0.6, cs * 0.045, 0, Math.PI * 2);
  ctx.fillStyle = bodyColor === C.robotIdle ? '#aaa' : '#fff';
  ctx.fill();

  // Cargo box (floating above body when carrying)
  if (carrying) {
    ctx.fillStyle = C.cargo;
    ctx.fillRect(-w * 0.45, -h - cs * 0.22, w * 0.9, cs * 0.18);
    ctx.strokeStyle = '#c07800';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(-w * 0.45, -h - cs * 0.22, w * 0.9, cs * 0.18);
    // X mark on cargo
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(-w * 0.45, -h - cs * 0.22);
    ctx.lineTo(-w * 0.45 + w * 0.9, -h - cs * 0.22 + cs * 0.18);
    ctx.moveTo(-w * 0.45 + w * 0.9, -h - cs * 0.22);
    ctx.lineTo(-w * 0.45, -h - cs * 0.22 + cs * 0.18);
    ctx.stroke();
  }

  ctx.restore();

  // ID label (always upright, never rotated)
  if (cs >= 18) {
    ctx.fillStyle    = '#fff';
    ctx.font         = `bold ${Math.max(7, Math.floor(cs * 0.22))}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(robot.id), cx, cy);
  }
}

// ── Canvas utilities ──────────────────────────────────────────────────────────

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function heatColor(t: number): string {
  const v = Math.max(0, Math.min(1, t));
  let r: number, g: number, b: number;
  if (v < 0.25)      { const s = v / 0.25;        r = 0;           g = Math.round(s * 180); b = 255; }
  else if (v < 0.5)  { const s = (v - 0.25)/0.25; r = 0;           g = 180;                  b = Math.round((1-s)*255); }
  else if (v < 0.75) { const s = (v - 0.5) /0.25; r = Math.round(s*255); g = 180;            b = 0; }
  else               { const s = (v - 0.75)/0.25; r = 255; g = Math.round((1-s)*180);         b = 0; }
  const alpha = 0.3 + v * 0.5;
  return `rgba(${r},${g},${b},${alpha})`;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = (i * 4 * Math.PI) / 5 - Math.PI / 2;
    const x = cx + size * Math.cos(a), y = cy + size * Math.sin(a);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}

function drawDiamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - size); ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size); ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fillStyle = color; ctx.fill();
}
