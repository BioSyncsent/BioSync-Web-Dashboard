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
  Settings,
  User,
  UsersRound,
} from "lucide-react";

import {
  useAuth,
} from "../../contexts/AuthContext";

import {
  subscribeToAdminDisputeNotificationCount,
  subscribeToStudentResponseNotificationCount,
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
    icon: User,
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
    to: "/teacher/profile",
    label: "Profile",
    icon: User,
  },
  {
    to: "/teacher/settings",
    label: "Settings",
    icon: Settings,
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
    to: "/student/profile",
    label: "Profile",
    icon: User,
  },
  {
    to: "/student/settings",
    label: "Settings",
    icon: Settings,
  },
];

/* =========================================================
   NOTIFICATION HELPERS
========================================================= */

function createStorageKey(
  role,
  userId
) {
  if (!role || !userId) {
    return "";
  }

  return `biosync:dispute-notifications:${role}:${userId}`;
}

function readLastSeenTime(
  storageKey
) {
  if (!storageKey) {
    return 0;
  }

  const storedTime = Number(
    localStorage.getItem(
      storageKey
    )
  );

  return Number.isFinite(
    storedTime
  )
    ? storedTime
    : 0;
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar() {
  const { user } =
    useAuth();

  const [
    notificationCount,
    setNotificationCount,
  ] = useState(0);

  const [
    lastSeenAt,
    setLastSeenAt,
  ] = useState(0);

  const role = String(
    user?.role || ""
  )
    .trim()
    .toLowerCase();

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

  /* NAVIGATION */

  const navItems =
    useMemo(() => {
      if (role === "admin") {
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
    }, [role]);

  /* LOAD LAST-SEEN */

  useEffect(() => {
    if (!storageKey) {
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
  }, [storageKey]);

  /* DISPUTE NOTIFICATION */

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
        "Sidebar dispute notification error:",
        error
      );

      setNotificationCount(0);
    }

    if (role === "admin") {
      return subscribeToAdminDisputeNotificationCount(
        lastSeenAt,
        handleCount,
        handleError
      );
    }

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
    role,
    lastSeenAt,
  ]);

  /* MARK DISPUTES SEEN */

  const markDisputesAsSeen =
    useCallback(() => {
      if (!storageKey) {
        return;
      }

      const currentTime =
        Date.now();

      localStorage.setItem(
        storageKey,
        String(currentTime)
      );

      setLastSeenAt(
        currentTime
      );

      setNotificationCount(0);
    }, [storageKey]);

  const displayedCount =
    notificationCount > 99
      ? "99+"
      : notificationCount;

  const pluralSuffix =
    notificationCount === 1
      ? ""
      : "s";

  const notificationTitle =
    role === "admin"
      ? `${notificationCount} new student dispute${pluralSuffix}`
      : `${notificationCount} new administrator response${pluralSuffix}`;

  return (
    <aside className="db-sidebar">
      {/* LOGO */}

      <div className="db-sidebar-brand">
        <img
          src={bioSyncLogo}
          alt="BioSync Sentinel"
          className="db-sidebar-logo db-sidebar-logo-full"
        />

        <img
          src={bioSyncShield}
          alt="BioSync Sentinel"
          className="db-sidebar-logo db-sidebar-logo-shield"
        />
      </div>

      <div className="db-sidebar-separator" />

      {/* NAVIGATION */}

      <nav className="db-sidebar-nav">
        {navItems.map(
          ({
            to,
            label,
            icon: Icon,
          }) => {
            const isDisputeItem =
              label ===
              "Disputes";

            const showNotification =
              isDisputeItem &&
              notificationCount >
                0;

            return (
              <NavLink
                key={to}
                to={to}
                onClick={
                  isDisputeItem
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
                      {
                        displayedCount
                      }{" "}
                      new
                    </span>
                  </span>
                )}
              </NavLink>
            );
          }
        )}
      </nav>

      {/* FOOTER */}

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