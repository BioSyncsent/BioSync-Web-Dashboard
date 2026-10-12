import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Database,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  Filter,
  History,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useFirestoreSubscription } from "../../hooks/useFirestoreSubscription";
import {
  addManualAttendance,
  deleteAttendanceRecord,
  deleteAttendanceRecords,
  fetchDeletedAttendanceAuditLogs,
  generateAttendanceRecordsForStudents,
  restoreAllDeletedRecords,
  restoreAttendanceRecord,
  subscribeToAttendanceManagement,
  updateAttendanceRecord,
} from "../../services/attendanceService";
import { exportToCSV, exportToPDF } from "../../utils/exportAttendance";
import "./Attendance.css";

const EMPTY_RECORDS = [];
const STATUSES = ["present", "late", "absent", "excused"];

const DEFAULT_FILTERS = {
  search: "",
  department: "all",
  status: "all",
  method: "all",
  from: "",
  to: "",
};

function asDate(value) {
  if (!value) return null;

  const date =
    typeof value.toDate === "function"
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function inputDate(value = new Date()) {
  const date = asDate(value);
  if (!date) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function inputTime(value = new Date()) {
  const date = asDate(value);
  if (!date) return "";

  return [
    String(date.getHours()).padStart(2, "0"),
    String(date.getMinutes()).padStart(2, "0"),
  ].join(":");
}

function titleCase(value) {
  return String(value || "Unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function displayDate(value) {
  const date = asDate(value);
  return date
    ? date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "Unavailable";
}

function displayTime(value) {
  const date = asDate(value);
  return date
    ? date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
}

function notify(options) {
  return Swal.fire({
    background: "#09212c",
    color: "#eaf7fc",
    confirmButtonColor: "#087f91",
    cancelButtonColor: "#28424f",
    ...options,
  });
}

function Dialog({ title, children, onClose, busy = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className="aa-dialog"
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current && !busy) onClose();
      }}
    >
      <div className="aa-dialog-inner">
        <header className="aa-dialog-header">
          <div>
            <span className="aa-eyebrow">BIOSYNC SENTINEL</span>
            <h2>{title}</h2>
          </div>

          <button
            type="button"
            className="aa-icon-button"
            aria-label="Close dialog"
            disabled={busy}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </header>

        {children}
      </div>
    </dialog>
  );
}

function RecordForm({
  record,
  students,
  studentsLoading,
  studentsError,
  busy,
  onClose,
  onSave,
}) {
  const editing = Boolean(record);
  const [error, setError] = useState("");

  const [form, setForm] = useState(() => ({
    userId: record?.userId || "",
    status: record?.status || "present",
    date: inputDate(record?.timestamp || new Date()),
    time: inputTime(record?.timestamp || new Date()),
    notes: record?.notes || "",
  }));

  const change = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
  };

  async function submit(event) {
    event.preventDefault();
    if (busy) return;

    if (!form.userId || !form.date || !form.time || !form.notes.trim()) {
      setError("Choose a student, date, time, and enter a reason.");
      return;
    }

    if (
      !editing &&
      !students.some((student) => student.userId === form.userId)
    ) {
      setError("This student is no longer available. Choose another student.");
      return;
    }

    const payload = {
      ...form,
      notes: form.notes.trim(),
      // Preserve original authentication evidence when correcting a record.
      authMethod: editing ? record.authMethod || "Manual" : "Manual",
      deviceId: editing ? record.deviceId || "Admin Portal" : "Admin Portal",
      verificationResult: editing
        ? record.verificationResult || "manual"
        : "manual",
      source: editing ? record.source || "manual" : "manual",
    };

    try {
      await onSave(payload);
    } catch (saveError) {
      setError(saveError.message || "The record could not be saved.");
    }
  }

  return (
    <Dialog
      title={editing ? "Edit Attendance" : "Add Manual Attendance"}
      onClose={onClose}
      busy={busy}
    >
      <form onSubmit={submit}>
        <div className="aa-dialog-body">
          <p className="aa-notice">
            {editing
              ? "Correct the attendance details. Original authentication information is preserved."
              : "This entry will be recorded as Manual, with Admin Portal as its source device."}
          </p>

          {error && <p className="aa-error" role="alert">{error}</p>}

          <div className="aa-form-grid">
            <label className="aa-span">
              Student
              {editing ? (
                <input
                  value={`${record.studentName || "Student"} — ${record.studentId || record.userId}`}
                  readOnly
                />
              ) : (
                <select
                  name="userId"
                  value={form.userId}
                  onChange={change}
                  disabled={busy || studentsLoading || Boolean(studentsError)}
                  required
                >
                  <option value="">
                    {studentsLoading ? "Loading students…" : "Select a student"}
                  </option>
                  {students.map((student) => (
                    <option key={student.userId} value={student.userId}>
                      {student.studentName} — {student.studentId}
                    </option>
                  ))}
                </select>
              )}
            </label>

            {!editing && studentsError && (
              <p className="aa-error aa-span" role="alert">
                Unable to load students: {studentsError}
              </p>
            )}

            {!editing && !studentsLoading && !studentsError && !students.length && (
              <p className="aa-notice aa-span">
                No active student accounts were found in the users collection.
              </p>
            )}

            <label>
              Attendance status
              <select
                name="status"
                value={form.status}
                onChange={change}
                disabled={busy}
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{titleCase(status)}</option>
                ))}
              </select>
            </label>

            <label>
              Authentication
              <input
                value={editing ? record.authMethod || "Manual" : "Manual"}
                readOnly
              />
            </label>

            <label>
              Date
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={change}
                required
                disabled={busy}
              />
            </label>

            <label>
              Time
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={change}
                required
                disabled={busy}
              />
            </label>

            <label className="aa-span">
              Reason / notes
              <textarea
                name="notes"
                value={form.notes}
                onChange={change}
                placeholder="Explain why this record is being added or corrected."
                rows={4}
                maxLength={1000}
                required
                disabled={busy}
              />
            </label>
          </div>

          <small className="aa-muted">
            Date and time use your browser’s timezone, following the existing attendance service.
          </small>
        </div>

        <footer className="aa-dialog-footer">
          <button type="button" onClick={onClose} disabled={busy}>Cancel</button>
          <button
            className="aa-primary"
            type="submit"
            disabled={
              busy ||
              (!editing && (studentsLoading || Boolean(studentsError) || !students.length))
            }
          >
            {busy ? "Saving…" : editing ? "Save Changes" : "Add Record"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}

function RestoreModal({ adminUser, canManage, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState("audit");
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditError, setAuditError] = useState("");
  const [busy, setBusy] = useState(false);
  const [restoringId, setRestoringId] = useState(null);
  const [seedDays, setSeedDays] = useState(5);

  const loadAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      setAuditError("");
      const logs = await fetchDeletedAttendanceAuditLogs();
      setAuditLogs(logs);
    } catch (err) {
      setAuditError(err.message || "Failed to load audit logs.");
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  async function handleRestoreSingle(log) {
    if (busy || restoringId || !canManage) return;

    try {
      setRestoringId(log.auditId);
      await restoreAttendanceRecord(log, adminUser);
      setAuditLogs((prev) => prev.filter((item) => item.auditId !== log.auditId));
      onSuccess?.(`Restored attendance record for ${log.studentName || "student"}.`);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Restore Failed",
        text: err.message || "Unable to restore record.",
        background: "#09212c",
        color: "#eaf7fc",
        confirmButtonColor: "#087f91",
      });
    } finally {
      setRestoringId(null);
    }
  }

  async function handleRestoreAll() {
    if (busy || !auditLogs.length || !canManage) return;

    try {
      setBusy(true);
      const count = await restoreAllDeletedRecords(auditLogs, adminUser);
      await loadAuditLogs();
      onSuccess?.(`Successfully restored ${count} attendance record(s).`);
      onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Batch Restore Failed",
        text: err.message || "Failed to restore records.",
        background: "#09212c",
        color: "#eaf7fc",
        confirmButtonColor: "#087f91",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateAttendance(event) {
    event.preventDefault();
    if (busy || !canManage) return;

    try {
      setBusy(true);
      const result = await generateAttendanceRecordsForStudents(adminUser, {
        days: Number(seedDays) || 5,
      });
      onSuccess?.(
        `Generated ${result.totalCreated} attendance records across ${result.studentCount} students covering the past ${seedDays} days.`
      );
      onClose();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Attendance Generation Failed",
        text: err.message || "Failed to generate attendance records.",
        background: "#09212c",
        color: "#eaf7fc",
        confirmButtonColor: "#087f91",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Restore Attendance Records" onClose={onClose} busy={busy}>
      <div className="aa-dialog-body aa-restore-modal-body">
        <div className="aa-restore-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "audit"}
            className={`aa-tab-btn ${activeTab === "audit" ? "active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            <History size={16} /> Recover from Audit Logs
            {auditLogs.length > 0 && (
              <span className="aa-tab-badge">{auditLogs.length}</span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "seed"}
            className={`aa-tab-btn ${activeTab === "seed" ? "active" : ""}`}
            onClick={() => setActiveTab("seed")}
          >
            <Sparkles size={16} /> Generate / Re-seed Student Attendance
          </button>
        </div>

        {activeTab === "audit" && (
          <div className="aa-restore-tab-content">
            <p className="aa-notice">
              BioSync records deleted attendance entries in the audit trail.
              You can restore deleted records individually or all at once.
            </p>

            {loadingAudit ? (
              <div className="aa-restore-loading">
                <span className="aa-spinner" />
                <p>Checking audit logs for deleted records…</p>
              </div>
            ) : auditError ? (
              <div className="aa-notice aa-notice-error">
                <p>{auditError}</p>
                <button
                  type="button"
                  className="aa-text-button"
                  onClick={loadAuditLogs}
                >
                  Retry
                </button>
              </div>
            ) : !auditLogs.length ? (
              <div className="aa-restore-empty">
                <ArchiveRestore size={36} />
                <h3>No deleted records in audit logs</h3>
                <p>
                  No attendance records are currently marked as deleted in the audit trail.
                </p>
                <button
                  type="button"
                  className="aa-text-button aa-highlight-link"
                  onClick={() => setActiveTab("seed")}
                >
                  <Sparkles size={14} /> Switch to Generate / Re-seed Attendance
                </button>
              </div>
            ) : (
              <>
                <div className="aa-restore-list-header">
                  <span>
                    <strong>{auditLogs.length}</strong> deleted record
                    {auditLogs.length === 1 ? "" : "s"} found
                  </span>
                  <button
                    type="button"
                    className="aa-primary aa-btn-sm"
                    disabled={busy || !canManage}
                    onClick={handleRestoreAll}
                  >
                    <RotateCcw size={14} /> Restore All
                  </button>
                </div>

                <div className="aa-restore-list">
                  {auditLogs.map((log) => (
                    <div key={log.auditId} className="aa-restore-item">
                      <div className="aa-restore-item-info">
                        <div className="aa-restore-item-title">
                          <strong>{log.studentName}</strong>
                          <span className="aa-restore-id">
                            {log.studentId || log.userId}
                          </span>
                          <span
                            className={`aa-status aa-status-${log.status}`}
                          >
                            {titleCase(log.status)}
                          </span>
                        </div>

                        <div className="aa-restore-item-meta">
                          <span>
                            {displayDate(log.timestamp)} · {displayTime(log.timestamp)}
                          </span>
                          <span>Method: {log.authMethod}</span>
                          <span>Dept: {log.department}</span>
                          {log.logTimestamp && (
                            <small className="aa-muted">
                              Deleted on {displayDate(log.logTimestamp)}
                            </small>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className="aa-secondary aa-btn-sm"
                        disabled={busy || restoringId === log.auditId || !canManage}
                        onClick={() => handleRestoreSingle(log)}
                      >
                        {restoringId === log.auditId ? (
                          "Restoring…"
                        ) : (
                          <>
                            <RotateCcw size={13} /> Restore
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "seed" && (
          <form onSubmit={handleGenerateAttendance} className="aa-restore-tab-content">
            <div className="aa-seed-card">
              <div className="aa-seed-intro">
                <span className="aa-seed-icon">
                  <Sparkles size={24} />
                </span>
                <div>
                  <h3>Generate Student Attendance</h3>
                  <p>
                    Recreates realistic attendance logs for all active students registered
                    in the database across recent weekdays.
                  </p>
                </div>
              </div>

              <div className="aa-form-grid">
                <label className="aa-span">
                  Days to cover (excluding weekends)
                  <select
                    value={seedDays}
                    onChange={(e) => setSeedDays(Number(e.target.value))}
                    disabled={busy}
                  >
                    <option value={3}>Past 3 Days</option>
                    <option value={5}>Past 5 Days (1 Week)</option>
                    <option value={7}>Past 7 Days</option>
                    <option value={10}>Past 10 Days (2 Weeks)</option>
                    <option value={14}>Past 14 Days</option>
                  </select>
                </label>
              </div>

              <div className="aa-seed-features">
                <h4>What will be generated:</h4>
                <ul>
                  <li>
                    Authentic records for <strong>every active student</strong> in the users collection
                  </li>
                  <li>
                    Realistic status distribution: <strong>Present, Late, Absent, Excused</strong>
                  </li>
                  <li>
                    Biometric authentication methods: <strong>Face Recognition, RFID Card, Manual</strong>
                  </li>
                  <li>
                    Simulated morning check-in timestamps during class entry hours
                  </li>
                </ul>
              </div>

              <button
                type="submit"
                className="aa-primary aa-btn-generate"
                disabled={busy || !canManage}
              >
                {busy ? (
                  <>
                    <span className="aa-spinner" /> Generating Attendance…
                  </>
                ) : (
                  <>
                    <Sparkles size={16} /> Generate Attendance Records
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <footer className="aa-dialog-footer">
        <button type="button" onClick={onClose} disabled={busy}>
          Close
        </button>
      </footer>
    </Dialog>
  );
}

export default function AdminAttendance() {
  const { user } = useAuth();

  const subscription = useFirestoreSubscription(
    subscribeToAttendanceManagement,
    []
  );

  const records = subscription.data || EMPTY_RECORDS;

  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState("");
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [sort, setSort] = useState({ key: "timestamp", direction: "desc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const actionLock = useRef(false);
  const canManage = user?.role === "admin" && user?.active !== false;

  useEffect(() => {
    if (!canManage) {
      setStudents([]);
      setStudentsLoading(false);
      return;
    }

    setStudentsLoading(true);
    setStudentsError("");

    return onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const options = snapshot.docs
          .map((document) => {
            const data = document.data();
            return {
              ...data,
              userId: document.id,
              studentName:
                data.fullName ||
                [data.firstName, data.lastName].filter(Boolean).join(" ") ||
                data.email ||
                "Unnamed student",
              studentId: data.studentId || document.id,
            };
          })
          .filter(
            (student) =>
              student.role === "student" && student.active !== false
          )
          .sort((a, b) => a.studentName.localeCompare(b.studentName));

        setStudents(options);
        setStudentsLoading(false);
        setStudentsError("");
      },
      (error) => {
        setStudents([]);
        setStudentsLoading(false);
        setStudentsError(error.message || "Firebase permission error.");
      }
    );
  }, [canManage]);

  const choices = useMemo(() => ({
    departments: [...new Set(records.map((r) => r.department).filter(Boolean))].sort(),
    methods: [...new Set(records.map((r) => r.authMethod).filter(Boolean))].sort(),
  }), [records]);

  const invalidRange = Boolean(
    filters.from && filters.to && filters.from > filters.to
  );

  const filtered = useMemo(() => {
    if (invalidRange) return [];

    const search = filters.search.trim().toLowerCase();

    return records.filter((record) => {
      const text = [
        record.studentName,
        record.studentId,
        record.email,
        record.course,
        record.department,
        record.deviceId,
        record.authMethod,
        record.rfidCardId,
        record.verificationResult,
        record.notes,
      ].filter(Boolean).join(" ").toLowerCase();

      const day = inputDate(record.timestamp);

      return (
        (!search || text.includes(search)) &&
        (filters.department === "all" || record.department === filters.department) &&
        (filters.status === "all" || record.status === filters.status) &&
        (filters.method === "all" || record.authMethod === filters.method) &&
        (!filters.from || (day && day >= filters.from)) &&
        (!filters.to || (day && day <= filters.to))
      );
    });
  }, [records, filters, invalidRange]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const first = sort.key === "timestamp"
      ? asDate(a.timestamp)?.getTime()
      : a[sort.key];

    const second = sort.key === "timestamp"
      ? asDate(b.timestamp)?.getTime()
      : b[sort.key];

    if (first == null && second == null) return String(a.id).localeCompare(String(b.id));
    if (first == null) return 1;
    if (second == null) return -1;

    const comparison = typeof first === "number" && typeof second === "number"
      ? first - second
      : String(first).localeCompare(String(second), undefined, { numeric: true });

    return (sort.direction === "asc" ? comparison : -comparison) ||
      String(a.id).localeCompare(String(b.id));
  }), [filtered, sort]);

  const counts = useMemo(() => {
    const result = { present: 0, late: 0, absent: 0, excused: 0 };
    filtered.forEach((record) => {
      if (Object.prototype.hasOwnProperty.call(result, record.status)) {
        result[record.status] += 1;
      }
    });
    return result;
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const selectedRecords = sorted.filter((record) => selected.has(record.id));
  const allVisibleSelected = visible.length > 0 &&
    visible.every((record) => selected.has(record.id));

  const detailRecord = modal?.mode === "view"
    ? records.find((record) => record.id === modal.id)
    : null;

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [filters, pageSize]);

  useEffect(() => {
    setSelected((previous) => {
      const existing = new Set(records.map((record) => record.id));
      const next = new Set([...previous].filter((id) => existing.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [records]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  function changeFilter(key, value) {
    setFilters((previous) => ({ ...previous, [key]: value }));
  }

  function toggle(id) {
    setSelected((previous) => {
      const next = new Set(previous);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((previous) => {
      const next = new Set(previous);
      visible.forEach((record) => {
        allVisibleSelected ? next.delete(record.id) : next.add(record.id);
      });
      return next;
    });
  }

  function sortBy(key) {
    setSort((previous) => ({
      key,
      direction: previous.key === key && previous.direction === "asc" ? "desc" : "asc",
    }));
  }

  async function saveRecord(payload) {
    if (!canManage) throw new Error("An active administrator account is required.");
    if (actionLock.current) throw new Error("Another action is still running.");

    const editing = modal.mode === "edit";
    const recordId = modal.record?.id;

    if (editing && !records.some((record) => record.id === recordId)) {
      throw new Error("This record was deleted. Close the form and refresh your view.");
    }

    actionLock.current = true;
    setBusy(true);

    try {
      if (editing) {
        await updateAttendanceRecord(recordId, payload, user);
      } else {
        await addManualAttendance(payload, user);
      }

      setModal(null);
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function deleteRecords(targets) {
    if (!canManage || !targets.length || actionLock.current) return;

    actionLock.current = true;
    setBusy(true);

    try {
      const confirmation = await notify({
        icon: "warning",
        title: targets.length === 1 ? "Delete attendance?" : `Delete ${targets.length} records?`,
        text: targets.length === 1
          ? `Permanently delete the record for ${targets[0].studentName || "this student"}?`
          : "The selected records will be permanently deleted.",
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: "#b94352",
        focusCancel: true,
      });

      if (!confirmation.isConfirmed) return;

      if (targets.length === 1) {
        await deleteAttendanceRecord(targets[0].id, user);
      } else {
        await deleteAttendanceRecords(targets.map((record) => record.id), user);
      }

      setSelected(new Set());
    } catch (error) {
      await notify({
        icon: "error",
        title: "Unable to delete",
        text: error.message || "Check your connection and Firebase permissions.",
      });
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }

  async function exportRecords(format) {
    const targets = selectedRecords.length ? selectedRecords : sorted;
    if (!targets.length) return;

    try {
      if (format === "csv") {
        await exportToCSV(targets, "attendance");
      } else {
        await exportToPDF(targets, "BioSync Attendance Report");
      }
    } catch (error) {
      await notify({
        icon: "error",
        title: "Export failed",
        text: error.message || "The report could not be generated.",
      });
    }
  }

  const summaryCards = [
    { key: "all", label: "Total Records", value: filtered.length, icon: Users, tone: "cyan" },
    { key: "present", label: "Present", value: counts.present, icon: CheckCircle, tone: "green" },
    { key: "late", label: "Late", value: counts.late, icon: Clock, tone: "amber" },
    { key: "absent", label: "Absent", value: counts.absent, icon: XCircle, tone: "red" },
    { key: "excused", label: "Excused", value: counts.excused, icon: ShieldCheck, tone: "cyan" },
  ];

  function sortHeading(key, label) {
    return (
      <button type="button" className="aa-sort" onClick={() => sortBy(key)}>
        {label}
        {sort.key === key && (
          sort.direction === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
        )}
      </button>
    );
  }

  return (
    <div className="admin-attendance-page">
      <section className="aa-hero">
        <div>
          <span className="aa-eyebrow"><ShieldCheck size={14} /> ADMINISTRATOR WORKSPACE</span>
          <h1>Attendance <span>Management</span></h1>
          <p>Review attendance, manage corrections, and export your records.</p>
          <div className="aa-hero-tags">
            <span><Database size={14} /> Firebase-connected records</span>
            <span><Edit3 size={14} /> Manual corrections</span>
          </div>
        </div>

        <div className="aa-hero-actions">
          <button
            type="button"
            className="aa-secondary aa-restore-btn"
            disabled={!canManage || busy}
            onClick={() => setModal({ mode: "restore" })}
            title="Restore deleted attendance records or generate student records"
          >
            <RotateCcw size={17} /> Restore Records
          </button>

          <button
            type="button"
            className="aa-primary"
            disabled={!canManage || busy || Boolean(subscription.loading) || Boolean(subscription.error)}
            onClick={() => setModal({ mode: "add" })}
          >
            <FilePlus2 size={17} /> Add Manual Record
          </button>
        </div>
      </section>

      {subscription.error ? (
        <section className="aa-panel aa-error" role="alert">
          <h2>Unable to load attendance</h2>
          <p>{subscription.error.message || "Check your Firebase connection and permissions."}</p>
          <button type="button" onClick={subscription.retry}>Retry</button>
        </section>
      ) : subscription.loading ? (
        <section className="aa-panel aa-empty" role="status">
          <span className="aa-spinner" />
          <h2>Loading attendance…</h2>
          <p>Fetching records from Firebase.</p>
        </section>
      ) : (
        <>
          <section className="aa-summary-grid" aria-label="Attendance summary">
            {summaryCards.map(({ key, label, value, icon: Icon, tone }) => (
              <button
                type="button"
                key={key}
                className={`aa-stat aa-tone-${tone} ${filters.status === key ? "is-active" : ""}`}
                aria-pressed={filters.status === key}
                onClick={() => changeFilter("status", key)}
              >
                <span className="aa-stat-glow" aria-hidden="true" />

                <span className="aa-stat-icon">
                  <Icon size={19} />
                </span>

                <span className="aa-stat-copy">
                  <span className="aa-stat-label">{label}</span>
                  <strong>{value.toLocaleString()}</strong>
                  <small>{key === "all" ? "Matching records" : "Click to filter"}</small>
                </span>
              </button>
            ))}
          </section>

          <section className="aa-panel">
            <div className="aa-section-heading">
              <div>
                <span className="aa-eyebrow">FIND YOUR RECORDS</span>
                <h2><Filter size={18} /> Attendance Filters</h2>
                <p>Summary counts reflect the current filters.</p>
              </div>
              <div className="aa-actions">
                <button
                  type="button"
                  onClick={() => setFilters({ ...DEFAULT_FILTERS, from: inputDate(), to: inputDate() })}
                >Today</button>
                <button type="button" onClick={() => setFilters({ ...DEFAULT_FILTERS })}>Reset</button>
              </div>
            </div>

            <label className="aa-search">
              <Search size={18} />
              <input
                type="search"
                aria-label="Search attendance records"
                placeholder="Search student, ID, device, RFID, or notes…"
                value={filters.search}
                onChange={(event) => changeFilter("search", event.target.value)}
              />
            </label>

            <div className="aa-filter-grid">
              <label>
                Department
                <select value={filters.department} onChange={(e) => changeFilter("department", e.target.value)}>
                  <option value="all">All departments</option>
                  {choices.departments.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label>
                Status
                <select value={filters.status} onChange={(e) => changeFilter("status", e.target.value)}>
                  <option value="all">All statuses</option>
                  {STATUSES.map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}
                </select>
              </label>

              <label>
                Method
                <select value={filters.method} onChange={(e) => changeFilter("method", e.target.value)}>
                  <option value="all">All methods</option>
                  {choices.methods.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label>
                From date
                <input type="date" value={filters.from} onChange={(e) => changeFilter("from", e.target.value)} />
              </label>

              <label>
                To date
                <input type="date" value={filters.to} onChange={(e) => changeFilter("to", e.target.value)} />
              </label>
            </div>

            {invalidRange && (
              <p className="aa-error" role="alert">The end date must be on or after the start date.</p>
            )}
          </section>

          <section className="aa-panel aa-record-panel">
            <div className="aa-section-heading">
              <div>
                <span className="aa-eyebrow">ATTENDANCE REGISTER</span>
                <h2>Student Records <span className="aa-count">{sorted.length}</span></h2>
                <p>Exports include selected records, or all filtered records across every page.</p>
              </div>

              <div className="aa-actions">
                <button type="button" disabled={!sorted.length || invalidRange} onClick={() => exportRecords("csv")}>
                  <Download size={15} /> CSV
                </button>
                <button type="button" disabled={!sorted.length || invalidRange} onClick={() => exportRecords("pdf")}>
                  <Download size={15} /> PDF
                </button>
              </div>
            </div>

            {selectedRecords.length > 0 && (
              <div className="aa-selection">
                <span>{selectedRecords.length} record(s) selected</span>
                <div className="aa-actions">
                  <button type="button" onClick={() => setSelected(new Set())}>Clear selection</button>
                  <button
                    type="button"
                    className="aa-danger"
                    disabled={!canManage || busy}
                    onClick={() => deleteRecords(selectedRecords)}
                  ><Trash2 size={14} /> Delete selected</button>
                </div>
              </div>
            )}

            <div className="aa-table-scroll">
              <table className="aa-table">
                <thead>
                  <tr>
                    <th>
                      <input
                        type="checkbox"
                        aria-label="Select records on this page"
                        checked={allVisibleSelected}
                        disabled={!visible.length || busy}
                        onChange={togglePage}
                      />
                    </th>
                    <th aria-sort={sort.key === "studentName" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}>
                      {sortHeading("studentName", "Student")}
                    </th>
                    <th>Department / Course</th>
                    <th aria-sort={sort.key === "timestamp" ? sort.direction === "asc" ? "ascending" : "descending" : "none"}>
                      {sortHeading("timestamp", "Date & Time")}
                    </th>
                    <th>Status</th>
                    <th>Authentication</th>
                    <th>Device</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {!visible.length ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="aa-empty">
                          <Search size={30} />
                          <h3>No matching attendance records</h3>
                          <p>Try resetting your filters or add a manual record.</p>
                        </div>
                      </td>
                    </tr>
                  ) : visible.map((record) => (
                    <tr key={record.id} className={selected.has(record.id) ? "is-selected" : ""}>
                      <td>
                        <input
                          type="checkbox"
                          aria-label={`Select attendance for ${record.studentName || record.studentId || "student"}`}
                          checked={selected.has(record.id)}
                          disabled={busy}
                          onChange={() => toggle(record.id)}
                        />
                      </td>
                      <td>
                        <div className="aa-student">
                          <span className="aa-avatar">{String(record.studentName || "S").slice(0, 1).toUpperCase()}</span>
                          <div>
                            <strong>{record.studentName || "Unknown student"}</strong>
                            <small>{record.studentId || record.userId || "No student ID"}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong>{record.department || "—"}</strong>
                        <small>{record.course || "—"}</small>
                      </td>
                      <td>
                        <strong>{displayDate(record.timestamp)}</strong>
                        <small>{displayTime(record.timestamp)}</small>
                      </td>
                      <td>
                        <span className={`aa-badge aa-status-${STATUSES.includes(record.status) ? record.status : "unknown"}`}>
                          {titleCase(record.status)}
                        </span>
                      </td>
                      <td>
                        <strong>{record.authMethod || "Unknown"}</strong>
                        <small>{titleCase(record.verificationResult)}</small>
                      </td>
                      <td>—</td>
                      <td>
                        <div className="aa-row-actions">
                          <button type="button" className="aa-icon-button" aria-label="View attendance details" onClick={() => setModal({ mode: "view", id: record.id })}>
                            <Eye size={16} />
                          </button>
                          <button type="button" className="aa-icon-button" aria-label="Edit attendance record" disabled={!canManage || busy} onClick={() => setModal({ mode: "edit", record })}>
                            <Edit3 size={16} />
                          </button>
                          <button type="button" className="aa-icon-button aa-danger" aria-label="Delete attendance record" disabled={!canManage || busy} onClick={() => deleteRecords([record])}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <footer className="aa-pagination">
              <span>
                Showing {sorted.length ? (currentPage - 1) * pageSize + 1 : 0}
                –{Math.min(currentPage * pageSize, sorted.length)} of {sorted.length}
              </span>

              <div className="aa-actions">
                <label className="aa-page-size">
                  Rows
                  <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}>
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
          </section>

          <p className="aa-footnote">
            Counts represent saved records, not unique students. Absent records must be explicitly recorded;
            missing scans are not automatically counted as absences.
          </p>
        </>
      )}

      {(modal?.mode === "add" || modal?.mode === "edit") && (
        <RecordForm
          key={modal.record?.id || "new"}
          record={modal.record || null}
          students={students}
          studentsLoading={studentsLoading}
          studentsError={studentsError}
          busy={busy}
          onClose={() => { if (!busy) setModal(null); }}
          onSave={saveRecord}
        />
      )}

      {modal?.mode === "view" && (
        <Dialog title="Attendance Details" onClose={() => setModal(null)}>
          <div className="aa-dialog-body">
            {detailRecord ? (
              <dl className="aa-details">
                {[
                  ["Student", detailRecord.studentName],
                  ["Student ID", detailRecord.studentId || detailRecord.userId],
                  ["Department", detailRecord.department],
                  ["Course", detailRecord.course],
                  ["Date", displayDate(detailRecord.timestamp)],
                  ["Time", displayTime(detailRecord.timestamp)],
                  ["Status", titleCase(detailRecord.status)],
                  ["Authentication", detailRecord.authMethod],
                  ["Verification", titleCase(detailRecord.verificationResult)],
                  ["RFID card", detailRecord.rfidCardId],
                  ["Device", "—"],
                  ["Notes", detailRecord.notes],
                  ["Record ID", detailRecord.id],
                ].map(([label, value]) => (
                  <div key={label}><dt>{label}</dt><dd>{String(value || "—")}</dd></div>
                ))}
              </dl>
            ) : (
              <p className="aa-notice">This record is no longer available.</p>
            )}
          </div>
          <footer className="aa-dialog-footer">
            <button type="button" onClick={() => setModal(null)}>Close</button>
          </footer>
        </Dialog>
      )}

      {modal?.mode === "restore" && (
        <RestoreModal
          adminUser={user}
          canManage={canManage}
          onClose={() => setModal(null)}
          onSuccess={(msg) => {
            notify({
              icon: "success",
              title: "Restoration Complete",
              text: msg,
              timer: 3500,
              showConfirmButton: false,
            });
          }}
        />
      )}
    </div>
  );
}