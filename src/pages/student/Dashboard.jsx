
import {
  Users, UserCheck, UserX, TrendingUp, AlertCircle, Eye
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import "./Dashboard.css";

const stats = [
  { label: "Total Employees", value: "248", icon: Users },
  { label: "Present Today", value: "212", icon: UserCheck },
  { label: "Absent Today", value: "36", icon: UserX },
  { label: "Attendance Rate", value: "85.5%", icon: TrendingUp },
  { label: "Pending Disputes", value: "7", icon: AlertCircle },
];

const attendanceTrend = [
  { day: "Mon", rate: 82 },
  { day: "Tue", rate: 88 },
  { day: "Wed", rate: 79 },
  { day: "Thu", rate: 91 },
  { day: "Fri", rate: 85 },
  { day: "Sat", rate: 74 },
  { day: "Sun", rate: 68 },
];

const distribution = [
  { name: "Present", value: 212 },
  { name: "Absent", value: 36 },
];

const distributionColors = ["#56B6FF", "#D8E9F8"];

const weekly = [
  { day: "Mon", present: 200, absent: 48 },
  { day: "Tue", present: 218, absent: 30 },
  { day: "Wed", present: 196, absent: 52 },
  { day: "Thu", present: 225, absent: 23 },
  { day: "Fri", present: 211, absent: 37 },
];

const recentActivity = [
  { employee: "Aiman Rasyid", time: "08:02 AM", status: "On Time", device: "Terminal 1", action: "Check In" },
  { employee: "Nur Aisyah", time: "08:14 AM", status: "Late", device: "Terminal 2", action: "Check In" },
  { employee: "Kevin Tan", time: "05:31 PM", status: "On Time", device: "Terminal 1", action: "Check Out" },
  { employee: "Siti Mariam", time: "—", status: "Absent", device: "—", action: "—" },
  { employee: "Faris Iskandar", time: "08:05 AM", status: "On Time", device: "Terminal 3", action: "Check In" },
];

function statusClass(status) {
  if (status === "On Time") return "db-status db-status-ontime";
  if (status === "Late") return "db-status db-status-late";
  return "db-status db-status-absent";
}

function Dashboard() {

  return (
    

      <div className="db-page">

        <div className="db-page-header">
          <h1 className="db-page-title">Welcome to BioSync Dashboard</h1>
          <p className="db-page-subtitle">
            Real-time attendance and biometric access overview.
          </p>
        </div>

        <div className="db-stat-grid">
          {stats.map(({ label, value, icon: Icon }) => (
            <div className="db-card db-stat-card" key={label}>
              <div className="db-stat-icon">
                <Icon size={18} />
              </div>
              <div className="db-stat-value">{value}</div>
              <div className="db-stat-label">{label}</div>
            </div>
          ))}
        </div>

        <div className="db-chart-grid">

          <div className="db-card db-chart-card">
            <h3 className="db-card-title">Attendance Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={attendanceTrend}>
                <CartesianGrid stroke="#EDF4FB" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#556070" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#556070" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #D8E9F8", fontSize: 12 }} />
                <Line type="monotone" dataKey="rate" stroke="#56B6FF" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="db-card db-chart-card">
            <h3 className="db-card-title">Attendance Distribution</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={distribution}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {distribution.map((entry, index) => (
                    <Cell key={entry.name} fill={distributionColors[index % distributionColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #D8E9F8", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="db-card db-chart-card">
            <h3 className="db-card-title">Weekly Attendance</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekly}>
                <CartesianGrid stroke="#EDF4FB" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#556070" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#556070" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #D8E9F8", fontSize: 12 }} />
                <Bar dataKey="present" fill="#56B6FF" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absent" fill="#D8E9F8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>

        <div className="db-card db-table-card">
          <h3 className="db-card-title">Recent Activity</h3>

          <div className="db-table-wrap">
            <table className="db-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Device</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((row, i) => (
                  <tr key={i}>
                    <td>{row.employee}</td>
                    <td>{row.time}</td>
                    <td><span className={statusClass(row.status)}>{row.status}</span></td>
                    <td>{row.device}</td>
                    <td>
                      <button className="db-table-action">
                        <Eye size={14} />
                        {row.action}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    
  );

}

export default Dashboard;