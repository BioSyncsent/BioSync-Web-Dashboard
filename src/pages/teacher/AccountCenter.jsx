import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import {
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Copy,
  GraduationCap,
  IdCard,
  KeyRound,
  LoaderCircle,
  LogIn,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { auth, db } from "../../firebase/firebase";
import "./AccountCenter.css";

const TIME_ZONE = "Asia/Kuala_Lumpur";

function formatDate(value, includeTime = false) {
  if (!value) return "Not available";

  try {
    const date =
      typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (Number.isNaN(date.getTime())) return "Not available";

    return new Intl.DateTimeFormat("en-MY", {
      timeZone: TIME_ZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      ...(includeTime
        ? { hour: "2-digit", minute: "2-digit" }
        : {}),
    }).format(date);
  } catch {
    return "Not available";
  }
}

function initials(name) {
  return String(name || "Teacher")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function readAuthDetails(currentUser) {
  if (!currentUser) return null;

  return {
    uid: currentUser.uid,
    email: currentUser.email || "",
    emailVerified: currentUser.emailVerified,
    createdAt: currentUser.metadata?.creationTime,
    lastSignIn: currentUser.metadata?.lastSignInTime,
    passwordEnabled: currentUser.providerData.some(
      (provider) => provider.providerId === "password"
    ),
  };
}

function actionError(error) {
  switch (error?.code) {
    case "auth/too-many-requests":
      return "Too many requests. Please try again later.";
    case "auth/network-request-failed":
      return "Unable to connect. Check your internet connection.";
    case "auth/requires-recent-login":
      return "Please sign in again before continuing.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    default:
      return "Unable to complete this action. Please try again.";
  }
}

function SectionHeading({ icon: Icon, label, title, description }) {
  return (
    <div className="ac-section-heading">
      <span className="ac-section-icon">
        <Icon size={20} aria-hidden="true" />
      </span>

      <div>
        <span className="ac-section-label">{label}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}

function InformationItem({ icon: Icon, label, value }) {
  return (
    <div className="ac-information-item">
      <Icon size={17} aria-hidden="true" />
      <div>
        <span>{label}</span>
        <strong>{value || "Not available"}</strong>
      </div>
    </div>
  );
}

export default function AccountCenter() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [profileState, setProfileState] = useState({
    uid: null,
    data: null,
    loading: true,
    error: "",
    cached: true,
    missing: false,
  });
  const [authDetails, setAuthDetails] = useState(null);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState(null);
  const [copied, setCopied] = useState(false);

  const actionLock = useRef(false);
  const currentUid = useRef(uid);
  currentUid.current = uid;

  useEffect(() => {
    return onAuthStateChanged(auth, (currentUser) => {
      setAuthDetails(readAuthDetails(currentUser));
    });
  }, []);

  useEffect(() => {
    setMessage(null);
    setCopied(false);

    if (!uid) {
      setProfileState({
        uid: null,
        data: null,
        loading: false,
        error: "",
        cached: true,
        missing: false,
      });
      return;
    }

    setProfileState({
      uid,
      data: null,
      loading: true,
      error: "",
      cached: true,
      missing: false,
    });

    return onSnapshot(
      doc(db, "users", uid),
      { includeMetadataChanges: true },
      (snapshot) => {
        setProfileState({
          uid,
          data: snapshot.exists() ? snapshot.data() : null,
          loading: false,
          error: "",
          cached: snapshot.metadata.fromCache,
          missing: !snapshot.exists(),
        });
      },
      (error) => {
        setProfileState({
          uid,
          data: null,
          loading: false,
          error:
            error.code === "permission-denied"
              ? "Your account does not have permission to load this profile."
              : "Unable to load your account profile. Please try again.",
          cached: true,
          missing: false,
        });
      }
    );
  }, [uid, retry]);

  const matchingProfile = profileState.uid === uid;
  const loading = Boolean(uid) && (!matchingProfile || profileState.loading);
  const profile = matchingProfile ? profileState.data : null;
  const profileError = matchingProfile ? profileState.error : "";

  // Context provides a display fallback while the profile loads.
  const displayProfile = profile || user || {};
  const session =
    authDetails?.uid === uid ? authDetails : null;

  const fullName =
    displayProfile.fullName ||
    [displayProfile.firstName, displayProfile.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Teacher";

  const email = session?.email || displayProfile.email || "";
  const department = displayProfile.department || "";

  const teacherId =
    displayProfile.teacherId ||
    displayProfile.teacherID ||
    displayProfile.staffId ||
    displayProfile.staffID ||
    displayProfile.idNumber ||
    "";

  // Only confirmed profile values determine the account status.
  const accountStatus =
    profile?.active === true
      ? "Active"
      : profile?.active === false
        ? "Inactive"
        : "Unknown";

  const statusTone =
    accountStatus === "Active"
      ? "success"
      : accountStatus === "Inactive"
        ? "danger"
        : "warning";

  const role =
    displayProfile.role === "teacher"
      ? "Teacher"
      : displayProfile.role
        ? String(displayProfile.role)
        : "Not available";

  const liveLabel = loading
    ? "Loading profile"
    : profileError
      ? "Profile unavailable"
      : profileState.missing
        ? "Profile not found"
        : profileState.cached
          ? "Cached profile"
          : "Profile synced";

  const canUsePassword = Boolean(session?.passwordEnabled);
  const canVerifyEmail = Boolean(session && !session.emailVerified);

  async function performAction(type, callback) {
    if (actionLock.current) return;

    const actionUid = uid;
    const currentUser = auth.currentUser;

    if (!currentUser || currentUser.uid !== actionUid) {
      setMessage({
        type: "error",
        text: "Please sign in again to manage your account.",
      });
      return;
    }

    actionLock.current = true;
    setBusy(type);
    setMessage(null);

    try {
      const result = await callback(currentUser);

      if (currentUid.current === actionUid && result) {
        setMessage({ type: "success", text: result });
      }
    } catch (error) {
      if (currentUid.current === actionUid) {
        setMessage({ type: "error", text: actionError(error) });
      }
    } finally {
      actionLock.current = false;
      setBusy("");
    }
  }

  function resetPassword() {
    return performAction("password", async (currentUser) => {
      const supportsPassword = currentUser.providerData.some(
        (provider) => provider.providerId === "password"
      );

      if (!supportsPassword || !currentUser.email) {
        return "Password reset is unavailable for this sign-in method.";
      }

      await sendPasswordResetEmail(auth, currentUser.email);
      return `Password reset email sent to ${currentUser.email}. Check your inbox or spam folder.`;
    });
  }

  function verifyEmail() {
    return performAction("verification", async (currentUser) => {
      await reload(currentUser);
      setAuthDetails(readAuthDetails(currentUser));

      if (currentUser.emailVerified) {
        return "Your email address is already verified.";
      }

      await sendEmailVerification(currentUser);
      return "Verification email sent. Open the link, then select Refresh status here.";
    });
  }

  function refreshEmailStatus() {
    return performAction("refresh", async (currentUser) => {
      await reload(currentUser);

      if (currentUid.current !== currentUser.uid) return "";

      setAuthDetails(readAuthDetails(currentUser));

      return currentUser.emailVerified
        ? "Your email address is verified."
        : "Your email is still unverified. Open the link in your verification email.";
    });
  }

  async function copyAccountId() {
    if (!uid) return;

    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      setMessage({ type: "success", text: "Account ID copied." });
    } catch {
      setMessage({
        type: "error",
        text: "Unable to copy automatically. You can select and copy the Account ID below.",
      });
    }
  }

  if (!uid) {
    return (
      <main className="teacher-account-center-page">
        <div className="ac-notice ac-notice-warning">
          Please sign in to view your Account Centre.
        </div>
      </main>
    );
  }

  return (
    <main className="teacher-account-center-page">
      <header className="ac-profile-header">
        <div className="ac-header-content">
          <div className="ac-eyebrow">
            <ShieldCheck size={14} aria-hidden="true" />
            BIOSYNC SENTINEL
          </div>

          <h1>Account <span className="ac-title-accent">Centre</span></h1>
          <p className="ac-header-description">
            Your teacher profile, account security and dashboard access.
          </p>

          <div className="ac-profile-summary">
            <div className="ac-avatar" aria-hidden="true">
              {initials(fullName)}
            </div>

            <div className="ac-profile-copy">
              <h2>{fullName}</h2>
              <span>{email || "Email not available"}</span>

              <div className="ac-profile-tags">
                <span className="ac-chip ac-chip-cyan">
                  <GraduationCap size={13} aria-hidden="true" />
                  {role}
                </span>

                <span className="ac-chip ac-chip-neutral">
                  <Building2 size={13} aria-hidden="true" />
                  {department || "Department not assigned"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="ac-header-status">
          <span className={`ac-status-symbol ac-tone-${statusTone}`}>
            <ShieldCheck size={27} aria-hidden="true" />
          </span>

          <span className="ac-status-caption">Account status</span>
          <strong>{loading ? "Loading…" : accountStatus}</strong>

          <span
            className={`ac-sync-label ${
              !loading &&
              !profileError &&
              !profileState.missing &&
              !profileState.cached
                ? "is-live"
                : ""
            }`}
          >
            <span aria-hidden="true" />
            {liveLabel}
          </span>
        </div>
      </header>

      {profileError && (
        <div className="ac-notice ac-notice-error" role="alert">
          <span>{profileError}</span>
          <button
            type="button"
            className="ac-button ac-button-secondary"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw size={15} aria-hidden="true" />
            Retry
          </button>
        </div>
      )}

      {!loading && matchingProfile && profileState.missing && (
        <div className="ac-notice ac-notice-warning" role="status">
          Your profile document was not found. Contact your administrator to
          check your account details.
        </div>
      )}

      {message && (
        <div
          className={`ac-notice ${
            message.type === "error"
              ? "ac-notice-error"
              : "ac-notice-success"
          }`}
          role={message.type === "error" ? "alert" : "status"}
          aria-live="polite"
        >
          <span>{message.text}</span>
          <button
            type="button"
            className="ac-dismiss"
            onClick={() => setMessage(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="ac-layout">
        <div className="ac-column">
          <section className="ac-panel">
            <SectionHeading
              icon={UserRound}
              label="IDENTITY"
              title="Personal Information"
              description="Details registered to your teacher account."
            />

            <div className="ac-information-grid">
              <InformationItem
                icon={UserRound}
                label="Full name"
                value={fullName}
              />
              <InformationItem
                icon={IdCard}
                label="Teacher / staff ID"
                value={teacherId}
              />
              <InformationItem icon={Mail} label="Email" value={email} />
              <InformationItem
                icon={Phone}
                label="Phone"
                value={displayProfile.phoneNum || displayProfile.phone}
              />
              <InformationItem
                icon={Building2}
                label="Department"
                value={department}
              />
              <InformationItem
                icon={CalendarDays}
                label="Member since"
                value={formatDate(
                  displayProfile.createdAt || session?.createdAt
                )}
              />
            </div>

            <div className="ac-panel-note">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                Your profile, role and department are managed by an
                administrator. Contact them if any details need correcting.
              </span>
            </div>
          </section>

          <section className="ac-panel">
            <SectionHeading
              icon={KeyRound}
              label="SECURITY"
              title="Login & Security"
              description="Manage your password and email verification."
            />

            <div className="ac-security-items">
              <div className="ac-security-item">
                <div className="ac-security-copy">
                  <span className="ac-item-icon">
                    <KeyRound size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Password reset</h3>
                    <p>
                      {canUsePassword
                        ? "Receive a link to reset your account password."
                        : "Password reset is unavailable for this sign-in method."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="ac-button ac-button-primary"
                  onClick={resetPassword}
                  disabled={!canUsePassword || Boolean(busy)}
                >
                  {busy === "password" ? (
                    <LoaderCircle
                      size={15}
                      className="ac-spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <Mail size={15} aria-hidden="true" />
                  )}
                  {busy === "password"
                    ? "Sending…"
                    : "Send Password Reset Email"}
                </button>
              </div>

              <div className="ac-security-item">
                <div className="ac-security-copy">
                  <span className="ac-item-icon">
                    <Mail size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Email verification</h3>
                    <p>
                      Confirm ownership of the email linked to your account.
                    </p>
                  </div>
                </div>

                <span
                  className={`ac-chip ${
                    session?.emailVerified
                      ? "ac-chip-success"
                      : "ac-chip-warning"
                  }`}
                >
                  {session?.emailVerified && (
                    <CheckCircle2 size={13} aria-hidden="true" />
                  )}
                  {session
                    ? session.emailVerified
                      ? "Verified"
                      : "Unverified"
                    : "Unknown"}
                </span>
              </div>

              {session && (
                <div className="ac-security-actions">
                  {canVerifyEmail && (
                    <button
                      type="button"
                      className="ac-button ac-button-secondary"
                      disabled={Boolean(busy)}
                      onClick={verifyEmail}
                    >
                      <Mail size={15} aria-hidden="true" />
                      {busy === "verification"
                        ? "Sending…"
                        : "Send Verification Email"}
                    </button>
                  )}

                  <button
                    type="button"
                    className="ac-button ac-button-quiet"
                    disabled={Boolean(busy)}
                    onClick={refreshEmailStatus}
                  >
                    <RefreshCw
                      size={15}
                      className={busy === "refresh" ? "ac-spin" : ""}
                      aria-hidden="true"
                    />
                    Refresh status
                  </button>
                </div>
              )}

              <div className="ac-security-item">
                <div className="ac-security-copy">
                  <span className="ac-item-icon">
                    <LogIn size={18} aria-hidden="true" />
                  </span>
                  <div>
                    <h3>Current session</h3>
                    <p>
                      {session
                        ? "You are signed in to the BioSync dashboard."
                        : "Your sign-in session could not be confirmed."}
                    </p>
                  </div>
                </div>

                <span
                  className={`ac-chip ${
                    session ? "ac-chip-success" : "ac-chip-warning"
                  }`}
                >
                  {session ? "Signed in" : "Unavailable"}
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="ac-column">
          <section className="ac-panel">
            <SectionHeading
              icon={GraduationCap}
              label="TEACHER WORKSPACE"
              title="Your Access"
              description="Open the tools available in your teacher dashboard."
            />

            <div className="ac-access-list">
              <Link to="/teacher/timetable" className="ac-access-link">
                <span className="ac-access-icon">
                  <CalendarDays size={19} aria-hidden="true" />
                </span>
                <div>
                  <strong>Shared Timetable</strong>
                  <span>View the schedule maintained by the administrator.</span>
                </div>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>

              <Link to="/teacher/attendance" className="ac-access-link">
                <span className="ac-access-icon">
                  <ClipboardList size={19} aria-hidden="true" />
                </span>
                <div>
                  <strong>Attendance Records</strong>
                  <span>Review attendance within your permitted department.</span>
                </div>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>

              <Link to="/teacher/disputes" className="ac-access-link">
                <span className="ac-access-icon">
                  <ShieldCheck size={19} aria-hidden="true" />
                </span>
                <div>
                  <strong>Student Disputes</strong>
                  <span>Review attendance correction requests.</span>
                </div>
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>

            {!department && (
              <div className="ac-panel-note ac-note-warning">
                <Building2 size={16} aria-hidden="true" />
                <span>
                  Ask your administrator to assign a department so attendance
                  and dispute access can be configured.
                </span>
              </div>
            )}

            <div className="ac-panel-note">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>
                Timetable editing and user management are handled by the
                administrator. Access follows your account permissions.
              </span>
            </div>
          </section>

          <section className="ac-panel">
            <SectionHeading
              icon={IdCard}
              label="ACCOUNT"
              title="Account Details"
              description="Account history and support information."
            />

            <dl className="ac-account-details">
              <div>
                <dt>Account created</dt>
                <dd>{formatDate(session?.createdAt)}</dd>
              </div>
              <div>
                <dt>Last sign-in</dt>
                <dd>{formatDate(session?.lastSignIn, true)}</dd>
              </div>
              <div>
                <dt>Profile updated</dt>
                <dd>{formatDate(displayProfile.updatedAt, true)}</dd>
              </div>
              <div>
                <dt>Time zone</dt>
                <dd>Malaysia · UTC+8</dd>
              </div>
            </dl>

            <details className="ac-technical-details">
              <summary>
                <span>Account ID for support</span>
                <ChevronDown size={16} aria-hidden="true" />
              </summary>

              <div className="ac-id-content">
                <p>
                  Share this ID with your administrator when reporting an
                  account issue.
                </p>

                <code>{uid}</code>

                <button
                  type="button"
                  className="ac-button ac-button-secondary"
                  onClick={copyAccountId}
                >
                  {copied ? (
                    <CheckCircle2 size={15} aria-hidden="true" />
                  ) : (
                    <Copy size={15} aria-hidden="true" />
                  )}
                  {copied ? "Copied" : "Copy Account ID"}
                </button>
              </div>
            </details>
          </section>
        </div>
      </div>

      <p className="ac-footer-note">
        Account dates and times are displayed in Malaysia time.
      </p>
    </main>
  );
}