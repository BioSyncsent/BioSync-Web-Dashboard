import { useState } from "react";

import {
  signInWithEmailAndPassword,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  auth,
  db,
} from "../firebase/firebase";

import navbarLogo from "../assets/BioSync_Logo_Navbar.png";
import loginShield from "../assets/BioSync_Login_Shield.png";

import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  /* =========================================================
     NAVIGATION
  ========================================================= */

  function handleLogoClick() {
    if (location.pathname === "/") {
      window.location.reload();
      return;
    }

    navigate("/");
  }

  /* =========================================================
     LOGIN
  ========================================================= */

  async function handleLogin(event) {
    event.preventDefault();

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError(
        "Please enter your email and password."
      );

      return;
    }

    try {
      setLoading(true);
      setError("");

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const uid =
        userCredential.user.uid;

      const userSnapshot =
        await getDoc(
          doc(
            db,
            "users",
            uid
          )
        );

      if (!userSnapshot.exists()) {
        setError(
          "User profile not found."
        );

        return;
      }

      const userData =
        userSnapshot.data();

      if (userData.active === false) {
        navigate(
          "/unauthorized",
          {
            replace: true,
          }
        );

        return;
      }

      const role =
        String(
          userData.role || ""
        )
          .trim()
          .toLowerCase();

      if (role === "admin") {
        navigate(
          "/admin/dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      if (role === "teacher") {
        navigate(
          "/teacher/dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      if (role === "student") {
        navigate(
          "/student/dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      setError(
        "Invalid user role."
      );
    } catch (loginError) {
      console.error(
        "BioSync login error:",
        loginError
      );

      const code =
        loginError?.code || "";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setError(
          "Incorrect email or password."
        );
      } else if (
        code === "auth/invalid-email"
      ) {
        setError(
          "Please enter a valid email address."
        );
      } else if (
        code === "auth/too-many-requests"
      ) {
        setError(
          "Too many login attempts. Please try again later."
        );
      } else if (
        code === "auth/network-request-failed"
      ) {
        setError(
          "Unable to connect. Please check your network connection."
        );
      } else {
        setError(
          "Unable to sign in. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bs-login-page">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="bs-login-navbar">
        <div className="bs-login-navbar-inner">

          <button
            type="button"
            className="bs-login-brand"
            onClick={handleLogoClick}
            aria-label="BioSync Sentinel"
          >
            <img
              src={navbarLogo}
              alt="BioSync Sentinel"
            />
          </button>

          <div className="bs-login-nav-right">

            <div className="bs-nav-online">
              <span className="bs-online-dot" />

              SYSTEM ONLINE
            </div>

            <div className="bs-nav-secure">
              <ShieldCheck size={15} />

              Secure Access
            </div>

            <div className="bs-nav-message">
              <span>
                Smarter Security.
              </span>

              <strong>
                Brighter Campuses.
              </strong>
            </div>

          </div>

        </div>
      </header>

      {/* =====================================================
          MAIN PAGE
      ===================================================== */}

      <main className="bs-login-main">

        {/* BACKGROUND GRID */}

        <div
          className="bs-login-grid"
          aria-hidden="true"
        />

        {/* IMPULSE WAVES */}

        <div
          className="bs-impulse-system"
          aria-hidden="true"
        >
          <span className="bs-impulse-wave bs-impulse-wave-1" />

          <span className="bs-impulse-wave bs-impulse-wave-2" />

          <span className="bs-impulse-wave bs-impulse-wave-3" />

          <span className="bs-impulse-wave bs-impulse-wave-4" />
        </div>

        {/* ===================================================
            LEFT INFORMATION
        =================================================== */}

        <section className="bs-login-intro">

          <span className="bs-intro-eyebrow">
            INTEGRATED
            <br />
            BIOMETRIC
            <br />
            ATTENDANCE SYSTEM
          </span>

          <span className="bs-intro-line" />

          <h1>
            Security
            <br />

            <span>
              Beyond
            </span>

            <br />

            Attendance.
          </h1>

          <p>
            RFID, facial recognition and
            fingerprint verification provide
            secure, multi-factor attendance
            authentication for a smarter and
            safer campus.
          </p>

        </section>

        {/* ===================================================
            CENTER LOGIN / RADAR
        =================================================== */}

        <section className="bs-login-center">

          {/* RADAR */}

          <div
            className="bs-radar"
            aria-hidden="true"
          >
            <div className="bs-radar-ring bs-radar-ring-1" />
            <div className="bs-radar-ring bs-radar-ring-2" />
            <div className="bs-radar-ring bs-radar-ring-3" />
            <div className="bs-radar-ring bs-radar-ring-4" />

            <span className="bs-radar-dot bs-radar-dot-1" />
            <span className="bs-radar-dot bs-radar-dot-2" />
            <span className="bs-radar-dot bs-radar-dot-3" />
          </div>

          {/* LOGIN CARD */}

          <section className="bs-login-card">

            <div className="bs-login-card-line" />

            {/* SHIELD */}

            <div className="bs-login-shield">
              <img
                src={loginShield}
                alt="BioSync Sentinel Shield"
              />
            </div>

            {/* HEADING */}

            <div className="bs-login-heading">

              <span>
                SECURE PORTAL
              </span>

              <h2>
                Welcome Back
              </h2>

              <p>
                Sign in to your BioSync Sentinel
                account to continue.
              </p>

            </div>

            {/* FORM */}

            <form
              className="bs-login-form"
              onSubmit={handleLogin}
            >

              {/* EMAIL */}

              <div className="bs-login-field">

                <label htmlFor="login-email">
                  Email Address
                </label>

                <div className="bs-login-input">

                  <Mail size={17} />

                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    placeholder="user@biosync.net"
                    autoComplete="email"
                    disabled={loading}
                    onChange={(event) => {
                      setEmail(
                        event.target.value
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    required
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="bs-login-field">

                <div className="bs-login-label-row">

                  <label htmlFor="login-password">
                    Password
                  </label>

                  <span>
                    PROTECTED
                  </span>

                </div>

                <div className="bs-login-input">

                  <LockKeyhole size={17} />

                  <input
                    id="login-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    onChange={(event) => {
                      setPassword(
                        event.target.value
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    required
                  />

                  <button
                    type="button"
                    className="bs-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                    disabled={loading}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={16} />
                    ) : (
                      <Eye size={16} />
                    )}
                  </button>

                </div>

              </div>

              {/* ERROR */}

              {error && (
                <div
                  className="bs-login-error"
                  role="alert"
                >
                  <ShieldCheck size={15} />

                  <span>
                    {error}
                  </span>
                </div>
              )}

              {/* BUTTON */}

              <button
                type="submit"
                className="bs-login-submit"
                disabled={loading}
              >

                {loading ? (
                  <>
                    <span className="bs-login-spinner" />

                    Authenticating...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={18} />

                    Secure Sign In
                  </>
                )}

              </button>

            </form>

            {/* SECURITY */}

            <div className="bs-login-security">

              <span>
                <i />

                Firebase Authentication
              </span>

              <span className="bs-security-divider" />

              <span>
                <ShieldCheck size={12} />

                Encrypted Access
              </span>

            </div>

            <div className="bs-authorized">
              AUTHORIZED USERS ONLY
            </div>

          </section>

        </section>

        {/* ===================================================
            RIGHT DECORATION
        =================================================== */}

        <aside className="bs-login-right">

          <div className="bs-right-line" />

          <div>
            <span>
              TRUST
            </span>

            <span>
              IDENTITY
            </span>

            <span>
              PROTECT
            </span>

            <span>
              TOGETHER
            </span>
          </div>

        </aside>

      </main>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer className="bs-login-footer">

        <span>
          © 2026 BioSync Sentinel
        </span>

        <span>
          Secure Biometric Attendance Gateway
        </span>

        <span>
          v4.2.1
        </span>

      </footer>

    </div>
  );
}

export default Login;