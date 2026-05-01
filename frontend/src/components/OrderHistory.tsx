import type { Order } from '../types';

interface Props {
  orders: Order[];
  currentTick: number;
}

export default function OrderHistory({ orders, currentTick }: Props) {
  const completed = orders
    .filter(o => o.status === 'completed' && o.completed_tick != null)
    .sort((a, b) => (b.completed_tick ?? 0) - (a.completed_tick ?? 0))
    .slice(0, 25);

  return (
    <div style={styles.panel}>
      <div style={styles.header}>Order History</div>
      {completed.length === 0 && (
        <div style={styles.empty}>No completed orders yet…</div>
      )}
      <div style={styles.list}>
        {completed.map(order => {
          const duration = order.completed_tick! - order.created_tick;
          const age = currentTick - order.completed_tick!;
          return (
            <div key={order.id} style={styles.row}>
              <span style={styles.orderId}>#{order.id}</span>
              <span style={styles.route}>
                ({order.pickup[0]},{order.pickup[1]})→({order.dropoff[0]},{order.dropoff[1]})
              </span>
              <div style={styles.meta}>
                <span style={styles.duration}>{duration}t</span>
                <span style={{ ...styles.age, opacity: Math.max(0.35, 1 - age / 120) }}>
                  -{age}t ago
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  panel: {
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#0f0f22',
    borderTop: '1px solid #252545',
    fontFamily: 'monospace',
    minHeight: 0,
  },
  header: {
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    color: '#5050a0',
    padding: '6px 14px 4px',
    flexShrink: 0,
  },
  empty: {
    color: '#404070',
    fontSize: 11,
    padding: '4px 14px 8px',
    fontStyle: 'italic',
  },
  list: {
    overflowY: 'auto' as const,
    flex: 1,
    paddingBottom: 4,
  },
  row: {
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '3px 14px',
    borderBottom: '1px solid #1a1a36',
    gap: 1,
  },
  orderId: {
    color: '#f7b731',
    fontSize: 11,
    fontWeight: 700,
  },
  route: {
    color: '#7070b0',
    fontSize: 10,
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  duration: {
    color: '#20bf6b',
    fontSize: 10,
  },
  age: {
    color: '#5050a0',
    fontSize: 10,
  },
} as const;
