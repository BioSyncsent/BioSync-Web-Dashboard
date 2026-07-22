import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import toast, { Toaster } from "react-hot-toast";
import {
  Mail,
  Phone,
  Hash,
  Building2,
  CalendarDays,
  Pencil,
  KeyRound,
  ShieldCheck,
  Fingerprint,
  ScanFace,
  Laptop2,
  LogIn,
  Clock3,
  TrendingUp,
  Flame,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import "./Profile.css";

function capitalize(text) {
  if (!text) return "";

  return text.charAt(0).toUpperCase() + text.slice(1);
}

// TODO: replace these mocked sections with real Firestore data
const weeklyTrend = [
  { day: "Mon", value: 100 },
  { day: "Tue", value: 100 },
  { day: "Wed", value: 80 },
  { day: "Thu", value: 100 },
  { day: "Fri", value: 100 },
  { day: "Sat", value: 60 },
  { day: "Sun", value: 100 },
];

const activityLog = [
  { icon: LogIn, text: "Logged in to BioSync Sentinel", time: "Today, 08:00 AM" },
  { icon: Fingerprint, text: "Checked in via Fingerprint", time: "Today, 08:02 AM" },
  { icon: Pencil, text: "Updated profile information", time: "2 days ago" },
  { icon: LogIn, text: "Logged in to BioSync Sentinel", time: "3 days ago" },
];

const recentCheckins = [
  { name: "You", method: "Face Recognition", time: "Today, 08:02 AM", status: "On Time" },
  { name: "You", method: "Fingerprint", time: "Yesterday, 08:10 AM", status: "On Time" },
  { name: "You", method: "Face Recognition", time: "2 days ago, 08:45 AM", status: "Late" },
];

const attendanceStats = { totalDays: 22, present: 19, absent: 2, late: 1 };
const attendancePercentage = 86;
const currentStreak = 5;

function Profile() {
  const { user } = useAuth();
  const [twoFA, setTwoFA] = useState(false);

  const isActive = true; // TODO: derive from real user status field

  const initials = (user?.fullName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (attendancePercentage / 100) * circumference;

  function handleEditProfile() {
    toast("Edit Profile form coming soon");
  }

  function handleChangePassword() {
    toast("Change Password flow coming soon");
  }

  function handleToggle2FA() {
    setTwoFA((prev) => !prev);
    toast.success(!twoFA ? "2FA enabled" : "2FA disabled");
  }

  return (
   
      <div className="profile-page">
        <Toaster position="top-right" />

        {/* Header */}
        <div className="glass-card profile-header">
          <div className="avatar-wrap">
            <div className="avatar">{initials}</div>
            <span className={`status-dot ${isActive ? "active" : "inactive"}`} />
          </div>

          <div className="profile-header-info">
            <h1 className="profile-name">{user?.fullName || "User"}</h1>
            <span className="role-badge">
              <ShieldCheck size={13} /> {capitalize(user?.role || "Member")}
            </span>
            <span className={`status-badge ${isActive ? "active" : "inactive"}`}>
              {isActive ? "🟢 Active" : "🔴 Inactive"}
            </span>
            <p className="profile-bio">
              Secured with BioSync Sentinel biometric authentication. Manage your
              personal information, security settings, and attendance insights here.
            </p>
          </div>

          <div className="header-actions">
            <button className="btn btn-primary" onClick={handleEditProfile}>
              <Pencil size={14} /> Edit Profile
            </button>
            <button className="btn btn-outline" onClick={handleChangePassword}>
              <KeyRound size={14} /> Change Password
            </button>
          </div>
        </div>

        <div className="profile-grid">
          {/* LEFT COLUMN */}
          <div className="profile-col">
            {/* Personal Information */}
            <div className="glass-card">
              <h3 className="card-title">
                <Hash size={16} /> Personal Information
              </h3>
              <div className="info-grid">
                <div className="info-item">
                  <Hash size={16} />
                  <div>
                    <p className="info-label">Full Name</p>
                    <p className="info-value">{user?.fullName || "N/A"}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Mail size={16} />
                  <div>
                    <p className="info-label">Email</p>
                    <p className="info-value">{user?.email || "N/A"}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Phone size={16} />
                  <div>
                    <p className="info-label">Phone Number</p>
                    <p className="info-value">{user?.phone || "N/A"}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Hash size={16} />
                  <div>
                    <p className="info-label">User ID</p>
                    <p className="info-value">{user?.studentId ? user.studentId.slice(0, 10) : "N/A" || "N/A"}</p>
                  </div>
                </div>
                <div className="info-item">
                  <Building2 size={16} />
                  <div>
                    <p className="info-label">Department / Organization</p>
                    <p className="info-value">{user?.department || "N/A"}</p>
                  </div>
                </div>
                <div className="info-item">
                  <CalendarDays size={16} />
                  <div>
                    <p className="info-label">Join Date</p>
                    <p className="info-value">
                      {user?.createdAt
                        ? user.createdAt.toDate().toLocaleDateString("en-MY", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Attendance Summary */}
            <div className="glass-card">
              <h3 className="card-title">
                <TrendingUp size={16} /> Attendance Summary
              </h3>
              <div className="stat-row">
                <div className="stat-box">
                  <div className="stat-num">{attendanceStats.totalDays}</div>
                  <div className="stat-label">Total Days</div>
                </div>
                <div className="stat-box present">
                  <div className="stat-num">{attendanceStats.present}</div>
                  <div className="stat-label">Present</div>
                </div>
                <div className="stat-box absent">
                  <div className="stat-num">{attendanceStats.absent}</div>
                  <div className="stat-label">Absent</div>
                </div>
                <div className="stat-box late">
                  <div className="stat-num">{attendanceStats.late}</div>
                  <div className="stat-label">Late</div>
                </div>
              </div>

              <div style={{ height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyTrend}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid rgba(37,99,235,0.2)",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#trendFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity Timeline */}
            <div className="glass-card">
              <h3 className="card-title">
                <Clock3 size={16} /> Activity Timeline
              </h3>
              <div className="timeline">
                {activityLog.map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div className="timeline-item" key={i}>
                      <div className="timeline-icon">
                        <Icon size={15} />
                      </div>
                      <div>
                        <p className="timeline-text">{item.text}</p>
                        <p className="timeline-time">{item.time}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Check-ins */}
            <div className="glass-card">
              <h3 className="card-title">
                <ScanFace size={16} /> Recent Check-ins
              </h3>
              {recentCheckins.map((c, i) => (
                <div className="checkin-row" key={i}>
                  <div className="checkin-left">
                    <div className="checkin-icon">
                      {c.method === "Fingerprint" ? (
                        <Fingerprint size={16} />
                      ) : (
                        <ScanFace size={16} />
                      )}
                    </div>
                    <div>
                      <p className="checkin-name">{c.name}</p>
                      <p className="checkin-meta">
                        {c.method} · {c.time}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`pill ${c.status === "Late" ? "late" : "on-time"}`}
                  >
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="profile-col">
            {/* Security Settings */}
            <div className="glass-card">
              <h3 className="card-title">
                <ShieldCheck size={16} /> Security Settings
              </h3>

              <div className="security-row">
                <div className="security-label">
                  <KeyRound size={16} /> Change Password
                </div>
                <button className="btn btn-outline" onClick={handleChangePassword}>
                  Update
                </button>
              </div>

              <div className="security-row">
                <div>
                  <div className="security-label">
                    <ShieldCheck size={16} /> Two-Factor Authentication
                  </div>
                  <p className="security-sub">Extra layer of login security</p>
                </div>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={twoFA}
                    onChange={handleToggle2FA}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="security-row">
                <div>
                  <div className="security-label">
                    <Laptop2 size={16} /> Login Activity
                  </div>
                  <p className="security-sub">
                    Last login: Today, 08:00 AM · Chrome on Windows
                  </p>
                </div>
              </div>

              <div className="security-row">
                <div className="security-label">
                  <Fingerprint size={16} /> Biometric Status
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <span className="biometric-chip">
                    <CheckCircle2 size={12} /> Face
                  </span>
                  <span className="biometric-chip">
                    <CheckCircle2 size={12} /> Fingerprint
                  </span>
                </div>
              </div>
            </div>

            {/* Performance / Insights */}
            <div className="glass-card">
              <h3 className="card-title">
                <Sparkles size={16} /> Performance & Insights
              </h3>

              <div className="perf-top">
                <div className="progress-ring-wrap">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="progress-ring-label">
                    <span className="pct">{attendancePercentage}%</span>
                    <span className="pct-sub">Attendance</span>
                  </div>
                </div>

                <div>
                  <span className="streak-badge">
                    <Flame size={14} /> {currentStreak} days present in a row
                  </span>
                </div>
              </div>

              <div className="ai-insight">
                <Sparkles size={16} />
                <span>
                  Your attendance improved by 12% this week compared to last week.
                  Keep up the consistency!
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
   
  );
}

export default Profile;