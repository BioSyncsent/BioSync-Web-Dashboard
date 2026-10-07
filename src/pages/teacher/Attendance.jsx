import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Eye,
  FileWarning,
  Filter,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";

import "./Attendance.css";

const TIMEZONE = "Asia/Kuala_Lumpur";

const LABELS = {
  present: "Present",
  late: "Late",
  absent: "Absent",
  excused: "Excused",
  unknown: "Unknown",
  not_recorded: "Not Recorded",
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

function malaysiaDate(value = new Date()) {
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

function shiftDay(day, amount) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function displayDate(value) {
  return value
    ? value.toLocaleDateString("en-GB", {
        timeZone: TIMEZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}

function displayTime(value) {
  return value
    ? value.toLocaleTimeString("en-GB", {
        timeZone: TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

function nameOf(student) {
  return (
    student.fullName ||
    [student.firstName, student.lastName].filter(Boolean).join(" ") ||
    student.email ||
    "Unnamed student"
  );
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();

  return ["present", "late", "absent", "excused"].includes(status)
    ? status
    : "unknown";
}

function verificationOf(record) {
  const explicit =
    record.verificationResult ??
    record.verificationStatus ??
    record.result;

  if (explicit != null && String(explicit).trim()) {
    return String(explicit).trim().toLowerCase();
  }

  const method =
    record.authMethod ||
    record.authenticationMethod ||
    record.method ||
    "";

  return (
    String(record.source || "").toLowerCase() === "manual" ||
    String(method).toLowerCase() === "manual"
  ) ? "manual" : "unknown";
}

function errorText(error) {
  return error?.code === "permission-denied"
    ? "Access denied. Check your account department and Firestore permissions."
    : error?.message || "Unable to load attendance.";
}

function initialData() {
  return {
    students: [],
    records: [],
    loading: true,
    cached: true,
    error: "",
  };
}

/*
 * Uses department-filtered students and one userId attendance
 * query per student, matching the existing teacher rules.
 */
function useTeacherAttendance(uid, department, allowed, retry) {
  const [data, setData] = useState(initialData);

  useEffect(() => {
    if (!allowed || !uid || !department) {
      setData({ ...initialData(), loading: false });
      return;
    }

    let stopped = false;
    let students = [];
    let studentsReady = false;
    let studentsCached = true;
    let failure = "";

    const listeners = new Map();
    const results = new Map();

    function emit() {
      if (stopped) return;

      const ids = students.map((student) => student.uid);
      const complete = ids.every((id) => results.has(id));

      setData({
        students,
        records: ids.flatMap((id) => results.get(id)?.records || []),
        loading: !(studentsReady && complete),
        cached:
          studentsCached ||
          ids.some((id) => results.get(id)?.cached !== false),
        error: failure,
      });
    }

    function fail(error) {
      if (stopped) return;
      failure = errorText(error);
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

        students = snapshot.docs.map((document) => ({
          ...document.data(),
          uid: document.id,
        }));

        studentsReady = true;
        studentsCached = snapshot.metadata.fromCache;

        const ids = new Set(students.map((student) => student.uid));

        for (const [id, unsubscribe] of listeners) {
          if (!ids.has(id)) {
            unsubscribe();
            listeners.delete(id);
            results.delete(id);
          }
        }

        for (const id of ids) {
          if (listeners.has(id)) continue;

          const unsubscribe = onSnapshot(
            query(
              collection(db, "attendance"),
              where("userId", "==", id)
            ),
            { includeMetadataChanges: true },
            (attendanceSnapshot) => {
              if (
                stopped ||
                !students.some((student) => student.uid === id)
              ) return;

              results.set(id, {
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

          listeners.set(id, unsubscribe);
        }

        emit();
      },
      fail
    );

    return () => {
      stopped = true;
      unsubscribeStudents();
      listeners.forEach((unsubscribe) => unsubscribe());
    };
  }, [uid, department, allowed, retry]);

  return data;
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportValues(row) {
  return [
    row.studentName,
    row.studentId,
    row.day || "Unavailable",
    displayTime(row.timestamp),
    LABELS[row.status],
    row.authMethod,
    row.deviceId,
    row.verificationResult,
  ];
}

const EXPORT_HEADERS = [
  "Student",
  "Student ID",
  "Date (MYT)",
  "Time (MYT)",
  "Status",
  "Method",
  "Device",
  "Verification",
];

function DetailsDialog({ row, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="ta-dialog"
      aria-labelledby="ta-details-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="ta-dialog-content">
        <header>
          <div>
            <span className="ta-eyebrow">ATTENDANCE DETAILS</span>
            <h2 id="ta-details-title">{row.studentName}</h2>
          </div>
          <button type="button" aria-label="Close details" onClick={onClose}>
            <X size={19} />
          </button>
        </header>

        <dl className="ta-details-grid">
          {[
            ["Student ID", row.studentId],
            ["Email", row.email],
            ["Department", row.department],
            ["Course", row.course],
            ["Date", displayDate(row.timestamp)],
            ["Time · MYT", displayTime(row.timestamp)],
            ["Status", LABELS[row.status]],
            ["Authentication", row.authMethod],
            ["Verification", row.verificationResult],
            ["Device", row.deviceId],
            ["Source", row.source],
            ["Liveness result", row.raw.livenessResult ?? row.raw.livenessStatus],
            ["Notes", row.notes],
            ["Record ID", row.recordId],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{String(value ?? "—") || "—"}</dd>
            </div>
          ))}
        </dl>

        <p className="ta-note">
          Details reflect saved database fields. Attendance status alone
          does not prove biometric verification.
        </p>
      </div>
    </dialog>
  );
}

export default function TeacherAttendance() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const department = String(user?.department || "").trim();
  const allowed = user?.role === "teacher" && user?.active !== false;

  const [retry, setRetry] = useState(0);
  const data = useTeacherAttendance(
    user?.uid,
    department,
    allowed,
    retry
  );

  const [mode, setMode] = useState("students");
  const [from, setFrom] = useState(malaysiaDate);
  const [to, setTo] = useState(malaysiaDate);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [sort, setSort] = useState({
    key: "timestamp",
    direction: "desc",
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedId, setSelectedId] = useState(null);
  const [exportError, setExportError] = useState("");
  const [online, setOnline] = useState(() => navigator.onLine);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);

    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    setSelectedId(null);
    setSearch("");
    setStatus("all");
    setMethod("all");
  }, [user?.uid, department]);

  const invalidRange = Boolean(from && to && from > to);
  const singleDay = Boolean(from && from === to);
  const ready = Boolean(department) && !data.loading && !data.error;

  const records = useMemo(() => {
    const students = new Map(
      data.students.map((student) => [student.uid, student])
    );

    return data.records.map((record) => {
      const student = students.get(record.userId) || {};
      const timestamp = recordDate(record);

      return {
        id: record.id,
        recordId: record.id,
        userId: record.userId,
        studentName: nameOf(student),
        studentId: student.studentId || record.studentId || "—",
        email: student.email || record.email || "",
        department: student.department || record.department || "—",
        course: student.course || record.course || "—",
        status: normalizeStatus(record.status),
        timestamp,
        day: malaysiaDate(timestamp),
        authMethod:
          record.authMethod ||
          record.authenticationMethod ||
          record.method ||
          "Unknown",
        deviceId: record.deviceId || record.terminalId || "—",
        verificationResult: verificationOf(record),
        source: record.source || "Unknown",
        notes: record.notes || record.reason || "",
        raw: record,
      };
    });
  }, [data.records, data.students]);

  const rangeRecords = useMemo(() => {
    if (invalidRange) return [];

    return records.filter((record) =>
      (!from || (record.day && record.day >= from)) &&
      (!to || (record.day && record.day <= to))
    );
  }, [records, from, to, invalidRange]);

  const baseRows = useMemo(() => {
    if (mode === "records") return rangeRecords;
    if (!singleDay || invalidRange) return [];

    const latest = new Map();

    rangeRecords.forEach((record) => {
      const previous = latest.get(record.userId);

      if (
        !previous ||
        record.timestamp.getTime() > previous.timestamp.getTime() ||
        (
          record.timestamp.getTime() === previous.timestamp.getTime() &&
          record.id.localeCompare(previous.id) > 0
        )
      ) {
        latest.set(record.userId, record);
      }
    });

    return data.students
      .filter((student) => student.active !== false)
      .map((student) =>
        latest.get(student.uid) || {
          id: `missing:${student.uid}`,
          recordId: null,
          userId: student.uid,
          studentName: nameOf(student),
          studentId: student.studentId || "—",
          email: student.email || "",
          department: student.department || "—",
          course: student.course || "—",
          status: "not_recorded",
          timestamp: null,
          day: from,
          authMethod: "—",
          deviceId: "—",
          verificationResult: "—",
          source: "—",
          notes: "",
          raw: {},
        }
      );
  }, [mode, singleDay, invalidRange, rangeRecords, data.students, from]);

  const methods = useMemo(
    () => [...new Set(records.map((record) => record.authMethod))].sort(),
    [records]
  );

  // Counts respect date, view, search, and method, but not status.
  const matchingRows = useMemo(() => {
    const text = search.trim().toLowerCase();

    return baseRows.filter((row) =>
      (method === "all" || row.authMethod === method) &&
      (
        !text ||
        [
          row.studentName,
          row.studentId,
          row.email,
          row.authMethod,
          row.deviceId,
          row.notes,
        ].join(" ").toLowerCase().includes(text)
      )
    );
  }, [baseRows, method, search]);

  const counts = useMemo(() => {
    const result = {
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      unknown: 0,
      not_recorded: 0,
    };
    matchingRows.forEach((row) => { result[row.status] += 1; });
    return result;
  }, [matchingRows]);

  const filteredRows = useMemo(() =>
    matchingRows
      .filter((row) => status === "all" || row.status === status)
      .sort((a, b) => {
        let comparison;

        if (sort.key === "timestamp") {
          if (!a.timestamp && !b.timestamp) {
            return a.studentName.localeCompare(b.studentName);
          }
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
        } else {
          comparison = String(a[sort.key] || "").localeCompare(
            String(b[sort.key] || ""),
            undefined,
            { numeric: true }
          );
        }

        return (
          (sort.direction === "asc" ? comparison : -comparison) ||
          a.id.localeCompare(b.id)
        );
      }),
    [matchingRows, status, sort]
  );

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const selectedRow = records.find((record) => record.id === selectedId);

  useEffect(() => {
    setPage(1);
    setExportError("");
  }, [mode, from, to, search, status, method, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function chooseMode(value) {
    setMode(value);
    setStatus("all");

    if (value === "students") {
      const day = from || malaysiaDate();
      setFrom(day);
      setTo(day);
    }
  }

  function setDateRange(start, end) {
    setFrom(start);
    setTo(end);

    if (!start || start !== end) {
      setMode("records");
      if (status === "not_recorded") setStatus("all");
    }
  }

  function shortcut(value) {
    const today = malaysiaDate();

    setSearch("");
    setMethod("all");
    setStatus("all");

    if (value === "today") {
      setFrom(today);
      setTo(today);
    } else if (value === "week") {
      setMode("records");
      setFrom(shiftDay(today, -6));
      setTo(today);
    } else {
      setMode("records");
      setFrom("");
      setTo("");
    }
  }

  function reset() {
    setMode("students");
    setFrom(malaysiaDate());
    setTo(malaysiaDate());
    setSearch("");
    setStatus("all");
    setMethod("all");
    setSort({ key: "timestamp", direction: "desc" });
  }

  function changeSort(key) {
    setSort((previous) => ({
      key,
      direction:
        previous.key === key && previous.direction === "asc"
          ? "desc"
          : "asc",
    }));
  }

  function sortHeader(key, label) {
    return (
      <button type="button" className="ta-sort" onClick={() => changeSort(key)}>
        {label}
        {sort.key === key && (
          sort.direction === "asc"
            ? <ArrowUp size={12} />
            : <ArrowDown size={12} />
        )}
      </button>
    );
  }

  function downloadCSV() {
    if (!ready || !filteredRows.length) return;
    setExportError("");

    try {
      const lines = [
        EXPORT_HEADERS,
        ...filteredRows.map(exportValues),
      ];

      const content = "\uFEFF" +
        lines.map((line) => line.map(csvCell).join(",")).join("\r\n");

      const url = URL.createObjectURL(
        new Blob([content], { type: "text/csv;charset=utf-8;" })
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = "teacher-attendance.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setExportError("Unable to create the CSV export.");
    }
  }

  function printPDF() {
    if (!ready || !filteredRows.length || exporting) return;
    setExportError("");

    const report = window.open("", "_blank");

    if (!report) {
      setExportError("Allow pop-ups for this website to open the printable report.");
      return;
    }

    setExporting(true);

    try {
      const document = report.document;
      document.title = "BioSync Attendance Report";

      const style = document.createElement("style");
      style.textContent = `
        body { font: 12px Arial, sans-serif; color: #172b36; margin: 28px; }
        h1 { font-size: 23px; margin-bottom: 8px; }
        p { line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 8px; border: 1px solid #d5dde1; text-align: left; overflow-wrap: anywhere; }
        th { background: #e8f4f6; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; }
        button { padding: 10px 15px; margin-top: 12px; cursor: pointer; }
        @page { size: A4 landscape; margin: 12mm; }
        @media print { body { margin: 0; } button { display: none; } }
      `;
      document.head.appendChild(style);

      const heading = document.createElement("h1");
      heading.textContent = "BioSync Sentinel — Attendance Report";
      document.body.appendChild(heading);

      const description = document.createElement("p");
      description.textContent =
        `Department: ${department} | View: ${mode === "students" ? "Daily student summary" : "All records"} | ` +
        `Date range: ${from || "Any"} to ${to || "Any"} | Rows: ${filteredRows.length}. ` +
        "Not Recorded indicates no saved record; it does not indicate absence.";
      document.body.appendChild(description);

      const printButton = document.createElement("button");
      printButton.textContent = "Print / Save as PDF";
      printButton.onclick = () => report.print();
      document.body.appendChild(printButton);

      const table = document.createElement("table");
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      EXPORT_HEADERS.forEach((label) => {
        const cell = document.createElement("th");
        cell.textContent = label;
        headerRow.appendChild(cell);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      const tbody = document.createElement("tbody");

      filteredRows.forEach((row) => {
        const tableRow = document.createElement("tr");

        exportValues(row).forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = String(value ?? "");
          tableRow.appendChild(cell);
        });

        tbody.appendChild(tableRow);
      });

      table.appendChild(tbody);
      document.body.appendChild(table);
      report.focus();
    } catch {
      report.close();
      setExportError("Unable to create the printable report.");
    } finally {
      setExporting(false);
    }
  }

  const connectionLabel = data.error
    ? "Connection error"
    : !online
      ? "Offline"
      : data.loading
        ? "Connecting…"
        : data.cached
          ? "Cached data"
          : "Live attendance";

  if (!allowed) {
    return (
      <section className="teacher-attendance">
        <div className="ta-panel">An active teacher account is required.</div>
      </section>
    );
  }

  return (
    <section className="teacher-attendance">
      <header className="ta-hero">
        <div>
          <span className="ta-eyebrow">
            <ShieldCheck size={14} /> TEACHER WORKSPACE
          </span>
          <h1>Attendance <span>Register</span></h1>
          <p>Review your department’s attendance and export the records you need.</p>

          <div className="ta-tags">
            <span>{department || "Department not configured"}</span>
            <span>Malaysia time · UTC+8</span>
            <span>View only</span>
            <span className={ready && online && !data.cached ? "ta-live" : ""}>
              {connectionLabel}
            </span>
          </div>
        </div>

        <button type="button" onClick={() => navigate("/teacher/disputes")}>
          Review Disputes <ArrowRight size={15} />
        </button>
      </header>

      {!department && (
        <div className="ta-message ta-warning" role="alert">
          Ask the administrator to configure your account department.
          Use CID to monitor the shared CID class.
        </div>
      )}

      {data.error && (
        <div className="ta-message ta-warning" role="alert">
          <span>{data.error}</span>
          <button type="button" onClick={() => setRetry((value) => value + 1)}>
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      )}

      <div className="ta-summary">
        {[
          { key: "all", label: mode === "students" ? "Students" : "Records", value: matchingRows.length, icon: Users, tone: "cyan" },
          { key: "present", label: "Present", value: counts.present, icon: CheckCircle2, tone: "green" },
          { key: "late", label: "Late", value: counts.late, icon: Clock3, tone: "amber" },
          { key: "absent", label: "Recorded Absent", value: counts.absent, icon: XCircle, tone: "red" },
          { key: "not_recorded", label: "Not Recorded", value: counts.not_recorded, icon: FileWarning, tone: "cyan" },
        ].map(({ key, label, value, icon: Icon, tone }) => (
          <button
            type="button"
            key={key}
            className={`ta-stat ta-tone-${tone} ${status === key ? "is-active" : ""}`}
            aria-pressed={status === key}
            disabled={!ready || invalidRange}
            onClick={() => {
              if (key === "not_recorded" && mode !== "students") {
                chooseMode("students");
                setMethod("all");
                setStatus("not_recorded");
              } else {
                setStatus(key);
              }
            }}
          >
            <span>{label}<Icon size={18} /></span>
            <strong>
              {!ready || invalidRange || (key === "not_recorded" && mode === "records")
                ? "—"
                : value}
            </strong>
            <small>
              {key === "not_recorded" && mode === "records"
                ? "Click for a daily student view"
                : "Click to filter"}
            </small>
          </button>
        ))}
      </div>

      <section className="ta-panel">
        <div className="ta-section-heading">
          <div>
            <span className="ta-eyebrow">FIND YOUR RECORDS</span>
            <h2><Filter size={18} /> Attendance Filters</h2>
            <p>
              Daily student view uses one selected day. Date ranges switch
              automatically to all recorded scans.
            </p>
          </div>

          <div className="ta-actions">
            <button type="button" onClick={() => shortcut("today")}>Today</button>
            <button type="button" onClick={() => shortcut("week")}>Last 7 Days</button>
            <button type="button" onClick={() => shortcut("all")}>All Dates</button>
            <button type="button" onClick={reset}>Reset</button>
          </div>
        </div>

        <div className="ta-view-switch" aria-label="Attendance view">
          <button
            type="button"
            className={mode === "students" ? "is-active" : ""}
            aria-pressed={mode === "students"}
            onClick={() => chooseMode("students")}
          >Daily Student View</button>

          <button
            type="button"
            className={mode === "records" ? "is-active" : ""}
            aria-pressed={mode === "records"}
            onClick={() => chooseMode("records")}
          >All Recorded Scans</button>
        </div>

        <label className="ta-search">
          <Search size={18} />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search student, ID, email, device, or notes…"
            aria-label="Search attendance"
          />
        </label>

        <div className="ta-filter-grid">
          <label>
            From date
            <input
              type="date"
              value={from}
              onChange={(event) => setDateRange(event.target.value, to)}
            />
          </label>

          <label>
            To date
            <input
              type="date"
              value={to}
              onChange={(event) => setDateRange(from, event.target.value)}
            />
          </label>

          <label>
            Status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">All statuses</option>
              {Object.entries(LABELS)
                .filter(([key]) => mode === "students" || key !== "not_recorded")
                .map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </label>

          <label>
            Authentication method
            <select value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="all">All methods</option>
              {methods.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>

        {invalidRange && (
          <p className="ta-warning" role="alert">
            The end date must be on or after the start date.
          </p>
        )}

        <p className="ta-note">
          Summary cards follow the selected view, date, search, and method.
          Status filters change the table below.
        </p>
      </section>

      <section className="ta-panel ta-record-panel">
        <div className="ta-section-heading">
          <div>
            <span className="ta-eyebrow">
              {mode === "students" ? "ONE ROW PER ACTIVE STUDENT" : "SAVED ATTENDANCE HISTORY"}
            </span>
            <h2>
              {mode === "students" ? "Daily Student Register" : "Attendance Records"}
              <span className="ta-count">{ready ? filteredRows.length : "—"}</span>
            </h2>
            <p>
              {mode === "students"
                ? "The latest record for each currently active student on the selected day."
                : "All saved records for students currently in your department, including inactive students."}
            </p>
          </div>

          <div className="ta-actions">
            <button
              type="button"
              disabled={!ready || !filteredRows.length || invalidRange}
              onClick={downloadCSV}
            ><Download size={14} /> CSV</button>

            <button
              type="button"
              disabled={!ready || !filteredRows.length || invalidRange || exporting}
              onClick={printPDF}
            ><Printer size={14} /> Print / PDF</button>
          </div>
        </div>

        {exportError && <p className="ta-warning" role="alert">{exportError}</p>}

        <div className="ta-table-scroll">
          <table className="ta-table">
            <thead>
              <tr>
                <th aria-sort={sort.key === "studentName" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}>
                  {sortHeader("studentName", "Student")}
                </th>
                <th aria-sort={sort.key === "timestamp" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}>
                  {sortHeader("timestamp", "Date & Time")}
                </th>
                <th>Status</th>
                <th>Authentication</th>
                <th>Device</th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {!ready ? (
                <tr><td colSpan={6} className="ta-empty-cell">
                  {data.error
                    ? "Attendance data unavailable."
                    : !department
                      ? "Configure your account department to load attendance."
                      : "Loading attendance…"}
                </td></tr>
              ) : !visibleRows.length ? (
                <tr><td colSpan={6}>
                  <div className="ta-empty">
                    <Search size={28} />
                    <h3>No matching results</h3>
                    <p>Try resetting the filters or choosing another date.</p>
                  </div>
                </td></tr>
              ) : visibleRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <div className="ta-student">
                      <span className="ta-avatar">
                        {row.studentName.slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <strong>{row.studentName}</strong>
                        <small>{row.studentId}</small>
                      </div>
                    </div>
                  </td>

                  <td>
                    <strong>{row.timestamp ? displayDate(row.timestamp) : row.day}</strong>
                    <small>{displayTime(row.timestamp)}{row.timestamp ? " MYT" : ""}</small>
                  </td>

                  <td>
                    <span className={`ta-badge ta-status-${row.status}`}>
                      {LABELS[row.status]}
                    </span>
                  </td>

                  <td>
                    <strong>{row.authMethod}</strong>
                    <small>{row.verificationResult}</small>
                  </td>

                  <td>{row.deviceId}</td>

                  <td>
                    {row.recordId ? (
                      <button
                        type="button"
                        onClick={() => setSelectedId(row.recordId)}
                        aria-label={`View attendance details for ${row.studentName}`}
                      ><Eye size={14} /> View</button>
                    ) : (
                      <span className="ta-muted">No record</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <footer className="ta-pagination">
          <span>
            Showing {ready && filteredRows.length ? (currentPage - 1) * pageSize + 1 : 0}
            –{ready ? Math.min(currentPage * pageSize, filteredRows.length) : 0}
            {" "}of {ready ? filteredRows.length : 0}
          </span>

          <div className="ta-actions">
            <label className="ta-page-size">
              Rows
              <select value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))}>
                {[10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
            </label>

            <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
              <ChevronLeft size={16} />
            </button>

            <span>{currentPage} / {totalPages}</span>

            <button type="button" aria-label="Next page" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>

        <p className="ta-note">
          Exports include every filtered row across all pages. Use the
          printable report’s button, then choose Save as PDF in your browser.
        </p>
      </section>

      <p className="ta-footnote">
        Not Recorded means no saved record on the selected date, not an absence.
        Historical daily student views use the current active student roster.
        Timetable-based punctuality is not calculated here.
      </p>

      {ready && selectedId && (
        selectedRow ? (
          <DetailsDialog row={selectedRow} onClose={() => setSelectedId(null)} />
        ) : (
          <div className="ta-message" role="status">
            <span>The selected record is no longer available.</span>
            <button type="button" onClick={() => setSelectedId(null)}>Dismiss</button>
          </div>
        )
      )}
    </section>
  );
}