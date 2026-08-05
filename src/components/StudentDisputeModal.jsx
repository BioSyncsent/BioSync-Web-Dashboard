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

function getEmptyForm() {
  return {
    attendanceId: "",
    originalStatus: "",
    requestedStatus: "present",
    reason: "",
    description: "",
    evidenceUrl: "",
  };
}

function formatAttendanceOption(record) {
  return `${record.dateLabel} · ${
    record.timeLabel
  } · ${record.status} · ${
    record.authMethod
  }`;
}

function StudentDisputeModal({
  mode = "create",
  dispute = null,
  attendanceRecords = [],
  saving = false,
  onClose,
  onSubmit,
}) {
  const [formData, setFormData] =
    useState(getEmptyForm());

  useEffect(() => {
    if (mode === "edit" && dispute) {
      setFormData({
        attendanceId:
          dispute.attendanceId ||
          "",

        originalStatus:
          dispute.attendance?.status ||
          dispute.raw?.originalStatus ||
          "",

        requestedStatus:
          dispute.requestedStatus ||
          "present",

        reason:
          dispute.reason ||
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

    setFormData(getEmptyForm());
  }, [mode, dispute]);

  const selectedAttendance =
    attendanceRecords.find(
      (record) =>
        record.id ===
        formData.attendanceId
    ) ||
    dispute?.attendance ||
    null;

  function updateField(event) {
    const { name, value } =
      event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function selectAttendance(event) {
    const attendanceId =
      event.target.value;

    const attendance =
      attendanceRecords.find(
        (record) =>
          record.id === attendanceId
      );

    setFormData((current) => ({
      ...current,

      attendanceId,

      originalStatus:
        attendance?.status ||
        "",
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    onSubmit({
      ...formData,

      originalStatus:
        selectedAttendance?.status ||
        formData.originalStatus,
    });
  }

  return (
    <div
      className="sd-modal-overlay"
      onMouseDown={onClose}
    >
      <form
        className="sd-modal"
        onSubmit={handleSubmit}
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="sd-modal-header">
          <div>
            <h2>
              {mode === "edit"
                ? "Edit Dispute"
                : "Submit Attendance Dispute"}
            </h2>

            <p>
              Explain which attendance record
              is incorrect and request a
              correction.
            </p>
          </div>

          <button
            type="button"
            className="sd-modal-close"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={21} />
          </button>
        </div>

        <div className="sd-modal-content">
          <div className="sd-form-group">
            <label htmlFor="attendanceId">
              Attendance record
            </label>

            <select
              id="attendanceId"
              name="attendanceId"
              value={
                formData.attendanceId
              }
              onChange={selectAttendance}
              disabled={
                saving ||
                mode === "edit"
              }
              required
            >
              <option value="">
                Select an attendance record
              </option>

              {attendanceRecords.map(
                (record) => (
                  <option
                    key={record.id}
                    value={record.id}
                  >
                    {formatAttendanceOption(
                      record
                    )}
                  </option>
                )
              )}
            </select>

            {attendanceRecords.length ===
              0 && (
              <small className="sd-warning-text">
                No attendance record is linked
                to your account. New attendance
                documents should include your
                Firebase userId.
              </small>
            )}
          </div>

          {selectedAttendance && (
            <div className="sd-attendance-preview">
              <div>
                <Calendar size={16} />

                <span>
                  <small>Date</small>
                  <strong>
                    {selectedAttendance.dateLabel ||
                      "N/A"}
                  </strong>
                </span>
              </div>

              <div>
                <Clock3 size={16} />

                <span>
                  <small>Time</small>
                  <strong>
                    {selectedAttendance.timeLabel ||
                      "N/A"}
                  </strong>
                </span>
              </div>

              <div>
                <ShieldCheck size={16} />

                <span>
                  <small>
                    Original Status
                  </small>
                  <strong>
                    {selectedAttendance.status ||
                      "N/A"}
                  </strong>
                </span>
              </div>

              <div>
                <Cpu size={16} />

                <span>
                  <small>Method</small>
                  <strong>
                    {selectedAttendance.authMethod ||
                      "N/A"}
                  </strong>
                </span>
              </div>
            </div>
          )}

          <div className="sd-form-grid">
            <div className="sd-form-group">
              <label htmlFor="requestedStatus">
                Requested correction
              </label>

              <select
                id="requestedStatus"
                name="requestedStatus"
                value={
                  formData.requestedStatus
                }
                onChange={updateField}
                disabled={saving}
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

            <div className="sd-form-group">
              <label htmlFor="reason">
                Reason
              </label>

              <select
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={updateField}
                disabled={saving}
                required
              >
                <option value="">
                  Select a reason
                </option>

                <option value="Incorrect attendance status">
                  Incorrect attendance status
                </option>

                <option value="Face recognition failed">
                  Face recognition failed
                </option>

                <option value="Fingerprint verification failed">
                  Fingerprint verification
                  failed
                </option>

                <option value="RFID card was not detected">
                  RFID card was not detected
                </option>

                <option value="Device or system error">
                  Device or system error
                </option>

                <option value="Approved absence or medical reason">
                  Approved absence or medical
                  reason
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>
          </div>

          <div className="sd-form-group">
            <label htmlFor="description">
              Explanation
            </label>

            <div className="sd-input-icon">
              <MessageSquare size={17} />

              <textarea
                id="description"
                name="description"
                rows="5"
                value={
                  formData.description
                }
                onChange={updateField}
                disabled={saving}
                placeholder="Explain what happened and why the attendance record should be corrected."
                required
              />
            </div>
          </div>

          <div className="sd-form-group">
            <label htmlFor="evidenceUrl">
              Evidence link{" "}
              <span>(optional)</span>
            </label>

            <div className="sd-input-icon sd-input-single">
              <LinkIcon size={17} />

              <input
                id="evidenceUrl"
                name="evidenceUrl"
                type="url"
                value={
                  formData.evidenceUrl
                }
                onChange={updateField}
                disabled={saving}
                placeholder="https://drive.google.com/..."
              />
            </div>

            <small>
              Paste a link to a screenshot,
              medical certificate, PDF, or
              supporting document.
            </small>
          </div>

          <div className="sd-form-notice">
            <FileText size={18} />

            <p>
              Submitting false information may
              result in disciplinary action.
              Review all information before
              submitting.
            </p>
          </div>
        </div>

        <div className="sd-modal-footer">
          <button
            type="button"
            className="sd-btn sd-btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="submit"
            className="sd-btn sd-btn-primary"
            disabled={
              saving ||
              !formData.attendanceId
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