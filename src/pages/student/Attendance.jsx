import { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import {
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
  Users,
} from "lucide-react";
import SummaryCard from "../../components/SummaryCard";
import StatusBadge from "../../components/attendance/StatusBadge";
import AttendanceDetailsModal from "../../components/AttendanceDetailsModal";
import "./Attendance.css";

function StudentAttendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedModal, setSelectedModal] = useState(null);

  // Fetch student's own attendance data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        if (!user?.uid) return;

        // Fetch only this student's attendance records
        const attendanceSnap = await getDocs(collection(db, "attendance"));
        const studentRecords = attendanceSnap.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter((record) => record.userId === user.uid);

        setAttendanceData(studentRecords);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  // Sort records by date (newest first)
  const sortedRecords = useMemo(() => {
    return [...attendanceData].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
  }, [attendanceData]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const total = sortedRecords.length;
    const present = sortedRecords.filter((r) => r.status === "present").length;
    const late = sortedRecords.filter((r) => r.status === "late").length;
    const absent = sortedRecords.filter((r) => r.status === "absent").length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    return { total, present, late, absent, percentage };
  }, [sortedRecords]);

  if (loading) {
    return (
      <div className="bs-page bs-loading-state">
        <div className="bs-skeleton-loader">
          <div className="bs-skeleton bs-skeleton-line" />
          <div className="bs-skeleton bs-skeleton-line" />
          <div className="bs-skeleton bs-skeleton-line" />
        </div>
      </div>
    );
  }

  return (
    <div className="bs-page bs-attendance-page">
      {/* Header */}
      <div className="bs-page-header">
        <div>
          <h1 className="bs-page-title">My Attendance</h1>
          <p className="bs-page-subtitle">
            View your personal attendance history
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bs-summary-grid">
        <SummaryCard
          icon={Users}
          label="Total Records"
          value={summary.total}
          tone="primary"
        />
        <SummaryCard
          icon={CheckCircle}
          label="Present"
          value={summary.present}
          tone="success"
        />
        <SummaryCard
          icon={Clock}
          label="Late"
          value={summary.late}
          tone="warning"
        />
        <SummaryCard
          icon={XCircle}
          label="Absent"
          value={summary.absent}
          tone="danger"
        />
        <SummaryCard
          icon={BarChart3}
          label="Attendance %"
          value={`${summary.percentage}%`}
          tone="info"
        />
      </div>

      {/* Attendance Table */}
      <div className="bs-card bs-table-card">
        <div className="bs-table-scroll">
          <table className="bs-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>Auth Method</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" className="bs-table-empty">
                    <div className="bs-empty-state">
                      <XCircle size={48} />
                      <p>No attendance records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedRecords.map((record) => {
                  const date = new Date(record.timestamp);
                  const dateStr = date.toLocaleDateString("en-MY", {
                    weekday: "short",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                  const timeStr = date.toLocaleTimeString("en-MY");

                  return (
                    <tr key={record.id} className="bs-table-row">
                      <td>{dateStr}</td>
                      <td>{timeStr}</td>
                      <td>
                        <StatusBadge status={record.status} />
                      </td>
                      <td>
                        <span className="bs-badge bs-badge-method">
                          {record.authMethod}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedModal(record)}
                          className="bs-btn-icon bs-btn-view"
                          title="View Details"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Card */}
      {sortedRecords.length > 0 && (
        <div className="bs-card bs-info-card">
          <div className="bs-info-content">
            <div className="bs-info-icon">ℹ️</div>
            <div className="bs-info-text">
              <p className="bs-info-title">About Your Attendance</p>
              <p className="bs-info-description">
                Your attendance is automatically tracked through biometric
                authentication. Each check-in is recorded with a timestamp and
                authentication method. If you believe there's an error, please
                submit a dispute.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {selectedModal && (
        <AttendanceDetailsModal
          record={selectedModal}
          user={user}
          onClose={() => setSelectedModal(null)}
        />
      )}
    </div>
  );
}

export default StudentAttendance;