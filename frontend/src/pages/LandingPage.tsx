import { useEffect, useRef } from 'react';
import { useWindowSize } from '../hooks/useWindowSize';

interface Props {
  onLaunch: () => void;
}

const FEATURES = [
  {
    num: '01',
    title: 'Multi-Agent Coordination',
    desc: 'Up to 20 AGVs planned simultaneously. Prioritized Planning ensures zero cell conflicts — every robot has a collision-free path.',
  },
  {
    num: '02',
    title: 'Adaptive Algorithms',
    desc: 'Switch live between independent A*, Prioritized Planning, WHCA*, and CBS. Watch routing quality and throughput change in real time.',
  },
  {
    num: '03',
    title: 'Fleet Analytics & SLA',
    desc: 'Live throughput, on-time delivery rate, avg path length, and a composite efficiency score. Know your fleet\'s performance at a glance.',
  },
  {
    num: '04',
    title: 'Interactive Layout Editor',
    desc: 'Click to place shelves, pickup stations, and dropoff bays. Rebuild the warehouse mid-simulation and watch routing adapt instantly.',
  },
];

const TECH = ['Rust', 'Axum', 'Tokio', 'WebSocket', 'React', 'TypeScript', 'Canvas API'];

export default function LandingPage({ onLaunch }: Props) {
  const { width } = useWindowSize();
  const mobile  = width < 768;
  const compact = width < 1024;

  return (
    <div style={s.root}>
      {/* Nav */}
      <nav style={{ ...s.nav, padding: mobile ? '0 20px' : '0 48px' }}>
        <span style={s.logo}>
          WMS<span style={{ color: 'var(--accent)' }}>·</span>SIM
        </span>
        <div style={s.navRight}>
          {!mobile && (
            <span style={s.navTag}>Hackathon Build · 2026</span>
          )}
          <button onClick={onLaunch} style={s.navBtn}>
            Launch Simulation
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        ...s.hero,
        padding: mobile ? '56px 20px 48px' : compact ? '72px 48px 64px' : '96px 48px 80px',
      }}>
        {/* Radial glow */}
        <div style={s.heroGlow} aria-hidden />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          <div style={s.badge}>
            WAREHOUSE MANAGEMENT SYSTEM
          </div>

          <h1 style={{
            ...s.h1,
            fontSize: mobile ? 36 : compact ? 52 : 68,
          }}>
            Smart Routing<br />
            for{' '}
            <em style={{ color: 'var(--accent)', fontStyle: 'italic' }}>
              Autonomous Fleets
            </em>
          </h1>

          <p style={{ ...s.sub, fontSize: mobile ? 14 : 15 }}>
            A real-time multi-agent simulation engine that assigns tasks, computes
            collision-free paths, and delivers live fleet analytics —
            all in a single browser tab.
          </p>

          <div style={{
            display: 'flex',
            alignItems: mobile ? 'flex-start' : 'center',
            flexDirection: mobile ? 'column' : 'row',
            gap: mobile ? 28 : 40,
            flexWrap: 'wrap',
          }}>
            <button onClick={onLaunch} style={s.cta}>
              Open Dashboard →
            </button>
            <div style={s.stats}>
              <Stat num="20" label="Max AGVs" />
              <div style={s.statDivider} />
              <Stat num="10ms" label="Tick latency" />
              <div style={s.statDivider} />
              <Stat num="$2.4M" label="Saved annually" accent />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{
        ...s.featuresSection,
        padding: mobile ? '0 20px 56px' : compact ? '0 48px 64px' : '0 48px 80px',
      }}>
        <div style={s.featuresGrid(mobile)}>
          {FEATURES.map(f => (
            <FeatureCard key={f.num} {...f} />
          ))}
        </div>
      </section>

      {/* Preview strip */}
      <section style={{
        ...s.previewStrip,
        padding: mobile ? '36px 20px' : '48px 48px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
          <p style={s.previewLabel}>Live simulation preview</p>
          <GridPreview />
        </div>
      </section>

      {/* Tech stack */}
      <section style={{
        ...s.techSection,
        padding: mobile ? '20px' : '24px 48px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          <span style={s.techLabel}>Built with</span>
          {TECH.map(t => (
            <span key={t} style={s.techBadge}>{t}</span>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section style={{
        ...s.ctaStrip,
        flexDirection: mobile ? 'column' : 'row',
        gap: mobile ? 20 : 32,
        padding: mobile ? '40px 20px' : '52px 48px',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: mobile ? 20 : 32 }}>
          <div>
            <p style={{ color: 'var(--text)', fontSize: mobile ? 20 : 24, fontFamily: 'var(--display)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8 }}>
              Ready to coordinate your fleet?
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, fontFamily: 'var(--sans)' }}>
              Zero setup. Runs entirely in your browser.
            </p>
          </div>
          <button onClick={onLaunch} style={{ ...s.cta, flexShrink: 0 }}>
            Open Dashboard →
          </button>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Stat({ num, label, accent }: { num: string; label: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 22, fontWeight: 700, color: accent ? 'var(--green)' : 'var(--text)', letterSpacing: '-0.02em', fontFamily: 'var(--mono)' }}>
        {num}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: 'var(--sans)' }}>
        {label}
      </span>
    </div>
  );
}

function FeatureCard({ num, title, desc }: { num: string; title: string; desc: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (ref.current) {
      ref.current.style.borderColor = 'var(--border-2)';
      ref.current.style.background = 'var(--surface-2)';
    }
  };
  const handleLeave = () => {
    if (ref.current) {
      ref.current.style.borderColor = 'var(--border)';
      ref.current.style.background = 'var(--surface)';
    }
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={s.card}
    >
      <span style={s.cardNum}>{num}</span>
      <h3 style={s.cardTitle}>{title}</h3>
      <p style={s.cardDesc}>{desc}</p>
    </div>
  );
}

function GridPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef  = useRef(0);
  const tickRef   = useRef(0);

  // Robot positions: [row, col, color]
  const robots = useRef([
    { r: 1, c: 1, tr: 5, tc: 7, color: '#f7b731' },
    { r: 3, c: 7, tr: 1, tc: 3, color: '#20bf6b' },
    { r: 5, c: 4, tr: 2, tc: 1, color: '#a55eea' },
  ]);

  const ROWS = 7, COLS = 11;
  const SHELVES = new Set(['1,1','1,2','1,4','1,5','1,7','1,8','3,1','3,2','3,4','3,5','3,7','3,8']);
  const PICKUPS  = new Set(['0,3','0,9']);
  const DROPOFFS = new Set(['6,3','6,9']);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const CELL = 36, GAP = 2;
    canvas.width  = COLS * (CELL + GAP) - GAP;
    canvas.height = ROWS * (CELL + GAP) - GAP;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const key = `${r},${c}`;
          const x = c * (CELL + GAP);
          const y = r * (CELL + GAP);

          let bg = '#0e0e1c';
          if (SHELVES.has(key))  bg = '#1c1c38';
          if (PICKUPS.has(key))  bg = '#0f3d35';
          if (DROPOFFS.has(key)) bg = '#3d1515';

          ctx.fillStyle = bg;
          ctx.fillRect(x, y, CELL, CELL);

          if (PICKUPS.has(key)) {
            ctx.fillStyle = '#0f9b8e44';
            ctx.fillRect(x, y, CELL, CELL);
            ctx.fillStyle = '#0f9b8e';
            ctx.font = '600 12px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('P', x + CELL / 2, y + CELL / 2);
          }
          if (DROPOFFS.has(key)) {
            ctx.fillStyle = '#e8454544';
            ctx.fillRect(x, y, CELL, CELL);
            ctx.fillStyle = '#e84545';
            ctx.font = '600 12px Inter, system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('D', x + CELL / 2, y + CELL / 2);
          }
        }
      }

      // Draw robots
      robots.current.forEach(bot => {
        const x = bot.c * (CELL + GAP) + CELL / 2;
        const y = bot.r * (CELL + GAP) + CELL / 2;
        const radius = CELL * 0.28;

        ctx.beginPath();
        ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
        ctx.fillStyle = bot.color + '22';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = bot.color;
        ctx.fill();
      });

      frameRef.current = requestAnimationFrame(() => {
        tickRef.current++;
        if (tickRef.current % 30 === 0) {
          robots.current.forEach(bot => {
            // Move one step toward target
            if (bot.r !== bot.tr) bot.r += bot.r < bot.tr ? 1 : -1;
            else if (bot.c !== bot.tc) bot.c += bot.c < bot.tc ? 1 : -1;
            else {
              // Reached target — pick new target
              bot.tr = Math.floor(Math.random() * ROWS);
              bot.tc = Math.floor(Math.random() * COLS);
            }
          });
        }
        draw();
      });
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div style={{ display: 'inline-block', border: '1px solid var(--border)', padding: 12, background: 'var(--bg)' }}>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = {
  root: {
    height: '100%',
    background: 'var(--bg)',
    color: 'var(--text)',
    fontFamily: 'var(--sans)',
    overflowY: 'auto' as const,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 60,
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
    backdropFilter: 'blur(8px)',
  },
  logo: {
    fontSize: 16,
    fontWeight: 800,
    letterSpacing: '0.04em',
    color: 'var(--text)',
    fontFamily: 'var(--display)',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  navTag: {
    fontSize: 11,
    color: 'var(--text-dim)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    fontFamily: 'var(--sans)',
  },
  navBtn: {
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
    borderRadius: 2,
    padding: '6px 16px',
    fontFamily: 'var(--sans)',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 600,
    letterSpacing: '0.02em',
    transition: 'background 0.15s',
  },
  hero: {
    position: 'relative' as const,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute' as const,
    top: -200,
    left: '30%',
    transform: 'translateX(-50%)',
    width: 700,
    height: 700,
    background: 'radial-gradient(ellipse at center, #f7b73112 0%, transparent 70%)',
    pointerEvents: 'none' as const,
    zIndex: 0,
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: 10,
    letterSpacing: '0.18em',
    color: 'var(--accent)',
    border: '1px solid var(--accent-dim)',
    borderRadius: 0,
    padding: '4px 12px',
    marginBottom: 28,
    fontFamily: 'var(--mono)',
    textTransform: 'uppercase' as const,
  },
  h1: {
    fontFamily: 'var(--display)',
    fontWeight: 700,
    lineHeight: 1.08,
    margin: '0 0 24px',
    letterSpacing: '-0.03em',
    color: 'var(--text)',
  },
  sub: {
    color: 'var(--text-muted)',
    lineHeight: 1.7,
    margin: '0 0 40px',
    maxWidth: 520,
    fontFamily: 'var(--sans)',
    fontSize: 15,
    fontWeight: 400,
  },
  stats: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  statDivider: {
    width: 1,
    height: 32,
    background: 'var(--border)',
  },
  cta: {
    background: 'var(--accent)',
    color: '#08080f',
    border: 'none',
    borderRadius: 2,
    padding: '13px 28px',
    fontFamily: 'var(--sans)',
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.01em',
    transition: 'opacity 0.15s',
    flexShrink: 0 as const,
  },
  featuresSection: {
    maxWidth: 'none',
  },
  featuresGrid: (mobile: boolean) => ({
    display: 'grid',
    gridTemplateColumns: mobile ? '1fr' : 'repeat(4, 1fr)',
    gap: 0,
    maxWidth: 1100,
    margin: '0 auto',
    border: '1px solid var(--border)',
  }),
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    margin: -1,
    padding: '28px 24px',
    transition: 'background 0.15s, border-color 0.15s',
    cursor: 'default',
  },
  cardNum: {
    display: 'block',
    fontSize: 10,
    color: 'var(--accent)',
    letterSpacing: '0.12em',
    marginBottom: 14,
    fontWeight: 700,
    fontFamily: 'var(--mono)',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    margin: '0 0 10px',
    color: 'var(--text)',
    letterSpacing: '-0.01em',
    fontFamily: 'var(--sans)',
  },
  cardDesc: {
    fontSize: 13,
    color: 'var(--text-muted)',
    lineHeight: 1.65,
    margin: 0,
    fontFamily: 'var(--sans)',
  },
  previewStrip: {
    borderTop: '1px solid var(--border)',
  },
  previewLabel: {
    fontSize: 10,
    letterSpacing: '0.14em',
    color: 'var(--text-dim)',
    textTransform: 'uppercase' as const,
    marginBottom: 16,
    fontFamily: 'var(--mono)',
  },
  techSection: {
    borderTop: '1px solid var(--border)',
    borderBottom: '1px solid var(--border)',
  },
  techLabel: {
    fontSize: 11,
    color: 'var(--text-dim)',
    letterSpacing: '0.06em',
    marginRight: 8,
    fontFamily: 'var(--sans)',
  },
  techBadge: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 0,
    padding: '4px 10px',
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.03em',
    fontFamily: 'var(--mono)',
  },
  ctaStrip: {
    display: 'flex',
    alignItems: 'center',
    background: 'var(--surface)',
    borderTop: '1px solid var(--border)',
  },
} as const;
