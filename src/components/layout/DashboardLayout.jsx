import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "./DashboardLayout.css";
import { Outlet } from "react-router-dom";

function DashboardLayout() {
  return (
    <div className="db-shell">

      <div className="db-shell-grid" />
      <div className="db-shell-glow" />

      <Sidebar />

      <div className="db-shell-main">

        <Navbar />

        <main className="db-shell-content">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default DashboardLayout;