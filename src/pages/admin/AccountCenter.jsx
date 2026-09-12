import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  sendPasswordResetEmail,
} from "firebase/auth";

import {
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import toast, {
  Toaster,
} from "react-hot-toast";

import {
  BadgeCheck,
  Bell,
  Building2,
  CheckCircle2,
  Copy,
  Fingerprint,
  KeyRound,
  LockKeyhole,
  Mail,
  Pencil,
  Phone,
  Radio,
  Save,
  ScanFace,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";

import {
  auth,
  db,
} from "../../firebase/firebase";

import {
  useAuth,
} from "../../contexts/AuthContext";

import "./AccountCenter.css";

/* =========================================================
   HELPERS
========================================================= */

function capitalize(value) {
  const text =
    String(
      value || ""
    ).trim();

  if (!text) {
    return "N/A";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}

function getInitials(name) {
  return String(
    name || "Admin"
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (part) =>
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
          : new Date(
              value
            );

    return Number.isNaN(
      date.getTime()
    )
      ? "Not available"
      : date.toLocaleDateString(
          "en-MY",
          {
            day:
              "2-digit",
            month:
              "long",
            year:
              "numeric",
          }
        );
  } catch {
    return "Not available";
  }
}

function normalizeEnrollmentStatus(
  profile,
  type
) {
  const possibleValues =
    [
      profile?.[
        `${type}Status`
      ],

      profile?.[
        type
      ]?.status,

      profile?.biometrics?.[
        type
      ]?.status,

      profile?.[
        `${type}Registered`
      ]
        ? "enrolled"
        : "",
    ]
      .filter(Boolean)
      .map(
        (value) =>
          String(value)
            .toLowerCase()
            .trim()
      );

  if (
    possibleValues.some(
      (value) =>
        [
          "enrolled",
          "registered",
          "complete",
          "completed",
          "active",
        ].includes(
          value
        )
    )
  ) {
    return "enrolled";
  }

  return "pending";
}

/* =========================================================
   COMPONENT
========================================================= */

function AccountCenter() {
  const {
    user,
  } = useAuth();

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    authProfile,
    setAuthProfile,
  ] = useState(null);

  const [
    editOpen,
    setEditOpen,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    form,
    setForm,
  ] = useState({
    firstName: "",
    lastName: "",
    phoneNum: "",
    department: "",
  });

  const [
    preferences,
    setPreferences,
  ] = useState({
    disputeAlerts: true,
    deviceAlerts: true,
    attendanceAlerts: true,
    emailAlerts: false,
  });

  const preferenceKey =
    user?.uid
      ? `biosync:admin-account-preferences:${user.uid}`
      : "";

  /* =======================================================
     LIVE PROFILE
  ======================================================= */

  useEffect(() => {
    if (!user?.uid) {
      return undefined;
    }

    const unsubscribeUser =
      onSnapshot(
        doc(
          db,
          "users",
          user.uid
        ),
        (snapshot) => {
          if (
            snapshot.exists()
          ) {
            setProfile({
              id:
                snapshot.id,

              ...snapshot.data(),
            });
          }
        }
      );

    const unsubscribeAuth =
      onSnapshot(
        doc(
          db,
          "authProfile",
          user.uid
        ),
        (snapshot) => {
          setAuthProfile(
            snapshot.exists()
              ? {
                  id:
                    snapshot.id,

                  ...snapshot.data(),
                }
              : null
          );
        },
        () => {
          setAuthProfile(
            null
          );
        }
      );

    return () => {
      unsubscribeUser();
      unsubscribeAuth();
    };
  }, [
    user?.uid,
  ]);

  /* =======================================================
     PREFERENCES
  ======================================================= */

  useEffect(() => {
    if (!preferenceKey) {
      return;
    }

    try {
      const stored =
        localStorage.getItem(
          preferenceKey
        );

      if (stored) {
        setPreferences(
          (current) => ({
            ...current,
            ...JSON.parse(
              stored
            ),
          })
        );
      }
    } catch {
      // ignore invalid local preference
    }
  }, [
    preferenceKey,
  ]);

  useEffect(() => {
    if (!preferenceKey) {
      return;
    }

    localStorage.setItem(
      preferenceKey,
      JSON.stringify(
        preferences
      )
    );
  }, [
    preferences,
    preferenceKey,
  ]);

  /* =======================================================
     VALUES
  ======================================================= */

  const current =
    profile || user || {};

  const fullName =
    current.fullName ||
    [
      current.firstName,
      current.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Administrator";

  const initials =
    useMemo(
      () =>
        getInitials(
          fullName
        ),
      [
        fullName,
      ]
    );

  const role =
    capitalize(
      current.role ||
        "admin"
    );

  const isActive =
    current.active !== false;

  const rfidStatus =
    normalizeEnrollmentStatus(
      authProfile,
      "rfid"
    );

  const faceStatus =
    normalizeEnrollmentStatus(
      authProfile,
      "face"
    );

  const fingerprintStatus =
    normalizeEnrollmentStatus(
      authProfile,
      "fingerprint"
    );

  const enrolledCount =
    [
      rfidStatus,
      faceStatus,
      fingerprintStatus,
    ].filter(
      (status) =>
        status === "enrolled"
    ).length;

  const securityScore =
    Math.round(
      (
        enrolledCount /
        3
      ) *
        100
    );

  /* =======================================================
     ACTIONS
  ======================================================= */

  function openEdit() {
    setForm({
      firstName:
        current.firstName ||
        "",

      lastName:
        current.lastName ||
        "",

      phoneNum:
        current.phoneNum ||
        current.phone ||
        "",

      department:
        current.department ||
        "",
    });

    setEditOpen(true);
  }

  async function saveProfile(
    event
  ) {
    event.preventDefault();

    if (!user?.uid) {
      return;
    }

    if (
      !form.firstName.trim()
    ) {
      toast.error(
        "First name is required"
      );

      return;
    }

    setSaving(true);

    try {
      await updateDoc(
        doc(
          db,
          "users",
          user.uid
        ),
        {
          firstName:
            form.firstName.trim(),

          lastName:
            form.lastName.trim(),

          phoneNum:
            form.phoneNum.trim(),

          department:
            form.department.trim(),

          updatedAt:
            serverTimestamp(),
        }
      );

      toast.success(
        "Profile updated"
      );

      setEditOpen(false);
    } catch (error) {
      console.error(
        error
      );

      toast.error(
        "Unable to update profile"
      );
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword() {
    if (
      !current.email
    ) {
      toast.error(
        "Email address is unavailable"
      );

      return;
    }

    try {
      await sendPasswordResetEmail(
        auth,
        current.email
      );

      toast.success(
        `Password reset email sent to ${current.email}`
      );
    } catch (error) {
      console.error(
        error
      );

      toast.error(
        "Unable to send password reset email"
      );
    }
  }

  async function copyUid() {
    if (!user?.uid) {
      return;
    }

    await navigator.clipboard.writeText(
      user.uid
    );

    toast.success(
      "Account ID copied"
    );
  }

  function updatePreference(
    key,
    value
  ) {
    setPreferences(
      (currentValue) => ({
        ...currentValue,
        [key]: value,
      })
    );

    toast.success(
      "Preference updated"
    );
  }

  return (
    <div className="admin-account-page">
      <Toaster position="top-right" />

      {/* HERO */}

      <section className="aac-hero">
        <div className="aac-grid-pattern" />

        <div className="aac-profile">
          <div className="aac-avatar-wrap">
            <div className="aac-avatar">
              {initials}
            </div>

            <span
              className={
                isActive
                  ? "aac-online"
                  : "aac-online inactive"
              }
            />
          </div>

          <div className="aac-profile-copy">
            <span className="aac-eyebrow">
              <ShieldCheck
                size={14}
              />

              Administrator Identity
            </span>

            <h1>
              {fullName}
            </h1>

            <p>
              {current.email ||
                "Email unavailable"}
            </p>

            <div className="aac-tags">
              <span>
                <BadgeCheck
                  size={13}
                />

                {role}
              </span>

              <span>
                <Building2
                  size={13}
                />

                {current.department ||
                  "No department"}
              </span>

              <span
                className={
                  isActive
                    ? "success"
                    : "danger"
                }
              >
                {isActive
                  ? "Account Active"
                  : "Account Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="aac-hero-actions">
          <button
            onClick={
              openEdit
            }
          >
            <Pencil
              size={15}
            />

            Edit Profile
          </button>

          <button
            onClick={
              resetPassword
            }
          >
            <KeyRound
              size={15}
            />

            Reset Password
          </button>
        </div>
      </section>

      {/* SECURITY SUMMARY */}

      <section className="aac-summary-grid">
        <article>
          <span className="aac-summary-icon blue">
            <ShieldCheck
              size={20}
            />
          </span>

          <div>
            <span>
              Security Score
            </span>

            <strong>
              {securityScore}%
            </strong>

            <small>
              Biometric enrollment
            </small>
          </div>
        </article>

        <article>
          <span className="aac-summary-icon cyan">
            <Radio
              size={20}
            />
          </span>

          <div>
            <span>
              RFID
            </span>

            <strong>
              {capitalize(
                rfidStatus
              )}
            </strong>

            <small>
              Identity claim
            </small>
          </div>
        </article>

        <article>
          <span className="aac-summary-icon purple">
            <ScanFace
              size={20}
            />
          </span>

          <div>
            <span>
              Face
            </span>

            <strong>
              {capitalize(
                faceStatus
              )}
            </strong>

            <small>
              Facial biometric
            </small>
          </div>
        </article>

        <article>
          <span className="aac-summary-icon amber">
            <Fingerprint
              size={20}
            />
          </span>

          <div>
            <span>
              Fingerprint
            </span>

            <strong>
              {capitalize(
                fingerprintStatus
              )}
            </strong>

            <small>
              Fallback biometric
            </small>
          </div>
        </article>
      </section>

      {/* MAIN */}

      <div className="aac-main-grid">
        <div className="aac-column">

          <section className="aac-card">
            <div className="aac-card-heading">
              <span>
                <UserRound
                  size={18}
                />
              </span>

              <div>
                <h2>
                  Personal Information
                </h2>

                <p>
                  Administrator profile information stored in Firestore.
                </p>
              </div>
            </div>

            <div className="aac-info-grid">
              <div>
                <Mail
                  size={16}
                />

                <span>
                  Email
                </span>

                <strong>
                  {current.email ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <Phone
                  size={16}
                />

                <span>
                  Phone
                </span>

                <strong>
                  {current.phoneNum ||
                    current.phone ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <Building2
                  size={16}
                />

                <span>
                  Department
                </span>

                <strong>
                  {current.department ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <ShieldCheck
                  size={16}
                />

                <span>
                  Role
                </span>

                <strong>
                  {role}
                </strong>
              </div>
            </div>
          </section>

          <section className="aac-card">
            <div className="aac-card-heading">
              <span>
                <LockKeyhole
                  size={18}
                />
              </span>

              <div>
                <h2>
                  Security & Access
                </h2>

                <p>
                  Account authentication and access information.
                </p>
              </div>
            </div>

            <div className="aac-security-list">
              <div>
                <KeyRound
                  size={17}
                />

                <div>
                  <strong>
                    Firebase Password
                  </strong>

                  <span>
                    Managed through Firebase Authentication.
                  </span>
                </div>

                <button
                  onClick={
                    resetPassword
                  }
                >
                  Reset
                </button>
              </div>

              <div>
                <ShieldCheck
                  size={17}
                />

                <div>
                  <strong>
                    Role-Based Access
                  </strong>

                  <span>
                    Administrator permissions are active.
                  </span>
                </div>

                <b className="aac-chip success">
                  Secured
                </b>
              </div>

              <div>
                <CheckCircle2
                  size={17}
                />

                <div>
                  <strong>
                    Account Status
                  </strong>

                  <span>
                    Firestore account availability.
                  </span>
                </div>

                <b
                  className={`aac-chip ${
                    isActive
                      ? "success"
                      : "danger"
                  }`}
                >
                  {isActive
                    ? "Active"
                    : "Inactive"}
                </b>
              </div>
            </div>
          </section>

          <section className="aac-card">
            <div className="aac-card-heading">
              <span>
                <Bell
                  size={18}
                />
              </span>

              <div>
                <h2>
                  Preferences
                </h2>

                <p>
                  Local dashboard notification preferences.
                </p>
              </div>
            </div>

            {[
              [
                "disputeAlerts",
                "Dispute Alerts",
                "Highlight new attendance disputes.",
              ],

              [
                "deviceAlerts",
                "Device Alerts",
                "Show terminal/device warnings.",
              ],

              [
                "attendanceAlerts",
                "Attendance Alerts",
                "Show important attendance events.",
              ],

              [
                "emailAlerts",
                "Email Notifications",
                "Reserve email notifications when supported.",
              ],
            ].map(
              ([
                key,
                label,
                description,
              ]) => (
                <div
                  className="aac-preference"
                  key={key}
                >
                  <div>
                    <strong>
                      {label}
                    </strong>

                    <span>
                      {description}
                    </span>
                  </div>

                  <label className="aac-toggle">
                    <input
                      type="checkbox"
                      checked={
                        preferences[
                          key
                        ]
                      }
                      onChange={(
                        event
                      ) =>
                        updatePreference(
                          key,
                          event
                            .target
                            .checked
                        )
                      }
                    />

                    <i />
                  </label>
                </div>
              )
            )}
          </section>
        </div>

        <div className="aac-column">

          <section className="aac-card">
            <div className="aac-card-heading">
              <span>
                <Fingerprint
                  size={18}
                />
              </span>

              <div>
                <h2>
                  Authentication Methods
                </h2>

                <p>
                  Enrollment state from your BioSync authentication profile.
                </p>
              </div>
            </div>

            {[
              {
                label: "RFID",
                description:
                  "Physical identity card claim",

                icon:
                  Radio,

                status:
                  rfidStatus,

                className:
                  "cyan",
              },

              {
                label:
                  "Face Recognition",

                description:
                  "Facial verification template",

                icon:
                  ScanFace,

                status:
                  faceStatus,

                className:
                  "blue",
              },

              {
                label:
                  "Fingerprint",

                description:
                  "Fallback biometric verification",

                icon:
                  Fingerprint,

                status:
                  fingerprintStatus,

                className:
                  "purple",
              },
            ].map(
              (method) => {
                const Icon =
                  method.icon;

                return (
                  <div
                    className="aac-biometric"
                    key={
                      method.label
                    }
                  >
                    <span
                      className={`aac-biometric-icon ${method.className}`}
                    >
                      <Icon
                        size={24}
                      />
                    </span>

                    <div>
                      <strong>
                        {
                          method.label
                        }
                      </strong>

                      <span>
                        {
                          method.description
                        }
                      </span>
                    </div>

                    <b
                      className={
                        method.status ===
                        "enrolled"
                          ? "enrolled"
                          : "pending"
                      }
                    >
                      {method.status ===
                      "enrolled"
                        ? "Enrolled"
                        : "Pending"}
                    </b>
                  </div>
                );
              }
            )}
          </section>

          <section className="aac-card">
            <div className="aac-card-heading">
              <span>
                <ShieldCheck
                  size={18}
                />
              </span>

              <div>
                <h2>
                  Account Information
                </h2>

                <p>
                  System-managed administrator account metadata.
                </p>
              </div>
            </div>

            <div className="aac-account-list">
              <div>
                <span>
                  Role
                </span>

                <strong>
                  {role}
                </strong>
              </div>

              <div>
                <span>
                  Status
                </span>

                <strong>
                  {isActive
                    ? "Active"
                    : "Inactive"}
                </strong>
              </div>

              <div>
                <span>
                  Member Since
                </span>

                <strong>
                  {formatDate(
                    current.createdAt
                  )}
                </strong>
              </div>

              <div className="aac-uid">
                <div>
                  <span>
                    Firebase UID
                  </span>

                  <code>
                    {user?.uid ||
                      "Unavailable"}
                  </code>
                </div>

                <button
                  onClick={
                    copyUid
                  }
                >
                  <Copy
                    size={14}
                  />

                  Copy
                </button>
              </div>
            </div>
          </section>

          <section className="aac-card">
            <div className="aac-card-heading">
              <span>
                <SlidersHorizontal
                  size={18}
                />
              </span>

              <div>
                <h2>
                  Interface
                </h2>

                <p>
                  Current BioSync administrative environment.
                </p>
              </div>
            </div>

            <div className="aac-interface">
              <div>
                <span>
                  Portal
                </span>

                <strong>
                  Admin Dashboard
                </strong>
              </div>

              <div>
                <span>
                  Region
                </span>

                <strong>
                  Malaysia
                </strong>
              </div>

              <div>
                <span>
                  Date Format
                </span>

                <strong>
                  DD/MM/YYYY
                </strong>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* EDIT MODAL */}

      {editOpen && (
        <div className="aac-modal-backdrop">
          <form
            className="aac-modal"
            onSubmit={
              saveProfile
            }
          >
            <div className="aac-modal-header">
              <div>
                <span>
                  <Pencil
                    size={18}
                  />
                </span>

                <div>
                  <h2>
                    Edit Profile
                  </h2>

                  <p>
                    Update safe administrator profile fields.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setEditOpen(
                    false
                  )
                }
              >
                <X
                  size={18}
                />
              </button>
            </div>

            <div className="aac-form-grid">
              <label>
                First Name

                <input
                  value={
                    form.firstName
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        currentValue
                      ) => ({
                        ...currentValue,
                        firstName:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <label>
                Last Name

                <input
                  value={
                    form.lastName
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        currentValue
                      ) => ({
                        ...currentValue,
                        lastName:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <label>
                Phone

                <input
                  value={
                    form.phoneNum
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        currentValue
                      ) => ({
                        ...currentValue,
                        phoneNum:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>

              <label>
                Department

                <input
                  value={
                    form.department
                  }
                  onChange={(
                    event
                  ) =>
                    setForm(
                      (
                        currentValue
                      ) => ({
                        ...currentValue,
                        department:
                          event
                            .target
                            .value,
                      })
                    )
                  }
                />
              </label>
            </div>

            <div className="aac-modal-actions">
              <button
                type="button"
                onClick={() =>
                  setEditOpen(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary"
                disabled={
                  saving
                }
              >
                <Save
                  size={15}
                />

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AccountCenter;