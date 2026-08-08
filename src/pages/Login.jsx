import { useEffect, useRef, useState } from "react";

import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import { useNavigate } from "react-router-dom";

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

  const [
    isLeavingToDashboard,
    setIsLeavingToDashboard,
  ] = useState(false);

  const willTransitionToDashboardRef =
    useRef(false);

  const formRef = useRef(null);
  const backgroundRef = useRef(null);

  const [
    shakeTrigger,
    setShakeTrigger,
  ] = useState(0);

  const [
    loginSuccess,
    setLoginSuccess,
  ] = useState(false);

useEffect(() => {
  if (shakeTrigger === 0) {
    return;
  }

  const el = formRef.current;

  if (!el) {
    return;
  }

  el.classList.remove("bs-login-shake");

  void el.offsetWidth;

  el.classList.add("bs-login-shake");
}, [shakeTrigger]);

useEffect(() => {
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

  const isFinePointer =
    window.matchMedia &&
    window.matchMedia(
      "(pointer: fine)"
    ).matches;

  if (prefersReducedMotion || !isFinePointer) {
    return undefined;
  }

  let frame = null;

  function handleMouseMove(event) {
    if (frame) {
      return;
    }

    frame = window.requestAnimationFrame(() => {
      frame = null;

      const el = backgroundRef.current;

      if (!el) {
        return;
      }

      const xRatio =
        (event.clientX / window.innerWidth - 0.5) * 2;

      const yRatio =
        (event.clientY / window.innerHeight - 0.5) * 2;

      const maxOffset = 12;

      el.style.transform = `translate3d(${(
        xRatio * maxOffset
      ).toFixed(1)}px, ${(
        yRatio * maxOffset
      ).toFixed(1)}px, 0)`;
    });
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

    if (frame) {
      window.cancelAnimationFrame(frame);
    }
  };
}, []);

  /* =======================================================
     NAVIGATION
  ======================================================= */

function handleLogoClick() {
  navigate("/");
}

  /* =======================================================
     ERROR (WITH SHAKE)
  ======================================================= */

function showError(message) {
  setError(message);

  setShakeTrigger((current) => current + 1);
}

  /* =======================================================
     GO TO DASHBOARD (WITH TRANSITION)
  ======================================================= */

function goToDashboard(path) {
  willTransitionToDashboardRef.current = true;

  setLoginSuccess(true);

  window.setTimeout(() => {
    setIsLeavingToDashboard(true);
  }, 180);

  window.setTimeout(() => {
    navigate(path, {
      replace: true,
    });
  }, 180 + 220);
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
      showError(
        "Please enter your email address."
      );

      return;
    }

    if (!password) {
      showError(
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

        showError(
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

        showError(
          "This account has been deactivated. Please contact an administrator."
        );

        return;
      }

      /* ---------------------------------------------------
         ROLE REDIRECTION
      --------------------------------------------------- */

      if (userData.role === "admin") {
        goToDashboard("/admin/dashboard");

        return;
      }

      if (userData.role === "teacher") {
        goToDashboard("/teacher/dashboard");

        return;
      }

      if (userData.role === "student") {
        goToDashboard("/student/dashboard");

        return;
      }

      await signOut(auth);

      showError(
        "This account does not have a valid BioSync role."
      );
    } catch (loginError) {
      console.error(
        "BioSync login error:",
        loginError
      );

      showError(
        "Invalid email or password. Please try again."
      );
    } finally {
      if (!willTransitionToDashboardRef.current) {
        setLoading(false);
      }
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div
      className={[
        "bs-login-page",
        isLeavingToDashboard
          ? "bs-login-leaving-dashboard"
          : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ===================================================
          BACKGROUND
      =================================================== */}

      <div
        className="bs-login-background"
        aria-hidden="true"
        ref={backgroundRef}
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
              ref={formRef}
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
                    <Eye
                      size={17}
                      className={[
                        "bs-login-eye-icon",
                        showPassword
                          ? "bs-login-eye-icon-hidden"
                          : "bs-login-eye-icon-visible",
                      ].join(" ")}
                    />

                    <EyeOff
                      size={17}
                      className={[
                        "bs-login-eye-icon",
                        showPassword
                          ? "bs-login-eye-icon-visible"
                          : "bs-login-eye-icon-hidden",
                      ].join(" ")}
                    />
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
                onMouseMove={(event) => {
                  const rect =
                    event.currentTarget.getBoundingClientRect();

                  const mx =
                    (
                      ((event.clientX - rect.left) /
                        rect.width) *
                      100
                    ).toFixed(1);

                  const my =
                    (
                      ((event.clientY - rect.top) /
                        rect.height) *
                      100
                    ).toFixed(1);

                  event.currentTarget.style.setProperty(
                    "--bs-mx",
                    `${mx}%`
                  );

                  event.currentTarget.style.setProperty(
                    "--bs-my",
                    `${my}%`
                  );
                }}
              >
                {loginSuccess ? (
                  <>
                    <CheckCircle2
                      size={16}
                      className="bs-login-success-check"
                    />

                    Success
                  </>
                ) : loading ? (
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