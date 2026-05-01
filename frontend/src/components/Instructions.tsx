interface Props {
  onClose: () => void;
}

export default function Instructions({ onClose }: Props) {
  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.panel} onClick={e => e.stopPropagation()}>
        <div style={s.header}>
          <span style={s.title}>How to use the simulator</span>
          <button onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        <div style={s.body}>
          <Section title="Controls bar (bottom)">
            <Row icon="⚡" label="Speed slider" desc="1–20 ticks/sec. Higher = faster simulation." />
            <Row icon="🧠" label="Algorithm" desc="Prioritized Planning = collision-free paths. A* (independent) = faster but robots may overlap." />
            <Row icon="➕" label="+5 Robots" desc="Spawns 5 more AGVs at corridor intersections." />
            <Row icon="🚨" label="Stress Test" desc="Instantly adds 10 robots and 10 orders. Good for load testing the planner." />
            <Row icon="🌡" label="Heatmap" desc="Toggles a traffic overlay — blue (cold) → red (hot). Shows which corridors get the most traffic." />
          </Section>

          <Section title="Placement mode (toolbar)">
            <Row icon="🚧" label="Obstacle" desc="Click any empty cell to place a shelf. Click a shelf to remove it." />
            <Row icon="🟢" label="Pickup" desc="Click any cell to place a new pickup station. Robots will be assigned orders from it." />
            <Row icon="🔴" label="Dropoff" desc="Click any cell to place a new dropoff bay." />
            <Row icon="🧹" label="Erase" desc="Click any cell to clear it (sets to empty corridor)." />
          </Section>

          <Section title="Reading the warehouse">
            <Row icon="⬡" label="Robots" desc="Colored hexagons. Color = current state (see legend in sidebar). Number = robot ID." />
            <Row icon="★" label="Pickup star" desc="Teal star marks an order's pickup location." />
            <Row icon="◆" label="Dropoff diamond" desc="Red diamond marks an order's dropoff location." />
            <Row icon="—" label="Yellow lines" desc="Planned path for each robot. Updates every tick." />
            <Row icon="📦" label="Cargo box" desc="Small box above robot = currently carrying a load." />
          </Section>

          <Section title="Performance metrics">
            <Row icon="🏆" label="Score" desc="Composite KPI: throughput × on-time rate, penalised for collisions." />
            <Row icon="📋" label="SLA" desc="Orders must complete within 150 ticks. Late = counts against on-time rate." />
            <Row icon="💥" label="Collisions" desc="Two robots on the same cell. Only possible with A* (independent) algorithm." />
          </Section>

          <Section title="Tips">
            <ul style={s.tips}>
              <li>Start with <strong>Prioritized</strong> algorithm — zero collisions guaranteed.</li>
              <li>Switch to <strong>A* independent</strong> to see why collision avoidance matters.</li>
              <li>Use <strong>Stress Test</strong> then watch the heatmap fill up — corridors at row 5, 10, 15 will run hottest.</li>
              <li>Add a Pickup station next to a Dropoff station for very short orders and high throughput scores.</li>
              <li>Block a corridor mid-simulation — robots will reroute within 1 tick.</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={s.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}

function Row({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  return (
    <div style={s.row}>
      <span style={s.rowIcon}>{icon}</span>
      <span style={s.rowLabel}>{label}</span>
      <span style={s.rowDesc}>{desc}</span>
    </div>
  );
}

const s = {
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  panel: {
    background: '#13132a',
    border: '1px solid #252545',
    borderRadius: 10,
    width: 620,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    fontFamily: 'monospace',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    borderBottom: '1px solid #252545',
    flexShrink: 0,
  },
  title: {
    fontWeight: 700,
    fontSize: 14,
    color: '#f7b731',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#6060a0',
    fontSize: 16,
    cursor: 'pointer',
    padding: '0 4px',
  },
  body: {
    overflowY: 'auto' as const,
    padding: '16px 20px',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    color: '#5050a0',
    marginBottom: 10,
    paddingBottom: 4,
    borderBottom: '1px solid #1a1a36',
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '24px 110px 1fr',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 7,
    fontSize: 12,
  },
  rowIcon: {
    textAlign: 'center' as const,
  },
  rowLabel: {
    color: '#e0e0f0',
    fontWeight: 700,
    fontSize: 11,
  },
  rowDesc: {
    color: '#7070b0',
    fontSize: 11,
    lineHeight: 1.5,
  },
  tips: {
    margin: 0,
    paddingLeft: 18,
    color: '#7070b0',
    fontSize: 11,
    lineHeight: 2,
  },
} as const;
