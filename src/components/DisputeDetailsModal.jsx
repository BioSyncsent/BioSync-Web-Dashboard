import {
  Calendar,
  CheckCircle,
  Clock,
  Cpu,
  FileText,
  IdCard,
  Mail,
  MessageSquare,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";

function formatDateTime(value) {
  if (!value) return "N/A";

  return value.toLocaleString("en-MY", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function displayValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "N/A";
  }

  return String(value);
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

function DetailItem({
  icon: Icon,
  label,
  children,
  mono = false,
}) {
  return (
    <div className="dp-detail-item">
      <div className="dp-detail-label">
        {Icon && <Icon size={16} />}
        {label}
      </div>

      <div
        className={`dp-detail-value ${
          mono ? "dp-mono" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function DisputeDetailsModal({
  dispute,
  saving,
  onClose,
  onSubmit,
}) {
  const [adminComment, setAdminComment] =
    useState("");

  const [
    correctedAttendanceStatus,
    setCorrectedAttendanceStatus,
  ] = useState("");

  useEffect(() => {
    setAdminComment(
      dispute.adminComment || ""
    );

    setCorrectedAttendanceStatus(
      dispute.requestedStatus ||
        dispute.attendance?.status ||
        ""
    );
  }, [dispute]);

  function submitAction(status) {
    onSubmit({
      status,
      adminComment,
      correctedAttendanceStatus:
        status === "approved"
          ? correctedAttendanceStatus
          : "",
    });
  }

  return (
    <div
      className="dp-modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className="dp-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="dp-modal-header">
          <div>
            <h2>Dispute Details</h2>

            <p>
              Review the attendance dispute and
              submit an administrative decision.
            </p>
          </div>

          <button
            type="button"
            className="dp-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={21} />
          </button>
        </div>

        <div className="dp-modal-content">
          <div className="dp-student-banner">
            <span className="dp-student-avatar">
              {dispute.studentName
                .charAt(0)
                .toUpperCase()}
            </span>

            <div>
              <strong>
                {dispute.studentName}
              </strong>

              <span>
                {dispute.studentId} ·{" "}
                {dispute.course}
              </span>
            </div>

            <DisputeStatusBadge
              status={dispute.status}
            />
          </div>

          <section className="dp-modal-section">
            <h3>Student Information</h3>

            <div className="dp-detail-grid">
              <DetailItem
                icon={User}
                label="Student Name"
              >
                {displayValue(
                  dispute.studentName
                )}
              </DetailItem>

              <DetailItem
                icon={IdCard}
                label="Student ID"
              >
                {displayValue(
                  dispute.studentId
                )}
              </DetailItem>

              <DetailItem
                icon={Mail}
                label="Email"
              >
                {displayValue(
                  dispute.email
                )}
              </DetailItem>

              <DetailItem label="Course">
                {displayValue(
                  dispute.course
                )}
              </DetailItem>

              <DetailItem label="Department">
                {displayValue(
                  dispute.department
                )}
              </DetailItem>
            </div>
          </section>

          <section className="dp-modal-section">
            <h3>Dispute Information</h3>

            <div className="dp-detail-grid">
              <DetailItem
                icon={MessageSquare}
                label="Reason"
              >
                {displayValue(
                  dispute.reason
                )}
              </DetailItem>

              <DetailItem
                icon={ShieldCheck}
                label="Status"
              >
                <DisputeStatusBadge
                  status={dispute.status}
                />
              </DetailItem>

              <DetailItem
                icon={Calendar}
                label="Submitted At"
              >
                {formatDateTime(
                  dispute.submittedAt
                )}
              </DetailItem>

              <DetailItem
                icon={Clock}
                label="Resolved At"
              >
                {formatDateTime(
                  dispute.resolvedAt
                )}
              </DetailItem>

              <DetailItem
                icon={FileText}
                label="Dispute ID"
                mono
              >
                {displayValue(
                  dispute.id
                )}
              </DetailItem>

              <DetailItem
                icon={FileText}
                label="Attendance ID"
                mono
              >
                {displayValue(
                  dispute.attendanceId
                )}
              </DetailItem>
            </div>
          </section>

          <section className="dp-modal-section">
            <h3>Related Attendance</h3>

            {dispute.attendance ? (
              <div className="dp-detail-grid">
                <DetailItem
                  icon={Calendar}
                  label="Attendance Date"
                >
                  {formatDateTime(
                    dispute.attendance
                      .timestamp
                  )}
                </DetailItem>

                <DetailItem
                  icon={CheckCircle}
                  label="Original Status"
                >
                  {displayValue(
                    dispute.attendance.status
                  )}
                </DetailItem>

                <DetailItem
                  icon={ShieldCheck}
                  label="Authentication Method"
                >
                  {displayValue(
                    dispute.attendance
                      .authMethod
                  )}
                </DetailItem>

                <DetailItem
                  icon={Cpu}
                  label="Device"
                  mono
                >
                  {displayValue(
                    dispute.attendance
                      .deviceId
                  )}
                </DetailItem>

                <DetailItem label="Verification">
                  {displayValue(
                    dispute.attendance
                      .verificationResult
                  )}
                </DetailItem>
              </div>
            ) : (
              <div className="dp-related-empty">
                The linked attendance record could
                not be found.
              </div>
            )}
          </section>

          <section className="dp-modal-section">
            <h3>Administrative Review</h3>

            <div className="dp-review-form">
              <div className="dp-form-group">
                <label htmlFor="correctedStatus">
                  Corrected attendance status
                </label>

                <select
                  id="correctedStatus"
                  value={
                    correctedAttendanceStatus
                  }
                  onChange={(event) =>
                    setCorrectedAttendanceStatus(
                      event.target.value
                    )
                  }
                  disabled={saving}
                >
                  <option value="">
                    No attendance correction
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

                <small>
                  This is applied only when the
                  dispute is approved.
                </small>
              </div>

              <div className="dp-form-group">
                <label htmlFor="adminComment">
                  Admin comment
                </label>

                <textarea
                  id="adminComment"
                  rows="5"
                  value={adminComment}
                  onChange={(event) =>
                    setAdminComment(
                      event.target.value
                    )
                  }
                  disabled={saving}
                  placeholder="Explain the review decision or request more information."
                />
              </div>
            </div>
          </section>
        </div>

        <div className="dp-modal-footer">
          <button
            type="button"
            className="dp-btn dp-btn-secondary"
            onClick={() =>
              submitAction(
                "awaiting_information"
              )
            }
            disabled={saving}
          >
            Request Information
          </button>

          <button
            type="button"
            className="dp-btn dp-btn-review"
            onClick={() =>
              submitAction("under_review")
            }
            disabled={saving}
          >
            Mark Under Review
          </button>

          <button
            type="button"
            className="dp-btn dp-btn-reject"
            onClick={() =>
              submitAction("rejected")
            }
            disabled={saving}
          >
            Reject
          </button>

          <button
            type="button"
            className="dp-btn dp-btn-approve"
            onClick={() =>
              submitAction("approved")
            }
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Approve"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DisputeDetailsModal;