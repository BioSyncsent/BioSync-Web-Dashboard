import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Fingerprint,
  Radio,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  TrendingUp,
  Users,
  UserX,
} from "lucide-react";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  fetchAttendanceRecords,
  getRecentActivity,
  getSummary,
  getTrendData,
  getWeeklyChartData,
} from "../../services/attendanceService";

import "./Analytics.css";


function normalizeMethod(value) {
  const method =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    method.includes("face")
  ) {
    return "Face Recognition";
  }

  if (
    method.includes("rfid")
  ) {
    return "RFID";
  }

  if (
    method.includes("finger")
  ) {
    return "Fingerprint";
  }

  if (
    method.includes("manual")
  ) {
    return "Manual";
  }

  return value || "Unknown";
}


function normalizeVerification(value) {
  const result =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    result === "verified" ||
    result === "success"
  ) {
    return "Verified";
  }

  if (
    result === "manual"
  ) {
    return "Manual";
  }

  if (
    result === "flagged"
  ) {
    return "Flagged";
  }

  if (
    result === "failed" ||
    result === "rejected"
  ) {
    return "Failed";
  }

  return "Unknown";
}


function AdminAnalytics() {
  const [
    attendance,
    setAttendance,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  async function loadAttendance() {
    try {
      setLoading(true);
      setError("");

      const data =
        await fetchAttendanceRecords();

      setAttendance(data);
    } catch (loadError) {
      console.error(
        "Unable to load admin analytics:",
        loadError
      );

      setError(
        "Unable to load attendance analytics."
      );
    } finally {
      setLoading(false);
    }
  }


  useEffect(() => {
    loadAttendance();
  }, []);


  const summary =
    useMemo(
      () =>
        getSummary(
          attendance
        ),
      [
        attendance,
      ]
    );


  const weeklyData =
    useMemo(
      () =>
        getWeeklyChartData(
          attendance
        ),
      [
        attendance,
      ]
    );


  const trendData =
    useMemo(
      () =>
        getTrendData(
          attendance
        ),
      [
        attendance,
      ]
    );


  const recentActivity =
    useMemo(
      () =>
        getRecentActivity(
          attendance,
          8
        ),
      [
        attendance,
      ]
    );


  const attendanceRate =
    useMemo(() => {
      if (
        summary.total ===
        0
      ) {
        return 0;
      }

      const attended =
        summary.present +
        summary.late;

      return Number(
        (
          (
            attended /
            summary.total
          ) *
          100
        ).toFixed(1)
      );
    }, [
      summary,
    ]);


  const authMethodData =
    useMemo(() => {
      const counts = {};

      attendance.forEach(
        (record) => {
          const method =
            normalizeMethod(
              record.authMethod ||
                record.method
            );

          counts[method] =
            (
              counts[
                method
              ] || 0
            ) + 1;
        }
      );

      return Object.entries(
        counts
      )
        .map(
          ([
            name,
            value,
          ]) => ({
            name,
            value,
          })
        )
        .sort(
          (
            first,
            second
          ) =>
            second.value -
            first.value
        );
    }, [
      attendance,
    ]);


  const verificationData =
    useMemo(() => {
      const counts = {};

      attendance.forEach(
        (record) => {
          const result =
            normalizeVerification(
              record.verificationResult
            );

          counts[result] =
            (
              counts[
                result
              ] || 0
            ) + 1;
        }
      );

      return Object.entries(
        counts
      ).map(
        ([
          name,
          value,
        ]) => ({
          name,
          value,
        })
      );
    }, [
      attendance,
    ]);


  const departmentData =
    useMemo(() => {
      const map =
        new Map();

      attendance.forEach(
        (record) => {
          const department =
            record.department &&
            record.department !==
              "N/A"
              ? record.department
              : "Unassigned";

          if (
            !map.has(
              department
            )
          ) {
            map.set(
              department,
              {
                department,
                total: 0,
                attended: 0,
              }
            );
          }

          const entry =
            map.get(
              department
            );

          entry.total += 1;

          if (
            record.status ===
              "present" ||
            record.status ===
              "late"
          ) {
            entry.attended +=
              1;
          }
        }
      );

      return Array.from(
        map.values()
      )
        .map(
          (entry) => ({
            department:
              entry.department,

            rate:
              entry.total >
              0
                ? Number(
                    (
                      (
                        entry.attended /
                        entry.total
                      ) *
                      100
                    ).toFixed(
                      1
                    )
                  )
                : 0,

            total:
              entry.total,
          })
        )
        .sort(
          (
            first,
            second
          ) =>
            second.rate -
            first.rate
        );
    }, [
      attendance,
    ]);


  const needsAttention =
    useMemo(() => {
      return departmentData
        .filter(
          (item) =>
            item.total >
              0 &&
            item.rate < 80
        )
        .slice(
          0,
          5
        );
    }, [
      departmentData,
    ]);


  const metrics = [
    {
      label:
        "Total Records",

      value:
        summary.total,

      icon:
        Users,

      tone:
        "blue",

      helper:
        "All attendance records",
    },

    {
      label:
        "Present",

      value:
        summary.present,

      icon:
        CheckCircle2,

      tone:
        "green",

      helper:
        "Verified present records",
    },

    {
      label:
        "Late",

      value:
        summary.late,

      icon:
        Clock3,

      tone:
        "amber",

      helper:
        "Late attendance records",
    },

    {
      label:
        "Absent",

      value:
        summary.absent,

      icon:
        UserX,

      tone:
        "red",

      helper:
        "Recorded absences",
    },

    {
      label:
        "Attendance Rate",

      value:
        `${attendanceRate}%`,

      icon:
        TrendingUp,

      tone:
        "cyan",

      helper:
        "Present + late",
    },
  ];


  if (loading) {
    return (
      <div className="admin-analytics-page aaa-loading">
        <div className="aaa-spinner" />

        <strong>
          Loading analytics
        </strong>

        <span>
          Processing attendance
          records...
        </span>
      </div>
    );
  }


  return (
    <div className="admin-analytics-page">

      {/* HERO */}

      <section className="aaa-hero">
        <div className="aaa-hero-grid" />

        <div className="aaa-hero-glow" />

        <div className="aaa-hero-content">
          <span className="aaa-eyebrow">
            <ShieldCheck
              size={14}
            />

            BioSync Intelligence
          </span>

          <h1>
            System Analytics
          </h1>

          <p>
            Analyse attendance
            performance,
            authentication activity
            and department trends
            across the BioSync
            Sentinel environment.
          </p>

          <div className="aaa-hero-meta">
            <span>
              <Activity
                size={14}
              />

              {
                attendance.length
              }{" "}
              records analysed
            </span>

            <span>
              <Fingerprint
                size={14}
              />

              Biometric activity
            </span>

            <span>
              <BarChart3
                size={14}
              />

              Live operational
              insights
            </span>
          </div>
        </div>


        <div className="aaa-score-card">
          <div
            className="aaa-score-ring"
            style={{
              "--aaa-score":
                `${Math.min(
                  attendanceRate,
                  100
                )}%`,
            }}
          >
            <div>
              <strong>
                {
                  attendanceRate
                }
                %
              </strong>

              <span>
                Attendance
              </span>
            </div>
          </div>

          <strong>
            System performance
          </strong>

          <small>
            Overall attendance
            coverage
          </small>
        </div>
      </section>


      {error && (
        <div className="aaa-error">
          <AlertTriangle
            size={17}
          />

          <div>
            <strong>
              Analytics unavailable
            </strong>

            <span>
              {error}
            </span>
          </div>

          <button
            type="button"
            onClick={
              loadAttendance
            }
          >
            <RefreshCw
              size={14}
            />

            Retry
          </button>
        </div>
      )}


      {/* METRICS */}

      <section className="aaa-metric-grid">
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
              className={`aaa-metric aaa-metric-${tone}`}
            >
              <div className="aaa-metric-glow" />

              <span className="aaa-metric-icon">
                <Icon
                  size={19}
                />
              </span>

              <div>
                <span>
                  {label}
                </span>

                <strong>
                  {value}
                </strong>

                <small>
                  {helper}
                </small>
              </div>
            </article>
          )
        )}
      </section>


      {/* MAIN CHARTS */}

      <section className="aaa-main-grid">

        {/* 7 DAY */}

        <article className="aaa-card">
          <div className="aaa-card-header">
            <div>
              <span>
                Attendance Activity
              </span>

              <h2>
                Weekly Attendance
              </h2>

              <p>
                Present, late and
                absent records across
                the last seven days.
              </p>
            </div>

            <div className="aaa-header-icon">
              <BarChart3
                size={19}
              />
            </div>
          </div>

          <div className="aaa-chart">
            <ResponsiveContainer
              width="100%"
              height={290}
            >
              <BarChart
                data={weeklyData}
                barGap={5}
              >
                <CartesianGrid
                  vertical={
                    false
                  }
                  stroke="#e9eff7"
                  strokeDasharray="4 4"
                />

                <XAxis
                  dataKey="day"
                  axisLine={
                    false
                  }
                  tickLine={
                    false
                  }
                  tick={{
                    fontSize:
                      10,
                    fill:
                      "#64748b",
                  }}
                />

                <YAxis
                  allowDecimals={
                    false
                  }
                  axisLine={
                    false
                  }
                  tickLine={
                    false
                  }
                  tick={{
                    fontSize:
                      10,
                    fill:
                      "#94a3b8",
                  }}
                />

                <Tooltip />

                <Bar
                  dataKey="present"
                  fill="#2563eb"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="late"
                  fill="#f59e0b"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />

                <Bar
                  dataKey="absent"
                  fill="#ef4444"
                  radius={[
                    6,
                    6,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>


        {/* AUTH METHODS */}

        <article className="aaa-card">
          <div className="aaa-card-header">
            <div>
              <span>
                Biometric Traffic
              </span>

              <h2>
                Authentication Methods
              </h2>
            </div>

            <div className="aaa-header-icon">
              <Fingerprint
                size={19}
              />
            </div>
          </div>

          {authMethodData.length >
          0 ? (
            <div className="aaa-pie-layout">
              <ResponsiveContainer
                width="100%"
                height={230}
              >
                <PieChart>
                  <Pie
                    data={
                      authMethodData
                    }
                    dataKey="value"
                    nameKey="name"
                    innerRadius={
                      58
                    }
                    outerRadius={
                      88
                    }
                    paddingAngle={
                      4
                    }
                  >
                    {authMethodData.map(
                      (
                        item,
                        index
                      ) => (
                        <Cell
                          key={
                            item.name
                          }
                          fill={
                            [
                              "#2563eb",
                              "#06b6d4",
                              "#9333ea",
                              "#f59e0b",
                              "#64748b",
                            ][
                              index %
                                5
                            ]
                          }
                        />
                      )
                    )}
                  </Pie>

                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>

              <div className="aaa-method-list">
                {authMethodData.map(
                  (
                    method
                  ) => (
                    <div
                      key={
                        method.name
                      }
                    >
                      <span>
                        {
                          method.name
                        }
                      </span>

                      <strong>
                        {
                          method.value
                        }
                      </strong>
                    </div>
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="aaa-empty">
              No authentication
              records available.
            </div>
          )}
        </article>
      </section>


      {/* TREND */}

      <section className="aaa-card">
        <div className="aaa-card-header">
          <div>
            <span>
              Performance Trend
            </span>

            <h2>
              14-Day Attendance Trend
            </h2>

            <p>
              Daily attendance
              movement across the
              most recent two weeks.
            </p>
          </div>

          <div className="aaa-header-icon">
            <TrendingUp
              size={19}
            />
          </div>
        </div>

        <div className="aaa-chart">
          <ResponsiveContainer
            width="100%"
            height={300}
          >
            <AreaChart
              data={trendData}
            >
              <defs>
                <linearGradient
                  id="aaaPresentFill"
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
                vertical={
                  false
                }
                stroke="#e9eff7"
                strokeDasharray="4 4"
              />

              <XAxis
                dataKey="date"
                axisLine={
                  false
                }
                tickLine={
                  false
                }
                tick={{
                  fontSize:
                    9,
                  fill:
                    "#64748b",
                }}
              />

              <YAxis
                allowDecimals={
                  false
                }
                axisLine={
                  false
                }
                tickLine={
                  false
                }
                tick={{
                  fontSize:
                    9,
                  fill:
                    "#94a3b8",
                }}
              />

              <Tooltip />

              <Area
                type="monotone"
                dataKey="present"
                stroke="#2563eb"
                strokeWidth={
                  3
                }
                fill="url(#aaaPresentFill)"
              />

              <Area
                type="monotone"
                dataKey="late"
                stroke="#f59e0b"
                strokeWidth={
                  2
                }
                fillOpacity={
                  0
                }
              />

              <Area
                type="monotone"
                dataKey="absent"
                stroke="#ef4444"
                strokeWidth={
                  2
                }
                fillOpacity={
                  0
                }
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>


      {/* LOWER GRID */}

      <section className="aaa-lower-grid">

        {/* VERIFICATION */}

        <article className="aaa-card">
          <div className="aaa-card-header">
            <div>
              <span>
                Verification
              </span>

              <h2>
                Verification Results
              </h2>
            </div>

            <div className="aaa-header-icon">
              <ShieldCheck
                size={19}
              />
            </div>
          </div>

          <div className="aaa-verification-list">
            {verificationData.map(
              (
                result
              ) => (
                <div
                  key={
                    result.name
                  }
                >
                  <span
                    className={`aaa-verification-dot aaa-verification-${result.name
                      .toLowerCase()
                      .replace(
                        " ",
                        "-"
                      )}`}
                  />

                  <span>
                    {
                      result.name
                    }
                  </span>

                  <strong>
                    {
                      result.value
                    }
                  </strong>
                </div>
              )
            )}
          </div>
        </article>


        {/* DEPARTMENT PERFORMANCE */}

        <article className="aaa-card">
          <div className="aaa-card-header">
            <div>
              <span>
                Department Insights
              </span>

              <h2>
                Department Performance
              </h2>
            </div>

            <div className="aaa-header-icon">
              <Users
                size={19}
              />
            </div>
          </div>

          <div className="aaa-department-list">
            {departmentData.length ===
            0 ? (
              <div className="aaa-empty">
                No department data
                available.
              </div>
            ) : (
              departmentData
                .slice(
                  0,
                  6
                )
                .map(
                  (
                    item
                  ) => (
                    <div
                      key={
                        item.department
                      }
                    >
                      <div>
                        <strong>
                          {
                            item.department
                          }
                        </strong>

                        <small>
                          {
                            item.total
                          }{" "}
                          records
                        </small>
                      </div>

                      <span
                        className={`aaa-rate ${
                          item.rate <
                          80
                            ? "aaa-rate-danger"
                            : item.rate <
                                90
                              ? "aaa-rate-warning"
                              : "aaa-rate-good"
                        }`}
                      >
                        {
                          item.rate
                        }
                        %
                      </span>
                    </div>
                  )
                )
            )}
          </div>
        </article>


        {/* ATTENTION */}

        <article className="aaa-card aaa-attention-card">
          <div className="aaa-card-header">
            <div>
              <span>
                Requires Attention
              </span>

              <h2>
                Low Attendance Areas
              </h2>
            </div>

            <div className="aaa-header-icon aaa-header-warning">
              <AlertTriangle
                size={19}
              />
            </div>
          </div>

          {needsAttention.length ===
          0 ? (
            <div className="aaa-good-state">
              <CheckCircle2
                size={24}
              />

              <strong>
                No critical
                departments
              </strong>

              <span>
                All departments with
                attendance data are
                currently at or above
                80%.
              </span>
            </div>
          ) : (
            <div className="aaa-attention-list">
              {needsAttention.map(
                (
                  item
                ) => (
                  <div
                    key={
                      item.department
                    }
                  >
                    <div>
                      <strong>
                        {
                          item.department
                        }
                      </strong>

                      <small>
                        Below 80%
                        attendance
                      </small>
                    </div>

                    <span>
                      {
                        item.rate
                      }
                      %
                    </span>
                  </div>
                )
              )}
            </div>
          )}
        </article>
      </section>


      {/* RECENT ACTIVITY */}

      <section className="aaa-card">
        <div className="aaa-card-header">
          <div>
            <span>
              Live Activity
            </span>

            <h2>
              Recent Attendance
            </h2>

            <p>
              Latest attendance
              events recorded across
              the system.
            </p>
          </div>
        </div>

        <div className="aaa-table-scroll">
          <table className="aaa-table">
            <thead>
              <tr>
                <th>
                  User
                </th>

                <th>
                  Department
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
                  Authentication
                </th>
              </tr>
            </thead>

            <tbody>
              {recentActivity.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="6"
                    className="aaa-table-empty"
                  >
                    No recent
                    attendance records.
                  </td>
                </tr>
              ) : (
                recentActivity.map(
                  (
                    record
                  ) => (
                    <tr
                      key={
                        record.id
                      }
                    >
                      <td>
                        <div className="aaa-user-cell">
                          <span>
                            {(record.name ||
                              "U")
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </span>

                          <div>
                            <strong>
                              {
                                record.name
                              }
                            </strong>

                            <small>
                              {
                                record.studentId
                              }
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        {
                          record.department
                        }
                      </td>

                      <td>
                        {
                          record.dateLabel
                        }
                      </td>

                      <td>
                        {
                          record.timeLabel
                        }
                      </td>

                      <td>
                        <span
                          className={`aaa-status aaa-status-${record.status}`}
                        >
                          {
                            record.status
                          }
                        </span>
                      </td>

                      <td>
                        <span className="aaa-method-badge">
                          {normalizeMethod(
                            record.authMethod ||
                              record.method
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default AdminAnalytics;