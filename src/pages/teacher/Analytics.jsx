import { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import {
  Search,
  Download,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
} from "lucide-react";
import SummaryCard from "../../components/SummaryCard";
import StatusBadge from "../../components/StatusBadge";
import AttendanceDetailsModal from "../../components/AttendanceDetailsModal";
import { exportToCSV, exportToPDF } from "../../utils/exportAttendance";
import "./Attendance.css";

function TeacherAttendance() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [usersData, setUsersData] = useState({});
  const [selectedModal, setSelectedModal] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedAuthMethod, setSelectedAuthMethod] = useState("all");

  // Get unique auth methods from teacher's attendance
  const authMethods = useMemo(() => {
    const teacherRecords = attendanceData.filter((record) => {
      const userData = usersData[record.userId];
      return userData?.role === "student";
    });
    const unique = new Set(
      teacherRecords.map((a) => a.authMethod).filter(Boolean)
    );
    return Array.from(unique).sort();
  }, [attendanceData, usersData]);

  // Fetch attendance and users data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch attendance
        const attendanceSnap = await getDocs(collection(db, "attendance"));
        const attendanceRecords = attendanceSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Fetch users
        const usersSnap = await getDocs(collection(db, "users"));
        const usersMap = {};
        usersSnap.docs.forEach((doc) => {
          usersMap[doc.id] = { uid: doc.id, ...doc.data() };
        });

        setAttendanceData(attendanceRecords);
        setUsersData(usersMap);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter attendance data - only for students (not admin/teacher records)
  const filteredRecords = useMemo(() => {
    return attendanceData
      .map((record) => {
        const userData = usersData[record.userId];
        return {
          ...record,
          studentName: userData
            ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim()
            : "Unknown",
          studentId: userData?.studentId || "N/A",
          course: userData?.course || "N/A",
          email: userData?.email || "",
          role: userData?.role || "unknown",
        };
      })
      .filter((record) => {
        // Only show student attendance records
        if (record.role !== "student") {
          return false;
        }

        // Search filter
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm ||
          record.studentName.toLowerCase().includes(searchLower) ||
          record.studentId.toLowerCase().includes(searchLower) ||
          record.email.toLowerCase().includes(searchLower) ||
          record.authMethod?.toLowerCase().includes(searchLower);

        // Date filter
        const recordDate = new Date(record.timestamp)
          .toISOString()
          .split("T")[0];
        const matchesDate =
          !selectedDate ||
          recordDate === selectedDate;

        // Status filter
        const matchesStatus =
          selectedStatus === "all" || record.status === selectedStatus;

        // Auth method filter
        const matchesAuthMethod =
          selectedAuthMethod === "all" ||
          record.authMethod === selectedAuthMethod;

        return (
          matchesSearch &&
          matchesDate &&
          matchesStatus &&
          matchesAuthMethod
        );
      });
  }, [
    attendanceData,
    usersData,
    searchTerm,
    selectedDate,
    selectedStatus,
    selectedAuthMethod,
  ]);

  // Calculate summary stats
  const summary = useMemo(() => {
    const total = filteredRecords.length;
    const present = filteredRecords.filter((r) => r.status === "present").length;
    const late = filteredRecords.filter((r) => r.status === "late").length;
    const absent = filteredRecords.filter((r) => r.status === "absent").length;
    const percentage = total > 0 ? ((present / total) * 100).toFixed(1) : 0;

    return { total, present, late, absent, percentage };
  }, [filteredRecords]);

  const handleExport = (format) => {
    if (format === "csv") {
      exportToCSV(filteredRecords, "student-attendance");
    } else if (format === "pdf") {
      exportToPDF(filteredRecords, "Student Attendance Report");
    }
  };

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
          <h1 className="bs-page-title">Student Attendance</h1>
          <p className="bs-page-subtitle">
            Track and manage your students' attendance records
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
              placeholder="Search by name, ID, or email..."
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

            {/* Export Buttons */}
            <div className="bs-filter-group bs-export-group">
              <label className="bs-filter-label">Export</label>
              <div className="bs-button-group">
                <button
                  onClick={() => handleExport("csv")}
                  className="bs-btn bs-btn-secondary bs-btn-sm"
                  title="Export as CSV"
                >
                  <Download size={16} />
                  CSV
                </button>
                <button
                  onClick={() => handleExport("pdf")}
                  className="bs-btn bs-btn-secondary bs-btn-sm"
                  title="Export as PDF"
                >
                  <Download size={16} />
                  PDF
                </button>
              </div>
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
                <th>Student Name</th>
                <th>Student ID</th>
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
                  <td colSpan="7" className="bs-table-empty">
                    <div className="bs-empty-state">
                      <XCircle size={48} />
                      <p>No attendance records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => {
                  const date = new Date(record.timestamp);
                  const dateStr = date.toLocaleDateString("en-MY");
                  const timeStr = date.toLocaleTimeString("en-MY");

                  return (
                    <tr key={record.id} className="bs-table-row">
                      <td className="bs-table-name">
                        <span className="bs-avatar-small">
                          {record.studentName.charAt(0).toUpperCase()}
                        </span>
                        {record.studentName}
                      </td>
                      <td>{record.studentId}</td>
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
          user={usersData[selectedModal.userId]}
          onClose={() => setSelectedModal(null)}
        />
      )}
    </div>
  );
}

export default TeacherAttendance;