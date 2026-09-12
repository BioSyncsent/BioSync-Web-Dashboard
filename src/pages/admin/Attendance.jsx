import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart3,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  Eye,
  FilePlus2,
  Filter,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
  XCircle,
} from "lucide-react";

import Swal from "sweetalert2";

import { useAuth } from "../../contexts/AuthContext";
import { useFirestoreSubscription } from "../../hooks/useFirestoreSubscription";

import SummaryCard from "../../components/SummaryCard";
import StatusBadge from "../../components/StatusBadge";
import AttendanceDetailsModal from "../../components/AttendanceDetailsModal";

import {
  addManualAttendance,
  deleteAttendanceRecord,
  deleteAttendanceRecords,
  subscribeToAttendanceManagement,
  updateAttendanceRecord,
} from "../../services/attendanceService";

import {
  exportToCSV,
  exportToPDF,
} from "../../utils/exportAttendance";

import "./Attendance.css";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

function dateToInputValue(date) {
  if (!date) return "";

  const localDate = new Date(
    date.getTime() -
      date.getTimezoneOffset() * 60_000
  );

  return localDate
    .toISOString()
    .slice(0, 10);
}

function timeToInputValue(date) {
  if (!date) return "08:00";

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function compareValues(first, second) {
  if (first == null && second == null) return 0;
  if (first == null) return 1;
  if (second == null) return -1;

  if (
    first instanceof Date &&
    second instanceof Date
  ) {
    return first.getTime() - second.getTime();
  }

  return String(first).localeCompare(
    String(second),
    undefined,
    {
      numeric: true,
      sensitivity: "base",
    }
  );
}

function verificationLabel(result) {
  const normalized = String(
    result || "unknown"
  ).toLowerCase();

  if (
    normalized === "verified" ||
    normalized === "success"
  ) {
    return "Verified";
  }

  if (normalized === "manual") {
    return "Manual";
  }

  if (
    normalized === "failed" ||
    normalized === "rejected"
  ) {
    return "Failed";
  }

  if (normalized === "flagged") {
    return "Flagged";
  }

  return "Unknown";
}

function verificationClass(result) {
  const normalized = String(
    result || "unknown"
  ).toLowerCase();

  if (
    normalized === "verified" ||
    normalized === "success"
  ) {
    return "aa-verification aa-verification-success";
  }

  if (normalized === "manual") {
    return "aa-verification aa-verification-manual";
  }

  if (
    normalized === "failed" ||
    normalized === "rejected"
  ) {
    return "aa-verification aa-verification-danger";
  }

  if (normalized === "flagged") {
    return "aa-verification aa-verification-warning";
  }

  return "aa-verification aa-verification-neutral";
}

function getEmptyForm() {
  const now = new Date();

  return {
    userId: "",
    status: "present",
    authMethod: "Manual",
    deviceId: "Admin Portal",
    verificationResult: "manual",
    date: dateToInputValue(now),
    time: timeToInputValue(now),
    source: "manual",
    notes: "",
  };
}

function AttendanceFormModal({
  mode,
  record,
  users,
  onClose,
  onSubmit,
  saving,
}) {
  const [formData, setFormData] =
    useState(getEmptyForm());

  useEffect(() => {
    if (
      mode === "edit" &&
      record
    ) {
      setFormData({
        userId: record.userId || "",
        status:
          record.status || "present",
        authMethod:
          record.authMethod || "Manual",
        deviceId:
          record.deviceId ||
          "Admin Portal",
        verificationResult:
          record.verificationResult ||
          "manual",
        date:
          dateToInputValue(
            record.timestamp
          ) ||
          dateToInputValue(
            new Date()
          ),
        time:
          timeToInputValue(
            record.timestamp
          ),
        source:
          record.source ||
          "manual",
        notes:
          record.notes || "",
      });
    } else {
      setFormData(
        getEmptyForm()
      );
    }
  }, [mode, record]);

  function updateField(event) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!formData.userId) {
      Swal.fire({
        icon: "warning",
        title: "Select a student",
        text: "A student must be selected before saving.",
      });

      return;
    }

    onSubmit(formData);
  }

  return (
    <div
      className="bs-modal-overlay"
      onMouseDown={onClose}
    >
      <form
        className="bs-modal bs-modal-lg"
        onSubmit={handleSubmit}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="bs-modal-header">
          <div>
            <h2 className="bs-modal-title">
              {mode === "edit"
                ? "Edit Attendance"
                : "Add Manual Attendance"}
            </h2>

            <p className="bs-modal-subtitle">
              {mode === "edit"
                ? "Correct the selected attendance record."
                : "Create an administrator-entered attendance record."}
            </p>
          </div>

          <button
            type="button"
            className="bs-modal-close"
            onClick={onClose}
          >
            <X size={22} />
          </button>
        </div>

        <div className="bs-modal-content">
          <div className="bs-form-grid">
            <div className="bs-form-group bs-form-span-2">
              <label>
                Student
              </label>

              <select
                name="userId"
                value={formData.userId}
                onChange={updateField}
                required
                disabled={
                  mode === "edit"
                }
              >
                <option value="">
                  Select student
                </option>

                {users.map(
                  (student) => (
                    <option
                      key={
                        student.userId
                      }
                      value={
                        student.userId
                      }
                    >
                      {
                        student.studentName
                      }{" "}
                      —{" "}
                      {
                        student.studentId
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="bs-form-group">
              <label>Status</label>

              <select
                name="status"
                value={formData.status}
                onChange={updateField}
              >
                <option value="present">
                  Present
                </option>
                <option value="late">
                  Late
                </option>
                <option value="absent">
                  Absent
                </option>
                <option value="excused">
                  Excused
                </option>
              </select>
            </div>

            <div className="bs-form-group">
              <label>
                Authentication method
              </label>

              <select
                name="authMethod"
                value={
                  formData.authMethod
                }
                onChange={updateField}
              >
                <option value="Manual">
                  Manual
                </option>
                <option value="Fingerprint">
                  Fingerprint
                </option>
                <option value="Face">
                  Face
                </option>
                <option value="RFID">
                  RFID
                </option>
              </select>
            </div>

            <div className="bs-form-group">
              <label>Date</label>

              <input
                name="date"
                type="date"
                value={formData.date}
                onChange={updateField}
                required
              />
            </div>

            <div className="bs-form-group">
              <label>Time</label>

              <input
                name="time"
                type="time"
                value={formData.time}
                onChange={updateField}
                required
              />
            </div>

            <div className="bs-form-group">
              <label>
                Device or terminal
              </label>

              <input
                name="deviceId"
                value={
                  formData.deviceId
                }
                onChange={updateField}
              />
            </div>

            <div className="bs-form-group">
              <label>
                Verification result
              </label>

              <select
                name="verificationResult"
                value={
                  formData.verificationResult
                }
                onChange={updateField}
              >
                <option value="manual">
                  Manual
                </option>
                <option value="verified">
                  Verified
                </option>
                <option value="flagged">
                  Flagged
                </option>
                <option value="failed">
                  Failed
                </option>
              </select>
            </div>

            <div className="bs-form-group bs-form-span-2">
              <label>
                Notes or reason
              </label>

              <textarea
                name="notes"
                rows="4"
                value={
                  formData.notes
                }
                onChange={updateField}
                placeholder="Explain why this record was added or changed."
              />
            </div>
          </div>
        </div>

        <div className="bs-modal-footer">
          <button
            type="button"
            className="bs-btn bs-btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="bs-btn bs-btn-primary"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : mode === "edit"
                ? "Save Changes"
                : "Add Attendance"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminAttendance() {
  const { user } = useAuth();

  const attendanceSubscription =
    useFirestoreSubscription(
      subscribeToAttendanceManagement,
      []
    );

  const records =
    attendanceSubscription.data || [];

  const [searchTerm, setSearchTerm] =
    useState("");

  const [
    selectedCourse,
    setSelectedCourse,
  ] = useState("all");

  const [
    selectedDepartment,
    setSelectedDepartment,
  ] = useState("all");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState("all");

  const [
    selectedAuthMethod,
    setSelectedAuthMethod,
  ] = useState("all");

  const [
    selectedDevice,
    setSelectedDevice,
  ] = useState("all");

  const [
    selectedVerification,
    setSelectedVerification,
  ] = useState("all");

  const [
    sortConfig,
    setSortConfig,
  ] = useState({
    key: "timestamp",
    direction: "desc",
  });

  const [
    selectedIds,
    setSelectedIds,
  ] = useState(new Set());

  const [page, setPage] =
    useState(1);

  const [
    pageSize,
    setPageSize,
  ] = useState(10);

  const [
    selectedModal,
    setSelectedModal,
  ] = useState(null);

  const [
    formModal,
    setFormModal,
  ] = useState(null);

  const [saving, setSaving] =
    useState(false);

  const uniqueValues =
    useMemo(() => {
      function makeUnique(
        field
      ) {
        return Array.from(
          new Set(
            records
              .map(
                (record) =>
                  record[field]
              )
              .filter(
                (value) =>
                  value &&
                  value !== "N/A" &&
                  value !==
                    "Unknown"
              )
          )
        ).sort();
      }

      return {
        courses:
          makeUnique("course"),
        departments:
          makeUnique(
            "department"
          ),
        authMethods:
          makeUnique(
            "authMethod"
          ),
        devices:
          makeUnique(
            "deviceId"
          ),
        verificationResults:
          makeUnique(
            "verificationResult"
          ),
      };
    }, [records]);

  const studentOptions =
    useMemo(() => {
      const map =
        new Map();

      records.forEach(
        (record) => {
          if (!record.userId) {
            return;
          }

          if (
            !map.has(
              record.userId
            )
          ) {
            map.set(
              record.userId,
              {
                userId:
                  record.userId,
                studentName:
                  record.studentName,
                studentId:
                  record.studentId,
              }
            );
          }
        }
      );

      return Array.from(
        map.values()
      ).sort(
        (
          first,
          second
        ) =>
          first.studentName.localeCompare(
            second.studentName
          )
      );
    }, [records]);

  const filteredRecords =
    useMemo(() => {
      const queryText =
        searchTerm
          .trim()
          .toLowerCase();

      return records.filter(
        (record) => {
          const searchableText =
            [
              record.studentName,
              record.studentId,
              record.email,
              record.course,
              record.department,
              record.authMethod,
              record.deviceId,
              record.rfidCardId,
              record.verificationResult,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !queryText ||
            searchableText.includes(
              queryText
            );

          const matchesCourse =
            selectedCourse ===
              "all" ||
            record.course ===
              selectedCourse;

          const matchesDepartment =
            selectedDepartment ===
              "all" ||
            record.department ===
              selectedDepartment;

          const matchesStatus =
            selectedStatus ===
              "all" ||
            record.status ===
              selectedStatus;

          const matchesMethod =
            selectedAuthMethod ===
              "all" ||
            record.authMethod ===
              selectedAuthMethod;

          const matchesDevice =
            selectedDevice ===
              "all" ||
            record.deviceId ===
              selectedDevice;

          const matchesVerification =
            selectedVerification ===
              "all" ||
            record.verificationResult ===
              selectedVerification;

          let matchesDateFrom =
            true;

          let matchesDateTo =
            true;

          if (
            record.timestamp
          ) {
            const recordDate =
              dateToInputValue(
                record.timestamp
              );

            if (dateFrom) {
              matchesDateFrom =
                recordDate >=
                dateFrom;
            }

            if (dateTo) {
              matchesDateTo =
                recordDate <=
                dateTo;
            }
          } else if (
            dateFrom ||
            dateTo
          ) {
            matchesDateFrom =
              false;
            matchesDateTo =
              false;
          }

          return (
            matchesSearch &&
            matchesCourse &&
            matchesDepartment &&
            matchesStatus &&
            matchesMethod &&
            matchesDevice &&
            matchesVerification &&
            matchesDateFrom &&
            matchesDateTo
          );
        }
      );
    }, [
      records,
      searchTerm,
      selectedCourse,
      selectedDepartment,
      selectedStatus,
      selectedAuthMethod,
      selectedDevice,
      selectedVerification,
      dateFrom,
      dateTo,
    ]);

  const sortedRecords =
    useMemo(() => {
      return [
        ...filteredRecords,
      ].sort(
        (
          first,
          second
        ) => {
          const comparison =
            compareValues(
              first[
                sortConfig.key
              ],
              second[
                sortConfig.key
              ]
            );

          return sortConfig.direction ===
            "asc"
            ? comparison
            : -comparison;
        }
      );
    }, [
      filteredRecords,
      sortConfig,
    ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        sortedRecords.length /
          pageSize
      )
    );

  const paginatedRecords =
    useMemo(() => {
      const start =
        (page - 1) *
        pageSize;

      return sortedRecords.slice(
        start,
        start + pageSize
      );
    }, [
      sortedRecords,
      page,
      pageSize,
    ]);

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    selectedCourse,
    selectedDepartment,
    selectedStatus,
    selectedAuthMethod,
    selectedDevice,
    selectedVerification,
    dateFrom,
    dateTo,
    pageSize,
  ]);

  useEffect(() => {
    if (
      page > totalPages
    ) {
      setPage(totalPages);
    }
  }, [
    page,
    totalPages,
  ]);

  const summary =
    useMemo(() => {
      const total =
        filteredRecords.length;

      const present =
        filteredRecords.filter(
          (record) =>
            record.status ===
            "present"
        ).length;

      const late =
        filteredRecords.filter(
          (record) =>
            record.status ===
            "late"
        ).length;

      const absent =
        filteredRecords.filter(
          (record) =>
            record.status ===
            "absent"
        ).length;

      const attended =
        present + late;

      const percentage =
        total > 0
          ? (
              (attended /
                total) *
              100
            ).toFixed(1)
          : "0.0";

      return {
        total,
        present,
        late,
        absent,
        percentage,
      };
    }, [
      filteredRecords,
    ]);

  const allVisibleSelected =
    paginatedRecords.length >
      0 &&
    paginatedRecords.every(
      (record) =>
        selectedIds.has(
          record.id
        )
    );

  const selectedRecords =
    useMemo(
      () =>
        sortedRecords.filter(
          (record) =>
            selectedIds.has(
              record.id
            )
        ),
      [
        sortedRecords,
        selectedIds,
      ]
    );

  function toggleSort(key) {
    setSortConfig(
      (previous) => ({
        key,
        direction:
          previous.key ===
            key &&
          previous.direction ===
            "asc"
            ? "desc"
            : "asc",
      })
    );
  }

  function renderSortIcon(
    key
  ) {
    if (
      sortConfig.key !== key
    ) {
      return (
        <ArrowUpDown
          size={13}
        />
      );
    }

    return sortConfig.direction ===
      "asc" ? (
      <ArrowUp size={13} />
    ) : (
      <ArrowDown size={13} />
    );
  }

  function toggleRecord(
    recordId
  ) {
    setSelectedIds(
      (previous) => {
        const next =
          new Set(previous);

        if (
          next.has(recordId)
        ) {
          next.delete(
            recordId
          );
        } else {
          next.add(recordId);
        }

        return next;
      }
    );
  }

  function toggleVisibleRecords() {
    setSelectedIds(
      (previous) => {
        const next =
          new Set(previous);

        if (
          allVisibleSelected
        ) {
          paginatedRecords.forEach(
            (record) =>
              next.delete(
                record.id
              )
          );
        } else {
          paginatedRecords.forEach(
            (record) =>
              next.add(
                record.id
              )
          );
        }

        return next;
      }
    );
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedCourse("all");
    setSelectedDepartment(
      "all"
    );
    setSelectedStatus("all");
    setSelectedAuthMethod(
      "all"
    );
    setSelectedDevice("all");
    setSelectedVerification(
      "all"
    );
    setDateFrom("");
    setDateTo("");
    setSelectedIds(
      new Set()
    );
  }

  function handleExport(
    format
  ) {
    const exportRecords =
      selectedRecords.length >
      0
        ? selectedRecords
        : sortedRecords;

    if (
      format === "csv"
    ) {
      exportToCSV(
        exportRecords,
        "attendance"
      );
    } else {
      exportToPDF(
        exportRecords,
        "BioSync Attendance Report"
      );
    }
  }

  async function handleDelete(
    record
  ) {
    const result =
      await Swal.fire({
        icon: "warning",
        title:
          "Delete attendance?",
        html: `This will permanently delete the record for <strong>${record.studentName}</strong>.`,
        showCancelButton: true,
        confirmButtonText:
          "Delete",
        cancelButtonText:
          "Cancel",
        confirmButtonColor:
          "#ef4444",
      });

    if (
      !result.isConfirmed
    ) {
      return;
    }

    try {
      await deleteAttendanceRecord(
        record.id,
        user
      );

      setSelectedIds(
        (previous) => {
          const next =
            new Set(
              previous
            );

          next.delete(
            record.id
          );

          return next;
        }
      );

      await Swal.fire({
        icon: "success",
        title:
          "Attendance deleted",
        timer: 1400,
        showConfirmButton:
          false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title:
          "Unable to delete",
        text:
          error.message ||
          "The attendance record could not be deleted.",
      });
    }
  }

  async function handleBulkDelete() {
    if (
      selectedRecords.length ===
      0
    ) {
      return;
    }

    const result =
      await Swal.fire({
        icon: "warning",
        title: `Delete ${selectedRecords.length} records?`,
        text:
          "This action cannot be undone.",
        showCancelButton: true,
        confirmButtonText:
          "Delete selected",
        cancelButtonText:
          "Cancel",
        confirmButtonColor:
          "#ef4444",
      });

    if (
      !result.isConfirmed
    ) {
      return;
    }

    try {
      await deleteAttendanceRecords(
        selectedRecords.map(
          (record) =>
            record.id
        ),
        user
      );

      setSelectedIds(
        new Set()
      );
    } catch (error) {
      Swal.fire({
        icon: "error",
        title:
          "Unable to delete records",
        text:
          error.message ||
          "The selected records could not be deleted.",
      });
    }
  }

  async function handleFormSubmit(
    formData
  ) {
    setSaving(true);

    try {
      if (
        formModal.mode ===
        "edit"
      ) {
        await updateAttendanceRecord(
          formModal.record.id,
          formData,
          user
        );
      } else {
        await addManualAttendance(
          formData,
          user
        );
      }

      setFormModal(null);

      await Swal.fire({
        icon: "success",
        title:
          formModal.mode ===
          "edit"
            ? "Attendance updated"
            : "Attendance added",
        timer: 1400,
        showConfirmButton:
          false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title:
          "Unable to save",
        text:
          error.message ||
          "The attendance record could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (
    attendanceSubscription.loading
  ) {
    return (
      <div className="admin-attendance-page aa-loading-page">
        <div className="aa-loader" />
        <p>
          Loading attendance
          management...
        </p>
      </div>
    );
  }

  if (
    attendanceSubscription.error
  ) {
    return (
      <div className="admin-attendance-page">
        <div className="aa-error-card">
          <AlertCircle
            size={30}
          />

          <div>
            <h2>
              Unable to load
              attendance
            </h2>

            <p>
              {
                attendanceSubscription
                  .error.message
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              attendanceSubscription.retry
            }
          >
            <RefreshCw
              size={15}
            />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const firstVisible =
    sortedRecords.length ===
    0
      ? 0
      : (page - 1) *
          pageSize +
        1;

  const lastVisible =
    Math.min(
      page * pageSize,
      sortedRecords.length
    );

  return (
    <div className="admin-attendance-page">
      <section className="aa-hero">
        <div className="aa-hero-grid" />

        <div>
          <span className="aa-eyebrow">
            <ShieldCheck
              size={14}
            />
            Administrator Control
          </span>

          <h1>
            Attendance Management
          </h1>

          <p>
            Monitor, correct,
            export and manage
            attendance records
            across the BioSync
            Sentinel system.
          </p>
        </div>

        <button
          type="button"
          className="aa-add-button"
          onClick={() =>
            setFormModal({
              mode: "add",
              record: null,
            })
          }
        >
          <FilePlus2
            size={17}
          />
          Add Attendance
        </button>
      </section>

      <section className="aa-summary-grid">
        <SummaryCard
          icon={Users}
          label="Total Records"
          value={summary.total}
          tone="primary"
        />

        <SummaryCard
          icon={CheckCircle}
          label="Present"
          value={
            summary.present
          }
          tone="success"
        />

        <SummaryCard
          icon={Clock}
          label="Late"
          value={summary.late}
          tone="warning"
        />

        <SummaryCard
          icon={XCircle}
          label="Absent"
          value={
            summary.absent
          }
          tone="danger"
        />

        <SummaryCard
          icon={BarChart3}
          label="Attendance %"
          value={`${summary.percentage}%`}
          tone="info"
        />
      </section>

      <section className="aa-filter-panel">
        <div className="aa-filter-heading">
          <div>
            <span>
              <Filter
                size={15}
              />
              Advanced Filters
            </span>

            <p>
              Refine attendance
              records using student,
              course, device and
              verification details.
            </p>
          </div>

          <div className="aa-export-actions">
            <button
              type="button"
              onClick={() =>
                handleExport(
                  "csv"
                )
              }
            >
              <Download
                size={14}
              />
              CSV
            </button>

            <button
              type="button"
              onClick={() =>
                handleExport(
                  "pdf"
                )
              }
            >
              <Download
                size={14}
              />
              PDF
            </button>
          </div>
        </div>

        <div className="aa-search">
          <Search size={17} />

          <input
            value={searchTerm}
            onChange={(
              event
            ) =>
              setSearchTerm(
                event.target
                  .value
              )
            }
            placeholder="Search student, ID, email, RFID, course, department, method or device..."
          />
        </div>

        <div className="aa-filter-grid">
          <select
            value={
              selectedCourse
            }
            onChange={(
              event
            ) =>
              setSelectedCourse(
                event.target
                  .value
              )
            }
          >
            <option value="all">
              All Courses
            </option>

            {uniqueValues.courses.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>

          <select
            value={
              selectedDepartment
            }
            onChange={(
              event
            ) =>
              setSelectedDepartment(
                event.target
                  .value
              )
            }
          >
            <option value="all">
              All Departments
            </option>

            {uniqueValues.departments.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(
              event
            ) =>
              setDateFrom(
                event.target
                  .value
              )
            }
          />

          <input
            type="date"
            value={dateTo}
            min={
              dateFrom ||
              undefined
            }
            onChange={(
              event
            ) =>
              setDateTo(
                event.target
                  .value
              )
            }
          />

          <select
            value={
              selectedStatus
            }
            onChange={(
              event
            ) =>
              setSelectedStatus(
                event.target
                  .value
              )
            }
          >
            <option value="all">
              All Statuses
            </option>
            <option value="present">
              Present
            </option>
            <option value="late">
              Late
            </option>
            <option value="absent">
              Absent
            </option>
            <option value="excused">
              Excused
            </option>
          </select>

          <select
            value={
              selectedAuthMethod
            }
            onChange={(
              event
            ) =>
              setSelectedAuthMethod(
                event.target
                  .value
              )
            }
          >
            <option value="all">
              All Methods
            </option>

            {uniqueValues.authMethods.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>

          <select
            value={
              selectedDevice
            }
            onChange={(
              event
            ) =>
              setSelectedDevice(
                event.target
                  .value
              )
            }
          >
            <option value="all">
              All Devices
            </option>

            {uniqueValues.devices.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {value}
                </option>
              )
            )}
          </select>

          <select
            value={
              selectedVerification
            }
            onChange={(
              event
            ) =>
              setSelectedVerification(
                event.target
                  .value
              )
            }
          >
            <option value="all">
              All Verification
            </option>

            {uniqueValues.verificationResults.map(
              (value) => (
                <option
                  key={value}
                  value={value}
                >
                  {verificationLabel(
                    value
                  )}
                </option>
              )
            )}
          </select>
        </div>

        <button
          type="button"
          className="aa-clear-button"
          onClick={clearFilters}
        >
          <X size={14} />
          Clear Filters
        </button>
      </section>

      {selectedRecords.length >
        0 && (
        <section className="aa-selection-bar">
          <strong>
            {
              selectedRecords.length
            }{" "}
            selected
          </strong>

          <div>
            <button
              onClick={() =>
                handleExport(
                  "csv"
                )
              }
            >
              <Download
                size={14}
              />
              Export
            </button>

            <button
              className="aa-delete-selected"
              onClick={
                handleBulkDelete
              }
            >
              <Trash2
                size={14}
              />
              Delete
            </button>
          </div>
        </section>
      )}

      <section className="aa-table-panel">
        <div className="aa-table-heading">
          <div>
            <h2>
              Attendance Records
            </h2>

            <p>
              Showing{" "}
              {firstVisible}–
              {lastVisible} of{" "}
              {
                sortedRecords.length
              }{" "}
              records
            </p>
          </div>

          <div>
            <span>
              Rows
            </span>

            <select
              value={pageSize}
              onChange={(
                event
              ) =>
                setPageSize(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              {PAGE_SIZE_OPTIONS.map(
                (size) => (
                  <option
                    key={size}
                    value={size}
                  >
                    {size}
                  </option>
                )
              )}
            </select>
          </div>
        </div>

        <div className="aa-table-scroll">
          <table className="aa-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={
                      allVisibleSelected
                    }
                    onChange={
                      toggleVisibleRecords
                    }
                  />
                </th>

                <th>
                  <button
                    onClick={() =>
                      toggleSort(
                        "studentName"
                      )
                    }
                  >
                    Student
                    {renderSortIcon(
                      "studentName"
                    )}
                  </button>
                </th>

                <th>
                  Student ID
                </th>

                <th>
                  Course
                </th>

                <th>
                  <button
                    onClick={() =>
                      toggleSort(
                        "timestamp"
                      )
                    }
                  >
                    Date & Time
                    {renderSortIcon(
                      "timestamp"
                    )}
                  </button>
                </th>

                <th>
                  Status
                </th>

                <th>
                  Method
                </th>

                <th>
                  Device
                </th>

                <th>
                  Verification
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="aa-empty"
                  >
                    No attendance
                    records match
                    the current
                    filters.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(
                  (record) => {
                    const date =
                      record.timestamp;

                    return (
                      <tr
                        key={
                          record.id
                        }
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(
                              record.id
                            )}
                            onChange={() =>
                              toggleRecord(
                                record.id
                              )
                            }
                          />
                        </td>

                        <td>
                          <div className="aa-student">
                            <span>
                              {record.studentName
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </span>

                            <div>
                              <strong>
                                {
                                  record.studentName
                                }
                              </strong>

                              <small>
                                {record.email ||
                                  "No email"}
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          {
                            record.studentId
                          }
                        </td>

                        <td>
                          <strong>
                            {
                              record.course
                            }
                          </strong>

                          <small className="aa-department">
                            {
                              record.department
                            }
                          </small>
                        </td>

                        <td>
                          <strong>
                            {date
                              ? date.toLocaleDateString(
                                  "en-MY"
                                )
                              : "N/A"}
                          </strong>

                          <small className="aa-date-time">
                            {date
                              ? date.toLocaleTimeString(
                                  "en-MY",
                                  {
                                    hour:
                                      "2-digit",
                                    minute:
                                      "2-digit",
                                  }
                                )
                              : "N/A"}
                          </small>
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              record.status
                            }
                          />
                        </td>

                        <td>
                          <span className="aa-method">
                            {
                              record.authMethod
                            }
                          </span>
                        </td>

                        <td>
                          {
                            record.deviceId
                          }
                        </td>

                        <td>
                          <span
                            className={verificationClass(
                              record.verificationResult
                            )}
                          >
                            {verificationLabel(
                              record.verificationResult
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="aa-actions">
                            <button
                              title="View"
                              onClick={() =>
                                setSelectedModal(
                                  record
                                )
                              }
                            >
                              <Eye
                                size={
                                  14
                                }
                              />
                            </button>

                            <button
                              title="Edit"
                              onClick={() =>
                                setFormModal(
                                  {
                                    mode:
                                      "edit",
                                    record,
                                  }
                                )
                              }
                            >
                              <Edit3
                                size={
                                  14
                                }
                              />
                            </button>

                            <button
                              title="Delete"
                              className="aa-danger-action"
                              onClick={() =>
                                handleDelete(
                                  record
                                )
                              }
                            >
                              <Trash2
                                size={
                                  14
                                }
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="aa-pagination">
          <span>
            Page {page} of{" "}
            {totalPages}
          </span>

          <div>
            <button
              disabled={
                page === 1
              }
              onClick={() =>
                setPage(
                  (previous) =>
                    Math.max(
                      1,
                      previous -
                        1
                    )
                )
              }
            >
              <ChevronLeft
                size={15}
              />
              Previous
            </button>

            <button
              disabled={
                page ===
                totalPages
              }
              onClick={() =>
                setPage(
                  (previous) =>
                    Math.min(
                      totalPages,
                      previous +
                        1
                    )
                )
              }
            >
              Next
              <ChevronRight
                size={15}
              />
            </button>
          </div>
        </div>
      </section>

      {selectedModal && (
        <AttendanceDetailsModal
          record={
            selectedModal
          }
          onClose={() =>
            setSelectedModal(
              null
            )
          }
        />
      )}

      {formModal && (
        <AttendanceFormModal
          mode={formModal.mode}
          record={
            formModal.record
          }
          users={
            studentOptions
          }
          saving={saving}
          onClose={() =>
            !saving &&
            setFormModal(null)
          }
          onSubmit={
            handleFormSubmit
          }
        />
      )}
    </div>
  );
}

export default AdminAttendance;