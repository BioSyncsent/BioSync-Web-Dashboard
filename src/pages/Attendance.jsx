import { useEffect, useMemo, useState } from "react";
import { Users, CheckCircle2, XCircle, Clock3, ShieldCheck } from "lucide-react";

import DashboardLayout from "../components/layout/DashboardLayout";
import SummaryCard from "../components/attendance/SummaryCard";
import WeeklyAttendanceChart from "../components/attendance/WeeklyAttendanceChart";
import AttendanceTrendChart from "../components/attendance/AttendanceTrendChart";
import AttendanceTable from "../components/attendance/AttendanceTable";
import RecentActivityPanel from "../components/attendance/RecentActivityPanel";

import {
  fetchAttendanceRecords,
  getSummary,
  getWeeklyChartData,
  getTrendData,
  getRecentActivity,
} from "../services/attendanceService";

import "./Attendance.css";

function Attendance() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAttendance() {
      try {
        setLoading(true);
        const data = await fetchAttendanceRecords();
        if (!cancelled) setAttendance(data);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError("Couldn't load attendance records. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAttendance();
    return () => {
      cancelled = true;
    };
  }, []);

  const summary = useMemo(() => getSummary(attendance), [attendance]);
  const weeklyData = useMemo(() => getWeeklyChartData(attendance), [attendance]);
  const trendData = useMemo(() => getTrendData(attendance), [attendance]);
  const recentActivity = useMemo(() => getRecentActivity(attendance), [attendance]);

  return (
    <DashboardLayout>
      <div className="bs-attendance-page">
        <div className="bs-page-header">
          <div className="bs-page-title">
            <div className="bs-title-icon">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h1>BioSync Attendance Records</h1>
              <p>Real-time biometric attendance logs and tracking</p>
            </div>
          </div>
          <span className="bs-live-indicator">
            <span className="bs-live-dot" />
            Live status
          </span>
        </div>

        {error && (
          <div className="bs-card" style={{ marginBottom: 24, color: "#dc2626" }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="bs-loading">
            <span className="bs-loading-spinner" />
            Syncing attendance records...
          </div>
        ) : (
          <>
            <div className="bs-summary-grid">
              <SummaryCard icon={Users} label="Total" value={summary.total} tone="primary" />
              <SummaryCard icon={CheckCircle2} label="Present" value={summary.present} tone="present" />
              <SummaryCard icon={XCircle} label="Absent" value={summary.absent} tone="absent" />
              <SummaryCard icon={Clock3} label="Late" value={summary.late} tone="late" />
            </div>

            <div className="bs-charts-grid">
              <WeeklyAttendanceChart data={weeklyData} />
              <AttendanceTrendChart data={trendData} />
            </div>

            <div className="bs-content-grid">
              <AttendanceTable records={attendance} />
              <RecentActivityPanel records={recentActivity} />
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default Attendance;