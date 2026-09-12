import {
  Calendar,
  CheckCircle2,
  Clock3,
  FileText,
  GraduationCap,
  IdCard,
  Mail,
  MessageSquareText,
  MonitorSmartphone,
  ScanFace,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

/* =========================================================
   HELPERS
========================================================= */

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  try {
    const date =
      value instanceof Date
        ? value
        : typeof value?.toDate === "function"
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
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  } catch {
    return "N/A";
  }
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

function capitalize(value) {
  const text =
    String(
      value || ""
    )
      .trim()
      .replace(
        /_/g,
        " "
      );

  if (!text) {
    return "N/A";
  }

  return text
    .split(" ")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function getStatusLabel(status) {
  const labels = {
    pending: "Pending",
    under_review:
      "Under Review",
    awaiting_information:
      "Awaiting Information",
    approved: "Approved",
    rejected: "Rejected",
    closed: "Closed",
    cancelled: "Cancelled",
  };

  return (
    labels[status] ||
    capitalize(status) ||
    "Pending"
  );
}

/* =========================================================
   SMALL COMPONENTS
========================================================= */

function StatusBadge({
  status,
}) {
  return (
    <span
      className={`dp-status dp-status-${status}`}
    >
      {getStatusLabel(
        status
      )}
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
        {Icon && (
          <Icon size={15} />
        )}

        <span>
          {label}
        </span>
      </div>

      <div
        className={`dp-detail-value ${
          mono
            ? "dp-mono"
            : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function DisputeDetailsModal({
  dispute,
  saving = false,
  readOnly = false,
  onClose,
  onSubmit,
}) {
  const [
    teacherComment,
    setTeacherComment,
  ] = useState("");

  const [
    correctedStatus,
    setCorrectedStatus,
  ] = useState("");

  /* =======================================================
     INITIAL VALUES
  ======================================================= */

  useEffect(() => {
    setTeacherComment(
      dispute.teacherComment ||
        dispute.adminComment ||
        ""
    );

    setCorrectedStatus(
      dispute.teacherRecommendation &&
        dispute.teacherRecommendation !==
          "no_change"
        ? dispute.teacherRecommendation
        : dispute.requestedStatus ||
            dispute.attendance
              ?.status ||
            "present"
    );
  }, [
    dispute,
  ]);

  /* =======================================================
     LOCK PAGE SCROLL
  ======================================================= */

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  /* =======================================================
     VALUES
  ======================================================= */

  const resolved =
    [
      "approved",
      "rejected",
      "cancelled",
      "closed",
    ].includes(
      dispute.status
    );

  const canReview =
    !readOnly &&
    !resolved;

  const attendance =
    dispute.attendance;

  const attendanceDate =
    attendance?.timestamp
      ? formatDateTime(
          attendance.timestamp
        )
      : dispute.attendanceDate ||
        "N/A";

  const originalStatus =
    dispute.missingAttendance
      ? "missing"
      : dispute.originalStatus ||
        attendance?.status ||
        "unknown";

  const authenticationMethod =
    attendance?.authMethod ||
    "N/A";

  const device =
    attendance?.deviceName ||
    attendance?.deviceId ||
    "N/A";

  const studentInitial =
    useMemo(
      () =>
        dispute.studentName
          ?.trim()
          ?.charAt(0)
          ?.toUpperCase() ||
        "S",
      [
        dispute.studentName,
      ]
    );

  /* =======================================================
     SUBMIT
  ======================================================= */

  function submit(status) {
    if (
      status ===
        "approved" &&
      !correctedStatus
    ) {
      return;
    }

    onSubmit?.({
      status,

      teacherComment,

      correctedAttendanceStatus:
        status ===
        "approved"
          ? correctedStatus
          : "",
    });
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      className="dp-modal-overlay"
      onMouseDown={() => {
        if (!saving) {
          onClose?.();
        }
      }}
    >
      <div
        className="dp-modal dp-review-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dispute-modal-title"
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="dp-modal-header dp-review-header">
          <div className="dp-review-heading">
            <span className="dp-review-heading-icon">
              <MessageSquareText
                size={19}
              />
            </span>

            <div>
              <span className="dp-review-eyebrow">
                {readOnly
                  ? "Administrative Oversight"
                  : "Teacher Review"}
              </span>

              <h2 id="dispute-modal-title">
                Dispute Details
              </h2>

              <p>
                {readOnly
                  ? "View the student's attendance dispute and teacher decision."
                  : "Review the student's request and submit an attendance decision."}
              </p>
            </div>
          </div>

          <div className="dp-review-header-actions">
            <StatusBadge
              status={
                dispute.status
              }
            />

            <button
              type="button"
              className="dp-modal-close"
              onClick={
                onClose
              }
              disabled={
                saving
              }
              aria-label="Close dispute details"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* =================================================
            CONTENT
        ================================================= */}

        <div className="dp-modal-content dp-review-content">
          {/* STUDENT SUMMARY */}

          <section className="dp-review-student">
            <div className="dp-student-avatar">
              {studentInitial}
            </div>

            <div className="dp-review-student-copy">
              <span>
                Student
              </span>

              <strong>
                {displayValue(
                  dispute.studentName
                )}
              </strong>

              <p>
                {displayValue(
                  dispute.studentId
                )}

                {" · "}

                {displayValue(
                  dispute.course
                )}
              </p>
            </div>

            <div className="dp-review-student-department">
              <span>
                Department
              </span>

              <strong>
                {displayValue(
                  dispute.department
                )}
              </strong>
            </div>
          </section>

          {/* =================================================
              TWO COLUMN WORKSPACE
          ================================================= */}

          <div className="dp-review-workspace">
            {/* LEFT COLUMN */}

            <div className="dp-review-column">
              {/* STUDENT INFORMATION */}

              <section className="dp-review-panel">
                <div className="dp-review-panel-heading">
                  <span>
                    <UserRound
                      size={17}
                    />
                  </span>

                  <div>
                    <h3>
                      Student Information
                    </h3>

                    <p>
                      Student identity associated with this request.
                    </p>
                  </div>
                </div>

                <div className="dp-detail-grid">
                  <DetailItem
                    icon={
                      UserRound
                    }
                    label="Student Name"
                  >
                    {displayValue(
                      dispute.studentName
                    )}
                  </DetailItem>

                  <DetailItem
                    icon={
                      IdCard
                    }
                    label="Student ID"
                  >
                    {displayValue(
                      dispute.studentId
                    )}
                  </DetailItem>

                  <DetailItem
                    icon={
                      Mail
                    }
                    label="Email"
                  >
                    {displayValue(
                      dispute.email
                    )}
                  </DetailItem>

                  <DetailItem
                    icon={
                      GraduationCap
                    }
                    label="Course"
                  >
                    {displayValue(
                      dispute.course
                    )}
                  </DetailItem>
                </div>
              </section>

              {/* DISPUTE INFORMATION */}

              <section className="dp-review-panel">
                <div className="dp-review-panel-heading">
                  <span>
                    <FileText
                      size={17}
                    />
                  </span>

                  <div>
                    <h3>
                      Dispute Information
                    </h3>

                    <p>
                      Requested correction and student explanation.
                    </p>
                  </div>
                </div>

                <div className="dp-detail-grid">
                  <DetailItem
                    icon={
                      MessageSquareText
                    }
                    label="Reason"
                  >
                    {displayValue(
                      dispute.reason
                    )}
                  </DetailItem>

                  <DetailItem
                    icon={
                      ShieldCheck
                    }
                    label="Requested Status"
                  >
                    {capitalize(
                      dispute.requestedStatus
                    )}
                  </DetailItem>

                  <DetailItem
                    icon={
                      Calendar
                    }
                    label="Submitted"
                  >
                    {formatDateTime(
                      dispute.submittedAt
                    )}
                  </DetailItem>

                  <DetailItem
                    icon={
                      FileText
                    }
                    label="Dispute ID"
                    mono
                  >
                    {displayValue(
                      dispute.id
                    )}
                  </DetailItem>
                </div>

                <div className="dp-explanation-box">
                  <span>
                    Student Explanation
                  </span>

                  <p>
                    {displayValue(
                      dispute.description
                    )}
                  </p>
                </div>

                {dispute.evidenceUrl && (
                  <a
                    className="dp-evidence-link"
                    href={
                      dispute.evidenceUrl
                    }
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText
                      size={14}
                    />

                    Open Supporting Evidence
                  </a>
                )}
              </section>
            </div>

            {/* RIGHT COLUMN */}

            <div className="dp-review-column">
              {/* ATTENDANCE */}

              <section className="dp-review-panel">
                <div className="dp-review-panel-heading">
                  <span>
                    <Calendar
                      size={17}
                    />
                  </span>

                  <div>
                    <h3>
                      Related Attendance
                    </h3>

                    <p>
                      Attendance record connected to this dispute.
                    </p>
                  </div>
                </div>

                {attendance ||
                dispute.missingAttendance ? (
                  <div className="dp-detail-grid">
                    <DetailItem
                      icon={
                        Calendar
                      }
                      label="Attendance Date"
                    >
                      {attendanceDate}
                    </DetailItem>

                    <DetailItem
                      icon={
                        CheckCircle2
                      }
                      label="Original Status"
                    >
                      {capitalize(
                        originalStatus
                      )}
                    </DetailItem>

                    <DetailItem
                      icon={
                        ScanFace
                      }
                      label="Authentication Method"
                    >
                      {capitalize(
                        authenticationMethod
                      )}
                    </DetailItem>

                    <DetailItem
                      icon={
                        MonitorSmartphone
                      }
                      label="Device"
                    >
                      {displayValue(
                        device
                      )}
                    </DetailItem>
                  </div>
                ) : (
                  <div className="dp-related-empty">
                    Linked attendance record could not be found.
                  </div>
                )}
              </section>

              {/* =================================================
                  ADMIN READ ONLY
              ================================================= */}

              {readOnly && (
                <section className="dp-review-panel dp-decision-panel">
                  <div className="dp-review-panel-heading">
                    <span>
                      <ShieldCheck
                        size={17}
                      />
                    </span>

                    <div>
                      <h3>
                        Teacher Review
                      </h3>

                      <p>
                        Final teacher decision for this dispute.
                      </p>
                    </div>
                  </div>

                  <div className="dp-detail-grid">
                    <DetailItem
                      icon={
                        ShieldCheck
                      }
                      label="Decision"
                    >
                      <StatusBadge
                        status={
                          dispute.status
                        }
                      />
                    </DetailItem>

                    <DetailItem
                      icon={
                        Clock3
                      }
                      label="Reviewed At"
                    >
                      {formatDateTime(
                        dispute.reviewedAt
                      )}
                    </DetailItem>

                    <DetailItem
                      icon={
                        UserRound
                      }
                      label="Reviewed By"
                    >
                      {displayValue(
                        dispute.reviewedBy
                      )}
                    </DetailItem>

                    <DetailItem
                      icon={
                        CheckCircle2
                      }
                      label="Attendance Correction"
                    >
                      {capitalize(
                        dispute.teacherRecommendation
                      )}
                    </DetailItem>
                  </div>

                  <div className="dp-teacher-response">
                    <span>
                      Teacher Response
                    </span>

                    <p>
                      {dispute.teacherComment ||
                        "No teacher response has been added."}
                    </p>
                  </div>
                </section>
              )}

              {/* =================================================
                  TEACHER DECISION
              ================================================= */}

              {!readOnly && (
                <section className="dp-review-panel dp-decision-panel">
                  <div className="dp-review-panel-heading">
                    <span>
                      <ShieldCheck
                        size={17}
                      />
                    </span>

                    <div>
                      <h3>
                        Teacher Decision
                      </h3>

                      <p>
                        Review the requested correction and choose the final attendance outcome.
                      </p>
                    </div>
                  </div>

                  {resolved ? (
                    <div className="dp-resolved-box">
                      <CheckCircle2
                        size={21}
                      />

                      <div>
                        <strong>
                          This dispute has already been resolved
                        </strong>

                        <span>
                          Current status:{" "}
                          {getStatusLabel(
                            dispute.status
                          )}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* STATUS FLOW */}

                      <div className="dp-decision-flow">
                        <div className="dp-decision-step">
                          <span className="dp-decision-label">
                            Current
                          </span>

                          <strong className="dp-decision-value current">
                            {capitalize(
                              originalStatus
                            )}
                          </strong>
                        </div>

                        <div className="dp-decision-arrow">
                          →
                        </div>

                        <div className="dp-decision-step">
                          <span className="dp-decision-label">
                            Requested
                          </span>

                          <strong className="dp-decision-value requested">
                            {capitalize(
                              dispute.requestedStatus
                            )}
                          </strong>
                        </div>

                        <div className="dp-decision-arrow">
                          →
                        </div>

                        <div className="dp-decision-step">
                          <span className="dp-decision-label">
                            Final
                          </span>

                          <strong className="dp-decision-value final">
                            {capitalize(
                              correctedStatus
                            )}
                          </strong>
                        </div>
                      </div>

                      {/* NOTICE */}

                      <div className="dp-decision-notice">
                        <ShieldCheck
                          size={15}
                        />

                        <div>
                          <strong>
                            Teacher review required
                          </strong>

                          <span>
                            Approving this dispute will apply the selected final attendance status to the linked attendance record.
                          </span>
                        </div>
                      </div>

                      {/* FORM */}

                      <div className="dp-review-form">
                        <div className="dp-form-group">
                          <label>
                            Final Attendance Status
                          </label>

                          <div className="dp-status-select-wrap">
                            <select
                              value={
                                correctedStatus
                              }
                              onChange={(
                                event
                              ) =>
                                setCorrectedStatus(
                                  event.target.value
                                )
                              }
                              disabled={
                                saving
                              }
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

                            <span
                              className={`dp-final-preview dp-final-${correctedStatus}`}
                            >
                              {capitalize(
                                correctedStatus
                              )}
                            </span>
                          </div>

                          <small>
                            This status is only applied when the dispute is approved.
                          </small>
                        </div>

                        <div className="dp-form-group">
                          <label>
                            Teacher Response
                          </label>

                          <textarea
                            rows="6"
                            value={
                              teacherComment
                            }
                            onChange={(
                              event
                            ) =>
                              setTeacherComment(
                                event.target.value
                              )
                            }
                            disabled={
                              saving
                            }
                            placeholder="Explain why this dispute is being approved or rejected..."
                          />

                          <div className="dp-response-footer">
                            <span>
                              Visible to student
                            </span>

                            <span>
                              {
                                teacherComment.trim()
                                  .length
                              }{" "}
                              characters
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </section>
              )}
            </div>
          </div>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="dp-modal-footer dp-review-footer">
          <div className="dp-review-footer-info">
            <ShieldCheck
              size={14}
            />

            {readOnly
              ? "Administrative view only"
              : "Your decision will be recorded in BioSync"}
          </div>

          <div className="dp-review-footer-actions">
            <button
              type="button"
              className="dp-btn dp-btn-secondary"
              onClick={
                onClose
              }
              disabled={
                saving
              }
            >
              Close
            </button>

            {canReview && (
              <>
                <button
                  type="button"
                  className="dp-btn dp-btn-reject"
                  onClick={() =>
                    submit(
                      "rejected"
                    )
                  }
                  disabled={
                    saving
                  }
                >
                  Reject
                </button>

                <button
                  type="button"
                  className="dp-btn dp-btn-approve"
                  onClick={() =>
                    submit(
                      "approved"
                    )
                  }
                  disabled={
                    saving ||
                    !correctedStatus
                  }
                >
                  {saving
                    ? "Saving..."
                    : "Approve"}
                </button>
              </>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}

export default DisputeDetailsModal;