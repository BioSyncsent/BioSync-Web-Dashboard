import {
  useEffect,
  useMemo,
  useState,
} from "react";

import toast, { Toaster } from "react-hot-toast";

import {
  Bell,
  Building2,
  CheckCircle2,
  Copy,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Mail,
  MonitorSmartphone,
  Phone,
  ScanFace,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

import "./AccountCenter.css";

/* =========================================================
   HELPERS
========================================================= */

function capitalize(text) {
  const value = String(text || "").trim();

  if (!value) {
    return "N/A";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getInitials(name) {
  const cleanName = String(name || "Admin").trim();

  return cleanName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  try {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
        : value instanceof Date
          ? value
          : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Not available";
    }

    return date.toLocaleDateString("en-MY", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "Not available";
  }
}

function hasFaceBiometric(user) {
  return Boolean(
    user?.faceRegistered ||
      user?.faceTemplate ||
      user?.faceEncoding ||
      user?.biometrics?.face ||
      user?.biometric?.face
  );
}

function hasFingerprintBiometric(user) {
  return Boolean(
    user?.fingerprintRegistered ||
      user?.fingerprintTemplate ||
      user?.fingerprintEncoding ||
      user?.biometrics?.fingerprint ||
      user?.biometric?.fingerprint
  );
}

/* =========================================================
   PREFERENCE TOGGLE
========================================================= */

function PreferenceToggle({
  checked,
  onChange,
  label,
  description,
}) {
  return (
    <div className="ac-preference-row">
      <div className="ac-preference-copy">
        <span className="ac-preference-label">
          {label}
        </span>

        <span className="ac-preference-description">
          {description}
        </span>
      </div>

      <label className="ac-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(event.target.checked)
          }
        />

        <span className="ac-toggle-slider" />
      </label>
    </div>
  );
}

/* =========================================================
   ACCOUNT CENTER
========================================================= */

function AccountCenter() {
  const { user } = useAuth();

  const [preferences, setPreferences] = useState({
    disputeAlerts: true,
    deviceAlerts: true,
    attendanceAlerts: true,
    emailAlerts: false,
  });

  const fullName =
    user?.fullName ||
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ") ||
    "Administrator";

  const initials = useMemo(
    () => getInitials(fullName),
    [fullName]
  );

  const role = capitalize(user?.role || "admin");

  const isActive = user?.active !== false;

  const faceRegistered =
    hasFaceBiometric(user);

  const fingerprintRegistered =
    hasFingerprintBiometric(user);

  const preferenceStorageKey = useMemo(
    () =>
      user?.uid
        ? `biosync:account-center-preferences:${user.uid}`
        : "",
    [user?.uid]
  );

  /* =========================================================
     LOAD LOCAL PREFERENCES
  ========================================================= */

  useEffect(() => {
    if (!preferenceStorageKey) {
      return;
    }

    try {
      const stored =
        localStorage.getItem(
          preferenceStorageKey
        );

      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);

      setPreferences((current) => ({
        ...current,
        ...parsed,
      }));
    } catch (error) {
      console.error(
        "Unable to load Account Center preferences:",
        error
      );
    }
  }, [preferenceStorageKey]);

  /* =========================================================
     SAVE LOCAL PREFERENCES
  ========================================================= */

  useEffect(() => {
    if (!preferenceStorageKey) {
      return;
    }

    try {
      localStorage.setItem(
        preferenceStorageKey,
        JSON.stringify(preferences)
      );
    } catch (error) {
      console.error(
        "Unable to save Account Center preferences:",
        error
      );
    }
  }, [
    preferences,
    preferenceStorageKey,
  ]);

  /* =========================================================
     ACTIONS
  ========================================================= */

  function updatePreference(key, value) {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

    toast.success(
      "Preference updated"
    );
  }

  async function handleCopyUid() {
    if (!user?.uid) {
      toast.error(
        "Account ID is not available"
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(
        user.uid
      );

      toast.success(
        "Account ID copied"
      );
    } catch {
      toast.error(
        "Unable to copy Account ID"
      );
    }
  }

  function handleEditProfile() {
    toast(
      "Profile editing will be connected to your Firebase user update flow."
    );
  }

  function handleChangePassword() {
    toast(
      "Password management will be connected to Firebase Authentication."
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="account-center-page">
      <Toaster position="top-right" />

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}

      <section className="ac-page-heading">
        <div>
          <div className="ac-eyebrow">
            <ShieldCheck size={15} />

            Administrator Account
          </div>

          <h1>Account Center</h1>

          <p>
            Manage your administrator
            profile, security settings,
            authentication information
            and personal preferences.
          </p>
        </div>

        <div
          className={`ac-account-status ${
            isActive
              ? "is-active"
              : "is-inactive"
          }`}
        >
          <span className="ac-status-dot" />

          {isActive
            ? "Account Active"
            : "Account Inactive"}
        </div>
      </section>

      {/* =====================================================
          PROFILE HERO
      ====================================================== */}

      <section className="ac-profile-hero">
        <div className="ac-profile-avatar-wrap">
          <div className="ac-profile-avatar">
            {initials}
          </div>

          <span
            className={`ac-avatar-status ${
              isActive
                ? "is-active"
                : "is-inactive"
            }`}
          />
        </div>

        <div className="ac-profile-details">
          <div className="ac-profile-topline">
            <h2>{fullName}</h2>

            <span className="ac-role-badge">
              <ShieldCheck size={13} />

              {role}
            </span>
          </div>

          <p className="ac-profile-email">
            <Mail size={15} />

            {user?.email ||
              "Email not available"}
          </p>

          <p className="ac-profile-description">
            BioSync Sentinel administrator
            account with access to attendance,
            dispute, device and system
            monitoring features.
          </p>
        </div>

        <div className="ac-profile-actions">
          <button
            type="button"
            className="ac-button ac-button-primary"
            onClick={handleEditProfile}
          >
            <UserRound size={16} />

            Edit Profile
          </button>

          <button
            type="button"
            className="ac-button ac-button-secondary"
            onClick={handleChangePassword}
          >
            <KeyRound size={16} />

            Change Password
          </button>
        </div>
      </section>

      {/* =====================================================
          MAIN GRID
      ====================================================== */}

      <div className="ac-main-grid">
        {/* LEFT SIDE */}

        <div className="ac-column">
          {/* PERSONAL INFORMATION */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <UserRound size={18} />
              </div>

              <div>
                <h3>
                  Personal Information
                </h3>

                <p>
                  Administrator profile
                  information stored with
                  your account.
                </p>
              </div>
            </div>

            <div className="ac-info-grid">
              <div className="ac-info-item">
                <div className="ac-info-icon">
                  <UserRound size={16} />
                </div>

                <div>
                  <span className="ac-info-label">
                    Full Name
                  </span>

                  <strong>
                    {fullName}
                  </strong>
                </div>
              </div>

              <div className="ac-info-item">
                <div className="ac-info-icon">
                  <Mail size={16} />
                </div>

                <div>
                  <span className="ac-info-label">
                    Email Address
                  </span>

                  <strong>
                    {user?.email ||
                      "Not available"}
                  </strong>
                </div>
              </div>

              <div className="ac-info-item">
                <div className="ac-info-icon">
                  <Phone size={16} />
                </div>

                <div>
                  <span className="ac-info-label">
                    Phone Number
                  </span>

                  <strong>
                    {user?.phoneNum ||
                      user?.phone ||
                      "Not available"}
                  </strong>
                </div>
              </div>

              <div className="ac-info-item">
                <div className="ac-info-icon">
                  <Building2 size={16} />
                </div>

                <div>
                  <span className="ac-info-label">
                    Department
                  </span>

                  <strong>
                    {user?.department ||
                      "Not available"}
                  </strong>
                </div>
              </div>
            </div>
          </section>

          {/* SECURITY */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <LockKeyhole size={18} />
              </div>

              <div>
                <h3>
                  Security & Login
                </h3>

                <p>
                  Review account access and
                  login security options.
                </p>
              </div>
            </div>

            <div className="ac-security-list">
              <div className="ac-security-row">
                <div className="ac-security-left">
                  <div className="ac-security-icon">
                    <KeyRound size={17} />
                  </div>

                  <div>
                    <strong>
                      Account Password
                    </strong>

                    <span>
                      Manage your Firebase
                      Authentication password.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="ac-small-button"
                  onClick={
                    handleChangePassword
                  }
                >
                  Update
                </button>
              </div>

              <div className="ac-security-row">
                <div className="ac-security-left">
                  <div className="ac-security-icon">
                    <ShieldCheck size={17} />
                  </div>

                  <div>
                    <strong>
                      Authentication Status
                    </strong>

                    <span>
                      Current account session
                      is authenticated.
                    </span>
                  </div>
                </div>

                <span className="ac-success-chip">
                  <CheckCircle2 size={13} />

                  Secured
                </span>
              </div>

              <div className="ac-security-row">
                <div className="ac-security-left">
                  <div className="ac-security-icon">
                    <MonitorSmartphone
                      size={17}
                    />
                  </div>

                  <div>
                    <strong>
                      Current Session
                    </strong>

                    <span>
                      BioSync Sentinel web
                      dashboard session.
                    </span>
                  </div>
                </div>

                <span className="ac-neutral-chip">
                  Active
                </span>
              </div>
            </div>
          </section>

          {/* NOTIFICATION PREFERENCES */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <Bell size={18} />
              </div>

              <div>
                <h3>
                  Notification Preferences
                </h3>

                <p>
                  Choose which BioSync events
                  should receive your
                  attention.
                </p>
              </div>
            </div>

            <div className="ac-preferences-list">
              <PreferenceToggle
                label="Dispute Alerts"
                description="Show alerts when students submit new attendance disputes."
                checked={
                  preferences.disputeAlerts
                }
                onChange={(value) =>
                  updatePreference(
                    "disputeAlerts",
                    value
                  )
                }
              />

              <PreferenceToggle
                label="Device Alerts"
                description="Receive important warnings about registered biometric terminals."
                checked={
                  preferences.deviceAlerts
                }
                onChange={(value) =>
                  updatePreference(
                    "deviceAlerts",
                    value
                  )
                }
              />

              <PreferenceToggle
                label="Attendance Alerts"
                description="Enable notifications for important attendance activity."
                checked={
                  preferences.attendanceAlerts
                }
                onChange={(value) =>
                  updatePreference(
                    "attendanceAlerts",
                    value
                  )
                }
              />

              <PreferenceToggle
                label="Email Notifications"
                description="Allow email-based account notifications when supported."
                checked={
                  preferences.emailAlerts
                }
                onChange={(value) =>
                  updatePreference(
                    "emailAlerts",
                    value
                  )
                }
              />
            </div>
          </section>
        </div>

        {/* RIGHT SIDE */}

        <div className="ac-column">
          {/* ACCOUNT ACCESS */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <ShieldCheck size={18} />
              </div>

              <div>
                <h3>
                  Account & Access
                </h3>

                <p>
                  Identity and access details
                  for this administrator.
                </p>
              </div>
            </div>

            <div className="ac-account-list">
              <div className="ac-account-row">
                <span>
                  Account Role
                </span>

                <strong>
                  {role}
                </strong>
              </div>

              <div className="ac-account-row">
                <span>
                  Account Status
                </span>

                <strong
                  className={
                    isActive
                      ? "ac-text-success"
                      : "ac-text-danger"
                  }
                >
                  {isActive
                    ? "Active"
                    : "Inactive"}
                </strong>
              </div>

              <div className="ac-account-row">
                <span>
                  Member Since
                </span>

                <strong>
                  {formatDate(
                    user?.createdAt
                  )}
                </strong>
              </div>

              <div className="ac-account-id-block">
                <div>
                  <span>
                    Firebase Account ID
                  </span>

                  <code>
                    {user?.uid ||
                      "Not available"}
                  </code>
                </div>

                <button
                  type="button"
                  className="ac-copy-button"
                  onClick={handleCopyUid}
                  disabled={!user?.uid}
                  title="Copy Account ID"
                >
                  <Copy size={15} />

                  Copy
                </button>
              </div>
            </div>
          </section>

          {/* BIOMETRICS */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <Fingerprint size={18} />
              </div>

              <div>
                <h3>
                  Biometric Authentication
                </h3>

                <p>
                  Registration status detected
                  from your current account
                  information.
                </p>
              </div>
            </div>

            <div className="ac-biometric-grid">
              <div className="ac-biometric-item">
                <div className="ac-biometric-visual ac-face">
                  <ScanFace size={27} />
                </div>

                <div className="ac-biometric-copy">
                  <strong>
                    Face Recognition
                  </strong>

                  <span>
                    Facial biometric template
                  </span>
                </div>

                <span
                  className={`ac-biometric-status ${
                    faceRegistered
                      ? "registered"
                      : "not-registered"
                  }`}
                >
                  {faceRegistered
                    ? "Registered"
                    : "Not configured"}
                </span>
              </div>

              <div className="ac-biometric-item">
                <div className="ac-biometric-visual ac-fingerprint">
                  <Fingerprint size={27} />
                </div>

                <div className="ac-biometric-copy">
                  <strong>
                    Fingerprint
                  </strong>

                  <span>
                    Fingerprint biometric
                    template
                  </span>
                </div>

                <span
                  className={`ac-biometric-status ${
                    fingerprintRegistered
                      ? "registered"
                      : "not-registered"
                  }`}
                >
                  {fingerprintRegistered
                    ? "Registered"
                    : "Not configured"}
                </span>
              </div>
            </div>

            <div className="ac-biometric-note">
              <ShieldCheck size={16} />

              <span>
                Biometric enrollment should
                continue to be performed
                through your authorized
                BioSync enrollment terminal.
              </span>
            </div>
          </section>

          {/* INTERFACE */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <SlidersHorizontal
                  size={18}
                />
              </div>

              <div>
                <h3>
                  Interface Preferences
                </h3>

                <p>
                  Current dashboard display
                  configuration.
                </p>
              </div>
            </div>

            <div className="ac-interface-list">
              <div className="ac-interface-row">
                <div>
                  <span>
                    Dashboard Experience
                  </span>

                  <small>
                    BioSecure Enterprise
                  </small>
                </div>

                <strong>
                  Standard
                </strong>
              </div>

              <div className="ac-interface-row">
                <div>
                  <span>
                    Date Format
                  </span>

                  <small>
                    Malaysian regional
                    formatting
                  </small>
                </div>

                <strong>
                  DD/MM/YYYY
                </strong>
              </div>

              <div className="ac-interface-row">
                <div>
                  <span>
                    Default Admin Page
                  </span>

                  <small>
                    Page displayed after admin
                    navigation
                  </small>
                </div>

                <strong>
                  Dashboard
                </strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* =====================================================
          SECURITY FOOTER
      ====================================================== */}

      <section className="ac-security-footer">
        <div className="ac-security-footer-icon">
          <ShieldCheck size={22} />
        </div>

        <div>
          <strong>
            BioSync Sentinel Account Security
          </strong>

          <p>
            Your account is protected through
            BioSync role-based access controls.
            Keep administrator credentials
            private and use authorized
            biometric terminals for biometric
            enrollment.
          </p>
        </div>
      </section>
    </div>
  );
}

export default AccountCenter;