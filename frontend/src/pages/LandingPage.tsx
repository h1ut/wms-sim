import { useWindowSize } from '../hooks/useWindowSize';

interface Props {
  onLaunch: () => void;
}

const FEATURES = [
  {
    icon: '🤖',
    title: 'Multi-Agent Coordination',
    desc: 'Up to 20 AGVs planned simultaneously. Prioritized Planning ensures zero cell conflicts — every robot has a collision-free path.',
  },
  {
    icon: '🧠',
    title: 'Adaptive Algorithms',
    desc: 'Switch live between independent A*, Prioritized Planning, WHCA*, and CBS. Watch how routing quality and throughput change in real time.',
  },
  {
    icon: '📊',
    title: 'Fleet Analytics & SLA',
    desc: 'Live throughput, on-time delivery rate, avg path length, and a composite efficiency score. Know your fleet\'s performance at a glance.',
  },
  {
    icon: '🏭',
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
      <nav style={{ ...s.nav, padding: mobile ? '0 16px' : '0 40px' }}>
        <span style={s.logo}>⬡ WMS<span style={{ color: '#f7b731' }}>·SIM</span></span>
        <div style={s.navRight}>
          {!mobile && <span style={s.navTag}>Hackathon Build · 2026</span>}
          <button onClick={onLaunch} style={s.navBtn}>Launch →</button>
        </div>
      </nav>

      {/* Hero */}
      <section style={{
        ...s.hero,
        flexDirection: mobile ? 'column' : 'row',
        padding: mobile ? '40px 20px 36px' : compact ? '56px 28px 48px' : '72px 40px 60px',
        gap: mobile ? 28 : 40,
      }}>
        <div style={{ ...s.heroInner, maxWidth: mobile ? '100%' : 580 }}>
          <div style={s.badge}>WAREHOUSE MANAGEMENT SYSTEM</div>
          <h1 style={{
            ...s.h1,
            fontSize: mobile ? 28 : compact ? 34 : 42,
            marginBottom: mobile ? 14 : 20,
          }}>
            Smart Routing for<br />
            <span style={{ color: '#f7b731' }}>Autonomous Fleets</span>
          </h1>
          <p style={{ ...s.sub, fontSize: mobile ? 13 : 14 }}>
            A real-time multi-agent simulation engine that assigns tasks, computes
            collision-free paths, and delivers live fleet analytics — all in a
            single browser tab.
          </p>
          <div style={{
            ...s.heroActions,
            flexWrap: 'wrap',
            gap: mobile ? 16 : 24,
          }}>
            <button onClick={onLaunch} style={s.cta}>
              Launch Simulation →
            </button>
            <div style={s.stat}>
              <span style={s.statNum}>20</span>
              <span style={s.statLabel}>Max AGVs</span>
            </div>
            <div style={s.stat}>
              <span style={s.statNum}>10ms</span>
              <span style={s.statLabel}>Tick latency</span>
            </div>
            <div style={s.stat}>
              <span style={{ ...s.statNum, color: '#20bf6b' }}>$2.4M</span>
              <span style={s.statLabel}>Saved annually</span>
            </div>
          </div>
        </div>

        {/* Mini grid preview — hide on narrow mobile to save space */}
        {!mobile && (
          <div style={s.preview}>
            <GridPreview />
          </div>
        )}
      </section>

      {/* Features */}
      <section style={{
        ...s.features,
        padding: mobile ? '0 16px 40px' : compact ? '0 28px 48px' : '0 40px 56px',
      }}>
        {FEATURES.map(f => (
          <div key={f.title} style={s.card}>
            <span style={s.cardIcon}>{f.icon}</span>
            <h3 style={s.cardTitle}>{f.title}</h3>
            <p style={s.cardDesc}>{f.desc}</p>
          </div>
        ))}
      </section>

      {/* Tech stack */}
      <section style={{
        ...s.techSection,
        padding: mobile ? '16px' : '20px 40px',
      }}>
        <span style={s.techLabel}>Built with</span>
        {TECH.map(t => (
          <span key={t} style={s.techBadge}>{t}</span>
        ))}
      </section>

      {/* CTA strip */}
      <section style={{
        ...s.ctaStrip,
        flexDirection: mobile ? 'column' : 'row',
        gap: mobile ? 16 : 28,
        padding: mobile ? '28px 20px' : '36px 40px',
      }}>
        <span style={{ color: '#a0a0c0', fontSize: 14 }}>
          Ready to coordinate your fleet?
        </span>
        <button onClick={onLaunch} style={s.cta}>
          Open Dashboard →
        </button>
      </section>
    </div>
  );
}

// ── Tiny animated grid preview ──────────────────────────────────────────────

function GridPreview() {
  const cols = 9;
  const cells: number[][] = [
    [0,1,1,0,1,1,0,1,1],
    [0,0,0,0,0,0,0,0,0],
    [0,1,1,0,1,1,0,1,1],
    [0,0,0,0,0,0,0,0,0],
    [0,1,1,0,1,1,0,1,1],
    [2,0,0,3,0,0,2,0,3],
  ];
  const cellSz = 28;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${cellSz}px)`, gap: 2, padding: 12, background: '#0d0d1a', borderRadius: 8, border: '1px solid #252545' }}>
      {cells.flatMap((row, r) =>
        row.map((v, c) => (
          <div key={`${r}-${c}`} style={{
            width: cellSz, height: cellSz, borderRadius: 3,
            background: v === 1 ? '#2d3561' : v === 2 ? '#0f9b8e' : v === 3 ? '#e84545' : '#1a1a2e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12,
          }}>
            {r === 1 && c === 2 && <span style={{ color: '#f7b731' }}>⬡</span>}
            {r === 3 && c === 5 && <span style={{ color: '#20bf6b' }}>⬡</span>}
            {r === 1 && c === 7 && <span style={{ color: '#a55eea' }}>⬡</span>}
          </div>
        ))
      )}
    </div>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = {
  root: {
    height: '100%',
    background: '#0d0d1a',
    color: '#e0e0f0',
    fontFamily: 'ui-monospace, Consolas, monospace',
    overflowY: 'auto' as const,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    borderBottom: '1px solid #252545',
    background: '#13132a',
    position: 'sticky' as const,
    top: 0,
    zIndex: 10,
  },
  logo: {
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: '0.05em',
    color: '#e0e0f0',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
  },
  navTag: {
    fontSize: 11,
    color: '#5050a0',
    letterSpacing: '0.08em',
  },
  navBtn: {
    background: 'transparent',
    color: '#f7b731',
    border: '1px solid #f7b731',
    borderRadius: 4,
    padding: '5px 14px',
    fontFamily: 'monospace',
    fontSize: 12,
    cursor: 'pointer',
    fontWeight: 700,
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1100,
    margin: '0 auto',
  },
  heroInner: {
    flex: 1,
  },
  badge: {
    display: 'inline-block',
    fontSize: 10,
    letterSpacing: '0.15em',
    color: '#f7b731',
    border: '1px solid #f7b73155',
    borderRadius: 3,
    padding: '3px 10px',
    marginBottom: 20,
  },
  h1: {
    fontWeight: 800,
    lineHeight: 1.2,
    margin: '0 0 20px',
    letterSpacing: '-0.02em',
  },
  sub: {
    color: '#7070b0',
    lineHeight: 1.7,
    margin: '0 0 36px',
    maxWidth: 480,
  },
  heroActions: {
    display: 'flex',
    alignItems: 'center',
  },
  cta: {
    background: '#f7b731',
    color: '#0d0d1a',
    border: 'none',
    borderRadius: 6,
    padding: '12px 28px',
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '0.03em',
  },
  stat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 22,
    fontWeight: 800,
    color: '#e0e0f0',
  },
  statLabel: {
    fontSize: 10,
    color: '#5050a0',
    letterSpacing: '0.05em',
  },
  preview: {
    flexShrink: 0,
  },
  features: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: 16,
    maxWidth: 1100,
    margin: '0 auto',
  },
  card: {
    background: '#13132a',
    border: '1px solid #252545',
    borderRadius: 8,
    padding: '24px 20px',
  },
  cardIcon: {
    fontSize: 28,
    display: 'block',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 700,
    margin: '0 0 8px',
    color: '#e0e0f0',
  },
  cardDesc: {
    fontSize: 12,
    color: '#6060a0',
    lineHeight: 1.6,
    margin: 0,
  },
  techSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    borderTop: '1px solid #252545',
    flexWrap: 'wrap' as const,
    maxWidth: 1100,
    margin: '0 auto',
  },
  techLabel: {
    fontSize: 11,
    color: '#5050a0',
    letterSpacing: '0.08em',
    marginRight: 4,
  },
  techBadge: {
    background: '#1a1a36',
    border: '1px solid #2d3561',
    borderRadius: 3,
    padding: '3px 10px',
    fontSize: 11,
    color: '#7070b0',
  },
  ctaStrip: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTop: '1px solid #252545',
    background: '#13132a',
  },
} as const;
