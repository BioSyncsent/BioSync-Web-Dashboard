import { useEffect, useState } from "react";

import {
  signInWithEmailAndPassword,
  signOut,
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
  ArrowLeft,
  CheckCircle2,
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

import bioSyncLogo from "../assets/BioSync_Logo_Navbar.png";
import loginShield from "../assets/BioSync_Login_Shield.png";

import "./Login.css";

/* =========================================================
   BIOSYNC LOGIN
========================================================= */

function Login() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const [
    isEntering,
    setIsEntering,
  ] = useState(
    () =>
      location.state?.fromLanding === true
  );

  const [
    isLeavingToHome,
    setIsLeavingToHome,
  ] = useState(false);

useEffect(() => {
  if (!isEntering) {
    return undefined;
  }

  const timer =
    window.setTimeout(() => {
      setIsEntering(false);
    }, 280);

  return () => {
    window.clearTimeout(timer);
  };
}, [isEntering]);

  /* =======================================================
     NAVIGATION
  ======================================================= */

function handleLogoClick() {
  if (isLeavingToHome) {
    return;
  }

  setIsLeavingToHome(true);

  window.setTimeout(() => {
    navigate("/", {
      state: {
        fromLogin: true,
      },
    });
  }, 160);
}

  /* =======================================================
     LOGIN
  ======================================================= */

  async function handleLogin(event) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    const cleanEmail =
      email.trim().toLowerCase();

    if (!cleanEmail) {
      setError(
        "Please enter your email address."
      );

      return;
    }

    if (!password) {
      setError(
        "Please enter your password."
      );

      return;
    }

    setLoading(true);

    try {
      /* ---------------------------------------------------
         FIREBASE AUTHENTICATION
      --------------------------------------------------- */

      const userCredential =
        await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

      const uid =
        userCredential.user.uid;

      /* ---------------------------------------------------
         LOAD FIRESTORE PROFILE
      --------------------------------------------------- */

      const userSnapshot =
        await getDoc(
          doc(
            db,
            "users",
            uid
          )
        );

      if (!userSnapshot.exists()) {
        await signOut(auth);

        setError(
          "Your BioSync user profile could not be found."
        );

        return;
      }

      const userData =
        userSnapshot.data();

      /* ---------------------------------------------------
         ACCOUNT STATUS
      --------------------------------------------------- */

      if (userData.active === false) {
        await signOut(auth);

        setError(
          "This account has been deactivated. Please contact an administrator."
        );

        return;
      }

      /* ---------------------------------------------------
         ROLE REDIRECTION
      --------------------------------------------------- */

      if (userData.role === "admin") {
        navigate(
          "/admin/dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      if (userData.role === "teacher") {
        navigate(
          "/teacher/dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      if (userData.role === "student") {
        navigate(
          "/student/dashboard",
          {
            replace: true,
          }
        );

        return;
      }

      await signOut(auth);

      setError(
        "This account does not have a valid BioSync role."
      );
    } catch (loginError) {
      console.error(
        "BioSync login error:",
        loginError
      );

      setError(
        "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      className={[
        "bs-login-page",
        isEntering
          ? "bs-login-entering"
          : "",
        isLeavingToHome
          ? "bs-login-leaving"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ROUTE TRANSITION */}

      <div
        className="bs-route-transition"
        aria-hidden="true"
      />

      {/* ===================================================
          BACKGROUND
      =================================================== */}

      <div
        className="bs-login-background"
        aria-hidden="true"
      >
        <div className="bs-login-grid" />

        <div className="bs-login-glow bs-login-glow-one" />

        <div className="bs-login-glow bs-login-glow-two" />

        <div className="bs-login-glow bs-login-glow-three" />

        <div className="bs-login-scanline" />

        <div className="bs-login-orbit bs-login-orbit-one" />

        <div className="bs-login-orbit bs-login-orbit-two" />
      </div>

      {/* ===================================================
          NAVBAR
      =================================================== */}

      <header className="bs-login-navbar">
        <div className="bs-login-navbar-inner">
          <button
            type="button"
            className="bs-login-brand"
            onClick={handleLogoClick}
            aria-label="Return to BioSync Sentinel home"
          >
            <img
              src={bioSyncLogo}
              alt="BioSync Sentinel"
            />
          </button>

          <button
            type="button"
            className="bs-login-home-button"
            onClick={handleLogoClick}
          >
            <ArrowLeft size={15} />

            <span>
              Back to Home
            </span>
          </button>
        </div>
      </header>

      {/* ===================================================
          MAIN CONTENT
      =================================================== */}

      <main className="bs-login-main">
        <section className="bs-login-container">
          {/* -----------------------------------------------
              SECURITY STATUS
          ------------------------------------------------ */}

          <div className="bs-login-status">
            <span className="bs-login-status-dot" />

            <span>
              BioSync authentication
              service online
            </span>
          </div>

          {/* -----------------------------------------------
              LOGIN CARD
          ------------------------------------------------ */}

          <div className="bs-login-card">
            <div
              className="bs-login-card-glow"
              aria-hidden="true"
            />

            <div
              className="bs-login-card-line"
              aria-hidden="true"
            />

            {/* LOGO */}

            <div className="bs-login-shield-wrapper">
              <div className="bs-login-shield-glow" />

              <img
                src={loginShield}
                alt=""
                className="bs-login-shield"
              />
            </div>

            {/* TITLE */}

            <div className="bs-login-heading">
              <div className="bs-login-secure-label">
                <ShieldCheck size={13} />

                Secure Portal
              </div>

              <h1>
                Welcome back
              </h1>

              <p>
                Secure access to
                BioSync Sentinel
              </p>
            </div>

            {/* FORM */}

            <form
              className="bs-login-form"
              onSubmit={handleLogin}
            >
              {/* EMAIL */}

              <div className="bs-login-field">
                <label
                  htmlFor="login-email"
                  className="bs-login-label"
                >
                  Email Address
                </label>

                <div className="bs-login-input-wrapper">
                  <Mail
                    size={17}
                    className="bs-login-input-icon"
                  />

                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    autoComplete="email"
                    placeholder="user@biosync.net"
                    disabled={loading}
                    onChange={(event) => {
                      setEmail(
                        event.target.value
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                  />
                </div>
              </div>

              {/* PASSWORD */}

              <div className="bs-login-field">
                <label
                  htmlFor="login-password"
                  className="bs-login-label"
                >
                  Password
                </label>

                <div className="bs-login-input-wrapper">
                  <LockKeyhole
                    size={17}
                    className="bs-login-input-icon"
                  />

                  <input
                    id="login-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    disabled={loading}
                    onChange={(event) => {
                      setPassword(
                        event.target.value
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="bs-login-password-toggle"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    disabled={loading}
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current
                      )
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
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
                  <span className="bs-login-error-icon">
                    !
                  </span>

                  <span>
                    {error}
                  </span>
                </div>
              )}

              {/* LOGIN */}

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
                    <LockKeyhole
                      size={16}
                    />

                    Sign In Securely
                  </>
                )}
              </button>
            </form>

            {/* SECURITY FOOTER */}

            <div className="bs-login-security">
              <div className="bs-login-security-item">
                <CheckCircle2
                  size={13}
                />

                Firebase secured
              </div>

              <div className="bs-login-security-divider" />

              <div className="bs-login-security-item">
                <ShieldCheck
                  size={13}
                />

                Role protected
              </div>
            </div>

            <div className="bs-login-card-footer">
              <ShieldCheck size={12} />

              <span>
                Authorized users only
              </span>
            </div>
          </div>

          {/* -----------------------------------------------
              PAGE FOOTER
          ------------------------------------------------ */}

          <p className="bs-login-footer">
            BioSync Sentinel
            <span>•</span>
            BioSecure Enterprise
            <span>•</span>
            v4.2.1
          </p>
        </section>
      </main>
    </div>
  );
}

export default Login;