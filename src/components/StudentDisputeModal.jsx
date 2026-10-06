import {
  Calendar,
  Clock3,
  Cpu,
  FileText,
  Link as LinkIcon,
  MessageSquare,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

/* =========================================================
   ISSUE OPTIONS
========================================================= */

const ISSUE_OPTIONS = [
  {
    value: "",
    label: "Select an attendance issue",
  },
  {
    value: "wrong_status",
    label: "Wrong attendance status",
  },
  {
    value: "missing_record",
    label: "Missing attendance record",
  },
  {
    value: "wrong_checkin_time",
    label: "Wrong check-in time",
  },
  {
    value: "biometric_problem",
    label: "Biometric verification problem",
  },
  {
    value: "rfid_problem",
    label: "RFID detection problem",
  },
  {
    value: "approved_absence",
    label: "Approved absence / medical reason",
  },
  {
    value: "other",
    label: "Other attendance issue",
  },
];

const ISSUE_LABELS = {
  wrong_status:
    "Wrong attendance status",

  missing_record:
    "Missing attendance record",

  wrong_checkin_time:
    "Wrong check-in time",

  biometric_problem:
    "Biometric verification problem",

  rfid_problem:
    "RFID detection problem",

  approved_absence:
    "Approved absence / medical reason",

  other:
    "Other attendance issue",
};

/* =========================================================
   FORM
========================================================= */

function getEmptyForm() {
  return {
    issueType: "",
    attendanceId: "",
    missingAttendance: false,
    attendanceDate: "",
    requestedTime: "",
    originalStatus: "",
    requestedStatus: "present",
    reason: "",
    description: "",
    evidenceUrl: "",
  };
}

function formatAttendanceOption(
  record
) {
  return `${record.dateLabel} • ${record.status} • ${record.authMethod}`;
}

/* =========================================================
   COMPONENT
========================================================= */

function StudentDisputeModal({
  mode = "create",
  dispute = null,
  attendanceRecords = [],
  saving = false,
  onClose,
  onSubmit,
}) {
  const [
    formData,
    setFormData,
  ] = useState(
    getEmptyForm()
  );

  /* =======================================================
     EDIT MODE
  ======================================================= */

  useEffect(() => {
    if (
      mode === "edit" &&
      dispute
    ) {
      const issueType =
        dispute.issueType ||
        dispute.raw?.issueType ||
        (
          dispute.missingAttendance
            ? "missing_record"
            : "wrong_status"
        );

      setFormData({
        issueType,

        attendanceId:
          dispute.attendanceId ||
          "",

        missingAttendance:
          Boolean(
            dispute.missingAttendance
          ),

        attendanceDate:
          dispute.attendanceDate ||
          dispute.raw?.attendanceDate ||
          "",

        requestedTime:
          dispute.requestedTime ||
          dispute.raw?.requestedTime ||
          "",

        originalStatus:
          dispute.attendance?.status ||
          dispute.originalStatus ||
          dispute.raw?.originalStatus ||
          "",

        requestedStatus:
          dispute.requestedStatus ||
          "present",

        reason:
          dispute.reason ||
          ISSUE_LABELS[
            issueType
          ] ||
          "",

        description:
          dispute.description ||
          "",

        evidenceUrl:
          dispute.evidenceUrl ||
          "",
      });

      return;
    }

    setFormData(
      getEmptyForm()
    );
  }, [
    mode,
    dispute,
  ]);

  /* =======================================================
     SELECTED ATTENDANCE
  ======================================================= */

  const selectedAttendance =
    attendanceRecords.find(
      (record) =>
        record.id ===
        formData.attendanceId
    ) ||
    dispute?.attendance ||
    null;

  const missingAttendance =
    formData.issueType ===
    "missing_record";

  const needsAttendanceRecord =
    [
      "wrong_status",
      "wrong_checkin_time",
      "approved_absence",
    ].includes(
      formData.issueType
    );

  const optionalAttendanceRecord =
    [
      "biometric_problem",
      "rfid_problem",
      "other",
    ].includes(
      formData.issueType
    );

  const showAttendanceRecord =
    needsAttendanceRecord ||
    optionalAttendanceRecord;

  const showAttendanceDate =
    missingAttendance ||
    (
      optionalAttendanceRecord &&
      !formData.attendanceId
    );

  const showRequestedTime =
    formData.issueType ===
    "wrong_checkin_time";

  /* =======================================================
     FIELD CHANGE
  ======================================================= */

  function updateField(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  /* =======================================================
     ISSUE CHANGE
  ======================================================= */

  function selectIssue(
    event
  ) {
    const issueType =
      event.target.value;

    setFormData(
      (current) => ({
        ...current,

        issueType,

        reason:
          ISSUE_LABELS[
            issueType
          ] ||
          "",

        missingAttendance:
          issueType ===
          "missing_record",

        attendanceId:
          issueType ===
          "missing_record"
            ? ""
            : current.attendanceId,

        attendanceDate:
          issueType ===
          "missing_record"
            ? current.attendanceDate
            : "",

        originalStatus:
          issueType ===
          "missing_record"
            ? "missing"
            : current.originalStatus,

        requestedStatus:
          issueType ===
          "approved_absence"
            ? "excused"
            : current.requestedStatus,

        requestedTime:
          issueType ===
          "wrong_checkin_time"
            ? current.requestedTime
            : "",
      })
    );
  }

  /* =======================================================
     ATTENDANCE CHANGE
  ======================================================= */

  function selectAttendance(
    event
  ) {
    const attendanceId =
      event.target.value;

    const attendance =
      attendanceRecords.find(
        (record) =>
          record.id ===
          attendanceId
      );

    setFormData(
      (current) => ({
        ...current,

        attendanceId,

        originalStatus:
          attendance?.status ||
          "",
      })
    );
  }

  /* =======================================================
     VALIDATION
  ======================================================= */

  const canSubmit =
    Boolean(
      formData.issueType
    ) &&
    (
      !needsAttendanceRecord ||
      Boolean(
        formData.attendanceId
      )
    ) &&
    (
      !showAttendanceDate ||
      Boolean(
        formData.attendanceDate
      )
    ) &&
    (
      !showRequestedTime ||
      Boolean(
        formData.requestedTime
      )
    ) &&
    Boolean(
      formData.description.trim()
    );

  /* =======================================================
     SUBMIT
  ======================================================= */

  function handleSubmit(
    event
  ) {
    event.preventDefault();

    if (
      !canSubmit
    ) {
      return;
    }

    onSubmit({
      ...formData,

      missingAttendance,

      reason:
        ISSUE_LABELS[
          formData.issueType
        ] ||
        formData.reason,

      originalStatus:
        missingAttendance
          ? "missing"
          : selectedAttendance?.status ||
            formData.originalStatus,
    });
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      className="sd-modal-overlay"
      onMouseDown={
        onClose
      }
    >
      <form
        className="sd-modal"
        onSubmit={
          handleSubmit
        }
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div className="sd-modal-header">
          <div>
            <h2>
              {mode === "edit"
                ? "Edit Dispute"
                : "Submit Attendance Dispute"}
            </h2>

            <p>
              Report an attendance issue for
              your teacher to review.
            </p>
          </div>

          <button
            type="button"
            className="sd-modal-close"
            onClick={
              onClose
            }
            disabled={
              saving
            }
          >
            <X size={21} />
          </button>
        </div>

        {/* CONTENT */}

        <div className="sd-modal-content">

          {/* ISSUE */}

          <div className="sd-form-group">
            <label>
              Attendance issue
            </label>

            <select
              value={
                formData.issueType
              }
              onChange={
                selectIssue
              }
              disabled={
                saving ||
                mode === "edit"
              }
              required
            >
              {ISSUE_OPTIONS.map(
                (option) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>

            <small>
              Select the issue that best
              describes your attendance problem.
            </small>
          </div>

          {/* ATTENDANCE RECORD */}

          {showAttendanceRecord && (
            <div className="sd-form-group">
              <label>
                Attendance record

                {optionalAttendanceRecord && (
                  <span>
                    {" "}
                    (optional)
                  </span>
                )}
              </label>

              <select
                value={
                  formData.attendanceId
                }
                onChange={
                  selectAttendance
                }
                disabled={
                  saving ||
                  mode === "edit"
                }
                required={
                  needsAttendanceRecord
                }
              >
                <option value="">
                  {needsAttendanceRecord
                    ? "Select an attendance record"
                    : "Select a record if available"}
                </option>

                {attendanceRecords.map(
                  (record) => (
                    <option
                      key={
                        record.id
                      }
                      value={
                        record.id
                      }
                    >
                      {formatAttendanceOption(
                        record
                      )}
                    </option>
                  )
                )}
              </select>

              {needsAttendanceRecord &&
                attendanceRecords.length ===
                  0 && (
                  <small className="sd-warning-text">
                    No attendance record was
                    found. Select "Missing
                    attendance record" instead
                    if no record exists.
                  </small>
                )}
            </div>
          )}

          {/* ATTENDANCE PREVIEW */}

          {selectedAttendance &&
            formData.attendanceId && (
              <div className="sd-attendance-preview">
                <div>
                  <Calendar
                    size={16}
                  />

                  <span>
                    <small>
                      Date
                    </small>

                    <strong>
                      {selectedAttendance.dateLabel ||
                        "N/A"}
                    </strong>
                  </span>
                </div>

                <div>
                  <Clock3
                    size={16}
                  />

                  <span>
                    <small>
                      Time
                    </small>

                    <strong>
                      {selectedAttendance.timeLabel ||
                        "N/A"}
                    </strong>
                  </span>
                </div>

                <div>
                  <ShieldCheck
                    size={16}
                  />

                  <span>
                    <small>
                      Status
                    </small>

                    <strong>
                      {selectedAttendance.status ||
                        "N/A"}
                    </strong>
                  </span>
                </div>

                <div>
                  <Cpu
                    size={16}
                  />

                  <span>
                    <small>
                      Method
                    </small>

                    <strong>
                      {selectedAttendance.authMethod ||
                        "N/A"}
                    </strong>
                  </span>
                </div>
              </div>
            )}

          {/* DATE */}

          {showAttendanceDate && (
            <div className="sd-form-group">
              <label>
                Attendance date
              </label>

              <input
                type="date"
                name="attendanceDate"
                value={
                  formData.attendanceDate
                }
                onChange={
                  updateField
                }
                disabled={
                  saving
                }
                required
              />

              <small>
                Select the date when the attendance
                problem occurred.
              </small>
            </div>
          )}

          {/* REQUESTED STATUS */}

          {formData.issueType &&
            !showRequestedTime && (
              <div className="sd-form-group">
                <label>
                  {missingAttendance
                    ? "Expected attendance status"
                    : "Requested correction"}
                </label>

                <select
                  name="requestedStatus"
                  value={
                    formData.requestedStatus
                  }
                  onChange={
                    updateField
                  }
                  disabled={
                    saving ||
                    formData.issueType ===
                      "approved_absence"
                  }
                  required
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
            )}

          {/* CORRECT TIME */}

          {showRequestedTime && (
            <div className="sd-form-group">
              <label>
                Correct check-in time
              </label>

              <input
                type="time"
                name="requestedTime"
                value={
                  formData.requestedTime
                }
                onChange={
                  updateField
                }
                disabled={
                  saving
                }
                required
              />
            </div>
          )}

          {/* EXPLANATION */}

          {formData.issueType && (
            <>
              <div className="sd-form-group">
                <label>
                  Explanation
                </label>

                <div className="sd-input-icon">
                  <MessageSquare
                    size={17}
                  />

                  <textarea
                    name="description"
                    rows="5"
                    value={
                      formData.description
                    }
                    onChange={
                      updateField
                    }
                    disabled={
                      saving
                    }
                    placeholder="Explain what happened and why this attendance information should be reviewed."
                    required
                  />
                </div>
              </div>

              {/* EVIDENCE */}

              <div className="sd-form-group">
                <label>
                  Evidence link{" "}
                  <span>
                    (optional)
                  </span>
                </label>

                <div className="sd-input-icon sd-input-single">
                  <LinkIcon
                    size={17}
                  />

                  <input
                    name="evidenceUrl"
                    type="url"
                    value={
                      formData.evidenceUrl
                    }
                    onChange={
                      updateField
                    }
                    disabled={
                      saving
                    }
                    placeholder="https://drive.google.com/..."
                  />
                </div>

                <small>
                  Add a screenshot, medical
                  certificate or supporting
                  document if necessary.
                </small>
              </div>

              {/* WARNING */}

              <div className="sd-form-notice">
                <FileText
                  size={18}
                />

                <p>
                  Review all information before
                  submitting. False information
                  may result in disciplinary
                  action.
                </p>
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}

        <div className="sd-modal-footer">
          <button
            type="button"
            className="sd-btn sd-btn-secondary"
            onClick={
              onClose
            }
            disabled={
              saving
            }
          >
            Cancel
          </button>

          <button
            type="submit"
            className="sd-btn sd-btn-primary"
            disabled={
              saving ||
              !canSubmit
            }
          >
            {saving
              ? "Saving..."
              : mode === "edit"
                ? "Save Changes"
                : "Submit Dispute"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default StudentDisputeModal;