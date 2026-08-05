import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/AuthContext";
import { subscribeToStudentNewResponseCount } from "../../services/disputeService";

import "./Layout.css";

const expandedBadgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "48px",
  height: "20px",
  marginLeft: "auto",
  padding: "0 7px",
  border: "2px solid #ffffff",
  borderRadius: "999px",
  background: "#ef4444",
  color: "#ffffff",
  boxShadow: "0 3px 8px rgba(239, 68, 68, 0.28)",
  fontSize: "9px",
  fontWeight: 800,
  lineHeight: 1,
  whiteSpace: "nowrap",
};

const collapsedDotStyle = {
  position: "absolute",
  top: "7px",
  right: "8px",
  width: "10px",
  height: "10px",
  border: "2px solid #ffffff",
  borderRadius: "50%",
  background: "#ef4444",
  boxShadow: "0 0 0 4px rgba(239, 68, 68, 0.12)",
};

const Layout = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [newResponseCount, setNewResponseCount] = useState(0);
  const [lastSeenAt, setLastSeenAt] = useState(null);

  const notificationStorageKey =
    `biosync:student-disputes:last-seen:${user?.uid || "student"}`;

  const isDisputesPage = location.pathname
    .toLowerCase()
    .includes("/disputes");

  const menuItems = [
    { path: "/student/dashboard", label: "Dashboard", icon: "▦" },
    { path: "/student/attendance", label: "My Attendance", icon: "▣" },
    { path: "/student/disputes", label: "Disputes", icon: "△" },
    { path: "/student/analytics", label: "Analytics", icon: "⌁" },
    { path: "/student/profile", label: "Profile", icon: "♙" },
    { path: "/student/settings", label: "Settings", icon: "⚙" },
  ];

  useEffect(() => {
    if (!user?.uid) {
      return;
    }

    const storedTime = Number(
      localStorage.getItem(notificationStorageKey)
    );

    if (Number.isFinite(storedTime) && storedTime > 0) {
      setLastSeenAt(storedTime);
      return;
    }

    const now = Date.now();
    localStorage.setItem(notificationStorageKey, String(now));
    setLastSeenAt(now);
  }, [user?.uid, notificationStorageKey]);

  useEffect(() => {
    if (!user?.uid || lastSeenAt === null) {
      return undefined;
    }

    const unsubscribe = subscribeToStudentNewResponseCount(
      user.uid,
      lastSeenAt,
      (count) => {
        if (isDisputesPage && count > 0) {
          const now = Date.now();
          localStorage.setItem(notificationStorageKey, String(now));
          setLastSeenAt(now);
          setNewResponseCount(0);
          return;
        }

        setNewResponseCount(isDisputesPage ? 0 : count);
      },
      (error) => {
        console.error("Student dispute notification error:", error);
        setNewResponseCount(0);
      }
    );

    return unsubscribe;
  }, [
    user?.uid,
    lastSeenAt,
    isDisputesPage,
    notificationStorageKey,
  ]);

  useEffect(() => {
    if (!user?.uid || !isDisputesPage) {
      return;
    }

    const now = Date.now();
    localStorage.setItem(notificationStorageKey, String(now));
    setLastSeenAt(now);
    setNewResponseCount(0);
  }, [user?.uid, isDisputesPage, notificationStorageKey]);

  const displayCount = newResponseCount > 99 ? "99+" : newResponseCount;

  return (
    <div className={`layout ${collapsed ? "collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <span className="logo-icon">🛡</span>
            {!collapsed && <span className="logo-text">BioSync</span>}
          </div>

          <button
            type="button"
            className="toggle-btn"
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`);

            const showDisputeBadge =
              item.label === "Disputes" && newResponseCount > 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${isActive ? "active" : ""}`}
                style={{ position: "relative" }}
              >
                <span className="nav-icon">{item.icon}</span>

                {!collapsed && (
                  <span className="nav-label">{item.label}</span>
                )}

                {showDisputeBadge && (
                  <span
                    style={collapsed ? collapsedDotStyle : expandedBadgeStyle}
                    title={`${newResponseCount} new admin response${
                      newResponseCount === 1 ? "" : "s"
                    }`}
                    aria-label={`${newResponseCount} new admin response${
                      newResponseCount === 1 ? "" : "s"
                    }`}
                  >
                    {!collapsed && `${displayCount} new`}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">
              {(user?.fullName || user?.email || "S")
                .charAt(0)
                .toUpperCase()}
            </div>

            {!collapsed && (
              <div>
                <p className="user-name">
                  {user?.fullName || "Student User"}
                </p>
                <p className="user-role">Student</p>
              </div>
            )}
          </div>

          {!collapsed && (
            <Link to="/login" className="logout-btn">
              Logout
            </Link>
          )}
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;