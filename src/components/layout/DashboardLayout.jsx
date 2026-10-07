import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";

import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

import "./DashboardLayout.css";

export default function DashboardLayout() {
  const location = useLocation();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const timetableTheme = location.pathname.endsWith("/timetable");

  return (
    <div className={`db-shell${timetableTheme ? " db-shell-timetable" : ""}`}>
      <div className="db-shell-grid" aria-hidden="true" />
      <div className="db-shell-glow" aria-hidden="true" />

      {mobileOpen && (
        <button
          className="db-mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <Sidebar
        timetableTheme={timetableTheme}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggle={() => setCollapsed((value) => !value)}
        onClose={() => setMobileOpen(false)}
      />

      <div className="db-shell-main">
        <Navbar
          timetableTheme={timetableTheme}
          onOpenMenu={() => setMobileOpen(true)}
        />

        <main className="db-shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}