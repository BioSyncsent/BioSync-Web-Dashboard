import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  doc,
  onSnapshot,
} from "firebase/firestore";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  RefreshCw,
  ScanFace,
  Search,
  Users,
  Wifi,
} from "lucide-react";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";

import "./Dashboard.css";

const TIME_ZONE = "Asia/Kuala_Lumpur";

const datePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});

const fullDateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "long",
});

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function dayKey(date) {
  const parts = Object.fromEntries(
    datePartsFormatter
      .formatToParts(date)
      .map(({ type, value }) => [type, value])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function asDate(value) {
  if (!value) return null;

  try {
    let date;

    if (typeof value.toDate === "function") {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === "number") {
      // Support epoch seconds and epoch milliseconds.
      date = new Date(value < 1e12 ? value * 1000 : value);
    } else if (
      typeof value === "object" &&
      typeof value.seconds === "number"
    ) {
      date = new Date(value.seconds * 1000);
    } else if (
      typeof value === "string" &&
      !/^\d{1,2}:\d{2}(:\d{2})?$/.test(value)
    ) {
      date = new Date(value);
    }

    return date && Number.isFinite(date.getTime()) ? date : null;
  } catch {
    return null;
  }
}

function validDay(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const date = new Date(`${value}T00:00:00+08:00`);

  return Number.isFinite(date.getTime()) && dayKey(date) === value
    ? value
    : null;
}

function minutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(
    String(value || "")
  );

  return match && Number(match[1]) < 24 && Number(match[2]) < 60
    ? Number(match[1]) * 60 + Number(match[2])
    : null;
}

function displayName(user) {
  return (
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    user?.fullName ||
    user?.name ||
    user?.displayName ||
    "Unknown student"
  );
}

function statusInfo(value) {
  const status = normalize(value).replace(/[\s-]+/g, "_");

  if (["present", "on_time", "ontime"].includes(status)) {
    return { key: "present", label: "On Time", tone: "green" };
  }

  if (status === "late") {
    return { key: "late", label: "Late", tone: "amber" };
  }

  if (status === "absent") {
    return { key: "absent", label: "Absent", tone: "red" };
  }

  if (status === "excused") {
    return { key: "excused", label: "Excused", tone: "cyan" };
  }

  return { key: "unknown", label: "Unknown", tone: "muted" };
}

function methodLabel(value) {
  const text = normalize(value);

  if (!text) return "Unknown";

  const methods = [];

  if (text.includes("rfid")) methods.push("RFID");
  if (text.includes("face")) methods.push("Face");
  if (text.includes("finger")) methods.push("Fingerprint");

  return methods.length ? methods.join(" + ") : "Other";
}

function enrollmentStatus(user, profile, modality) {
  const candidates = [
    profile?.registrationStatus?.[modality],
    profile?.enrollmentStatus?.[modality],
    profile?.enrollment?.[modality],
    profile?.[`${modality}Status`],
    profile?.[modality],
    user?.registrationStatus?.[modality],
    user?.enrollmentStatus?.[modality],
    user?.[`${modality}Status`],
  ];

  for (const candidate of candidates) {
    const value =
      candidate && typeof candidate === "object"
        ? candidate.status
        : candidate;

    const status = normalize(value);

    if (status === "pending") return "pending";
    if (status === "enrolled") return "enrolled";
  }

  return "unknown";
}

function latestEntries(rows) {
  const entries = new Map();

  for (const row of rows) {
    // Separate timetable sessions remain separate attendance entries.
    const key = JSON.stringify([
      row.day,
      row.uid,
      row.sessionId || "daily",
    ]);

    const existing = entries.get(key);

    if (!existing || row.sortTime > existing.sortTime) {
      entries.set(key, row);
    }
  }

  return [...entries.values()];
}

function matchesWeekday(value, weekday) {
  if (typeof value === "number") {
    // JavaScript weekday numbering: Sunday 0, Monday 1...
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    return days[value === 7 ? 0 : value] === weekday;
  }

  const day = normalize(value);

  return day.length >= 3 &&
    day.slice(0, 3) === normalize(weekday).slice(0, 3);
}

function sourceLabel(name) {
  return {
    users: "Student profiles",
    attendance: "Attendance",
    disputes: "Disputes",
    authProfile: "Enrollment profiles",
    timetable: "CID timetable",
  }[name];
}

function useLiveSource(name, enabled, identity, retryVersion) {
  const [state, setState] = useState({
    data: name === "timetable" ? null : [],
    loading: true,
    error: "",
    cached: false,
    pendingWrites: false,
  });

  useEffect(() => {
    const emptyData = name === "timetable" ? null : [];

    setState({
      data: emptyData,
      loading: true,
      error: "",
      cached: false,
      pendingWrites: false,
    });

    if (!enabled) return undefined;

    let active = true;

    const reference =
      name === "timetable"
        ? doc(db, "timetables", "CID")
        : collection(db, name);

    const unsubscribe = onSnapshot(
      reference,
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!active) return;

        const data =
          name === "timetable"
            ? snapshot.exists()
              ? { ...snapshot.data(), id: snapshot.id }
              : null
            : snapshot.docs.map((document) => ({
                ...document.data(),
                id: document.id,
              }));

        setState({
          data,
          loading: false,
          error: "",
          cached: snapshot.metadata.fromCache,
          pendingWrites: snapshot.metadata.hasPendingWrites,
        });
      },
      (error) => {
        if (!active) return;

        console.error(`${sourceLabel(name)} listener failed:`, error);

        setState((previous) => ({
          ...previous,
          loading: false,
          error: `${sourceLabel(name)} could not load (${error.code || "error"}).`,
        }));
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [name, enabled, identity, retryVersion]);

  return { ...state, name };
}

function DataMessage({ sources, onRetry, children }) {
  const failed = sources.filter((source) => source.error);

  if (failed.length) {
    return (
      <div className="cid-data-message cid-data-error" role="alert">
        <AlertTriangle size={18} aria-hidden="true" />

        <div>
          {failed.map((source) => (
            <p key={source.name}>{source.error}</p>
          ))}
        </div>

        <button
          type="button"
          className="cid-text-button"
          onClick={onRetry}
        >
          <RefreshCw size={14} aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  if (sources.some((source) => source.loading)) {
    return (
      <div className="cid-data-message" role="status">
        Loading data…
      </div>
    );
  }

  return children;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [now, setNow] = useState(() => new Date());
  const [retryVersion, setRetryVersion] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [attentionMode, setAttentionMode] = useState("");

  const enabled =
    normalize(user?.role) === "admin" && user?.active === true;

  const users = useLiveSource(
    "users", enabled, user?.uid, retryVersion
  );

  const attendance = useLiveSource(
    "attendance", enabled, user?.uid, retryVersion
  );

  const disputes = useLiveSource(
    "disputes", enabled, user?.uid, retryVersion
  );

  const profiles = useLiveSource(
    "authProfile", enabled, user?.uid, retryVersion
  );

  const timetable = useLiveSource(
    "timetable", enabled, user?.uid, retryVersion
  );

  useEffect(() => {
    const timer = window.setInterval(
      () => setNow(new Date()),
      30_000
    );

    return () => window.clearInterval(timer);
  }, []);

  const today = dayKey(now);
  const weekday = weekdayFormatter.format(now);
  const currentMinutes = minutes(timeFormatter.format(now));

  const retry = () => setRetryVersion((version) => version + 1);

  const userLookup = useMemo(() => {
    const lookup = new Map();

    users.data.forEach((student) => {
      lookup.set(student.id, student);

      if (student.studentId) {
        lookup.set(String(student.studentId), student);
      }
    });

    return lookup;
  }, [users.data]);

  const activeStudents = useMemo(
    () => users.data.filter(
      (student) =>
        normalize(student.role) === "student" &&
        normalize(student.department) === "cid" &&
        student.active === true
    ),
    [users.data]
  );

  const profileLookup = useMemo(
    () => new Map(
      profiles.data.map((profile) => [profile.id, profile])
    ),
    [profiles.data]
  );

  const attendanceModel = useMemo(() => {
    let invalidDates = 0;
    const rows = [];

    for (const record of attendance.data) {
      const uid = record.userId || record.uid;

      const student =
        userLookup.get(uid) ||
        userLookup.get(String(record.studentId || ""));

      const department = normalize(
        record.department || student?.department
      );

      if (department !== "cid") continue;

      // Exclude known admin / teacher records.
      if (student && normalize(student.role) !== "student") {
        continue;
      }

      const identity =
        student?.id || uid || record.studentId;

      if (!identity) continue;

      const checkInDate =
        asDate(record.checkInTime) ||
        asDate(record.timestamp) ||
        asDate(record.time);

      const storedDay =
        validDay(record.attendanceDate) ||
        validDay(record.date);

      const fallbackDate =
        asDate(record.date) ||
        asDate(record.createdAt);

      const date = checkInDate || fallbackDate;
      const day = storedDay || (date ? dayKey(date) : null);

      if (!day) {
        invalidDates += 1;
        continue;
      }

      const rawTime = [
        record.checkInTime,
        record.time,
      ].find((value) => minutes(value) !== null);

      const displayTime = checkInDate
        ? timeFormatter.format(checkInDate)
        : rawTime
          ? String(rawTime)
          : "—";

      const orderingTime = checkInDate
        ? checkInDate.getTime()
        : rawTime
          ? new Date(`${day}T${rawTime}:00+08:00`).getTime()
          : date?.getTime() || 0;

      rows.push({
        id: record.id,
        uid: String(identity),
        day,
        sortTime: orderingTime,
        sessionId:
          record.sessionId ||
          record.timetableSessionId ||
          "",
        name:
          record.name ||
          record.studentName ||
          displayName(student),
        studentId:
          record.studentId ||
          student?.studentId ||
          "No student ID",
        time: displayTime,
        status: statusInfo(record.status),
        method: methodLabel(
          record.method || record.verificationMethod
        ),
      });
    }

    return {
      rows: latestEntries(rows).sort(
        (first, second) =>
          second.day.localeCompare(first.day) ||
          second.sortTime - first.sortTime
      ),
      invalidDates,
    };
  }, [attendance.data, userLookup]);

  const todayRows = useMemo(
    () => attendanceModel.rows.filter((row) => row.day === today),
    [attendanceModel.rows, today]
  );

  const todayCounts = useMemo(
    () => ({
      present: todayRows.filter(
        (row) => row.status.key === "present"
      ).length,
      late: todayRows.filter(
        (row) => row.status.key === "late"
      ).length,
    }),
    [todayRows]
  );

  const pendingDisputes = useMemo(
    () => disputes.data.filter((dispute) => {
      const student = userLookup.get(
        dispute.userId || dispute.uid
      );

      return normalize(dispute.status) === "pending" &&
        normalize(
          dispute.department || student?.department
        ) === "cid";
    }),
    [disputes.data, userLookup]
  );

  const enrollment = useMemo(() => {
    const result = {
      rfid: [],
      face: [],
      unknown: 0,
    };

    activeStudents.forEach((student) => {
      const profile = profileLookup.get(student.id);
      const rfid = enrollmentStatus(student, profile, "rfid");
      const face = enrollmentStatus(student, profile, "face");

      if (rfid === "pending") result.rfid.push(student);
      if (face === "pending") result.face.push(student);

      if (rfid === "unknown" || face === "unknown") {
        result.unknown += 1;
      }
    });

    return result;
  }, [activeStudents, profileLookup]);

  const schedule = useMemo(() => {
    const rawSessions = Array.isArray(timetable.data?.sessions)
      ? timetable.data.sessions
      : [];

    let invalid = 0;
    const sessions = [];

    rawSessions.forEach((session, index) => {
      if (session.active === false) return;

      if (!matchesWeekday(
        session.day || session.dayOfWeek || session.weekday,
        weekday
      )) {
        return;
      }

      const startTime = session.startTime || session.start;
      const endTime = session.endTime || session.end;

      const start = minutes(startTime);
      const end = minutes(endTime);

      if (start === null || end === null || end <= start) {
        invalid += 1;
        return;
      }

      const graceValue =
        session.graceMinutes ??
        session.gracePeriodMinutes ??
        session.gracePeriod;

      const grace =
        graceValue !== undefined &&
        graceValue !== null &&
        graceValue !== "" &&
        Number.isFinite(Number(graceValue)) &&
        Number(graceValue) >= 0
          ? Number(graceValue)
          : null;

      sessions.push({
        id: session.id || `session-${index}`,
        subject:
          session.subject ||
          session.subjectName ||
          session.title ||
          "Untitled session",
        startTime,
        endTime,
        start,
        grace,
        state:
          currentMinutes < start
            ? "Upcoming"
            : currentMinutes < end
              ? "In Progress"
              : "Ended",
      });
    });

    return {
      sessions: sessions.sort((first, second) => first.start - second.start),
      invalid,
    };
  }, [timetable.data, weekday, currentMinutes]);

  const trend = useMemo(() => {
    const anchor = new Date(`${today}T00:00:00+08:00`);

    const days = Array.from({ length: 14 }, (_, index) => {
      const date = new Date(
        anchor.getTime() - (13 - index) * 86_400_000
      );

      return {
        day: dayKey(date),
        label: shortDateFormatter.format(date),
        present: 0,
        late: 0,
      };
    });

    const lookup = new Map(
      days.map((entry) => [entry.day, entry])
    );

    attendanceModel.rows.forEach((row) => {
      const entry = lookup.get(row.day);

      if (!entry) return;

      if (row.status.key === "present") entry.present += 1;
      if (row.status.key === "late") entry.late += 1;
    });

    return days;
  }, [attendanceModel.rows, today]);

  const visibleRows = useMemo(() => {
    const text = normalize(search);

    return todayRows.filter(
      (row) =>
        (statusFilter === "all" ||
          row.status.key === statusFilter) &&
        (!text ||
          normalize(`${row.name} ${row.studentId}`).includes(text))
    );
  }, [todayRows, statusFilter, search]);

  const allSources = [
    users,
    attendance,
    disputes,
    profiles,
    timetable,
  ];

  const syncState = allSources.some((source) => source.error)
    ? "error"
    : allSources.some((source) => source.loading)
      ? "loading"
      : allSources.some((source) => source.pendingWrites)
        ? "saving"
        : allSources.some((source) => source.cached)
          ? "cached"
          : "live";

  const syncLabel = {
    error: "Some data unavailable",
    loading: "Connecting",
    saving: "Syncing changes",
    cached: "Cached data",
    live: "Dashboard synced",
  }[syncState];

  const attendanceReady =
    !users.loading &&
    !users.error &&
    !attendance.loading &&
    !attendance.error;

  const disputesReady =
    !users.loading &&
    !users.error &&
    !disputes.loading &&
    !disputes.error;

  function selectAttendance(status) {
    setStatusFilter(status);
    setSearch("");

    document.getElementById("cid-recent-attendance")
      ?.scrollIntoView({ block: "start", behavior: "auto" });
  }

  const metrics = [
    {
      label: "Active CID Students",
      value: users.loading || users.error
        ? "—"
        : activeStudents.length,
      helper: "Open user management",
      icon: Users,
      tone: "cyan",
      action: () => navigate("/admin/users"),
    },
    {
      label: "On Time",
      value: attendanceReady ? todayCounts.present : "—",
      helper: "Show today’s on-time entries",
      icon: CheckCircle2,
      tone: "green",
      action: () => selectAttendance("present"),
    },
    {
      label: "Late",
      value: attendanceReady ? todayCounts.late : "—",
      helper: "Show today’s late entries",
      icon: Clock3,
      tone: "amber",
      action: () => selectAttendance("late"),
    },
    {
      label: "Pending CID Disputes",
      value: disputesReady ? pendingDisputes.length : "—",
      helper: "Open dispute management",
      icon: AlertTriangle,
      tone: "red",
      action: () => navigate("/admin/disputes"),
    },
  ];

  const attentionStudents =
    attentionMode === "rfid"
      ? enrollment.rfid
      : attentionMode === "face"
        ? enrollment.face
        : [];

  if (!enabled) {
    return (
      <div className="cid-dashboard">
        <div className="cid-data-message">
          An active admin account is required to view this dashboard.
        </div>
      </div>
    );
  }

  return (
    <div className="cid-dashboard">
      <section className="cid-overview-banner">
  <div className="cid-overview-banner-copy">
    <span className="cid-overview-eyebrow">
      <span className="cid-overview-eyebrow-dot" />
      BIOSYNC ADMIN CONTROL
    </span>

    <h1>
      Attendance <span>Overview</span>
    </h1>

    <p>
      Your daily view of CID attendance, scheduled sessions,
      and pending actions.
    </p>

    <div className="cid-overview-banner-details">
      <span className="cid-overview-date-chip">
        <CalendarDays size={14} aria-hidden="true" />
        {fullDateFormatter.format(now)}
      </span>

      <span
        className={`cid-sync cid-sync-${syncState}`}
        role="status"
        title="Status of all five dashboard data listeners"
      >
        <Wifi size={14} aria-hidden="true" />
        {syncLabel}
      </span>
    </div>
  </div>

  <div className="cid-overview-banner-actions">
    <span className="cid-overview-scope">
      CID ATTENDANCE
    </span>

    <button
      type="button"
      className="cid-overview-timetable-button"
      onClick={() => navigate("/admin/timetable")}
    >
      <CalendarDays size={18} aria-hidden="true" />

      <span>View CID Timetable</span>

      <ArrowRight size={17} aria-hidden="true" />
    </button>

    <small>Plan sessions. Monitor attendance.</small>
  </div>
</section>

      <div className="cid-overview-meta">
        <span>{fullDateFormatter.format(now)}</span>

        <span
          className={`cid-sync cid-sync-${syncState}`}
          role="status"
          title="Status of all five dashboard data listeners"
        >
          <Wifi size={14} aria-hidden="true" />
          {syncLabel}
        </span>
      </div>

      {allSources.some((source) => source.error) && (
        <div className="cid-error-summary" role="alert">
          <AlertTriangle size={17} aria-hidden="true" />
          Some panels could not load. Check their error messages.

          <button
            type="button"
            className="cid-text-button"
            onClick={retry}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Retry connections
          </button>
        </div>
      )}

      <section className="cid-metrics" aria-label="Today's summary">
        {metrics.map(({ label, value, helper, icon: Icon, tone, action }) => (
          <button
            key={label}
            type="button"
            className={`cid-metric cid-tone-${tone}`}
            onClick={action}
          >
            <Icon size={25} aria-hidden="true" />

            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{helper}</small>
            </div>
          </button>
        ))}
      </section>

      <div className="cid-content-grid">
        <section
          id="cid-recent-attendance"
          className="cid-panel"
          aria-labelledby="cid-attendance-title"
        >
          <div className="cid-panel-heading">
            <div>
              <h2 id="cid-attendance-title">Recent Attendance</h2>
              <p>Today’s recorded CID attendance entries.</p>
            </div>

            <button
              type="button"
              className="cid-text-button"
              onClick={() => navigate("/admin/attendance")}
            >
              View all
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <div className="cid-table-toolbar">
            <label className="cid-search">
              <Search size={16} aria-hidden="true" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student or ID"
                aria-label="Search attendance by student name or ID"
              />
            </label>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter attendance status"
            >
              <option value="all">All statuses</option>
              <option value="present">On Time</option>
              <option value="late">Late</option>
              <option value="absent">Absent</option>
              <option value="excused">Excused</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <DataMessage sources={[users, attendance]} onRetry={retry}>
            {visibleRows.length ? (
              <div className="cid-table-wrap">
                <table className="cid-table">
                  <thead>
                    <tr>
                      <th scope="col">Student</th>
                      <th scope="col">Check-in</th>
                      <th scope="col">Status</th>
                      <th scope="col">Verification</th>
                    </tr>
                  </thead>

                  <tbody>
                    {visibleRows.slice(0, 8).map((row) => (
                      <tr key={row.id}>
                        <td>
                          <div className="cid-student">
                            <span className="cid-student-avatar" aria-hidden="true">
                              {String(row.name).charAt(0).toUpperCase()}
                            </span>

                            <div>
                              <strong>{row.name}</strong>
                              <small>{row.studentId}</small>
                            </div>
                          </div>
                        </td>

                        <td className="cid-number">{row.time}</td>

                        <td>
                          <span className={`cid-pill cid-pill-${row.status.tone}`}>
                            {row.status.label}
                          </span>
                        </td>

                        <td>{row.method}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="cid-empty">
                {search || statusFilter !== "all"
                  ? "No attendance entries match these filters."
                  : "No CID attendance recorded today."}
              </div>
            )}

            <p className="cid-panel-note">
              Showing {Math.min(visibleRows.length, 8)} of {visibleRows.length} matching entries.
              {" "}Repeated records for the same student and session are counted once.
            </p>

            {attendanceModel.invalidDates > 0 && (
              <p className="cid-warning-note">
                {attendanceModel.invalidDates} CID record(s) have no usable attendance date
                and are excluded from daily counts.
              </p>
            )}
          </DataMessage>
        </section>

        <section className="cid-panel" aria-labelledby="cid-schedule-title">
          <div className="cid-panel-heading">
            <div>
              <h2 id="cid-schedule-title">Today’s CID Schedule</h2>
              <p>{weekday} · Malaysia time</p>
            </div>

            <button
              type="button"
              className="cid-text-button"
              onClick={() => navigate("/admin/timetable")}
            >
              Manage
              <ArrowRight size={15} aria-hidden="true" />
            </button>
          </div>

          <DataMessage sources={[timetable]} onRetry={retry}>
            {!timetable.data ? (
              <div className="cid-empty">
                {timetable.cached
                  ? "No timetable is available in the local cache."
                  : "No CID timetable saved yet."}

                <button
                  type="button"
                  className="cid-text-button"
                  onClick={() => navigate("/admin/timetable")}
                >
                  Open timetable
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            ) : schedule.sessions.length ? (
              <div className="cid-schedule-list">
                {schedule.sessions.map((session) => (
                  <article
                    key={session.id}
                    className={`cid-session ${
                      session.state === "In Progress" ? "cid-session-current" : ""
                    }`}
                  >
                    <div className="cid-session-top">
                      <h3>{session.subject}</h3>

                      <span
                        className={`cid-pill ${
                          session.state === "In Progress"
                            ? "cid-pill-green"
                            : session.state === "Upcoming"
                              ? "cid-pill-cyan"
                              : "cid-pill-muted"
                        }`}
                      >
                        {session.state}
                      </span>
                    </div>

                    <p className="cid-session-time">
                      <Clock3 size={15} aria-hidden="true" />
                      {session.startTime} – {session.endTime}
                    </p>

                    <small>
                      {session.grace === null
                        ? "Grace period not specified"
                        : `Grace period: ${session.grace} minutes`}
                    </small>
                  </article>
                ))}
              </div>
            ) : (
              <div className="cid-empty">
                No valid sessions scheduled for today.
              </div>
            )}

            {schedule.invalid > 0 && (
              <p className="cid-warning-note">
                {schedule.invalid} session(s) have invalid start/end times.
              </p>
            )}
          </DataMessage>
        </section>

        <section className="cid-panel" aria-labelledby="cid-trend-title">
          <div className="cid-panel-heading">
            <div>
              <h2 id="cid-trend-title">14-Day Attendance Trend</h2>
              <p>Recorded entries, including today.</p>
            </div>

            <div className="cid-chart-legend">
              <span><i className="cid-dot-cyan" />On Time</span>
              <span><i className="cid-dot-amber" />Late</span>
            </div>
          </div>

          <DataMessage sources={[users, attendance]} onRetry={retry}>
            {trend.some((entry) => entry.present || entry.late) ? (
              <div className="cid-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={trend}
                    margin={{ top: 12, right: 12, bottom: 0, left: -18 }}
                  >
                    <defs>
                      <linearGradient id="cid-dashboard-trend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00ddeb" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#00ddeb" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    <CartesianGrid
                      vertical={false}
                      stroke="rgba(125, 190, 207, 0.12)"
                      strokeDasharray="3 3"
                    />

                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={22}
                      tick={{ fill: "#8aabba", fontSize: 11 }}
                    />

                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#8aabba", fontSize: 11 }}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#09212c",
                        border: "1px solid #28515e",
                        borderRadius: 10,
                        color: "#e9f6fc",
                        fontSize: 12,
                      }}
                      labelStyle={{ color: "#e9f6fc" }}
                    />

                    <Area
                      type="linear"
                      dataKey="present"
                      name="On Time"
                      stroke="#00ddeb"
                      strokeWidth={2}
                      fill="url(#cid-dashboard-trend)"
                      isAnimationActive={false}
                    />

                    <Line
                      type="linear"
                      dataKey="late"
                      name="Late"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="cid-empty cid-chart-empty">
                No on-time or late attendance recorded in the last 14 days.
              </div>
            )}
          </DataMessage>
        </section>

        <section className="cid-panel" aria-labelledby="cid-attention-title">
          <div className="cid-panel-heading">
            <div>
              <h2 id="cid-attention-title">Needs Attention</h2>
              <p>Pending actions for CID students.</p>
            </div>
          </div>

          <DataMessage sources={[users, disputes]} onRetry={retry}>
            <button
              type="button"
              className="cid-attention-row"
              onClick={() => navigate("/admin/disputes")}
            >
              <span className="cid-attention-icon cid-tone-red">
                <AlertTriangle size={20} aria-hidden="true" />
              </span>

              <span className="cid-attention-copy">
                <strong>{pendingDisputes.length} pending disputes</strong>
                <small>Open dispute management</small>
              </span>

              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </DataMessage>

          <DataMessage sources={[users, profiles]} onRetry={retry}>
            {[
              { key: "rfid", label: "RFID", icon: CreditCard },
              { key: "face", label: "face", icon: ScanFace },
            ].map(({ key, label, icon: Icon }) => (
              <button
                type="button"
                key={key}
                className="cid-attention-row"
                aria-expanded={attentionMode === key}
                onClick={() => setAttentionMode(
                  (current) => current === key ? "" : key
                )}
              >
                <span className="cid-attention-icon cid-tone-cyan">
                  <Icon size={20} aria-hidden="true" />
                </span>

                <span className="cid-attention-copy">
                  <strong>
                    {enrollment[key].length} awaiting {label} enrollment
                  </strong>
                  <small>Show students marked pending</small>
                </span>

                <ArrowRight size={16} aria-hidden="true" />
              </button>
            ))}

            {attentionMode && (
              <div className="cid-enrollment-details">
                <h3>
                  Pending {attentionMode === "rfid" ? "RFID" : "face"} enrollment
                </h3>

                {attentionStudents.length ? (
                  <ul>
                    {attentionStudents.map((student) => (
                      <li key={student.id}>
                        <strong>{displayName(student)}</strong>
                        <span>{student.studentId || "No student ID"}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No students are marked pending.</p>
                )}

                <button
                  type="button"
                  className="cid-text-button"
                  onClick={() => navigate("/admin/users")}
                >
                  Open user management
                  <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            )}

            {enrollment.unknown > 0 && (
              <p className="cid-panel-note">
                {enrollment.unknown} student(s) have unknown RFID or face enrollment
                status and are not included in pending counts.
              </p>
            )}
          </DataMessage>

          <button
            type="button"
            className="cid-terminal-link"
            onClick={() => navigate("/admin/devices")}
          >
            Terminal status unavailable · Open Devices
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </section>
      </div>
    </div>
  );
}