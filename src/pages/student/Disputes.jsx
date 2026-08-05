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

import { useAuth } from "../../contexts/AuthContext";

import { useFirestoreSubscription } from "../../hooks/useFirestoreSubscription";

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

function getStatusLabel(status) {
  const labels = {
    pending: "Pending",
    under_review: "Under Review",
    awaiting_information:
      "Awaiting Information",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    closed: "Closed",
  };

  return labels[status] || "Pending";
}

function StudentDisputeStatus({
  status,
}) {
  return (
    <span
      className={`sd-status sd-status-${status}`}
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
    <div className="sd-card sd-summary-card">
      <div
        className={`sd-summary-icon sd-summary-${tone}`}
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

function formatDateTime(value) {
  if (!value) return "N/A";

  return value.toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function DisputeDetails({
  dispute,
  onClose,
  onEdit,
  onCancel,
}) {
  return (
    <div
      className="sd-modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className="sd-modal sd-details-modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="sd-modal-header">
          <div>
            <h2>Dispute Details</h2>

            <p>
              Review your submitted dispute and
              its current progress.
            </p>
          </div>

          <button
            type="button"
            className="sd-modal-close"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </div>

        <div className="sd-modal-content">
          <div className="sd-details-banner">
            <div>
              <span>Current Status</span>

              <StudentDisputeStatus
                status={dispute.status}
              />
            </div>

            <div>
              <span>Submitted</span>

              <strong>
                {formatDateTime(
                  dispute.submittedAt
                )}
              </strong>
            </div>
          </div>

          <section className="sd-details-section">
            <h3>
              Attendance Information
            </h3>

            <div className="sd-details-grid">
              <div>
                <span>Attendance Date</span>

                <strong>
                  {dispute.attendance
                    ?.dateLabel ||
                    "N/A"}
                </strong>
              </div>

              <div>
                <span>Attendance Time</span>

                <strong>
                  {dispute.attendance
                    ?.timeLabel ||
                    "N/A"}
                </strong>
              </div>

              <div>
                <span>Original Status</span>

                <strong>
                  {dispute.attendance
                    ?.status ||
                    dispute.raw
                      ?.originalStatus ||
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
                <span>Device</span>

                <strong>
                  {dispute.attendance
                    ?.deviceId ||
                    "N/A"}
                </strong>
              </div>
            </div>
          </section>

          <section className="sd-details-section">
            <h3>Dispute Explanation</h3>

            <div className="sd-reason-box">
              <strong>
                {dispute.reason}
              </strong>

              <p>
                {dispute.description ||
                  "No additional explanation was provided."}
              </p>
            </div>

            {dispute.evidenceUrl && (
              <a
                href={dispute.evidenceUrl}
                target="_blank"
                rel="noreferrer"
                className="sd-evidence-link"
              >
                Open supporting evidence
              </a>
            )}
          </section>

          <section className="sd-details-section">
            <h3>Review Progress</h3>

            <div className="sd-timeline">
              <div className="sd-timeline-item sd-timeline-complete">
                <span />

                <div>
                  <strong>
                    Dispute submitted
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
                    Administrative review
                  </strong>

                  <small>
                    {dispute.reviewedAt
                      ? formatDateTime(
                          dispute.reviewedAt
                        )
                      : "Waiting for review"}
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
                    Final decision
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

          <section className="sd-details-section">
            <h3>Admin Response</h3>

            <div className="sd-admin-response">
              {dispute.adminComment ||
                "No administrator comment has been added yet."}
            </div>
          </section>
        </div>

        <div className="sd-modal-footer">
          {dispute.status === "pending" && (
            <>
              <button
                type="button"
                className="sd-btn sd-btn-danger-outline"
                onClick={onCancel}
              >
                <Trash2 size={15} />
                Cancel Dispute
              </button>

              <button
                type="button"
                className="sd-btn sd-btn-secondary"
                onClick={onEdit}
              >
                <Edit3 size={15} />
                Edit
              </button>
            </>
          )}

          <button
            type="button"
            className="sd-btn sd-btn-primary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Disputes() {
  const { user } = useAuth();

  const disputeSubscription =
    useFirestoreSubscription(
      (onData, onError) =>
        subscribeToStudentDisputes(
          user,
          onData,
          onError
        ),
      [user?.uid]
    );

  const attendanceSubscription =
    useFirestoreSubscription(
      (onData, onError) =>
        subscribeToStudentAttendance(
          user,
          onData,
          onError
        ),
      [user?.uid]
    );

  const disputes =
    disputeSubscription.data || [];

  const attendanceRecords =
    attendanceSubscription.data || [];

  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [page, setPage] = useState(1);

  const [formModal, setFormModal] =
    useState(null);

  const [detailsDispute, setDetailsDispute] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const filteredDisputes = useMemo(() => {
    const query = searchTerm
      .trim()
      .toLowerCase();

    return disputes.filter((dispute) => {
      const searchable = [
        dispute.reason,
        dispute.description,
        dispute.requestedStatus,
        dispute.attendanceId,
        dispute.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        !query ||
        searchable.includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        dispute.status === statusFilter;

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    disputes,
    searchTerm,
    statusFilter,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredDisputes.length /
        PAGE_SIZE
    )
  );

  const paginatedDisputes =
    useMemo(() => {
      const start =
        (page - 1) * PAGE_SIZE;

      return filteredDisputes.slice(
        start,
        start + PAGE_SIZE
      );
    }, [filteredDisputes, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, statusFilter]);

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
        }

        if (
          dispute.status ===
            "under_review" ||
          dispute.status ===
            "awaiting_information"
        ) {
          result.reviewing += 1;
        }

        if (
          dispute.status === "approved"
        ) {
          result.approved += 1;
        }

        if (
          dispute.status === "rejected"
        ) {
          result.rejected += 1;
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
  }, [disputes]);

  async function handleFormSubmit(
    formData
  ) {
    setSaving(true);

    try {
      if (formModal.mode === "edit") {
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

      setFormModal(null);

      await Swal.fire({
        icon: "success",

        title:
          formModal.mode === "edit"
            ? "Dispute updated"
            : "Dispute submitted",

        timer: 1600,

        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",

        title: "Unable to save dispute",

        text:
          error.message ||
          "The dispute could not be saved.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel(dispute) {
    const result = await Swal.fire({
      icon: "warning",

      title: "Cancel this dispute?",

      text:
        "The dispute will no longer be reviewed.",

      showCancelButton: true,

      confirmButtonText:
        "Cancel Dispute",

      cancelButtonText:
        "Keep Dispute",

      confirmButtonColor:
        "#ef4444",
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      await cancelStudentDispute(
        dispute,
        user
      );

      setDetailsDispute(null);

      await Swal.fire({
        icon: "success",

        title: "Dispute cancelled",

        timer: 1400,

        showConfirmButton: false,
      });
    } catch (error) {
      Swal.fire({
        icon: "error",

        title: "Unable to cancel",

        text:
          error.message ||
          "The dispute could not be cancelled.",
      });
    }
  }

  if (
    disputeSubscription.loading ||
    attendanceSubscription.loading
  ) {
    return (
      <div className="sd-page">
        <div className="sd-loading-card">
          <div className="sd-skeleton" />
          <div className="sd-skeleton" />
          <div className="sd-skeleton" />
          <div className="sd-skeleton" />
        </div>
      </div>
    );
  }

  const pageError =
    disputeSubscription.error ||
    attendanceSubscription.error;

  if (pageError) {
    return (
      <div className="sd-page">
        <div className="sd-card sd-error-state">
          <AlertCircle size={34} />

          <div>
            <h2>
              Unable to load disputes
            </h2>

            <p>
              {pageError.message ||
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
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-page">
      <div className="sd-page-header">
        <div>
          <h1>My Attendance Disputes</h1>

          <p>
            Submit and track requests to
            correct your attendance records.
          </p>
        </div>

        <button
          type="button"
          className="sd-btn sd-btn-primary sd-submit-button"
          onClick={() =>
            setFormModal({
              mode: "create",
              dispute: null,
            })
          }
        >
          <FilePlus2 size={17} />
          Submit New Dispute
        </button>
      </div>

      <div className="sd-summary-grid">
        <SummaryCard
          icon={MessageSquareWarning}
          label="Total"
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
          icon={RefreshCw}
          label="In Review"
          value={summary.reviewing}
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

      <div className="sd-card sd-filter-card">
        <div className="sd-search-box">
          <Search size={18} />

          <input
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="Search by reason, requested status or dispute ID..."
          />
        </div>

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

          <option value="cancelled">
            Cancelled
          </option>

          <option value="closed">
            Closed
          </option>
        </select>
      </div>

      <div className="sd-card sd-table-card">
        <div className="sd-table-header">
          <div>
            <h2>My Disputes</h2>

            <p>
              {filteredDisputes.length} dispute
              {filteredDisputes.length === 1
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
                <th>Attendance</th>
                <th>Original</th>
                <th>Requested</th>
                <th>Reason</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Action</th>
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
                      size={44}
                    />

                    <h3>
                      No disputes found
                    </h3>

                    <p>
                      Submit a dispute when an
                      attendance record is
                      incorrect.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDisputes.map(
                  (dispute) => (
                    <tr key={dispute.id}>
                      <td>
                        <div className="sd-date-cell">
                          <strong>
                            {dispute.attendance
                              ?.dateLabel ||
                              "Not linked"}
                          </strong>

                          <small>
                            {dispute.attendance
                              ?.timeLabel ||
                              dispute.attendanceId}
                          </small>
                        </div>
                      </td>

                      <td>
                        <span className="sd-attendance-status">
                          {dispute.attendance
                            ?.status ||
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
                            {dispute.reason}
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
                            <Eye size={15} />
                            View
                          </button>

                          {dispute.status ===
                            "pending" && (
                            <button
                              type="button"
                              className="sd-edit-button"
                              onClick={() =>
                                setFormModal({
                                  mode: "edit",
                                  dispute,
                                })
                              }
                            >
                              <Edit3
                                size={15}
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

        <div className="sd-pagination">
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

      {formModal && (
        <StudentDisputeModal
          mode={formModal.mode}
          dispute={formModal.dispute}
          attendanceRecords={
            attendanceRecords
          }
          saving={saving}
          onClose={() =>
            !saving &&
            setFormModal(null)
          }
          onSubmit={handleFormSubmit}
        />
      )}

      {detailsDispute && (
        <DisputeDetails
          dispute={detailsDispute}
          onClose={() =>
            setDetailsDispute(null)
          }
          onEdit={() => {
            setFormModal({
              mode: "edit",
              dispute: detailsDispute,
            });

            setDetailsDispute(null);
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