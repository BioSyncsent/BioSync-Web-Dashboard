import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  MessageSquareWarning,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Swal from "sweetalert2";

import { useAuth } from "../../contexts/AuthContext";

import { useFirestoreSubscription } from "../../hooks/useFirestoreSubscription";

import DisputeDetailsModal from "../../components/DisputeDetailsModal";

import {
  reviewDispute,
  subscribeToDisputesManagement,
} from "../../services/disputeService";

import "./Disputes.css";

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

function compareValues(first, second) {
  if (first == null && second == null) {
    return 0;
  }

  if (first == null) return 1;
  if (second == null) return -1;

  if (
    first instanceof Date &&
    second instanceof Date
  ) {
    return (
      first.getTime() -
      second.getTime()
    );
  }

  return String(first).localeCompare(
    String(second),
    undefined,
    {
      sensitivity: "base",
      numeric: true,
    }
  );
}

function getStatusLabel(status) {
  const labels = {
    pending: "Pending",
    under_review: "Under Review",
    awaiting_information:
      "Awaiting Information",
    approved: "Approved",
    rejected: "Rejected",
    closed: "Closed",
  };

  return labels[status] || "Pending";
}

function DisputeStatusBadge({ status }) {
  return (
    <span
      className={`dp-status dp-status-${status}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}) {
  return (
    <div className="dp-card dp-summary-card">
      <div
        className={`dp-summary-icon dp-summary-${tone}`}
      >
        <Icon size={20} />
      </div>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Disputes() {
  const { user } = useAuth();

  const subscription =
    useFirestoreSubscription(
      subscribeToDisputesManagement,
      []
    );

  const disputes =
    subscription.data || [];

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [courseFilter, setCourseFilter] =
    useState("all");

  const [dateFrom, setDateFrom] =
    useState("");

  const [dateTo, setDateTo] =
    useState("");

  const [sortConfig, setSortConfig] =
    useState({
      key: "submittedAt",
      direction: "desc",
    });

  const [page, setPage] = useState(1);

  const [pageSize, setPageSize] =
    useState(10);

  const [
    selectedDispute,
    setSelectedDispute,
  ] = useState(null);

  const [saving, setSaving] =
    useState(false);

  const courses = useMemo(() => {
    return Array.from(
      new Set(
        disputes
          .map(
            (dispute) =>
              dispute.course
          )
          .filter(
            (course) =>
              course &&
              course !== "N/A"
          )
      )
    ).sort();
  }, [disputes]);

  const filteredDisputes = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    return disputes.filter((dispute) => {
      const searchableText = [
        dispute.id,
        dispute.studentName,
        dispute.studentId,
        dispute.email,
        dispute.reason,
        dispute.attendanceId,
        dispute.course,
        dispute.department,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchableText.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        dispute.status === statusFilter;

      const matchesCourse =
        courseFilter === "all" ||
        dispute.course === courseFilter;

      let matchesFrom = true;
      let matchesTo = true;

      if (dispute.submittedAt) {
        const submittedDate =
          dateToInputValue(
            dispute.submittedAt
          );

        if (dateFrom) {
          matchesFrom =
            submittedDate >= dateFrom;
        }

        if (dateTo) {
          matchesTo =
            submittedDate <= dateTo;
        }
      } else if (dateFrom || dateTo) {
        matchesFrom = false;
        matchesTo = false;
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesCourse &&
        matchesFrom &&
        matchesTo
      );
    });
  }, [
    disputes,
    searchTerm,
    statusFilter,
    courseFilter,
    dateFrom,
    dateTo,
  ]);

  const sortedDisputes = useMemo(() => {
    return [...filteredDisputes].sort(
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
  }, [filteredDisputes, sortConfig]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedDisputes.length / pageSize
    )
  );

  const paginatedDisputes =
    useMemo(() => {
      const start =
        (page - 1) * pageSize;

      return sortedDisputes.slice(
        start,
        start + pageSize
      );
    }, [
      sortedDisputes,
      page,
      pageSize,
    ]);

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    statusFilter,
    courseFilter,
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
    return disputes.reduce(
      (result, dispute) => {
        result.total += 1;

        if (
          dispute.status === "pending"
        ) {
          result.pending += 1;
        } else if (
          dispute.status ===
          "under_review"
        ) {
          result.underReview += 1;
        } else if (
          dispute.status ===
          "approved"
        ) {
          result.approved += 1;
        } else if (
          dispute.status ===
          "rejected"
        ) {
          result.rejected += 1;
        }

        return result;
      },

      {
        total: 0,
        pending: 0,
        underReview: 0,
        approved: 0,
        rejected: 0,
      }
    );
  }, [disputes]);

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
      return <ArrowUpDown size={13} />;
    }

    return sortConfig.direction === "asc"
      ? <ArrowUp size={13} />
      : <ArrowDown size={13} />;
  }

  function clearFilters() {
    setSearchTerm("");
    setStatusFilter("all");
    setCourseFilter("all");
    setDateFrom("");
    setDateTo("");
  }

  async function handleReviewAction({
    status,
    adminComment,
    correctedAttendanceStatus,
  }) {
    if (!selectedDispute) return;

    const actionLabel =
      getStatusLabel(status);

    const result = await Swal.fire({
      icon:
        status === "approved"
          ? "question"
          : status === "rejected"
            ? "warning"
            : "info",

      title: `${actionLabel} dispute?`,

      text:
        status === "approved"
          ? "The related attendance record may also be corrected."
          : "The dispute status and admin comment will be saved.",

      showCancelButton: true,

      confirmButtonText:
        actionLabel,

      cancelButtonText: "Cancel",

      confirmButtonColor:
        status === "rejected"
          ? "#ef4444"
          : "#268cff",
    });

    if (!result.isConfirmed) {
      return;
    }

    setSaving(true);

    try {
      await reviewDispute({
        disputeId:
          selectedDispute.id,

        attendanceId:
          selectedDispute.attendanceId,

        status,

        adminComment,

        correctedAttendanceStatus,

        adminUser: user,
      });

      setSelectedDispute(null);

      await Swal.fire({
        icon: "success",

        title: "Dispute updated",

        text:
          "The dispute decision was saved successfully.",

        timer: 1600,

        showConfirmButton: false,
      });
    } catch (error) {
      console.error(error);

      Swal.fire({
        icon: "error",

        title: "Unable to update dispute",

        text:
          error.message ||
          "The dispute could not be updated.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (subscription.loading) {
    return (
      <div className="dp-page">
        <div className="dp-loading-card">
          <div className="dp-skeleton" />
          <div className="dp-skeleton" />
          <div className="dp-skeleton" />
          <div className="dp-skeleton" />
        </div>
      </div>
    );
  }

  if (subscription.error) {
    return (
      <div className="dp-page">
        <div className="dp-card dp-error-state">
          <AlertCircle size={34} />

          <div>
            <h2>
              Unable to load disputes
            </h2>

            <p>
              {subscription.error.message ||
                "Check the Firestore connection and try again."}
            </p>
          </div>

          <button
            type="button"
            className="dp-btn dp-btn-primary"
            onClick={subscription.retry}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const firstVisible =
    sortedDisputes.length === 0
      ? 0
      : (page - 1) * pageSize + 1;

  const lastVisible = Math.min(
    page * pageSize,
    sortedDisputes.length
  );

  return (
    <div className="dp-page">
      <div className="dp-page-header">
        <div>
          <h1>
            Dispute Management
          </h1>

          <p>
            Review and resolve student
            attendance disputes.
          </p>
        </div>

        <div className="dp-live-badge">
          <span />
          Live updates
        </div>
      </div>

      <div className="dp-summary-grid">
        <SummaryCard
          icon={MessageSquareWarning}
          label="Total Disputes"
          value={summary.total}
          tone="blue"
        />

        <SummaryCard
          icon={Clock3}
          label="Pending"
          value={summary.pending}
          tone="yellow"
        />

        <SummaryCard
          icon={ShieldAlert}
          label="Under Review"
          value={summary.underReview}
          tone="purple"
        />

        <SummaryCard
          icon={CheckCircle}
          label="Approved"
          value={summary.approved}
          tone="green"
        />

        <SummaryCard
          icon={XCircle}
          label="Rejected"
          value={summary.rejected}
          tone="red"
        />
      </div>

      <div className="dp-card dp-filter-card">
        <div className="dp-search-box">
          <Search size={18} />

          <input
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Search student, ID, email, reason, dispute ID or attendance ID..."
          />
        </div>

        <div className="dp-filter-grid">
          <div className="dp-filter-group">
            <label>Status</label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Statuses
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="under_review">
                Under Review
              </option>

              <option value="awaiting_information">
                Awaiting Information
              </option>

              <option value="approved">
                Approved
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="closed">
                Closed
              </option>
            </select>
          </div>

          <div className="dp-filter-group">
            <label>Course</label>

            <select
              value={courseFilter}
              onChange={(event) =>
                setCourseFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Courses
              </option>

              {courses.map((course) => (
                <option
                  key={course}
                  value={course}
                >
                  {course}
                </option>
              ))}
            </select>
          </div>

          <div className="dp-filter-group">
            <label>From</label>

            <input
              type="date"
              value={dateFrom}
              onChange={(event) =>
                setDateFrom(
                  event.target.value
                )
              }
            />
          </div>

          <div className="dp-filter-group">
            <label>To</label>

            <input
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) =>
                setDateTo(
                  event.target.value
                )
              }
            />
          </div>
        </div>

        <div className="dp-filter-footer">
          <span>
            {filteredDisputes.length} of{" "}
            {disputes.length} disputes
          </span>

          <button
            type="button"
            className="dp-btn dp-btn-secondary"
            onClick={clearFilters}
          >
            <X size={15} />
            Clear Filters
          </button>
        </div>
      </div>

      <div className="dp-card dp-table-card">
        <div className="dp-table-header">
          <div>
            <h2>
              Dispute Records
            </h2>

            <p>
              Showing {firstVisible}–
              {lastVisible} of{" "}
              {sortedDisputes.length}
            </p>
          </div>

          <div className="dp-page-size">
            <label htmlFor="disputePageSize">
              Rows
            </label>

            <select
              id="disputePageSize"
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

        <div className="dp-table-scroll">
          <table className="dp-table">
            <thead>
              <tr>
                <th>
                  <button
                    type="button"
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

                <th>Attendance</th>

                <th>Reason</th>

                <th>
                  <button
                    type="button"
                    onClick={() =>
                      toggleSort(
                        "submittedAt"
                      )
                    }
                  >
                    Submitted
                    {renderSortIcon(
                      "submittedAt"
                    )}
                  </button>
                </th>

                <th>
                  <button
                    type="button"
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

                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {paginatedDisputes.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="dp-empty-cell"
                  >
                    <MessageSquareWarning
                      size={42}
                    />

                    <p>
                      No dispute records match
                      the selected filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDisputes.map(
                  (dispute) => (
                    <tr key={dispute.id}>
                      <td>
                        <div className="dp-student-cell">
                          <span>
                            {dispute.studentName
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                          <div>
                            <strong>
                              {
                                dispute.studentName
                              }
                            </strong>

                            <small>
                              {
                                dispute.studentId
                              }{" "}
                              · {dispute.course}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="dp-attendance-cell">
                          <strong>
                            {dispute.attendance
                              ?.status ||
                              "Not linked"}
                          </strong>

                          <small>
                            {dispute.attendance
                              ?.timestamp
                              ? dispute.attendance.timestamp.toLocaleDateString(
                                  "en-MY"
                                )
                              : dispute.attendanceId ||
                                "No attendance ID"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <span className="dp-reason-cell">
                          {dispute.reason}
                        </span>
                      </td>

                      <td>
                        <div className="dp-date-cell">
                          <strong>
                            {dispute.submittedAt
                              ? dispute.submittedAt.toLocaleDateString(
                                  "en-MY"
                                )
                              : "N/A"}
                          </strong>

                          <small>
                            {dispute.submittedAt
                              ? dispute.submittedAt.toLocaleTimeString(
                                  "en-MY",
                                  {
                                    hour:
                                      "2-digit",
                                    minute:
                                      "2-digit",
                                  }
                                )
                              : ""}
                          </small>
                        </div>
                      </td>

                      <td>
                        <DisputeStatusBadge
                          status={
                            dispute.status
                          }
                        />
                      </td>

                      <td>
                        <button
                          type="button"
                          className="dp-view-button"
                          onClick={() =>
                            setSelectedDispute(
                              dispute
                            )
                          }
                        >
                          <Eye size={15} />
                          Review
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        <div className="dp-pagination">
          <span>
            Page {page} of {totalPages}
          </span>

          <div>
            <button
              type="button"
              disabled={page === 1}
              onClick={() =>
                setPage((current) =>
                  Math.max(
                    1,
                    current - 1
                  )
                )
              }
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <button
              type="button"
              disabled={
                page === totalPages
              }
              onClick={() =>
                setPage((current) =>
                  Math.min(
                    totalPages,
                    current + 1
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

      {selectedDispute && (
        <DisputeDetailsModal
          dispute={selectedDispute}
          saving={saving}
          onClose={() =>
            !saving &&
            setSelectedDispute(null)
          }
          onSubmit={
            handleReviewAction
          }
        />
      )}
    </div>
  );
}

export default Disputes;