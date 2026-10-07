import {
  AlertCircle,
  CheckCircle,
  Clock3,
  Eye,
  MessageSquareWarning,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import Swal from "sweetalert2";

import {
  useAuth,
} from "../../contexts/AuthContext";

import {
  useFirestoreSubscription,
} from "../../hooks/useFirestoreSubscription";

import DisputeDetailsModal from "../../components/DisputeDetailsModal";

import {
  reviewDisputeByTeacher,
  subscribeToTeacherDisputes,
} from "../../services/disputeService";

import "./Disputes.css";

/* =========================================================
   SUMMARY CARD
========================================================= */

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
        <span>
          {label}
        </span>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  status,
}) {
  const labels = {
    pending:
      "Pending",

    under_review:
      "Under Review",

    awaiting_information:
      "Awaiting Information",

    approved:
      "Approved",

    rejected:
      "Rejected",

    cancelled:
      "Cancelled",

    closed:
      "Closed",
  };

  const safeStatus =
    status ||
    "pending";

  return (
    <span
      className={`dp-status dp-status-${safeStatus}`}
    >
      {labels[safeStatus] ||
        safeStatus}
    </span>
  );
}

/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(value) {
  if (!value) {
    return "N/A";
  }

  try {
    const date =
      value instanceof Date
        ? value
        : typeof value?.toDate ===
            "function"
          ? value.toDate()
          : new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "N/A";
    }

    return date.toLocaleDateString(
      "en-MY",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  } catch {
    return "N/A";
  }
}

/* =========================================================
   TEACHER DISPUTES
========================================================= */

function Disputes() {
  const {
    user,
  } = useAuth();

  /* =======================================================
     FIRESTORE SUBSCRIPTION
  ======================================================= */

  const subscription =
    useFirestoreSubscription(
      (
        onData,
        onError
      ) =>
        subscribeToTeacherDisputes(
          user,
          onData,
          onError
        ),

      [
        user?.uid,
        user?.department,
      ]
    );

  const disputes =
    subscription.data ||
    [];

  /* =======================================================
     STATE
  ======================================================= */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    selectedDispute,
    setSelectedDispute,
  ] = useState(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  /* =======================================================
     FILTER
  ======================================================= */

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return disputes.filter(
        (dispute) => {
          const searchable =
            [
              dispute.studentName,
              dispute.studentId,
              dispute.email,
              dispute.reason,
              dispute.description,
              dispute.id,
              dispute.requestedStatus,
              dispute.originalStatus,
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !query ||
            searchable.includes(
              query
            );

          const matchesStatus =
            statusFilter ===
              "all" ||
            dispute.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesStatus
          );
        }
      );
    }, [
      disputes,
      search,
      statusFilter,
    ]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(() => {
      return {
        total:
          disputes.length,

        pending:
          disputes.filter(
            (item) =>
              item.status ===
                "pending" ||
              item.status ===
                "under_review" ||
              item.status ===
                "awaiting_information"
          ).length,

        approved:
          disputes.filter(
            (item) =>
              item.status ===
              "approved"
          ).length,

        rejected:
          disputes.filter(
            (item) =>
              item.status ===
              "rejected"
          ).length,
      };
    }, [
      disputes,
    ]);

  /* =======================================================
     REVIEW
  ======================================================= */

  async function handleReview({
    status,
    teacherComment,
    correctedAttendanceStatus,
  }) {
    if (
      !selectedDispute
    ) {
      return;
    }

    const result =
      await Swal.fire({
        icon:
          status ===
          "approved"
            ? "question"
            : "warning",

        title:
          status ===
          "approved"
            ? "Approve dispute?"
            : "Reject dispute?",

        text:
          status ===
          "approved"
            ? selectedDispute.attendanceId
              ? "The dispute will be approved and the related attendance record can be corrected."
              : "The dispute will be approved. There is no linked attendance record to update."
            : "The dispute will be rejected and the attendance record will remain unchanged.",

        showCancelButton:
          true,

        confirmButtonText:
          status ===
          "approved"
            ? "Approve"
            : "Reject",

        cancelButtonText:
          "Cancel",

        confirmButtonColor:
          status ===
          "approved"
            ? "#10b981"
            : "#ef4444",
      });

    if (
      !result.isConfirmed
    ) {
      return;
    }

    setSaving(true);

    try {
      await reviewDisputeByTeacher({
        disputeId:
          selectedDispute.id,

        attendanceId:
          selectedDispute.attendanceId,

        status,

        teacherComment,

        correctedAttendanceStatus,

        teacherUser:
          user,
      });

      setSelectedDispute(
        null
      );

      await Swal.fire({
        icon:
          "success",

        title:
          "Dispute reviewed",

        text:
          status ===
          "approved"
            ? "The student dispute has been approved."
            : "The student dispute has been rejected.",

        timer:
          1600,

        showConfirmButton:
          false,
      });
    } catch (error) {
      console.error(
        "Unable to review dispute:",
        error
      );

      await Swal.fire({
        icon:
          "error",

        title:
          "Unable to review dispute",

        text:
          error?.message ||
          "Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    subscription.loading
  ) {
    return (
      <div className="teacher-disputes-page dp-page">
        <div className="dp-loading-card">
          <div className="dp-skeleton" />
          <div className="dp-skeleton" />
          <div className="dp-skeleton" />
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  if (
    subscription.error
  ) {
    return (
      <div className="teacher-disputes-page dp-page">
        <div className="dp-card dp-error-state">
          <AlertCircle
            size={34}
          />

          <div>
            <h2>
              Unable to load disputes
            </h2>

            <p>
              {subscription.error
                ?.message ||
                "Check the Firestore connection and permissions."}
            </p>
          </div>

          <button
            type="button"
            className="dp-btn dp-btn-primary"
            onClick={
              subscription.retry
            }
          >
            <RefreshCw
              size={16}
            />

            Retry
          </button>
        </div>
      </div>
    );
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="teacher-disputes-page dp-page">

      {/* ===================================================
          HERO
      =================================================== */}

      <section className="dp-page-header">
        <div className="dp-header-copy">
          <span className="dp-header-eyebrow">
            <MessageSquareWarning
              size={14}
            />

            Department Review Center
          </span>
<h1>
  <span
    style={{
      color: "#edf7fc",
      WebkitTextFillColor: "#edf7fc",
    }}
  >
    Teacher{" "}
  </span>

  <span
    style={{
      backgroundImage: "linear-gradient(90deg, #bdf6fd, #00ddeb)",
      backgroundClip: "text",
      WebkitBackgroundClip: "text",
      color: "transparent",
      WebkitTextFillColor: "transparent",
    }}
  >
    Disputes
  </span>
</h1>

          <p>
            Review attendance disputes submitted
            by students in the{" "}
            <strong>
              {user?.department ||
                "assigned"}
            </strong>{" "}
            department and resolve attendance
            corrections securely.
          </p>

          <div className="dp-header-meta">
            <span>
              <CheckCircle
                size={13}
              />

              Teacher Review
            </span>

            <span>
              <Clock3
                size={13}
              />

              {
                summary.pending
              }{" "}
              awaiting action
            </span>
          </div>
        </div>

        <div className="dp-header-side">
          <div className="dp-live-badge">
            <span />

            Live updates
          </div>

          <div className="dp-hero-count">
            <strong>
              {summary.total}
            </strong>

            <span>
              Department Disputes
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <section className="dp-summary-grid">
        <SummaryCard
          icon={
            MessageSquareWarning
          }
          label="Total"
          value={
            summary.total
          }
          tone="blue"
        />

        <SummaryCard
          icon={Clock3}
          label="Needs Review"
          value={
            summary.pending
          }
          tone="yellow"
        />

        <SummaryCard
          icon={CheckCircle}
          label="Approved"
          value={
            summary.approved
          }
          tone="green"
        />

        <SummaryCard
          icon={XCircle}
          label="Rejected"
          value={
            summary.rejected
          }
          tone="red"
        />
      </section>

      {/* ===================================================
          FILTER
      =================================================== */}

      <section className="dp-card dp-filter-card">
        <div className="dp-search-box">
          <Search
            size={17}
          />

          <input
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search student, ID, email, reason or dispute ID..."
          />
        </div>

        <div className="dp-filter-grid">
          <div className="dp-filter-group">
            <label>
              Status
            </label>

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
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

              <option value="cancelled">
                Cancelled
              </option>

              <option value="closed">
                Closed
              </option>
            </select>
          </div>
        </div>
      </section>

      {/* ===================================================
          TABLE
      =================================================== */}

      <section className="dp-card dp-table-card">
        <div className="dp-table-header">
          <div>
            <span>
              Department Requests
            </span>

            <h2>
              Attendance Disputes
            </h2>

            <p>
              {filtered.length} dispute
              {filtered.length ===
              1
                ? ""
                : "s"}{" "}
              found
            </p>
          </div>

          <span className="dp-result-chip">
            {user?.department ||
              "Department"}
          </span>
        </div>

        <div className="dp-table-scroll">
          <table className="dp-table">
            <thead>
              <tr>
                <th>
                  Student
                </th>

                <th>
                  Attendance
                </th>

                <th>
                  Requested
                </th>

                <th>
                  Reason
                </th>

                <th>
                  Submitted
                </th>

                <th>
                  Status
                </th>

                <th>
                  Action
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="dp-empty-cell"
                  >
                    <MessageSquareWarning
                      size={42}
                    />

                    <h3>
                      No disputes found
                    </h3>

                    <p>
                      There are no matching student
                      disputes for your department.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(
                  (dispute) => (
                    <tr
                      key={
                        dispute.id
                      }
                    >
                      <td>
                        <div className="dp-student-cell">
                          <span>
                            {dispute.studentName
                              ?.charAt(
                                0
                              )
                              .toUpperCase() ||
                              "S"}
                          </span>

                          <div>
                            <strong>
                              {dispute.studentName ||
                                "Unknown Student"}
                            </strong>

                            <small>
                              {dispute.studentId ||
                                "No Student ID"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="dp-attendance-cell">
                          <strong>
                            {dispute.missingAttendance
                              ? "Missing Record"
                              : dispute.originalStatus ||
                                dispute.attendance
                                  ?.status ||
                                "N/A"}
                          </strong>

                          <small>
                            {dispute.attendance
                              ?.dateLabel ||
                              dispute.attendanceDate ||
                              "No date"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <span className="dp-requested-status">
                          {dispute.requestedStatus ||
                            "N/A"}
                        </span>
                      </td>

                      <td>
                        <span className="dp-reason-cell">
                          {dispute.reason ||
                            "No reason"}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          dispute.submittedAt
                        )}
                      </td>

                      <td>
                        <StatusBadge
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
                          <Eye
                            size={14}
                          />

                          {dispute.status ===
                          "pending"
                            ? "Review"
                            : "View"}
                        </button>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ===================================================
          MODAL
      =================================================== */}

      {selectedDispute && (
        <DisputeDetailsModal
          dispute={
            selectedDispute
          }
          saving={
            saving
          }
          readOnly={
            selectedDispute.status !==
            "pending"
          }
          onClose={() =>
            !saving &&
            setSelectedDispute(
              null
            )
          }
          onSubmit={
            handleReview
          }
        />
      )}
    </div>
  );
}

export default Disputes;