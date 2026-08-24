import ActivityItem from './ActivityItem.jsx';

export default function ActivityTimeline({ items = [], onOpen = () => {} }) {
  if (!items || items.length === 0) return (
    <div className="activity-empty-centered">
      <p className="empty-hint">No recent activity</p>
    </div>
  );

  return (
    <ul className="activity-timeline">
      {items.map((it, idx) => (
        <li key={idx}>
          <ActivityItem item={it} onOpen={() => onOpen(it)} />
        </li>
      ))}
    </ul>
  );
}
