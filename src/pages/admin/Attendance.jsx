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
  RefreshCw,
  Search,
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
    return "bs-verification bs-verification-success";
  }

  if (normalized === "manual") {
    return "bs-verification bs-verification-manual";
  }

  if (
    normalized === "failed" ||
    normalized === "rejected"
  ) {
    return "bs-verification bs-verification-danger";
  }

  if (normalized === "flagged") {
    return "bs-verification bs-verification-warning";
  }

  return "bs-verification bs-verification-neutral";
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
  const [formData, setFormData] = useState(
    getEmptyForm()
  );

  useEffect(() => {
    if (mode === "edit" && record) {
      setFormData({
        userId: record.userId || "",
        status: record.status || "present",
        authMethod:
          record.authMethod || "Manual",
        deviceId:
          record.deviceId || "Admin Portal",
        verificationResult:
          record.verificationResult ||
          "manual",
        date:
          dateToInputValue(record.timestamp) ||
          dateToInputValue(new Date()),
        time:
          timeToInputValue(record.timestamp),
        source:
          record.source || "manual",
        notes: record.notes || "",
      });
    } else {
      setFormData(getEmptyForm());
    }
  }, [mode, record]);

  function updateField(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
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
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <div className="bs-modal-content">
          <div className="bs-form-grid">
            <div className="bs-form-group bs-form-span-2">
              <label htmlFor="userId">
                Student
              </label>

              <select
                id="userId"
                name="userId"
                value={formData.userId}
                onChange={updateField}
                required
                disabled={mode === "edit"}
              >
                <option value="">
                  Select student
                </option>

                {users.map((student) => (
                  <option
                    key={student.userId}
                    value={student.userId}
                  >
                    {student.studentName} —{" "}
                    {student.studentId}
                  </option>
                ))}
              </select>
            </div>

            <div className="bs-form-group">
              <label htmlFor="status">
                Status
              </label>

              <select
                id="status"
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
              <label htmlFor="authMethod">
                Authentication method
              </label>

              <select
                id="authMethod"
                name="authMethod"
                value={formData.authMethod}
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
              <label htmlFor="date">
                Date
              </label>

              <input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={updateField}
                required
              />
            </div>

            <div className="bs-form-group">
              <label htmlFor="time">
                Time
              </label>

              <input
                id="time"
                name="time"
                type="time"
                value={formData.time}
                onChange={updateField}
                required
              />
            </div>

            <div className="bs-form-group">
              <label htmlFor="deviceId">
                Device or terminal
              </label>

              <input
                id="deviceId"
                name="deviceId"
                value={formData.deviceId}
                onChange={updateField}
                placeholder="Admin Portal"
              />
            </div>

            <div className="bs-form-group">
              <label htmlFor="verificationResult">
                Verification result
              </label>

              <select
                id="verificationResult"
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
              <label htmlFor="notes">
                Notes or reason
              </label>

              <textarea
                id="notes"
                name="notes"
                rows="4"
                value={formData.notes}
                onChange={updateField}
                placeholder="Explain why this attendance record was added or changed."
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

  const [selectedCourse, setSelectedCourse] =
    useState("all");

  const [
    selectedDepartment,
    setSelectedDepartment,
  ] = useState("all");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [selectedStatus, setSelectedStatus] =
    useState("all");

  const [
    selectedAuthMethod,
    setSelectedAuthMethod,
  ] = useState("all");

  const [selectedDevice, setSelectedDevice] =
    useState("all");

  const [
    selectedVerification,
    setSelectedVerification,
  ] = useState("all");

  const [sortConfig, setSortConfig] =
    useState({
      key: "timestamp",
      direction: "desc",
    });

  const [selectedIds, setSelectedIds] =
    useState(new Set());

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] =
    useState(10);

  const [selectedModal, setSelectedModal] =
    useState(null);

  const [formModal, setFormModal] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const uniqueValues = useMemo(() => {
    function makeUnique(field) {
      return Array.from(
        new Set(
          records
            .map((record) => record[field])
            .filter(
              (value) =>
                value &&
                value !== "N/A" &&
                value !== "Unknown"
            )
        )
      ).sort();
    }

    return {
      courses: makeUnique("course"),
      departments: makeUnique(
        "department"
      ),
      authMethods: makeUnique(
        "authMethod"
      ),
      devices: makeUnique("deviceId"),
      verificationResults: makeUnique(
        "verificationResult"
      ),
    };
  }, [records]);

  const studentOptions = useMemo(() => {
    const map = new Map();

    records.forEach((record) => {
      if (!record.userId) return;

      if (!map.has(record.userId)) {
        map.set(record.userId, {
          userId: record.userId,
          studentName:
            record.studentName,
          studentId:
            record.studentId,
        });
      }
    });

    return Array.from(map.values()).sort(
      (first, second) =>
        first.studentName.localeCompare(
          second.studentName
        )
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    return records.filter((record) => {
      const searchableText = [
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
        !query ||
        searchableText.includes(query);

      const matchesCourse =
        selectedCourse === "all" ||
        record.course === selectedCourse;

      const matchesDepartment =
        selectedDepartment === "all" ||
        record.department ===
          selectedDepartment;

      const matchesStatus =
        selectedStatus === "all" ||
        record.status === selectedStatus;

      const matchesMethod =
        selectedAuthMethod === "all" ||
        record.authMethod ===
          selectedAuthMethod;

      const matchesDevice =
        selectedDevice === "all" ||
        record.deviceId === selectedDevice;

      const matchesVerification =
        selectedVerification === "all" ||
        record.verificationResult ===
          selectedVerification;

      let matchesDateFrom = true;
      let matchesDateTo = true;

      if (record.timestamp) {
        const recordDate =
          dateToInputValue(
            record.timestamp
          );

        if (dateFrom) {
          matchesDateFrom =
            recordDate >= dateFrom;
        }

        if (dateTo) {
          matchesDateTo =
            recordDate <= dateTo;
        }
      } else if (dateFrom || dateTo) {
        matchesDateFrom = false;
        matchesDateTo = false;
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
    });
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

  const sortedRecords = useMemo(() => {
    return [...filteredRecords].sort(
      (first, second) => {
        const comparison = compareValues(
          first[sortConfig.key],
          second[sortConfig.key]
        );

        return sortConfig.direction ===
          "asc"
          ? comparison
          : -comparison;
      }
    );
  }, [filteredRecords, sortConfig]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedRecords.length / pageSize
    )
  );

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;

    return sortedRecords.slice(
      start,
      start + pageSize
    );
  }, [sortedRecords, page, pageSize]);

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
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const summary = useMemo(() => {
    const total = filteredRecords.length;

    const present =
      filteredRecords.filter(
        (record) =>
          record.status === "present"
      ).length;

    const late =
      filteredRecords.filter(
        (record) =>
          record.status === "late"
      ).length;

    const absent =
      filteredRecords.filter(
        (record) =>
          record.status === "absent"
      ).length;

    const attended = present + late;

    const percentage =
      total > 0
        ? (
            (attended / total) *
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
  }, [filteredRecords]);

  const allVisibleSelected =
    paginatedRecords.length > 0 &&
    paginatedRecords.every((record) =>
      selectedIds.has(record.id)
    );

  const selectedRecords =
    useMemo(
      () =>
        sortedRecords.filter((record) =>
          selectedIds.has(record.id)
        ),
      [sortedRecords, selectedIds]
    );

  function toggleSort(key) {
    setSortConfig((previous) => ({
      key,
      direction:
        previous.key === key &&
        previous.direction === "asc"
          ? "desc"
          : "asc",
    }));
  }

  function renderSortIcon(key) {
    if (sortConfig.key !== key) {
      return (
        <ArrowUpDown size={13} />
      );
    }

    return sortConfig.direction === "asc" ? (
      <ArrowUp size={13} />
    ) : (
      <ArrowDown size={13} />
    );
  }

  function toggleRecord(recordId) {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (next.has(recordId)) {
        next.delete(recordId);
      } else {
        next.add(recordId);
      }

      return next;
    });
  }

  function toggleVisibleRecords() {
    setSelectedIds((previous) => {
      const next = new Set(previous);

      if (allVisibleSelected) {
        paginatedRecords.forEach(
          (record) =>
            next.delete(record.id)
        );
      } else {
        paginatedRecords.forEach(
          (record) =>
            next.add(record.id)
        );
      }

      return next;
    });
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedCourse("all");
    setSelectedDepartment("all");
    setSelectedStatus("all");
    setSelectedAuthMethod("all");
    setSelectedDevice("all");
    setSelectedVerification("all");
    setDateFrom("");
    setDateTo("");
    setSelectedIds(new Set());
  }

  function handleExport(format) {
    const exportRecords =
      selectedRecords.length > 0
        ? selectedRecords
        : sortedRecords;

    if (format === "csv") {
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

  async function handleDelete(record) {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete attendance?",
      html: `This will permanently delete the record for <strong>${record.studentName}</strong>.`,
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteAttendanceRecord(
        record.id,
        user
      );

      setSelectedIds((previous) => {
        const next = new Set(previous);
        next.delete(record.id);
        return next;
      });

      await Swal.fire({
        icon: "success",
        title: "Attendance deleted",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Unable to delete",
        text:
          error.message ||
          "The attendance record could not be deleted.",
      });
    }
  }

  async function handleBulkDelete() {
    if (selectedRecords.length === 0) {
      return;
    }

    const result = await Swal.fire({
      icon: "warning",
      title: `Delete ${selectedRecords.length} records?`,
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText:
        "Delete selected",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteAttendanceRecords(
        selectedRecords.map(
          (record) => record.id
        ),
        user
      );

      setSelectedIds(new Set());

      await Swal.fire({
        icon: "success",
        title: "Records deleted",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Unable to delete records",
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
      if (formModal.mode === "edit") {
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
          formModal.mode === "edit"
            ? "Attendance updated"
            : "Attendance added",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",
        title: "Unable to save",
        text:
          error.message ||
          "The attendance record could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (attendanceSubscription.loading) {
    return (
      <div className="bs-page bs-loading-state">
        <div className="bs-skeleton-loader">
          <div className="bs-skeleton bs-skeleton-line" />
          <div className="bs-skeleton bs-skeleton-line" />
          <div className="bs-skeleton bs-skeleton-line" />
          <div className="bs-skeleton bs-skeleton-line" />
        </div>
      </div>
    );
  }

  if (attendanceSubscription.error) {
    return (
      <div className="bs-page bs-attendance-page">
        <div className="bs-card bs-attendance-error">
          <AlertCircle size={34} />

          <div>
            <h2>
              Unable to load attendance
            </h2>

            <p>
              {attendanceSubscription.error
                .message ||
                "Check your Firestore connection and try again."}
            </p>
          </div>

          <button
            type="button"
            className="bs-btn bs-btn-primary"
            onClick={
              attendanceSubscription.retry
            }
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const firstVisible =
    sortedRecords.length === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const lastVisible = Math.min(
    page * pageSize,
    sortedRecords.length
  );

  return (
    <div className="bs-page bs-attendance-page">
      <div className="bs-page-header">
        <div>
          <h1 className="bs-page-title">
            Attendance Management
          </h1>

          <p className="bs-page-subtitle">
            Monitor, create and manage student
            attendance records.
          </p>
        </div>

        <button
          type="button"
          className="bs-btn bs-btn-primary bs-btn-lg"
          onClick={() =>
            setFormModal({
              mode: "add",
              record: null,
            })
          }
        >
          <FilePlus2 size={17} />
          Add Attendance
        </button>
      </div>

      <div className="bs-summary-grid">
        <SummaryCard
          icon={Users}
          label="Total Records"
          value={summary.total}
          tone="primary"
        />

        <SummaryCard
          icon={CheckCircle}
          label="Present"
          value={summary.present}
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
          value={summary.absent}
          tone="danger"
        />

        <SummaryCard
          icon={BarChart3}
          label="Attendance %"
          value={`${summary.percentage}%`}
          tone="info"
        />
      </div>

      <div className="bs-card bs-filters-card">
        <div className="bs-filters-container">
          <div className="bs-search-box bs-search-lg">
            <Search
              size={18}
              className="bs-search-icon"
            />

            <input
              type="text"
              placeholder="Search name, student ID, email, RFID, course, department, method or device..."
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              className="bs-search-input"
            />
          </div>

          <div className="bs-advanced-filter-grid">
            <div className="bs-filter-group">
              <label className="bs-filter-label">
                Course
              </label>

              <select
                value={selectedCourse}
                onChange={(event) =>
                  setSelectedCourse(
                    event.target.value
                  )
                }
                className="bs-filter-select"
              >
                <option value="all">
                  All Courses
                </option>

                {uniqueValues.courses.map(
                  (course) => (
                    <option
                      key={course}
                      value={course}
                    >
                      {course}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="bs-filter-group">
              <label className="bs-filter-label">
                Department
              </label>

              <select
                value={
                  selectedDepartment
                }
                onChange={(event) =>
                  setSelectedDepartment(
                    event.target.value
                  )
                }
                className="bs-filter-select"
              >
                <option value="all">
                  All Departments
                </option>

                {uniqueValues.departments.map(
                  (department) => (
                    <option
                      key={department}
                      value={department}
                    >
                      {department}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="bs-filter-group">
              <label className="bs-filter-label">
                From
              </label>

              <input
                type="date"
                value={dateFrom}
                onChange={(event) =>
                  setDateFrom(
                    event.target.value
                  )
                }
                className="bs-filter-select"
              />
            </div>

            <div className="bs-filter-group">
              <label className="bs-filter-label">
                To
              </label>

              <input
                type="date"
                value={dateTo}
                onChange={(event) =>
                  setDateTo(
                    event.target.value
                  )
                }
                min={dateFrom || undefined}
                className="bs-filter-select"
              />
            </div>

            <div className="bs-filter-group">
              <label className="bs-filter-label">
                Status
              </label>

              <select
                value={selectedStatus}
                onChange={(event) =>
                  setSelectedStatus(
                    event.target.value
                  )
                }
                className="bs-filter-select"
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
            </div>

            <div className="bs-filter-group">
              <label className="bs-filter-label">
                Auth Method
              </label>

              <select
                value={selectedAuthMethod}
                onChange={(event) =>
                  setSelectedAuthMethod(
                    event.target.value
                  )
                }
                className="bs-filter-select"
              >
                <option value="all">
                  All Methods
                </option>

                {uniqueValues.authMethods.map(
                  (method) => (
                    <option
                      key={method}
                      value={method}
                    >
                      {method}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="bs-filter-group">
              <label className="bs-filter-label">
                Device
              </label>

              <select
                value={selectedDevice}
                onChange={(event) =>
                  setSelectedDevice(
                    event.target.value
                  )
                }
                className="bs-filter-select"
              >
                <option value="all">
                  All Devices
                </option>

                {uniqueValues.devices.map(
                  (device) => (
                    <option
                      key={device}
                      value={device}
                    >
                      {device}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="bs-filter-group">
              <label className="bs-filter-label">
                Verification
              </label>

              <select
                value={
                  selectedVerification
                }
                onChange={(event) =>
                  setSelectedVerification(
                    event.target.value
                  )
                }
                className="bs-filter-select"
              >
                <option value="all">
                  All Results
                </option>

                {uniqueValues.verificationResults.map(
                  (result) => (
                    <option
                      key={result}
                      value={result}
                    >
                      {verificationLabel(
                        result
                      )}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="bs-filter-actions">
            <button
              type="button"
              className="bs-btn bs-btn-secondary"
              onClick={clearFilters}
            >
              <X size={15} />
              Clear Filters
            </button>

            <div className="bs-button-group">
              <button
                type="button"
                onClick={() =>
                  handleExport("csv")
                }
                className="bs-btn bs-btn-secondary"
              >
                <Download size={16} />
                CSV
              </button>

              <button
                type="button"
                onClick={() =>
                  handleExport("pdf")
                }
                className="bs-btn bs-btn-secondary"
              >
                <Download size={16} />
                PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {selectedRecords.length > 0 && (
        <div className="bs-card bs-bulk-toolbar">
          <span>
            <strong>
              {selectedRecords.length}
            </strong>{" "}
            record
            {selectedRecords.length === 1
              ? ""
              : "s"}{" "}
            selected
          </span>

          <div className="bs-button-group">
            <button
              type="button"
              className="bs-btn bs-btn-secondary"
              onClick={() =>
                handleExport("csv")
              }
            >
              <Download size={15} />
              Export Selected
            </button>

            <button
              type="button"
              className="bs-btn bs-btn-danger"
              onClick={handleBulkDelete}
            >
              <Trash2 size={15} />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      <div className="bs-card bs-table-card">
        <div className="bs-table-heading">
          <div>
            <h2>Attendance Records</h2>
            <p>
              Showing {firstVisible}–
              {lastVisible} of{" "}
              {sortedRecords.length} records
            </p>
          </div>

          <div className="bs-page-size">
            <label htmlFor="pageSize">
              Rows:
            </label>

            <select
              id="pageSize"
              value={pageSize}
              onChange={(event) =>
                setPageSize(
                  Number(
                    event.target.value
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

        <div className="bs-table-scroll">
          <table className="bs-table bs-attendance-table">
            <thead>
              <tr>
                <th className="bs-checkbox-column">
                  <input
                    type="checkbox"
                    checked={
                      allVisibleSelected
                    }
                    onChange={
                      toggleVisibleRecords
                    }
                    aria-label="Select visible records"
                  />
                </th>

                <th>
                  <button
                    type="button"
                    className="bs-sort-button"
                    onClick={() =>
                      toggleSort(
                        "studentName"
                      )
                    }
                  >
                    Student Name
                    {renderSortIcon(
                      "studentName"
                    )}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="bs-sort-button"
                    onClick={() =>
                      toggleSort(
                        "studentId"
                      )
                    }
                  >
                    Student ID
                    {renderSortIcon(
                      "studentId"
                    )}
                  </button>
                </th>

                <th>Course</th>

                <th>
                  <button
                    type="button"
                    className="bs-sort-button"
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
                  <button
                    type="button"
                    className="bs-sort-button"
                    onClick={() =>
                      toggleSort("status")
                    }
                  >
                    Status
                    {renderSortIcon(
                      "status"
                    )}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    className="bs-sort-button"
                    onClick={() =>
                      toggleSort(
                        "authMethod"
                      )
                    }
                  >
                    Method
                    {renderSortIcon(
                      "authMethod"
                    )}
                  </button>
                </th>

                <th>Device</th>
                <th>Verification</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedRecords.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="bs-table-empty"
                  >
                    <div className="bs-empty-state">
                      <XCircle size={46} />

                      <p>
                        No attendance records
                        match the selected
                        filters.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(
                  (record) => {
                    const date =
                      record.timestamp;

                    const dateText = date
                      ? date.toLocaleDateString(
                          "en-MY"
                        )
                      : "N/A";

                    const timeText = date
                      ? date.toLocaleTimeString(
                          "en-MY",
                          {
                            hour: "2-digit",
                            minute:
                              "2-digit",
                          }
                        )
                      : "N/A";

                    return (
                      <tr key={record.id}>
                        <td className="bs-checkbox-column">
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
                            aria-label={`Select ${record.studentName}`}
                          />
                        </td>

                        <td>
                          <div className="bs-table-name">
                            <span className="bs-avatar-small">
                              {record.studentName
                                .charAt(0)
                                .toUpperCase()}
                            </span>

                            <span className="bs-student-cell">
                              <strong>
                                {
                                  record.studentName
                                }
                              </strong>

                              <small>
                                {record.email ||
                                  "No email"}
                              </small>
                            </span>
                          </div>
                        </td>

                        <td>
                          {record.studentId}
                        </td>

                        <td>
                          <span className="bs-course-cell">
                            {record.course}
                          </span>

                          <small className="bs-department-cell">
                            {
                              record.department
                            }
                          </small>
                        </td>

                        <td>
                          <div className="bs-datetime-cell">
                            <strong>
                              {dateText}
                            </strong>
                            <small>
                              {timeText}
                            </small>
                          </div>
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              record.status
                            }
                          />
                        </td>

                        <td>
                          <span className="bs-badge bs-badge-method">
                            {
                              record.authMethod
                            }
                          </span>
                        </td>

                        <td>
                          <span className="bs-device-cell">
                            {record.deviceId}
                          </span>
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
                          <div className="bs-row-actions">
                            <button
                              type="button"
                              className="bs-action-button bs-action-view"
                              title="View details"
                              onClick={() =>
                                setSelectedModal(
                                  record
                                )
                              }
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              type="button"
                              className="bs-action-button bs-action-edit"
                              title="Edit attendance"
                              onClick={() =>
                                setFormModal({
                                  mode: "edit",
                                  record,
                                })
                              }
                            >
                              <Edit3
                                size={15}
                              />
                            </button>

                            <button
                              type="button"
                              className="bs-action-button bs-action-delete"
                              title="Delete attendance"
                              onClick={() =>
                                handleDelete(
                                  record
                                )
                              }
                            >
                              <Trash2
                                size={15}
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

        <div className="bs-pagination">
          <span>
            Page {page} of {totalPages}
          </span>

          <div className="bs-pagination-controls">
            <button
              type="button"
              disabled={page === 1}
              onClick={() =>
                setPage((previous) =>
                  Math.max(
                    1,
                    previous - 1
                  )
                )
              }
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              disabled={page === totalPages}
              onClick={() =>
                setPage((previous) =>
                  Math.min(
                    totalPages,
                    previous + 1
                  )
                )
              }
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {selectedModal && (
        <AttendanceDetailsModal
          record={selectedModal}
          onClose={() =>
            setSelectedModal(null)
          }
        />
      )}

      {formModal && (
        <AttendanceFormModal
          mode={formModal.mode}
          record={formModal.record}
          users={studentOptions}
          saving={saving}
          onClose={() =>
            !saving &&
            setFormModal(null)
          }
          onSubmit={handleFormSubmit}
        />
      )}
    </div>
  );
}

export default AdminAttendance;