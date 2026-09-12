import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  signOut,
} from "firebase/auth";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  BarChart3,
  Bell,
  CalendarCheck,
  CheckCircle2,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  auth,
  db,
} from "../../firebase/firebase";

import {
  useAuth,
} from "../../contexts/AuthContext";

import "./Navbar.css";


/* =========================================================
   HELPERS
========================================================= */

function capitalize(value) {
  const text =
    String(value || "")
      .trim();

  if (!text) {
    return "User";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}


function getInitials(user) {
  const fullName =
    user?.fullName ||
    [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    "User";

  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part.charAt(0)
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}


function getPageName(pathname) {
  if (
    pathname.includes(
      "account-center"
    )
  ) {
    return "Account Center";
  }

  if (
    pathname.includes(
      "attendance"
    )
  ) {
    return "Attendance";
  }

  if (
    pathname.includes(
      "disputes"
    )
  ) {
    return "Disputes";
  }

  if (
    pathname.includes(
      "analytics"
    )
  ) {
    return "Analytics";
  }

  if (
    pathname.includes(
      "devices"
    )
  ) {
    return "Devices";
  }

  if (
    pathname.includes(
      "users"
    )
  ) {
    return "User Management";
  }

  return "Dashboard";
}


function toDate(value) {
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


function isToday(value) {
  const date =
    toDate(value);

  if (!date) {
    return false;
  }

  const today =
    new Date();

  return (
    date.getFullYear() ===
      today.getFullYear() &&
    date.getMonth() ===
      today.getMonth() &&
    date.getDate() ===
      today.getDate()
  );
}


function normalizeStatus(value) {
  const status =
    String(value || "")
      .trim()
      .toLowerCase();

  if (
    status.includes("present")
  ) {
    return "present";
  }

  if (
    status.includes("late")
  ) {
    return "late";
  }

  if (
    status.includes("absent")
  ) {
    return "absent";
  }

  if (
    status.includes("excused")
  ) {
    return "excused";
  }

  return "unknown";
}


function getLatestTodayRecord(
  records
) {
  return records
    .filter((record) =>
      isToday(record.timestamp)
    )
    .sort(
      (
        first,
        second
      ) =>
        (
          toDate(
            second.timestamp
          )?.getTime() ||
          0
        ) -
        (
          toDate(
            first.timestamp
          )?.getTime() ||
          0
        )
    )[0];
}


/* =========================================================
   NAVBAR
========================================================= */

function Navbar() {
  const {
    user,
  } = useAuth();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const [
    synced,
    setSynced,
  ] = useState(false);

  const [
    totalUsers,
    setTotalUsers,
  ] = useState(0);

  const [
    attendance,
    setAttendance,
  ] = useState([]);

  const [
    departmentStudents,
    setDepartmentStudents,
  ] = useState({});

  const [
    disputes,
    setDisputes,
  ] = useState([]);

  const [
    dataError,
    setDataError,
  ] = useState(false);


  const pageName =
    getPageName(
      location.pathname
    );

  const role =
    String(
      user?.role || ""
    ).toLowerCase();

  const roleLabel =
    capitalize(role);

  const displayName =
    user?.fullName ||
    [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    "BioSync User";


  /* =======================================================
     REAL-TIME FIRESTORE NAVBAR DATA
  ======================================================= */

  useEffect(() => {
    if (
      !user?.uid ||
      !role
    ) {
      return undefined;
    }

    setSynced(false);
    setDataError(false);

    const unsubscribeList = [];

    let childAttendanceUnsubscribers =
      [];


    function markReady() {
      setSynced(true);
      setDataError(false);
    }


    function handleError(error) {
      console.error(
        "Navbar Firestore listener error:",
        error
      );

      setDataError(true);
      setSynced(false);
    }


    /* =====================================================
       ADMIN
    ===================================================== */

    if (role === "admin") {
      const usersUnsubscribe =
        onSnapshot(
          collection(
            db,
            "users"
          ),

          (snapshot) => {
            setTotalUsers(
              snapshot.size
            );

            markReady();
          },

          handleError
        );


      const attendanceUnsubscribe =
        onSnapshot(
          collection(
            db,
            "attendance"
          ),

          (snapshot) => {
            setAttendance(
              snapshot.docs.map(
                (document) => ({
                  id:
                    document.id,
                  ...document.data(),
                })
              )
            );

            markReady();
          },

          handleError
        );


      const disputesUnsubscribe =
        onSnapshot(
          collection(
            db,
            "disputes"
          ),

          (snapshot) => {
            setDisputes(
              snapshot.docs.map(
                (document) => ({
                  id:
                    document.id,
                  ...document.data(),
                })
              )
            );

            markReady();
          },

          handleError
        );


      unsubscribeList.push(
        usersUnsubscribe,
        attendanceUnsubscribe,
        disputesUnsubscribe
      );
    }


    /* =====================================================
       TEACHER
    ===================================================== */

    if (
      role === "teacher" &&
      user?.department
    ) {
      const studentsQuery =
        query(
          collection(
            db,
            "users"
          ),

          where(
            "role",
            "==",
            "student"
          ),

          where(
            "department",
            "==",
            user.department
          )
        );


      const studentsUnsubscribe =
        onSnapshot(
          studentsQuery,

          (snapshot) => {
            const studentsMap =
              {};

            snapshot.docs.forEach(
              (document) => {
                studentsMap[
                  document.id
                ] = {
                  uid:
                    document.id,

                  ...document.data(),
                };
              }
            );

            setDepartmentStudents(
              studentsMap
            );


            /*
              Remove old attendance listeners
              before creating new ones.
            */

            childAttendanceUnsubscribers.forEach(
              (unsubscribe) =>
                unsubscribe()
            );

            childAttendanceUnsubscribers =
              [];


            const studentIds =
              Object.keys(
                studentsMap
              );


            if (
              studentIds.length ===
              0
            ) {
              setAttendance([]);
              markReady();
              return;
            }


            const attendanceMap =
              new Map();


            studentIds.forEach(
              (studentId) => {
                const studentAttendanceQuery =
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


                const unsubscribeAttendance =
                  onSnapshot(
                    studentAttendanceQuery,

                    (
                      attendanceSnapshot
                    ) => {
                      attendanceMap.set(
                        studentId,

                        attendanceSnapshot.docs.map(
                          (
                            document
                          ) => ({
                            id:
                              document.id,

                            ...document.data(),
                          })
                        )
                      );


                      setAttendance(
                        Array.from(
                          attendanceMap.values()
                        ).flat()
                      );

                      markReady();
                    },

                    handleError
                  );


                childAttendanceUnsubscribers.push(
                  unsubscribeAttendance
                );
              }
            );
          },

          handleError
        );


      const disputesQuery =
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


      const disputesUnsubscribe =
        onSnapshot(
          disputesQuery,

          (snapshot) => {
            setDisputes(
              snapshot.docs.map(
                (document) => ({
                  id:
                    document.id,

                  ...document.data(),
                })
              )
            );

            markReady();
          },

          handleError
        );


      unsubscribeList.push(
        studentsUnsubscribe,
        disputesUnsubscribe
      );
    }


    /* =====================================================
       STUDENT
    ===================================================== */

    if (role === "student") {
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


      const disputesQuery =
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


      const attendanceUnsubscribe =
        onSnapshot(
          attendanceQuery,

          (snapshot) => {
            setAttendance(
              snapshot.docs.map(
                (document) => ({
                  id:
                    document.id,

                  ...document.data(),
                })
              )
            );

            markReady();
          },

          handleError
        );


      const disputesUnsubscribe =
        onSnapshot(
          disputesQuery,

          (snapshot) => {
            setDisputes(
              snapshot.docs.map(
                (document) => ({
                  id:
                    document.id,

                  ...document.data(),
                })
              )
            );

            markReady();
          },

          handleError
        );


      unsubscribeList.push(
        attendanceUnsubscribe,
        disputesUnsubscribe
      );
    }


    return () => {
      unsubscribeList.forEach(
        (unsubscribe) =>
          unsubscribe()
      );

      childAttendanceUnsubscribers.forEach(
        (unsubscribe) =>
          unsubscribe()
      );
    };
  }, [
    user?.uid,
    user?.department,
    role,
  ]);


  /* =======================================================
     CALCULATED REAL-TIME VALUES
  ======================================================= */

  const pendingDisputes =
    useMemo(() => {
      return disputes.filter(
        (dispute) => {
          const status =
            String(
              dispute.status || ""
            )
              .trim()
              .toLowerCase();

          return (
            status === "pending" ||
            status ===
              "under_review"
          );
        }
      ).length;
    }, [
      disputes,
    ]);


  const todayAttendance =
    useMemo(
      () =>
        attendance.filter(
          (record) =>
            isToday(
              record.timestamp
            )
        ),
      [
        attendance,
      ]
    );


  const teacherTodayRate =
    useMemo(() => {
      if (
        role !== "teacher"
      ) {
        return 0;
      }

      const studentIds =
        Object.keys(
          departmentStudents
        );

      const activeStudents =
        studentIds.filter(
          (studentId) =>
            departmentStudents[
              studentId
            ]?.active !== false
        );


      if (
        activeStudents.length ===
        0
      ) {
        return 0;
      }


      const latestByStudent =
        new Map();


      todayAttendance.forEach(
        (record) => {
          if (!record.userId) {
            return;
          }

          const previous =
            latestByStudent.get(
              record.userId
            );

          const currentTime =
            toDate(
              record.timestamp
            )?.getTime() ||
            0;

          const previousTime =
            toDate(
              previous?.timestamp
            )?.getTime() ||
            0;


          if (
            !previous ||
            currentTime >
              previousTime
          ) {
            latestByStudent.set(
              record.userId,
              record
            );
          }
        }
      );


      const attended =
        Array.from(
          latestByStudent.values()
        ).filter(
          (record) => {
            const status =
              normalizeStatus(
                record.status
              );

            return (
              status ===
                "present" ||
              status === "late"
            );
          }
        ).length;


      return Number(
        (
          (
            attended /
            activeStudents.length
          ) *
          100
        ).toFixed(1)
      );
    }, [
      role,
      departmentStudents,
      todayAttendance,
    ]);


  const studentAttendanceRate =
    useMemo(() => {
      if (
        role !== "student"
      ) {
        return 0;
      }

      if (
        attendance.length ===
        0
      ) {
        return 0;
      }

      const attended =
        attendance.filter(
          (record) => {
            const status =
              normalizeStatus(
                record.status
              );

            return (
              status ===
                "present" ||
              status === "late"
            );
          }
        ).length;


      return Number(
        (
          (
            attended /
            attendance.length
          ) *
          100
        ).toFixed(1)
      );
    }, [
      role,
      attendance,
    ]);


  const studentTodayStatus =
    useMemo(() => {
      if (
        role !== "student"
      ) {
        return "—";
      }

      const record =
        getLatestTodayRecord(
          attendance
        );

      if (!record) {
        return "Not Recorded";
      }

      return capitalize(
        normalizeStatus(
          record.status
        )
      );
    }, [
      role,
      attendance,
    ]);


  /* =======================================================
     ROLE STATUS ITEMS
  ======================================================= */

  const statusItems =
    useMemo(() => {
      if (role === "admin") {
        return [
          {
            icon: Users,
            label: "Users",
            value:
              totalUsers,
          },

          {
            icon:
              CalendarCheck,
            label:
              "Attendance Today",
            value:
              todayAttendance.length,
          },

          {
            icon: Bell,
            label:
              "Pending Disputes",
            value:
              pendingDisputes,
            alert:
              pendingDisputes >
              0,
          },
        ];
      }


      if (role === "teacher") {
        return [
          {
            icon:
              GraduationCap,
            label:
              "Department",
            value:
              user?.department ||
              "N/A",
          },

          {
            icon: Users,
            label:
              "Students",
            value:
              Object.keys(
                departmentStudents
              ).length,
          },

          {
            icon:
              BarChart3,
            label:
              "Today",
            value:
              `${teacherTodayRate}%`,
          },

          {
            icon: Bell,
            label:
              "Disputes",
            value:
              pendingDisputes,
            alert:
              pendingDisputes >
              0,
          },
        ];
      }


      if (role === "student") {
        return [
          {
            icon:
              BarChart3,
            label:
              "Attendance",
            value:
              `${studentAttendanceRate}%`,
          },

          {
            icon:
              CheckCircle2,
            label:
              "Today",
            value:
              studentTodayStatus,
          },

          {
            icon: Bell,
            label:
              "Disputes",
            value:
              pendingDisputes,
            alert:
              pendingDisputes >
              0,
          },
        ];
      }


      return [];
    }, [
      role,
      totalUsers,
      todayAttendance.length,
      pendingDisputes,
      user?.department,
      departmentStudents,
      teacherTodayRate,
      studentAttendanceRate,
      studentTodayStatus,
    ]);


  /* =======================================================
     ACTIONS
  ======================================================= */

  async function handleLogout() {
    await signOut(auth);
  }


  function openDisputes() {
    if (
      role === "admin"
    ) {
      navigate(
        "/admin/disputes"
      );
      return;
    }

    if (
      role === "teacher"
    ) {
      navigate(
        "/teacher/disputes"
      );
      return;
    }

    if (
      role === "student"
    ) {
      navigate(
        "/student/disputes"
      );
    }
  }


  return (
    <header className="db-navbar">

      {/* =================================================
          PAGE TITLE
      ================================================= */}

      <div className="db-navbar-title-block">
        <div className="db-navbar-title-row">
          <ShieldCheck
            size={16}
            className="db-navbar-brand-icon"
          />

          <h2 className="db-navbar-title">
            {pageName}
          </h2>
        </div>

        <span className="db-navbar-title-kicker">
          BioSync Sentinel ·{" "}
          {roleLabel} Portal
        </span>
      </div>


      {/* =================================================
          REAL-TIME STATUS STRIP
      ================================================= */}

      <div className="db-navbar-status-area">

        <div
          className={`db-navbar-sync ${
            dataError
              ? "db-navbar-sync-error"
              : synced
                ? "db-navbar-sync-live"
                : ""
          }`}
        >
          {dataError ? (
            <WifiOff
              size={13}
            />
          ) : (
            <Wifi
              size={13}
            />
          )}

          <span>
            {dataError
              ? "Sync Error"
              : synced
                ? "Live Sync"
                : "Syncing..."}
          </span>

          {!dataError && (
            <i />
          )}
        </div>


        <div className="db-navbar-status-strip">
          {statusItems.map(
            ({
              icon: Icon,
              label,
              value,
              alert,
            }) => (
              <div
                className={`db-navbar-status-item ${
                  alert
                    ? "db-navbar-status-alert"
                    : ""
                }`}
                key={label}
              >
                <span className="db-navbar-status-icon">
                  <Icon
                    size={14}
                  />
                </span>

                <div>
                  <small>
                    {label}
                  </small>

                  <strong>
                    {value}
                  </strong>
                </div>
              </div>
            )
          )}
        </div>
      </div>


      {/* =================================================
          ACTIONS
      ================================================= */}

      <div className="db-navbar-actions">
        <button
          type="button"
          onClick={
            openDisputes
          }
          className="db-navbar-icon-btn"
          aria-label="Notifications"
          title="Open disputes"
        >
          <Bell size={18} />

          {pendingDisputes >
            0 && (
            <span className="db-navbar-notification-dot" />
          )}

          {pendingDisputes >
            0 && (
            <span className="db-navbar-notification-count">
              {pendingDisputes >
              99
                ? "99+"
                : pendingDisputes}
            </span>
          )}
        </button>


        <div className="db-navbar-user">
          <div className="db-navbar-avatar">
            {getInitials(
              user
            )}
          </div>

          <div className="db-navbar-user-details">
            <span className="db-navbar-username">
              {displayName}
            </span>

            <span className="db-navbar-role">
              {roleLabel}

              {user?.department
                ? ` · ${user.department}`
                : ""}
            </span>
          </div>
        </div>


        <button
          type="button"
          onClick={
            handleLogout
          }
          className="db-navbar-logout"
        >
          <LogOut
            size={15}
          />

          <span className="db-navbar-logout-text">
            Logout
          </span>
        </button>
      </div>
    </header>
  );
}

export default Navbar;