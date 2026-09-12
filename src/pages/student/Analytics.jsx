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
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Fingerprint,
  ShieldCheck,
  Target,
  TrendingUp,
  XCircle,
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
  db,
} from "../../firebase/firebase";

import {
  useAuth,
} from "../../contexts/AuthContext";

import "./Analytics.css";


function toDate(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const parsed =
    new Date(value);

  return Number.isNaN(
    parsed.getTime()
  )
    ? null
    : parsed;
}


function normalizeStatus(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}


function normalizeMethod(value) {
  const method =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    method.includes("finger")
  ) {
    return "Fingerprint";
  }

  if (
    method.includes("face")
  ) {
    return "Face";
  }

  if (
    method.includes("rfid")
  ) {
    return "RFID";
  }

  if (
    method.includes("manual")
  ) {
    return "Manual";
  }

  return method
    ? value
    : "Unknown";
}


function getRiskLevel(rate) {
  if (rate >= 90) {
    return {
      label: "Excellent",
      className:
        "sta-risk-excellent",
      message:
        "Your attendance performance is excellent.",
    };
  }

  if (rate >= 80) {
    return {
      label: "Monitor",
      className:
        "sta-risk-warning",
      message:
        "Your attendance is acceptable, but keep monitoring it.",
    };
  }

  return {
    label: "At Risk",
    className:
      "sta-risk-critical",
    message:
      "Your attendance is below the recommended 80% level.",
  };
}


function StudentAnalytics() {
  const {
    user,
  } = useAuth();

  const [
    attendance,
    setAttendance,
  ] = useState([]);

  const [
    disputes,
    setDisputes,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

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

        const disputeQuery =
          query(
            collection(
              db,
              "disputes"
            ),
            where(
              "userId",
              "==",
              user.uid
            )
          );

        const [
          attendanceSnapshot,
          disputeSnapshot,
        ] =
          await Promise.all([
            getDocs(
              attendanceQuery
            ),
            getDocs(
              disputeQuery
            ),
          ]);

        const attendanceRecords =
          attendanceSnapshot.docs.map(
            (document) => ({
              id:
                document.id,
              ...document.data(),
            })
          );

        attendanceRecords.sort(
          (
            first,
            second
          ) => {
            const firstDate =
              toDate(
                first.timestamp
              )?.getTime() ||
              0;

            const secondDate =
              toDate(
                second.timestamp
              )?.getTime() ||
              0;

            return (
              secondDate -
              firstDate
            );
          }
        );

        const disputeRecords =
          disputeSnapshot.docs.map(
            (document) => ({
              id:
                document.id,
              ...document.data(),
            })
          );

        if (!cancelled) {
          setAttendance(
            attendanceRecords
          );

          setDisputes(
            disputeRecords
          );
        }
      } catch (loadError) {
        console.error(
          "Unable to load student analytics:",
          loadError
        );

        if (!cancelled) {
          setError(
            "Unable to load your analytics data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [
    user?.uid,
  ]);


  const summary =
    useMemo(() => {
      const total =
        attendance.length;

      const present =
        attendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "present"
        ).length;

      const late =
        attendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "late"
        ).length;

      const absent =
        attendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "absent"
        ).length;

      const excused =
        attendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "excused"
        ).length;

      const attended =
        present + late;

      const rate =
        total > 0
          ? Number(
              (
                (
                  attended /
                  total
                ) *
                100
              ).toFixed(1)
            )
          : 0;

      return {
        total,
        present,
        late,
        absent,
        excused,
        rate,
      };
    }, [
      attendance,
    ]);


  const monthlyTrend =
    useMemo(() => {
      const groups =
        new Map();

      attendance.forEach(
        (record) => {
          const date =
            toDate(
              record.timestamp
            );

          if (!date) {
            return;
          }

          const key =
            `${date.getFullYear()}-${String(
              date.getMonth() +
                1
            ).padStart(
              2,
              "0"
            )}`;

          if (
            !groups.has(key)
          ) {
            groups.set(
              key,
              {
                month:
                  date.toLocaleDateString(
                    "en-MY",
                    {
                      month:
                        "short",
                      year:
                        "2-digit",
                    }
                  ),
                total: 0,
                attended: 0,
              }
            );
          }

          const entry =
            groups.get(key);

          entry.total += 1;

          const status =
            normalizeStatus(
              record.status
            );

          if (
            status ===
              "present" ||
            status === "late"
          ) {
            entry.attended +=
              1;
          }
        }
      );

      return Array.from(
        groups.entries()
      )
        .sort(
          (
            first,
            second
          ) =>
            first[0].localeCompare(
              second[0]
            )
        )
        .slice(-8)
        .map(
          ([
            ,
            entry,
          ]) => ({
            month:
              entry.month,
            rate:
              entry.total > 0
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
          })
        );
    }, [
      attendance,
    ]);


  const lateTrend =
    useMemo(() => {
      const groups =
        new Map();

      attendance.forEach(
        (record) => {
          const date =
            toDate(
              record.timestamp
            );

          if (!date) {
            return;
          }

          const key =
            `${date.getFullYear()}-${String(
              date.getMonth() +
                1
            ).padStart(
              2,
              "0"
            )}`;

          if (
            !groups.has(key)
          ) {
            groups.set(
              key,
              {
                month:
                  date.toLocaleDateString(
                    "en-MY",
                    {
                      month:
                        "short",
                    }
                  ),
                late: 0,
              }
            );
          }

          if (
            normalizeStatus(
              record.status
            ) === "late"
          ) {
            groups.get(
              key
            ).late += 1;
          }
        }
      );

      return Array.from(
        groups.entries()
      )
        .sort(
          (
            first,
            second
          ) =>
            first[0].localeCompare(
              second[0]
            )
        )
        .slice(-6)
        .map(
          ([
            ,
            value,
          ]) => value
        );
    }, [
      attendance,
    ]);


  const authData =
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


  const disputeSummary =
    useMemo(() => {
      const result = {
        total:
          disputes.length,
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      disputes.forEach(
        (record) => {
          const status =
            normalizeStatus(
              record.status
            );

          if (
            status ===
              "pending" ||
            status ===
              "under_review"
          ) {
            result.pending +=
              1;
          }

          if (
            status ===
            "approved"
          ) {
            result.approved +=
              1;
          }

          if (
            status ===
            "rejected"
          ) {
            result.rejected +=
              1;
          }
        }
      );

      return result;
    }, [
      disputes,
    ]);


  const recentRecords =
    useMemo(
      () =>
        attendance.slice(
          0,
          8
        ),
      [
        attendance,
      ]
    );


  const risk =
    getRiskLevel(
      summary.rate
    );

  const goal = 85;

  const goalProgress =
    Math.min(
      summary.rate,
      100
    );


  if (loading) {
    return (
      <div className="student-analytics-page sta-loading">
        <div className="sta-spinner" />

        <span>
          Loading your analytics...
        </span>
      </div>
    );
  }


  return (
    <div className="student-analytics-page">
      <section className="sta-hero">
        <div className="sta-hero-grid" />

        <div className="sta-hero-copy">
          <div className="sta-eyebrow">
            <TrendingUp
              size={14}
            />

            Personal Analytics
          </div>

          <h1>
            Attendance Insights
          </h1>

          <p>
            Understand your
            attendance performance,
            verification activity and
            dispute history using
            your BioSync records.
          </p>

          <div className="sta-hero-meta">
            <span>
              <ShieldCheck
                size={14}
              />

              Personal data only
            </span>

            <span>
              <Fingerprint
                size={14}
              />

              Biometric activity
            </span>
          </div>
        </div>

        <div className="sta-score">
          <div className="sta-score-ring">
            <div>
              <strong>
                {summary.rate}%
              </strong>

              <span>
                Attendance
              </span>
            </div>
          </div>

          <span
            className={`sta-risk-badge ${risk.className}`}
          >
            {risk.label}
          </span>
        </div>
      </section>


      {error && (
        <div className="sta-error">
          <AlertTriangle
            size={18}
          />

          {error}
        </div>
      )}


      <section className="sta-metrics">
        <article className="sta-metric sta-blue">
          <BarChart3
            size={19}
          />

          <div>
            <span>
              Total Records
            </span>

            <strong>
              {summary.total}
            </strong>
          </div>
        </article>

        <article className="sta-metric sta-green">
          <CheckCircle2
            size={19}
          />

          <div>
            <span>
              Present
            </span>

            <strong>
              {summary.present}
            </strong>
          </div>
        </article>

        <article className="sta-metric sta-amber">
          <Clock3
            size={19}
          />

          <div>
            <span>
              Late
            </span>

            <strong>
              {summary.late}
            </strong>
          </div>
        </article>

        <article className="sta-metric sta-red">
          <XCircle
            size={19}
          />

          <div>
            <span>
              Absent
            </span>

            <strong>
              {summary.absent}
            </strong>
          </div>
        </article>
      </section>


      <section
        className={`sta-risk-card ${risk.className}`}
      >
        <AlertTriangle
          size={21}
        />

        <div>
          <strong>
            {risk.label}
          </strong>

          <p>
            {risk.message}
          </p>
        </div>
      </section>


      <section className="sta-main-grid">
        <article className="sta-card">
          <div className="sta-card-heading">
            <div>
              <span>
                Performance
              </span>

              <h2>
                Monthly Attendance
              </h2>

              <p>
                Your attendance rate
                across recent months.
              </p>
            </div>

            <TrendingUp
              size={19}
            />
          </div>

          <div className="sta-chart">
            {monthlyTrend.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height={280}
              >
                <AreaChart
                  data={
                    monthlyTrend
                  }
                >
                  <defs>
                    <linearGradient
                      id="studentAnalyticsFill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#2563eb"
                        stopOpacity={
                          0.28
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
                  />

                  <XAxis
                    dataKey="month"
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
                    domain={[
                      0,
                      100,
                    ]}
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

                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#2563eb"
                    strokeWidth={
                      3
                    }
                    fill="url(#studentAnalyticsFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="sta-empty">
                Not enough data
                for a monthly trend.
              </div>
            )}
          </div>
        </article>


        <div className="sta-side-stack">
          <article className="sta-card">
            <div className="sta-card-heading">
              <div>
                <span>
                  Goal
                </span>

                <h2>
                  Attendance Target
                </h2>
              </div>

              <Target
                size={19}
              />
            </div>

            <div className="sta-goal-values">
              <div>
                <span>
                  Current
                </span>

                <strong>
                  {summary.rate}%
                </strong>
              </div>

              <div>
                <span>
                  Target
                </span>

                <strong>
                  {goal}%
                </strong>
              </div>
            </div>

            <div className="sta-goal-track">
              <div
                className="sta-goal-fill"
                style={{
                  width: `${goalProgress}%`,
                }}
              />
            </div>

            <p className="sta-goal-message">
              {summary.rate >=
              goal
                ? "You are currently meeting your attendance target."
                : `You are ${(
                    goal -
                    summary.rate
                  ).toFixed(
                    1
                  )}% below your target.`}
            </p>
          </article>


          <article className="sta-card">
            <div className="sta-card-heading">
              <div>
                <span>
                  Disputes
                </span>

                <h2>
                  Dispute Summary
                </h2>
              </div>
            </div>

            <div className="sta-dispute-grid">
              <div>
                <strong>
                  {
                    disputeSummary.total
                  }
                </strong>

                <span>
                  Total
                </span>
              </div>

              <div>
                <strong>
                  {
                    disputeSummary.pending
                  }
                </strong>

                <span>
                  Pending
                </span>
              </div>

              <div>
                <strong>
                  {
                    disputeSummary.approved
                  }
                </strong>

                <span>
                  Approved
                </span>
              </div>

              <div>
                <strong>
                  {
                    disputeSummary.rejected
                  }
                </strong>

                <span>
                  Rejected
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>


      <section className="sta-two-grid">
        <article className="sta-card">
          <div className="sta-card-heading">
            <div>
              <span>
                Security
              </span>

              <h2>
                Authentication Methods
              </h2>
            </div>

            <Fingerprint
              size={19}
            />
          </div>

          {authData.length >
          0 ? (
            <div className="sta-pie-layout">
              <ResponsiveContainer
                width="100%"
                height={220}
              >
                <PieChart>
                  <Pie
                    data={
                      authData
                    }
                    dataKey="value"
                    nameKey="name"
                    innerRadius={
                      55
                    }
                    outerRadius={
                      83
                    }
                    paddingAngle={
                      4
                    }
                  >
                    {authData.map(
                      (
                        entry,
                        index
                      ) => (
                        <Cell
                          key={
                            entry.name
                          }
                          fill={
                            [
                              "#2563eb",
                              "#06b6d4",
                              "#7c3aed",
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

              <div className="sta-method-list">
                {authData.map(
                  (method) => (
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
            <div className="sta-empty">
              No authentication
              activity yet.
            </div>
          )}
        </article>


        <article className="sta-card">
          <div className="sta-card-heading">
            <div>
              <span>
                Punctuality
              </span>

              <h2>
                Late Arrivals
              </h2>
            </div>

            <Clock3
              size={19}
            />
          </div>

          <div className="sta-chart">
            <ResponsiveContainer
              width="100%"
              height={220}
            >
              <BarChart
                data={lateTrend}
              >
                <CartesianGrid
                  vertical={
                    false
                  }
                  stroke="#e9eff7"
                />

                <XAxis
                  dataKey="month"
                  axisLine={
                    false
                  }
                  tickLine={
                    false
                  }
                  tick={{
                    fontSize:
                      10,
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
                  }}
                />

                <Tooltip />

                <Bar
                  dataKey="late"
                  fill="#f59e0b"
                  radius={[
                    5,
                    5,
                    0,
                    0,
                  ]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>


      <section className="sta-card sta-table-card">
        <div className="sta-card-heading">
          <div>
            <span>
              Recent History
            </span>

            <h2>
              Recent Attendance
            </h2>
          </div>
        </div>

        <div className="sta-table-scroll">
          <table className="sta-table">
            <thead>
              <tr>
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
              {recentRecords.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="sta-table-empty"
                  >
                    No attendance
                    records yet.
                  </td>
                </tr>
              ) : (
                recentRecords.map(
                  (record) => {
                    const date =
                      toDate(
                        record.timestamp
                      );

                    return (
                      <tr
                        key={
                          record.id
                        }
                      >
                        <td>
                          {date
                            ? date.toLocaleDateString(
                                "en-MY"
                              )
                            : "N/A"}
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
                          <span
                            className={`sta-status sta-status-${normalizeStatus(
                              record.status
                            )}`}
                          >
                            {record.status ||
                              "Unknown"}
                          </span>
                        </td>

                        <td>
                          {normalizeMethod(
                            record.authMethod ||
                              record.method
                          )}
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
    </div>
  );
}

export default StudentAnalytics;