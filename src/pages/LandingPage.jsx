import { useEffect, useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  Cpu,
  CreditCard,
  Database,
  Eye,
  FileText,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  Lock,
  Menu,
  ScanFace,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

import bioSyncLogo from "../assets/BioSync_Logo_Navbar.png";
import bioSyncShield from "../assets/BioSync_Login_Shield.png";
import ColorBends from "../components/ColorBends";
import "./LandingPage.css";

const navigationItems = [
  ["Overview", "#overview"],
  ["Why BioSync", "#problems"],
  ["How It Works", "#workflow"],
  ["Architecture", "#architecture"],
  ["Dashboard", "#preview"],
  ["Security", "#security"],
];

const overviewCards = [
  {
    icon: CreditCard,
    title: "RFID Identity",
    text: "The RFID card identifies the account requesting attendance verification.",
  },
  {
    icon: ScanFace,
    title: "Face + Liveness",
    text: "Facial recognition verifies identity while liveness checks strengthen protection against spoofing.",
  },
  {
    icon: Fingerprint,
    title: "Fingerprint Fallback",
    text: "Fingerprint authentication provides a secondary biometric path when facial verification cannot succeed.",
  },
  {
    icon: LayoutDashboard,
    title: "Central Dashboard",
    text: "Authorized users can monitor attendance, disputes, analytics and biometric registration information.",
  },
];

const problemCards = [
  {
    icon: Activity,
    title: "Manual Attendance",
    text: "Traditional attendance consumes teaching time, creates repetitive administrative work and makes historical records harder to manage.",
  },
  {
    icon: AlertTriangle,
    title: "Proxy Attendance",
    text: "Cards, signatures and basic identification methods can be shared without proving that the real account owner is physically present.",
  },
  {
    icon: Lock,
    title: "Weak Verification",
    text: "Single-factor attendance provides limited protection against impersonation, spoofing and unauthorized attendance submissions.",
  },
];

const workflowSteps = [
  {
    icon: CreditCard,
    title: "RFID Identity Claim",
    text: "The assigned RFID card identifies the BioSync account requesting attendance verification.",
  },
  {
    icon: ScanFace,
    title: "Face + Liveness",
    text: "Face matching verifies the claimed identity. Liveness checks help confirm that a real person is physically present.",
  },
  {
    icon: Database,
    title: "Attendance Recorded",
    text: "After successful verification, the attendance result is recorded and becomes available to authorized dashboard users.",
  },
];

const architectureNodes = [
  {
    icon: Cpu,
    title: "Terminal",
    text: "RFID reader, camera and fingerprint sensor.",
  },
  {
    icon: ShieldCheck,
    title: "Verification",
    text: "Identity matching, face verification and liveness.",
  },
  {
    icon: Server,
    title: "Firebase",
    text: "Authentication, Firestore and application data.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    text: "Role-based attendance management and monitoring.",
  },
];

const roles = [
  {
    icon: ShieldCheck,
    label: "Full Oversight",
    title: "Administrator",
    text: "Manage users, attendance, devices and system-wide operations.",
    items: [
      "User Management",
      "Attendance Control",
      "Dispute Oversight",
      "Device Monitoring",
      "System Analytics",
    ],
  },
  {
    icon: BookOpen,
    label: "Department Focus",
    title: "Teacher",
    text: "Monitor students and attendance within the assigned department.",
    items: [
      "Student Monitoring",
      "Attendance Review",
      "Dispute Resolution",
      "Department Access",
      "Attendance Analytics",
    ],
  },
  {
    icon: GraduationCap,
    label: "Personal Access",
    title: "Student",
    text: "Review personal attendance information and biometric registration status.",
    items: [
      "Attendance History",
      "Submit Disputes",
      "Personal Analytics",
      "Biometric Status",
      "Account Center",
    ],
  },
];

const securityFeatures = [
  {
    icon: Eye,
    title: "Liveness Detection",
    text: "Facial verification is supported by liveness checks designed to reduce basic photo and screen spoofing attempts.",
  },
  {
    icon: Fingerprint,
    title: "Biometric Verification",
    text: "Face and fingerprint verification provide stronger identity confirmation than an attendance card alone.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    text: "Administrators, teachers and students receive different permissions according to their assigned BioSync role.",
  },
  {
    icon: FileText,
    title: "Audit Visibility",
    text: "Attendance activity, disputes and administrative actions can be reviewed through centralized system records.",
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

 useEffect(() => {
  const root = rootRef.current;
  if (!root) return;

  const motion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  );

  if (motion.matches || !("IntersectionObserver" in window)) {
    return;
  }

  const elements = Array.from(
    root.querySelectorAll("[data-reveal]")
  );

  const reset = () => {
    elements.forEach((element) => {
      element.classList.remove("lp-reveal-ready", "lp-enter");
      element.style.removeProperty("--lp-reveal-delay");
    });
  };

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("lp-enter");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0,
      rootMargin: "0px 0px -70px 0px",
    }
  );

  elements.forEach((element) => {
    // Keep anything already on screen visible.
    if (element.getBoundingClientRect().top < window.innerHeight) {
      return;
    }

    const siblings = Array.from(
      element.parentElement.children
    ).filter((child) => child.matches("[data-reveal]"));

    const index = Math.max(0, siblings.indexOf(element));

    element.style.setProperty(
      "--lp-reveal-delay",
      `${Math.min(index, 4) * 140}ms`
    );

    element.classList.add("lp-reveal-ready");
    observer.observe(element);
  });

  const handleMotionChange = () => {
    if (motion.matches) {
      observer.disconnect();
      reset();
    }
  };

  motion.addEventListener("change", handleMotionChange);

  return () => {
    observer.disconnect();
    motion.removeEventListener("change", handleMotionChange);
    reset();
  };
}, []);

  function handleGetStarted() {
    setMobileMenuOpen(false);
    navigate("/login");
  }

  function handleLogoClick() {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.scrollTo({
      top: 0,
      behavior: reduced ? "auto" : "smooth",
    });

    setMobileMenuOpen(false);
  }

  return (
    <div className="biosync-landing" ref={rootRef}>
      <div className="lp-color-bends-background" aria-hidden="true">
        <ColorBends
          speed={0.2}
          scale={1}
          warpStrength={1}
          mouseInfluence={0.5}
          parallax={0.4}
          intensity={1.6}
          bandWidth={8}
        />
      </div>

      <header className="lp-navbar">
        <div className="lp-navbar-inner">
          <button
            type="button"
            className="lp-brand"
            onClick={handleLogoClick}
            aria-label="BioSync home"
          >
            <img src={bioSyncLogo} alt="BioSync Sentinel" />
          </button>

          <nav className="lp-desktop-nav" aria-label="Main navigation">
            {navigationItems.map(([label, target]) => (
              <a key={target} href={target}>
                {label}
              </a>
            ))}
          </nav>

          <div className="lp-nav-actions">
            <button
              type="button"
              className="lp-sign-in"
              onClick={handleGetStarted}
            >
              Sign In
            </button>
            <button
              type="button"
              className="lp-get-started"
              onClick={handleGetStarted}
            >
              Get Started <ArrowRight size={15} />
            </button>
          </div>

          <button
            type="button"
            className="lp-mobile-toggle"
            aria-label={mobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenuOpen}
            aria-controls="biosync-mobile-menu"
            onClick={() => setMobileMenuOpen((value) => !value)}
          >
            {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <nav
            className="lp-mobile-menu"
            id="biosync-mobile-menu"
            aria-label="Mobile navigation"
          >
            {navigationItems.map(([label, target]) => (
              <a
                key={target}
                href={target}
                onClick={() => setMobileMenuOpen(false)}
              >
                {label}
              </a>
            ))}
            <button type="button" onClick={handleGetStarted}>
              Sign In
            </button>
            <button
              type="button"
              className="primary"
              onClick={handleGetStarted}
            >
              Get Started
            </button>
          </nav>
        )}
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-container lp-hero-layout">
            <div className="lp-hero-content">
              <div className="lp-eyebrow">
                <Sparkles size={13} />
                Integrated Biometric Attendance System
              </div>

              <h1>
                Security
                <br />
                Beyond
                <br />
                <span>Attendance.</span>
              </h1>

              <p>
                Verify identity. Prevent proxy attendance. BioSync Sentinel
                combines RFID identity claims with face recognition, liveness
                detection and fingerprint fallback to protect attendance
                integrity.
              </p>

              <div className="lp-hero-actions">
                <a href="#overview" className="lp-primary-button">
                  Explore System <ArrowRight size={16} />
                </a>
                <button
                  type="button"
                  className="lp-outline-button"
                  onClick={handleGetStarted}
                >
                  Access Dashboard
                </button>
              </div>

              <div className="lp-trust-row">
                <div>
                  <strong>Multi-Factor</strong>
                  <span>Verification</span>
                </div>
                <i />
                <div>
                  <strong>Anti-Proxy</strong>
                  <span>Protection</span>
                </div>
                <i />
                <div>
                  <strong>Real-Time</strong>
                  <span>Monitoring</span>
                </div>
              </div>
            </div>

            <IdentityOrb />
          </div>
        </section>

        <section id="overview" className="lp-section">
          <div className="lp-container">
            <SectionHeader
              label="Platform Overview"
              title="Attendance that verifies more than a card"
              description="BioSync Sentinel combines identity claims, biometric verification and centralized monitoring into one attendance platform."
            />
            <div className="lp-four-grid">
              {overviewCards.map((card) => (
                <FeatureCard key={card.title} {...card} />
              ))}
            </div>
          </div>
        </section>

        <section id="problems" className="lp-section">
          <div className="lp-container">
            <SectionHeader
              label="Why BioSync"
              title="Traditional attendance leaves room for impersonation"
              description="BioSync focuses on the identity weaknesses found in manual and single-factor attendance systems."
            />
            <div className="lp-three-grid">
              {problemCards.map((card, index) => (
                <FeatureCard
                  key={card.title}
                  {...card}
                  warning
                  number={`0${index + 1}`}
                />
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="lp-section">
          <div className="lp-container">
            <SectionHeader
              label="Authentication Flow"
              title="Identity claim first. Biometric proof second."
              description="BioSync does not treat an RFID card as proof of physical presence. The card identifies the account, then biometrics verify the person."
            />

            <div className="lp-workflow">
              {workflowSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article
                    className="lp-workflow-card"
                    data-reveal
                    key={step.title}
                  >
                    <span className="lp-step-number">0{index + 1}</span>
                    <div className="lp-card-icon">
                      <Icon size={21} />
                    </div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                    {index < workflowSteps.length - 1 && (
                      <ArrowRight className="lp-step-arrow" size={19} />
                    )}
                  </article>
                );
              })}
            </div>

            <div className="lp-fallback" data-reveal>
              <div className="lp-fallback-intro">
                <Fingerprint size={25} />
                <div>
                  <strong>A second verification path</strong>
                  <p>
                    If face verification cannot succeed, use fingerprint
                    authentication. Attendance is recorded only after
                    successful verification.
                  </p>
                </div>
              </div>
              <div className="lp-fallback-results">
                <span className="success">
                  <CheckCircle2 size={16} /> Verified
                </span>
                <span className="denied">
                  <Lock size={16} /> Otherwise denied
                </span>
              </div>
            </div>
          </div>
        </section>

        <section id="architecture" className="lp-section">
          <div className="lp-container">
            <SectionHeader
              label="System Architecture"
              title="From physical verification to secure dashboard access"
              description="The terminal, biometric verification layer, Firebase services and web dashboard work together as one BioSync ecosystem."
            />
            <div className="lp-architecture" data-reveal>
              {architectureNodes.map((node, index) => {
                const Icon = node.icon;
                return (
                  <div className="lp-architecture-item" key={node.title}>
                    <article className="lp-architecture-node">
                      <div className="lp-card-icon">
                        <Icon size={22} />
                      </div>
                      <span>Layer 0{index + 1}</span>
                      <h3>{node.title}</h3>
                      <p>{node.text}</p>
                    </article>
                    {index < architectureNodes.length - 1 && (
                      <ArrowRight
                        className="lp-architecture-arrow"
                        size={18}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="lp-section" id="roles">
          <div className="lp-container">
            <SectionHeader
              label="Role-Based Access"
              title="One platform. Three focused experiences."
              description="Each BioSync role receives the tools and information appropriate to its responsibilities."
            />
            <div className="lp-three-grid">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <article className="lp-role-card" data-reveal key={role.title}>
                    <div className="lp-role-top">
                      <div className="lp-card-icon">
                        <Icon size={22} />
                      </div>
                      <span>{role.label}</span>
                    </div>
                    <h3>{role.title}</h3>
                    <p>{role.text}</p>
                    <ul>
                      {role.items.map((item) => (
                        <li key={item}>
                          <Check size={14} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="preview" className="lp-section">
          <div className="lp-container">
            <SectionHeader
              label="Centralized Dashboard"
              title="Attendance intelligence in one workspace"
              description="BioSync converts verification activity into useful attendance information for authorized users."
            />
            <DashboardPreview />
          </div>
        </section>

        <section id="security" className="lp-section">
          <div className="lp-container">
            <SectionHeader
              label="Security Layers"
              title="Built around attendance integrity"
              description="BioSync combines biometric verification with role-based system controls to strengthen confidence in attendance records."
            />
            <div className="lp-four-grid">
              {securityFeatures.map((card) => (
                <FeatureCard key={card.title} {...card} protectedCard />
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final-section">
          <div className="lp-container">
            <div className="lp-final-card" data-reveal>
              <div>
                <span className="lp-section-label">Secure Access</span>
                <h2>Ready to access BioSync Sentinel?</h2>
                <p>
                  Enter your role-based workspace for attendance, monitoring,
                  disputes and analytics.
                </p>
              </div>
              <button
                type="button"
                className="lp-primary-button"
                onClick={handleGetStarted}
              >
                Access Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-content">
          <div>
            <img src={bioSyncLogo} alt="BioSync Sentinel" />
            <p>Multi-layer biometric attendance verification.</p>
          </div>
          <span>© {new Date().getFullYear()} BioSync Sentinel</span>
        </div>
      </footer>
    </div>
  );
}

function IdentityOrb() {
  return (
    <div className="lp-orb-visual">
      <div
        className="lp-diamond-panel"
        role="img"
        aria-label="BioSync identity verification using RFID, face and liveness, and fingerprint"
      ><div className="lp-diamond-top-grid" aria-hidden="true" />
        <svg
          className="lp-diamond-connections"
          viewBox="0 0 500 455"
          aria-hidden="true"
        >
          {/* Connections */}
          <path d="M 100 235 H 155" />
          <path d="M 315 165 L 385 98" />
          <path d="M 315 290 L 365 340 Q 377 352 393 352" />

          {/* Moving signals */}
          <circle className="lp-diamond-signal" r="2.6">
            <animateMotion
              path="M 100 235 H 155"
              dur="3.5s"
              repeatCount="indefinite"
            />
          </circle>

          <circle className="lp-diamond-signal" r="2.6">
            <animateMotion
              path="M 385 98 L 315 165"
              dur="4s"
              repeatCount="indefinite"
            />
          </circle>

          <circle className="lp-diamond-signal" r="2.6">
            <animateMotion
              path="M 315 290 L 365 340 Q 377 352 393 352"
              dur="4.5s"
              repeatCount="indefinite"
            />
          </circle>
        </svg>

        <div className="lp-diamond-centre">
          <div className="lp-diamond-glass">
            <svg
              className="lp-diamond-edge"
              viewBox="0 0 200 200"
              aria-hidden="true"
            >
              <rect
                className="lp-diamond-edge-base"
                x="2"
                y="2"
                width="196"
                height="196"
                rx="15"
              />
              <rect
                className="lp-diamond-edge-light"
                x="2"
                y="2"
                width="196"
                height="196"
                rx="15"
                pathLength="100"
              />
            </svg>
          </div>

          <div className="lp-diamond-brand">
            <img src={bioSyncShield} alt="" draggable={false} />
            <strong>BioSync</strong>
            <span>SENTINEL</span>
          </div>
        </div>

        <div className="lp-diamond-node lp-diamond-rfid">
          <div className="lp-diamond-node-icon">
            <CreditCard size={26} strokeWidth={1.4} />
          </div>
          <span>RFID</span>
        </div>

        <div className="lp-diamond-node lp-diamond-face">
          <div className="lp-diamond-node-icon">
            <ScanFace size={27} strokeWidth={1.4} />
          </div>
          <span>Face + Liveness</span>
        </div>

        <div className="lp-diamond-node lp-diamond-fingerprint">
          <div className="lp-diamond-node-icon">
            <Fingerprint size={28} strokeWidth={1.4} />
          </div>
          <span>Fingerprint</span>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ label, title, description }) {
  return (
    <div className="lp-section-header" data-reveal>
      <span className="lp-section-label">{label}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  text,
  warning = false,
  number,
  protectedCard = false,
}) {
  return (
    <article className="lp-card" data-reveal>
      {number && <span className="lp-card-number">{number}</span>}
      <div className="lp-security-top">
        <div className={`lp-card-icon ${warning ? "warning" : ""}`}>
          <Icon size={21} />
        </div>
        {protectedCard && <span>Protected</span>}
      </div>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

function DashboardPreview() {
  const nav = [
    [LayoutDashboard, "Dashboard"],
    [Activity, "Attendance"],
    [AlertTriangle, "Disputes"],
    [Users, "Users"],
    [BarChart3, "Analytics"],
    [Settings, "Account"],
  ];

  const stats = [
    ["Users", "248"],
    ["Present Today", "216"],
    ["Pending Disputes", "04"],
    ["Active Devices", "06"],
  ];

  return (
    <div className="lp-dashboard-preview" data-reveal>
      <aside>
        <div className="lp-preview-logo">
          <img src={bioSyncShield} alt="" />
          <div>
            <strong>BioSync</strong>
            <span>Sentinel</span>
          </div>
        </div>
        {nav.map(([Icon, label], index) => (
          <div
            key={label}
            className={`lp-preview-nav ${index === 0 ? "active" : ""}`}
          >
            <Icon size={14} />
            {label}
          </div>
        ))}
      </aside>

      <div className="lp-preview-content">
        <div className="lp-preview-heading">
          <div>
            <span>Dashboard Overview · Sample data</span>
            <strong>Attendance Command Center</strong>
          </div>
          <div className="lp-avatar">A</div>
        </div>

        <div className="lp-preview-stats">
          {stats.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="lp-preview-panels">
          <div className="lp-chart-panel">
            <div className="lp-panel-title">
              <strong>Weekly Attendance</strong>
              <span>Overview</span>
            </div>
            <div className="lp-bars">
              {[62, 78, 70, 88, 82].map((height, index) => (
                <div key={index}>
                  <i style={{ height: `${height}%` }} />
                  <span>{["Mon", "Tue", "Wed", "Thu", "Fri"][index]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lp-activity-panel">
            <div className="lp-panel-title">
              <strong>Recent Activity</strong>
              <span>Verification</span>
            </div>
            <ActivityRow
              icon={CheckCircle2}
              title="Face verified"
              subtitle="Attendance recorded"
            />
            <ActivityRow
              icon={Fingerprint}
              title="Fingerprint used"
              subtitle="Fallback verification"
            />
            <ActivityRow
              icon={Database}
              title="Record synced"
              subtitle="Firestore updated"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ icon: Icon, title, subtitle }) {
  return (
    <div className="lp-activity-row">
      <Icon size={16} />
      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
    </div>
  );
}