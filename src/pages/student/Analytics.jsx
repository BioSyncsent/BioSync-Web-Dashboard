import { useEffect, useMemo, useState } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock3,
  ShieldCheck,
  AlertTriangle,
  TrendingUp,
  BookOpen,
  Target,
} from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";
import SummaryCard from "../../components/attendance/SummaryCard";
import "./Attendance.css";
import "./Analytics.css";

// ---------------------------------------------------------------------
// Safely convert Firestore Timestamp / string / number / null into a JS Date
// ---------------------------------------------------------------------
function toSafeDate(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------
// PLACEHOLDER SUBJECT DATA
// Your Firestore "attendance" collection does not yet store a
// subjectId/subjectCode field, so per-subject breakdown can't be
// pulled from real data yet. Replace this array (and the timetable
// data below) once you add a "subjects" collection and link each
// attendance record to a subject.
// ---------------------------------------------------------------------
const MOCK_SUBJECTS = [
  {
    code: "SPG 0562",
    name: "Software Project",
    lecturer: "Athirah Noordin",
    attended: 20,
    total: 22,
    absent: 2,
    color: "pink",
  },
  {
    code: "CBS 2383",
    name: "Programming Fundamentals",
    lecturer: "Syafiq Hashim",
    attended: 23,
    total: 24,
    absent: 1,
    color: "blue",
  },
  {
    code: "CBS 2363",
    name: "Network Security",
    lecturer: "Hafiz Razali",
    attended: 22,
    total: 24,
    absent: 2,
    color: "cyan",
  },
  {
    code: "CBS 2372",
    name: "Database Systems",
    lecturer: "Jumamelissa Sani",
    attended: 19,
    total: 24,
    absent: 5,
    color: "purple",
  },
];

// Placeholder weekly trend (percentage per week)
const MOCK_TREND = [
  { week: "Week 1", percentage: 96 },
  { week: "Week 2", percentage: 91 },
  { week: "Week 3", percentage: 88 },
  { week: "Week 4", percentage: 93 },
  { week: "Week 5", percentage: 95 },
];

// Placeholder timetable, built from the uploaded schedule image
const TIMETABLE = {
  Monday: [
    { code: "SPG 0562", name: "Software Project", time: "09:00 - 13:00", room: "KT5-L15-012", lecturer: "Athirah Noordin", color: "pink" },
  ],
  Tuesday: [],
  Wednesday: [
    { code: "CBS 2383", name: "Programming Fundamentals", time: "08:00 - 13:00", room: "KT5-L10-005", lecturer: "Syafiq Hashim", color: "blue" },
  ],
  Thursday: [
    { code: "CBS 2363", name: "Network Security", time: "08:00 - 13:00", room: "KT5-L15-003", lecturer: "Hafiz Razali", color: "cyan" },
    { code: "CBS 2372", name: "Database Systems", time: "14:00 - 17:00", room: "KT2-L05-05", lecturer: "Jumamelissa Sani", color: "purple" },
  ],
  Friday: [],
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------
function getSubjectStatus(absent, percentage) {
  if (absent >= 3) {
    return { tone: "critical", label: "Critical", detail: "Risk of Attendance Shortage" };
  }
  if (absent === 2) {
    return { tone: "warning", label: "Warning", detail: `${absent} Absences` };
  }
  return { tone: "excellent", label: "Excellent Attendance", detail: `${absent} Absence${absent === 1 ? "" : "s"}` };
}

function CircularProgress({ percentage, tone }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg className="bs-progress-ring" viewBox="0 0 80 80">
      <circle className="bs-progress-ring-bg" cx="40" cy="40" r={radius} />
      <circle
        className={`bs-progress-ring-fill bs-progress-${tone}`}
        cx="40"
        cy="40"
        r={radius}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
      />
      <text x="40" y="45" textAnchor="middle" className="bs-progress-ring-text">
        {percentage}%
      </text>
    </svg>
  );
}

function TrendChart({ data }) {
  const width = 560;
  const height = 180;
  const padding = 32;
  const max = 100;
  const min = 60;

  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2)) / (data.length - 1);
    const y =
      height -
      padding -
      ((d.percentage - min) / (max - min)) * (height - padding * 2);
    return { x, y, ...d };
  });

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="bs-trend-svg">
      <path d={pathD} className="bs-trend-line" fill="none" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4" className="bs-trend-dot" />
          <text x={p.x} y={height - 8} textAnchor="middle" className="bs-trend-label">
            {p.week}
          </text>
          <text x={p.x} y={p.y - 10} textAnchor="middle" className="bs-trend-value">
            {p.percentage}%
          </text>
        </g>
      ))}
    </svg>
  );
}

function toneColorVar(color) {
  const map = {
    pink: "#ec4899",
    blue: "#3b82f6",
    cyan: "#06b6d4",
    purple: "#a855f7",
  };
  return map[color] || "#3b82f6";
}

// ---------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------
function StudentAnalytics() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;

    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        const q = query(
          collection(db, "attendance"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const records = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        // Sort newest first
        records.sort((a, b) => {
          const da = toSafeDate(a.timestamp)?.getTime() || 0;
          const db_ = toSafeDate(b.timestamp)?.getTime() || 0;
          return db_ - da;
        });

        if (!cancelled) setAttendance(records);
      } catch (err) {
        console.error("Error fetching attendance:", err);
        if (!cancelled) setError("Couldn't load your attendance records. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Real overall stats from Firestore
  const overallSummary = useMemo(() => {
    const total = attendance.length;
    const present = attendance.filter((r) => r.status === "present").length;
    const late = attendance.filter((r) => r.status === "late").length;
    const absent = attendance.filter((r) => r.status === "absent").length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    return { total, present, late, absent, percentage };
  }, [attendance]);

  const recentRecords = useMemo(() => attendance.slice(0, 6), [attendance]);

  const criticalSubjects = useMemo(
    () => MOCK_SUBJECTS.filter((s) => s.absent >= 3),
    []
  );

  if (loading) {
    return (
      <div className="bs-attendance-page">
        <div className="bs-loading">
          <span className="bs-loading-spinner" />
          Loading your analytics...
        </div>
      </div>
    );
  }

  return (
    <div className="bs-attendance-page">
      {/* Header */}
      <div className="bs-page-header">
        <div className="bs-page-title">
          <div className="bs-title-icon">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1>Student Analytics</h1>
            <p>Monitor your attendance performance across all enrolled subjects.</p>
          </div>
        </div>
        <span className="bs-live-indicator">Semester 5</span>
      </div>

      {error && (
        <div className="bs-card" style={{ marginBottom: 24, color: "#dc2626" }}>
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="bs-summary-grid">
        <SummaryCard
          icon={TrendingUp}
          label="Overall Attendance"
          value={`${overallSummary.percentage}%`}
          tone="present"
        />
        <SummaryCard
          icon={BookOpen}
          label="Subjects Enrolled"
          value={MOCK_SUBJECTS.length}
          tone="primary"
        />
        <SummaryCard
          icon={CheckCircle2}
          label="Total Classes Attended"
          value={overallSummary.present}
          tone="present"
        />
        <SummaryCard
          icon={XCircle}
          label="Classes Missed"
          value={overallSummary.absent}
          tone="absent"
        />
      </div>

      {/* Smart Attendance Alert */}
      {criticalSubjects.length > 0 && (
        <div className="bs-alert-card">
          <AlertTriangle size={22} />
          <div>
            <strong>Attendance Warning</strong>
            <p>
              You have missed {criticalSubjects[0].absent} {criticalSubjects[0].name}{" "}
              classes. Your attendance may fall below the required percentage.
              Please contact your lecturer if necessary.
            </p>
          </div>
        </div>
      )}

      {/* Subject Cards */}
      <div className="bs-card-header" style={{ marginTop: 8 }}>
        <h3>Subject Attendance</h3>
        <span className="bs-card-subtitle">Placeholder data &mdash; connect a subjects collection to make this live</span>
      </div>
      <div className="bs-subject-grid">
        {MOCK_SUBJECTS.map((subject) => {
          const percentage = Math.round((subject.attended / subject.total) * 100);
          const status = getSubjectStatus(subject.absent, percentage);

          return (
            <div key={subject.code} className={`bs-subject-card bs-subject-${status.tone}`}>
              {status.tone === "critical" && (
                <AlertTriangle size={16} className="bs-subject-warning-icon" />
              )}
              <div className="bs-subject-card-top">
                <div>
                  <div className="bs-subject-code">{subject.code}</div>
                  <div className="bs-subject-name">{subject.name}</div>
                  <div className="bs-subject-lecturer">Lecturer: {subject.lecturer}</div>
                </div>
                <CircularProgress percentage={percentage} tone={status.tone} />
              </div>

              <div className="bs-subject-card-bottom">
                <span>{subject.attended} / {subject.total} Classes</span>
                <span>Absent: {subject.absent}</span>
              </div>

              <div className={`bs-subject-status-badge bs-subject-status-${status.tone}`}>
                {status.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Weekly Timetable */}
      <div className="bs-card-header" style={{ marginTop: 32 }}>
        <h3>Weekly Timetable</h3>
      </div>
      <div className="bs-timetable-grid">
        {DAYS.map((day) => (
          <div key={day} className="bs-timetable-day">
            <div className="bs-timetable-day-header">{day}</div>
            <div className="bs-timetable-day-body">
              {TIMETABLE[day].length === 0 ? (
                <div className="bs-timetable-empty">No classes</div>
              ) : (
                TIMETABLE[day].map((block, idx) => (
                  <div
                    key={idx}
                    className="bs-timetable-block"
                    style={{
                      borderLeftColor: toneColorVar(block.color),
                      background: `${toneColorVar(block.color)}14`,
                    }}
                  >
                    <div className="bs-timetable-time">{block.time}</div>
                    <div className="bs-timetable-code">{block.code}</div>
                    <div className="bs-timetable-name">{block.name}</div>
                    <div className="bs-timetable-room">{block.room}</div>
                    <div className="bs-timetable-lecturer">{block.lecturer}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="bs-charts-grid" style={{ marginTop: 32 }}>
        <div className="bs-card bs-chart-card">
          <div className="bs-card-header">
            <h3>Attendance Trend</h3>
            <span className="bs-card-subtitle">Placeholder data</span>
          </div>
          <TrendChart data={MOCK_TREND} />
        </div>

        <div className="bs-card bs-chart-card">
          <div className="bs-card-header">
            <h3>Attendance by Subject</h3>
            <span className="bs-card-subtitle">Placeholder data</span>
          </div>
          <div className="bs-bar-chart">
            {MOCK_SUBJECTS.map((subject) => {
              const percentage = Math.round((subject.attended / subject.total) * 100);
              return (
                <div key={subject.code} className="bs-bar-row">
                  <span className="bs-bar-label">{subject.code}</span>
                  <div className="bs-bar-track">
                    <div
                      className="bs-bar-fill"
                      style={{
                        width: `${percentage}%`,
                        background: toneColorVar(subject.color),
                      }}
                    />
                  </div>
                  <span className="bs-bar-value">{percentage}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Recent Attendance History */}
      <div className="bs-card bs-table-card" style={{ marginTop: 24 }}>
        <div className="bs-card-header">
          <h3>Recent Attendance History</h3>
        </div>
        <div className="bs-table-scroll">
          <table className="bs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Verification Method</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.length === 0 ? (
                <tr>
                  <td colSpan="4" className="bs-table-empty">
                    <div className="bs-empty-state">
                      <XCircle size={40} />
                      <p>No attendance records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentRecords.map((record) => {
                  const date = toSafeDate(record.timestamp);
                  const dateStr = date ? date.toLocaleDateString("en-MY") : "N/A";
                  const timeStr = date ? date.toLocaleTimeString("en-MY") : "N/A";

                  return (
                    <tr key={record.id} className="bs-table-row">
                      <td>{dateStr}</td>
                      <td>{timeStr}</td>
                      <td>
                        <span className={`bs-badge bs-badge-${record.status || "unknown"}`}>
                          {record.status || "Unknown"}
                        </span>
                      </td>
                      <td className="bs-capitalize">{record.authMethod || "N/A"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Goal */}
      <div className="bs-card bs-goal-card" style={{ marginTop: 24 }}>
        <div className="bs-card-header">
          <h3>
            <Target size={16} style={{ marginRight: 6, verticalAlign: "-2px" }} />
            Attendance Goal
          </h3>
        </div>
        <div className="bs-goal-stats">
          <div>
            <span className="bs-goal-label">Current</span>
            <span className="bs-goal-value">{overallSummary.percentage}%</span>
          </div>
          <div>
            <span className="bs-goal-label">Target</span>
            <span className="bs-goal-value">90%</span>
          </div>
        </div>
        <div className="bs-goal-progress-track">
          <div
            className="bs-goal-progress-fill"
            style={{ width: `${Math.min(overallSummary.percentage, 100)}%` }}
          />
        </div>
        {overallSummary.percentage < 90 && (
          <p className="bs-goal-hint">
            Need to attend more consecutive classes to reach your target.
          </p>
        )}
      </div>
    </div>
  );
}

export default StudentAnalytics;