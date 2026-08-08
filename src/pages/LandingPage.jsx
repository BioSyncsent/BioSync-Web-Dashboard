import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
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

import "./LandingPage.css";

/* =========================================================
   DATA
========================================================= */

const navigationItems = [
  {
    label: "Overview",
    target: "#overview",
  },
  {
    label: "Why BioSync",
    target: "#problems",
  },
  {
    label: "How It Works",
    target: "#workflow",
  },
  {
    label: "Architecture",
    target: "#architecture",
  },
  {
    label: "Dashboard",
    target: "#preview",
  },
  {
    label: "Security",
    target: "#security",
  },
];

const problemCards = [
  {
    icon: Clock,
    title: "Manual Attendance",
    description:
      "Traditional attendance consumes teaching time, creates repetitive administrative work and makes historical records harder to manage.",
  },
  {
    icon: AlertTriangle,
    title: "Proxy Attendance",
    description:
      "Cards, signatures and basic identification methods can be shared between users without proving the real account owner is physically present.",
  },
  {
    icon: Lock,
    title: "Weak Verification",
    description:
      "Single-factor attendance systems provide limited protection against impersonation, spoofing and unauthorized attendance submissions.",
  },
];

const workflowSteps = [
  {
    number: "01",
    icon: CreditCard,
    title: "RFID Identification",
    description:
      "The user presents an assigned RFID card to identify their BioSync account.",
  },
  {
    number: "02",
    icon: ScanFace,
    title: "Face Verification",
    description:
      "The terminal captures the user's face and performs identity matching.",
  },
  {
    number: "03",
    icon: Eye,
    title: "Liveness Detection",
    description:
      "Anti-spoofing checks help confirm that a real person is physically present.",
  },
  {
    number: "04",
    icon: Fingerprint,
    title: "Fingerprint Fallback",
    description:
      "Fingerprint verification provides an alternative biometric method when required.",
  },
  {
    number: "05",
    icon: Database,
    title: "Attendance Recorded",
    description:
      "Verified attendance is stored and made available to the appropriate dashboard.",
  },
];

const securityFeatures = [
  {
    icon: Eye,
    title: "Liveness Detection",
    description:
      "Facial verification is supported by liveness checks designed to reduce simple spoofing attempts.",
  },
  {
    icon: Fingerprint,
    title: "Biometric Verification",
    description:
      "Fingerprint and facial verification provide stronger identity confirmation than attendance cards alone.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description:
      "Administrators, teachers and students receive different dashboard permissions based on their assigned role.",
  },
  {
    icon: FileText,
    title: "Audit Visibility",
    description:
      "Attendance actions, disputes and administrative activity can be monitored through centralized system records.",
  },
];

/* =========================================================
   LANDING PAGE
========================================================= */

function LandingPage() {
  const navigate = useNavigate();

  const layoutRef = useRef(null);

  const [
    mobileMenuOpen,
    setMobileMenuOpen,
  ] = useState(false);

  /* =======================================================
     SCROLL REVEAL
  ======================================================= */

  useEffect(() => {
    const elements =
      document.querySelectorAll(
        ".lp-reveal"
      );

    if (!elements.length) {
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                entry.isIntersecting
              ) {
                entry.target.classList.add(
                  "is-visible"
                );

                observer.unobserve(
                  entry.target
                );
              }
            }
          );
        },
        {
          threshold: 0.12,
          rootMargin:
            "0px 0px -50px 0px",
        }
      );

    elements.forEach(
      (element) => {
        observer.observe(
          element
        );
      }
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  /* =======================================================
     MOUSE SPOTLIGHT
  ======================================================= */

  useEffect(() => {
    const layout =
      layoutRef.current;

    if (!layout) {
      return undefined;
    }

    function handleMouseMove(
      event
    ) {
      const x =
        (event.clientX /
          window.innerWidth) *
        100;

      const y =
        (event.clientY /
          window.innerHeight) *
        100;

      layout.style.setProperty(
        "--mouse-x",
        `${x}%`
      );

      layout.style.setProperty(
        "--mouse-y",
        `${y}%`
      );
    }

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );
    };
  }, []);

  /* =======================================================
     ACTIONS
  ======================================================= */

  function handleGetStarted() {
    navigate("/login");
  }

  function handleLogoClick() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    setMobileMenuOpen(false);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      ref={layoutRef}
      className="biosync-landing"
    >
      {/* ===================================================
          BACKGROUND
      =================================================== */}

      <div
        className="lp-background"
        aria-hidden="true"
      >
        <div className="lp-grid" />

        <div className="lp-glow lp-glow-one" />
        <div className="lp-glow lp-glow-two" />
        <div className="lp-glow lp-glow-three" />

        <div className="lp-mouse-light" />
      </div>

      {/* ===================================================
          NAVBAR
      =================================================== */}

      <header className="lp-navbar">
        <div className="lp-navbar-inner">
          <button
            type="button"
            className="lp-brand"
            onClick={
              handleLogoClick
            }
            aria-label="BioSync Sentinel home"
          >
            <img
              src={bioSyncLogo}
              alt="BioSync Sentinel"
              className="lp-brand-logo"
            />
          </button>

          <nav className="lp-desktop-nav">
            {navigationItems.map(
              (item) => (
                <a
                  key={
                    item.target
                  }
                  href={
                    item.target
                  }
                  className="lp-nav-link"
                >
                  {item.label}
                </a>
              )
            )}
          </nav>

          <div className="lp-nav-actions">
            <button
              type="button"
              className="lp-signin-button"
              onClick={
                handleGetStarted
              }
            >
              Sign In
            </button>

            <button
              type="button"
              className="lp-getstarted-button"
              onClick={
                handleGetStarted
              }
            >
              Get Started

              <ArrowRight
                size={15}
              />
            </button>
          </div>

          <button
            type="button"
            className="lp-mobile-menu-button"
            aria-label="Toggle navigation menu"
            onClick={() =>
              setMobileMenuOpen(
                (current) =>
                  !current
              )
            }
          >
            {mobileMenuOpen ? (
              <X size={22} />
            ) : (
              <Menu size={22} />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="lp-mobile-menu">
            {navigationItems.map(
              (item) => (
                <a
                  key={
                    item.target
                  }
                  href={
                    item.target
                  }
                  onClick={
                    closeMobileMenu
                  }
                >
                  {item.label}
                </a>
              )
            )}

            <div className="lp-mobile-divider" />

            <button
              type="button"
              onClick={() => {
                closeMobileMenu();
                handleGetStarted();
              }}
            >
              Sign In
            </button>

            <button
              type="button"
              className="primary"
              onClick={() => {
                closeMobileMenu();
                handleGetStarted();
              }}
            >
              Get Started
            </button>
          </div>
        )}
      </header>

      <main>
        {/* =================================================
            HERO
        ================================================= */}

        <section
          id="hero"
          className="lp-hero"
        >
          <div className="lp-container lp-hero-grid">
            <div className="lp-hero-content">
              <div className="lp-hero-badge">
                <Sparkles
                  size={13}
                />

                <span>
                  Secure Biometric
                  Attendance Platform
                </span>
              </div>

              <h1>
                Secure
                <br />

                Attendance
                <br />

                <span>
                  Beyond Identity
                </span>
              </h1>

              <p className="lp-hero-description">
                BioSync Sentinel
                combines RFID
                identification,
                AI-powered facial
                liveness detection,
                fingerprint
                verification and
                real-time attendance
                monitoring to deliver
                secure, fraud-resistant
                attendance management.
              </p>

              <div className="lp-hero-actions">
                <a
                  href="#overview"
                  className="lp-primary-button"
                >
                  Explore BioSync

                  <ArrowRight
                    size={16}
                  />
                </a>

                <a
                  href="#architecture"
                  className="lp-secondary-button"
                >
                  View Architecture
                </a>
              </div>

              <div className="lp-trust-strip">
                <div>
                  <strong>
                    Multi-Factor
                  </strong>

                  <span>
                    Verification
                  </span>
                </div>

                <i />

                <div>
                  <strong>
                    Real-Time
                  </strong>

                  <span>
                    Monitoring
                  </span>
                </div>

                <i />

                <div>
                  <strong>
                    Role-Based
                  </strong>

                  <span>
                    Access Control
                  </span>
                </div>
              </div>
            </div>

            {/* =============================================
                HERO VISUAL
            ============================================= */}

            <div className="lp-hero-visual">
              <div className="lp-system-card">
                <div className="lp-system-card-grid" />

                <div className="lp-system-status">
                  <span />

                  System Online
                </div>

                <div className="lp-system-node lp-node-face">
                  <ScanFace
                    size={23}
                  />

                  <span>
                    Face + Liveness
                  </span>
                </div>

                <div className="lp-system-node lp-node-rfid">
                  <CreditCard
                    size={22}
                  />

                  <span>
                    RFID
                  </span>
                </div>

                <div className="lp-system-node lp-node-print">
                  <Fingerprint
                    size={22}
                  />

                  <span>
                    Fingerprint
                  </span>
                </div>

                <div className="lp-system-node lp-node-database">
                  <Database
                    size={22}
                  />

                  <span>
                    Firestore
                  </span>
                </div>

                <div className="lp-system-line lp-line-top" />
                <div className="lp-system-line lp-line-left" />
                <div className="lp-system-line lp-line-right" />
                <div className="lp-system-line lp-line-bottom" />

                <div className="lp-system-core">
                  <ShieldCheck
                    size={37}
                  />

                  <strong>
                    BioSync
                  </strong>

                  <span>
                    Sentinel Core
                  </span>
                </div>

                <div className="lp-system-pulse pulse-one" />
                <div className="lp-system-pulse pulse-two" />
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            OVERVIEW
        ================================================= */}

        <section
          id="overview"
          className="lp-section lp-overview"
        >
          <div className="lp-container">
            <div className="lp-section-heading lp-reveal">
              <span className="lp-section-label">
                Platform Overview
              </span>

              <h2>
                Attendance that verifies
                more than a card
              </h2>

              <p>
                BioSync Sentinel combines
                identity, biometric
                verification and
                centralized dashboard
                monitoring into one
                attendance platform.
              </p>
            </div>

            <div className="lp-overview-grid">
              <article className="lp-feature-card lp-reveal">
                <div className="lp-card-icon">
                  <CreditCard
                    size={22}
                  />
                </div>

                <h3>
                  RFID Identity
                </h3>

                <p>
                  Quickly associate a
                  physical RFID credential
                  with a registered BioSync
                  account.
                </p>
              </article>

              <article className="lp-feature-card lp-reveal">
                <div className="lp-card-icon">
                  <ScanFace
                    size={22}
                  />
                </div>

                <h3>
                  Face & Liveness
                </h3>

                <p>
                  Confirm identity while
                  adding liveness checks
                  designed to reduce basic
                  face spoofing.
                </p>
              </article>

              <article className="lp-feature-card lp-reveal">
                <div className="lp-card-icon">
                  <Fingerprint
                    size={22}
                  />
                </div>

                <h3>
                  Fingerprint Fallback
                </h3>

                <p>
                  Provide another biometric
                  verification method when
                  facial recognition cannot
                  be used.
                </p>
              </article>

              <article className="lp-feature-card lp-reveal">
                <div className="lp-card-icon">
                  <LayoutDashboard
                    size={22}
                  />
                </div>

                <h3>
                  Live Dashboard
                </h3>

                <p>
                  Allow authorized users to
                  review attendance,
                  disputes, analytics and
                  system information.
                </p>
              </article>
            </div>
          </div>
        </section>

        {/* =================================================
            PROBLEMS
        ================================================= */}

        <section
          id="problems"
          className="lp-section lp-problems"
        >
          <div className="lp-container">
            <div className="lp-section-heading lp-reveal">
              <span className="lp-section-label">
                Why BioSync
              </span>

              <h2>
                Traditional attendance has
                weaknesses
              </h2>

              <p>
                BioSync is designed around
                common problems found in
                manual and basic
                single-factor attendance
                systems.
              </p>
            </div>

            <div className="lp-problem-grid">
              {problemCards.map(
                (item) => {
                  const Icon =
                    item.icon;

                  return (
                    <article
                      key={
                        item.title
                      }
                      className="lp-problem-card lp-reveal"
                    >
                      <div className="lp-problem-number">
                        0
                        {problemCards.indexOf(
                          item
                        ) + 1}
                      </div>

                      <div className="lp-card-icon danger">
                        <Icon
                          size={22}
                        />
                      </div>

                      <h3>
                        {item.title}
                      </h3>

                      <p>
                        {
                          item.description
                        }
                      </p>
                    </article>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            WORKFLOW
        ================================================= */}

        <section
          id="workflow"
          className="lp-section lp-workflow"
        >
          <div className="lp-container">
            <div className="lp-section-heading lp-reveal">
              <span className="lp-section-label">
                Verification Flow
              </span>

              <h2>
                How BioSync works
              </h2>

              <p>
                A structured verification
                process moves from identity
                detection to biometric
                confirmation and attendance
                recording.
              </p>
            </div>

            <div className="lp-workflow-grid">
              {workflowSteps.map(
                (step,
                index) => {
                  const Icon =
                    step.icon;

                  return (
                    <div
                      key={
                        step.number
                      }
                      className="lp-workflow-step lp-reveal"
                    >
                      <div className="lp-workflow-number">
                        {
                          step.number
                        }
                      </div>

                      <div className="lp-workflow-icon">
                        <Icon
                          size={22}
                        />
                      </div>

                      <h3>
                        {
                          step.title
                        }
                      </h3>

                      <p>
                        {
                          step.description
                        }
                      </p>

                      {index <
                        workflowSteps.length -
                          1 && (
                        <ChevronRight
                          size={20}
                          className="lp-workflow-arrow"
                        />
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            ARCHITECTURE
        ================================================= */}

        <section
          id="architecture"
          className="lp-section lp-architecture"
        >
          <div className="lp-container">
            <div className="lp-section-heading lp-reveal">
              <span className="lp-section-label">
                System Architecture
              </span>

              <h2>
                From biometric terminal
                to dashboard
              </h2>

              <p>
                BioSync connects physical
                attendance terminals,
                Firebase services and
                role-based dashboard
                experiences.
              </p>
            </div>

            <div className="lp-architecture-card lp-reveal">
              <div className="lp-architecture-grid">
                <div className="lp-architecture-node">
                  <div>
                    <Cpu size={25} />
                  </div>

                  <span>
                    Layer 01
                  </span>

                  <h3>
                    Biometric Terminal
                  </h3>

                  <p>
                    RFID, camera and
                    fingerprint hardware.
                  </p>
                </div>

                <div className="lp-architecture-arrow">
                  <ArrowRight
                    size={24}
                  />
                </div>

                <div className="lp-architecture-node">
                  <div>
                    <ShieldCheck
                      size={25}
                    />
                  </div>

                  <span>
                    Layer 02
                  </span>

                  <h3>
                    Verification
                  </h3>

                  <p>
                    Identity matching and
                    biometric validation.
                  </p>
                </div>

                <div className="lp-architecture-arrow">
                  <ArrowRight
                    size={24}
                  />
                </div>

                <div className="lp-architecture-node">
                  <div>
                    <Server
                      size={25}
                    />
                  </div>

                  <span>
                    Layer 03
                  </span>

                  <h3>
                    Firebase
                  </h3>

                  <p>
                    Authentication,
                    Firestore and secured
                    account data.
                  </p>
                </div>

                <div className="lp-architecture-arrow">
                  <ArrowRight
                    size={24}
                  />
                </div>

                <div className="lp-architecture-node">
                  <div>
                    <LayoutDashboard
                      size={25}
                    />
                  </div>

                  <span>
                    Layer 04
                  </span>

                  <h3>
                    Dashboard
                  </h3>

                  <p>
                    Role-based monitoring
                    and attendance
                    management.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            ROLE BASED
        ================================================= */}

        <section
          id="roles"
          className="lp-section lp-roles"
        >
          <div className="lp-container">
            <div className="lp-section-heading lp-reveal">
              <span className="lp-section-label">
                Role-Based Experience
              </span>

              <h2>
                One platform.
                Three focused experiences.
              </h2>

              <p>
                Every BioSync role receives
                tools designed around its
                responsibility.
              </p>
            </div>

            <div className="lp-role-grid">
              {/* ADMIN */}

              <article className="lp-role-card lp-reveal">
                <div className="lp-role-card-top">
                  <div className="lp-role-icon admin">
                    <ShieldCheck
                      size={24}
                    />
                  </div>

                  <span>
                    Full Oversight
                  </span>
                </div>

                <h3>
                  Administrator
                </h3>

                <p>
                  Manage BioSync users,
                  attendance integrity,
                  disputes, devices and
                  system-level operations.
                </p>

                <ul>
                  <li>
                    <Check
                      size={15}
                    />
                    User Management
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Attendance Control
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Dispute Review
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Device Monitoring
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    System Analytics
                  </li>
                </ul>
              </article>

              {/* TEACHER */}

              <article className="lp-role-card lp-reveal">
                <div className="lp-role-card-top">
                  <div className="lp-role-icon teacher">
                    <BookOpen
                      size={24}
                    />
                  </div>

                  <span>
                    Class Focused
                  </span>
                </div>

                <h3>
                  Teacher
                </h3>

                <p>
                  Monitor assigned classes,
                  student attendance and
                  teaching-level attendance
                  insights.
                </p>

                <ul>
                  <li>
                    <Check
                      size={15}
                    />
                    My Classes
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Class Attendance
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Student Monitoring
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Dispute Review
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Class Analytics
                  </li>
                </ul>
              </article>

              {/* STUDENT */}

              <article className="lp-role-card lp-reveal">
                <div className="lp-role-card-top">
                  <div className="lp-role-icon student">
                    <GraduationCap
                      size={24}
                    />
                  </div>

                  <span>
                    Personal Access
                  </span>
                </div>

                <h3>
                  Student
                </h3>

                <p>
                  Review personal
                  attendance records,
                  submit disputes and
                  monitor attendance
                  performance.
                </p>

                <ul>
                  <li>
                    <Check
                      size={15}
                    />
                    Attendance History
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Submit Disputes
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Personal Analytics
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Biometric Status
                  </li>

                  <li>
                    <Check
                      size={15}
                    />
                    Account Management
                  </li>
                </ul>
              </article>
            </div>
          </div>
        </section>

        {/* =================================================
            DASHBOARD PREVIEW
        ================================================= */}

        <section
          id="preview"
          className="lp-section lp-preview"
        >
          <div className="lp-container">
            <div className="lp-section-heading lp-reveal">
              <span className="lp-section-label">
                Centralized Dashboard
              </span>

              <h2>
                Attendance intelligence
                in one workspace
              </h2>

              <p>
                BioSync transforms
                verification records into
                useful information for
                administrators, teachers
                and students.
              </p>
            </div>

            <div className="lp-dashboard-preview lp-reveal">
              <aside className="lp-preview-sidebar">
                <div className="lp-preview-brand">
                  <ShieldCheck
                    size={22}
                  />

                  <div>
                    <strong>
                      BioSync
                    </strong>

                    <span>
                      Sentinel
                    </span>
                  </div>
                </div>

                <div className="lp-preview-nav">
                  <div className="active">
                    <LayoutDashboard
                      size={15}
                    />

                    Dashboard
                  </div>

                  <div>
                    <Activity
                      size={15}
                    />

                    Attendance
                  </div>

                  <div>
                    <AlertTriangle
                      size={15}
                    />

                    Disputes
                  </div>

                  <div>
                    <Users
                      size={15}
                    />

                    Users
                  </div>

                  <div>
                    <BarChart3
                      size={15}
                    />

                    Analytics
                  </div>

                  <div>
                    <Settings
                      size={15}
                    />

                    Account
                  </div>
                </div>
              </aside>

              <div className="lp-preview-main">
                <div className="lp-preview-header">
                  <div>
                    <span>
                      Dashboard Overview
                    </span>

                    <strong>
                      Attendance Command
                      Center
                    </strong>
                  </div>

                  <div className="lp-preview-user">
                    A
                  </div>
                </div>

                <div className="lp-preview-kpis">
                  <div>
                    <span>
                      Total Users
                    </span>

                    <strong>
                      248
                    </strong>
                  </div>

                  <div>
                    <span>
                      Present Today
                    </span>

                    <strong>
                      216
                    </strong>
                  </div>

                  <div>
                    <span>
                      Pending Disputes
                    </span>

                    <strong>
                      04
                    </strong>
                  </div>

                  <div>
                    <span>
                      Active Devices
                    </span>

                    <strong>
                      06
                    </strong>
                  </div>
                </div>

                <div className="lp-preview-panels">
                  <div className="lp-preview-chart">
                    <div className="lp-preview-panel-title">
                      <span>
                        Weekly Attendance
                      </span>

                      <small>
                        Live overview
                      </small>
                    </div>

                    <div className="lp-bar-chart">
                      <div>
                        <i
                          style={{
                            height:
                              "62%",
                          }}
                        />
                        <span>
                          Mon
                        </span>
                      </div>

                      <div>
                        <i
                          style={{
                            height:
                              "78%",
                          }}
                        />
                        <span>
                          Tue
                        </span>
                      </div>

                      <div>
                        <i
                          style={{
                            height:
                              "70%",
                          }}
                        />
                        <span>
                          Wed
                        </span>
                      </div>

                      <div>
                        <i
                          style={{
                            height:
                              "88%",
                          }}
                        />
                        <span>
                          Thu
                        </span>
                      </div>

                      <div>
                        <i
                          style={{
                            height:
                              "82%",
                          }}
                        />
                        <span>
                          Fri
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lp-preview-activity">
                    <div className="lp-preview-panel-title">
                      <span>
                        Recent Activity
                      </span>

                      <small>
                        Verification
                      </small>
                    </div>

                    <div className="lp-activity-row">
                      <CheckCircle2
                        size={15}
                      />

                      <div>
                        <strong>
                          Face verified
                        </strong>

                        <span>
                          Student attendance
                        </span>
                      </div>

                      <small>
                        Now
                      </small>
                    </div>

                    <div className="lp-activity-row">
                      <Fingerprint
                        size={15}
                      />

                      <div>
                        <strong>
                          Fingerprint used
                        </strong>

                        <span>
                          Fallback method
                        </span>
                      </div>

                      <small>
                        2m
                      </small>
                    </div>

                    <div className="lp-activity-row">
                      <Database
                        size={15}
                      />

                      <div>
                        <strong>
                          Record synced
                        </strong>

                        <span>
                          Firestore update
                        </span>
                      </div>

                      <small>
                        4m
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            SECURITY
        ================================================= */}

        <section
          id="security"
          className="lp-section lp-security"
        >
          <div className="lp-container">
            <div className="lp-section-heading lp-reveal">
              <span className="lp-section-label">
                Security Layers
              </span>

              <h2>
                Built around identity
                integrity
              </h2>

              <p>
                Multiple verification and
                access-control layers help
                protect the integrity of
                attendance information.
              </p>
            </div>

            <div className="lp-security-grid">
              {securityFeatures.map(
                (feature) => {
                  const Icon =
                    feature.icon;

                  return (
                    <article
                      key={
                        feature.title
                      }
                      className="lp-security-card lp-reveal"
                    >
                      <div className="lp-security-card-header">
                        <div className="lp-security-icon">
                          <Icon
                            size={22}
                          />
                        </div>

                        <span>
                          Protected
                        </span>
                      </div>

                      <h3>
                        {
                          feature.title
                        }
                      </h3>

                      <p>
                        {
                          feature.description
                        }
                      </p>
                    </article>
                  );
                }
              )}
            </div>
          </div>
        </section>

        {/* =================================================
            TECHNOLOGY
        ================================================= */}

        <section className="lp-section lp-technology">
          <div className="lp-container">
            <div className="lp-section-heading lp-reveal">
              <span className="lp-section-label">
                Technology Foundation
              </span>

              <h2>
                Built with modern
                application technologies
              </h2>
            </div>

            <div className="lp-tech-grid">
              <div className="lp-tech-card lp-reveal">
                <h3>
                  Web Platform
                </h3>

                <div>
                  <span>
                    React
                  </span>
                  <span>
                    Vite
                  </span>
                  <span>
                    React Router
                  </span>
                  <span>
                    Recharts
                  </span>
                </div>
              </div>

              <div className="lp-tech-card lp-reveal">
                <h3>
                  Firebase Services
                </h3>

                <div>
                  <span>
                    Authentication
                  </span>
                  <span>
                    Cloud Firestore
                  </span>
                  <span>
                    Storage
                  </span>
                  <span>
                    Security Rules
                  </span>
                </div>
              </div>

              <div className="lp-tech-card lp-reveal">
                <h3>
                  Biometrics
                </h3>

                <div>
                  <span>
                    RFID
                  </span>
                  <span>
                    Facial Recognition
                  </span>
                  <span>
                    Liveness Detection
                  </span>
                  <span>
                    Fingerprint
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            FINAL CTA
        ================================================= */}

        <section className="lp-final-section">
          <div className="lp-container">
            <div className="lp-final-card lp-reveal">
              <div>
                <span className="lp-section-label">
                  Secure Access
                </span>

                <h2>
                  Ready to experience
                  BioSync Sentinel?
                </h2>

                <p>
                  Access your secure
                  role-based workspace for
                  attendance, monitoring,
                  disputes and analytics.
                </p>
              </div>

              <div className="lp-final-actions">
                <button
                  type="button"
                  className="lp-primary-button"
                  onClick={
                    handleGetStarted
                  }
                >
                  Sign In to BioSync

                  <ArrowRight
                    size={16}
                  />
                </button>

                <a
                  href="#architecture"
                  className="lp-secondary-button"
                >
                  View Architecture
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <footer className="lp-footer">
        <div className="lp-container lp-footer-main">
          <div className="lp-footer-brand">
            <button
              type="button"
              onClick={
                handleLogoClick
              }
            >
              <img
                src={bioSyncLogo}
                alt="BioSync Sentinel"
              />
            </button>

            <p>
              Secure biometric attendance.
              Real-time oversight.
            </p>

            <span>
              Built for administrators,
              teachers and students.
            </span>
          </div>

          <div className="lp-footer-links">
            <div>
              <strong>
                Platform
              </strong>

              <a href="#overview">
                Overview
              </a>

              <a href="#workflow">
                How It Works
              </a>

              <a href="#roles">
                User Roles
              </a>
            </div>

            <div>
              <strong>
                System
              </strong>

              <a href="#architecture">
                Architecture
              </a>

              <a href="#preview">
                Dashboard
              </a>

              <a href="#security">
                Security
              </a>
            </div>

            <div>
              <strong>
                Access
              </strong>

              <button
                type="button"
                onClick={
                  handleGetStarted
                }
              >
                Sign In
              </button>

              <span>
                BioSecure Enterprise
              </span>
            </div>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <div className="lp-container">
            <span>
              ©{" "}
              {new Date().getFullYear()}{" "}
              BioSync Sentinel.
            </span>

            <span>
              Secure Attendance Beyond
              Identity.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;