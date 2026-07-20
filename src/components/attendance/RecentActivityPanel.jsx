import { Fingerprint } from "lucide-react";
import StatusBadge from "./StatusBadge";

function RecentActivityPanel({ records }) {
  return (
    <div className="bs-card bs-activity-card">
      <div className="bs-card-header">
        <h3>Recent Check-ins</h3>
        <span className="bs-live-indicator">
          <span className="bs-live-dot" />
          Live
        </span>
      </div>

      <ul className="bs-activity-list">
        {records.length === 0 && <li className="bs-table-empty">No recent activity.</li>}
        {records.map((r) => (
          <li key={r.id} className="bs-activity-item">
            <span className="bs-activity-icon">
              <Fingerprint size={16} />
            </span>
            <div className="bs-activity-details">
              <span className="bs-activity-name">{r.name}</span>
              <span className="bs-activity-meta">
                {r.method} · {r.timeLabel}
              </span>
            </div>
            <StatusBadge status={r.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RecentActivityPanel;