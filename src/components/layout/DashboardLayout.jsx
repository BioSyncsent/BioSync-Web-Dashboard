import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import "./DashboardLayout.css";

function DashboardLayout({ children }) {
  return (
    <div className="db-shell">
      <div className="db-shell-grid" />
      <div className="db-shell-glow" />

      <Sidebar />

      <div className="db-shell-main">
        <Navbar />
        <main className="db-shell-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;