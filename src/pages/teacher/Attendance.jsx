import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  BarChart3,
  CheckCircle,
  Clock,
  Download,
  Eye,
  GraduationCap,
  Search,
  ShieldCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";

import SummaryCard from "../../components/SummaryCard";
import StatusBadge from "../../components/StatusBadge";
import AttendanceDetailsModal from "../../components/AttendanceDetailsModal";

import {
  exportToCSV,
  exportToPDF,
} from "../../utils/exportAttendance";

import "./Attendance.css";

function TeacherAttendance() {
  const { user } = useAuth();

  const [loading, setLoading] =
    useState(true);

  const [
    attendanceData,
    setAttendanceData,
  ] = useState([]);

  const [
    usersData,
    setUsersData,
  ] = useState({});

  const [
    selectedModal,
    setSelectedModal,
  ] = useState(null);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(
    new Date()
      .toISOString()
      .split("T")[0]
  );

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState("all");

  const [
    selectedAuthMethod,
    setSelectedAuthMethod,
  ] = useState("all");

  useEffect(() => {
    async function fetchData() {
      if (!user?.department) {
        setAttendanceData([]);
        setUsersData({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const studentQuery =
          query(
            collection(
              db,
              "users"
            ),
            where(
              "department",
              "==",
              user.department
            ),
            where(
              "role",
              "==",
              "student"
            )
          );

        const usersSnapshot =
          await getDocs(
            studentQuery
          );

        const students = {};

        usersSnapshot.docs.forEach(
          (document) => {
            students[
              document.id
            ] = {
              uid:
                document.id,
              ...document.data(),
            };
          }
        );

        const attendanceResults =
          await Promise.all(
            Object.keys(
              students
            ).map(
              async (
                studentId
              ) => {
                const attendanceQuery =
                  query(
                    collection(
                      db,
                      "attendance"
                    ),
                    where(
                      "userId",
                      "==",
                      studentId
                    )
                  );

                const snapshot =
                  await getDocs(
                    attendanceQuery
                  );

                return snapshot.docs.map(
                  (
                    document
                  ) => ({
                    id:
                      document.id,
                    ...document.data(),
                  })
                );
              }
            )
          );

        setUsersData(
          students
        );

        setAttendanceData(
          attendanceResults.flat()
        );
      } catch (error) {
        console.error(
          "Unable to load teacher attendance:",
          error
        );

        setAttendanceData(
          []
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [
    user?.department,
  ]);

  const authMethods =
    useMemo(() => {
      return Array.from(
        new Set(
          attendanceData
            .map(
              (record) =>
                record.authMethod
            )
            .filter(Boolean)
        )
      ).sort();
    }, [
      attendanceData,
    ]);

  const filteredRecords =
    useMemo(() => {
      return attendanceData
        .map(
          (record) => {
            const student =
              usersData[
                record.userId
              ];

            return {
              ...record,

              studentName:
                student
                  ? `${student.firstName || ""} ${student.lastName || ""}`.trim()
                  : "Unknown",

              studentId:
                student?.studentId ||
                "N/A",

              course:
                student?.course ||
                "N/A",

              department:
                student?.department ||
                "N/A",

              email:
                student?.email ||
                "",
            };
          }
        )
        .filter(
          (record) => {
            const search =
              searchTerm
                .trim()
                .toLowerCase();

            const matchesSearch =
              !search ||
              record.studentName
                .toLowerCase()
                .includes(
                  search
                ) ||
              record.studentId
                .toLowerCase()
                .includes(
                  search
                ) ||
              record.email
                .toLowerCase()
                .includes(
                  search
                );

            let recordDate =
              "";

            try {
              const date =
                record.timestamp?.toDate
                  ? record.timestamp.toDate()
                  : new Date(
                      record.timestamp
                    );

              recordDate =
                date
                  .toISOString()
                  .split("T")[0];
            } catch {
              recordDate =
                "";
            }

            const matchesDate =
              !selectedDate ||
              recordDate ===
                selectedDate;

            const matchesStatus =
              selectedStatus ===
                "all" ||
              record.status ===
                selectedStatus;

            const matchesAuth =
              selectedAuthMethod ===
                "all" ||
              record.authMethod ===
                selectedAuthMethod;

            return (
              matchesSearch &&
              matchesDate &&
              matchesStatus &&
              matchesAuth
            );
          }
        );
    }, [
      attendanceData,
      usersData,
      searchTerm,
      selectedDate,
      selectedStatus,
      selectedAuthMethod,
    ]);

  const summary =
    useMemo(() => {
      const total =
        filteredRecords.length;

      const present =
        filteredRecords.filter(
          (record) =>
            record.status ===
            "present"
        ).length;

      const late =
        filteredRecords.filter(
          (record) =>
            record.status ===
            "late"
        ).length;

      const absent =
        filteredRecords.filter(
          (record) =>
            record.status ===
            "absent"
        ).length;

      const percentage =
        total > 0
          ? (
              (present /
                total) *
              100
            ).toFixed(1)
          : "0.0";

      return {
        total,
        present,
        late,
        absent,
        percentage,
      };
    }, [
      filteredRecords,
    ]);

  function handleExport(
    format
  ) {
    if (
      format === "csv"
    ) {
      exportToCSV(
        filteredRecords,
        "department-attendance"
      );
    } else {
      exportToPDF(
        filteredRecords,
        "Department Attendance Report"
      );
    }
  }

  function clearFilters() {
    setSearchTerm("");
    setSelectedDate("");
    setSelectedStatus(
      "all"
    );
    setSelectedAuthMethod(
      "all"
    );
  }

  if (loading) {
    return (
      <div className="teacher-attendance-page ta-loading">
        <div className="ta-spinner" />
        <span>
          Loading department
          attendance...
        </span>
      </div>
    );
  }

  return (
    <div className="teacher-attendance-page">
      <section className="ta-hero">
        <div>
          <span className="ta-eyebrow">
            <GraduationCap
              size={14}
            />
            Department Attendance
          </span>

          <h1>
            Attendance Monitor
          </h1>

          <p>
            Review attendance
            activity for students
            assigned to{" "}
            <strong>
              {user?.department ||
                "your department"}
            </strong>
            .
          </p>

          <div className="ta-hero-meta">
            <span>
              <ShieldCheck
                size={14}
              />
              Teacher access
            </span>

            <span>
              <Users
                size={14}
              />
              Same-department
              students only
            </span>
          </div>
        </div>

        <div className="ta-hero-rate">
          <strong>
            {summary.percentage}%
          </strong>

          <span>
            Attendance rate
          </span>
        </div>
      </section>

      <section className="ta-summary-grid">
        <SummaryCard
          icon={Users}
          label="Records"
          value={summary.total}
          tone="primary"
        />

        <SummaryCard
          icon={CheckCircle}
          label="Present"
          value={
            summary.present
          }
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
          value={
            summary.absent
          }
          tone="danger"
        />

        <SummaryCard
          icon={BarChart3}
          label="Attendance %"
          value={`${summary.percentage}%`}
          tone="info"
        />
      </section>

      <section className="ta-controls">
        <div className="ta-search">
          <Search size={16} />

          <input
            value={searchTerm}
            onChange={(
              event
            ) =>
              setSearchTerm(
                event.target
                  .value
              )
            }
            placeholder="Search student name, ID or email..."
          />
        </div>

        <input
          type="date"
          value={selectedDate}
          onChange={(
            event
          ) =>
            setSelectedDate(
              event.target
                .value
            )
          }
        />

        <select
          value={
            selectedStatus
          }
          onChange={(
            event
          ) =>
            setSelectedStatus(
              event.target
                .value
            )
          }
        >
          <option value="all">
            All Statuses
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
        </select>

        <select
          value={
            selectedAuthMethod
          }
          onChange={(
            event
          ) =>
            setSelectedAuthMethod(
              event.target
                .value
            )
          }
        >
          <option value="all">
            All Methods
          </option>

          {authMethods.map(
            (method) => (
              <option
                key={method}
                value={method}
              >
                {method}
              </option>
            )
          )}
        </select>

        <button
          className="ta-clear"
          onClick={clearFilters}
        >
          <X size={14} />
          Clear
        </button>

        <div className="ta-export">
          <button
            onClick={() =>
              handleExport(
                "csv"
              )
            }
          >
            <Download
              size={14}
            />
            CSV
          </button>

          <button
            onClick={() =>
              handleExport(
                "pdf"
              )
            }
          >
            <Download
              size={14}
            />
            PDF
          </button>
        </div>
      </section>

      <section className="ta-table-card">
        <div className="ta-table-heading">
          <div>
            <span>
              Live Records
            </span>

            <h2>
              Department Students
            </h2>
          </div>

          <small>
            {
              filteredRecords.length
            }{" "}
            record
            {filteredRecords.length ===
            1
              ? ""
              : "s"}
          </small>
        </div>

        <div className="ta-table-scroll">
          <table className="ta-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>
                  Student ID
                </th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>
                  Authentication
                </th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="ta-empty"
                  >
                    No department
                    attendance records
                    found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(
                  (record) => {
                    const date =
                      record.timestamp?.toDate
                        ? record.timestamp.toDate()
                        : new Date(
                            record.timestamp
                          );

                    return (
                      <tr
                        key={
                          record.id
                        }
                      >
                        <td>
                          <div className="ta-student">
                            <span>
                              {record.studentName
                                .charAt(
                                  0
                                )
                                .toUpperCase()}
                            </span>

                            <div>
                              <strong>
                                {
                                  record.studentName
                                }
                              </strong>

                              <small>
                                {
                                  record.email
                                }
                              </small>
                            </div>
                          </div>
                        </td>

                        <td>
                          {
                            record.studentId
                          }
                        </td>

                        <td>
                          {date.toLocaleDateString(
                            "en-MY"
                          )}
                        </td>

                        <td>
                          {date.toLocaleTimeString(
                            "en-MY",
                            {
                              hour:
                                "2-digit",
                              minute:
                                "2-digit",
                            }
                          )}
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              record.status
                            }
                          />
                        </td>

                        <td>
                          <span className="ta-method">
                            {record.authMethod ||
                              "N/A"}
                          </span>
                        </td>

                        <td>
                          <button
                            className="ta-view"
                            onClick={() =>
                              setSelectedModal(
                                record
                              )
                            }
                          >
                            <Eye
                              size={
                                14
                              }
                            />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedModal && (
        <AttendanceDetailsModal
          record={
            selectedModal
          }
          user={
            usersData[
              selectedModal.userId
            ]
          }
          onClose={() =>
            setSelectedModal(
              null
            )
          }
        />
      )}
    </div>
  );
}

export default TeacherAttendance;