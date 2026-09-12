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
  GraduationCap,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Users,
  UserX,
} from "lucide-react";

import {
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
  Area,
  AreaChart,
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
  const text =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    text.includes("finger")
  ) {
    return "Fingerprint";
  }

  if (
    text.includes("face")
  ) {
    return "Face";
  }

  if (
    text.includes("rfid")
  ) {
    return "RFID";
  }

  if (
    text.includes("manual")
  ) {
    return "Manual";
  }

  return value || "Unknown";
}


function TeacherAnalytics() {
  const {
    user,
  } = useAuth();

  const [
    students,
    setStudents,
  ] = useState({});

  const [
    attendance,
    setAttendance,
  ] = useState([]);

  const [
    disputes,
    setDisputes,
  ] = useState([]);

  const [
    period,
    setPeriod,
  ] = useState("all");

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  useEffect(() => {
    if (!user?.department) {
      setStudents({});
      setAttendance([]);
      setDisputes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      try {
        setLoading(true);
        setError("");

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

        const studentSnapshot =
          await getDocs(
            studentQuery
          );

        const studentMap = {};

        studentSnapshot.docs.forEach(
          (document) => {
            studentMap[
              document.id
            ] = {
              uid:
                document.id,
              ...document.data(),
            };
          }
        );

        const studentIds =
          Object.keys(
            studentMap
          );

        const attendanceResults =
          await Promise.all(
            studentIds.map(
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

        const disputeQuery =
          query(
            collection(
              db,
              "disputes"
            ),
            where(
              "department",
              "==",
              user.department
            )
          );

        const disputeSnapshot =
          await getDocs(
            disputeQuery
          );

        if (!cancelled) {
          setStudents(
            studentMap
          );

          setAttendance(
            attendanceResults.flat()
          );

          setDisputes(
            disputeSnapshot.docs.map(
              (
                document
              ) => ({
                id:
                  document.id,
                ...document.data(),
              })
            )
          );
        }
      } catch (loadError) {
        console.error(
          "Unable to load teacher analytics:",
          loadError
        );

        if (!cancelled) {
          setError(
            "Unable to load department analytics."
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
    user?.department,
  ]);


  const filteredAttendance =
    useMemo(() => {
      if (
        period === "all"
      ) {
        return attendance;
      }

      const now =
        new Date();

      const start =
        new Date(now);

      if (
        period === "7d"
      ) {
        start.setDate(
          now.getDate() -
            7
        );
      }

      if (
        period === "30d"
      ) {
        start.setDate(
          now.getDate() -
            30
        );
      }

      if (
        period === "90d"
      ) {
        start.setDate(
          now.getDate() -
            90
        );
      }

      return attendance.filter(
        (record) => {
          const date =
            toDate(
              record.timestamp
            );

          return (
            date &&
            date >= start
          );
        }
      );
    }, [
      attendance,
      period,
    ]);


  const summary =
    useMemo(() => {
      const total =
        filteredAttendance.length;

      const present =
        filteredAttendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "present"
        ).length;

      const late =
        filteredAttendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "late"
        ).length;

      const absent =
        filteredAttendance.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "absent"
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
        rate,
      };
    }, [
      filteredAttendance,
    ]);


  const studentPerformance =
    useMemo(() => {
      const map =
        new Map();

      Object.values(
        students
      ).forEach(
        (student) => {
          map.set(
            student.uid,
            {
              uid:
                student.uid,
              name:
                `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
                student.fullName ||
                "Unknown Student",
              studentId:
                student.studentId ||
                "N/A",
              present: 0,
              late: 0,
              absent: 0,
              total: 0,
            }
          );
        }
      );

      filteredAttendance.forEach(
        (record) => {
          const entry =
            map.get(
              record.userId
            );

          if (!entry) {
            return;
          }

          entry.total += 1;

          const status =
            normalizeStatus(
              record.status
            );

          if (
            status ===
            "present"
          ) {
            entry.present +=
              1;
          }

          if (
            status === "late"
          ) {
            entry.late +=
              1;
          }

          if (
            status ===
            "absent"
          ) {
            entry.absent +=
              1;
          }
        }
      );

      return Array.from(
        map.values()
      )
        .map(
          (entry) => ({
            ...entry,
            rate:
              entry.total > 0
                ? Number(
                    (
                      (
                        (
                          entry.present +
                          entry.late
                        ) /
                        entry.total
                      ) *
                      100
                    ).toFixed(
                      1
                    )
                  )
                : 0,
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
      students,
      filteredAttendance,
    ]);


  const atRiskStudents =
    useMemo(
      () =>
        studentPerformance
          .filter(
            (student) =>
              student.total >
                0 &&
              student.rate <
                80
          )
          .sort(
            (
              first,
              second
            ) =>
              first.rate -
              second.rate
          ),
      [
        studentPerformance,
      ]
    );


  const lateStudents =
    useMemo(
      () =>
        [
          ...studentPerformance,
        ]
          .filter(
            (student) =>
              student.late >
              0
          )
          .sort(
            (
              first,
              second
            ) =>
              second.late -
              first.late
          )
          .slice(0, 5),
      [
        studentPerformance,
      ]
    );


  const trendData =
    useMemo(() => {
      const groups =
        new Map();

      filteredAttendance.forEach(
        (record) => {
          const date =
            toDate(
              record.timestamp
            );

          if (!date) {
            return;
          }

          const key =
            date
              .toISOString()
              .slice(
                0,
                10
              );

          if (
            !groups.has(key)
          ) {
            groups.set(
              key,
              {
                date:
                  date.toLocaleDateString(
                    "en-MY",
                    {
                      day:
                        "2-digit",
                      month:
                        "short",
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
        .slice(-14)
        .map(
          ([
            ,
            entry,
          ]) => ({
            date:
              entry.date,
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
      filteredAttendance,
    ]);


  const statusDistribution =
    [
      {
        name: "Present",
        value:
          summary.present,
      },
      {
        name: "Late",
        value:
          summary.late,
      },
      {
        name: "Absent",
        value:
          summary.absent,
      },
    ];


  const authMethods =
    useMemo(() => {
      const counts = {};

      filteredAttendance.forEach(
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
      filteredAttendance,
    ]);


  const disputeSummary =
    useMemo(() => {
      return disputes.reduce(
        (
          result,
          dispute
        ) => {
          result.total +=
            1;

          const status =
            normalizeStatus(
              dispute.status
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

          return result;
        },
        {
          total: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
        }
      );
    }, [
      disputes,
    ]);


  if (loading) {
    return (
      <div className="teacher-analytics-page taa-loading">
        <div className="taa-spinner" />

        <span>
          Analysing department
          attendance...
        </span>
      </div>
    );
  }


  return (
    <div className="teacher-analytics-page">
      <section className="taa-hero">
        <div className="taa-hero-grid" />

        <div className="taa-hero-copy">
          <span className="taa-eyebrow">
            <GraduationCap
              size={14}
            />

            Department Intelligence
          </span>

          <h1>
            Attendance Analytics
          </h1>

          <p>
            Track attendance
            performance, identify
            students requiring
            attention and review
            biometric activity for{" "}
            <strong>
              {user?.department ||
                "your department"}
            </strong>
            .
          </p>

          <div className="taa-meta">
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

              {
                Object.keys(
                  students
                ).length
              }{" "}
              students
            </span>
          </div>
        </div>

        <div className="taa-rate">
          <strong>
            {summary.rate}%
          </strong>

          <span>
            Department Rate
          </span>
        </div>
      </section>


      {error && (
        <div className="taa-error">
          <AlertTriangle
            size={18}
          />

          {error}
        </div>
      )}


      <section className="taa-toolbar">
        <div>
          <strong>
            Analytics Period
          </strong>

          <span>
            Change the reporting
            window for attendance
            calculations.
          </span>
        </div>

        <select
          value={period}
          onChange={(
            event
          ) =>
            setPeriod(
              event.target.value
            )
          }
        >
          <option value="all">
            All Records
          </option>

          <option value="7d">
            Last 7 Days
          </option>

          <option value="30d">
            Last 30 Days
          </option>

          <option value="90d">
            Last 90 Days
          </option>
        </select>
      </section>


      <section className="taa-metrics">
        <article className="taa-metric taa-blue">
          <Users size={19} />

          <div>
            <span>
              Students
            </span>

            <strong>
              {
                Object.keys(
                  students
                ).length
              }
            </strong>
          </div>
        </article>

        <article className="taa-metric taa-green">
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

        <article className="taa-metric taa-amber">
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

        <article className="taa-metric taa-red">
          <UserX
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

        <article className="taa-metric taa-purple">
          <AlertTriangle
            size={19}
          />

          <div>
            <span>
              At Risk
            </span>

            <strong>
              {
                atRiskStudents.length
              }
            </strong>
          </div>
        </article>
      </section>


      <section className="taa-main-grid">
        <article className="taa-card">
          <div className="taa-card-heading">
            <div>
              <span>
                Performance
              </span>

              <h2>
                Department Trend
              </h2>

              <p>
                Attendance rate
                across recent
                recorded days.
              </p>
            </div>

            <TrendingUp
              size={19}
            />
          </div>

          <div className="taa-chart">
            {trendData.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height={285}
              >
                <AreaChart
                  data={
                    trendData
                  }
                >
                  <defs>
                    <linearGradient
                      id="teacherTrendFill"
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
                        9,
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
                    fill="url(#teacherTrendFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="taa-empty">
                No trend data
                available.
              </div>
            )}
          </div>
        </article>


        <article className="taa-card">
          <div className="taa-card-heading">
            <div>
              <span>
                Distribution
              </span>

              <h2>
                Attendance Status
              </h2>
            </div>

            <BarChart3
              size={19}
            />
          </div>

          <ResponsiveContainer
            width="100%"
            height={250}
          >
            <PieChart>
              <Pie
                data={
                  statusDistribution
                }
                dataKey="value"
                nameKey="name"
                innerRadius={
                  60
                }
                outerRadius={
                  88
                }
                paddingAngle={
                  4
                }
              >
                <Cell
                  fill="#22c55e"
                />

                <Cell
                  fill="#f59e0b"
                />

                <Cell
                  fill="#ef4444"
                />
              </Pie>

              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="taa-legend">
            {statusDistribution.map(
              (
                item,
                index
              ) => (
                <div
                  key={
                    item.name
                  }
                >
                  <span
                    className={`taa-legend-dot taa-dot-${index}`}
                  />

                  <span>
                    {
                      item.name
                    }
                  </span>

                  <strong>
                    {
                      item.value
                    }
                  </strong>
                </div>
              )
            )}
          </div>
        </article>
      </section>


      <section className="taa-two-grid">
        <article className="taa-card">
          <div className="taa-card-heading">
            <div>
              <span>
                Intervention
              </span>

              <h2>
                Students At Risk
              </h2>
            </div>

            <TrendingDown
              size={19}
            />
          </div>

          <div className="taa-risk-list">
            {atRiskStudents.length ===
            0 ? (
              <div className="taa-empty">
                No students are
                currently below
                80%.
              </div>
            ) : (
              atRiskStudents
                .slice(
                  0,
                  6
                )
                .map(
                  (
                    student
                  ) => (
                    <div
                      key={
                        student.uid
                      }
                    >
                      <div>
                        <strong>
                          {
                            student.name
                          }
                        </strong>

                        <small>
                          {
                            student.studentId
                          }
                        </small>
                      </div>

                      <span>
                        {
                          student.rate
                        }
                        %
                      </span>
                    </div>
                  )
                )
            )}
          </div>
        </article>


        <article className="taa-card">
          <div className="taa-card-heading">
            <div>
              <span>
                Punctuality
              </span>

              <h2>
                Frequently Late
              </h2>
            </div>

            <Clock3
              size={19}
            />
          </div>

          <div className="taa-risk-list">
            {lateStudents.length ===
            0 ? (
              <div className="taa-empty">
                No late arrivals
                recorded.
              </div>
            ) : (
              lateStudents.map(
                (student) => (
                  <div
                    key={
                      student.uid
                    }
                  >
                    <div>
                      <strong>
                        {
                          student.name
                        }
                      </strong>

                      <small>
                        {
                          student.studentId
                        }
                      </small>
                    </div>

                    <span className="taa-late-count">
                      {
                        student.late
                      }{" "}
                      late
                    </span>
                  </div>
                )
              )
            )}
          </div>
        </article>
      </section>


      <section className="taa-two-grid">
        <article className="taa-card">
          <div className="taa-card-heading">
            <div>
              <span>
                Security
              </span>

              <h2>
                Verification Methods
              </h2>
            </div>

            <Fingerprint
              size={19}
            />
          </div>

          <div className="taa-auth-list">
            {authMethods.length ===
            0 ? (
              <div className="taa-empty">
                No authentication
                records.
              </div>
            ) : (
              authMethods.map(
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
              )
            )}
          </div>
        </article>


        <article className="taa-card">
          <div className="taa-card-heading">
            <div>
              <span>
                Student Requests
              </span>

              <h2>
                Dispute Analytics
              </h2>
            </div>
          </div>

          <div className="taa-dispute-grid">
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
      </section>


      <section className="taa-card">
        <div className="taa-card-heading">
          <div>
            <span>
              Student Performance
            </span>

            <h2>
              Department Ranking
            </h2>

            <p>
              Attendance
              performance for every
              student in your
              department.
            </p>
          </div>
        </div>

        <div className="taa-table-scroll">
          <table className="taa-table">
            <thead>
              <tr>
                <th>
                  Student
                </th>

                <th>
                  ID
                </th>

                <th>
                  Present
                </th>

                <th>
                  Late
                </th>

                <th>
                  Absent
                </th>

                <th>
                  Attendance
                </th>

                <th>
                  Risk
                </th>
              </tr>
            </thead>

            <tbody>
              {studentPerformance.map(
                (student) => (
                  <tr
                    key={
                      student.uid
                    }
                  >
                    <td>
                      <strong>
                        {
                          student.name
                        }
                      </strong>
                    </td>

                    <td>
                      {
                        student.studentId
                      }
                    </td>

                    <td>
                      {
                        student.present
                      }
                    </td>

                    <td>
                      {
                        student.late
                      }
                    </td>

                    <td>
                      {
                        student.absent
                      }
                    </td>

                    <td>
                      <strong>
                        {
                          student.rate
                        }
                        %
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`taa-risk ${
                          student.total ===
                          0
                            ? "taa-risk-neutral"
                            : student.rate <
                                80
                              ? "taa-risk-danger"
                              : student.rate <
                                  90
                                ? "taa-risk-warning"
                                : "taa-risk-success"
                        }`}
                      >
                        {student.total ===
                        0
                          ? "No Data"
                          : student.rate <
                              80
                            ? "At Risk"
                            : student.rate <
                                90
                              ? "Monitor"
                              : "Good"}
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default TeacherAnalytics;