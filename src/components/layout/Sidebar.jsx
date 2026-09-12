import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  NavLink,
} from "react-router-dom";

import bioSyncLogo from "../../assets/BioSync_Logo_Navbar.png";
import bioSyncShield from "../../assets/BioSync_Shield_Sidebar.png";

import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  LayoutDashboard,
  MonitorSmartphone,
  UserCog,
  UsersRound,
} from "lucide-react";

import {
  useAuth,
} from "../../contexts/AuthContext";

import {
  subscribeToAdminDisputeNotificationCount,
  subscribeToStudentResponseNotificationCount,
  subscribeToTeacherDisputeNotificationCount,
} from "../../services/disputeNotificationService";

import "./Sidebar.css";

/* =========================================================
   ADMIN NAVIGATION
========================================================= */

const adminNavItems = [
  {
    to: "/admin/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/admin/attendance",
    label: "Attendance",
    icon: CalendarCheck,
  },
  {
    to: "/admin/disputes",
    label: "Disputes",
    icon: AlertTriangle,
  },
  {
    to: "/admin/devices",
    label: "Devices",
    icon: MonitorSmartphone,
  },
  {
    to: "/admin/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    to: "/admin/users",
    label: "User Management",
    icon: UsersRound,
  },
  {
    to: "/admin/account-center",
    label: "Account Center",
    icon: UserCog,
  },
];

/* =========================================================
   TEACHER NAVIGATION
========================================================= */

const teacherNavItems = [
  {
    to: "/teacher/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/teacher/attendance",
    label: "Attendance",
    icon: CalendarCheck,
  },
  {
    to: "/teacher/disputes",
    label: "Disputes",
    icon: AlertTriangle,
  },
  {
    to: "/teacher/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    to: "/teacher/account-center",
    label: "Account Center",
    icon: UserCog,
  },
];

/* =========================================================
   STUDENT NAVIGATION
========================================================= */

const studentNavItems = [
  {
    to: "/student/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    to: "/student/attendance",
    label: "My Attendance",
    icon: CalendarCheck,
  },
  {
    to: "/student/disputes",
    label: "Disputes",
    icon: AlertTriangle,
  },
  {
    to: "/student/analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    to: "/student/account-center",
    label: "Account Center",
    icon: UserCog,
  },
];

/* =========================================================
   STORAGE
========================================================= */

function createStorageKey(
  role,
  userId
) {
  if (
    !role ||
    !userId
  ) {
    return "";
  }

  return `biosync:dispute-notifications:${role}:${userId}`;
}

function readLastSeenTime(
  key
) {
  if (!key) {
    return 0;
  }

  const value =
    Number(
      localStorage.getItem(
        key
      )
    );

  return Number.isFinite(
    value
  )
    ? value
    : 0;
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar() {
  const {
    user,
  } = useAuth();

  const [
    notificationCount,
    setNotificationCount,
  ] = useState(0);

  const [
    lastSeenAt,
    setLastSeenAt,
  ] = useState(0);

  const role =
    String(
      user?.role ||
      ""
    )
      .trim()
      .toLowerCase();

  /* =======================================================
     STORAGE KEY
  ======================================================= */

  const storageKey =
    useMemo(
      () =>
        createStorageKey(
          role,
          user?.uid
        ),
      [
        role,
        user?.uid,
      ]
    );

  /* =======================================================
     NAV ITEMS
  ======================================================= */

  const navItems =
    useMemo(() => {
      if (
        role === "admin"
      ) {
        return adminNavItems;
      }

      if (
        role === "teacher"
      ) {
        return teacherNavItems;
      }

      if (
        role === "student"
      ) {
        return studentNavItems;
      }

      return [];
    }, [
      role,
    ]);

  /* =======================================================
     LOAD LAST-SEEN TIME
  ======================================================= */

  useEffect(() => {
    if (
      !storageKey
    ) {
      setLastSeenAt(0);
      setNotificationCount(0);

      return;
    }

    setLastSeenAt(
      readLastSeenTime(
        storageKey
      )
    );

    setNotificationCount(0);
  }, [
    storageKey,
  ]);

  /* =======================================================
     DISPUTE NOTIFICATION LISTENER
  ======================================================= */

  useEffect(() => {
    if (
      !user?.uid ||
      !role
    ) {
      setNotificationCount(0);

      return undefined;
    }

    function handleCount(
      count
    ) {
      setNotificationCount(
        Number(count) || 0
      );
    }

    function handleError(
      error
    ) {
      console.error(
        "Dispute notification error:",
        error
      );

      setNotificationCount(0);
    }

    /* ADMIN */

    if (
      role === "admin"
    ) {
      return subscribeToAdminDisputeNotificationCount(
        lastSeenAt,
        handleCount,
        handleError
      );
    }

    /* TEACHER */

    if (
      role === "teacher"
    ) {
      if (
        !user?.department
      ) {
        setNotificationCount(0);

        return undefined;
      }

      return subscribeToTeacherDisputeNotificationCount(
        user.department,
        lastSeenAt,
        handleCount,
        handleError
      );
    }

    /* STUDENT */

    if (
      role === "student"
    ) {
      return subscribeToStudentResponseNotificationCount(
        user.uid,
        lastSeenAt,
        handleCount,
        handleError
      );
    }

    setNotificationCount(0);

    return undefined;
  }, [
    user?.uid,
    user?.department,
    role,
    lastSeenAt,
  ]);

  /* =======================================================
     MARK DISPUTES AS SEEN
  ======================================================= */

  const markDisputesAsSeen =
    useCallback(() => {
      if (
        !storageKey
      ) {
        return;
      }

      const now =
        Date.now();

      localStorage.setItem(
        storageKey,
        String(now)
      );

      setLastSeenAt(now);
      setNotificationCount(0);
    }, [
      storageKey,
    ]);

  /* =======================================================
     NOTIFICATION DISPLAY
  ======================================================= */

  const displayedCount =
    notificationCount > 99
      ? "99+"
      : notificationCount;

  const plural =
    notificationCount === 1
      ? ""
      : "s";

  let notificationTitle =
    "";

  if (
    role === "admin"
  ) {
    notificationTitle =
      `${notificationCount} new student dispute${plural}`;
  }

  if (
    role === "teacher"
  ) {
    notificationTitle =
      `${notificationCount} new department dispute${plural}`;
  }

  if (
    role === "student"
  ) {
    notificationTitle =
      `${notificationCount} new teacher response${plural}`;
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <aside className="db-sidebar">

      {/* ===================================================
          BRAND
      =================================================== */}

      <div className="db-sidebar-brand">
        <img
          src={
            bioSyncLogo
          }
          alt="BioSync Sentinel"
          className="db-sidebar-logo db-sidebar-logo-full"
        />

        <img
          src={
            bioSyncShield
          }
          alt="BioSync Sentinel"
          className="db-sidebar-logo db-sidebar-logo-shield"
        />
      </div>

      <div className="db-sidebar-separator" />

      {/* ===================================================
          NAVIGATION
      =================================================== */}

      <nav className="db-sidebar-nav">
        {navItems.map(
          ({
            to,
            label,
            icon: Icon,
          }) => {
            const isDisputes =
              label ===
              "Disputes";

            const showNotification =
              isDisputes &&
              notificationCount > 0;

            return (
              <NavLink
                key={to}
                to={to}
                onClick={
                  isDisputes
                    ? markDisputesAsSeen
                    : undefined
                }
                className={({
                  isActive,
                }) =>
                  `db-sidebar-link${
                    isActive
                      ? " db-sidebar-link-active"
                      : ""
                  }`
                }
              >
                <Icon
                  size={18}
                  className="db-sidebar-icon"
                />

                <span className="db-sidebar-label">
                  {label}
                </span>

                {showNotification && (
                  <span
                    className="db-dispute-notification"
                    title={
                      notificationTitle
                    }
                    aria-label={
                      notificationTitle
                    }
                  >
                    <span className="db-dispute-notification-dot" />

                    <span>
                      {displayedCount} new
                    </span>
                  </span>
                )}
              </NavLink>
            );
          }
        )}
      </nav>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <div className="db-sidebar-footer">
        <span className="db-sidebar-footer-dot" />

        <div className="db-sidebar-footer-copy">
          <strong>
            BioSecure Enterprise
          </strong>

          <span>
            Version 2.0.0
          </span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;