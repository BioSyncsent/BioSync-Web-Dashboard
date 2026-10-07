import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  NavLink,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { signOut } from "firebase/auth";

import {
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  MonitorSmartphone,
  User,
  UserCog,
  UsersRound,
  X,
} from "lucide-react";

import { auth } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";

import {
  subscribeToAdminDisputeNotificationCount,
  subscribeToStudentResponseNotificationCount,
  subscribeToTeacherDisputeNotificationCount,
} from "../../services/disputeNotificationService";

import "./Sidebar.css";

function readLastSeen(key) {
  if (!key) return 0;

  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

const sidebarStyles = `
  .db-shell .db-sidebar.bs-sidebar {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    gap: 0;

    width: 252px;
    min-width: 252px;
    max-width: 252px;
    flex: 0 0 252px;

    height: 100vh;
    height: 100dvh;
    padding: 0;
    overflow: hidden;

    font-family: "Inter", sans-serif;
    color: #bfd1da;

    border-right: 1px solid rgba(0, 220, 237, 0.18);

    background:
      radial-gradient(
        ellipse at 0% 0%,
        rgba(0, 213, 230, 0.15),
        transparent 45%
      ),
      radial-gradient(
        ellipse at 0% 100%,
        rgba(0, 213, 230, 0.18),
        transparent 40%
      ),
      linear-gradient(180deg, #04151c, #031017);

    box-shadow: none;

    transition:
      width 180ms ease,
      min-width 180ms ease,
      max-width 180ms ease,
      flex-basis 180ms ease;
  }

  .db-shell .bs-sidebar::before {
    display: none;
  }

  .db-shell .bs-sidebar .bs-account-container {
    position: relative;
    z-index: 5;
    flex: 0 0 auto;
    margin: 18px 14px 8px;
  }

  .db-shell .bs-sidebar .bs-account-button {
    display: flex;
    align-items: center;
    gap: 11px;

    width: 100%;
    min-height: 66px;
    padding: 11px 12px;

    border: 1px solid rgba(0, 218, 235, 0.4);
    border-radius: 12px;

    background: rgba(1, 17, 23, 0.8);
    color: #edf7fa;

    font-family: inherit;
    text-align: left;
    cursor: pointer;

    box-shadow:
      inset 0 0 18px rgba(0, 218, 235, 0.06),
      0 0 16px rgba(0, 218, 235, 0.04);
  }

  .db-shell .bs-sidebar .bs-account-button:hover {
    border-color: rgba(0, 218, 235, 0.65);
    background: rgba(7, 32, 41, 0.95);
  }

  .db-shell .bs-sidebar .bs-account-avatar {
    display: grid;
    place-items: center;

    width: 40px;
    height: 40px;
    flex-shrink: 0;
    overflow: hidden;

    border: 1.5px solid #00ddeb;
    border-radius: 50%;

    background: #082a36;
    color: #e5f8fc;

    box-shadow:
      0 0 12px rgba(0, 221, 235, 0.3),
      inset 0 0 8px rgba(0, 221, 235, 0.12);
  }

  .db-shell .bs-sidebar .bs-account-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .db-shell .bs-sidebar .bs-account-copy {
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
    min-width: 0;
  }

  .db-shell .bs-sidebar .bs-account-name {
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    font-family: "Space Grotesk", sans-serif;
    font-size: 14px;
    font-weight: 500;
    letter-spacing: -0.015em;
  }

  .db-shell .bs-sidebar .bs-account-role {
    padding: 2px 6px;

    border: 1px solid rgba(109, 217, 236, 0.25);
    border-radius: 5px;

    background: rgba(61, 183, 207, 0.1);
    color: #8ee5f3;

    font-size: 9px;
    font-weight: 500;
    letter-spacing: 0.04em;
  }

  .db-shell .bs-sidebar .bs-account-chevron {
    flex-shrink: 0;
    transition: transform 160ms ease;
  }

  .db-shell .bs-sidebar .bs-account-chevron-open {
    transform: rotate(180deg);
  }

  .db-shell .bs-sidebar .bs-account-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;

    padding: 8px;

    border: 1px solid #28515e;
    border-radius: 12px;

    background: #0a202a;
    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.3);
  }

  .db-shell .bs-sidebar .bs-account-menu-item {
    display: flex;
    align-items: center;
    gap: 9px;

    width: 100%;
    min-height: 40px;
    padding: 9px 10px;

    border: 0;
    border-radius: 7px;

    background: transparent;
    color: #dceef4;

    font-family: inherit;
    font-size: 13px;
    font-weight: 500;

    text-align: left;
    text-decoration: none;
    cursor: pointer;
  }

  .db-shell .bs-sidebar .bs-account-menu-item:hover {
    background: #123440;
  }

  .db-shell .bs-sidebar .bs-account-logout {
    color: #fda4af;
  }

  .db-shell .bs-sidebar .bs-account-menu-item:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .db-shell .bs-sidebar .bs-account-error {
    margin: 8px 5px 3px;
    color: #fda4af;
    font-size: 12px;
    line-height: 1.5;
  }

  .db-shell .bs-sidebar .db-sidebar-nav {
    position: relative;
    top: auto;
    bottom: auto;

    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;

    min-height: 0;
    height: auto;
    margin: 0;
    padding: 8px 14px 20px;
    gap: 0;

    overflow-x: hidden;
    overflow-y: auto;
  }

  .db-shell .bs-sidebar .bs-sidebar-group {
    flex: 0 0 auto;
    margin: 0;
    padding: 15px 0;
  }

  .db-shell .bs-sidebar .bs-sidebar-group + .bs-sidebar-group {
    border-top: 1px solid rgba(132, 192, 208, 0.12);
  }

  .db-shell .bs-sidebar .bs-sidebar-group-title {
    margin: 0 0 11px;
    padding: 0 9px;

    font-family: "Inter", sans-serif;
    font-size: 10px;
    font-weight: 500;
    line-height: 1.4;
    letter-spacing: 0.08em;

    color: #88aebb;
  }

  .db-shell .bs-sidebar .bs-sidebar-group-links {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .db-shell .bs-sidebar .db-sidebar-link {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    flex: 0 0 auto;

    width: 100%;
    min-height: 40px;
    padding: 9px 11px;
    gap: 12px;

    border: 1px solid transparent;
    border-radius: 7px;

    background: transparent;
    color: #bfd1da;

    font-family: "Inter", sans-serif;
    font-size: 13px;
    font-weight: 400;

    text-decoration: none;
    transform: none;
    box-shadow: none;
  }

  .db-shell .bs-sidebar .db-sidebar-label {
    display: block;
    flex: 1;
    min-width: 0;
  }

  .db-shell .bs-sidebar .db-sidebar-icon {
    flex-shrink: 0;
    color: #9cbac8;
  }

  .db-shell .bs-sidebar .db-sidebar-link:hover {
    background: rgba(0, 218, 235, 0.06);
    border-color: rgba(0, 218, 235, 0.15);
    color: #ecfcff;
    transform: none;
  }

  .db-shell .bs-sidebar .db-sidebar-link-active,
  .db-shell .bs-sidebar .db-sidebar-link-active:hover {
    border-color: rgba(0, 218, 235, 0.42);

    background: linear-gradient(
      90deg,
      rgba(0, 213, 231, 0.22),
      rgba(0, 142, 161, 0.13)
    );

    color: #00edff;
    font-weight: 500;

    box-shadow:
      inset 0 0 16px rgba(0, 218, 235, 0.07),
      0 0 12px rgba(0, 218, 235, 0.06);
  }

  .db-shell .bs-sidebar .db-sidebar-link-active::before {
    top: 6px;
    bottom: 6px;
    width: 3px;

    background: #00e6f5;
    opacity: 1;
    transform: none;
  }

  .db-shell .bs-sidebar .db-sidebar-link-active .db-sidebar-icon {
    color: #00edff;
    filter: none;
  }

  .db-shell .bs-sidebar .bs-sidebar-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;

    min-width: 19px;
    height: 19px;
    margin-left: auto;
    padding: 0 5px;

    border-radius: 999px;
    background: #f43f5e;
    color: #ffffff;

    font-size: 10px;
    font-weight: 600;
    line-height: 1;
  }

  /* Hidden toggle area at the middle of the right edge */
  .db-shell .bs-sidebar .bs-sidebar-toggle-zone {
    position: absolute;
    top: 50%;
    right: 0;
    z-index: 10;

    width: 32px;
    height: 112px;

    transform: translateY(-50%);
  }

  .db-shell .bs-sidebar .bs-sidebar-edge-toggle {
    position: absolute;
    top: 50%;
    right: 3px;

    display: grid;
    place-items: center;

    width: 28px;
    height: 40px;
    padding: 0;

    border: 1px solid rgba(113, 218, 235, 0.3);
    border-radius: 9px;

    background: #0b2530;
    color: #c0edf4;

    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.24);

    opacity: 0;
    pointer-events: none;
    transform: translateY(-50%) translateX(4px);

    cursor: pointer;

    transition:
      opacity 180ms ease,
      transform 180ms ease;
  }

  .db-shell .bs-sidebar .bs-sidebar-toggle-zone:hover .bs-sidebar-edge-toggle,
  .db-shell .bs-sidebar .bs-sidebar-toggle-zone:focus-within .bs-sidebar-edge-toggle {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(-50%);
  }

  .db-shell .bs-sidebar .bs-sidebar-edge-toggle:hover {
    background: #123743;
    border-color: #78dce9;
  }

  .db-shell .bs-sidebar button:focus-visible,
  .db-shell .bs-sidebar a:focus-visible {
    outline: 2px solid #78dce9;
    outline-offset: 2px;
  }

  .db-shell .bs-sidebar .bs-mobile-close {
    display: none;
  }

  @media (min-width: 701px) {
    .db-shell .bs-sidebar[data-collapsed="true"] {
      width: 84px;
      min-width: 84px;
      max-width: 84px;
      flex-basis: 84px;
    }

    .db-shell .bs-sidebar[data-collapsed="true"] .bs-account-container {
      margin: 18px 8px 8px;
    }

    .db-shell .bs-sidebar[data-collapsed="true"] .bs-account-button {
      justify-content: center;
      padding: 8px;
    }

    .db-shell .bs-sidebar[data-collapsed="true"] .bs-account-copy,
    .db-shell .bs-sidebar[data-collapsed="true"] .bs-account-chevron,
    .db-shell .bs-sidebar[data-collapsed="true"] .db-sidebar-label,
    .db-shell .bs-sidebar[data-collapsed="true"] .bs-sidebar-group-title {
      display: none;
    }

    .db-shell .bs-sidebar[data-collapsed="true"] .db-sidebar-nav {
      padding: 8px 10px 20px;
    }

    .db-shell .bs-sidebar[data-collapsed="true"] .bs-sidebar-group {
      padding: 12px 0;
    }

    .db-shell .bs-sidebar[data-collapsed="true"] .db-sidebar-link {
      justify-content: center;
      gap: 0;
      padding: 9px 8px;
    }

    .db-shell .bs-sidebar[data-collapsed="true"] .bs-account-dropdown {
      position: fixed;
      top: 18px;
      left: 90px;
      right: auto;
      width: 210px;
    }

    .db-shell .bs-sidebar[data-collapsed="true"] .bs-sidebar-count {
      position: absolute;
      top: 1px;
      right: 1px;

      min-width: 16px;
      height: 16px;
      margin: 0;
      padding: 0 3px;

      font-size: 8px;
    }
  }

  @media (hover: none) {
    .db-shell .bs-sidebar .bs-sidebar-edge-toggle {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(-50%);
    }
  }

  @media (max-width: 700px) {
    .db-shell .db-sidebar.bs-sidebar {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 60;

      width: 260px;
      min-width: 260px;
      max-width: 260px;

      transform: translateX(-100%);
      visibility: hidden;

      transition:
        transform 180ms ease,
        visibility 180ms ease;
    }

    .db-shell .bs-sidebar[data-mobile-open="true"] {
      transform: translateX(0);
      visibility: visible;
    }

    .db-shell .bs-sidebar .bs-mobile-close {
      display: grid;
      place-items: center;
      align-self: flex-end;

      width: 32px;
      height: 32px;
      margin: 10px 12px 0;

      border: 1px solid #28515e;
      border-radius: 8px;

      background: #0a202a;
      color: #dceef4;
      cursor: pointer;
    }

    .db-shell .bs-sidebar .bs-sidebar-toggle-zone {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .db-shell .db-sidebar.bs-sidebar,
    .db-shell .bs-sidebar .bs-account-chevron,
    .db-shell .bs-sidebar .bs-sidebar-edge-toggle {
      transition: none;
    }
  }
`;

export default function Sidebar({
  collapsed = false,
  mobileOpen = false,
  onToggle,
  onClose,
}) {
  const { user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const accountRef = useRef(null);
  const accountButtonRef = useRef(null);

  const [accountOpen, setAccountOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const [notificationCount, setNotificationCount] = useState(0);
  const [seenState, setSeenState] = useState({
    key: "",
    time: 0,
  });

  const role = String(user?.role || "").trim().toLowerCase();
  const department = String(user?.department || "").trim();

  const fullName = [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  const displayName =
    fullName ||
    user?.fullName ||
    user?.displayName ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const photoURL =
    user?.photoURL ||
    user?.photoUrl ||
    user?.avatar ||
    "";

  const storageKey =
    role && user?.uid
      ? `biosync:dispute-notifications:${role}:${user.uid}`
      : "";

  const lastSeenAt =
    seenState.key === storageKey
      ? seenState.time
      : readLastSeen(storageKey);

  const canViewTimetable =
    role === "admin" || department === "CID";

  const mainItems = [
    {
      path: "dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    ...(canViewTimetable
      ? [
          {
            path: "timetable",
            label: "CID Timetable",
            icon: CalendarDays,
          },
        ]
      : []),
    {
      path: "attendance",
      label: role === "student" ? "My Attendance" : "Attendance",
      icon: CalendarCheck,
    },
    {
      path: "disputes",
      label: "Disputes",
      icon: MessageSquare,
    },
    {
      path: "analytics",
      label: "Analytics",
      icon: BarChart3,
    },
  ];

  const sidebarGroups = [
    {
      title: "MAIN",
      items: mainItems,
    },
    ...(role === "admin"
      ? [
          {
            title: "MANAGEMENT",
            items: [
              {
                path: "users",
                label: "User Management",
                icon: UsersRound,
              },
              {
                path: "devices",
                label: "Devices",
                icon: MonitorSmartphone,
              },
            ],
          },
        ]
      : []),
    {
      title: "ACCOUNT",
      items: [
        {
          path: "account-center",
          label: "Account Center",
          icon: UserCog,
        },
      ],
    },
  ];

  useEffect(() => {
    setAvatarFailed(false);
  }, [photoURL]);

  useEffect(() => {
    setAccountOpen(false);
    setLogoutError("");
  }, [location.pathname, user?.uid, collapsed]);

  useEffect(() => {
    if (!accountOpen) return undefined;

    function handleOutsideClick(event) {
      if (!accountRef.current?.contains(event.target)) {
        setAccountOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );
      document.removeEventListener("keydown", handleEscape);
    };
  }, [accountOpen]);

  useEffect(() => {
    setNotificationCount(0);

    if (!user?.uid || !role) return undefined;

    function handleCount(count) {
      setNotificationCount(Math.max(0, Number(count) || 0));
    }

    function handleError(error) {
      console.error("Dispute notification error:", error);
      setNotificationCount(0);
    }

    if (role === "admin") {
      return subscribeToAdminDisputeNotificationCount(
        lastSeenAt,
        handleCount,
        handleError
      );
    }

    if (role === "teacher" && department) {
      return subscribeToTeacherDisputeNotificationCount(
        department,
        lastSeenAt,
        handleCount,
        handleError
      );
    }

    if (role === "student") {
      return subscribeToStudentResponseNotificationCount(
        user.uid,
        lastSeenAt,
        handleCount,
        handleError
      );
    }

    return undefined;
  }, [user?.uid, role, department, lastSeenAt]);

  const markDisputesAsSeen = useCallback(() => {
    if (!storageKey) return;

    const time = Date.now();

    try {
      localStorage.setItem(storageKey, String(time));
    } catch {
      // The current session still works if storage is unavailable.
    }

    setSeenState({ key: storageKey, time });
    setNotificationCount(0);
  }, [storageKey]);

  function handleNavigation(path) {
    if (path === "disputes") {
      markDisputesAsSeen();
    }

    setAccountOpen(false);
    onClose?.();
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      await signOut(auth);

      setAccountOpen(false);
      onClose?.();

      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
      setLogoutError("Unable to log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  const displayedCount =
    notificationCount > 99 ? "99+" : notificationCount;

  const notificationTitle =
    role === "student"
      ? `${notificationCount} new teacher responses`
      : `${notificationCount} new disputes`;

  return (
    <>
      <style>{sidebarStyles}</style>

      <aside
        className="db-sidebar bs-sidebar"
        data-collapsed={collapsed}
        data-mobile-open={mobileOpen}
        aria-label="Main navigation"
      >
        <button
          type="button"
          className="bs-mobile-close"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={18} aria-hidden="true" />
        </button>

        {/* Account card */}
        <div className="bs-account-container" ref={accountRef}>
          <button
            ref={accountButtonRef}
            type="button"
            className="bs-account-button"
            onClick={() => setAccountOpen((open) => !open)}
            aria-expanded={accountOpen}
            aria-controls="bs-sidebar-account-dropdown"
            aria-label={`Account options for ${displayName}`}
            title={displayName}
          >
            <span className="bs-account-avatar">
              {photoURL && !avatarFailed ? (
                <img
                  src={photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <User
                  size={22}
                  strokeWidth={1.7}
                  aria-hidden="true"
                />
              )}
            </span>

            <span className="bs-account-copy">
              <strong className="bs-account-name">
                {displayName}
              </strong>

              <span className="bs-account-role">
                {role ? role.toUpperCase() : "ACCOUNT"}
              </span>
            </span>

            <ChevronDown
              size={16}
              aria-hidden="true"
              className={`bs-account-chevron${
                accountOpen ? " bs-account-chevron-open" : ""
              }`}
            />
          </button>

          {accountOpen && (
            <div
              id="bs-sidebar-account-dropdown"
              className="bs-account-dropdown"
            >
              <NavLink
                to={`/${role}/account-center`}
                className="bs-account-menu-item"
                onClick={() => handleNavigation("account-center")}
              >
                <UserCog size={17} aria-hidden="true" />
                <span>Account Center</span>
              </NavLink>

              <button
                type="button"
                className="bs-account-menu-item bs-account-logout"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                <LogOut size={17} aria-hidden="true" />
                <span>
                  {loggingOut ? "Logging out…" : "Logout"}
                </span>
              </button>

              {logoutError && (
                <p className="bs-account-error" role="alert">
                  {logoutError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Grouped navigation */}
        <nav
          className="db-sidebar-nav"
          aria-label="Dashboard pages"
        >
          {sidebarGroups.map(({ title, items }) => (
            <section
              key={title}
              className="bs-sidebar-group"
              aria-label={title}
            >
              <h2 className="bs-sidebar-group-title">
                {title}
              </h2>

              <div className="bs-sidebar-group-links">
                {items.map(({ path, label, icon: Icon }) => {
                  const showNotification =
                    path === "disputes" && notificationCount > 0;

                  return (
                    <NavLink
                      key={path}
                      to={`/${role}/${path}`}
                      title={label}
                      aria-label={label}
                      onClick={() => handleNavigation(path)}
                      className={({ isActive }) =>
                        `db-sidebar-link${
                          isActive
                            ? " db-sidebar-link-active"
                            : ""
                        }`
                      }
                    >
                      <Icon
                        size={19}
                        strokeWidth={1.7}
                        className="db-sidebar-icon"
                        aria-hidden="true"
                      />

                      <span className="db-sidebar-label">
                        {label}
                      </span>

                      {showNotification && (
                        <span
                          className="bs-sidebar-count"
                          title={notificationTitle}
                          aria-label={notificationTitle}
                        >
                          {displayedCount}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </section>
          ))}
        </nav>

        {/* Middle-edge collapse / expand button */}
        <div className="bs-sidebar-toggle-zone">
          <button
            type="button"
            className="bs-sidebar-edge-toggle"
            onClick={() => {
              setAccountOpen(false);
              onToggle?.();
            }}
            aria-label={
              collapsed ? "Expand sidebar" : "Collapse sidebar"
            }
            aria-expanded={!collapsed}
            title={
              collapsed ? "Expand sidebar" : "Collapse sidebar"
            }
          >
            {collapsed ? (
              <ChevronRight size={17} aria-hidden="true" />
            ) : (
              <ChevronLeft size={17} aria-hidden="true" />
            )}
          </button>
        </div>
      </aside>
    </>
  );
}