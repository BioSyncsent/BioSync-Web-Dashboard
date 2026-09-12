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
  CalendarDays,
  CheckCircle,
  Clock,
  Eye,
  Fingerprint,
  Search,
  ShieldCheck,
  X,
  XCircle,
} from "lucide-react";

import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";

import SummaryCard from "../../components/SummaryCard";
import StatusBadge from "../../components/StatusBadge";
import AttendanceDetailsModal from "../../components/AttendanceDetailsModal";

import "./Attendance.css";

function toSafeDate(
  timestamp
) {
  if (!timestamp) {
    return null;
  }

  if (
    typeof timestamp.toDate ===
    "function"
  ) {
    return timestamp.toDate();
  }

  const date =
    new Date(timestamp);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function StudentAttendance() {
  const { user } = useAuth();

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    attendanceData,
    setAttendanceData,
  ] = useState([]);

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
  ] = useState("");

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState("all");

  const [
    selectedAuthMethod,
    setSelectedAuthMethod,
  ] = useState("all");

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

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    async function fetchData() {
      try {
        setLoading(true);

        const attendanceQuery =
          query(
            collection(
              db,
              "attendance"
            ),
            where(
              "userId",
              "==",
              user.uid
            )
          );

        const snapshot =
          await getDocs(
            attendanceQuery
          );

        const records =
          snapshot.docs.map(
            (document) => ({
              id:
                document.id,
              ...document.data(),
            })
          );

        records.sort(
          (
            first,
            second
          ) => {
            const firstDate =
              toSafeDate(
                first.timestamp
              )?.getTime() ||
              0;

            const secondDate =
              toSafeDate(
                second.timestamp
              )?.getTime() ||
              0;

            return (
              secondDate -
              firstDate
            );
          }
        );

        setAttendanceData(
          records
        );
      } catch (error) {
        console.error(
          "Error fetching attendance:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [
    user?.uid,
  ]);

  const filteredRecords =
    useMemo(() => {
      return attendanceData.filter(
        (record) => {
          const search =
            searchTerm
              .trim()
              .toLowerCase();

          const matchesSearch =
            !search ||
            record.authMethod
              ?.toLowerCase()
              .includes(
                search
              ) ||
            record.status
              ?.toLowerCase()
              .includes(
                search
              );

          const date =
            toSafeDate(
              record.timestamp
            );

          const recordDate =
            date
              ? date
                  .toISOString()
                  .split("T")[0]
              : "";

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

      const attended =
        present + late;

      const percentage =
        total > 0
          ? (
              (attended /
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
      <div className="student-attendance-page sa-loading">
        <div className="sa-spinner" />
        <p>
          Loading your
          attendance...
        </p>
      </div>
    );
  }

  return (
    <div className="student-attendance-page">
      <section className="sa-hero">
        <div className="sa-hero-decoration" />

        <div>
          <span className="sa-eyebrow">
            <CalendarDays
              size={14}
            />
            Personal Attendance
          </span>

          <h1>
            My Attendance
          </h1>

          <p>
            Review your BioSync
            attendance history and
            authentication method
            used for each recorded
            session.
          </p>

          <div className="sa-meta">
            <span>
              <ShieldCheck
                size={14}
              />
              Secure personal
              records
            </span>

            <span>
              <Fingerprint
                size={14}
              />
              Biometric verified
            </span>
          </div>
        </div>

        <div className="sa-rate-card">
          <strong>
            {summary.percentage}%
          </strong>

          <span>
            Attendance
          </span>

          <small>
            {summary.total} valid
            record
            {summary.total === 1
              ? ""
              : "s"}
          </small>
        </div>
      </section>

      <section className="sa-summary-grid">
        <SummaryCard
          icon={BarChart3}
          label="Total Records"
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
      </section>

      <section className="sa-filter-card">
        <div className="sa-filter-heading">
          <div>
            <span>
              Attendance History
            </span>

            <h2>
              Find a Record
            </h2>
          </div>

          <button
            onClick={
              clearFilters
            }
          >
            <X size={14} />
            Clear
          </button>
        </div>

        <div className="sa-filter-grid">
          <div className="sa-search">
            <Search size={16} />

            <input
              value={
                searchTerm
              }
              onChange={(
                event
              ) =>
                setSearchTerm(
                  event.target
                    .value
                )
              }
              placeholder="Search status or authentication method..."
            />
          </div>

          <input
            type="date"
            value={
              selectedDate
            }
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
        </div>
      </section>

      <section className="sa-table-card">
        <div className="sa-table-heading">
          <div>
            <span>
              Personal History
            </span>

            <h2>
              Attendance Records
            </h2>
          </div>

          <small>
            {
              filteredRecords.length
            }{" "}
            result
            {filteredRecords.length ===
            1
              ? ""
              : "s"}
          </small>
        </div>

        <div className="sa-table-scroll">
          <table className="sa-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                <th>
                  Authentication
                </th>
                <th>Details</th>
              </tr>
            </thead>

            <tbody>
              {filteredRecords.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="sa-empty"
                  >
                    <CalendarDays
                      size={28}
                    />

                    <strong>
                      No attendance
                      records found
                    </strong>

                    <span>
                      Your attendance
                      records will
                      appear here when
                      recorded.
                    </span>
                  </td>
                </tr>
              ) : (
                filteredRecords.map(
                  (record) => {
                    const date =
                      toSafeDate(
                        record.timestamp
                      );

                    return (
                      <tr
                        key={
                          record.id
                        }
                      >
                        <td>
                          <strong>
                            {date
                              ? date.toLocaleDateString(
                                  "en-MY",
                                  {
                                    day:
                                      "2-digit",
                                    month:
                                      "short",
                                    year:
                                      "numeric",
                                  }
                                )
                              : "N/A"}
                          </strong>
                        </td>

                        <td>
                          {date
                            ? date.toLocaleTimeString(
                                "en-MY",
                                {
                                  hour:
                                    "2-digit",
                                  minute:
                                    "2-digit",
                                }
                              )
                            : "N/A"}
                        </td>

                        <td>
                          <StatusBadge
                            status={
                              record.status
                            }
                          />
                        </td>

                        <td>
                          <span className="sa-method">
                            <Fingerprint
                              size={
                                13
                              }
                            />

                            {record.authMethod ||
                              "N/A"}
                          </span>
                        </td>

                        <td>
                          <button
                            className="sa-view-button"
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
          user={user}
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

export default StudentAttendance;