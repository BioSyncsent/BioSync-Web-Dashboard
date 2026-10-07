import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileWarning,
  Fingerprint,
  Radio,
  RefreshCw,
  ScanFace,
  Search,
  ShieldCheck,
  Users,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";
import {
  subscribeToTimetable,
  timeToMinutes,
} from "../../services/timetableService";

import "./Dashboard.css";

const TIMEZONE = "Asia/Kuala_Lumpur";
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const STATUS_COLORS = {
  present: "#52e3aa",
  late: "#fbbf24",
  absent: "#fb8b82",
  excused: "#79c5ff",
  unknown: "#a0b4bf",
  not_recorded: "#00ddeb",
};

function safeDate(value) {
  if (value == null || value === "") return null;

  try {
    const date =
      value instanceof Date
        ? value
        : typeof value.toDate === "function"
          ? value.toDate()
          : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function recordDate(record) {
  return [
    record.timestamp,
    record.checkInTime,
    record.date,
    record.createdAt,
    record.time,
  ].map(safeDate).find(Boolean) || null;
}

function dateKey(value) {
  const date = safeDate(value);
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function clockNow() {
  const date = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIMEZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    day: DAYS.indexOf(values.weekday),
    minutes: Number(values.hour) * 60 + Number(values.minute),
    time: `${values.hour}:${values.minute}`,
    key: dateKey(date),
    label: new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date),
  };
}

function statusOf(value) {
  const status = String(value || "").trim().toLowerCase();

  return ["present", "late", "absent", "excused"].includes(status)
    ? status
    : "unknown";
}

function statusLabel(value) {
  return {
    present: "Present",
    late: "Late",
    absent: "Absent",
    excused: "Excused",
    unknown: "Unknown",
    not_recorded: "Not Recorded",
  }[value] || "Unknown";
}

function nameOf(student) {
  return (
    student.fullName ||
    [student.firstName, student.lastName].filter(Boolean).join(" ") ||
    student.email ||
    "Unnamed student"
  );
}

function methodOf(record) {
  return (
    record?.authMethod ||
    record?.authenticationMethod ||
    record?.method ||
    "Unknown"
  );
}

function displayTime(date) {
  return date
    ? date.toLocaleTimeString("en-GB", {
        timeZone: TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

function errorMessage(error) {
  return error?.code === "permission-denied"
    ? "Access denied. Check the teacher’s department and Firestore permissions."
    : error?.message || "Unable to load dashboard data.";
}

function emptyData() {
  return {
    students: [],
    records: [],
    disputes: [],
    loading: true,
    cached: true,
    error: "",
  };
}

/*
 * Reads only students in the teacher's department.
 * Attendance listeners use userId equality queries, matching
 * the existing teacher permissions.
 */
function useTeacherData(uid, department, allowed, retry) {
  const [data, setData] = useState(emptyData);

  useEffect(() => {
    if (!allowed || !uid || !department) {
      setData({ ...emptyData(), loading: false });
      return;
    }

    let stopped = false;
    let students = [];
    let disputes = [];
    let studentsReady = false;
    let disputesReady = false;
    let studentsCached = true;
    let disputesCached = true;
    let failureMessage = "";

    const attendanceListeners = new Map();
    const attendanceResults = new Map();

    function emit() {
      if (stopped) return;

      const ids = students.map((student) => student.uid);
      const attendanceReady = ids.every((id) =>
        attendanceResults.has(id)
      );

      const records = ids.flatMap(
        (id) => attendanceResults.get(id)?.records || []
      );

      setData({
        students,
        disputes,
        records,
        loading: !(studentsReady && disputesReady && attendanceReady),
        cached:
          studentsCached ||
          disputesCached ||
          ids.some((id) => attendanceResults.get(id)?.cached !== false),
        error: failureMessage,
      });
    }

    function fail(error) {
      if (stopped) return;
      failureMessage = errorMessage(error);
      emit();
    }

    const unsubscribeStudents = onSnapshot(
      query(
        collection(db, "users"),
        where("department", "==", department),
        where("role", "==", "student")
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (stopped) return;

        students = snapshot.docs
          .map((document) => ({
            ...document.data(),
            uid: document.id,
          }))
          .filter((student) => student.active !== false);

        studentsReady = true;
        studentsCached = snapshot.metadata.fromCache;

        const ids = new Set(students.map((student) => student.uid));

        for (const [id, unsubscribe] of attendanceListeners) {
          if (!ids.has(id)) {
            unsubscribe();
            attendanceListeners.delete(id);
            attendanceResults.delete(id);
          }
        }

        for (const id of ids) {
          if (attendanceListeners.has(id)) continue;

          const unsubscribe = onSnapshot(
            query(
              collection(db, "attendance"),
              where("userId", "==", id)
            ),
            { includeMetadataChanges: true },
            (attendanceSnapshot) => {
              if (stopped || !students.some((student) => student.uid === id)) {
                return;
              }

              attendanceResults.set(id, {
                cached: attendanceSnapshot.metadata.fromCache,
                records: attendanceSnapshot.docs.map((document) => ({
                  ...document.data(),
                  id: document.id,
                })),
              });

              emit();
            },
            fail
          );

          attendanceListeners.set(id, unsubscribe);
        }

        emit();
      },
      fail
    );

    const unsubscribeDisputes = onSnapshot(
      query(
        collection(db, "disputes"),
        where("department", "==", department)
      ),
      { includeMetadataChanges: true },
      (snapshot) => {
        if (stopped) return;

        disputes = snapshot.docs.map((document) => ({
          ...document.data(),
          id: document.id,
        }));

        disputesReady = true;
        disputesCached = snapshot.metadata.fromCache;
        emit();
      },
      fail
    );

    return () => {
      stopped = true;
      unsubscribeStudents();
      unsubscribeDisputes();
      attendanceListeners.forEach((unsubscribe) => unsubscribe());
    };
  }, [uid, department, allowed, retry]);

  return data;
}

function latestPerStudent(records, day) {
  const latest = new Map();

  records.forEach((record) => {
    const date = recordDate(record);
    if (!record.userId || dateKey(date) !== day) return;

    const previous = latest.get(record.userId);
    const previousTime = previous ? recordDate(previous)?.getTime() || 0 : -1;

    if (
      !previous ||
      date.getTime() > previousTime ||
      (
        date.getTime() === previousTime &&
        String(record.id).localeCompare(String(previous.id)) > 0
      )
    ) {
      latest.set(record.userId, record);
    }
  });

  return latest;
}

function weeklyData(records, todayKey) {
  const today = new Date(`${todayKey}T00:00:00Z`);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - (6 - index));

    const key = date.toISOString().slice(0, 10);
    const latest = latestPerStudent(records, key);

    const result = {
      day: date.toLocaleDateString("en-GB", {
        timeZone: "UTC",
        weekday: "short",
      }),
      date: key,
      present: 0,
      late: 0,
      absent: 0,
    };

    latest.forEach((record) => {
      const status = statusOf(record.status);
      if (Object.prototype.hasOwnProperty.call(result, status)) {
        result[status] += 1;
      }
    });

    return result;
  });
}

function sessionState(session, clock) {
  if (clock.minutes < timeToMinutes(session.startTime)) return "Upcoming";
  if (clock.minutes < timeToMinutes(session.endTime)) return "In progress";
  return "Ended";
}

function csvCell(value) {
  let text = String(value ?? "");

  // Prevent student-provided text from becoming spreadsheet formulas.
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;

  return `"${text.replaceAll('"', '""')}"`;
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const department = String(user?.department || "").trim();
  const allowed = user?.role === "teacher" && user?.active !== false;

  const [retry, setRetry] = useState(0);
  const data = useTeacherData(user?.uid, department, allowed, retry);

  const [clock, setClock] = useState(clockNow);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [exportError, setExportError] = useState("");

  const [timetable, setTimetable] = useState({
    sessions: [],
    loading: true,
    error: "",
  });

  useEffect(() => {
    const update = () => setClock(clockNow());
    const connection = () => setOnline(navigator.onLine);

    const timer = window.setInterval(update, 15000);
    window.addEventListener("focus", update);
    window.addEventListener("online", connection);
    window.addEventListener("offline", connection);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("online", connection);
      window.removeEventListener("offline", connection);
    };
  }, []);

  useEffect(() => {
    if (!allowed) return;

    setTimetable({ sessions: [], loading: true, error: "" });

    return subscribeToTimetable(
      (schedule) => {
        const valid = schedule.sessions.every(
          (session) =>
            session &&
            typeof session.id === "string" &&
            typeof session.subjectCode === "string" &&
            Number.isInteger(session.day) &&
            session.day >= 1 &&
            session.day <= 5 &&
            Number.isFinite(timeToMinutes(session.startTime)) &&
            Number.isFinite(timeToMinutes(session.endTime)) &&
            timeToMinutes(session.endTime) > timeToMinutes(session.startTime)
        );

        setTimetable({
          sessions: valid ? schedule.sessions : [],
          loading: false,
          error: valid ? "" : "The timetable contains invalid sessions.",
        });
      },
      (error) => {
        setTimetable({
          sessions: [],
          loading: false,
          error: errorMessage(error),
        });
      }
    );
  }, [allowed, user?.uid, retry]);

  useEffect(() => {
    setSearch("");
    setStatusFilter("all");
  }, [user?.uid, department]);

  const latestToday = useMemo(
    () => latestPerStudent(data.records, clock.key),
    [data.records, clock.key]
  );

  const studentRows = useMemo(
    () =>
      data.students.map((student) => {
        const record = latestToday.get(student.uid);

        return {
          uid: student.uid,
          name: nameOf(student),
          studentId: student.studentId || "—",
          status: record ? statusOf(record.status) : "not_recorded",
          timestamp: record ? recordDate(record) : null,
          method: record ? methodOf(record) : "—",
          device: record?.deviceId || record?.terminalId || "—",
          record,
        };
      }).sort((a, b) => {
        if (a.timestamp && b.timestamp) {
          return b.timestamp.getTime() - a.timestamp.getTime() ||
            a.name.localeCompare(b.name);
        }

        if (a.timestamp) return -1;
        if (b.timestamp) return 1;

        return a.name.localeCompare(b.name);
      }),
    [data.students, latestToday]
  );

  const counts = useMemo(() => {
    const result = {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      unknown: 0,
      not_recorded: 0,
    };

    studentRows.forEach((row) => { result[row.status] += 1; });
    return result;
  }, [studentRows]);

  const visibleRows = useMemo(() => {
    const text = search.trim().toLowerCase();

    return studentRows.filter((row) =>
      (statusFilter === "all" || row.status === statusFilter) &&
      (!text || `${row.name} ${row.studentId} ${row.method} ${row.device}`
        .toLowerCase().includes(text))
    );
  }, [studentRows, search, statusFilter]);

  const chartData = useMemo(
    () => weeklyData(data.records, clock.key),
    [data.records, clock.key]
  );

  const hasChartData = chartData.some(
    (day) => day.present || day.late || day.absent
  );

  const pendingDisputes = useMemo(
    () =>
      data.disputes
        .filter((dispute) =>
          String(dispute.status || "").toLowerCase() === "pending"
        )
        .sort((a, b) =>
          (safeDate(b.createdAt)?.getTime() || 0) -
          (safeDate(a.createdAt)?.getTime() || 0)
        ),
    [data.disputes]
  );

  const sessions = useMemo(
    () => [...timetable.sessions].sort(
      (a, b) => a.day - b.day ||
        timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    ),
    [timetable.sessions]
  );

  const todaySessions = sessions.filter(
    (session) => session.day === clock.day
  );

  const currentSession = todaySessions.find(
    (session) =>
      clock.minutes >= timeToMinutes(session.startTime) &&
      clock.minutes < timeToMinutes(session.endTime)
  );

  const nextSession = sessions
    .map((session) => {
      let daysAway = (session.day - clock.day + 7) % 7;

      if (
        daysAway === 0 &&
        timeToMinutes(session.startTime) <= clock.minutes
      ) {
        daysAway = 7;
      }

      return {
        session,
        daysAway,
        distance: daysAway * 1440 +
          timeToMinutes(session.startTime) - clock.minutes,
      };
    })
    .sort((a, b) => a.distance - b.distance)[0];

  const methods = useMemo(() => {
    const result = { face: 0, fingerprint: 0, rfid: 0, manual: 0, other: 0 };

    studentRows.filter((row) => row.record).forEach((row) => {
      const method = row.method.toLowerCase();

      if (method.includes("finger")) result.fingerprint += 1;
      else if (method.includes("face")) result.face += 1;
      else if (method.includes("rfid")) result.rfid += 1;
      else if (method.includes("manual")) result.manual += 1;
      else result.other += 1;
    });

    return result;
  }, [studentRows]);

  const ready = !data.loading && !data.error;

  const connectionLabel = data.error
    ? "Connection error"
    : !online
      ? "Offline"
      : data.loading
        ? "Connecting…"
        : data.cached
          ? "Cached data"
          : "Live attendance";

  const displayName =
    user?.firstName ||
    user?.fullName ||
    user?.email?.split("@")[0] ||
    "Teacher";

  const greeting =
    clock.minutes < 720
      ? "Good morning"
      : clock.minutes < 1080
        ? "Good afternoon"
        : "Good evening";

  function exportCSV() {
    if (!ready || !visibleRows.length) return;
    setExportError("");

    try {
      const lines = [
        ["Student", "Student ID", "Date (MYT)", "Time (MYT)", "Status", "Method", "Device"],
        ...visibleRows.map((row) => [
          row.name,
          row.studentId,
          clock.key,
          displayTime(row.timestamp),
          statusLabel(row.status),
          row.method,
          row.device,
        ]),
      ];

      const content = "\uFEFF" +
        lines.map((line) => line.map(csvCell).join(",")).join("\r\n");

      const url = URL.createObjectURL(
        new Blob([content], { type: "text/csv;charset=utf-8;" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = `attendance-${clock.key}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError("Unable to create the CSV report. Please try again.");
    }
  }

  if (!allowed) {
    return (
      <section className="teacher-dashboard">
        <div className="td-panel">An active teacher account is required.</div>
      </section>
    );
  }

  return (
    <section className="teacher-dashboard">
      <header className="td-hero">
        <div>
          <span className="td-eyebrow">
            <ShieldCheck size={14} /> TEACHER WORKSPACE
          </span>
          <h1>{greeting}, <span>{displayName}</span></h1>
          <p>Review attendance, follow today’s classes, and respond to student disputes.</p>

          <div className="td-tags">
            <span>{department || "Department not configured"}</span>
            <span>{clock.label}</span>
            <span className={ready && online && !data.cached ? "td-live" : ""}>
              <Activity size={12} /> {connectionLabel}
            </span>
          </div>
        </div>

        <div className="td-class-preview">
          <span className="td-eyebrow">
            {currentSession ? "CURRENT CLASS" : "NEXT CLASS"}
          </span>
          <strong>
            {timetable.loading
              ? "Loading…"
              : timetable.error
                ? "Schedule unavailable"
                : currentSession?.subjectCode ||
                  nextSession?.session.subjectCode ||
                  "No sessions"}
          </strong>
          <small>
            {currentSession
              ? `${currentSession.startTime} – ${currentSession.endTime} · In progress`
              : nextSession
                ? `${nextSession.daysAway === 0 ? "Today" : DAYS[nextSession.session.day]} · ${nextSession.session.startTime}${nextSession.daysAway === 7 ? " · next week" : ""}`
                : "Shared CID timetable"}
          </small>
          <button type="button" onClick={() => navigate("/teacher/timetable")}>
            View Timetable <ArrowRight size={15} />
          </button>
        </div>
      </header>

      {!department && (
        <div className="td-message td-warning" role="alert">
          Ask the administrator to set your account department to CID
          to monitor CID student attendance. Shared timetable access
          remains available.
        </div>
      )}

      {data.error && (
        <div className="td-message td-warning" role="alert">
          <span>{data.error}</span>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      )}

      <div className="td-stat-grid">
        {[
          { key: "all", label: "Active Students", value: studentRows.length, icon: Users, tone: "cyan", hint: "All students in your department" },
          { key: "present", label: "Present Today", value: counts.present, icon: CheckCircle2, tone: "green", hint: "Latest saved status today" },
          { key: "late", label: "Late Today", value: counts.late, icon: Clock3, tone: "amber", hint: "Recorded late arrivals" },
          { key: "not_recorded", label: "Not Recorded", value: counts.not_recorded, icon: FileWarning, tone: "cyan", hint: "No attendance record today" },
        ].map(({ key, label, value, icon: Icon, tone, hint }) => (
          <button
            type="button"
            key={key}
            className={`td-stat td-tone-${tone} ${statusFilter === key ? "is-selected" : ""}`}
            disabled={!ready}
            aria-pressed={statusFilter === key}
            onClick={() => setStatusFilter(key)}
          >
            <span><Icon size={19} /> {label}</span>
            <strong>{ready ? value : "—"}</strong>
            <small>{hint}</small>
          </button>
        ))}
      </div>

      <section className="td-panel">
        <div className="td-section-heading">
          <div>
            <span className="td-eyebrow">SHARED CID SCHEDULE</span>
            <h2>Today’s Classes</h2>
            <p>{clock.time} MYT · Session status follows scheduled times.</p>
          </div>
          <button type="button" onClick={() => navigate("/teacher/timetable")}>
            Full Timetable <ArrowRight size={15} />
          </button>
        </div>

        {timetable.error ? (
          <div className="td-message td-warning" role="alert">
            <span>{timetable.error}</span>
            <button type="button" onClick={() => setRetry((value) => value + 1)}>
              Retry
            </button>
          </div>
        ) : timetable.loading ? (
          <p className="td-empty" role="status">Loading classes…</p>
        ) : !todaySessions.length ? (
          <div className="td-empty">
            <CalendarDays size={26} />
            <h3>No classes scheduled today</h3>
            <p>Open the timetable to view the next scheduled class.</p>
          </div>
        ) : (
          <div className="td-session-grid">
            {todaySessions.map((session) => {
              const state = sessionState(session, clock);

              return (
                <button
                  type="button"
                  key={session.id}
                  className={`td-session ${state === "In progress" ? "is-current" : ""}`}
                  onClick={() => navigate("/teacher/timetable")}
                >
                  <span className="td-session-status">{state}</span>
                  <strong>{session.subjectCode}</strong>
                  <span><Clock3 size={14} /> {session.startTime} – {session.endTime}</span>
                  <small>Open timetable <ArrowRight size={13} /></small>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="td-work-grid">
        <section className="td-panel td-attendance-panel">
          <div className="td-section-heading">
            <div>
              <span className="td-eyebrow">TODAY’S STUDENT TOTALS</span>
              <h2>Attendance Register</h2>
              <p>One row per active student, using their latest record today.</p>
            </div>
            <div className="td-actions">
              <button type="button" disabled={!ready || !visibleRows.length} onClick={exportCSV}>
                <Download size={14} /> CSV
              </button>
              <button type="button" onClick={() => navigate("/teacher/attendance")}>
                All Records <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <div className="td-table-filters">
            <label className="td-search">
              <Search size={17} />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, ID, method, or device…"
                aria-label="Search attendance register"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter attendance status"
            >
              <option value="all">All students</option>
              {["present", "late", "absent", "excused", "not_recorded", "unknown"].map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </div>

          {exportError && <p className="td-warning" role="alert">{exportError}</p>}

          <div className="td-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Time · MYT</th>
                  <th>Status</th>
                  <th>Method</th>
                  <th>Device</th>
                </tr>
              </thead>
              <tbody>
                {!ready ? (
                  <tr><td colSpan={5} className="td-table-empty">
                    {data.error ? "Attendance data unavailable." : data.loading ? "Loading attendance…" : "Set your account department to load attendance."}
                  </td></tr>
                ) : !visibleRows.length ? (
                  <tr><td colSpan={5} className="td-table-empty">
                    No students match this view.
                  </td></tr>
                ) : visibleRows.map((row) => (
                  <tr key={row.uid}>
                    <td>
                      <div className="td-student">
                        <span className="td-avatar">{row.name.slice(0, 1).toUpperCase()}</span>
                        <div><strong>{row.name}</strong><small>{row.studentId}</small></div>
                      </div>
                    </td>
                    <td>{displayTime(row.timestamp)}</td>
                    <td>
                      <span
                        className="td-status-badge"
                        style={{ color: STATUS_COLORS[row.status] }}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td>{row.method}</td>
                    <td>{row.device}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <footer className="td-table-footer">
            <span>{ready ? `${visibleRows.length} of ${studentRows.length} students` : "Waiting for data"}</span>
            <span>Recorded absent: {ready ? counts.absent : "—"} · Excused: {ready ? counts.excused : "—"}</span>
          </footer>
        </section>

        <aside className="td-side-panels">
          <section className="td-panel">
            <span className="td-eyebrow td-amber">NEEDS REVIEW</span>
            <h2>Student Disputes</h2>
            <div className="td-dispute-total">
              <strong>{ready ? pendingDisputes.length : "—"}</strong>
              <span>Pending departmental reviews</span>
            </div>

            {ready && !pendingDisputes.length && (
              <p className="td-note">No pending disputes.</p>
            )}

            {ready && pendingDisputes.slice(0, 3).map((dispute) => {
              const student = data.students.find(
                (item) => item.uid === dispute.userId
              );

              return (
                <button
                  type="button"
                  key={dispute.id}
                  className="td-dispute-item"
                  onClick={() => navigate("/teacher/disputes")}
                >
                  <strong>{student ? nameOf(student) : dispute.studentName || "Student dispute"}</strong>
                  <span>{dispute.reason || dispute.description || "Attendance review requested"}</span>
                </button>
              );
            })}

            <button
              type="button"
              className="td-wide-button"
              onClick={() => navigate("/teacher/disputes")}
            >
              Review Disputes <ArrowRight size={15} />
            </button>
          </section>

          <section className="td-panel">
            <span className="td-eyebrow">RECORDED METHODS</span>
            <h2>Authentication Today</h2>

            {[
              [ScanFace, "Face", methods.face],
              [Fingerprint, "Fingerprint", methods.fingerprint],
              [Radio, "RFID", methods.rfid],
              [ShieldCheck, "Manual", methods.manual],
              [Activity, "Other / Unknown", methods.other],
            ].map(([Icon, label, value]) => (
              <div className="td-method-row" key={label}>
                <span><Icon size={17} /> {label}</span>
                <strong>{ready ? value : "—"}</strong>
              </div>
            ))}

            <p className="td-note">
              Methods from each student’s latest record today.
              These counts do not prove biometric verification.
            </p>
          </section>
        </aside>
      </div>

      <section className="td-panel">
        <div className="td-section-heading">
          <div>
            <span className="td-eyebrow">LAST SEVEN DAYS</span>
            <h2>Attendance Trend</h2>
            <p>Latest recorded daily status per currently active student.</p>
          </div>
          <button type="button" onClick={() => navigate("/teacher/analytics")}>
            View Analytics <ArrowRight size={15} />
          </button>
        </div>

        <div className="td-chart-legend">
          <span><i style={{ background: STATUS_COLORS.present }} /> Present</span>
          <span><i style={{ background: STATUS_COLORS.late }} /> Late</span>
          <span><i style={{ background: STATUS_COLORS.absent }} /> Recorded absent</span>
        </div>

        {!ready || !hasChartData ? (
          <div className="td-empty">
            <AlertTriangle size={25} />
            <h3>{ready ? "No recorded trend yet" : "Trend unavailable"}</h3>
            <p>{ready ? "Saved Present, Late, and Absent records will appear here." : "Waiting for attendance data."}</p>
          </div>
        ) : (
          <div className="td-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="rgba(137,167,181,0.15)" vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="#89a7b5" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis allowDecimals={false} stroke="#89a7b5" tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip
                  cursor={{ fill: "rgba(0,221,235,0.04)" }}
                  contentStyle={{
                    background: "#09212c",
                    border: "1px solid #23505f",
                    borderRadius: 9,
                    color: "#eaf7fc",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="present" name="Present" fill={STATUS_COLORS.present} radius={[3, 3, 0, 0]} />
                <Bar dataKey="late" name="Late" fill={STATUS_COLORS.late} radius={[3, 3, 0, 0]} />
                <Bar dataKey="absent" name="Recorded absent" fill={STATUS_COLORS.absent} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <p className="td-footnote">
        Not Recorded means no saved attendance record today. It does not
        mean absent. Dashboard totals are daily student totals and are
        not yet linked to individual timetable sessions.
      </p>
    </section>
  );
}