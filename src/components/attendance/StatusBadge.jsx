const LABELS = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  unknown: "Unknown",
};

function StatusBadge({ status }) {
  const safeStatus = LABELS[status] ? status : "unknown";
  return <span className={`bs-badge bs-badge-${safeStatus}`}>{LABELS[safeStatus]}</span>;
}

export default StatusBadge;