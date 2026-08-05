import { useMemo } from "react";
import {
  Users, UserCheck, UserX, TrendingUp, AlertCircle, RefreshCw, Eye
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import "./Dashboard.css";

import { useFirestoreSubscription } from "../../hooks/useFirestoreSubscription";
import {
  subscribeToAttendanceRecords,
  getSummary,
  getWeeklyChartData,
  getTrendData,
  getRecentActivity,
} from "../../services/attendanceService";
import { subscribeToTotalUsers } from "../../services/userService";
import { subscribeToPendingDisputes } from "../../services/disputeService";

const distributionColors = ["#56B6FF", "#F59E0B", "#D8E9F8"];

function StatSkeleton() {
  return (
    <div className="db-card db-stat-card">
      <div className="db-skeleton db-skeleton-icon" />
      <div className="db-skeleton db-skeleton-line" style={{ width: "60%", height: 26 }} />
      <div className="db-skeleton db-skeleton-line" style={{ width: "80%", height: 12 }} />
    </div>
  );
}

function ChartSkeleton() {
  return <div className="db-skeleton" style={{ width: "100%", height: 220, borderRadius: 12 }} />;
}

function ErrorState({ message = "Unable to load dashboard.", onRetry }) {
  return (
    <div className="db-error-state">
      <AlertCircle size={18} />
      <span>{message}</span>
      {onRetry && (
        <button className="db-table-action" onClick={onRetry}>
          <RefreshCw size={13} />
          Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ message }) {
  return <div className="db-empty-state">{message}</div>;
}

function statusLabel(status) {
  if (status === "present") return "On Time";
  if (status === "late") return "Late";
  if (status === "absent") return "Absent";
  return "Unknown";
}

function statusClass(status) {
  if (status === "present") return "db-status db-status-ontime";
  if (status === "late") return "db-status db-status-late";
  return "db-status db-status-absent";
}

function Dashboard() {
  const attendance = useFirestoreSubscription(subscribeToAttendanceRecords, []);
  const totalUsers = useFirestoreSubscription(subscribeToTotalUsers, []);
  const pendingDisputes = useFirestoreSubscription(subscribeToPendingDisputes, []);

  const records = attendance.data || [];

  const summary = useMemo(() => getSummary(records), [records]);
  const weeklyData = useMemo(() => getWeeklyChartData(records), [records]);
  const trendRaw = useMemo(() => getTrendData(records), [records]);
  const recentActivity = useMemo(() => getRecentActivity(records, 10), [records]);

  const trendData = useMemo(
    () =>
      trendRaw.map((d) => {
        const total = d.present + d.absent + d.late;
        const rate = total > 0 ? Math.round((d.present / total) * 1000) / 10 : 0;
        return { day: d.date, rate };
      }),
    [trendRaw]
  );

  const distributionData = useMemo(
    () => [
      { name: "Present", value: summary.present },
      { name: "Late", value: summary.late },
      { name: "Absent", value: summary.absent },
    ],
    [summary]
  );

  const attendanceRate = useMemo(() => {
    const expected = totalUsers.data || summary.total;
    return expected > 0 ? (summary.present / expected) * 100 : 0;
  }, [summary, totalUsers.data]);

  const statCards = [
    { label: "Total Employees", value: totalUsers.data != null ? totalUsers.data.toLocaleString() : "—", icon: Users, loading: totalUsers.loading },
    { label: "Present Today", value: attendance.loading ? "—" : summary.present.toLocaleString(), icon: UserCheck, loading: attendance.loading },
    { label: "Absent Today", value: attendance.loading ? "—" : summary.absent.toLocaleString(), icon: UserX, loading: attendance.loading },
    { label: "Attendance Rate", value: attendance.loading || totalUsers.loading ? "—" : `${attendanceRate.toFixed(1)}%`, icon: TrendingUp, loading: attendance.loading || totalUsers.loading },
    { label: "Pending Disputes", value: pendingDisputes.data != null ? pendingDisputes.data.toLocaleString() : "—", icon: AlertCircle, loading: pendingDisputes.loading },
  ];

  const anyStatLoading = statCards.some((s) => s.loading);
  const statsBlockingError = attendance.error || totalUsers.error;

  return (
    <div className="db-page">

      <div className="db-page-header">
        <h1
          className="db-page-title"
          style={{ fontSize: "32px", fontFamily: "'Sora', 'Poppins', sans-serif", fontWeight: 700 }}
        >
          Welcome to BioSync Dashboard
        </h1>
        <p className="db-page-subtitle">
          Real-time attendance and biometric access overview.
        </p>
      </div>

      {statsBlockingError ? (
        <ErrorState onRetry={() => { attendance.retry(); totalUsers.retry(); }} />
      ) : (
        <div className="db-stat-grid">
          {anyStatLoading
            ? Array.from({ length: 5 }).map((_, i) => <StatSkeleton key={i} />)
            : statCards.map(({ label, value, icon: Icon }) => (
                <div className="db-card db-stat-card" key={label}>
                  <div className="db-stat-icon">
                    <Icon size={18} />
                  </div>
                  <div className="db-stat-value">{value}</div>
                  <div className="db-stat-label">{label}</div>
                </div>
              ))}
        </div>
      )}

      <div className="db-chart-grid">

        <div className="db-card db-chart-card">
          <h3 className="db-card-title">Attendance Trend</h3>
          {attendance.error ? (
            <ErrorState onRetry={attendance.retry} />
          ) : attendance.loading ? (
            <ChartSkeleton />
          ) : !trendData.some((d) => d.rate > 0) ? (
            <EmptyState message="No attendance records found." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData}>
                <CartesianGrid stroke="#EDF4FB" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#556070" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#556070" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #D8E9F8", fontSize: 12 }} />
                <Line type="monotone" dataKey="rate" stroke="#56B6FF" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="db-card db-chart-card">
          <h3 className="db-card-title">Attendance Distribution</h3>
          {attendance.error ? (
            <ErrorState onRetry={attendance.retry} />
          ) : attendance.loading ? (
            <ChartSkeleton />
          ) : !distributionData.some((d) => d.value > 0) ? (
            <EmptyState message="No attendance records found." />
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
                  {distributionData.map((entry, index) => (
                    <Cell key={entry.name} fill={distributionColors[index % distributionColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #D8E9F8", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="db-card db-chart-card">
          <h3 className="db-card-title">Weekly Attendance</h3>
          {attendance.error ? (
            <ErrorState onRetry={attendance.retry} />
          ) : attendance.loading ? (
            <ChartSkeleton />
          ) : !weeklyData.some((d) => d.present > 0 || d.absent > 0) ? (
            <EmptyState message="No attendance records found." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyData}>
                <CartesianGrid stroke="#EDF4FB" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#556070" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#556070" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #D8E9F8", fontSize: 12 }} />
                <Bar dataKey="present" fill="#56B6FF" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absent" fill="#D8E9F8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

      </div>

      <div className="db-card db-table-card">
        <h3 className="db-card-title">Recent Activity</h3>

        {attendance.error ? (
          <ErrorState onRetry={attendance.retry} />
        ) : attendance.loading ? (
          <div className="db-table-wrap">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="db-skeleton db-skeleton-line" style={{ height: 18, margin: "10px 0" }} />
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <EmptyState message="No activity yet." />
        ) : (
          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.timeLabel}</td>
                    <td><span className={statusClass(row.status)}>{statusLabel(row.status)}</span></td>
                    <td>{row.method}</td>
                    <td>
                      <button className="db-table-action">
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

    </div>
  );
}

export default Dashboard;