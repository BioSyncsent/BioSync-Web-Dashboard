import { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import {
  Search,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
} from "lucide-react";
import SummaryCard from "../../components/SummaryCard";
import StatusBadge from "../../components/StatusBadge";
import AttendanceDetailsModal from "../../components/AttendanceDetailsModal";
import "./Attendance.css";

// Safely convert Firestore Timestamp / string / number / null into a JS Date
function toSafeDate(timestamp) {
  if (!timestamp) return null;
  if (typeof timestamp.toDate === "function") return timestamp.toDate();
  const d = new Date(timestamp);
  return isNaN(d.getTime()) ? null : d;
}

function StudentAttendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedModal, setSelectedModal] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAuthMethod, setSelectedAuthMethod] = useState("all");

  // Get unique auth methods from this student's own attendance
  const authMethods = useMemo(() => {
    const unique = new Set(attendanceData.map((a) => a.authMethod).filter(Boolean));
    return Array.from(unique).sort();
  }, [attendanceData]);

  // Fetch only this student's attendance records
  useEffect(() => {
    if (!user?.uid) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const q = query(
          collection(db, "attendance"),
          where("userId", "==", user.uid)
        );
        const attendanceSnap = await getDocs(q);
        const attendanceRecords = attendanceSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort newest first
        attendanceRecords.sort((a, b) => {
          const da = toSafeDate(a.timestamp)?.getTime() || 0;
          const dbb = toSafeDate(b.timestamp)?.getTime() || 0;
          return dbb - da;
        });

        setAttendanceData(attendanceRecords);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]);

  // Filter attendance data
  const filteredRecords = useMemo(() => {
    return attendanceData.filter((record) => {
      // Search filter (auth method only, since it's just this student's own records)
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        record.authMethod?.toLowerCase().includes(searchLower) ||
        record.status?.toLowerCase().includes(searchLower);

      // Date filter
      const recordDateObj = toSafeDate(record.timestamp);
      const recordDate = recordDateObj
        ? recordDateObj.toISOString().split("T")[0]
        : null;
      const matchesDate = !selectedDate || recordDate === selectedDate;

      // Status filter
      const matchesStatus =
        selectedStatus === "all" || record.status === selectedStatus;

      // Auth method filter
      const matchesAuthMethod =
        selectedAuthMethod === "all" || record.authMethod === selectedAuthMethod;

      return matchesSearch && matchesDate && matchesStatus && matchesAuthMethod;
    });
  }, [attendanceData, searchTerm, selectedDate, selectedStatus, selectedAuthMethod]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === "present").length;
    const late = filteredRecords.filter((r) => r.status === "late").length;
    const absent = filteredRecords.filter((r) => r.status === "absent").length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    return { total, present, late, absent, percentage };
  }, [filteredRecords]);

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
            View your personal attendance records
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

      {/* Filters Section */}
      <div className="bs-card bs-filters-card">
        <div className="bs-filters-container">
          {/* Search Bar */}
          <div className="bs-search-box bs-search-lg">
            <Search size={18} className="bs-search-icon" />
            <input
              type="text"
              placeholder="Search by status or auth method..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bs-search-input"
            />
          </div>

          {/* Filters Grid */}
          <div className="bs-filters-grid">
            {/* Date Filter */}
            <div className="bs-filter-group">
              <label className="bs-filter-label">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bs-filter-select"
              />
            </div>

            {/* Status Filter */}
            <div className="bs-filter-group">
              <label className="bs-filter-label">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bs-filter-select"
              >
                <option value="all">All Status</option>
                <option value="present">Present</option>
                <option value="late">Late</option>
                <option value="absent">Absent</option>
              </select>
            </div>

            {/* Auth Method Filter */}
            <div className="bs-filter-group">
              <label className="bs-filter-label">Auth Method</label>
              <select
                value={selectedAuthMethod}
                onChange={(e) => setSelectedAuthMethod(e.target.value)}
                className="bs-filter-select"
              >
                <option value="all">All Methods</option>
                {authMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
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
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="5" className="bs-table-empty">
                    <div className="bs-empty-state">
                      <XCircle size={48} />
                      <p>No attendance records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const date = toSafeDate(record.timestamp);
                  const dateStr = date ? date.toLocaleDateString("en-MY") : "N/A";
                  const timeStr = date ? date.toLocaleTimeString("en-MY") : "N/A";

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