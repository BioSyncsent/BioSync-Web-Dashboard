import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import {
  sendPasswordResetEmail,
} from "firebase/auth";

import toast, {
  Toaster,
} from "react-hot-toast";

import {
  Bell,
  Building2,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  Fingerprint,
  GraduationCap,
  IdCard,
  KeyRound,
  LockKeyhole,
  Mail,
  Phone,
  ScanFace,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  useAuth,
} from "../../contexts/AuthContext";

import {
  auth,
  db,
} from "../../firebase/firebase";

import "./AccountCenter.css";

/* =========================================================
   HELPERS
========================================================= */

function capitalize(text) {
  const value =
    String(text || "")
      .trim();

  if (!value) {
    return "N/A";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}

function getInitials(name) {
  const cleanName =
    String(name || "Teacher")
      .trim();

  return cleanName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) =>
      part.charAt(0)
    )
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
      typeof value?.toDate ===
      "function"
        ? value.toDate()
        : value instanceof Date
          ? value
          : new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Not available";
    }

    return date.toLocaleDateString(
      "en-MY",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  } catch {
    return "Not available";
  }
}

function normalizeStatus(value) {
  if (value === true) {
    return "enrolled";
  }

  if (
    value === false ||
    value === null ||
    value === undefined
  ) {
    return "pending";
  }

  if (
    typeof value === "object"
  ) {
    return normalizeStatus(
      value.status ??
        value.enrollmentStatus ??
        value.registered ??
        value.enrolled
    );
  }

  const clean =
    String(value)
      .trim()
      .toLowerCase();

  if (
    [
      "enrolled",
      "registered",
      "ready",
      "complete",
      "completed",
      "active",
    ].includes(clean)
  ) {
    return "enrolled";
  }

  return "pending";
}

function getBiometricStatus(
  profile,
  type
) {
  if (!profile) {
    return "pending";
  }

  const candidates = [
    profile?.[type],
    profile?.[`${type}Status`],
    profile?.[
      `${type}EnrollmentStatus`
    ],
    profile?.biometrics?.[type],
    profile?.authentication?.[type],
  ];

  for (
    const candidate of candidates
  ) {
    if (
      candidate !== undefined
    ) {
      return normalizeStatus(
        candidate
      );
    }
  }

  return "pending";
}

function statusLabel(status) {
  return status === "enrolled"
    ? "Enrolled"
    : "Pending";
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
        <strong>
          {label}
        </strong>

        <span>
          {description}
        </span>
      </div>

      <label className="ac-toggle">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) =>
            onChange(
              event.target.checked
            )
          }
        />

        <span className="ac-toggle-slider" />
      </label>
    </div>
  );
}

/* =========================================================
   BIOMETRIC
========================================================= */

function BiometricRow({
  icon: Icon,
  title,
  description,
  status,
  tone,
}) {
  const enrolled =
    status === "enrolled";

  return (
    <div className="ac-biometric-item">
      <div
        className={`ac-biometric-visual ${tone}`}
      >
        <Icon size={23} />
      </div>

      <div className="ac-biometric-copy">
        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>
      </div>

      <span
        className={`ac-biometric-status ${
          enrolled
            ? "registered"
            : "not-registered"
        }`}
      >
        {statusLabel(status)}
      </span>
    </div>
  );
}

/* =========================================================
   TEACHER ACCOUNT CENTER
========================================================= */

function AccountCenter() {
  const {
    user,
  } = useAuth();

  const [
    authProfile,
    setAuthProfile,
  ] = useState(null);

  const [
    authProfileLoading,
    setAuthProfileLoading,
  ] = useState(true);

  const [
    passwordLoading,
    setPasswordLoading,
  ] = useState(false);

  const [
    preferences,
    setPreferences,
  ] = useState({
    disputeAlerts: true,
    attendanceAlerts: true,
    studentAlerts: true,
    emailAlerts: false,
  });

  const fullName =
    user?.fullName ||
    [
      user?.firstName,
      user?.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Teacher";

  const initials =
    useMemo(
      () =>
        getInitials(
          fullName
        ),
      [fullName]
    );

  const teacherId =
    user?.teacherId ||
    user?.teacherID ||
    user?.staffId ||
    user?.staffID ||
    user?.idNumber ||
    "Not available";

  const role =
    capitalize(
      user?.role ||
        "teacher"
    );

  const isActive =
    user?.active !== false;

  const storageKey =
    useMemo(
      () =>
        user?.uid
          ? `biosync:teacher-account-preferences:${user.uid}`
          : "",
      [user?.uid]
    );

  /* =======================================================
     AUTH PROFILE
  ======================================================= */

  useEffect(() => {
    if (!user?.uid) {
      setAuthProfile(null);
      setAuthProfileLoading(false);

      return undefined;
    }

    setAuthProfileLoading(true);

    const profileRef =
      doc(
        db,
        "authProfile",
        user.uid
      );

    const unsubscribe =
      onSnapshot(
        profileRef,

        (snapshot) => {
          if (
            snapshot.exists()
          ) {
            setAuthProfile({
              id: snapshot.id,
              ...snapshot.data(),
            });
          } else {
            setAuthProfile(null);
          }

          setAuthProfileLoading(
            false
          );
        },

        (error) => {
          console.error(
            "Unable to load teacher auth profile:",
            error
          );

          setAuthProfile(null);
          setAuthProfileLoading(
            false
          );
        }
      );

    return unsubscribe;
  }, [user?.uid]);

  const rfidStatus =
    getBiometricStatus(
      authProfile,
      "rfid"
    );

  const faceStatus =
    getBiometricStatus(
      authProfile,
      "face"
    );

  const fingerprintStatus =
    getBiometricStatus(
      authProfile,
      "fingerprint"
    );

  /* =======================================================
     PREFERENCES
  ======================================================= */

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    try {
      const saved =
        localStorage.getItem(
          storageKey
        );

      if (!saved) {
        return;
      }

      setPreferences(
        (current) => ({
          ...current,
          ...JSON.parse(saved),
        })
      );
    } catch (error) {
      console.error(
        "Unable to load teacher preferences:",
        error
      );
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) {
      return;
    }

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(
          preferences
        )
      );
    } catch (error) {
      console.error(
        "Unable to save teacher preferences:",
        error
      );
    }
  }, [
    preferences,
    storageKey,
  ]);

  function updatePreference(
    key,
    value
  ) {
    setPreferences(
      (current) => ({
        ...current,
        [key]: value,
      })
    );

    toast.success(
      "Preference updated"
    );
  }

  /* =======================================================
     PASSWORD
  ======================================================= */

  async function handleChangePassword() {
    const email =
      user?.email ||
      auth.currentUser?.email;

    if (!email) {
      toast.error(
        "No email address is connected to this account."
      );

      return;
    }

    try {
      setPasswordLoading(true);

      await sendPasswordResetEmail(
        auth,
        email
      );

      toast.success(
        "Password reset email sent."
      );
    } catch (error) {
      console.error(
        "Password reset error:",
        error
      );

      toast.error(
        "Unable to send password reset email."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  /* =======================================================
     COPY UID
  ======================================================= */

  async function handleCopyUid() {
    if (!user?.uid) {
      toast.error(
        "Account ID unavailable"
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

  return (
    <div className="teacher-account-center-page account-center-page">
      <Toaster position="top-right" />

      {/* ===================================================
          HERO
      =================================================== */}

      <section className="ac-command-hero">
        <div className="ac-command-grid" />

        <div className="ac-command-copy">
          <div className="ac-eyebrow">
            <ShieldCheck size={14} />

            Teacher Identity Center
          </div>

          <h1>
            Account Center
          </h1>

          <p>
            Review your teacher profile,
            department access, BioSync
            authentication enrollment,
            account security and notification
            preferences.
          </p>

          <div className="ac-command-meta">
            <span>
              <GraduationCap size={13} />
              Teacher Account
            </span>

            <span>
              <Building2 size={13} />
              {user?.department ||
                "Department not assigned"}
            </span>

            <span>
              <ShieldCheck size={13} />
              Role Protected
            </span>
          </div>
        </div>

        <div className="ac-command-status">
          <div
            className={`ac-security-orb ${
              isActive
                ? "is-active"
                : "is-inactive"
            }`}
          >
            <ShieldCheck size={30} />
          </div>

          <strong>
            {isActive
              ? "Account Active"
              : "Account Inactive"}
          </strong>

          <span>
            BioSync access status
          </span>
        </div>
      </section>

      {/* ===================================================
          PROFILE
      =================================================== */}

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
            <h2>
              {fullName}
            </h2>

            <span className="ac-role-badge">
              <GraduationCap
                size={13}
              />

              {role}
            </span>
          </div>

          <p className="ac-profile-email">
            <Mail size={14} />

            {user?.email ||
              "Email not available"}
          </p>

          <p className="ac-profile-description">
            Authorized BioSync teacher account
            for reviewing department attendance,
            student disputes and attendance
            analytics.
          </p>
        </div>

        <div className="ac-profile-actions">
          <button
            type="button"
            className="ac-button ac-button-primary"
            onClick={
              handleChangePassword
            }
            disabled={
              passwordLoading
            }
          >
            <KeyRound size={15} />

            {passwordLoading
              ? "Sending..."
              : "Change Password"}
          </button>
        </div>
      </section>

      {/* ===================================================
          MAIN
      =================================================== */}

      <div className="ac-main-grid">

        {/* LEFT */}

        <div className="ac-column">

          {/* INFORMATION */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <UserRound size={18} />
              </div>

              <div>
                <span>
                  Identity
                </span>

                <h3>
                  Personal Information
                </h3>

                <p>
                  Information registered to
                  your BioSync teacher profile.
                </p>
              </div>
            </div>

            <div className="ac-info-grid">
              <div className="ac-info-item">
                <UserRound size={16} />

                <div>
                  <span>
                    Full Name
                  </span>

                  <strong>
                    {fullName}
                  </strong>
                </div>
              </div>

              <div className="ac-info-item">
                <IdCard size={16} />

                <div>
                  <span>
                    Teacher ID
                  </span>

                  <strong>
                    {teacherId}
                  </strong>
                </div>
              </div>

              <div className="ac-info-item">
                <Mail size={16} />

                <div>
                  <span>
                    Email
                  </span>

                  <strong>
                    {user?.email ||
                      "Not available"}
                  </strong>
                </div>
              </div>

              <div className="ac-info-item">
                <Phone size={16} />

                <div>
                  <span>
                    Phone
                  </span>

                  <strong>
                    {user?.phoneNum ||
                      user?.phone ||
                      "Not available"}
                  </strong>
                </div>
              </div>

              <div className="ac-info-item">
                <Building2 size={16} />

                <div>
                  <span>
                    Department
                  </span>

                  <strong>
                    {user?.department ||
                      "Not available"}
                  </strong>
                </div>
              </div>

              <div className="ac-info-item">
                <CalendarDays size={16} />

                <div>
                  <span>
                    Member Since
                  </span>

                  <strong>
                    {formatDate(
                      user?.createdAt
                    )}
                  </strong>
                </div>
              </div>
            </div>

            <div className="ac-security-note">
              <ShieldCheck size={15} />

              Teacher identity, role and
              department information are managed
              by an administrator.
            </div>
          </section>

          {/* SECURITY */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <LockKeyhole size={18} />
              </div>

              <div>
                <span>
                  Security
                </span>

                <h3>
                  Login & Security
                </h3>

                <p>
                  Manage account password and
                  login security.
                </p>
              </div>
            </div>

            <div className="ac-security-list">
              <div className="ac-security-row">
                <div className="ac-security-left">
                  <div className="ac-security-icon">
                    <KeyRound size={16} />
                  </div>

                  <div>
                    <strong>
                      Account Password
                    </strong>

                    <span>
                      Send a Firebase password
                      reset email.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="ac-small-button"
                  onClick={
                    handleChangePassword
                  }
                  disabled={
                    passwordLoading
                  }
                >
                  {passwordLoading
                    ? "Sending..."
                    : "Update"}
                </button>
              </div>

              <div className="ac-security-row">
                <div className="ac-security-left">
                  <div className="ac-security-icon">
                    <ShieldCheck
                      size={16}
                    />
                  </div>

                  <div>
                    <strong>
                      Firebase Session
                    </strong>

                    <span>
                      Current dashboard session
                      is authenticated.
                    </span>
                  </div>
                </div>

                <span className="ac-success-chip">
                  <CheckCircle2
                    size={12}
                  />

                  Secured
                </span>
              </div>
            </div>
          </section>

          {/* PREFERENCES */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <Bell size={18} />
              </div>

              <div>
                <span>
                  Preferences
                </span>

                <h3>
                  Notifications
                </h3>

                <p>
                  Configure teacher account
                  notification preferences.
                </p>
              </div>
            </div>

            <div className="ac-preferences-list">
              <PreferenceToggle
                label="Student Disputes"
                description="Receive notifications for new department attendance disputes."
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
                label="Attendance Alerts"
                description="Show notifications related to department attendance activity."
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
                label="Student Alerts"
                description="Receive relevant student account and attendance notifications."
                checked={
                  preferences.studentAlerts
                }
                onChange={(value) =>
                  updatePreference(
                    "studentAlerts",
                    value
                  )
                }
              />

              <PreferenceToggle
                label="Email Notifications"
                description="Allow email notifications when supported."
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

        {/* RIGHT */}

        <div className="ac-column">

          {/* ACCOUNT */}

          <section className="ac-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <GraduationCap
                  size={18}
                />
              </div>

              <div>
                <span>
                  Access
                </span>

                <h3>
                  Teacher Account
                </h3>

                <p>
                  Role and department access
                  information.
                </p>
              </div>
            </div>

            <div className="ac-account-list">
              <div className="ac-account-row">
                <span>
                  Teacher ID
                </span>

                <strong>
                  {teacherId}
                </strong>
              </div>

              <div className="ac-account-row">
                <span>
                  Department
                </span>

                <strong>
                  {user?.department ||
                    "Not available"}
                </strong>
              </div>

              <div className="ac-account-row">
                <span>
                  Role
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
                  onClick={
                    handleCopyUid
                  }
                  disabled={
                    !user?.uid
                  }
                >
                  <Copy size={14} />

                  Copy
                </button>
              </div>
            </div>
          </section>

          {/* BIOMETRICS */}

          <section className="ac-card ac-biometric-card">
            <div className="ac-card-header">
              <div className="ac-card-icon">
                <Fingerprint
                  size={18}
                />
              </div>

              <div>
                <span>
                  BioSync Identity
                </span>

                <h3>
                  Authentication Methods
                </h3>

                <p>
                  Biometric enrollment status
                  from your authentication
                  profile.
                </p>
              </div>
            </div>

            {authProfileLoading ? (
              <div className="ac-loading-text">
                Loading authentication status...
              </div>
            ) : (
              <div className="ac-biometric-grid">
                <BiometricRow
                  icon={CreditCard}
                  title="RFID Card"
                  description="Identity claim used at BioSync terminals."
                  status={
                    rfidStatus
                  }
                  tone="ac-rfid"
                />

                <BiometricRow
                  icon={ScanFace}
                  title="Face Recognition"
                  description="Biometric face template for identity verification."
                  status={
                    faceStatus
                  }
                  tone="ac-face"
                />

                <BiometricRow
                  icon={Fingerprint}
                  title="Fingerprint"
                  description="Fallback biometric verification method."
                  status={
                    fingerprintStatus
                  }
                  tone="ac-fingerprint"
                />
              </div>
            )}

            <div className="ac-security-note">
              <ShieldCheck size={15} />

              Authentication enrollment can
              only be modified using an
              authorized BioSync enrollment
              terminal.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default AccountCenter;