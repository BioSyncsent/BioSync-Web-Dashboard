import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";

import { auth, db } from "../firebase/firebase";

import navbarLogo from "../assets/BioSync_Logo_Navbar.png";
import loginShield from "../assets/BioSync_Login_Shield.png";
import ColorBends from "../components/ColorBends";

import "./Login.css";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event) {
    event.preventDefault();
    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const userCredential = await signInWithEmailAndPassword(
        auth,
        cleanEmail,
        password
      );

      const userSnapshot = await getDoc(
        doc(db, "users", userCredential.user.uid)
      );

      if (!userSnapshot.exists()) {
        setError("User profile not found.");
        return;
      }

      const userData = userSnapshot.data();

      if (userData.active === false) {
        navigate("/unauthorized", { replace: true });
        return;
      }

      const role = String(userData.role || "")
        .trim()
        .toLowerCase();

      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
        return;
      }

      if (role === "teacher") {
        navigate("/teacher/dashboard", { replace: true });
        return;
      }

      if (role === "student") {
        navigate("/student/dashboard", { replace: true });
        return;
      }

      setError("Invalid user role.");
    } catch (loginError) {
      console.error("BioSync login error:", loginError);

      const code = loginError?.code || "";

      if (
        code === "auth/invalid-credential" ||
        code === "auth/wrong-password" ||
        code === "auth/user-not-found"
      ) {
        setError("Incorrect email or password.");
      } else if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many login attempts. Please try again later.");
      } else if (code === "auth/network-request-failed") {
        setError(
          "Unable to connect. Please check your network connection."
        );
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bs-login-page">
      {/* Same black aurora as the landing page */}
      <div className="bs-login-aurora" aria-hidden="true">
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

      <header className="bs-login-navbar">
        <div className="bs-login-navbar-inner">
          <Link
            to="/"
            className="bs-login-brand"
            aria-label="BioSync home"
          >
            <img src={navbarLogo} alt="BioSync Sentinel" />
          </Link>

          <Link to="/" className="bs-login-home">
            <ArrowLeft size={17} />
            <span>Back to home</span>
          </Link>
        </div>
      </header>

      <main className="bs-login-main">
        <div className="bs-login-layout">
          <section className="bs-login-intro">
            <div className="bs-login-eyebrow">
              <LockKeyhole size={14} />
              <span>Secure Workspace</span>
            </div>

            <h1>
              Your identity.
              <br />
              <span>Your workspace.</span>
            </h1>

            <p>
              Access your attendance, monitoring and account tools
              through your assigned BioSync role.
            </p>

            <div
              className="bs-login-roles"
              aria-label="Supported account roles"
            >
              <span>Administrator</span>
              <i aria-hidden="true" />
              <span>Teacher</span>
              <i aria-hidden="true" />
              <span>Student</span>
            </div>
          </section>

          <section
            className="bs-login-card"
            aria-labelledby="bs-login-title"
          >
            {/* Decorative layers stay behind the form */}
            <div className="bs-card-grid" aria-hidden="true" />
            <div className="bs-card-reflection" aria-hidden="true" />
            <div className="bs-card-corner corner-top" aria-hidden="true" />
            <div
              className="bs-card-corner corner-bottom"
              aria-hidden="true"
            />

            <div className="bs-login-card-content">
              <div className="bs-login-logo-stage">
                <div className="bs-login-diamond">
                  <svg
                    className="bs-login-diamond-edge"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                  >
                    <rect
                      className="bs-diamond-outline"
                      x="2"
                      y="2"
                      width="96"
                      height="96"
                      rx="10"
                    />
                    <rect
                      className="bs-diamond-highlight"
                      x="2"
                      y="2"
                      width="96"
                      height="96"
                      rx="10"
                      pathLength="100"
                    />
                  </svg>
                </div>

                <img
                  src={loginShield}
                  alt="BioSync Sentinel"
                  draggable={false}
                />
              </div>

              <div className="bs-login-heading">
                <h2 id="bs-login-title">Welcome back</h2>
                <p>Sign in to your BioSync Sentinel account.</p>
              </div>

              <form
                className="bs-login-form"
                onSubmit={handleLogin}
                aria-busy={loading}
              >
                <div className="bs-login-field">
                  <label htmlFor="login-email">Email address</label>

                  <div className="bs-login-input">
                    <Mail size={19} aria-hidden="true" />

                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      value={email}
                      placeholder="Enter your email"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      disabled={loading}
                      required
                      onChange={(event) => {
                        setEmail(event.target.value);
                        if (error) setError("");
                      }}
                    />
                  </div>
                </div>

                <div className="bs-login-field">
                  <label htmlFor="login-password">Password</label>

                  <div className="bs-login-input">
                    <LockKeyhole size={19} aria-hidden="true" />

                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      disabled={loading}
                      required
                      onChange={(event) => {
                        setPassword(event.target.value);
                        if (error) setError("");
                      }}
                    />

                    <button
                      type="button"
                      className="bs-password-toggle"
                      disabled={loading}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? (
                        <EyeOff size={19} />
                      ) : (
                        <Eye size={19} />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bs-login-error" role="alert">
                    <AlertCircle size={17} aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  className="bs-login-submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span
                        className="bs-login-spinner"
                        aria-hidden="true"
                      />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight size={19} aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>

              <div className="bs-login-access">
                <span className="bs-access-line" aria-hidden="true" />
                <div>
                  <LockKeyhole size={15} aria-hidden="true" />
                  <span>Role-based access</span>
                </div>
                <span className="bs-access-line" aria-hidden="true" />
              </div>
            </div>
          </section>
        </div>
      </main>

      <footer className="bs-login-footer">
        © {new Date().getFullYear()} BioSync Sentinel
      </footer>
    </div>
  );
}