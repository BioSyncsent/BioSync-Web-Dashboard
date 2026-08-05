import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Shield, CreditCard, ScanFace, Eye, Fingerprint, Clock,
  ShieldAlert, Database, LayoutDashboard, TrendingUp, Sparkles,
  ArrowRight, Users, CheckCircle2, AlertTriangle, Menu, X, HelpCircle,
  Lock, Cpu, Server, Activity, FileText, Settings, Key, Check, AlertCircle,
  Terminal, ShieldCheck, ChevronRight, Info
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  Tooltip, PieChart, Pie, Cell
} from "recharts";
import logoMark from "../assets/biosync-mark.png";
import "./LandingPage.css";

// Recharts mockup data
const attendanceTrend = [
  { day: "Mon", rate: 82 },
  { day: "Tue", rate: 88 },
  { day: "Wed", rate: 79 },
  { day: "Thu", rate: 91 },
  { day: "Fri", rate: 85 },
  { day: "Sat", rate: 74 },
  { day: "Sun", rate: 68 }
];

const distributionData = [
  { name: "Present", value: 212 },
  { name: "Absent", value: 36 }
];

const COLORS = ["#38BDF8", "#10263F"];

const recentLogs = [
  { id: 1, name: "Aiman Rasyid", time: "08:02 AM", method: "RFID + Liveness", status: "Verified" },
  { id: 2, name: "Nur Aisyah", time: "08:14 AM", method: "RFID + Liveness", status: "Verified" },
  { id: 3, name: "Kevin Tan", time: "08:35 AM", method: "RFID + Fingerprint", status: "Fallback" },
  { id: 4, name: "Sarah Jenkins", time: "08:55 AM", method: "RFID + Liveness", status: "Verified" }
];

function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [activeOverviewStep, setActiveOverviewStep] = useState(0);
  const [hoveredArchNode, setHoveredArchNode] = useState(null);
  const autoCycleTimer = useRef(null);
  const layoutRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-cycle timeline steps
  useEffect(() => {
    autoCycleTimer.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 6);
    }, 4500);

    return () => {
      if (autoCycleTimer.current) clearInterval(autoCycleTimer.current);
    };
  }, []);

  // Scroll-triggered reveal animations (fade-up + blur reveal)
  useEffect(() => {
    const revealEls = document.querySelectorAll(".reveal");
    if (!revealEls.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    revealEls.forEach((el, idx) => {
      el.style.setProperty("--reveal-delay", `${(idx % 6) * 70}ms`);
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Mouse-follow spotlight + subtle parallax on hero glows
  useEffect(() => {
    const layout = layoutRef.current;
    if (!layout) return;

    let frame = null;
    const handleMouseMove = (e) => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const xPct = (e.clientX / window.innerWidth) * 100;
        const yPct = (e.clientY / (window.innerHeight || 1)) * 100;
        layout.style.setProperty("--mx", `${xPct}%`);
        layout.style.setProperty("--my", `${yPct}%`);
      });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  const handleStepClick = (idx) => {
    setActiveStep(idx);
    if (autoCycleTimer.current) {
      clearInterval(autoCycleTimer.current); // Stop auto cycling on user interaction
    }
  };

  const handleGetStarted = () => {
    navigate("/login");
  };

  const handleLogoClick = () => {
    if (location.pathname === "/") {
      // Already on the landing page — reload so entrance animations replay
      window.location.reload();
    } else {
      // Elsewhere in the app — navigate back to the landing page
      navigate("/");
    }
  };

  return (
    <div className="landing-layout" ref={layoutRef}>
      {/* Mouse-follow spotlight */}
      <div className="mouse-spotlight"></div>

      {/* Background decoration */}
      <div className="landing-bg-glows">
        <div className="bg-glow bg-glow-1"></div>
        <div className="bg-glow bg-glow-2"></div>
        <div className="bg-glow bg-glow-3"></div>
      </div>

      {/* Cyber Grid Overlay */}
      <div className="landing-cyber-grid"></div>

      {/* Navigation Header */}
      <header className="landing-header glass-panel">
        <div className="header-container">
          <button
            type="button"
            className="header-logo"
            onClick={handleLogoClick}
            aria-label="Bio-Sync Sentinel — return to homepage"
          >
            <img src={logoMark} alt="" className="logo-mark" />
            <span className="logo-text">Bio-Sync <span className="text-accent">Sentinel</span></span>
          </button>

          {/* Desktop Nav */}
          <nav className="desktop-nav">
            <a href="#overview" className="nav-item">Overview</a>
            <a href="#problems" className="nav-item">Problems</a>
            <a href="#workflow" className="nav-item">Timeline</a>
            <a href="#architecture" className="nav-item">Architecture</a>
            <a href="#preview" className="nav-item">Dashboard</a>
            <a href="#security" className="nav-item">Trust Layers</a>
          </nav>

          <div className="header-actions">
            <button onClick={handleGetStarted} className="btn-signin">
              Sign In
            </button>
            <button onClick={handleGetStarted} className="btn-getstarted btn-glow">
              Get Started <ArrowRight size={14} />
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
            <a href="#overview" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Overview</a>
            <a href="#problems" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Problems</a>
            <a href="#workflow" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Timeline</a>
            <a href="#architecture" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Architecture</a>
            <a href="#preview" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Dashboard</a>
            <a href="#security" className="mobile-nav-item" onClick={() => setMobileMenuOpen(false)}>Trust Layers</a>
            <div className="mobile-nav-divider"></div>
            <button onClick={() => { setMobileMenuOpen(false); handleGetStarted(); }} className="mobile-btn-signin">Sign In</button>
            <button onClick={() => { setMobileMenuOpen(false); handleGetStarted(); }} className="mobile-btn-getstarted">Get Started</button>
          </div>
        )}
      </header>

      <main className="landing-main">
        
        {/* ================= HERO SECTION ================= */}
        <section id="hero" className="hero-section">
          <div className="section-container hero-grid">
            <div className="hero-content">
              <div className="badge">
                <Sparkles size={12} className="badge-icon" />
                <span>Enterprise Biometric Access Control</span>
              </div>
              <h1 className="hero-title">
                Secure Attendance <br />
                <span className="text-gradient">Beyond Identity</span>
              </h1>
              <p className="hero-subtitle">
                Bio-Sync Sentinel combines RFID authentication, AI-powered liveness facial recognition, fingerprint verification, and real-time fraud monitoring into one intelligent attendance platform.
              </p>
              <div className="hero-ctas">
                <a href="#overview" className="btn-primary-large btn-glow">
                  Explore System
                </a>
                <a href="#architecture" className="btn-secondary-large">
                  View Architecture
                </a>
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

            {/* Right side: 3D Visualization */}
            <div className="hero-visual">
              <div className="visual-wrapper glass-panel">
                <div className="visual-3d-grid">
                  <svg className="hero-illustration" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Background gridlines */}
                    <defs>
                      <pattern id="hero-grid-pattern" width="30" height="30" patternUnits="userSpaceOnUse">
                        <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(58, 110, 165, 0.15)" strokeWidth="1" />
                      </pattern>
                      <linearGradient id="line-glow" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38BDF8" />
                        <stop offset="50%" stopColor="#22C55E" />
                        <stop offset="100%" stopColor="#38BDF8" />
                      </linearGradient>
                      <filter id="hero-blur" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="10" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                    
                    <rect width="100%" height="100%" fill="url(#hero-grid-pattern)" />

                    {/* Laser scanning beam */}
                    <line className="scan-line-horizontal" x1="50" y1="100" x2="450" y2="100" stroke="#38BDF8" strokeWidth="2" filter="url(#hero-blur)" />

                    {/* Animated Connection Paths */}
                    <g className="connection-paths">
                      <path d="M 90 250 Q 170 200 250 250" fill="none" stroke="rgba(0, 212, 255, 0.4)" strokeWidth="2" strokeDasharray="6,4" />
                      <path d="M 250 140 V 250" fill="none" stroke="rgba(0, 212, 255, 0.4)" strokeWidth="2" strokeDasharray="6,4" />
                      <path d="M 410 250 Q 330 200 250 250" fill="none" stroke="rgba(0, 212, 255, 0.4)" strokeWidth="2" strokeDasharray="6,4" />
                      <path d="M 250 250 V 380" fill="none" stroke="url(#line-glow)" strokeWidth="3" className="pulse-path" />
                    </g>

                    {/* RFID Card Node */}
                    <g className="visual-node node-rfid" transform="translate(50, 210)">
                      <circle cx="40" cy="40" r="36" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                      <rect x="22" y="28" width="36" height="24" rx="3" fill="none" stroke="#38BDF8" strokeWidth="2" />
                      <line x1="28" y1="34" x2="34" y2="34" stroke="#22C55E" strokeWidth="2" />
                      <path d="M 48 34 A 4 4 0 0 1 48 42" stroke="#38BDF8" strokeWidth="1.5" fill="none" />
                      <circle cx="40" cy="40" r="36" className="node-pulse-ring" stroke="#38BDF8" />
                    </g>

                    {/* Face Recognition Node */}
                    <g className="visual-node node-face" transform="translate(210, 60)">
                      <circle cx="40" cy="40" r="40" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                      <path d="M 40 22 C 45 22 49 26 49 31 C 49 35 47 37 48 39 C 49 41 47 43 40 43 C 33 43 31 41 32 39 C 33 37 31 35 31 31 C 31 26 35 22 40 22 Z" fill="none" stroke="#38BDF8" strokeWidth="2" />
                      <path d="M 22 22 H 28 V 28" fill="none" stroke="#22C55E" strokeWidth="2" />
                      <path d="M 58 22 H 52 V 28" fill="none" stroke="#22C55E" strokeWidth="2" />
                      <path d="M 22 58 H 28 V 52" fill="none" stroke="#22C55E" strokeWidth="2" />
                      <path d="M 58 58 H 52 V 52" fill="none" stroke="#22C55E" strokeWidth="2" />
                      <circle cx="40" cy="40" r="40" className="node-pulse-ring" stroke="#38BDF8" />
                    </g>

                    {/* Fingerprint Node */}
                    <g className="visual-node node-print" transform="translate(370, 210)">
                      <circle cx="40" cy="40" r="36" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                      <path d="M 28 45 C 28 35, 34 28, 40 28 C 46 28, 52 35, 52 45 M 32 45 C 32 38, 36 32, 40 32 C 44 32, 48 38, 48 45 M 36 45 C 36 41, 38 37, 40 37 C 42 37, 44 41, 44 45" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                      <circle cx="40" cy="40" r="36" className="node-pulse-ring" stroke="#38BDF8" />
                    </g>

                    {/* Central Core Gateway (Engine) */}
                    <g className="visual-node node-gateway" transform="translate(200, 210)">
                      <rect x="0" y="0" width="100" height="90" rx="12" fill="#071426" stroke="#38BDF8" strokeWidth="2.5" />
                      {/* Shield element inside gateway */}
                      <path d="M 50 25 L 72 33 V 50 C 72 63 62 72 50 77 C 38 72 28 63 28 50 V 33 Z" fill="none" stroke="#22C55E" strokeWidth="2" />
                      <path d="M 43 48 L 48 53 L 57 43" fill="none" stroke="#38BDF8" strokeWidth="2" />
                    </g>

                    {/* Secure Database Server Node */}
                    <g className="visual-node node-server" transform="translate(205, 360)">
                      <circle cx="45" cy="45" r="40" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                      {/* Database icon */}
                      <g transform="translate(28, 25)" fill="none" stroke="#38BDF8" strokeWidth="2">
                        <rect x="0" y="0" width="34" height="11" rx="3" fill="rgba(0, 212, 255, 0.1)" />
                        <rect x="0" y="14" width="34" height="11" rx="3" fill="rgba(0, 212, 255, 0.1)" />
                        <rect x="0" y="28" width="34" height="11" rx="3" fill="rgba(46, 229, 157, 0.1)" stroke="#22C55E" />
                        <circle cx="6" cy="5.5" r="2.5" fill="#38BDF8" />
                        <circle cx="6" cy="19.5" r="2.5" fill="#38BDF8" />
                        <circle cx="6" cy="33.5" r="2.5" fill="#22C55E" />
                      </g>
                      <circle cx="45" cy="45" r="40" className="node-pulse-ring" stroke="#22C55E" />
                    </g>
                  </svg>
                  
                  {/* Floating HTML labels */}
                  <div className="flow-badge flow-rfid">RFID Registered</div>
                  <div className="flow-badge flow-liveness">Liveness Ok</div>
                  <div className="flow-badge flow-fallback">Bio Fail-safe</div>
                  <div className="flow-badge flow-sync">DB Synchronized</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= PROJECT OVERVIEW ================= */}
        <section id="overview" className="overview-section">
          <div className="section-container overview-grid">
            
            {/* Left Column: Premium Typography */}
            <div className="overview-info">
              <span className="section-label">Institutional Safety</span>
              <h2 className="section-title text-left">
                Next-Gen Security for Modern Enterprises
              </h2>
              <p className="overview-desc">
                Bio-Sync Sentinel provides a bulletproof multi-layered authentication workflow. Traditional RFID badges are easily shared, and face scanners can be fooled by photos. 
              </p>
              <p className="overview-desc">
                Our platform locks access controls by verifying the physical presence of the cardholder using AI liveness facial vectors, fallback fingerprinting, and transactional database integrity.
              </p>
              
              <div className="overview-steps-trigger">
                {[
                  "MiFare RFID Verification",
                  "AI Liveness Mapping Scan",
                  "Fingerprint Verification Fallback",
                  "Real-Time Database Sync"
                ].map((title, i) => (
                  <div 
                    key={i} 
                    className={`overview-trigger-item ${activeOverviewStep === i ? "active" : ""}`}
                    onMouseEnter={() => setActiveOverviewStep(i)}
                  >
                    <span className="trigger-num">0{i+1}</span>
                    <span className="trigger-text">{title}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Animated Illustration */}
            <div className="overview-visual-right">
              <div className="flow-illustration-card glass-panel">
                <div className="flow-indicator-header">
                  <div className="flow-dot red"></div>
                  <div className="flow-dot yellow"></div>
                  <div className="flow-dot green"></div>
                  <span className="flow-title">Verification State Machine</span>
                </div>
                
                <div className="state-flow-vertical">
                  {[
                    { label: "Student taps RFID", detail: "MiFare card reader decodes card serial and fetches user UUID." },
                    { label: "Camera scans face", detail: "HD terminal camera triggers video capture and streams landmarks." },
                    { label: "AI verifies liveness", detail: "Active anti-spoofing logic verifies real human blink & depth vectors." },
                    { label: "Fingerprint backup if needed", detail: "If light is low, 508 DPI capacitive scanner activates automatically." },
                    { label: "Attendance logged", detail: "Verification packet commits securely to localized transaction queue." },
                    { label: "Admin dashboard updates", detail: "Logs write to central MySQL DB, triggering immediate dashboard feeds." }
                  ].map((step, idx) => (
                    <div 
                      key={idx} 
                      className={`state-flow-step ${activeOverviewStep === Math.floor(idx / 1.5) ? "highlight" : ""}`}
                    >
                      <div className="state-circle-container">
                        <div className="state-circle">
                          {idx < 5 ? <ChevronRight size={12} className="rotate-90" /> : <Check size={12} />}
                        </div>
                        {idx < 5 && <div className="state-line"></div>}
                      </div>
                      <div className="state-text">
                        <h5>{step.label}</h5>
                        <p>{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* ================= PROBLEM STATEMENT ================= */}
        <section id="problems" className="problems-section">
          <div className="section-container">
            <div className="section-header reveal">
              <span className="section-label">Institutional Risks</span>
              <h2 className="section-title">The Limitations of Traditional Attendance</h2>
              <p className="section-subtitle">
                Legacy systems suffer from deep vulnerabilities that create administrative overhead and security holes.
              </p>
            </div>

            <div className="problems-grid">
              {/* Card 1 */}
              <div className="problem-card glass-panel reveal">
                <div className="problem-icon-wrapper">
                  <Clock size={24} className="problem-icon" />
                </div>
                <h3 className="problem-title">Inefficient Manual Attendance</h3>
                <ul className="problem-list">
                  <li>Paper attendance sheets waste valuable teaching and meeting hours.</li>
                  <li>Hefty administrative burdens for manual entry.</li>
                  <li>Slow record keeping and difficult historical lookups.</li>
                </ul>
              </div>

              {/* Card 2 */}
              <div className="problem-card glass-panel reveal">
                <div className="problem-icon-wrapper">
                  <ShieldAlert size={24} className="problem-icon" />
                </div>
                <h3 className="problem-title">Fraud & Human Error</h3>
                <ul className="problem-list">
                  <li>Buddy punching and proxy attendance are easily exploited.</li>
                  <li>Lost, misplaced, or damaged paper sheets.</li>
                  <li>Manual database recording mistakes cause billing & record disputes.</li>
                </ul>
              </div>

              {/* Card 3 */}
              <div className="problem-card glass-panel reveal">
                <div className="problem-icon-wrapper">
                  <AlertTriangle size={24} className="problem-icon" />
                </div>
                <h3 className="problem-title">Weak Access Control</h3>
                <ul className="problem-list">
                  <li>Unauthorized individuals entering high-security server rooms/labs.</li>
                  <li>Complete lack of accountability or verification of who is inside.</li>
                  <li>Absence of a centralized real-time diagnostic dashboard.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ================= HOW THE SYSTEM WORKS ================= */}
        <section id="workflow" className="workflow-section">
          <div className="section-container">
            <div className="section-header reveal">
              <span className="section-label">Active Protocol</span>
              <h2 className="section-title">Step-by-Step Security Loop</h2>
              <p className="section-subtitle">
                Observe the sequence our authentication engine executes upon every check-in event.
              </p>
            </div>

            {/* Horizontal Timeline */}
            <div className="timeline-horizontal-container">
              <div className="timeline-progress-line">
                <div className="timeline-progress-fill" style={{ width: `${(activeStep / 5) * 100}%` }}></div>
              </div>
              
              <div className="timeline-steps-grid">
                {[
                  { title: "RFID Auth", desc: "User taps MiFare RFID card to retrieve identity index.", icon: CreditCard },
                  { title: "Facial Scanning", desc: "Terminal camera captures face image parameters.", icon: ScanFace },
                  { title: "Liveness Check", desc: "AI models verify physical presence and anti-spoof checks.", icon: Eye },
                  { title: "Fingerprint Fallback", desc: "Biometric semiconductor backup triggers if needed.", icon: Fingerprint },
                  { title: "Attendance Logged", desc: "Record encrypted and validated in database queues.", icon: ShieldCheck },
                  { title: "Live Dashboard", desc: "Updates dashboard metrics and pushes fraud alerts.", icon: LayoutDashboard }
                ].map((step, idx) => (
                  <div 
                    key={idx} 
                    className={`timeline-step-card glass-panel ${activeStep === idx ? "active" : ""}`}
                    onClick={() => handleStepClick(idx)}
                  >
                    <div className="step-badge">Step 0{idx + 1}</div>
                    <div className="step-icon-bg">
                      <step.icon size={20} className="step-icon-element" />
                    </div>
                    <h4>{step.title}</h4>
                    <p>{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ================= SYSTEM ARCHITECTURE ================= */}
        <section id="architecture" className="architecture-section">
          <div className="section-container">
            <div className="section-header reveal">
              <span className="section-label">Topology Diagram</span>
              <h2 className="section-title">System Architecture</h2>
              <p className="section-subtitle">
                An elegant flow chart outlining data pathways from user interaction up to real-time security alerts.
              </p>
            </div>

            {/* Architecture SVG diagram */}
            <div className="architecture-diagram-wrapper glass-panel">
              <div className="diagram-node-info">
                {hoveredArchNode ? (
                  <div className="node-tooltip">
                    <span className="info-title">{hoveredArchNode.title}</span>
                    <p className="info-desc">{hoveredArchNode.desc}</p>
                  </div>
                ) : (
                  <div className="node-tooltip default">
                    <Info size={16} className="info-icon" />
                    <span>Hover over any architecture node to see detailed telemetry</span>
                  </div>
                )}
              </div>

              <div className="arch-svg-container">
                <svg viewBox="0 0 900 500" fill="none" className="arch-svg" xmlns="http://www.w3.org/2000/svg">
                  {/* Definition for gradients and marker arrows */}
                  <defs>
                    <linearGradient id="arch-grad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#38BDF8" />
                      <stop offset="100%" stopColor="#22C55E" />
                    </linearGradient>
                    <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 2 L 8 5 L 0 8 z" fill="#2C4A6E" />
                    </marker>
                  </defs>

                  {/* Connecting lines */}
                  {/* Row 1 to Row 2 connections */}
                  <path d="M 150 135 H 330" stroke="#2C4A6E" strokeWidth="2" markerEnd="url(#arrow)" />
                  <path d="M 450 135 H 630" stroke="#2C4A6E" strokeWidth="2" markerEnd="url(#arrow)" />
                  
                  {/* Right node of Row 1 down to Row 2 */}
                  <path d="M 750 135 V 230" stroke="#2C4A6E" strokeWidth="2" markerEnd="url(#arrow)" />

                  {/* Row 2 connections */}
                  <path d="M 750 290 H 570" stroke="#2C4A6E" strokeWidth="2" markerEnd="url(#arrow)" />
                  <path d="M 450 290 H 270" stroke="#2C4A6E" strokeWidth="2" markerEnd="url(#arrow)" />
                  
                  {/* Left node of Row 2 down to Row 3 */}
                  <path d="M 150 290 V 380" stroke="#2C4A6E" strokeWidth="2" markerEnd="url(#arrow)" />

                  {/* Row 3 connections */}
                  <path d="M 150 440 H 330" stroke="#2C4A6E" strokeWidth="2" markerEnd="url(#arrow)" />
                  <path d="M 450 440 H 630" stroke="#2C4A6E" strokeWidth="2" markerEnd="url(#arrow)" />

                  {/* Glowing active path if hovered */}
                  <path d="M 150 135 H 330 M 450 135 H 630 M 750 135 V 230 M 750 290 H 570 M 450 290 H 270 M 150 290 V 380 M 150 440 H 330 M 450 440 H 630" 
                        stroke="url(#arch-grad)" strokeWidth="2" className="arch-glow-path" />

                  {/* Nodes */}
                  {/* Row 1 */}
                  <g className="arch-node" 
                     onMouseEnter={() => setHoveredArchNode({ title: "User Interaction", desc: "Employee presents RFID credential to initiate security handshake." })}
                     onMouseLeave={() => setHoveredArchNode(null)}>
                    <rect x="50" y="80" width="200" height="70" rx="8" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                    <text x="150" y="120" fill="#F8FAFC" fontSize="13" fontWeight="bold" textAnchor="middle">User</text>
                  </g>

                  <g className="arch-node" 
                     onMouseEnter={() => setHoveredArchNode({ title: "RFID Reader", desc: "NFC controller reads MiFare card serial and verifies keys." })}
                     onMouseLeave={() => setHoveredArchNode(null)}>
                    <rect x="350" y="80" width="200" height="70" rx="8" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                    <text x="450" y="120" fill="#F8FAFC" fontSize="13" fontWeight="bold" textAnchor="middle">RFID Reader</text>
                  </g>

                  <g className="arch-node" 
                     onMouseEnter={() => setHoveredArchNode({ title: "Authentication Engine", desc: "Local processor validates baseline state and triggers biometrics." })}
                     onMouseLeave={() => setHoveredArchNode(null)}>
                    <rect x="650" y="80" width="200" height="70" rx="8" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                    <text x="750" y="120" fill="#F8FAFC" fontSize="13" fontWeight="bold" textAnchor="middle">Auth Engine</text>
                  </g>

                  {/* Row 2 */}
                  <g className="arch-node" 
                     onMouseEnter={() => setHoveredArchNode({ title: "Facial Recognition AI", desc: "CNN matches camera frame structures to stored vectors." })}
                     onMouseLeave={() => setHoveredArchNode(null)}>
                    <rect x="650" y="235" width="200" height="70" rx="8" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                    <text x="750" y="275" fill="#F8FAFC" fontSize="13" fontWeight="bold" textAnchor="middle">Facial Recognition AI</text>
                  </g>

                  <g className="arch-node" 
                     onMouseEnter={() => setHoveredArchNode({ title: "Liveness Detection", desc: "Blink mapping ensures photo spoofing blocks execute." })}
                     onMouseLeave={() => setHoveredArchNode(null)}>
                    <rect x="350" y="235" width="200" height="70" rx="8" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                    <text x="450" y="275" fill="#F8FAFC" fontSize="13" fontWeight="bold" textAnchor="middle">Liveness Detection</text>
                  </g>

                  <g className="arch-node" 
                     onMouseEnter={() => setHoveredArchNode({ title: "Fingerprint Fallback", desc: "Semiconductor scanner captures 508 DPI template if camera fails." })}
                     onMouseLeave={() => setHoveredArchNode(null)}>
                    <rect x="50" y="235" width="200" height="70" rx="8" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                    <text x="150" y="275" fill="#F8FAFC" fontSize="13" fontWeight="bold" textAnchor="middle">Fingerprint Fallback</text>
                  </g>

                  {/* Row 3 */}
                  <g className="arch-node" 
                     onMouseEnter={() => setHoveredArchNode({ title: "Attendance Server", desc: "Central Express node validates request tokens and records updates." })}
                     onMouseLeave={() => setHoveredArchNode(null)}>
                    <rect x="50" y="380" width="200" height="70" rx="8" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                    <text x="150" y="420" fill="#F8FAFC" fontSize="13" fontWeight="bold" textAnchor="middle">Attendance Server</text>
                  </g>

                  <g className="arch-node" 
                     onMouseEnter={() => setHoveredArchNode({ title: "MySQL Database", desc: "Relational database commits logs and audit traces." })}
                     onMouseLeave={() => setHoveredArchNode(null)}>
                    <rect x="350" y="380" width="200" height="70" rx="8" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                    <text x="450" y="420" fill="#F8FAFC" fontSize="13" fontWeight="bold" textAnchor="middle">MySQL Database</text>
                  </g>

                  <g className="arch-node" 
                     onMouseEnter={() => setHoveredArchNode({ title: "Admin & Fraud Control", desc: "WebSockets stream events directly to real-time dashboards." })}
                     onMouseLeave={() => setHoveredArchNode(null)}>
                    <rect x="650" y="380" width="200" height="70" rx="8" fill="#10263F" stroke="#2C4A6E" strokeWidth="2" />
                    <text x="750" y="420" fill="#F8FAFC" fontSize="13" fontWeight="bold" textAnchor="middle">Admin & Fraud Dashboard</text>
                  </g>
                </svg>
              </div>
            </div>
          </div>
        </section>

        {/* ================= DASHBOARD PREVIEW ================= */}
        <section id="preview" className="preview-section">
          <div className="section-container">
            <div className="section-header reveal">
              <span className="section-label">Live Control Center</span>
              <h2 className="section-title">High Fidelity Dashboard Preview</h2>
              <p className="section-subtitle">
                Inspect the actual dashboard administrators use to review logs, manage alerts, and control terminals.
              </p>
            </div>

            {/* Interactive Mock Dashboard */}
            <div className="dashboard-mockup glass-panel">
              {/* Mock Sidebar */}
              <div className="mock-sidebar">
                <div className="mock-brand">
                  <Shield size={16} className="mock-logo-icon" />
                  <span>Bio-Sync</span>
                </div>
                <div className="mock-nav">
                  <div className="mock-nav-item active"><LayoutDashboard size={13} /> Dashboard</div>
                  <div className="mock-nav-item"><Clock size={13} /> Attendance</div>
                  <div className="mock-nav-item"><ShieldAlert size={13} /> Fraud Logs <span className="alert-dot"></span></div>
                  <div className="mock-nav-item"><Users size={13} /> Users</div>
                  <div className="mock-nav-item"><Settings size={13} /> Settings</div>
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
                  
                  {/* Grid of 4 Stats Widgets + 4 small indicators = 8 widgets total */}
                  <div className="mock-stats-grid">
                    
                    <div className="mock-stat-card">
                      <div className="mock-stat-header">
                        <span className="mock-stat-label">Today's Attendance</span>
                        <Users size={14} className="mock-stat-icon-color" />
                      </div>
                      <div className="mock-stat-value">212 / 248</div>
                      <div className="mock-stat-change green-text">85.5% present</div>
                    </div>

                    <div className="mock-stat-card">
                      <div className="mock-stat-header">
                        <span className="mock-stat-label">Verified Users</span>
                        <CheckCircle2 size={14} className="mock-stat-icon-color" />
                      </div>
                      <div className="mock-stat-value">208</div>
                      <div className="mock-stat-change">No bypass used</div>
                    </div>

                    <div className="mock-stat-card">
                      <div className="mock-stat-header">
                        <span className="mock-stat-label">Failed Attempts</span>
                        <AlertCircle size={14} className="mock-stat-icon-color" />
                      </div>
                      <div className="mock-stat-value">4</div>
                      <div className="mock-stat-change red-text">Liveness mismatches</div>
                    </div>

                    <div className="mock-stat-card">
                      <div className="mock-stat-header">
                        <span className="mock-stat-label">Fraud Alerts</span>
                        <ShieldAlert size={14} className="mock-stat-icon-color" />
                      </div>
                      <div className="mock-stat-value">0 Active</div>
                      <div className="mock-stat-change green-text">1 blocked today</div>
                    </div>

                  </div>

                  {/* Second Row of widgets */}
                  <div className="mock-details-grid">
                    
                    {/* Attendance Trend Graph */}
                    <div className="mock-card mock-chart-card">
                      <h4 className="mock-card-title">Attendance Trend Graph</h4>
                      <div className="mock-chart-container">
                        <ResponsiveContainer width="100%" height={150}>
                          <AreaChart data={attendanceTrend}>
                            <defs>
                              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#38BDF8" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                            <Tooltip contentStyle={{ background: "#10263F", border: "1px solid #2C4A6E", borderRadius: 8, fontSize: 10, color: "#fff" }} />
                            <Area type="monotone" dataKey="rate" stroke="#38BDF8" strokeWidth={2} fillOpacity={1} fill="url(#trend-fill)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Live Activity Feed */}
                    <div className="mock-card">
                      <h4 className="mock-card-title">Live Activity Feed</h4>
                      <div className="mock-feed-list">
                        <div className="feed-item">
                          <div className="feed-indicator online"></div>
                          <span>Terminal 01 connected</span>
                          <span className="feed-time">Just now</span>
                        </div>
                        <div className="feed-item">
                          <div className="feed-indicator block"></div>
                          <span>M. Firdaus verification fail</span>
                          <span className="feed-time">3m ago</span>
                        </div>
                        <div className="feed-item">
                          <div className="feed-indicator sync"></div>
                          <span>MySQL logs backup synced</span>
                          <span className="feed-time">15m ago</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Third Row: Table and Health */}
                  <div className="mock-log-grid">
                    {/* Recent Authentication Logs */}
                    <div className="mock-card">
                      <h4 className="mock-card-title">Recent Authentication Logs</h4>
                      <div className="mock-logs-list">
                        {recentLogs.map((log) => (
                          <div key={log.id} className="mock-log-item">
                            <div className="mock-log-info">
                              <span className="log-user-name">{log.name}</span>
                              <span className="log-user-method">{log.method}</span>
                            </div>
                            <div className="mock-log-time-status">
                              <span className="log-time">{log.time}</span>
                              <span className={`log-status ${log.status === "Fallback" ? "fallback" : "verified"}`}>{log.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* System Health */}
                    <div className="mock-card health-card">
                      <h4 className="mock-card-title">System Health</h4>
                      <div className="health-grid">
                        <div className="health-item">
                          <span className="h-lbl">RFID Readers</span>
                          <span className="h-val green-text">Online</span>
                        </div>
                        <div className="health-item">
                          <span className="h-lbl">CV Camera Stream</span>
                          <span className="h-val green-text">1080p 30fps</span>
                        </div>
                        <div className="health-item">
                          <span className="h-lbl">MySQL Sync Latency</span>
                          <span className="h-val">12ms</span>
                        </div>
                        <div className="health-item">
                          <span className="h-lbl">Active Terminals</span>
                          <span className="h-val">4 Terminals</span>
                        </div>
                      </div>
                      <div className="alert-box-mock">
                        <AlertTriangle size={12} className="alert-box-icon" />
                        <span>Security protocols updated to v4.2.1</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ================= SECURITY SECTION ================= */}
        <section id="security" className="security-section">
          <div className="section-container">
            <div className="section-header reveal">
              <span className="section-label">Trust Policy</span>
              <h2 className="section-title">Built with Multiple Layers of Trust</h2>
              <p className="section-subtitle">
                Our cryptographic security and edge biometrics protect employee credentials at every stage.
              </p>
            </div>

            <div className="security-cards-grid">
              {[
                { title: "Multi-Factor Authentication", desc: "Forces multiple nodes of identification checking before logging an event.", icon: Lock },
                { title: "RFID Cryptography", desc: "AES-128 sector keys authenticate cards and stop badge cloning.", icon: CreditCard },
                { title: "AI Liveness Detection", desc: "Combines temporal mapping and textures to reject static photo spoofing.", icon: Eye },
                { title: "Fingerprint Fallback", desc: "Capacitive semiconductor hardware scanning activates during visual blockage.", icon: Fingerprint },
                { title: "Role-Based Access Control", desc: "Enforces strict scope separation for admins, teachers, and student rosters.", icon: Shield },
                { title: "Encrypted Attendance Records", desc: "Logs are digitally hashed and salted before database commits.", icon: Database },
                { title: "Fraud Monitoring", desc: "Instantly audits telemetry anomalies and flags concurrent check-ins.", icon: ShieldAlert },
                { title: "Audit Logging", desc: "Chronicles every login attempt and configuration change in an immutable database history.", icon: FileText }
              ].map((sec, idx) => (
                <div key={idx} className="security-card glass-panel reveal">
                  <div className="sec-icon-bg">
                    <sec.icon size={20} className="sec-icon" />
                  </div>
                  <h3>{sec.title}</h3>
                  <p>{sec.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ================= TECHNOLOGY STACK ================= */}
        <section id="techstack" className="techstack-section">
          <div className="section-container">
            <div className="section-header reveal">
              <span className="section-label">Enterprise Specs</span>
              <h2 className="section-title">Technology Stack</h2>
              <p className="section-subtitle">
                Engineered with high-performance frameworks and enterprise-grade hardware integrations.
              </p>
            </div>

            <div className="tech-stack-groups">
              
              <div className="tech-group-card glass-panel reveal">
                <h4>Frontend Specs</h4>
                <div className="badge-container">
                  <span className="tech-badge">React 19</span>
                  <span className="tech-badge">Vite</span>
                  <span className="tech-badge">Tailwind CSS</span>
                  <span className="tech-badge">Recharts</span>
                </div>
              </div>

              <div className="tech-group-card glass-panel reveal">
                <h4>Backend & Core</h4>
                <div className="badge-container">
                  <span className="tech-badge">Node.js</span>
                  <span className="tech-badge">Express.js</span>
                  <span className="tech-badge">WebSockets</span>
                  <span className="tech-badge">MySQL</span>
                </div>
              </div>

              <div className="tech-group-card glass-panel reveal">
                <h4>Biometrics & AI</h4>
                <div className="badge-container">
                  <span className="tech-badge">MiFare RFID</span>
                  <span className="tech-badge">Facial Recognition AI</span>
                  <span className="tech-badge">Liveness Verification</span>
                  <span className="tech-badge">Fingerprint Scanner</span>
                </div>
              </div>

              <div className="tech-group-card glass-panel reveal">
                <h4>Terminal Hardware</h4>
                <div className="badge-container">
                  <span className="tech-badge">RFID Reader</span>
                  <span className="tech-badge">HD Camera Sensor</span>
                  <span className="tech-badge">Capacitive Scanner</span>
                </div>
              </div>

            </div>
          </div>
        </section>

      </main>

      {/* ================= FOOTER SECTION ================= */}
      <footer className="landing-footer glass-panel">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="brand-logo">
              <Shield className="logo-icon" size={18} />
              <span>Bio-Sync <span className="text-accent">Sentinel</span></span>
            </div>
            <p className="footer-tagline">Secure Multi-Layered Attendance Gateways</p>
            <p className="footer-desc-text">
              Zero buddy-punching. Ultimate accountability.
            </p>
          </div>

          <div className="footer-links-grid">
            <div className="footer-col">
              <h4>System Links</h4>
              <a href="#overview">Roster Overview</a>
              <a href="#workflow">Verification Flow</a>
            </div>
            <div className="footer-col">
              <h4>Resources</h4>
              <a href="#architecture">Architecture Topology</a>
              <a href="#preview">Admin Panel</a>
              <a href="#security">Security Compliance</a>
            </div>
            <div className="footer-col">
              <h4>Legal & R&D</h4>
              <span>v4.2.1-stable</span>
              <a href="#hero">Privacy Policy</a>
              <a href="#hero">Terms of Service</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <div className="footer-bottom-container">
            <span>© {new Date().getFullYear()} Bio-Sync Sentinel. All rights reserved.</span>
            <div className="footer-legal">
              <span>Secure Attendance Beyond Identity.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;