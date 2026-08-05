import {
  useCallback,
  useMemo,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileWarning,
  Fingerprint,
  Gauge,
  IdCard,
  Monitor,
  RefreshCw,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useAuth } from "../../contexts/AuthContext";

import {
  useFirestoreSubscription,
} from "../../hooks/useFirestoreSubscription";

import {
  subscribeToStudentAttendance,
  subscribeToStudentDisputes,
} from "../../services/disputeService";

import "./Dashboard.css";

/* =========================================================
   DATE HELPERS
========================================================= */

function toSafeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime())
    ? null
    : parsedDate;
}

function getRecordDate(record) {
  return toSafeDate(
    record?.timestamp ??
      record?.date ??
      record?.createdAt
  );
}

function getLocalDateKey(value) {
  const date = toSafeDate(value);

  if (!date) {
    return "";
  }

  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSameDay(firstValue, secondValue) {
  return (
    getLocalDateKey(firstValue) ===
    getLocalDateKey(secondValue)
  );
}

function formatDate(value) {
  const date = toSafeDate(value);

  if (!date) {
    return "N/A";
  }

  return date.toLocaleDateString("en-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatLongDate(value) {
  const date = toSafeDate(value);

  if (!date) {
    return "N/A";
  }

  return date.toLocaleDateString("en-MY", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value) {
  const date = toSafeDate(value);

  if (!date) {
    return "N/A";
  }

  return date.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   TEXT AND STATUS HELPERS
========================================================= */

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function formatLabel(value) {
  const normalizedValue = String(
    value || ""
  )
    .trim()
    .replace(/[_-]+/g, " ");

  if (!normalizedValue) {
    return "N/A";
  }

  return normalizedValue.replace(
    /\b\w/g,
    (letter) => letter.toUpperCase()
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getStatusClass(status) {
  const normalizedStatus =
    normalizeStatus(status);

  const supportedStatuses = [
    "present",
    "late",
    "absent",
    "excused",
    "pending",
    "under_review",
    "awaiting_information",
    "approved",
    "rejected",
    "cancelled",
    "closed",
  ];

  if (
    supportedStatuses.includes(
      normalizedStatus
    )
  ) {
    return `sd-status sd-status-${normalizedStatus}`;
  }

  return "sd-status sd-status-unknown";
}

function getAttendanceInsight(
  attendanceRate,
  summary
) {
  if (summary.knownTotal === 0) {
    return {
      tone: "neutral",
      title: "No attendance history yet",
      message:
        "Your attendance performance will appear after attendance records are added.",
    };
  }

  if (attendanceRate >= 90) {
    return {
      tone: "success",
      title: "Excellent attendance",
      message:
        "Your current attendance is above 90%. Keep maintaining this consistency.",
    };
  }

  if (attendanceRate >= 80) {
    return {
      tone: "primary",
      title: "Good attendance progress",
      message:
        "You are currently meeting the recommended 80% attendance target.",
    };
  }

  return {
    tone: "danger",
    title: "Attendance requires attention",
    message:
      "Your attendance is below 80%. Review your records and submit a dispute for incorrect entries.",
  };
}

/* =========================================================
   WEEKLY CHART
========================================================= */

function createWeeklyChartData(records) {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const days = [];

  for (
    let dayOffset = 6;
    dayOffset >= 0;
    dayOffset -= 1
  ) {
    const date = new Date(today);

    date.setDate(
      today.getDate() - dayOffset
    );

    days.push({
      key: getLocalDateKey(date),

      day: date.toLocaleDateString(
        "en-MY",
        {
          weekday: "short",
        }
      ),

      dateLabel:
        date.toLocaleDateString(
          "en-MY",
          {
            day: "2-digit",
            month: "short",
          }
        ),

      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
    });
  }

  const daysByKey =
    Object.fromEntries(
      days.map((day) => [
        day.key,
        day,
      ])
    );

  records.forEach((record) => {
    const recordDate =
      getRecordDate(record);

    const key =
      getLocalDateKey(recordDate);

    const day = daysByKey[key];

    if (!day) {
      return;
    }

    const status =
      normalizeStatus(record.status);

    if (
      Object.prototype.hasOwnProperty.call(
        day,
        status
      )
    ) {
      day[status] += 1;
    }
  });

  return days.map(
    ({ key, ...day }) => day
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

function StudentDashboard() {
  const {
    user,
    loading: authLoading,
  } = useAuth();

  const navigate = useNavigate();

  const subscribeAttendance =
    useCallback(
      (onData, onError) => {
        if (!user?.uid) {
          onData([]);
          return () => {};
        }

        return subscribeToStudentAttendance(
          user,
          onData,
          onError
        );
      },
      [user]
    );

  const subscribeDisputes =
    useCallback(
      (onData, onError) => {
        if (!user?.uid) {
          onData([]);
          return () => {};
        }

        return subscribeToStudentDisputes(
          user,
          onData,
          onError
        );
      },
      [user]
    );

  const attendanceSubscription =
    useFirestoreSubscription(
      subscribeAttendance,
      [user?.uid]
    );

  const disputesSubscription =
    useFirestoreSubscription(
      subscribeDisputes,
      [user?.uid]
    );

  const attendanceRecords =
    attendanceSubscription.data ?? [];

  const disputes =
    disputesSubscription.data ?? [];

  const loading =
    authLoading ||
    attendanceSubscription.loading ||
    disputesSubscription.loading;

  const error =
    attendanceSubscription.error ||
    disputesSubscription.error;

  /* =======================================================
     ATTENDANCE SUMMARY
  ======================================================= */

  const summary = useMemo(() => {
    return attendanceRecords.reduce(
      (result, record) => {
        const status =
          normalizeStatus(record.status);

        result.total += 1;

        if (status === "present") {
          result.present += 1;
          result.knownTotal += 1;
        } else if (status === "late") {
          result.late += 1;
          result.knownTotal += 1;
        } else if (status === "absent") {
          result.absent += 1;
          result.knownTotal += 1;
        } else if (status === "excused") {
          result.excused += 1;
          result.knownTotal += 1;
        } else {
          result.unknown += 1;
        }

        return result;
      },
      {
        total: 0,
        knownTotal: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        unknown: 0,
      }
    );
  }, [attendanceRecords]);

  const attendanceRate = useMemo(() => {
    if (summary.knownTotal === 0) {
      return 0;
    }

    const attended =
      summary.present +
      summary.late +
      summary.excused;

    return Math.round(
      (attended / summary.knownTotal) *
        100
    );
  }, [summary]);

  const activeDisputes = useMemo(() => {
    const activeStatuses = [
      "pending",
      "under_review",
      "awaiting_information",
    ];

    return disputes.filter((dispute) =>
      activeStatuses.includes(
        normalizeStatus(dispute.status)
      )
    );
  }, [disputes]);

  const todayAttendance = useMemo(() => {
    const today = new Date();

    return (
      attendanceRecords.find((record) =>
        isSameDay(
          getRecordDate(record),
          today
        )
      ) ?? null
    );
  }, [attendanceRecords]);

  const latestAttendance =
    attendanceRecords[0] ?? null;

  const latestDispute =
    disputes[0] ?? null;

  const recentAttendance =
    attendanceRecords.slice(0, 5);

  const weeklyChartData = useMemo(
    () =>
      createWeeklyChartData(
        attendanceRecords
      ),
    [attendanceRecords]
  );

  const hasWeeklyChartData =
    weeklyChartData.some(
      (day) =>
        day.present > 0 ||
        day.late > 0 ||
        day.absent > 0 ||
        day.excused > 0
    );

  const insight = useMemo(
    () =>
      getAttendanceInsight(
        attendanceRate,
        summary
      ),
    [attendanceRate, summary]
  );

  const studentName =
    user?.fullName ||
    [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Student";

  const firstName =
    user?.firstName ||
    studentName.split(" ")[0] ||
    "Student";

  const statCards = [
    {
      label: "Attendance Rate",
      value: `${attendanceRate}%`,
      helper: `${summary.knownTotal} recorded day${
        summary.knownTotal === 1
          ? ""
          : "s"
      }`,
      icon: Gauge,
      tone: "primary",
    },
    {
      label: "Present",
      value: summary.present,
      helper: "On-time attendance",
      icon: CheckCircle2,
      tone: "success",
    },
    {
      label: "Late",
      value: summary.late,
      helper: "Late check-ins",
      icon: Clock3,
      tone: "warning",
    },
    {
      label: "Absent",
      value: summary.absent,
      helper: "Missed attendance",
      icon: XCircle,
      tone: "danger",
    },
    {
      label: "Excused",
      value: summary.excused,
      helper: "Approved corrections",
      icon: ShieldCheck,
      tone: "info",
    },
    {
      label: "Active Disputes",
      value: activeDisputes.length,
      helper: "Awaiting completion",
      icon: FileWarning,
      tone: "purple",
    },
  ];

  function handleRetry() {
    attendanceSubscription.retry();
    disputesSubscription.retry();
  }

  /* =======================================================
     LOADING STATE
  ======================================================= */

  if (loading) {
    return (
      <div className="sd-page">
        <div className="sd-loading-card">
          <div className="sd-loading-spinner" />

          <div>
            <h2>
              Loading your dashboard
            </h2>

            <p>
              Retrieving your attendance
              and dispute information.
            </p>
          </div>
        </div>

        <div className="sd-skeleton-grid">
          {Array.from({
            length: 6,
          }).map((_, index) => (
            <div
              className="sd-skeleton-card"
              key={index}
            >
              <div className="sd-skeleton sd-skeleton-icon" />
              <div className="sd-skeleton sd-skeleton-value" />
              <div className="sd-skeleton sd-skeleton-text" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* =======================================================
     ERROR STATE
  ======================================================= */

  if (error) {
    return (
      <div className="sd-page">
        <div className="sd-error-card">
          <div className="sd-error-icon">
            <AlertCircle size={28} />
          </div>

          <div className="sd-error-content">
            <h2>
              Unable to load your dashboard
            </h2>

            <p>
              {error?.message ||
                "An unexpected error occurred while loading your attendance data."}
            </p>

            <button
              type="button"
              className="sd-button sd-button-primary"
              onClick={handleRetry}
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-page">
      {/* ===================================================
          WELCOME
      =================================================== */}

      <section className="sd-welcome-card">
        <div className="sd-welcome-decoration sd-welcome-decoration-one" />
        <div className="sd-welcome-decoration sd-welcome-decoration-two" />

        <div className="sd-welcome-content">
          <div className="sd-live-badge">
            <Activity size={13} />
            Live attendance data
          </div>

          <p className="sd-welcome-date">
            {formatLongDate(new Date())}
          </p>

          <h1>
            {getGreeting()}, {firstName}
          </h1>

          <p className="sd-welcome-description">
            Here is your latest attendance,
            authentication and dispute overview.
          </p>

          <div className="sd-student-meta">
            <span>
              <IdCard size={15} />
              {user?.studentId ||
                "Student ID unavailable"}
            </span>

            <span>
              <BookOpen size={15} />
              {user?.course ||
                "Course unavailable"}
            </span>

            <span>
              <ShieldCheck size={15} />
              {user?.active === false
                ? "Inactive account"
                : "Active student account"}
            </span>
          </div>
        </div>

        <div className="sd-welcome-score">
          <div
            className="sd-score-ring"
            style={{
              "--sd-progress": `${attendanceRate * 3.6}deg`,
            }}
          >
            <div className="sd-score-ring-inner">
              <strong>
                {attendanceRate}%
              </strong>

              <span>
                Attendance
              </span>
            </div>
          </div>

          <p>
            Based on {summary.knownTotal} valid
            record
            {summary.knownTotal === 1
              ? ""
              : "s"}
          </p>
        </div>
      </section>

      {/* ===================================================
          SUMMARY
      =================================================== */}

      <section className="sd-stat-grid">
        {statCards.map(
          ({
            label,
            value,
            helper,
            icon: Icon,
            tone,
          }) => (
            <article
              className={`sd-stat-card sd-stat-${tone}`}
              key={label}
            >
              <div className="sd-stat-top">
                <div className="sd-stat-icon">
                  <Icon size={19} />
                </div>

                <span className="sd-stat-label">
                  {label}
                </span>
              </div>

              <strong className="sd-stat-value">
                {value}
              </strong>

              <span className="sd-stat-helper">
                {helper}
              </span>
            </article>
          )
        )}
      </section>

      {/* ===================================================
          INSIGHT
      =================================================== */}

      <section
        className={`sd-insight-card sd-insight-${insight.tone}`}
      >
        <div className="sd-insight-icon">
          <BarChart3 size={22} />
        </div>

        <div>
          <strong>
            {insight.title}
          </strong>

          <p>
            {insight.message}
          </p>
        </div>
      </section>

      {/* ===================================================
          TODAY AND WEEKLY CHART
      =================================================== */}

      <section className="sd-primary-grid">
        <article className="sd-card sd-today-card">
          <div className="sd-card-header">
            <div>
              <span className="sd-section-eyebrow">
                Current status
              </span>

              <h2>
                Today&apos;s Attendance
              </h2>
            </div>

            <div className="sd-card-header-icon">
              <CalendarDays size={20} />
            </div>
          </div>

          {todayAttendance ? (
            <>
              <div className="sd-today-status-row">
                <div>
                  <span className="sd-detail-label">
                    Attendance status
                  </span>

                  <span
                    className={getStatusClass(
                      todayAttendance.status
                    )}
                  >
                    {formatLabel(
                      todayAttendance.status
                    )}
                  </span>
                </div>

                <div className="sd-today-time">
                  <Clock3 size={18} />

                  <div>
                    <span>
                      Check-in time
                    </span>

                    <strong>
                      {formatTime(
                        getRecordDate(
                          todayAttendance
                        )
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="sd-detail-grid">
                <div className="sd-detail-item">
                  <Fingerprint size={17} />

                  <div>
                    <span>
                      Authentication
                    </span>

                    <strong>
                      {todayAttendance.authMethod ||
                        "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="sd-detail-item">
                  <Monitor size={17} />

                  <div>
                    <span>
                      Device
                    </span>

                    <strong>
                      {todayAttendance.deviceName ||
                        todayAttendance.deviceId ||
                        "N/A"}
                    </strong>
                  </div>
                </div>

                <div className="sd-detail-item">
                  <ShieldCheck size={17} />

                  <div>
                    <span>
                      Verification
                    </span>

                    <strong>
                      {formatLabel(
                        todayAttendance.verificationResult
                      )}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="sd-card-actions">
                <button
                  type="button"
                  className="sd-button sd-button-secondary"
                  onClick={() =>
                    navigate(
                      "/student/attendance"
                    )
                  }
                >
                  View Details
                  <ArrowRight size={15} />
                </button>

                {[
                  "absent",
                  "late",
                ].includes(
                  normalizeStatus(
                    todayAttendance.status
                  )
                ) && (
                  <button
                    type="button"
                    className="sd-button sd-button-primary"
                    onClick={() =>
                      navigate(
                        "/student/disputes"
                      )
                    }
                  >
                    Submit Dispute
                    <FileWarning size={15} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="sd-empty-state sd-today-empty">
              <div className="sd-empty-icon">
                <CalendarDays size={28} />
              </div>

              <h3>
                No attendance recorded today
              </h3>

              <p>
                Your latest check-in will appear
                here after it is recorded.
              </p>

              <button
                type="button"
                className="sd-button sd-button-secondary"
                onClick={() =>
                  navigate(
                    "/student/attendance"
                  )
                }
              >
                View Attendance History
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </article>

        <article className="sd-card sd-chart-card">
          <div className="sd-card-header">
            <div>
              <span className="sd-section-eyebrow">
                Last seven days
              </span>

              <h2>
                Weekly Attendance
              </h2>
            </div>

            <div className="sd-card-header-icon">
              <BarChart3 size={20} />
            </div>
          </div>

          {hasWeeklyChartData ? (
            <div className="sd-chart-container">
              <ResponsiveContainer
                width="100%"
                height={270}
              >
                <BarChart
                  data={weeklyChartData}
                  margin={{
                    top: 12,
                    right: 4,
                    left: -24,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    stroke="#e8f1fa"
                    vertical={false}
                  />

                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 12,
                      fill: "#64748b",
                    }}
                  />

                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fontSize: 11,
                      fill: "#94a3b8",
                    }}
                  />

                  <Tooltip
                    cursor={{
                      fill:
                        "rgba(86, 182, 255, 0.07)",
                    }}
                    contentStyle={{
                      borderRadius: 12,
                      border:
                        "1px solid #d8e9f8",
                      boxShadow:
                        "0 10px 28px rgba(37, 99, 235, 0.12)",
                      fontSize: 12,
                    }}
                    labelFormatter={(
                      label,
                      payload
                    ) =>
                      payload?.[0]?.payload
                        ?.dateLabel ||
                      label
                    }
                    formatter={(
                      value,
                      name
                    ) => [
                      value,
                      formatLabel(name),
                    ]}
                  />

                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: 11,
                      paddingTop: 12,
                    }}
                    formatter={formatLabel}
                  />

                  <Bar
                    dataKey="present"
                    stackId="attendance"
                    fill="#22c55e"
                    radius={[5, 5, 0, 0]}
                  />

                  <Bar
                    dataKey="late"
                    stackId="attendance"
                    fill="#f59e0b"
                    radius={[5, 5, 0, 0]}
                  />

                  <Bar
                    dataKey="absent"
                    stackId="attendance"
                    fill="#ef4444"
                    radius={[5, 5, 0, 0]}
                  />

                  <Bar
                    dataKey="excused"
                    stackId="attendance"
                    fill="#3b82f6"
                    radius={[5, 5, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="sd-empty-state sd-chart-empty">
              <div className="sd-empty-icon">
                <BarChart3 size={28} />
              </div>

              <h3>
                No chart data available
              </h3>

              <p>
                Attendance from the last seven
                days will appear here.
              </p>
            </div>
          )}
        </article>
      </section>

      {/* ===================================================
          DISPUTE, AUTHENTICATION AND QUICK ACTIONS
      =================================================== */}

      <section className="sd-secondary-grid">
        <article className="sd-card sd-dispute-card">
          <div className="sd-card-header">
            <div>
              <span className="sd-section-eyebrow">
                Latest request
              </span>

              <h2>
                Dispute Update
              </h2>
            </div>

            <div className="sd-card-header-icon">
              <FileWarning size={20} />
            </div>
          </div>

          {latestDispute ? (
            <>
              <div className="sd-dispute-top">
                <div>
                  <span className="sd-detail-label">
                    Current status
                  </span>

                  <span
                    className={getStatusClass(
                      latestDispute.status
                    )}
                  >
                    {formatLabel(
                      latestDispute.status
                    )}
                  </span>
                </div>

                <span className="sd-dispute-date">
                  Submitted{" "}
                  {formatDate(
                    latestDispute.submittedAt
                  )}
                </span>
              </div>

              <div className="sd-dispute-details">
                <div>
                  <span>
                    Reason
                  </span>

                  <strong>
                    {latestDispute.reason ||
                      "N/A"}
                  </strong>
                </div>

                <div>
                  <span>
                    Original status
                  </span>

                  <strong>
                    {formatLabel(
                      latestDispute.originalStatus
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Requested status
                  </span>

                  <strong>
                    {formatLabel(
                      latestDispute.requestedStatus
                    )}
                  </strong>
                </div>
              </div>

              <div className="sd-admin-response">
                <ShieldCheck size={17} />

                <div>
                  <span>
                    Administrator response
                  </span>

                  <p>
                    {latestDispute.adminComment ||
                      "No administrator response has been provided yet."}
                  </p>
                </div>
              </div>

              <div className="sd-card-actions">
                <button
                  type="button"
                  className="sd-button sd-button-secondary"
                  onClick={() =>
                    navigate(
                      "/student/disputes"
                    )
                  }
                >
                  View My Disputes
                  <ArrowRight size={15} />
                </button>

                <button
                  type="button"
                  className="sd-button sd-button-primary"
                  onClick={() =>
                    navigate(
                      "/student/disputes"
                    )
                  }
                >
                  New Dispute
                  <FileWarning size={15} />
                </button>
              </div>
            </>
          ) : (
            <div className="sd-empty-state sd-compact-empty">
              <div className="sd-empty-icon">
                <FileWarning size={26} />
              </div>

              <h3>
                No disputes submitted
              </h3>

              <p>
                Submit a dispute when an
                attendance record is incorrect.
              </p>

              <button
                type="button"
                className="sd-button sd-button-primary"
                onClick={() =>
                  navigate(
                    "/student/disputes"
                  )
                }
              >
                Submit a Dispute
                <ArrowRight size={15} />
              </button>
            </div>
          )}
        </article>

        <article className="sd-card sd-auth-card">
          <div className="sd-card-header">
            <div>
              <span className="sd-section-eyebrow">
                Latest verification
              </span>

              <h2>
                Authentication Overview
              </h2>
            </div>

            <div className="sd-card-header-icon">
              <Fingerprint size={20} />
            </div>
          </div>

          {latestAttendance ? (
            <div className="sd-auth-list">
              <div className="sd-auth-row">
                <div className="sd-auth-row-icon">
                  <Fingerprint size={17} />
                </div>

                <div>
                  <span>
                    Last method
                  </span>

                  <strong>
                    {latestAttendance.authMethod ||
                      "N/A"}
                  </strong>
                </div>
              </div>

              <div className="sd-auth-row">
                <div className="sd-auth-row-icon">
                  <Monitor size={17} />
                </div>

                <div>
                  <span>
                    Device
                  </span>

                  <strong>
                    {latestAttendance.deviceName ||
                      latestAttendance.deviceId ||
                      "N/A"}
                  </strong>
                </div>
              </div>

              <div className="sd-auth-row">
                <div className="sd-auth-row-icon">
                  <ShieldCheck size={17} />
                </div>

                <div>
                  <span>
                    Verification
                  </span>

                  <strong>
                    {formatLabel(
                      latestAttendance.verificationResult
                    )}
                  </strong>
                </div>
              </div>

              <div className="sd-auth-row">
                <div className="sd-auth-row-icon">
                  <Clock3 size={17} />
                </div>

                <div>
                  <span>
                    Last used
                  </span>

                  <strong>
                    {formatDate(
                      getRecordDate(
                        latestAttendance
                      )
                    )}{" "}
                    ·{" "}
                    {formatTime(
                      getRecordDate(
                        latestAttendance
                      )
                    )}
                  </strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="sd-empty-state sd-compact-empty">
              <div className="sd-empty-icon">
                <Fingerprint size={26} />
              </div>

              <h3>
                No authentication data
              </h3>

              <p>
                Your latest biometric check-in
                information will appear here.
              </p>
            </div>
          )}
        </article>

        <article className="sd-card sd-actions-card">
          <div className="sd-card-header">
            <div>
              <span className="sd-section-eyebrow">
                Shortcuts
              </span>

              <h2>
                Quick Actions
              </h2>
            </div>
          </div>

          <div className="sd-quick-actions">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/student/attendance"
                )
              }
            >
              <span className="sd-action-icon">
                <ClipboardList size={18} />
              </span>

              <span>
                <strong>
                  My Attendance
                </strong>

                <small>
                  View all records
                </small>
              </span>

              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/student/disputes"
                )
              }
            >
              <span className="sd-action-icon">
                <FileWarning size={18} />
              </span>

              <span>
                <strong>
                  My Disputes
                </strong>

                <small>
                  Submit or review
                </small>
              </span>

              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/student/analytics"
                )
              }
            >
              <span className="sd-action-icon">
                <BarChart3 size={18} />
              </span>

              <span>
                <strong>
                  Analytics
                </strong>

                <small>
                  Check performance
                </small>
              </span>

              <ArrowRight size={15} />
            </button>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/student/profile"
                )
              }
            >
              <span className="sd-action-icon">
                <UserRound size={18} />
              </span>

              <span>
                <strong>
                  My Profile
                </strong>

                <small>
                  Account information
                </small>
              </span>

              <ArrowRight size={15} />
            </button>
          </div>
        </article>
      </section>

      {/* ===================================================
          RECENT ATTENDANCE
      =================================================== */}

      <section className="sd-card sd-recent-card">
        <div className="sd-card-header sd-table-header">
          <div>
            <span className="sd-section-eyebrow">
              Latest records
            </span>

            <h2>
              Recent Attendance
            </h2>
          </div>

          <button
            type="button"
            className="sd-button sd-button-secondary"
            onClick={() =>
              navigate(
                "/student/attendance"
              )
            }
          >
            View All Attendance
            <ArrowRight size={15} />
          </button>
        </div>

        {recentAttendance.length > 0 ? (
          <div className="sd-table-wrapper">
            <table className="sd-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Authentication</th>
                  <th>Device</th>
                </tr>
              </thead>

              <tbody>
                {recentAttendance.map(
                  (record) => {
                    const recordDate =
                      getRecordDate(record);

                    return (
                      <tr key={record.id}>
                        <td>
                          {formatDate(
                            recordDate
                          )}
                        </td>

                        <td>
                          {formatTime(
                            recordDate
                          )}
                        </td>

                        <td>
                          <span
                            className={getStatusClass(
                              record.status
                            )}
                          >
                            {formatLabel(
                              record.status
                            )}
                          </span>
                        </td>

                        <td>
                          <span className="sd-method-cell">
                            <Fingerprint
                              size={14}
                            />

                            {record.authMethod ||
                              "N/A"}
                          </span>
                        </td>

                        <td>
                          {record.deviceName ||
                            record.deviceId ||
                            "N/A"}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="sd-empty-state sd-table-empty">
            <div className="sd-empty-icon">
              <ClipboardList size={28} />
            </div>

            <h3>
              No attendance records
            </h3>

            <p>
              Your attendance history will
              appear here when records are
              created.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default StudentDashboard;