import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, CreditCard, ScanFace, Eye, Fingerprint, Clock,
  ShieldAlert, Database, LayoutDashboard, TrendingUp, Sparkles,
  ArrowRight, Users, CheckCircle2, AlertTriangle, Menu, X, HelpCircle
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from "recharts";
import "./LandingPage.css";

// Sample data for the Dashboard Preview inside the Landing Page
const previewStats = [
  { label: "Today's Attendance", value: "212 / 248", change: "85.5% present", icon: Users },
  { label: "Active Terminals", value: "4 Online", change: "All systems green", icon: Database },
  { label: "Fraud Alerts (Today)", value: "0 Detected", change: "1 attempt blocked", icon: ShieldAlert },
  { label: "Attendance Rate", value: "+2.4%", change: "vs last week", icon: TrendingUp }
];

const attendanceHistory = [
  { name: "Mon", rate: 82 },
  { name: "Tue", rate: 88 },
  { name: "Wed", rate: 79 },
  { name: "Thu", rate: 91 },
  { name: "Fri", rate: 85 },
  { name: "Sat", rate: 74 },
  { name: "Sun", rate: 68 }
];

const distributionData = [
  { name: "Present", value: 212 },
  { name: "Absent", value: 36 }
];

const COLORS = ["#3B82F6", "#D6E4F0"];

const recentLogs = [
  { id: 1, name: "Aiman Rasyid", time: "08:02 AM", method: "RFID + Face", status: "On Time" },
  { id: 2, name: "Nur Aisyah", time: "08:14 AM", method: "RFID + Face", status: "Late" },
  { id: 3, name: "Kevin Tan", time: "08:35 AM", method: "RFID + Fingerprint", status: "Late (Fallback)" },
  { id: 4, name: "Sarah Jenkins", time: "08:55 AM", method: "RFID + Face", status: "On Time" }
];

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(0);
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate("/login");
  };

  const handleViewDashboard = () => {
    navigate("/dashboard");
  };

  return (
    <div className="landing-layout">
      {/* Background decoration */}
      <div className="landing-bg-glows">
        <div className="bg-glow bg-glow-1"></div>
        <div className="bg-glow bg-glow-2"></div>
      </div>

      {/* Navigation Header */}
      <header className="landing-header glass-panel">
        <div className="header-container">
          <div className="header-logo">
            <div className="logo-icon-bg">
              <Shield className="logo-icon" size={24} />
            </div>
            <span className="logo-text">Bio-Sync <span className="text-accent">Sentinel</span></span>
          </div>

          {/* Desktop Nav */}
          <nav className="desktop-nav">
            <a href="#workflow" className="nav-item">Workflow</a>
            <a href="#features" className="nav-item">Features</a>
            <a href="#preview" className="nav-item">Dashboard Preview</a>
            <a href="#overview" className="nav-item">System Overview</a>
          </nav>

          <div className="header-actions">
            <button onClick={handleGetStarted} className="btn-signin">
              Sign In
            </button>
            <button onClick={handleGetStarted} className="btn-getstarted btn-glow">
              Get Started <ArrowRight size={16} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-btn" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav Dropdown */}
        {mobileMenuOpen && (
          <div className="mobile-nav glass-panel">
            <a href="#workflow" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Workflow</a>
            <a href="#features" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#preview" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Dashboard Preview</a>
            <a href="#overview" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>System Overview</a>
            <div className="mobile-nav-divider"></div>
            <button onClick={() => { setMobileMenuOpen(false); handleGetStarted(); }} className="mobile-btn-signin">Sign In</button>
            <button onClick={() => { setMobileMenuOpen(false); handleGetStarted(); }} className="mobile-btn-getstarted">Get Started</button>
          </div>
        )}
      </header>

      <main className="landing-main">
        {/* Hero Section */}
        <section id="hero" className="hero-section">
          <div className="section-container hero-grid">
            <div className="hero-content">
              <div className="badge">
                <Sparkles size={14} className="badge-icon" />
                <span>Next-Gen Biometric Authentication</span>
              </div>
              <h1 className="hero-title">
                Secure Multi-Layered <br />
                <span className="text-gradient">Attendance Verification</span>
              </h1>
              <p className="hero-subtitle">
                Bio-Sync Sentinel combines fast RFID authentication, AI-powered live facial recognition with spoofing detection, and high-security capacitive fingerprint verification to eliminate proxy attendance and streamline institutional tracking.
              </p>
              <div className="hero-ctas">
                <button onClick={handleGetStarted} className="btn-primary-large btn-glow">
                  Get Started
                </button>
                <button onClick={handleViewDashboard} className="btn-secondary-large">
                  View Dashboard
                </button>
              </div>
              <div className="hero-trust">
                <div className="trust-item">
                  <span className="trust-number">99.9%</span>
                  <span className="trust-label">Accuracy Rate</span>
                </div>
                <div className="trust-divider"></div>
                <div className="trust-item">
                  <span className="trust-number">&lt; 1.5s</span>
                  <span className="trust-label">Verification Speed</span>
                </div>
                <div className="trust-divider"></div>
                <div className="trust-item">
                  <span className="trust-number">Zero</span>
                  <span className="trust-label">Proxy Attendance</span>
                </div>
              </div>
            </div>

            {/* Futuristic Animated SVG Hero Illustration */}
            <div className="hero-visual">
              <div className="visual-wrapper glass-panel">
                <svg className="hero-illustration" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Grid background */}
                  <defs>
                    <pattern id="illustration-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(214, 228, 240, 0.2)" strokeWidth="1" />
                    </pattern>
                    <linearGradient id="gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1E3A5F" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                    <linearGradient id="gradient-accent" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#3B82F6" />
                      <stop offset="100%" stopColor="#5EEAD4" />
                    </linearGradient>
                    <filter id="glow" x="-10%" y="-10%" width="120%" height="120%">
                      <feGaussianBlur stdDeviation="8" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                  </defs>

                  <rect width="100%" height="100%" fill="url(#illustration-grid)" rx="20" />

                  {/* Connection cables / light paths */}
                  <g className="cables">
                    {/* Left node (RFID) to center */}
                    <path d="M 120 180 Q 200 150 250 220" fill="none" stroke="#D6E4F0" strokeWidth="2" strokeDasharray="5,5" />
                    {/* Top node (Face) to center */}
                    <path d="M 250 100 V 220" fill="none" stroke="#D6E4F0" strokeWidth="2" />
                    {/* Right node (Fingerprint) to center */}
                    <path d="M 380 180 Q 300 150 250 220" fill="none" stroke="#D6E4F0" strokeWidth="2" strokeDasharray="5,5" />
                    {/* Center (Terminal) to Database (Bottom) */}
                    <path className="pulse-path" d="M 250 280 V 380" fill="none" stroke="url(#gradient-accent)" strokeWidth="3" strokeDasharray="6,6" filter="url(#glow)" />
                  </g>

                  {/* Node 1: RFID Tap */}
                  <g className="hero-node node-rfid" transform="translate(100, 160)">
                    <circle cx="20" cy="20" r="32" fill="#FFFFFF" stroke="#D6E4F0" strokeWidth="2" />
                    <rect x="5" y="10" width="30" height="20" rx="3" fill="#1E3A5F" opacity="0.1" />
                    <rect x="5" y="10" width="30" height="20" rx="3" stroke="#1E3A5F" strokeWidth="2" />
                    <circle cx="15" cy="20" r="4" fill="#3B82F6" />
                    <path d="M 24 16 A 6 6 0 0 1 24 24" stroke="#1E3A5F" strokeWidth="1.5" fill="none" />
                    <path d="M 28 13 A 10 10 0 0 1 28 27" stroke="#1E3A5F" strokeWidth="1.5" fill="none" />
                    <circle className="node-ping" cx="20" cy="20" r="30" stroke="#3B82F6" strokeWidth="1.5" opacity="0" />
                  </g>

                  {/* Node 2: Face Scan */}
                  <g className="hero-node node-face" transform="translate(230, 60)">
                    <circle cx="20" cy="20" r="36" fill="#FFFFFF" stroke="#D6E4F0" strokeWidth="2" />
                    {/* Face Silhouette */}
                    <path d="M 20 10 C 25 10 29 14 29 19 C 29 23 27 24 28 26 C 29 28 27 30 20 30 C 13 30 11 28 12 26 C 13 24 11 23 11 19 C 11 14 15 10 20 10 Z" fill="none" stroke="#1E3A5F" strokeWidth="2" />
                    {/* Scanning bracket corner top-left */}
                    <path d="M 5 5 H 12 V 12" fill="none" stroke="#5EEAD4" strokeWidth="2.5" />
                    <path d="M 35 5 H 28 V 12" fill="none" stroke="#5EEAD4" strokeWidth="2.5" />
                    <path d="M 5 35 H 12 V 28" fill="none" stroke="#5EEAD4" strokeWidth="2.5" />
                    <path d="M 35 35 H 28 V 28" fill="none" stroke="#5EEAD4" strokeWidth="2.5" />
                    {/* Scanning bar */}
                    <line className="scan-bar" x1="4" y1="12" x2="36" y2="12" stroke="#5EEAD4" strokeWidth="2" filter="url(#glow)" />
                  </g>

                  {/* Node 3: Fingerprint Fallback */}
                  <g className="hero-node node-fingerprint" transform="translate(360, 160)">
                    <circle cx="20" cy="20" r="32" fill="#FFFFFF" stroke="#D6E4F0" strokeWidth="2" />
                    {/* Fingerprint Loops */}
                    <path d="M 12 25 C 12 18, 16 12, 20 12 C 24 12, 28 18, 28 25 M 15 25 C 15 20, 17 15, 20 15 C 23 15, 25 20, 25 25 M 18 25 C 18 22, 19 18, 20 18 C 21 18, 22 22, 22 25" stroke="#1E3A5F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  </g>

                  {/* Center Node: Terminal Core */}
                  <g className="hero-node node-terminal" transform="translate(210, 210)">
                    <rect x="0" y="0" width="80" height="90" rx="12" fill="url(#gradient-primary)" stroke="#3B82F6" strokeWidth="2" filter="url(#glow)" />
                    {/* Screen area */}
                    <rect x="8" y="8" width="64" height="42" rx="6" fill="#0A192F" />
                    {/* Scan indicator */}
                    <circle className="radar-circle" cx="40" cy="29" r="14" stroke="#5EEAD4" strokeWidth="1" opacity="0.6" />
                    <circle className="radar-sweep" cx="40" cy="29" r="6" fill="#5EEAD4" />
                    {/* Green Verification Check */}
                    <path className="verif-check" d="M 32 54 L 38 60 L 48 50" fill="none" stroke="#5EEAD4" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Text indicators */}
                    <rect x="15" y="68" width="50" height="4" rx="2" fill="#FFFFFF" opacity="0.2" />
                    <rect x="25" y="76" width="30" height="4" rx="2" fill="#5EEAD4" opacity="0.8" />
                  </g>

                  {/* Node 4: Cloud / Database Sync */}
                  <g className="hero-node node-database" transform="translate(215, 370)">
                    <circle cx="35" cy="35" r="35" fill="#FFFFFF" stroke="#D6E4F0" strokeWidth="2" />
                    {/* Database cylinders */}
                    <g fill="none" stroke="#1E3A5F" strokeWidth="2" transform="translate(18, 15)">
                      <rect x="0" y="0" width="34" height="12" rx="4" fill="#3B82F6" opacity="0.1" />
                      <rect x="0" y="0" width="34" height="12" rx="4" />
                      <path d="M 0 6 C 0 10, 34 10, 34 6" />

                      <rect x="0" y="14" width="34" height="12" rx="4" fill="#3B82F6" opacity="0.1" />
                      <rect x="0" y="14" width="34" height="12" rx="4" />
                      <path d="M 0 20 C 0 24, 34 24, 34 20" />

                      <rect x="0" y="28" width="34" height="12" rx="4" fill="#5EEAD4" opacity="0.15" />
                      <rect x="0" y="28" width="34" height="12" rx="4" />
                      <path d="M 0 34 C 0 38, 34 38, 34 34" />
                    </g>
                  </g>
                </svg>
                {/* Floating tags */}
                <div className="floating-tag tag-rfid">
                  <CreditCard size={12} className="tag-icon" /> RFID Registered
                </div>
                <div className="floating-tag tag-liveness">
                  <Eye size={12} className="tag-icon" /> Liveness Detected
                </div>
                <div className="floating-tag tag-verified">
                  <CheckCircle2 size={12} className="tag-icon" /> Identity Verified
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System Workflow Section */}
        <section id="workflow" className="workflow-section">
          <div className="section-container">
            <div className="section-header">
              <span className="section-label">Operational Process</span>
              <h2 className="section-title">How Bio-Sync Sentinel Works</h2>
              <p className="section-subtitle">
                Our verification engine processes users sequentially through physical, biometric, and network steps in under 1.5 seconds.
              </p>
            </div>

            {/* Connected Cards Timeline */}
            <div className="workflow-grid">
              {[
                { title: "RFID Card Tap", desc: "User taps MIFARE card on terminal reader to fetch baseline encryption ID.", icon: CreditCard },
                { title: "Record Retrieval", desc: "System syncs with secure local cache to retrieve user parameters.", icon: Users },
                { title: "Face Recognition", desc: "AI maps facial keypoints and runs active liveness scans.", icon: ScanFace },
                { title: "Fingerprint Fallback", desc: "Optional capacitive scan verifies fingerprints if face recognition fails.", icon: Fingerprint },
                { title: "Attendance Logged", desc: "System locks in employee status, timing, location and verification score.", icon: Clock },
                { title: "MySQL DB Sync", desc: "Secure encrypted logs write directly to central administrative database.", icon: Database },
                { title: "Dashboard Monitoring", desc: "Real-time feeds update charts, dashboards, and notify admins of anomalies.", icon: LayoutDashboard }
              ].map((step, idx) => (
                <div 
                  key={idx} 
                  className={`workflow-card glass-panel ${activeWorkflowStep === idx ? "active" : ""}`}
                  onMouseEnter={() => setActiveWorkflowStep(idx)}
                >
                  <div className="workflow-step-num">0{idx + 1}</div>
                  <div className="workflow-icon-bg">
                    <step.icon className="workflow-icon" size={24} />
                  </div>
                  <h3 className="workflow-card-title">{step.title}</h3>
                  <p className="workflow-card-desc">{step.desc}</p>
                  {idx < 6 && (
                    <div className="workflow-arrow-line">
                      <ArrowRight className="workflow-arrow" size={16} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <div className="section-container">
            <div className="section-header">
              <span className="section-label">Enterprise Architecture</span>
              <h2 className="section-title">Advanced Core Capabilities</h2>
              <p className="section-subtitle">
                A secure biometric platform designed for resilience, fraud prevention, and performance.
              </p>
            </div>

            <div className="features-grid">
              {[
                { title: "RFID Authentication", desc: "NFC/MIFARE card support. Reads, authenticates, and cross-references unique credentials in under 200ms.", icon: CreditCard },
                { title: "AI Facial Recognition", desc: "High-performance convolutional neural networks verify faces against secure local templates.", icon: ScanFace },
                { title: "Liveness Detection", desc: "Active and passive anti-spoofing logic blocks high-resolution photos, tablet videos, and 3D print masks.", icon: Eye },
                { title: "Fingerprint Backup", desc: "High-resolution capacitive semiconductor sensor provides 508 DPI scanning fallback in low-light settings.", icon: Fingerprint },
                { title: "Real-Time Syncing", desc: "Local queues buffer records instantly and synchronize upstream as soon as server connection resumes.", icon: Clock },
                { title: "Fraud Detection", desc: "Instantly flags mismatched credentials, multi-terminal check-ins, or liveness failure alerts.", icon: ShieldAlert },
                { title: "Secure MySQL Database", desc: "Relational database schema with indexes, transactional safety, and field-level encryption for logs.", icon: Database },
                { title: "Admin Portal", desc: "Responsive layout with user provisioning, terminal diagnostic panels, logs, and dispute workflows.", icon: LayoutDashboard },
                { title: "Advanced Analytics", desc: "Tracks team metrics, absentee trends, terminal workload statistics, and anomalies dynamically.", icon: TrendingUp }
              ].map((feat, idx) => (
                <div key={idx} className="feature-card glass-panel">
                  <div className="feature-card-icon-bg">
                    <feat.icon className="feature-card-icon" size={22} />
                  </div>
                  <h3 className="feature-card-title">{feat.title}</h3>
                  <p className="feature-card-desc">{feat.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Dashboard Preview Section */}
        <section id="preview" className="preview-section">
          <div className="section-container">
            <div className="section-header">
              <span className="section-label">Live Control Center</span>
              <h2 className="section-title">High Fidelity Dashboard Preview</h2>
              <p className="section-subtitle">
                Experience the exact interface administrators use to monitor terminals, track metrics, and manage user disputes.
              </p>
            </div>

            {/* Interactive Mock Dashboard */}
            <div className="dashboard-mockup glass-panel">
              {/* Mock Sidebar */}
              <div className="mock-sidebar">
                <div className="mock-brand">
                  <Shield size={18} className="mock-logo-icon" />
                  <span>Bio-Sync</span>
                </div>
                <div className="mock-nav">
                  <div className="mock-nav-item active"><LayoutDashboard size={14} /> Dashboard</div>
                  <div className="mock-nav-item"><Clock size={14} /> Attendance</div>
                  <div className="mock-nav-item"><ShieldAlert size={14} /> Fraud Logs <span className="alert-dot"></span></div>
                  <div className="mock-nav-item"><Users size={14} /> Users</div>
                </div>
              </div>

              {/* Mock Main Pane */}
              <div className="mock-main">
                {/* Mock Navbar */}
                <div className="mock-navbar">
                  <span className="mock-nav-title">System Status: Active</span>
                  <div className="mock-user">
                    <div className="mock-avatar">SA</div>
                    <span>System Admin</span>
                  </div>
                </div>

                {/* Content */}
                <div className="mock-content">
                  {/* Stats Grid */}
                  <div className="mock-stats-grid">
                    {previewStats.map((stat, i) => (
                      <div key={i} className="mock-stat-card">
                        <div className="mock-stat-header">
                          <span className="mock-stat-label">{stat.label}</span>
                          <stat.icon size={16} className="mock-stat-icon-color" />
                        </div>
                        <div className="mock-stat-value">{stat.value}</div>
                        <div className="mock-stat-change">{stat.change}</div>
                      </div>
                    ))}
                  </div>

                  {/* Charts and Lists row */}
                  <div className="mock-details-grid">
                    {/* Left: Recharts Trend area */}
                    <div className="mock-card mock-chart-card">
                      <h4 className="mock-card-title">Weekly Attendance Rate (%)</h4>
                      <div className="mock-chart-container">
                        <ResponsiveContainer width="100%" height={160}>
                          <AreaChart data={attendanceHistory}>
                            <defs>
                              <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[50, 100]} hide={true} />
                            <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                            <Area type="monotone" dataKey="rate" stroke="#3B82F6" strokeWidth={2} fillOpacity={1} fill="url(#colorRate)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Right: Pie Distribution */}
                    <div className="mock-card mock-pie-card">
                      <h4 className="mock-card-title">Today's Ratio</h4>
                      <div className="mock-pie-container">
                        <ResponsiveContainer width="100%" height={130}>
                          <PieChart>
                            <Pie
                              data={distributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={30}
                              outerRadius={45}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {distributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ fontSize: 10, borderRadius: 6 }} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pie-legend">
                          <span className="legend-item"><span className="legend-color color-present"></span> Present (212)</span>
                          <span className="legend-item"><span className="legend-color color-absent"></span> Absent (36)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Logs and alerts */}
                  <div className="mock-log-grid">
                    {/* Live Logs */}
                    <div className="mock-card">
                      <h4 className="mock-card-title">Live Verification Logs</h4>
                      <div className="mock-logs-list">
                        {recentLogs.map((log) => (
                          <div key={log.id} className="mock-log-item">
                            <div className="mock-log-info">
                              <span className="log-user-name">{log.name}</span>
                              <span className="log-user-method">{log.method}</span>
                            </div>
                            <div className="mock-log-time-status">
                              <span className="log-time">{log.time}</span>
                              <span className={`log-status ${log.status.includes("Late") ? "status-late" : "status-ontime"}`}>{log.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Security alerts panel */}
                    <div className="mock-card alert-card">
                      <div className="mock-card-header-icon">
                        <h4 className="mock-card-title text-alert">Security & Fraud Alerts</h4>
                        <ShieldAlert className="text-alert-icon" size={16} />
                      </div>
                      <div className="alert-box">
                        <div className="alert-box-header">
                          <AlertTriangle size={14} className="alert-triangle" />
                          <span>Spoofing Attempt Blocked</span>
                        </div>
                        <p className="alert-box-body">
                          Terminal 02 blocked access to <strong>ID: 10924 (M. Firdaus)</strong> due to photo verification mismatch (Liveness score 14%).
                        </p>
                        <span className="alert-box-time">Today, 08:31 AM</span>
                      </div>
                      <button className="btn-resolve">Review In Dispute Center</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* System Overview Section */}
        <section id="overview" className="overview-section">
          <div className="section-container">
            <div className="overview-card glass-panel">
              <div className="overview-grid-layout">
                <div className="overview-text">
                  <span className="section-label text-left">Detailed Architecture</span>
                  <h2 className="section-title text-left">Multi-layered Fallback Topology</h2>
                  <p className="overview-paragraph">
                    Users begin verification by tapping a <strong>MIFARE RFID card</strong> on the terminal reader, instantly fetching their encrypted profile. Once verified, the terminal's built-in optical sensor performs active <strong>facial recognition</strong> coupled with liveness detection algorithms. This processes facial topography, blinking indicators, and pixel depth to confirm physical presence, preventing spoofing attempts using high-definition photos or digital displays.
                  </p>
                  <p className="overview-paragraph">
                    In cases where facial verification fails (due to severe low-light environments, lens obstruction, or camera maintenance), the system automatically triggers a <strong>capacitive fingerprint scanner</strong> fallback. This ensures high-security fail-safe operations under all conditions. Upon verification, attendance data is pushed to a centralized, transaction-safe <strong>MySQL Database</strong>, reflecting instantaneously on the administrative monitor.
                  </p>
                </div>
                <div className="overview-diagram">
                  <div className="diagram-item active">
                    <span className="diagram-step">01</span>
                    <div>
                      <h5>RFID Initial Handshake</h5>
                      <p>Card ID matching retrieves encrypted bio-templates from terminal memory.</p>
                    </div>
                  </div>
                  <div className="diagram-item">
                    <span className="diagram-step">02</span>
                    <div>
                      <h5>Computer Vision Verification</h5>
                      <p>Active liveness detection verifies landmarks and eye movement vectors.</p>
                    </div>
                  </div>
                  <div className="diagram-item">
                    <span className="diagram-step">03</span>
                    <div>
                      <h5>Fail-safe Authentication</h5>
                      <p>Fingerprint reading triggers as fallback to prevent false rejections.</p>
                    </div>
                  </div>
                  <div className="diagram-item">
                    <span className="diagram-step">04</span>
                    <div>
                      <h5>Transaction Log Commit</h5>
                      <p>AES-encrypted packages write synchronously to the administrative dashboard database.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Section */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="brand-logo">
              <Shield className="logo-icon" size={20} />
              <span>Bio-Sync <span className="text-accent">Sentinel</span></span>
            </div>
            <p className="footer-tagline">Secure Biometric Attendance Systems</p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>System</h4>
              <a href="#workflow">Workflow</a>
              <a href="#features">Features</a>
              <a href="#preview">Mockup</a>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="#overview">Architecture</a>
              <a href="#hero">Accuracy Reports</a>
              <a href="#preview">Developer API</a>
            </div>
            <div className="footer-col">
              <h4>Organization</h4>
              <a href="#hero">About Us</a>
              <a href="#preview">Contact</a>
              <a href="#preview">Support</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-container">
            <span>© {new Date().getFullYear()} Bio-Sync Sentinel. All rights reserved.</span>
            <div className="footer-legal">
              <a href="#hero">Privacy Policy</a>
              <span>•</span>
              <a href="#hero">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
