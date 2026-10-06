import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  signOut,
} from "firebase/auth";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Bell,
  CalendarDays,
  GraduationCap,
  LogOut,
  ShieldCheck,
  Users,
  Wifi,
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
  const text = String(value || "").trim();

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
    user?.displayName ||
    "User";

  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}


function getDisplayName(user) {
  return (
    user?.fullName ||
    [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    user?.displayName ||
    "BioSync User"
  );
}


function getPageName(pathname) {
  if (pathname.includes("account-center")) {
    return "Account Center";
  }

  if (pathname.includes("attendance")) {
    return "Attendance";
  }

  if (pathname.includes("disputes")) {
    return "Disputes";
  }

  if (pathname.includes("analytics")) {
    return "Analytics";
  }

  if (pathname.includes("devices")) {
    return "Devices";
  }

  if (pathname.includes("users")) {
    return "User Management";
  }

  return "Dashboard";
}


/* =========================================================
   DATE HELPERS
========================================================= */

function isToday(value) {
  if (!value) {
    return false;
  }

  let date = null;

  try {
    if (typeof value?.toDate === "function") {
      date = value.toDate();
    } else if (value instanceof Date) {
      date = value;
    } else if (typeof value === "string") {
      date = new Date(value);
    } else if (typeof value === "number") {
      date = new Date(value);
    }
  } catch {
    return false;
  }

  if (!date || Number.isNaN(date.getTime())) {
    return false;
  }

  const now = new Date();

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}


function attendanceIsToday(record) {
  return (
    isToday(record?.timestamp) ||
    isToday(record?.createdAt) ||
    isToday(record?.checkInTime) ||
    isToday(record?.date) ||
    isToday(record?.attendanceDate)
  );
}


/* =========================================================
   NAVBAR
========================================================= */

function Navbar() {
  const { user } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [usersCount, setUsersCount] = useState(0);
  const [attendanceToday, setAttendanceToday] = useState(0);
  const [pendingDisputes, setPendingDisputes] = useState(0);

  const [syncState, setSyncState] = useState("loading");

  const roleRaw =
    String(user?.role || "")
      .trim()
      .toLowerCase();

  const role = capitalize(roleRaw);

  const displayName = getDisplayName(user);

  const pageName = getPageName(
    location.pathname
  );


  /* =========================================================
     LIVE FIRESTORE DATA
  ========================================================= */

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    setSyncState("loading");

    const unsubscribers = [];

    let usersReady = false;
    let attendanceReady = false;
    let disputesReady = false;

    const updateSyncState = () => {
      if (
        usersReady &&
        attendanceReady &&
        disputesReady
      ) {
        setSyncState("live");
      }
    };


    /* ---------------------------------------------------------
       ADMIN
    --------------------------------------------------------- */

    if (roleRaw === "admin") {
      const unsubscribeUsers = onSnapshot(
        collection(db, "users"),

        (snapshot) => {
          setUsersCount(snapshot.size);

          usersReady = true;
          updateSyncState();
        },

        (error) => {
          console.error(
            "Navbar users listener error:",
            error
          );

          usersReady = true;
          setSyncState("error");
        }
      );

      unsubscribers.push(unsubscribeUsers);


      const unsubscribeAttendance = onSnapshot(
        collection(db, "attendance"),

        (snapshot) => {
          const todayCount =
            snapshot.docs.filter((docSnap) =>
              attendanceIsToday(
                docSnap.data()
              )
            ).length;

          setAttendanceToday(todayCount);

          attendanceReady = true;
          updateSyncState();
        },

        (error) => {
          console.error(
            "Navbar attendance listener error:",
            error
          );

          attendanceReady = true;
          setSyncState("error");
        }
      );

      unsubscribers.push(
        unsubscribeAttendance
      );


      const unsubscribeDisputes = onSnapshot(
        collection(db, "disputes"),

        (snapshot) => {
          const count =
            snapshot.docs.filter((docSnap) => {
              const data = docSnap.data();

              return (
                String(
                  data?.status || ""
                ).toLowerCase() === "pending"
              );
            }).length;

          setPendingDisputes(count);

          disputesReady = true;
          updateSyncState();
        },

        (error) => {
          console.error(
            "Navbar disputes listener error:",
            error
          );

          disputesReady = true;
          setSyncState("error");
        }
      );

      unsubscribers.push(
        unsubscribeDisputes
      );
    }


    /* ---------------------------------------------------------
       TEACHER
    --------------------------------------------------------- */

    else if (roleRaw === "teacher") {
      const department =
        String(
          user?.department || ""
        ).trim();

      if (!department) {
        setUsersCount(0);
        setAttendanceToday(0);
        setPendingDisputes(0);
        setSyncState("live");

        return undefined;
      }


      /*
       * IMPORTANT:
       * Teacher queries are department-scoped.
       * This matches your Firestore security model.
       */

      const studentsQuery = query(
        collection(db, "users"),
        where(
          "department",
          "==",
          department
        ),
        where(
          "role",
          "==",
          "student"
        )
      );

      const unsubscribeStudents = onSnapshot(
        studentsQuery,

        (snapshot) => {
          setUsersCount(snapshot.size);

          usersReady = true;
          updateSyncState();
        },

        (error) => {
          console.error(
            "Navbar teacher student listener error:",
            error
          );

          usersReady = true;
          setSyncState("error");
        }
      );

      unsubscribers.push(
        unsubscribeStudents
      );


      /*
       * Teacher attendance must also be allowed
       * by your Firestore rules.
       *
       * If attendance documents contain department,
       * this query is safe and efficient.
       */

      const attendanceQuery = query(
        collection(db, "attendance"),
        where(
          "department",
          "==",
          department
        )
      );

      const unsubscribeAttendance = onSnapshot(
        attendanceQuery,

        (snapshot) => {
          const todayCount =
            snapshot.docs.filter((docSnap) =>
              attendanceIsToday(
                docSnap.data()
              )
            ).length;

          setAttendanceToday(todayCount);

          attendanceReady = true;
          updateSyncState();
        },

        (error) => {
          console.error(
            "Navbar teacher attendance listener error:",
            error
          );

          /*
           * Do not break the entire navbar if
           * department is not stored on attendance.
           */

          setAttendanceToday(0);

          attendanceReady = true;
          updateSyncState();
        }
      );

      unsubscribers.push(
        unsubscribeAttendance
      );


      const disputesQuery = query(
        collection(db, "disputes"),
        where(
          "department",
          "==",
          department
        )
      );

      const unsubscribeDisputes = onSnapshot(
        disputesQuery,

        (snapshot) => {
          const count =
            snapshot.docs.filter((docSnap) => {
              const data = docSnap.data();

              return (
                String(
                  data?.status || ""
                ).toLowerCase() === "pending"
              );
            }).length;

          setPendingDisputes(count);

          disputesReady = true;
          updateSyncState();
        },

        (error) => {
          console.error(
            "Navbar teacher disputes listener error:",
            error
          );

          disputesReady = true;
          setSyncState("error");
        }
      );

      unsubscribers.push(
        unsubscribeDisputes
      );
    }


    /* ---------------------------------------------------------
       STUDENT
    --------------------------------------------------------- */

    else {
      /*
       * For students, "Users" becomes their own
       * personal account indicator.
       */

      setUsersCount(1);
      usersReady = true;


      const attendanceQuery = query(
        collection(db, "attendance"),
        where(
          "userId",
          "==",
          user.uid
        )
      );

      const unsubscribeAttendance = onSnapshot(
        attendanceQuery,

        (snapshot) => {
          const todayCount =
            snapshot.docs.filter((docSnap) =>
              attendanceIsToday(
                docSnap.data()
              )
            ).length;

          setAttendanceToday(todayCount);

          attendanceReady = true;
          updateSyncState();
        },

        (error) => {
          console.error(
            "Navbar student attendance listener error:",
            error
          );

          attendanceReady = true;
          setSyncState("error");
        }
      );

      unsubscribers.push(
        unsubscribeAttendance
      );


      const disputesQuery = query(
        collection(db, "disputes"),
        where(
          "userId",
          "==",
          user.uid
        )
      );

      const unsubscribeDisputes = onSnapshot(
        disputesQuery,

        (snapshot) => {
          const count =
            snapshot.docs.filter((docSnap) => {
              const data = docSnap.data();

              return (
                String(
                  data?.status || ""
                ).toLowerCase() === "pending"
              );
            }).length;

          setPendingDisputes(count);

          disputesReady = true;
          updateSyncState();
        },

        (error) => {
          console.error(
            "Navbar student disputes listener error:",
            error
          );

          disputesReady = true;
          setSyncState("error");
        }
      );

      unsubscribers.push(
        unsubscribeDisputes
      );


      updateSyncState();
    }


    return () => {
      unsubscribers.forEach(
        (unsubscribe) => {
          if (
            typeof unsubscribe === "function"
          ) {
            unsubscribe();
          }
        }
      );
    };
  }, [
    user?.uid,
    user?.department,
    roleRaw,
  ]);


  /* =========================================================
     NAVBAR DATA
  ========================================================= */

  const statusItems = useMemo(() => {
    if (roleRaw === "student") {
      return [
        {
          id: "account",
          label: "Account",
          value: "Student",
          icon: GraduationCap,
        },
        {
          id: "attendance",
          label: "Attendance Today",
          value: attendanceToday,
          icon: CalendarDays,
        },
        {
          id: "disputes",
          label: "Pending Disputes",
          value: pendingDisputes,
          icon: Bell,
          alert: pendingDisputes > 0,
        },
      ];
    }


    if (roleRaw === "teacher") {
      return [
        {
          id: "students",
          label: "Students",
          value: usersCount,
          icon: Users,
        },
        {
          id: "attendance",
          label: "Attendance Today",
          value: attendanceToday,
          icon: CalendarDays,
        },
        {
          id: "disputes",
          label: "Pending Disputes",
          value: pendingDisputes,
          icon: Bell,
          alert: pendingDisputes > 0,
        },
      ];
    }


    return [
      {
        id: "users",
        label: "Users",
        value: usersCount,
        icon: Users,
      },
      {
        id: "attendance",
        label: "Attendance Today",
        value: attendanceToday,
        icon: CalendarDays,
      },
      {
        id: "disputes",
        label: "Pending Disputes",
        value: pendingDisputes,
        icon: Bell,
        alert: pendingDisputes > 0,
      },
    ];
  }, [
    roleRaw,
    usersCount,
    attendanceToday,
    pendingDisputes,
  ]);


  /* =========================================================
     LOGOUT
  ========================================================= */

  async function handleLogout() {
    try {
      await signOut(auth);

      navigate(
        "/login",
        {
          replace: true,
        }
      );
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    }
  }


  /* =========================================================
     NOTIFICATION CLICK
  ========================================================= */

  function handleNotifications() {
    if (roleRaw === "admin") {
      navigate("/admin/disputes");
      return;
    }

    if (roleRaw === "teacher") {
      navigate("/teacher/disputes");
      return;
    }

    if (roleRaw === "student") {
      navigate("/student/disputes");
    }
  }


  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <header className="db-navbar">

      {/* ===============================================
          PAGE TITLE
      =============================================== */}

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
          BioSync Sentinel · {role} Portal
        </span>

      </div>


      {/* ===============================================
          LIVE STATUS AREA
      =============================================== */}

      <div className="db-navbar-status-area">

        <div
          className={
            syncState === "error"
              ? "db-navbar-sync db-navbar-sync-error"
              : syncState === "live"
                ? "db-navbar-sync db-navbar-sync-live"
                : "db-navbar-sync"
          }
        >
          <Wifi size={13} />

          <span>
            {syncState === "error"
              ? "Sync Error"
              : syncState === "live"
                ? "Live Sync"
                : "Connecting"}
          </span>

          <i />
        </div>


        <div className="db-navbar-status-strip">

          {statusItems.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.id}
                className={
                  item.alert
                    ? "db-navbar-status-item db-navbar-status-alert"
                    : "db-navbar-status-item"
                }
              >

                <div className="db-navbar-status-icon">
                  <Icon size={14} />
                </div>

                <div>
                  <small>
                    {item.label}
                  </small>

                  <strong>
                    {item.value}
                  </strong>
                </div>

              </div>
            );
          })}

        </div>

      </div>


      {/* ===============================================
          RIGHT ACTIONS
      =============================================== */}

      <div className="db-navbar-actions">

        <button
          type="button"
          className="db-navbar-icon-btn"
          aria-label="Notifications"
          title="Dispute notifications"
          onClick={handleNotifications}
        >
          <Bell size={17} />

          {pendingDisputes > 0 && (
            <span className="db-navbar-notification-count">
              {pendingDisputes > 99
                ? "99+"
                : pendingDisputes}
            </span>
          )}
        </button>


        <div className="db-navbar-user">

          <div className="db-navbar-avatar">
            {getInitials(user)}
          </div>

          <div className="db-navbar-user-details">

            <span className="db-navbar-username">
              {displayName}
            </span>

            <span className="db-navbar-role">
              {role}

              {user?.department
                ? ` · ${user.department}`
                : ""}
            </span>

          </div>

        </div>


        <button
          type="button"
          onClick={handleLogout}
          className="db-navbar-logout"
        >
          <LogOut size={15} />

          <span className="db-navbar-logout-text">
            Logout
          </span>
        </button>

      </div>

    </header>
  );
}


export default Navbar;