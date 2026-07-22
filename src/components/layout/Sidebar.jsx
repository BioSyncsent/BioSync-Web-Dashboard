import { NavLink } from "react-router-dom";
import { LayoutDashboard, CalendarCheck, AlertTriangle, User, ShieldCheck } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import "./Sidebar.css";

const adminNavItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
  { to: "/admin/devices", label: "Devices", icon: User },
  { to: "/admin/analytics", label: "Analytics", icon: User },
  { to: "/admin/profile", label: "Profile", icon: User },
  { to: "/admin/settings", label: "Settings", icon: User },
];

const teacherNavItems = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/teacher/attendance", label: "Attendance", icon: CalendarCheck },
  { to: "/teacher/disputes", label: "Disputes", icon: AlertTriangle },
  { to: "/teacher/analytics", label: "Analytics", icon: User },
  { to: "/teacher/profile", label: "Profile", icon: User },
  { to: "/teacher/settings", label: "Settings", icon: User },
];

const studentNavItems = [
  { to: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/student/attendance", label: "My Attendance", icon: CalendarCheck },
  { to: "/student/disputes", label: "Disputes", icon: AlertTriangle },
  { to: "/student/analytics", label: "Analytics", icon: User },
  { to: "/student/profile", label: "Profile", icon: User },
  { to: "/student/settings", label: "Settings", icon: User },
];



function Sidebar() {
  const { user } = useAuth();

  let navItems = [];
  //Role Based Sidebar Display
  if(user?.role === "admin"){
    navItems = adminNavItems;
  }
  else if(user?.role === "teacher"){
    navItems = teacherNavItems;
  }
  else if(user?.role === "student"){
    navItems = studentNavItems;
  }

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