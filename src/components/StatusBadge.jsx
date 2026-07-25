import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

/**
 * StatusBadge
 * Displays a colored pill with an icon representing an attendance status.
 *
 * Props:
 *  - status: "present" | "absent" | "late" | "excused" (case-insensitive)
 */
function StatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();

  const config = {
    present: {
      label: "Present",
      icon: CheckCircle,
      color: "#15803D",
      bg: "#DCFCE7",
    },
    absent: {
      label: "Absent",
      icon: XCircle,
      color: "#B91C1C",
      bg: "#FEE2E2",
    },
    late: {
      label: "Late",
      icon: Clock,
      color: "#B45309",
      bg: "#FEF3C7",
    },
    excused: {
      label: "Excused",
      icon: AlertCircle,
      color: "#1D4ED8",
      bg: "#DBEAFE",
    },
  };

  const { label, icon: Icon, color, bg } =
    config[normalized] || {
      label: status || "Unknown",
      icon: AlertCircle,
      color: "#6B7280",
      bg: "#F3F4F6",
    };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "9999px",
        fontSize: "13px",
        fontWeight: 600,
        color,
        backgroundColor: bg,
        whiteSpace: "nowrap",
      }}
    >
      <Icon size={14} strokeWidth={2.5} />
      {label}
    </span>
  );
}

export default StatusBadge;