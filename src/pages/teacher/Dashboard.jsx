import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  FileWarning,
  Fingerprint,
  Radio,
  ScanFace,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
  Wifi,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import {
  useNavigate,
} from "react-router-dom";

import {
  db,
} from "../../firebase/firebase";

import {
  useAuth,
} from "../../contexts/AuthContext";

import "./Dashboard.css";


/* =========================================================
   HELPERS
========================================================= */

function toSafeDate(value) {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date
  ) {
    return value;
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
  const status =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    status.includes(
      "present"
    )
  ) {
    return "present";
  }

  if (
    status.includes("late")
  ) {
    return "late";
  }

  if (
    status.includes(
      "absent"
    )
  ) {
    return "absent";
  }

  if (
    status.includes(
      "excused"
    )
  ) {
    return "excused";
  }

  return "unknown";
}


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
    method.includes(
      "finger"
    )
  ) {
    return "Fingerprint";
  }

  if (
    method.includes(
      "manual"
    )
  ) {
    return "Manual";
  }

  return value || "Unknown";
}


function isSameDay(
  first,
  second
) {
  return (
    first &&
    second &&
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}


function getGreeting() {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}


function statusClass(
  status
) {
  const value =
    normalizeStatus(status);

  if (
    value === "present"
  ) {
    return "td-status td-status-success";
  }

  if (
    value === "late"
  ) {
    return "td-status td-status-warning";
  }

  if (
    value === "excused"
  ) {
    return "td-status td-status-info";
  }

  return "td-status td-status-danger";
}


function buildWeeklyData(
  records
) {
  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const monday =
    new Date(today);

  const currentDay =
    monday.getDay();

  const diffToMonday =
    currentDay === 0
      ? -6
      : 1 - currentDay;

  monday.setDate(
    monday.getDate() +
      diffToMonday
  );

  const weekdays = [
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
  ];

  return weekdays.map(
    (
      day,
      index
    ) => {
      const targetDate =
        new Date(monday);

      targetDate.setDate(
        monday.getDate() +
          index
      );

      const dayRecords =
        records.filter(
          (record) =>
            isSameDay(
              toSafeDate(
                record.timestamp
              ),
              targetDate
            )
        );

      return {
        day,

        present:
          dayRecords.filter(
            (record) =>
              normalizeStatus(
                record.status
              ) ===
              "present"
          ).length,

        late:
          dayRecords.filter(
            (record) =>
              normalizeStatus(
                record.status
              ) === "late"
          ).length,

        absent:
          dayRecords.filter(
            (record) =>
              normalizeStatus(
                record.status
              ) ===
              "absent"
          ).length,
      };
    }
  );
}


/* =========================================================
   COMPONENT
========================================================= */

function Dashboard() {
  const navigate =
    useNavigate();

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
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");


  const fullName =
    user?.fullName ||
    [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Teacher";

  const firstName =
    user?.firstName ||
    fullName.split(" ")[0];

  const department =
    user?.department ||
    "Department not assigned";


  /* =======================================================
     LOAD REAL FIRESTORE DATA
  ======================================================= */

  useEffect(() => {
    if (!user?.department) {
      setStudents({});
      setAttendance([]);
      setDisputes([]);
      setLoading(false);

      return;
    }

    let cancelled =
      false;

    async function loadDashboard() {
      try {
        setLoading(true);
        setError("");

        /* ---------------------------------------
           1. Students from teacher department
        --------------------------------------- */

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

        const studentMap =
          {};

        studentSnapshot.docs.forEach(
          (
            document
          ) => {
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


        /* ---------------------------------------
           2. Attendance for permitted students
        --------------------------------------- */

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


        /* ---------------------------------------
           3. Same-department disputes
        --------------------------------------- */

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
            attendanceResults
              .flat()
              .sort(
                (
                  first,
                  second
                ) => {
                  const firstTime =
                    toSafeDate(
                      first.timestamp
                    )?.getTime() ||
                    0;

                  const secondTime =
                    toSafeDate(
                      second.timestamp
                    )?.getTime() ||
                    0;

                  return (
                    secondTime -
                    firstTime
                  );
                }
              )
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
          "Unable to load teacher dashboard:",
          loadError
        );

        if (!cancelled) {
          setError(
            "Unable to load department dashboard data."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [
    user?.department,
  ]);


  /* =======================================================
     TODAY DATA
  ======================================================= */

  const todayRecords =
    useMemo(() => {
      const today =
        new Date();

      return attendance.filter(
        (record) =>
          isSameDay(
            toSafeDate(
              record.timestamp
            ),
            today
          )
      );
    }, [
      attendance,
    ]);


  /*
    Keep only the latest attendance record
    for each student today.

    This prevents one student with multiple
    scans from being counted multiple times.
  */

  const latestTodayByStudent =
    useMemo(() => {
      const map =
        new Map();

      todayRecords.forEach(
        (record) => {
          if (!record.userId) {
            return;
          }

          const current =
            map.get(
              record.userId
            );

          const recordTime =
            toSafeDate(
              record.timestamp
            )?.getTime() ||
            0;

          const currentTime =
            toSafeDate(
              current?.timestamp
            )?.getTime() ||
            0;

          if (
            !current ||
            recordTime >
              currentTime
          ) {
            map.set(
              record.userId,
              record
            );
          }
        }
      );

      return Array.from(
        map.values()
      );
    }, [
      todayRecords,
    ]);


  const summary =
    useMemo(() => {
      const studentList =
        Object.values(
          students
        );

      const activeStudents =
        studentList.filter(
          (student) =>
            student.active !==
            false
        );

      const present =
        latestTodayByStudent.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "present"
        ).length;

      const late =
        latestTodayByStudent.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "late"
        ).length;

      const explicitlyAbsent =
        latestTodayByStudent.filter(
          (record) =>
            normalizeStatus(
              record.status
            ) === "absent"
        ).length;

      const recordedIds =
        new Set(
          latestTodayByStudent.map(
            (record) =>
              record.userId
          )
        );

      const notRecorded =
        activeStudents.filter(
          (student) =>
            !recordedIds.has(
              student.uid
            )
        ).length;

      const absent =
        explicitlyAbsent +
        notRecorded;

      const attended =
        present + late;

      const rate =
        activeStudents.length >
        0
          ? Number(
              (
                (
                  attended /
                  activeStudents.length
                ) *
                100
              ).toFixed(1)
            )
          : 0;

      return {
        students:
          activeStudents.length,

        present,
        late,
        absent,
        rate,
      };
    }, [
      students,
      latestTodayByStudent,
    ]);


  /* =======================================================
     WEEKLY CHART
  ======================================================= */

  const weeklyAttendance =
    useMemo(
      () =>
        buildWeeklyData(
          attendance
        ),
      [
        attendance,
      ]
    );


  /* =======================================================
     DISPUTES
  ======================================================= */

  const pendingDisputes =
    useMemo(
      () =>
        disputes.filter(
          (dispute) => {
            const status =
              String(
                dispute.status ||
                  ""
              )
                .trim()
                .toLowerCase();

            return (
              status ===
                "pending" ||
              status ===
                "under_review"
            );
          }
        ).length,
      [
        disputes,
      ]
    );


  /* =======================================================
     AUTHENTICATION ACTIVITY
  ======================================================= */

  const methodActivity =
    useMemo(() => {
      const result = {
        face: 0,
        rfid: 0,
        fingerprint: 0,
        manual: 0,
      };

      todayRecords.forEach(
        (record) => {
          const method =
            String(
              record.authMethod ||
                record.method ||
                ""
            ).toLowerCase();

          if (
            method.includes(
              "face"
            )
          ) {
            result.face += 1;
          } else if (
            method.includes(
              "rfid"
            )
          ) {
            result.rfid += 1;
          } else if (
            method.includes(
              "finger"
            )
          ) {
            result.fingerprint +=
              1;
          } else if (
            method.includes(
              "manual"
            )
          ) {
            result.manual += 1;
          }
        }
      );

      return result;
    }, [
      todayRecords,
    ]);


  /* =======================================================
     RECENT ATTENDANCE
  ======================================================= */

  const recentStudents =
    useMemo(() => {
      return attendance
        .slice(
          0,
          7
        )
        .map(
          (record) => {
            const student =
              students[
                record.userId
              ];

            const name =
              student
                ? `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
                  student.fullName ||
                  "Unknown Student"
                : record.studentName ||
                  "Unknown Student";

            const date =
              toSafeDate(
                record.timestamp
              );

            return {
              id:
                record.id,

              name,

              studentId:
                student?.studentId ||
                record.studentId ||
                "N/A",

              time: date
                ? date.toLocaleTimeString(
                    "en-MY",
                    {
                      hour:
                        "2-digit",
                      minute:
                        "2-digit",
                    }
                  )
                : "N/A",

              date: date
                ? date.toLocaleDateString(
                    "en-MY",
                    {
                      day:
                        "2-digit",
                      month:
                        "short",
                    }
                  )
                : "N/A",

              status:
                normalizeStatus(
                  record.status
                ),

              method:
                normalizeMethod(
                  record.authMethod ||
                    record.method
                ),
            };
          }
        );
    }, [
      attendance,
      students,
    ]);


  const metrics = [
    {
      label:
        "Department Students",

      value:
        summary.students,

      helper:
        "Active students",

      icon: Users,
      tone: "blue",
    },

    {
      label:
        "Present Today",

      value:
        summary.present,

      helper: `${summary.rate}% department attendance`,

      icon: UserCheck,
      tone: "green",
    },

    {
      label:
        "Late Today",

      value:
        summary.late,

      helper:
        summary.late > 0
          ? "Require monitoring"
          : "No late arrivals",

      icon: Clock3,
      tone: "amber",
    },

    {
      label:
        "Absent Today",

      value:
        summary.absent,

      helper:
        summary.students >
        0
          ? `${(
              (
                summary.absent /
                summary.students
              ) *
              100
            ).toFixed(
              1
            )}% of students`
          : "0% of students",

      icon: UserX,
      tone: "red",
    },
  ];


  const quickActions = [
    {
      label:
        "Attendance",

      description:
        "View department records",

      icon:
        CalendarCheck,

      path:
        "/teacher/attendance",
    },

    {
      label:
        "Student Disputes",

      description:
        "Review pending requests",

      icon:
        FileWarning,

      path:
        "/teacher/disputes",
    },

    {
      label:
        "Analytics",

      description:
        "Review attendance trends",

      icon:
        BarChart3,

      path:
        "/teacher/analytics",
    },
  ];


  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <div className="td-page td-loading-page">
        <div className="td-loader">
          <span />

          <ShieldCheck
            size={20}
          />
        </div>

        <strong>
          Preparing teacher
          dashboard
        </strong>

        <p>
          Loading department
          attendance and dispute
          activity...
        </p>
      </div>
    );
  }


  return (
    <div className="td-page">

      {/* ===================================================
          HERO
      =================================================== */}

      <section className="td-hero">
        <div className="td-hero-grid" />

        <div className="td-orb td-orb-one" />
        <div className="td-orb td-orb-two" />

        <div className="td-hero-content">
          <div className="td-kicker">
            <Activity
              size={14}
            />

            Live department
            monitoring

            <span className="td-kicker-dot" />
          </div>

          <p className="td-date">
            {new Date().toLocaleDateString(
              "en-MY",
              {
                weekday:
                  "long",
                day:
                  "2-digit",
                month:
                  "long",
                year:
                  "numeric",
              }
            )}
          </p>

          <h1>
            {getGreeting()},{" "}
            <span>
              {firstName}
            </span>
          </h1>

          <p className="td-hero-description">
            Monitor student
            attendance, respond to
            disputes and understand
            your department's
            performance from one
            intelligent workspace.
          </p>

          <div className="td-hero-meta">
            <span>
              <ShieldCheck
                size={15}
              />

              Teacher account
            </span>

            <span>
              <Users
                size={15}
              />

              {department}
            </span>

            <span>
              <Wifi
                size={15}
              />

              Firebase connected
            </span>
          </div>
        </div>


        <div className="td-hero-score">
          <div
            className="td-score-ring"
            style={{
              "--td-score":
                `${Math.min(
                  summary.rate,
                  100
                )}%`,
            }}
          >
            <div className="td-score-inner">
              <strong>
                {summary.rate}%
              </strong>

              <span>
                Attendance
              </span>
            </div>
          </div>

          <strong>
            Department health
          </strong>

          <span>
            Today's attendance
            performance
          </span>
        </div>
      </section>


      {error && (
        <div className="td-error">
          <AlertTriangle
            size={18}
          />

          <div>
            <strong>
              Dashboard data
              unavailable
            </strong>

            <span>
              {error}
            </span>
          </div>
        </div>
      )}


      {/* ===================================================
          METRICS
      =================================================== */}

      <section className="td-metric-grid">
        {metrics.map(
          ({
            label,
            value,
            helper,
            icon: Icon,
            tone,
          }) => (
            <article
              className={`td-metric-card td-metric-${tone}`}
              key={label}
            >
              <div className="td-metric-shine" />

              <div className="td-metric-top">
                <span className="td-metric-icon">
                  <Icon
                    size={19}
                  />
                </span>

                <span className="td-metric-label">
                  {label}
                </span>
              </div>

              <div className="td-metric-value-row">
                <strong>
                  {value}
                </strong>

                <span className="td-metric-pulse" />
              </div>

              <small>
                {helper}
              </small>
            </article>
          )
        )}
      </section>


      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <section className="td-main-grid">

        {/* WEEKLY CHART */}

        <article className="td-card td-chart-card">
          <div className="td-card-header">
            <div>
              <span className="td-section-kicker">
                Performance
              </span>

              <h2>
                Weekly Attendance
              </h2>

              <p>
                Real attendance
                activity for your
                department during
                the current week.
              </p>
            </div>

            <div className="td-header-icon">
              <TrendingUp
                size={20}
              />
            </div>
          </div>


          <div className="td-chart-legend">
            <span>
              <i className="td-legend-blue" />
              Present
            </span>

            <span>
              <i className="td-legend-amber" />
              Late
            </span>

            <span>
              <i className="td-legend-red" />
              Absent
            </span>
          </div>


          <div className="td-chart">
            <ResponsiveContainer
              width="100%"
              height={300}
            >
              <BarChart
                data={
                  weeklyAttendance
                }
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
                    fill:
                      "#64748b",
                    fontSize:
                      11,
                  }}
                />

                <YAxis
                  axisLine={
                    false
                  }
                  tickLine={
                    false
                  }
                  allowDecimals={
                    false
                  }
                  tick={{
                    fill:
                      "#94a3b8",
                    fontSize:
                      10,
                  }}
                />

                <Tooltip
                  cursor={{
                    fill:
                      "rgba(37,99,235,.035)",
                  }}
                  contentStyle={{
                    border:
                      "1px solid #dce7f4",
                    borderRadius:
                      13,
                    boxShadow:
                      "0 14px 34px rgba(15,23,42,.1)",
                    fontSize:
                      11,
                  }}
                />

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


        {/* RIGHT COLUMN */}

        <div className="td-side-stack">

          {/* DISPUTES */}

          <article className="td-card td-alert-card">
            <div className="td-alert-glow" />

            <div className="td-card-header td-card-header-small">
              <div>
                <span className="td-section-kicker td-warning-kicker">
                  Requires attention
                </span>

                <h2>
                  Student Disputes
                </h2>
              </div>

              <div className="td-header-icon td-header-warning">
                <AlertTriangle
                  size={19}
                />
              </div>
            </div>

            <div className="td-dispute-number">
              <strong>
                {
                  pendingDisputes
                }
              </strong>

              <div>
                <span>
                  Pending reviews
                </span>

                <small>
                  Same department
                </small>
              </div>
            </div>

            <div className="td-dispute-status">
              {pendingDisputes >
              0 ? (
                <>
                  <span className="td-attention-dot" />

                  Action required
                </>
              ) : (
                <>
                  <CheckCircle2
                    size={13}
                  />

                  Everything is
                  reviewed
                </>
              )}
            </div>

            <button
              type="button"
              className="td-primary-button"
              onClick={() =>
                navigate(
                  "/teacher/disputes"
                )
              }
            >
              Review Disputes

              <ArrowRight
                size={15}
              />
            </button>
          </article>


          {/* AUTH ACTIVITY */}

          <article className="td-card td-security-card">
            <div className="td-card-header td-card-header-small">
              <div>
                <span className="td-section-kicker">
                  Security Activity
                </span>

                <h2>
                  Authentication Today
                </h2>
              </div>

              <div className="td-header-icon">
                <ScanFace
                  size={19}
                />
              </div>
            </div>


            <div className="td-security-list">

              <div>
                <span className="td-security-icon td-face-icon">
                  <ScanFace
                    size={15}
                  />
                </span>

                <div>
                  <strong>
                    Face Recognition
                  </strong>

                  <small>
                    Attendance
                    verifications
                  </small>
                </div>

                <span>
                  {
                    methodActivity.face
                  }
                </span>
              </div>


              <div>
                <span className="td-security-icon td-rfid-icon">
                  <Radio
                    size={15}
                  />
                </span>

                <div>
                  <strong>
                    RFID
                  </strong>

                  <small>
                    Card
                    authentications
                  </small>
                </div>

                <span>
                  {
                    methodActivity.rfid
                  }
                </span>
              </div>


              <div>
                <span className="td-security-icon td-finger-icon">
                  <Fingerprint
                    size={15}
                  />
                </span>

                <div>
                  <strong>
                    Fingerprint
                  </strong>

                  <small>
                    Fallback
                    verifications
                  </small>
                </div>

                <span>
                  {
                    methodActivity.fingerprint
                  }
                </span>
              </div>

            </div>
          </article>

        </div>
      </section>


      {/* ===================================================
          QUICK ACTIONS
      =================================================== */}

      <section className="td-quick-grid">
        {quickActions.map(
          ({
            label,
            description,
            icon: Icon,
            path,
          }) => (
            <button
              type="button"
              key={label}
              onClick={() =>
                navigate(path)
              }
              className="td-quick-card"
            >
              <div className="td-quick-glow" />

              <span className="td-quick-icon">
                <Icon
                  size={19}
                />
              </span>

              <span className="td-quick-copy">
                <strong>
                  {label}
                </strong>

                <small>
                  {description}
                </small>
              </span>

              <span className="td-quick-arrow-box">
                <ArrowRight
                  size={15}
                />
              </span>
            </button>
          )
        )}
      </section>


      {/* ===================================================
          RECENT ATTENDANCE
      =================================================== */}

      <section className="td-card td-recent-card">
        <div className="td-card-header">
          <div>
            <span className="td-section-kicker">
              Live department activity
            </span>

            <h2>
              Recent Student Attendance
            </h2>

            <p>
              Latest real attendance
              events from students
              assigned to{" "}
              {department}.
            </p>
          </div>

          <button
            type="button"
            className="td-text-button"
            onClick={() =>
              navigate(
                "/teacher/attendance"
              )
            }
          >
            View attendance

            <ArrowRight
              size={14}
            />
          </button>
        </div>


        {recentStudents.length ===
        0 ? (
          <div className="td-empty-state">
            <div>
              <Sparkles
                size={22}
              />
            </div>

            <strong>
              No attendance
              activity yet
            </strong>

            <span>
              New department
              attendance records
              will appear here.
            </span>
          </div>
        ) : (
          <div className="td-table-wrap">
            <table className="td-table">
              <thead>
                <tr>
                  <th>
                    Student
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
                {recentStudents.map(
                  (
                    student
                  ) => (
                    <tr
                      key={
                        student.id
                      }
                    >
                      <td>
                        <div className="td-student-cell">
                          <span>
                            {student.name
                              .charAt(
                                0
                              )
                              .toUpperCase()}
                          </span>

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
                        </div>
                      </td>

                      <td>
                        {
                          student.date
                        }
                      </td>

                      <td>
                        {
                          student.time
                        }
                      </td>

                      <td>
                        <span
                          className={statusClass(
                            student.status
                          )}
                        >
                          {
                            student.status
                          }
                        </span>
                      </td>

                      <td>
                        <span className="td-method-badge">
                          {
                            student.method
                          }
                        </span>
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