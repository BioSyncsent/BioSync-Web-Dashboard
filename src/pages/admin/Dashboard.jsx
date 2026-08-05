import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserX,
  Clock3,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Eye,
  UserPlus,
  CalendarCheck,
  MessageSquareWarning,
  Cpu,
  FileBarChart,
  X,
  Fingerprint,
  ScanFace,
  CreditCard,
  Activity,
  Database,
  ShieldCheck,
} from "lucide-react";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

import "./Dashboard.css";

import { useFirestoreSubscription } from "../../hooks/useFirestoreSubscription";

import {
  subscribeToAttendanceRecords,
  getWeeklyChartData,
  getTrendData,
  getRecentActivity,
} from "../../services/attendanceService";

import { subscribeToTotalUsers } from "../../services/userService";
import { subscribeToPendingDisputes } from "../../services/disputeService";

const distributionColors = ["#56B6FF", "#F59E0B", "#FF6B7A"];

function isSameDay(firstDate, secondDate) {
  if (!firstDate || !secondDate) return false;

  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth() &&
    firstDate.getDate() === secondDate.getDate()
  );
}

/*
  Keep only the latest attendance record for each user today.

  This prevents one user who scans multiple times from being counted
  more than once in the summary cards.
*/
function getLatestRecordPerUser(records) {
  const recordsByUser = new Map();

  records.forEach((record) => {
    const uniqueKey =
      record.userId && record.userId !== "—"
        ? record.userId
        : record.studentId || record.id;

    const existingRecord = recordsByUser.get(uniqueKey);

    if (
      !existingRecord ||
      (record.date && existingRecord.date && record.date > existingRecord.date)
    ) {
      recordsByUser.set(uniqueKey, record);
    }
  });

  return Array.from(recordsByUser.values());
}

function calculateSummary(records) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;

      if (record.status === "present") {
        summary.present += 1;
      } else if (record.status === "late") {
        summary.late += 1;
      } else if (record.status === "absent") {
        summary.absent += 1;
      }

      return summary;
    },
    {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
    }
  );
}

function normalizeMethod(method = "") {
  const normalizedMethod = method.toString().toLowerCase();

  if (normalizedMethod.includes("finger")) return "fingerprint";
  if (normalizedMethod.includes("face")) return "face";
  if (normalizedMethod.includes("rfid")) return "rfid";

  return "other";
}

function getMethodLabel(method) {
  if (method === "fingerprint") return "Fingerprint";
  if (method === "face") return "Face Recognition";
  if (method === "rfid") return "RFID";
  return "Other";
}

function getMethodIcon(method) {
  if (method === "fingerprint") return Fingerprint;
  if (method === "face") return ScanFace;
  if (method === "rfid") return CreditCard;
  return ShieldCheck;
}

function getStatusLabel(status) {
  if (status === "present") return "On Time";
  if (status === "late") return "Late";
  if (status === "absent") return "Absent";
  return "Unknown";
}

function getStatusClass(status) {
  if (status === "present") return "db-status db-status-ontime";
  if (status === "late") return "db-status db-status-late";
  if (status === "absent") return "db-status db-status-absent";

  return "db-status db-status-unknown";
}

function formatPercentage(value) {
  if (!Number.isFinite(value)) return "0.0%";
  return `${value.toFixed(1)}%`;
}

function StatSkeleton() {
  return (
    <div className="db-card db-stat-card">
      <div className="db-skeleton db-skeleton-icon" />

      <div
        className="db-skeleton db-skeleton-line"
        style={{ width: "60%", height: 26 }}
      />

      <div
        className="db-skeleton db-skeleton-line"
        style={{ width: "80%", height: 12 }}
      />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div
      className="db-skeleton"
      style={{
        width: "100%",
        height: 220,
        borderRadius: 12,
      }}
    />
  );
}

function ErrorState({
  message = "Unable to load dashboard data.",
  onRetry,
}) {
  return (
    <div className="db-error-state">
      <AlertCircle size={18} />

      <span>{message}</span>

      {onRetry && (
        <button
          type="button"
          className="db-table-action"
          onClick={onRetry}
        >
          <RefreshCw size={13} />
          Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="db-empty-state">
      <Activity size={28} />
      <span>{message}</span>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();

  const [selectedActivity, setSelectedActivity] = useState(null);

  const attendance = useFirestoreSubscription(
    subscribeToAttendanceRecords,
    []
  );

  const totalUsers = useFirestoreSubscription(
    subscribeToTotalUsers,
    []
  );

  const pendingDisputes = useFirestoreSubscription(
    subscribeToPendingDisputes,
    []
  );

  const records = attendance.data || [];

  const today = useMemo(() => new Date(), []);

  /*
    Only today's records are used for the statistic cards.
    Historical records are still used by the charts.
  */
  const todayRecords = useMemo(() => {
    return records.filter(
      (record) => record.date && isSameDay(record.date, today)
    );
  }, [records, today]);

  const latestTodayRecords = useMemo(() => {
    return getLatestRecordPerUser(todayRecords);
  }, [todayRecords]);

  const todaySummary = useMemo(() => {
    return calculateSummary(latestTodayRecords);
  }, [latestTodayRecords]);

  const weeklyData = useMemo(() => {
    return getWeeklyChartData(records);
  }, [records]);

  const trendRaw = useMemo(() => {
    return getTrendData(records);
  }, [records]);

  const recentActivity = useMemo(() => {
    return getRecentActivity(records, 8);
  }, [records]);

  const trendData = useMemo(() => {
    return trendRaw.map((item) => {
      const total = item.present + item.absent + item.late;

      /*
        Late users are still counted as attendees.
      */
      const attended = item.present + item.late;

      const rate =
        total > 0
          ? Math.round((attended / total) * 1000) / 10
          : 0;

      return {
        day: item.date,
        rate,
      };
    });
  }, [trendRaw]);

  const distributionData = useMemo(() => {
    return [
      {
        name: "Present",
        value: todaySummary.present,
      },
      {
        name: "Late",
        value: todaySummary.late,
      },
      {
        name: "Absent",
        value: todaySummary.absent,
      },
    ];
  }, [todaySummary]);

  const authenticationMethods = useMemo(() => {
    const summary = {
      fingerprint: 0,
      face: 0,
      rfid: 0,
      other: 0,
    };

    todayRecords.forEach((record) => {
      const method = normalizeMethod(record.method);
      summary[method] += 1;
    });

    return Object.entries(summary).map(([method, value]) => ({
      method,
      value,
    }));
  }, [todayRecords]);

  const attendanceRate = useMemo(() => {
    const expectedUsers = totalUsers.data || 0;
    const attendedUsers =
      todaySummary.present + todaySummary.late;

    if (expectedUsers === 0) return 0;

    return Math.min(
      (attendedUsers / expectedUsers) * 100,
      100
    );
  }, [todaySummary, totalUsers.data]);

  const statCards = [
    {
      label: "Total Employees",
      value:
        totalUsers.data != null
          ? totalUsers.data.toLocaleString()
          : "—",
      icon: Users,
      loading: totalUsers.loading,
      variant: "blue",
    },
    {
      label: "Present Today",
      value: attendance.loading
        ? "—"
        : todaySummary.present.toLocaleString(),
      icon: UserCheck,
      loading: attendance.loading,
      variant: "green",
    },
    {
      label: "Late Today",
      value: attendance.loading
        ? "—"
        : todaySummary.late.toLocaleString(),
      icon: Clock3,
      loading: attendance.loading,
      variant: "yellow",
    },
    {
      label: "Absent Today",
      value: attendance.loading
        ? "—"
        : todaySummary.absent.toLocaleString(),
      icon: UserX,
      loading: attendance.loading,
      variant: "red",
    },
    {
      label: "Attendance Rate",
      value:
        attendance.loading || totalUsers.loading
          ? "—"
          : formatPercentage(attendanceRate),
      icon: TrendingUp,
      loading: attendance.loading || totalUsers.loading,
      variant: "cyan",
    },
    {
      label: "Pending Disputes",
      value:
        pendingDisputes.data != null
          ? pendingDisputes.data.toLocaleString()
          : "—",
      icon: AlertCircle,
      loading: pendingDisputes.loading,
      variant: "purple",
    },
  ];

  const quickActions = [
    {
      label: "Manage Users",
      description: "Register or update users",
      icon: UserPlus,
      path: "/admin/users",
    },
    {
      label: "View Attendance",
      description: "Open attendance records",
      icon: CalendarCheck,
      path: "/admin/attendance",
    },
    {
      label: "Review Disputes",
      description: "Resolve pending disputes",
      icon: MessageSquareWarning,
      path: "/admin/disputes",
    },
    {
      label: "Manage Devices",
      description: "Monitor connected hardware",
      icon: Cpu,
      path: "/admin/devices",
    },
    {
      label: "View Analytics",
      description: "Open attendance reports",
      icon: FileBarChart,
      path: "/admin/analytics",
    },
  ];

  const anyStatLoading = statCards.some(
    (stat) => stat.loading
  );

  const statsBlockingError =
    attendance.error || totalUsers.error;

  const latestRecord = recentActivity[0];

  const lastSyncLabel = latestRecord?.date
    ? latestRecord.date.toLocaleString()
    : "No attendance data received";

  function retryStatistics() {
    attendance.retry();
    totalUsers.retry();
    pendingDisputes.retry?.();
  }

  function closeActivityModal() {
    setSelectedActivity(null);
  }

  return (
    <div className="db-page">
      <div className="db-page-header db-page-header-row">
        <div>
          <h1 className="db-page-title db-main-title">
            Welcome to BioSync Dashboard
          </h1>

          <p className="db-page-subtitle">
            Real-time attendance and biometric access overview.
          </p>
        </div>

        <div className="db-live-badge">
          <span className="db-live-dot" />
          Live monitoring
        </div>
      </div>

      {statsBlockingError ? (
        <ErrorState onRetry={retryStatistics} />
      ) : (
        <div className="db-stat-grid">
          {anyStatLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <StatSkeleton key={index} />
              ))
            : statCards.map(
                ({
                  label,
                  value,
                  icon: Icon,
                  variant,
                }) => (
                  <div
                    className="db-card db-stat-card"
                    key={label}
                  >
                    <div
                      className={`db-stat-icon db-stat-icon-${variant}`}
                    >
                      <Icon size={18} />
                    </div>

                    <div className="db-stat-value">
                      {value}
                    </div>

                    <div className="db-stat-label">
                      {label}
                    </div>
                  </div>
                )
              )}
        </div>
      )}

      <div className="db-overview-grid">
        <div className="db-card db-quick-actions-card">
          <div className="db-section-heading">
            <div>
              <h3 className="db-card-title">
                Quick Actions
              </h3>

              <p className="db-card-description">
                Access common administrator functions.
              </p>
            </div>
          </div>

          <div className="db-quick-actions">
            {quickActions.map(
              ({
                label,
                description,
                icon: Icon,
                path,
              }) => (
                <button
                  type="button"
                  className="db-quick-action"
                  key={label}
                  onClick={() => navigate(path)}
                >
                  <span className="db-quick-action-icon">
                    <Icon size={18} />
                  </span>

                  <span>
                    <strong>{label}</strong>
                    <small>{description}</small>
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        <div className="db-card db-system-card">
          <h3 className="db-card-title">
            System Overview
          </h3>

          <div className="db-system-list">
            <div className="db-system-item">
              <span className="db-system-icon">
                <Database size={17} />
              </span>

              <div>
                <strong>Firebase Connection</strong>
                <small>
                  {attendance.error
                    ? "Connection error"
                    : "Connected and receiving updates"}
                </small>
              </div>

              <span
                className={`db-system-status ${
                  attendance.error
                    ? "db-system-offline"
                    : "db-system-online"
                }`}
              >
                {attendance.error ? "Error" : "Online"}
              </span>
            </div>

            <div className="db-system-item">
              <span className="db-system-icon">
                <RefreshCw size={17} />
              </span>

              <div>
                <strong>Last Attendance Update</strong>
                <small>{lastSyncLabel}</small>
              </div>
            </div>

            <div className="db-system-item">
              <span className="db-system-icon">
                <ShieldCheck size={17} />
              </span>

              <div>
                <strong>Records Today</strong>
                <small>
                  {todaySummary.total} verified attendance
                  {todaySummary.total === 1 ? " record" : " records"}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="db-chart-grid">
        <div className="db-card db-chart-card">
          <h3 className="db-card-title">
            Attendance Trend
          </h3>

          <p className="db-card-description">
            Attendance rate over the last 14 days.
          </p>

          {attendance.error ? (
            <ErrorState onRetry={attendance.retry} />
          ) : attendance.loading ? (
            <ChartSkeleton />
          ) : !trendData.some((item) => item.rate > 0) ? (
            <EmptyState message="No attendance trend data found." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid
                  stroke="#EDF4FB"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fontSize: 12,
                    fill: "#556070",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fontSize: 12,
                    fill: "#556070",
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `${value}%`}
                />

                <Tooltip
                  formatter={(value) => [
                    `${value}%`,
                    "Attendance Rate",
                  ]}
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #D8E9F8",
                    fontSize: 12,
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="#56B6FF"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="db-card db-chart-card">
          <h3 className="db-card-title">
            Today's Attendance Distribution
          </h3>

          <p className="db-card-description">
            Present, late and absent records for today.
          </p>

          {attendance.error ? (
            <ErrorState onRetry={attendance.retry} />
          ) : attendance.loading ? (
            <ChartSkeleton />
          ) : !distributionData.some(
              (item) => item.value > 0
            ) ? (
            <EmptyState message="No attendance records found for today." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {distributionData.map(
                    (entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={
                          distributionColors[
                            index %
                              distributionColors.length
                          ]
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #D8E9F8",
                    fontSize: 12,
                  }}
                />

                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="db-card db-chart-card">
          <h3 className="db-card-title">
            Weekly Attendance
          </h3>

          <p className="db-card-description">
            Attendance activity during the last seven days.
          </p>

          {attendance.error ? (
            <ErrorState onRetry={attendance.retry} />
          ) : attendance.loading ? (
            <ChartSkeleton />
          ) : !weeklyData.some(
              (item) =>
                item.present > 0 ||
                item.absent > 0 ||
                item.late > 0
            ) ? (
            <EmptyState message="No weekly attendance data found." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData}>
                <CartesianGrid
                  stroke="#EDF4FB"
                  vertical={false}
                />

                <XAxis
                  dataKey="day"
                  tick={{
                    fontSize: 12,
                    fill: "#556070",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  allowDecimals={false}
                  tick={{
                    fontSize: 12,
                    fill: "#556070",
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    borderRadius: 10,
                    border: "1px solid #D8E9F8",
                    fontSize: 12,
                  }}
                />

                <Legend
                  wrapperStyle={{ fontSize: 12 }}
                />

                <Bar
                  name="Present"
                  dataKey="present"
                  fill="#56B6FF"
                  radius={[6, 6, 0, 0]}
                />

                <Bar
                  name="Late"
                  dataKey="late"
                  fill="#F59E0B"
                  radius={[6, 6, 0, 0]}
                />

                <Bar
                  name="Absent"
                  dataKey="absent"
                  fill="#FF6B7A"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="db-bottom-grid">
        <div className="db-card db-table-card">
          <div className="db-section-heading">
            <div>
              <h3 className="db-card-title">
                Recent Activity
              </h3>

              <p className="db-card-description">
                Latest authentication and attendance events.
              </p>
            </div>

            <button
              type="button"
              className="db-view-all-button"
              onClick={() =>
                navigate("/admin/attendance")
              }
            >
              View all
            </button>
          </div>

          {attendance.error ? (
            <ErrorState onRetry={attendance.retry} />
          ) : attendance.loading ? (
            <div className="db-table-wrap">
              {Array.from({ length: 5 }).map(
                (_, index) => (
                  <div
                    key={index}
                    className="db-skeleton db-skeleton-line"
                    style={{
                      height: 18,
                      margin: "15px 0",
                    }}
                  />
                )
              )}
            </div>
          ) : recentActivity.length === 0 ? (
            <EmptyState message="No recent activity yet." />
          ) : (
            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Method</th>
                    <th>Details</th>
                  </tr>
                </thead>

                <tbody>
                  {recentActivity.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="db-user-cell">
                          <span className="db-user-avatar">
                            {(row.name || "U")
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <span>
                            <strong>
                              {row.name || "Unknown"}
                            </strong>

                            <small>
                              {row.studentId ||
                                row.userId ||
                                "No user ID"}
                            </small>
                          </span>
                        </div>
                      </td>

                      <td>{row.dateLabel}</td>
                      <td>{row.timeLabel}</td>

                      <td>
                        <span
                          className={getStatusClass(
                            row.status
                          )}
                        >
                          {getStatusLabel(row.status)}
                        </span>
                      </td>

                      <td>
                        {getMethodLabel(
                          normalizeMethod(row.method)
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="db-table-action"
                          onClick={() =>
                            setSelectedActivity(row)
                          }
                        >
                          <Eye size={14} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="db-card db-authentication-card">
          <h3 className="db-card-title">
            Authentication Methods
          </h3>

          <p className="db-card-description">
            Methods used for today's check-ins.
          </p>

          <div className="db-method-list">
            {authenticationMethods.map(
              ({ method, value }) => {
                const MethodIcon =
                  getMethodIcon(method);

                return (
                  <div
                    className="db-method-item"
                    key={method}
                  >
                    <span className="db-method-icon">
                      <MethodIcon size={17} />
                    </span>

                    <span className="db-method-name">
                      {getMethodLabel(method)}
                    </span>

                    <strong>{value}</strong>
                  </div>
                );
              }
            )}
          </div>
        </div>
      </div>

      {selectedActivity && (
        <div
          className="db-modal-backdrop"
          role="presentation"
          onMouseDown={closeActivityModal}
        >
          <div
            className="db-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-detail-title"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="db-modal-header">
              <div>
                <h2 id="activity-detail-title">
                  Attendance Details
                </h2>

                <p>
                  Authentication record information.
                </p>
              </div>

              <button
                type="button"
                className="db-modal-close"
                onClick={closeActivityModal}
                aria-label="Close details"
              >
                <X size={20} />
              </button>
            </div>

            <div className="db-modal-user">
              <span className="db-modal-avatar">
                {(selectedActivity.name || "U")
                  .charAt(0)
                  .toUpperCase()}
              </span>

              <div>
                <strong>
                  {selectedActivity.name ||
                    "Unknown User"}
                </strong>

                <span>
                  {selectedActivity.studentId ||
                    selectedActivity.userId ||
                    "No user ID"}
                </span>
              </div>
            </div>

            <div className="db-detail-grid">
              <div className="db-detail-item">
                <span>Status</span>

                <strong>
                  <span
                    className={getStatusClass(
                      selectedActivity.status
                    )}
                  >
                    {getStatusLabel(
                      selectedActivity.status
                    )}
                  </span>
                </strong>
              </div>

              <div className="db-detail-item">
                <span>Authentication Method</span>
                <strong>
                  {getMethodLabel(
                    normalizeMethod(
                      selectedActivity.method
                    )
                  )}
                </strong>
              </div>

              <div className="db-detail-item">
                <span>Date</span>
                <strong>
                  {selectedActivity.dateLabel}
                </strong>
              </div>

              <div className="db-detail-item">
                <span>Time</span>
                <strong>
                  {selectedActivity.timeLabel}
                </strong>
              </div>

              <div className="db-detail-item">
                <span>Device</span>
                <strong>
                  {selectedActivity.deviceId ||
                    selectedActivity.deviceName ||
                    "Not provided"}
                </strong>
              </div>

              <div className="db-detail-item">
                <span>Location</span>
                <strong>
                  {selectedActivity.location ||
                    "Not provided"}
                </strong>
              </div>

              <div className="db-detail-item">
                <span>Liveness Result</span>
                <strong>
                  {selectedActivity.livenessResult ||
                    "Not provided"}
                </strong>
              </div>

              <div className="db-detail-item">
                <span>Face Confidence</span>
                <strong>
                  {selectedActivity.faceConfidence !=
                  null
                    ? `${selectedActivity.faceConfidence}%`
                    : "Not provided"}
                </strong>
              </div>
            </div>

            <div className="db-modal-footer">
              <button
                type="button"
                className="db-modal-primary"
                onClick={closeActivityModal}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;