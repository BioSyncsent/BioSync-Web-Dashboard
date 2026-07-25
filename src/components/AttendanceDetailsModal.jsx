import { X, Calendar, Clock, User, Mail, IdCard, CheckCircle } from "lucide-react";
import StatusBadge from "./StatusBadge";
import "./AttendanceDetailsModal.css";

// Safely convert Firestore Timestamp / string / number / null into a JS Date
function toSafeDate(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === "function") return timestamp.toDate(); // Firestore Timestamp
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
}

function AttendanceDetailsModal({ record, user, onClose }) {
  const date = toSafeDate(record.timestamp);
  const dateStr = date
    ? date.toLocaleDateString("en-MY", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";
  const timeStr = date ? date.toLocaleTimeString("en-MY") : "N/A";
  const recordedAtStr = date ? date.toLocaleString("en-MY") : "N/A";

  return (
    <div className="bs-modal-overlay" onClick={onClose}>
      <div className="bs-modal bs-modal-lg" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="bs-modal-header">
          <h2 className="bs-modal-title">Attendance Details</h2>
          <button
            onClick={onClose}
            className="bs-modal-close"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="bs-modal-content">
          {/* Student Info Section */}
          <div className="bs-modal-section">
            <h3 className="bs-modal-section-title">Student Information</h3>
            <div className="bs-detail-grid">
              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <User size={16} />
                  Name
                </div>
                <div className="bs-detail-value">
                  {user
                    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                    : "Unknown"}
                </div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <IdCard size={16} />
                  Student ID
                </div>
                <div className="bs-detail-value">
                  {user?.studentId || "N/A"}
                </div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <Mail size={16} />
                  Email
                </div>
                <div className="bs-detail-value">
                  {user?.email || "N/A"}
                </div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <span>📚</span>
                  Course
                </div>
                <div className="bs-detail-value">
                  {user?.course || "N/A"}
                </div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <span>🏢</span>
                  Department
                </div>
                <div className="bs-detail-value">
                  {user?.department || "N/A"}
                </div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <span>📞</span>
                  Phone
                </div>
                <div className="bs-detail-value">
                  {user?.phoneNum || "N/A"}
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Info Section */}
          <div className="bs-modal-section">
            <h3 className="bs-modal-section-title">Attendance Information</h3>
            <div className="bs-detail-grid">
              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <Calendar size={16} />
                  Date
                </div>
                <div className="bs-detail-value">{dateStr}</div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <Clock size={16} />
                  Time
                </div>
                <div className="bs-detail-value">{timeStr}</div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <CheckCircle size={16} />
                  Status
                </div>
                <div className="bs-detail-value">
                  <StatusBadge status={record.status} />
                </div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <span>🔐</span>
                  Auth Method
                </div>
                <div className="bs-detail-value bs-capitalize">
                  {record.authMethod || "N/A"}
                </div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <span>📱</span>
                  Device ID
                </div>
                <div className="bs-detail-value bs-mono">
                  {record.deviceId || "N/A"}
                </div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <span>✓</span>
                  Verification
                </div>
                <div className="bs-detail-value">
                  <span
                    className={`bs-badge ${
                      record.status === "present"
                        ? "bs-badge-success"
                        : "bs-badge-warning"
                    }`}
                  >
                    {record.status === "present" ? "Verified" : "Flagged"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Biometric Info Section */}
          {(record.fingerprint || record.face) && (
            <div className="bs-modal-section">
              <h3 className="bs-modal-section-title">
                Biometric Verification
              </h3>
              <div className="bs-detail-grid">
                {record.fingerprint && (
                  <div className="bs-detail-item">
                    <div className="bs-detail-label">
                      <span>👆</span>
                      Fingerprint
                    </div>
                    <div className="bs-detail-value">
                      <span className="bs-badge bs-badge-success">
                        Verified
                      </span>
                    </div>
                  </div>
                )}

                {record.face && (
                  <div className="bs-detail-item">
                    <div className="bs-detail-label">
                      <span>👤</span>
                      Face Recognition
                    </div>
                    <div className="bs-detail-value">
                      <span className="bs-badge bs-badge-success">
                        Verified
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Details */}
          <div className="bs-modal-section bs-modal-section-last">
            <h3 className="bs-modal-section-title">Record Information</h3>
            <div className="bs-detail-grid">
              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <span>🆔</span>
                  Record ID
                </div>
                <div className="bs-detail-value bs-mono bs-text-sm">
                  {record.id || "N/A"}
                </div>
              </div>

              <div className="bs-detail-item">
                <div className="bs-detail-label">
                  <span>⏰</span>
                  Recorded At
                </div>
                <div className="bs-detail-value bs-text-sm">
                  {recordedAtStr}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bs-modal-footer">
          <button onClick={onClose} className="bs-btn bs-btn-primary bs-btn-lg">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AttendanceDetailsModal;