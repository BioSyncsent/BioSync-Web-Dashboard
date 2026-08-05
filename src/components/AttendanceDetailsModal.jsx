import {
  Calendar,
  CheckCircle,
  Clock,
  Cpu,
  Fingerprint,
  IdCard,
  Mail,
  MapPin,
  ScanFace,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import StatusBadge from "./StatusBadge";
import "./AttendanceDetailsModal.css";

function formatDate(date) {
  if (!date) return "N/A";

  return date.toLocaleDateString("en-MY", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date) {
  if (!date) return "N/A";

  return date.toLocaleTimeString("en-MY");
}

function displayValue(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "N/A";
  }

  return String(value);
}

function verificationBadge(result) {
  const normalized = String(
    result || "unknown"
  ).toLowerCase();

  let className =
    "bs-badge bs-badge-warning";

  if (
    normalized === "verified" ||
    normalized === "success"
  ) {
    className =
      "bs-badge bs-badge-success";
  } else if (
    normalized === "failed" ||
    normalized === "rejected"
  ) {
    className =
      "bs-badge bs-badge-danger";
  } else if (normalized === "manual") {
    className =
      "bs-badge bs-badge-info";
  }

  return (
    <span className={className}>
      {normalized}
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
    <div className="bs-detail-item">
      <div className="bs-detail-label">
        {Icon && <Icon size={16} />}
        {label}
      </div>

      <div
        className={`bs-detail-value ${
          mono ? "bs-mono" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function AttendanceDetailsModal({
  record,
  onClose,
}) {
  return (
    <div
      className="bs-modal-overlay"
      onMouseDown={onClose}
    >
      <div
        className="bs-modal bs-modal-xl"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="bs-modal-header">
          <div>
            <h2 className="bs-modal-title">
              Attendance Details
            </h2>

            <p className="bs-modal-subtitle">
              Complete attendance,
              authentication and security
              information.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="bs-modal-close"
            aria-label="Close"
          >
            <X size={23} />
          </button>
        </div>

        <div className="bs-modal-content">
          <div className="bs-modal-profile">
            <span className="bs-modal-profile-avatar">
              {record.studentName
                ?.charAt(0)
                .toUpperCase() || "U"}
            </span>

            <div>
              <strong>
                {record.studentName}
              </strong>

              <span>
                {record.studentId} ·{" "}
                {record.course}
              </span>
            </div>

            <StatusBadge
              status={record.status}
            />
          </div>

          <section className="bs-modal-section">
            <h3 className="bs-modal-section-title">
              Student Information
            </h3>

            <div className="bs-detail-grid">
              <DetailItem
                icon={User}
                label="Student Name"
              >
                {displayValue(
                  record.studentName
                )}
              </DetailItem>

              <DetailItem
                icon={IdCard}
                label="Student ID"
              >
                {displayValue(
                  record.studentId
                )}
              </DetailItem>

              <DetailItem
                icon={Mail}
                label="Email"
              >
                {displayValue(record.email)}
              </DetailItem>

              <DetailItem label="Course">
                {displayValue(record.course)}
              </DetailItem>

              <DetailItem label="Department">
                {displayValue(
                  record.department
                )}
              </DetailItem>

              <DetailItem label="Intake">
                {displayValue(record.intake)}
              </DetailItem>
            </div>
          </section>

          <section className="bs-modal-section">
            <h3 className="bs-modal-section-title">
              Attendance Information
            </h3>

            <div className="bs-detail-grid">
              <DetailItem
                icon={Calendar}
                label="Date"
              >
                {formatDate(
                  record.timestamp
                )}
              </DetailItem>

              <DetailItem
                icon={Clock}
                label="Time"
              >
                {formatTime(
                  record.timestamp
                )}
              </DetailItem>

              <DetailItem
                icon={CheckCircle}
                label="Status"
              >
                <StatusBadge
                  status={record.status}
                />
              </DetailItem>

              <DetailItem
                icon={ShieldCheck}
                label="Authentication Method"
              >
                {displayValue(
                  record.authMethod
                )}
              </DetailItem>

              <DetailItem label="Source">
                {displayValue(record.source)}
              </DetailItem>

              <DetailItem label="Notes">
                {displayValue(record.notes)}
              </DetailItem>
            </div>
          </section>

          <section className="bs-modal-section">
            <h3 className="bs-modal-section-title">
              Device and Location
            </h3>

            <div className="bs-detail-grid">
              <DetailItem
                icon={Cpu}
                label="Device ID"
                mono
              >
                {displayValue(
                  record.deviceId
                )}
              </DetailItem>

              <DetailItem
                icon={Cpu}
                label="Device Name"
              >
                {displayValue(
                  record.deviceName
                )}
              </DetailItem>

              <DetailItem
                icon={MapPin}
                label="Location / Terminal"
              >
                {displayValue(
                  record.location
                )}
              </DetailItem>

              <DetailItem
                icon={IdCard}
                label="RFID Card ID"
                mono
              >
                {displayValue(
                  record.rfidCardId
                )}
              </DetailItem>
            </div>
          </section>

          <section className="bs-modal-section">
            <h3 className="bs-modal-section-title">
              Biometric Verification
            </h3>

            <div className="bs-detail-grid">
              <DetailItem
                icon={ScanFace}
                label="Face Confidence"
              >
                {record.faceConfidence !=
                null
                  ? `${record.faceConfidence}%`
                  : "N/A"}
              </DetailItem>

              <DetailItem
                icon={ScanFace}
                label="Liveness Result"
              >
                {displayValue(
                  record.livenessResult
                )}
              </DetailItem>

              <DetailItem
                icon={Fingerprint}
                label="Fingerprint Result"
              >
                {displayValue(
                  record.fingerprintResult
                )}
              </DetailItem>

              <DetailItem
                icon={ShieldCheck}
                label="Verification Result"
              >
                {verificationBadge(
                  record.verificationResult
                )}
              </DetailItem>

              <DetailItem label="Verification Attempts">
                {displayValue(
                  record.verificationAttempts
                )}
              </DetailItem>
            </div>
          </section>

          <section className="bs-modal-section bs-modal-section-last">
            <h3 className="bs-modal-section-title">
              Audit Information
            </h3>

            <div className="bs-detail-grid">
              <DetailItem
                label="Attendance Record ID"
                mono
              >
                {displayValue(record.id)}
              </DetailItem>

              <DetailItem
                label="User Document ID"
                mono
              >
                {displayValue(
                  record.userId
                )}
              </DetailItem>

              <DetailItem label="Created At">
                {record.createdAt
                  ? record.createdAt.toLocaleString(
                      "en-MY"
                    )
                  : "N/A"}
              </DetailItem>

              <DetailItem label="Updated At">
                {record.updatedAt
                  ? record.updatedAt.toLocaleString(
                      "en-MY"
                    )
                  : "N/A"}
              </DetailItem>

              <DetailItem
                label="Created By"
                mono
              >
                {displayValue(
                  record.createdBy
                )}
              </DetailItem>

              <DetailItem
                label="Updated By"
                mono
              >
                {displayValue(
                  record.updatedBy
                )}
              </DetailItem>

              <DetailItem
                label="Related Dispute"
                mono
              >
                {displayValue(
                  record.relatedDisputeId
                )}
              </DetailItem>
            </div>
          </section>
        </div>

        <div className="bs-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="bs-btn bs-btn-primary bs-btn-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttendanceDetailsModal;