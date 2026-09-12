import {
  useMemo,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Cpu,
  CreditCard,
  Database,
  FileBarChart,
  Fingerprint,
  MessageSquareWarning,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  useFirestoreSubscription,
} from "../../hooks/useFirestoreSubscription";

import {
  getRecentActivity,
  getTrendData,
  subscribeToAttendanceRecords,
} from "../../services/attendanceService";

import {
  subscribeToTotalUsers,
} from "../../services/userService";

import {
  subscribeToPendingDisputes,
} from "../../services/disputeService";

import "./Dashboard.css";


function isSameDay(
  firstDate,
  secondDate
) {
  if (
    !firstDate ||
    !secondDate
  ) {
    return false;
  }

  return (
    firstDate.getFullYear() ===
      secondDate.getFullYear() &&
    firstDate.getMonth() ===
      secondDate.getMonth() &&
    firstDate.getDate() ===
      secondDate.getDate()
  );
}


function getLatestRecordPerUser(
  records
) {
  const recordsByUser =
    new Map();

  records.forEach(
    (record) => {
      const key =
        record.userId &&
        record.userId !== "—"
          ? record.userId
          : record.studentId ||
            record.id;

      const existing =
        recordsByUser.get(
          key
        );

      if (
        !existing ||
        (
          record.date &&
          existing.date &&
          record.date >
            existing.date
        )
      ) {
        recordsByUser.set(
          key,
          record
        );
      }
    }
  );

  return Array.from(
    recordsByUser.values()
  );
}


function calculateSummary(
  records
) {
  return records.reduce(
    (
      result,
      record
    ) => {
      result.total += 1;

      const status =
        String(
          record.status ||
          ""
        ).toLowerCase();

      if (
        status === "present"
      ) {
        result.present += 1;
      }

      if (
        status === "late"
      ) {
        result.late += 1;
      }

      if (
        status === "absent"
      ) {
        result.absent += 1;
      }

      return result;
    },
    {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
    }
  );
}


function normalizeMethod(
  method = ""
) {
  const value =
    String(method)
      .toLowerCase();

  if (
    value.includes(
      "finger"
    )
  ) {
    return "fingerprint";
  }

  if (
    value.includes(
      "face"
    )
  ) {
    return "face";
  }

  if (
    value.includes(
      "rfid"
    )
  ) {
    return "rfid";
  }

  return "other";
}


function methodLabel(
  method
) {
  if (
    method === "fingerprint"
  ) {
    return "Fingerprint";
  }

  if (
    method === "face"
  ) {
    return "Face Recognition";
  }

  if (
    method === "rfid"
  ) {
    return "RFID";
  }

  return "Other";
}


function statusClass(
  status
) {
  const value =
    String(status)
      .toLowerCase();

  if (
    value === "present"
  ) {
    return "ad-status ad-status-success";
  }

  if (
    value === "late"
  ) {
    return "ad-status ad-status-warning";
  }

  return "ad-status ad-status-danger";
}


function statusLabel(
  status
) {
  const value =
    String(status)
      .toLowerCase();

  if (
    value === "present"
  ) {
    return "On Time";
  }

  if (
    value === "late"
  ) {
    return "Late";
  }

  if (
    value === "absent"
  ) {
    return "Absent";
  }

  return "Unknown";
}


function Dashboard() {
  const navigate =
    useNavigate();

  const attendance =
    useFirestoreSubscription(
      subscribeToAttendanceRecords,
      []
    );

  const totalUsers =
    useFirestoreSubscription(
      subscribeToTotalUsers,
      []
    );

  const pendingDisputes =
    useFirestoreSubscription(
      subscribeToPendingDisputes,
      []
    );

  const records =
    attendance.data || [];

  const today =
    useMemo(
      () =>
        new Date(),
      []
    );

  const todayRecords =
    useMemo(
      () =>
        records.filter(
          (record) =>
            record.date &&
            isSameDay(
              record.date,
              today
            )
        ),
      [
        records,
        today,
      ]
    );

  const latestToday =
    useMemo(
      () =>
        getLatestRecordPerUser(
          todayRecords
        ),
      [
        todayRecords,
      ]
    );

  const summary =
    useMemo(
      () =>
        calculateSummary(
          latestToday
        ),
      [
        latestToday,
      ]
    );

  const total =
    Number(
      totalUsers.data
    ) || 0;

  const attended =
    summary.present +
    summary.late;

  const rate =
    total > 0
      ? Math.min(
          Math.round(
            (
              attended /
              total
            ) *
              1000
          ) /
            10,
          100
        )
      : 0;

  const trend =
    useMemo(
      () =>
        getTrendData(
          records
        ).map(
          (item) => {
            const count =
              item.present +
              item.late +
              item.absent;

            const attendedCount =
              item.present +
              item.late;

            return {
              day:
                item.date,
              rate:
                count > 0
                  ? Math.round(
                      (
                        attendedCount /
                        count
                      ) *
                        1000
                    ) /
                    10
                  : 0,
            };
          }
        ),
      [
        records,
      ]
    );

  const recentActivity =
    useMemo(
      () =>
        getRecentActivity(
          records,
          6
        ),
      [
        records,
      ]
    );

  const methods =
    useMemo(
      () => {
        const counts = {
          rfid: 0,
          face: 0,
          fingerprint: 0,
          other: 0,
        };

        todayRecords.forEach(
          (record) => {
            const method =
              normalizeMethod(
                record.method
              );

            counts[method] += 1;
          }
        );

        return counts;
      },
      [
        todayRecords,
      ]
    );

  const metrics = [
    {
      label: "Registered Users",
      value:
        totalUsers.loading
          ? "—"
          : total.toLocaleString(),
      icon: Users,
      tone: "blue",
      helper:
        "All active accounts",
    },
    {
      label: "Present",
      value:
        attendance.loading
          ? "—"
          : summary.present,
      icon: UserCheck,
      tone: "green",
      helper:
        "Verified today",
    },
    {
      label: "Late",
      value:
        attendance.loading
          ? "—"
          : summary.late,
      icon: Clock3,
      tone: "amber",
      helper:
        "Late check-ins",
    },
    {
      label: "Absent",
      value:
        attendance.loading
          ? "—"
          : summary.absent,
      icon: UserX,
      tone: "red",
      helper:
        "No valid check-in",
    },
  ];

  const actions = [
    {
      label:
        "Manage Users",
      description:
        "Create and manage accounts",
      icon:
        UserPlus,
      path:
        "/admin/users",
    },
    {
      label:
        "Attendance",
      description:
        "Review attendance records",
      icon:
        CalendarCheck,
      path:
        "/admin/attendance",
    },
    {
      label:
        "Disputes",
      description:
        "View student disputes",
      icon:
        MessageSquareWarning,
      path:
        "/admin/disputes",
    },
    {
      label:
        "Devices",
      description:
        "Monitor terminals",
      icon:
        Cpu,
      path:
        "/admin/devices",
    },
    {
      label:
        "Analytics",
      description:
        "View system reports",
      icon:
        FileBarChart,
      path:
        "/admin/analytics",
    },
  ];

  return (
    <div className="ad-page">
      {/* HERO */}

      <section className="ad-command">
        <div className="ad-command-grid" />

        <div className="ad-command-copy">
          <div className="ad-command-badge">
            <ShieldCheck
              size={14}
            />

            BioSync Command Center
          </div>

          <h1>
            System Overview
          </h1>

          <p>
            Central monitoring for
            attendance, biometric
            authentication, devices,
            disputes and user activity.
          </p>

          <div className="ad-command-meta">
            <span>
              <CheckCircle2
                size={14}
              />

              Firebase connected
            </span>

            <span>
              <Activity
                size={14}
              />

              Live monitoring
            </span>

            <span>
              <Database
                size={14}
              />

              {
                summary.total
              } records today
            </span>
          </div>
        </div>

        <div className="ad-command-score">
          <div className="ad-security-ring">
            <div>
              <strong>
                {rate.toFixed(
                  1
                )}
                %
              </strong>

              <span>
                Attendance
              </span>
            </div>
          </div>

          <p>
            Today's verification
            coverage
          </p>
        </div>
      </section>

      {/* METRICS */}

      <section className="ad-metric-grid">
        {metrics.map(
          ({
            label,
            value,
            icon: Icon,
            tone,
            helper,
          }) => (
            <article
              key={label}
              className={`ad-metric ad-metric-${tone}`}
            >
              <div>
                <span className="ad-metric-icon">
                  <Icon
                    size={19}
                  />
                </span>

                <span>
                  {label}
                </span>
              </div>

              <strong>
                {value}
              </strong>

              <small>
                {helper}
              </small>
            </article>
          )
        )}
      </section>

      {/* ACTIONS + HEALTH */}

      <section className="ad-upper-grid">
        <article className="ad-panel">
          <div className="ad-panel-heading">
            <div>
              <span className="ad-eyebrow">
                Administrator tools
              </span>

              <h2>
                Quick Management
              </h2>
            </div>
          </div>

          <div className="ad-action-grid">
            {actions.map(
              ({
                label,
                description,
                icon: Icon,
                path,
              }) => (
                <button
                  type="button"
                  key={label}
                  className="ad-action"
                  onClick={() =>
                    navigate(
                      path
                    )
                  }
                >
                  <span>
                    <Icon
                      size={18}
                    />
                  </span>

                  <div>
                    <strong>
                      {label}
                    </strong>

                    <small>
                      {
                        description
                      }
                    </small>
                  </div>

                  <ArrowRight
                    size={15}
                  />
                </button>
              )
            )}
          </div>
        </article>

        <article className="ad-panel">
          <div className="ad-panel-heading">
            <div>
              <span className="ad-eyebrow">
                Live infrastructure
              </span>

              <h2>
                System Health
              </h2>
            </div>
          </div>

          <div className="ad-health-list">
            <div>
              <span className="ad-health-icon">
                <Database
                  size={17}
                />
              </span>

              <div>
                <strong>
                  Firebase
                </strong>

                <small>
                  Real-time database
                </small>
              </div>

              <span className="ad-health-ok">
                Online
              </span>
            </div>

            <div>
              <span className="ad-health-icon">
                <ShieldCheck
                  size={17}
                />
              </span>

              <div>
                <strong>
                  Authentication
                </strong>

                <small>
                  Role-based access
                </small>
              </div>

              <span className="ad-health-ok">
                Secured
              </span>
            </div>

            <div>
              <span className="ad-health-icon">
                <Cpu
                  size={17}
                />
              </span>

              <div>
                <strong>
                  Terminal Layer
                </strong>

                <small>
                  Biometric gateways
                </small>
              </div>

              <span className="ad-health-ok">
                Ready
              </span>
            </div>
          </div>
        </article>
      </section>

      {/* CHART + SECURITY */}

      <section className="ad-main-grid">
        <article className="ad-panel">
          <div className="ad-panel-heading">
            <div>
              <span className="ad-eyebrow">
                Attendance performance
              </span>

              <h2>
                14-Day Attendance Trend
              </h2>

              <p>
                Percentage of users
                attending each recorded
                day.
              </p>
            </div>

            <span className="ad-chart-icon">
              <TrendingUp
                size={20}
              />
            </span>
          </div>

          <div className="ad-chart">
            {trend.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height={290}
              >
                <AreaChart
                  data={trend}
                >
                  <defs>
                    <linearGradient
                      id="adTrendFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#2563eb"
                        stopOpacity={
                          0.25
                        }
                      />

                      <stop
                        offset="100%"
                        stopColor="#2563eb"
                        stopOpacity={
                          0
                        }
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke="#e9eff7"
                  />

                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill:
                        "#64748b",
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    domain={[
                      0,
                      100,
                    ]}
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill:
                        "#94a3b8",
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    formatter={(
                      value
                    ) => [
                      `${value}%`,
                      "Attendance Rate",
                    ]}
                    contentStyle={{
                      border:
                        "1px solid #dce7f4",
                      borderRadius:
                        12,
                      fontSize: 10,
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fill="url(#adTrendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="ad-empty">
                No attendance trend
                available yet.
              </div>
            )}
          </div>
        </article>

        <div className="ad-right-stack">
          <article className="ad-panel ad-dispute-panel">
            <div className="ad-panel-heading">
              <div>
                <span className="ad-eyebrow">
                  Oversight
                </span>

                <h2>
                  Pending Disputes
                </h2>
              </div>

              <AlertTriangle
                size={20}
              />
            </div>

            <strong className="ad-large-number">
              {pendingDisputes.loading
                ? "—"
                : Number(
                    pendingDisputes.data
                  ) || 0}
            </strong>

            <p>
              Student attendance
              disputes currently awaiting
              teacher action.
            </p>

            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/disputes"
                )
              }
            >
              View Disputes
              <ArrowRight
                size={14}
              />
            </button>
          </article>

          <article className="ad-panel">
            <div className="ad-panel-heading">
              <div>
                <span className="ad-eyebrow">
                  Biometric traffic
                </span>

                <h2>
                  Authentication Methods
                </h2>
              </div>
            </div>

            <div className="ad-auth-list">
              <div>
                <span className="ad-auth-icon ad-auth-rfid">
                  <CreditCard
                    size={18}
                  />
                </span>

                <div>
                  <strong>
                    RFID
                  </strong>

                  <small>
                    Identity claim
                  </small>
                </div>

                <b>
                  {methods.rfid}
                </b>
              </div>

              <div>
                <span className="ad-auth-icon ad-auth-face">
                  <ScanFace
                    size={18}
                  />
                </span>

                <div>
                  <strong>
                    Face
                  </strong>

                  <small>
                    Biometric match
                  </small>
                </div>

                <b>
                  {methods.face}
                </b>
              </div>

              <div>
                <span className="ad-auth-icon ad-auth-finger">
                  <Fingerprint
                    size={18}
                  />
                </span>

                <div>
                  <strong>
                    Fingerprint
                  </strong>

                  <small>
                    Fallback method
                  </small>
                </div>

                <b>
                  {
                    methods.fingerprint
                  }
                </b>
              </div>
            </div>
          </article>
        </div>
      </section>

      {/* RECENT ACTIVITY */}

      <section className="ad-panel">
        <div className="ad-panel-heading">
          <div>
            <span className="ad-eyebrow">
              Live authentication feed
            </span>

            <h2>
              Recent Activity
            </h2>

            <p>
              Latest attendance
              authentication events.
            </p>
          </div>

          <button
            type="button"
            className="ad-view-button"
            onClick={() =>
              navigate(
                "/admin/attendance"
              )
            }
          >
            View all
            <ArrowRight
              size={14}
            />
          </button>
        </div>

        {attendance.error ? (
          <div className="ad-error">
            <AlertTriangle
              size={18}
            />

            Unable to load
            attendance records.

            <button
              type="button"
              onClick={
                attendance.retry
              }
            >
              <RefreshCw
                size={13}
              />
              Retry
            </button>
          </div>
        ) : recentActivity.length ===
          0 ? (
          <div className="ad-empty">
            No attendance activity
            recorded yet.
          </div>
        ) : (
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>
                    User
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Time
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Method
                  </th>
                </tr>
              </thead>

              <tbody>
                {recentActivity.map(
                  (row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="ad-user">
                          <span>
                            {(row.name ||
                              "U")
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </span>

                          <div>
                            <strong>
                              {row.name ||
                                "Unknown"}
                            </strong>

                            <small>
                              {row.studentId ||
                                row.userId ||
                                "No ID"}
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {
                          row.dateLabel
                        }
                      </td>

                      <td>
                        {
                          row.timeLabel
                        }
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            row.status
                          )}
                        >
                          {statusLabel(
                            row.status
                          )}
                        </span>
                      </td>

                      <td>
                        {methodLabel(
                          normalizeMethod(
                            row.method
                          )
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;