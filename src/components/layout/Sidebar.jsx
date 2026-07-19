import { NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarCheck, AlertTriangle, Users, ShieldCheck } from "lucide-react";
import "./Sidebar.css";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/disputes", label: "Disputes", icon: AlertTriangle },
  { to: "/users", label: "Users", icon: Users },
];

function Sidebar() {
  return (
    <aside className="db-sidebar">
      <div className="db-sidebar-brand">
        <ShieldCheck className="db-sidebar-logo" size={22} />
        <span className="db-sidebar-brand-text">BioSync</span>
      </div>

      <div className="db-sidebar-separator" />

      <nav className="db-sidebar-nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              "db-sidebar-link" + (isActive ? " db-sidebar-link-active" : "")
            }
          >
            <Icon size={18} className="db-sidebar-icon" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;