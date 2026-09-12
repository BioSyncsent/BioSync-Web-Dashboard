import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  FilePlus2,
  MessageSquareWarning,
  RefreshCw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import {
  useEffect,
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

import StudentDisputeModal from "../../components/StudentDisputeModal";

import {
  cancelStudentDispute,
  createStudentDispute,
  subscribeToStudentAttendance,
  subscribeToStudentDisputes,
  updateStudentDispute,
} from "../../services/disputeService";

import "./Disputes.css";

const PAGE_SIZE = 8;

/* =========================================================
   STATUS
========================================================= */

function getStatusLabel(
  status
) {
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

  return (
    labels[status] ||
    "Pending"
  );
}

function StudentDisputeStatus({
  status,
}) {
  const safeStatus =
    status ||
    "pending";

  return (
    <span
      className={`sd-status sd-status-${safeStatus}`}
    >
      {getStatusLabel(
        safeStatus
      )}
    </span>
  );
}

/* =========================================================
   SUMMARY
========================================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}) {
  return (
    <div className="sd-card sd-summary-card">
      <div
        className={`sd-summary-icon sd-summary-${tone}`}
      >
        <Icon
          size={20}
        />
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
   DATE
========================================================= */

function formatDateTime(
  value
) {
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

    return date.toLocaleString(
      "en-MY",
      {
        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    );
  } catch {
    return "N/A";
  }
}

/* =========================================================
   DETAILS MODAL
========================================================= */

function DisputeDetails({
  dispute,
  onClose,
  onEdit,
  onCancel,
}) {
  return (
    <div
      className="sd-modal-overlay"
      onMouseDown={
        onClose
      }
    >
      <div
        className="sd-modal sd-details-modal"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="sd-modal-header">
          <div>
            <span className="sd-modal-eyebrow">
              Dispute Tracking
            </span>

            <h2>
              Dispute Details
            </h2>

            <p>
              Review your submitted dispute,
              teacher response and current
              progress.
            </p>
          </div>

          <button
            type="button"
            className="sd-modal-close"
            onClick={
              onClose
            }
          >
            <X
              size={20}
            />
          </button>
        </div>

        {/* CONTENT */}

        <div className="sd-modal-content">

          {/* SUMMARY */}

          <div className="sd-details-banner">
            <div>
              <span>
                Current Status
              </span>

              <StudentDisputeStatus
                status={
                  dispute.status
                }
              />
            </div>

            <div>
              <span>
                Submitted
              </span>

              <strong>
                {formatDateTime(
                  dispute.submittedAt
                )}
              </strong>
            </div>
          </div>

          {/* ATTENDANCE */}

          <section className="sd-details-section">
            <h3>
              Attendance Information
            </h3>

            <div className="sd-details-grid">
              <div>
                <span>
                  Attendance Date
                </span>

                <strong>
                  {dispute.attendance
                    ?.dateLabel ||
                    dispute.attendanceDate ||
                    dispute.raw
                      ?.attendanceDate ||
                    "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Attendance Time
                </span>

                <strong>
                  {dispute.attendance
                    ?.timeLabel ||
                    dispute.requestedTime ||
                    dispute.raw
                      ?.requestedTime ||
                    "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Original Status
                </span>

                <strong>
                  {dispute.missingAttendance
                    ? "Missing"
                    : dispute.attendance
                        ?.status ||
                      dispute.raw
                        ?.originalStatus ||
                      dispute.originalStatus ||
                      "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Requested Status
                </span>

                <strong>
                  {dispute.requestedStatus ||
                    "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Authentication Method
                </span>

                <strong>
                  {dispute.attendance
                    ?.authMethod ||
                    "N/A"}
                </strong>
              </div>

              <div>
                <span>
                  Device
                </span>

                <strong>
                  {dispute.attendance
                    ?.deviceName ||
                    dispute.attendance
                      ?.deviceId ||
                    "N/A"}
                </strong>
              </div>
            </div>
          </section>

          {/* REASON */}

          <section className="sd-details-section">
            <h3>
              Dispute Explanation
            </h3>

            <div className="sd-reason-box">
              <strong>
                {dispute.reason ||
                  "Attendance dispute"}
              </strong>

              <p>
                {dispute.description ||
                  "No additional explanation was provided."}
              </p>
            </div>

            {dispute.evidenceUrl && (
              <a
                href={
                  dispute.evidenceUrl
                }
                target="_blank"
                rel="noreferrer"
                className="sd-evidence-link"
              >
                Open Supporting Evidence
              </a>
            )}
          </section>

          {/* TIMELINE */}

          <section className="sd-details-section">
            <h3>
              Review Progress
            </h3>

            <div className="sd-timeline">

              <div className="sd-timeline-item sd-timeline-complete">
                <span />

                <div>
                  <strong>
                    Dispute Submitted
                  </strong>

                  <small>
                    {formatDateTime(
                      dispute.submittedAt
                    )}
                  </small>
                </div>
              </div>

              <div
                className={`sd-timeline-item ${
                  dispute.status !==
                  "pending"
                    ? "sd-timeline-complete"
                    : ""
                }`}
              >
                <span />

                <div>
                  <strong>
                    Teacher Review
                  </strong>

                  <small>
                    {dispute.reviewedAt
                      ? formatDateTime(
                          dispute.reviewedAt
                        )
                      : "Waiting for teacher review"}
                  </small>
                </div>
              </div>

              <div
                className={`sd-timeline-item ${
                  [
                    "approved",
                    "rejected",
                    "closed",
                  ].includes(
                    dispute.status
                  )
                    ? "sd-timeline-complete"
                    : ""
                }`}
              >
                <span />

                <div>
                  <strong>
                    Final Decision
                  </strong>

                  <small>
                    {dispute.resolvedAt
                      ? formatDateTime(
                          dispute.resolvedAt
                        )
                      : "Not resolved yet"}
                  </small>
                </div>
              </div>

            </div>
          </section>

          {/* TEACHER RESPONSE */}

          <section className="sd-details-section">
            <h3>
              Teacher Response
            </h3>

            <div className="sd-admin-response">
              {dispute.teacherComment ||
                dispute.adminComment ||
                "No teacher response has been added yet."}
            </div>
          </section>
        </div>

        {/* FOOTER */}

        <div className="sd-modal-footer">
          {dispute.status ===
            "pending" && (
            <>
              <button
                type="button"
                className="sd-btn sd-btn-danger-outline"
                onClick={
                  onCancel
                }
              >
                <Trash2
                  size={14}
                />

                Cancel Dispute
              </button>

              <button
                type="button"
                className="sd-btn sd-btn-secondary"
                onClick={
                  onEdit
                }
              >
                <Edit3
                  size={14}
                />

                Edit
              </button>
            </>
          )}

          <button
            type="button"
            className="sd-btn sd-btn-primary"
            onClick={
              onClose
            }
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   STUDENT DISPUTES
========================================================= */

function Disputes() {
  const {
    user,
  } = useAuth();

  /* =======================================================
     SUBSCRIPTIONS
  ======================================================= */

  const disputeSubscription =
    useFirestoreSubscription(
      (
        onData,
        onError
      ) =>
        subscribeToStudentDisputes(
          user,
          onData,
          onError
        ),

      [
        user?.uid,
      ]
    );

  const attendanceSubscription =
    useFirestoreSubscription(
      (
        onData,
        onError
      ) =>
        subscribeToStudentAttendance(
          user,
          onData,
          onError
        ),

      [
        user?.uid,
      ]
    );

  const disputes =
    disputeSubscription.data ||
    [];

  const attendanceRecords =
    attendanceSubscription.data ||
    [];

  /* =======================================================
     STATE
  ======================================================= */

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    "all"
  );

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    formModal,
    setFormModal,
  ] = useState(null);

  const [
    detailsDispute,
    setDetailsDispute,
  ] = useState(null);

  const [
    saving,
    setSaving,
  ] = useState(false);

  /* =======================================================
     FILTER
  ======================================================= */

  const filteredDisputes =
    useMemo(() => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      return disputes.filter(
        (dispute) => {
          const searchable =
            [
              dispute.reason,
              dispute.description,
              dispute.requestedStatus,
              dispute.attendanceId,
              dispute.attendanceDate,
              dispute.id,
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
      searchTerm,
      statusFilter,
    ]);

  /* =======================================================
     PAGINATION
  ======================================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredDisputes.length /
          PAGE_SIZE
      )
    );

  const paginatedDisputes =
    useMemo(() => {
      const start =
        (page - 1) *
        PAGE_SIZE;

      return filteredDisputes.slice(
        start,
        start + PAGE_SIZE
      );
    }, [
      filteredDisputes,
      page,
    ]);

  useEffect(() => {
    setPage(1);
  }, [
    searchTerm,
    statusFilter,
  ]);

  useEffect(() => {
    if (
      page >
      totalPages
    ) {
      setPage(
        totalPages
      );
    }
  }, [
    page,
    totalPages,
  ]);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(() => {
      return disputes.reduce(
        (
          result,
          dispute
        ) => {
          result.total +=
            1;

          if (
            dispute.status ===
            "pending"
          ) {
            result.pending +=
              1;
          }

          if (
            dispute.status ===
              "under_review" ||
            dispute.status ===
              "awaiting_information"
          ) {
            result.reviewing +=
              1;
          }

          if (
            dispute.status ===
            "approved"
          ) {
            result.approved +=
              1;
          }

          if (
            dispute.status ===
            "rejected"
          ) {
            result.rejected +=
              1;
          }

          return result;
        },

        {
          total: 0,
          pending: 0,
          reviewing: 0,
          approved: 0,
          rejected: 0,
        }
      );
    }, [
      disputes,
    ]);

  /* =======================================================
     CREATE / EDIT
  ======================================================= */

  async function handleFormSubmit(
    formData
  ) {
    if (
      !formModal
    ) {
      return;
    }

    setSaving(true);

    const editMode =
      formModal.mode ===
      "edit";

    try {
      if (editMode) {
        await updateStudentDispute(
          formModal.dispute.id,

          {
            ...formData,

            attendanceId:
              formModal.dispute
                .attendanceId,
          },

          user
        );
      } else {
        await createStudentDispute(
          formData,
          user,
          disputes
        );
      }

      setFormModal(
        null
      );

      await Swal.fire({
        icon:
          "success",

        title:
          editMode
            ? "Dispute updated"
            : "Dispute submitted",

        text:
          editMode
            ? "Your changes have been saved."
            : "Your dispute has been sent to your teacher for review.",

        timer:
          1700,

        showConfirmButton:
          false,
      });
    } catch (error) {
      console.error(
        "Unable to save dispute:",
        error
      );

      await Swal.fire({
        icon:
          "error",

        title:
          "Unable to save dispute",

        text:
          error?.message ||
          "The dispute could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  /* =======================================================
     CANCEL
  ======================================================= */

  async function handleCancel(
    dispute
  ) {
    const result =
      await Swal.fire({
        icon:
          "warning",

        title:
          "Cancel this dispute?",

        text:
          "The dispute will no longer be reviewed.",

        showCancelButton:
          true,

        confirmButtonText:
          "Cancel Dispute",

        cancelButtonText:
          "Keep Dispute",

        confirmButtonColor:
          "#ef4444",
      });

    if (
      !result.isConfirmed
    ) {
      return;
    }

    try {
      await cancelStudentDispute(
        dispute,
        user
      );

      setDetailsDispute(
        null
      );

      await Swal.fire({
        icon:
          "success",

        title:
          "Dispute cancelled",

        timer:
          1400,

        showConfirmButton:
          false,
      });
    } catch (error) {
      console.error(
        "Unable to cancel dispute:",
        error
      );

      await Swal.fire({
        icon:
          "error",

        title:
          "Unable to cancel",

        text:
          error?.message ||
          "The dispute could not be cancelled.",
      });
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (
    disputeSubscription.loading ||
    attendanceSubscription.loading
  ) {
    return (
      <div className="student-disputes-page sd-page">
        <div className="sd-loading-card">
          <div className="sd-skeleton" />
          <div className="sd-skeleton" />
          <div className="sd-skeleton" />
          <div className="sd-skeleton" />
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR
  ======================================================= */

  const pageError =
    disputeSubscription.error ||
    attendanceSubscription.error;

  if (
    pageError
  ) {
    return (
      <div className="student-disputes-page sd-page">
        <div className="sd-card sd-error-state">
          <AlertCircle
            size={34}
          />

          <div>
            <h2>
              Unable to load disputes
            </h2>

            <p>
              {pageError?.message ||
                "Check your connection and try again."}
            </p>
          </div>

          <button
            type="button"
            className="sd-btn sd-btn-primary"
            onClick={() => {
              disputeSubscription.retry();

              attendanceSubscription.retry();
            }}
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
    <div className="student-disputes-page sd-page">

      {/* HERO */}

      <section className="sd-page-header">
        <div className="sd-header-copy">
          <span className="sd-header-eyebrow">
            <MessageSquareWarning
              size={14}
            />

            Attendance Resolution
          </span>

          <h1>
            My Attendance Disputes
          </h1>

          <p>
            Submit attendance correction requests
            and track your teacher&apos;s review
            from one secure workspace.
          </p>

          <div className="sd-header-meta">
            <span>
              <Clock3
                size={13}
              />

              {
                summary.pending +
                summary.reviewing
              }{" "}
              active
            </span>

            <span>
              <CheckCircle
                size={13}
              />

              {
                summary.approved
              }{" "}
              approved
            </span>
          </div>
        </div>

        <div className="sd-header-action">
          <div className="sd-hero-count">
            <strong>
              {summary.total}
            </strong>

            <span>
              Total Disputes
            </span>
          </div>

          <button
            type="button"
            className="sd-btn sd-btn-primary sd-submit-button"
            onClick={() =>
              setFormModal({
                mode:
                  "create",

                dispute:
                  null,
              })
            }
          >
            <FilePlus2
              size={16}
            />

            Submit New Dispute
          </button>
        </div>
      </section>

      {/* SUMMARY */}

      <section className="sd-summary-grid">
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
          icon={
            Clock3
          }
          label="Pending"
          value={
            summary.pending
          }
          tone="yellow"
        />

        <SummaryCard
          icon={
            RefreshCw
          }
          label="In Review"
          value={
            summary.reviewing
          }
          tone="purple"
        />

        <SummaryCard
          icon={
            CheckCircle
          }
          label="Approved"
          value={
            summary.approved
          }
          tone="green"
        />

        <SummaryCard
          icon={
            XCircle
          }
          label="Rejected"
          value={
            summary.rejected
          }
          tone="red"
        />
      </section>

      {/* FILTER */}

      <section className="sd-card sd-filter-card">
        <div className="sd-search-box">
          <Search
            size={17}
          />

          <input
            value={
              searchTerm
            }
            onChange={(
              event
            ) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Search by reason, status, date or dispute ID..."
          />
        </div>

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
      </section>

      {/* TABLE */}

      <section className="sd-card sd-table-card">
        <div className="sd-table-header">
          <div>
            <span>
              Dispute History
            </span>

            <h2>
              My Requests
            </h2>

            <p>
              {filteredDisputes.length} dispute
              {filteredDisputes.length ===
              1
                ? ""
                : "s"}{" "}
              found
            </p>
          </div>
        </div>

        <div className="sd-table-scroll">
          <table className="sd-table">
            <thead>
              <tr>
                <th>
                  Attendance
                </th>

                <th>
                  Original
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
              {paginatedDisputes.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="sd-empty-cell"
                  >
                    <MessageSquareWarning
                      size={42}
                    />

                    <h3>
                      No disputes found
                    </h3>

                    <p>
                      Submit a dispute when an
                      attendance record needs
                      correction.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDisputes.map(
                  (dispute) => (
                    <tr
                      key={
                        dispute.id
                      }
                    >
                      <td>
                        <div className="sd-date-cell">
                          <strong>
                            {dispute.missingAttendance
                              ? dispute.attendanceDate ||
                                "Missing record"
                              : dispute.attendance
                                  ?.dateLabel ||
                                dispute.attendanceDate ||
                                "Not linked"}
                          </strong>

                          <small>
                            {dispute.missingAttendance
                              ? "No attendance record"
                              : dispute.attendance
                                  ?.timeLabel ||
                                dispute.attendanceId ||
                                ""}
                          </small>
                        </div>
                      </td>

                      <td>
                        <span className="sd-attendance-status">
                          {dispute.missingAttendance
                            ? "Missing"
                            : dispute.attendance
                                ?.status ||
                              dispute.originalStatus ||
                              dispute.raw
                                ?.originalStatus ||
                              "N/A"}
                        </span>
                      </td>

                      <td>
                        <span className="sd-requested-status">
                          {dispute.requestedStatus ||
                            "N/A"}
                        </span>
                      </td>

                      <td>
                        <div className="sd-reason-cell">
                          <strong>
                            {dispute.reason ||
                              "Attendance issue"}
                          </strong>

                          <small>
                            {dispute.description ||
                              "No additional details"}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className="sd-date-cell">
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
                        <StudentDisputeStatus
                          status={
                            dispute.status
                          }
                        />
                      </td>

                      <td>
                        <div className="sd-row-actions">
                          <button
                            type="button"
                            className="sd-view-button"
                            onClick={() =>
                              setDetailsDispute(
                                dispute
                              )
                            }
                          >
                            <Eye
                              size={14}
                            />

                            View
                          </button>

                          {dispute.status ===
                            "pending" && (
                            <button
                              type="button"
                              className="sd-edit-button"
                              title="Edit dispute"
                              onClick={() =>
                                setFormModal({
                                  mode:
                                    "edit",

                                  dispute,
                                })
                              }
                            >
                              <Edit3
                                size={14}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="sd-pagination">
          <span>
            Page {page} of {totalPages}
          </span>

          <div>
            <button
              type="button"
              disabled={
                page === 1
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.max(
                      1,
                      current - 1
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
              type="button"
              disabled={
                page ===
                totalPages
              }
              onClick={() =>
                setPage(
                  (current) =>
                    Math.min(
                      totalPages,
                      current + 1
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

      {/* CREATE / EDIT MODAL */}

      {formModal && (
        <StudentDisputeModal
          mode={
            formModal.mode
          }
          dispute={
            formModal.dispute
          }
          attendanceRecords={
            attendanceRecords
          }
          saving={
            saving
          }
          onClose={() =>
            !saving &&
            setFormModal(
              null
            )
          }
          onSubmit={
            handleFormSubmit
          }
        />
      )}

      {/* DETAILS MODAL */}

      {detailsDispute && (
        <DisputeDetails
          dispute={
            detailsDispute
          }
          onClose={() =>
            setDetailsDispute(
              null
            )
          }
          onEdit={() => {
            setFormModal({
              mode:
                "edit",

              dispute:
                detailsDispute,
            });

            setDetailsDispute(
              null
            );
          }}
          onCancel={() =>
            handleCancel(
              detailsDispute
            )
          }
        />
      )}
    </div>
  );
}

export default Disputes;