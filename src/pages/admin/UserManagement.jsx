import {
  useEffect,
  useMemo,
  useState,
} from "react";

import toast, {
  Toaster,
} from "react-hot-toast";

import {
  BookOpen,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Check,
  CircleOff,
  Copy,
  Eye,
  EyeOff,
  Fingerprint,
  GraduationCap,
  Hash,
  KeyRound,
  LoaderCircle,
  Mail,
  Phone,
  Plus,
  Power,
  PowerOff,
  ScanFace,
  Search,
  ShieldCheck,
  UserPlus,
  UserRound,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";

import {
  createManagedUser,
  subscribeToManagedUsers,
  updateManagedUserStatus,
} from "../../services/userManagementService";

import "./UserManagement.css";

/* =========================================================
   DEFAULT FORM
========================================================= */

const EMPTY_FORM = {
  role: "student",
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  studentId: "",
  course: "",
  department: "",
  intake: "",
  phoneNum: "",
};

/* =========================================================
   HELPERS
========================================================= */

function getFullName(user) {
  const name = [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return name || "Unnamed User";
}

function getInitials(user) {
  return getFullName(user)
    .split(/\s+/)
    .map((part) =>
      part.charAt(0)
    )
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function capitalize(value) {
  const text = String(
    value || ""
  ).trim();

  if (!text) {
    return "Unknown";
  }

  return (
    text.charAt(0).toUpperCase() +
    text.slice(1)
  );
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  try {
    const date =
      typeof value?.toDate === "function"
        ? value.toDate()
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
        month: "short",
        year: "numeric",
      }
    );
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

function hasFingerprintBiometric(
  user
) {
  return Boolean(
    user?.fingerprintRegistered ||
      user?.fingerprintTemplate ||
      user?.fingerprintEncoding ||
      user?.biometrics?.fingerprint ||
      user?.biometric?.fingerprint
  );
}

function generateEmailAddress(
  firstName,
  lastName
) {
  const first = String(
    firstName || ""
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const last = String(
    lastName || ""
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!first && !last) {
    return "";
  }

  const username = [
    first,
    last,
  ]
    .filter(Boolean)
    .join(".");

  return `${username}@biosync.net`;
}

function generateTemporaryPassword() {
  const uppercase =
    "ABCDEFGHJKLMNPQRSTUVWXYZ";

  const lowercase =
    "abcdefghijkmnopqrstuvwxyz";

  const numbers =
    "23456789";

  const symbols =
    "!@#$%";

  const all =
    uppercase +
    lowercase +
    numbers +
    symbols;

  const randomCharacter = (
    characters
  ) => {
    const values =
      new Uint32Array(1);

    crypto.getRandomValues(
      values
    );

    return characters[
      values[0] %
        characters.length
    ];
  };

  let password =
    randomCharacter(uppercase) +
    randomCharacter(lowercase) +
    randomCharacter(numbers) +
    randomCharacter(symbols);

  while (
    password.length < 12
  ) {
    password +=
      randomCharacter(all);
  }

  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function readableError(error) {
  const code =
    error?.code || "";

  if (
    code ===
    "auth/email-already-in-use"
  ) {
    return "This email is already registered in Firebase Authentication.";
  }

  if (
    code ===
    "auth/invalid-email"
  ) {
    return "Please enter a valid email address.";
  }

  if (
    code ===
    "auth/weak-password"
  ) {
    return "The temporary password is too weak.";
  }

  if (
    code ===
    "permission-denied"
  ) {
    return "Firestore permission denied. Make sure your latest Firestore rules were published.";
  }

  return (
    error?.message ||
    "Unable to complete this action."
  );
}

/* =========================================================
   USER MANAGEMENT
========================================================= */

function UserManagement() {
  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState("");

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    roleFilter,
    setRoleFilter,
  ] = useState("all");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    createOpen,
    setCreateOpen,
  ] = useState(false);

  const [
    selectedUser,
    setSelectedUser,
  ] = useState(null);

  const [
    createdCredentials,
    setCreatedCredentials,
  ] = useState(null);

  const [
    form,
    setForm,
  ] = useState(
    EMPTY_FORM
  );

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    statusChangingId,
    setStatusChangingId,
  ] = useState("");

  /* =======================================================
     USERS LISTENER
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      subscribeToManagedUsers(
        (result) => {
          setUsers(result);
          setLoading(false);
          setLoadError("");
        },
        (error) => {
          console.error(error);

          setLoadError(
            "Unable to load users from Firestore."
          );

          setLoading(false);
        }
      );

    return () =>
      unsubscribe();
  }, []);

  /* =======================================================
     ESC CLOSE
  ======================================================= */

  useEffect(() => {
    function handleKeyDown(event) {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      setCreateOpen(false);
      setSelectedUser(null);
      setCreatedCredentials(null);
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
  }, []);

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary = useMemo(
    () => ({
      total: users.length,

      students:
        users.filter(
          (item) =>
            item.role === "student"
        ).length,

      teachers:
        users.filter(
          (item) =>
            item.role === "teacher"
        ).length,

      inactive:
        users.filter(
          (item) =>
            item.active === false
        ).length,
    }),
    [users]
  );

  /* =======================================================
     FILTER USERS
  ======================================================= */

  const filteredUsers =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      return users.filter(
        (item) => {
          const fullName =
            getFullName(item)
              .toLowerCase();

          const email =
            String(
              item.email || ""
            ).toLowerCase();

          const studentId =
            String(
              item.studentId ||
                ""
            ).toLowerCase();

          const matchesSearch =
            !searchText ||
            fullName.includes(
              searchText
            ) ||
            email.includes(
              searchText
            ) ||
            studentId.includes(
              searchText
            );

          const matchesRole =
            roleFilter === "all" ||
            item.role ===
              roleFilter;

          const matchesStatus =
            statusFilter ===
              "all" ||
            (statusFilter ===
              "active" &&
              item.active !==
                false) ||
            (statusFilter ===
              "inactive" &&
              item.active ===
                false);

          return (
            matchesSearch &&
            matchesRole &&
            matchesStatus
          );
        }
      );
    }, [
      users,
      search,
      roleFilter,
      statusFilter,
    ]);

  /* =======================================================
     FORM
  ======================================================= */

  function handleFieldChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );
  }

  function changeRole(role) {
    setForm(
      (current) => ({
        ...EMPTY_FORM,
        firstName:
          current.firstName,
        lastName:
          current.lastName,
        email:
          current.email,
        password:
          current.password,
        department:
          current.department,
        phoneNum:
          current.phoneNum,
        role,
      })
    );
  }

  function handleGenerateEmail() {
    const generated =
      generateEmailAddress(
        form.firstName,
        form.lastName
      );

    if (!generated) {
      toast.error(
        "Enter the first name before generating an email."
      );

      return;
    }

    setForm(
      (current) => ({
        ...current,
        email: generated,
      })
    );
  }

  function handleGeneratePassword() {
    const generated =
      generateTemporaryPassword();

    setForm(
      (current) => ({
        ...current,
        password: generated,
      })
    );

    setShowPassword(true);

    toast.success(
      "Temporary password generated"
    );
  }

  function validateForm() {
    if (
      !form.firstName.trim()
    ) {
      return "First name is required.";
    }

    if (
      !form.email.trim()
    ) {
      return "Email address is required.";
    }

    if (
      form.password.length < 8
    ) {
      return "Temporary password must contain at least 8 characters.";
    }

    if (
      form.role === "student"
    ) {
      if (
        !form.studentId.trim()
      ) {
        return "Student ID is required.";
      }

      if (!form.course.trim()) {
        return "Course is required.";
      }

      if (
        !form.department.trim()
      ) {
        return "Department is required.";
      }

      if (!form.intake.trim()) {
        return "Student intake is required.";
      }
    }

    return "";
  }

  async function handleCreateUser(
    event
  ) {
    event.preventDefault();

    const validationError =
      validateForm();

    if (validationError) {
      toast.error(
        validationError
      );

      return;
    }

    setCreating(true);

    try {
      const result =
        await createManagedUser(
          form
        );

      setCreatedCredentials({
        ...result,
        password:
          form.password,
        fullName:
          [
            form.firstName,
            form.lastName,
          ]
            .filter(Boolean)
            .join(" "),
      });

      setCreateOpen(false);

      setForm(
        EMPTY_FORM
      );

      setShowPassword(false);

      toast.success(
        "User account created successfully"
      );
    } catch (error) {
      console.error(
        "Create user error:",
        error
      );

      toast.error(
        readableError(error)
      );
    } finally {
      setCreating(false);
    }
  }

  /* =======================================================
     STATUS
  ======================================================= */

  async function handleStatusChange(
    targetUser
  ) {
    if (
      targetUser.role === "admin"
    ) {
      toast.error(
        "Administrator accounts are protected from User Management."
      );

      return;
    }

    const currentlyActive =
      targetUser.active !==
      false;

    const newActive =
      !currentlyActive;

    const action =
      newActive
        ? "activate"
        : "deactivate";

    const confirmed =
      window.confirm(
        `Are you sure you want to ${action} ${getFullName(
          targetUser
        )}?`
      );

    if (!confirmed) {
      return;
    }

    setStatusChangingId(
      targetUser.id
    );

    try {
      await updateManagedUserStatus(
        targetUser.id,
        newActive
      );

      toast.success(
        newActive
          ? "User activated"
          : "User deactivated"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        readableError(error)
      );
    } finally {
      setStatusChangingId("");
    }
  }

  /* =======================================================
     COPY
  ======================================================= */

  async function copyText(
    text,
    label
  ) {
    try {
      await navigator.clipboard.writeText(
        text
      );

      toast.success(
        `${label} copied`
      );
    } catch {
      toast.error(
        `Unable to copy ${label.toLowerCase()}`
      );
    }
  }

  /* =======================================================
     UI
  ======================================================= */

  return (
    <div className="um-page">
      <Toaster position="top-right" />

      {/* PAGE HEADER */}

      <header className="um-page-header">
        <div>
          <div className="um-eyebrow">
            <UsersRound size={15} />
            Administration
          </div>

          <h1>
            User Management
          </h1>

          <p>
            Create and manage
            BioSync student and
            teacher accounts from
            one secure workspace.
          </p>
        </div>

        <button
          type="button"
          className="um-create-button"
          onClick={() =>
            setCreateOpen(true)
          }
        >
          <UserPlus size={17} />
          Create User
        </button>
      </header>

      {/* SUMMARY */}

      <section className="um-summary-grid">
        <div className="um-summary-card">
          <div className="um-summary-icon blue">
            <UsersRound size={21} />
          </div>

          <div>
            <span>
              Total Users
            </span>

            <strong>
              {summary.total}
            </strong>
          </div>
        </div>

        <div className="um-summary-card">
          <div className="um-summary-icon cyan">
            <GraduationCap size={21} />
          </div>

          <div>
            <span>
              Students
            </span>

            <strong>
              {summary.students}
            </strong>
          </div>
        </div>

        <div className="um-summary-card">
          <div className="um-summary-icon purple">
            <BriefcaseBusiness size={21} />
          </div>

          <div>
            <span>
              Teachers
            </span>

            <strong>
              {summary.teachers}
            </strong>
          </div>
        </div>

        <div className="um-summary-card">
          <div className="um-summary-icon red">
            <CircleOff size={21} />
          </div>

          <div>
            <span>
              Inactive
            </span>

            <strong>
              {summary.inactive}
            </strong>
          </div>
        </div>
      </section>

      {/* USERS CARD */}

      <section className="um-users-card">
        <div className="um-toolbar">
          <div className="um-search">
            <Search size={17} />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search name, email or student ID..."
            />
          </div>

          <div className="um-filters">
            <select
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Roles
              </option>

              <option value="student">
                Students
              </option>

              <option value="teacher">
                Teachers
              </option>

              <option value="admin">
                Administrators
              </option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>
        </div>

        <div className="um-table-meta">
          <span>
            {filteredUsers.length}{" "}
            user
            {filteredUsers.length ===
            1
              ? ""
              : "s"}
          </span>

          <small>
            Firebase Authentication
            + Firestore profiles
          </small>
        </div>

        {loading ? (
          <div className="um-state">
            <LoaderCircle
              size={28}
              className="um-spin"
            />

            <strong>
              Loading users...
            </strong>
          </div>
        ) : loadError ? (
          <div className="um-state error">
            <CircleOff size={28} />

            <strong>
              {loadError}
            </strong>
          </div>
        ) : (
          <div className="um-table-wrap">
            <table className="um-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Biometrics</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map(
                  (item) => {
                    const active =
                      item.active !==
                      false;

                    const face =
                      hasFaceBiometric(
                        item
                      );

                    const fingerprint =
                      hasFingerprintBiometric(
                        item
                      );

                    return (
                      <tr key={item.id}>
                        <td>
                          <div className="um-user-cell">
                            <div className="um-avatar">
                              {getInitials(
                                item
                              )}
                            </div>

                            <div>
                              <strong>
                                {getFullName(
                                  item
                                )}
                              </strong>

                              <span>
                                {item.email ||
                                  "No email"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="um-id">
                            {item.studentId ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`um-role-badge ${item.role || "unknown"}`}
                          >
                            {capitalize(
                              item.role
                            )}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`um-status-badge ${
                              active
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            <span />

                            {active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            item.createdAt
                          )}
                        </td>

                        <td>
                          <div className="um-biometric-mini">
                            <span
                              className={
                                face
                                  ? "ready"
                                  : ""
                              }
                              title={
                                face
                                  ? "Face registered"
                                  : "Face not detected"
                              }
                            >
                              <ScanFace
                                size={15}
                              />
                            </span>

                            <span
                              className={
                                fingerprint
                                  ? "ready"
                                  : ""
                              }
                              title={
                                fingerprint
                                  ? "Fingerprint registered"
                                  : "Fingerprint not detected"
                              }
                            >
                              <Fingerprint
                                size={15}
                              />
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="um-actions">
                            <button
                              type="button"
                              className="um-action-button"
                              onClick={() =>
                                setSelectedUser(
                                  item
                                )
                              }
                            >
                              <Eye
                                size={14}
                              />

                              View
                            </button>

                            {item.role ===
                            "admin" ? (
                              <span className="um-protected">
                                <ShieldCheck
                                  size={13}
                                />

                                Protected
                              </span>
                            ) : (
                              <button
                                type="button"
                                className={`um-action-button ${
                                  active
                                    ? "danger"
                                    : "success"
                                }`}
                                disabled={
                                  statusChangingId ===
                                  item.id
                                }
                                onClick={() =>
                                  handleStatusChange(
                                    item
                                  )
                                }
                              >
                                {statusChangingId ===
                                item.id ? (
                                  <LoaderCircle
                                    size={14}
                                    className="um-spin"
                                  />
                                ) : active ? (
                                  <PowerOff
                                    size={14}
                                  />
                                ) : (
                                  <Power
                                    size={14}
                                  />
                                )}

                                {active
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  }
                )}

                {filteredUsers.length ===
                  0 && (
                  <tr>
                    <td
                      colSpan="7"
                      className="um-empty-cell"
                    >
                      <UsersRound
                        size={30}
                      />

                      <strong>
                        No users found
                      </strong>

                      <span>
                        Try changing your
                        search or filters.
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ===================================================
          CREATE USER MODAL
      =================================================== */}

      {createOpen && (
        <div className="um-modal-backdrop">
          <div className="um-modal um-create-modal">
            <div className="um-modal-header">
              <div>
                <div className="um-modal-icon">
                  <UserPlus
                    size={19}
                  />
                </div>

                <div>
                  <h2>
                    Create BioSync User
                  </h2>

                  <p>
                    Create a new
                    Student or Teacher
                    account.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="um-close-button"
                onClick={() =>
                  setCreateOpen(
                    false
                  )
                }
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={
                handleCreateUser
              }
            >
              <div className="um-role-selector">
                <button
                  type="button"
                  className={
                    form.role ===
                    "student"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    changeRole(
                      "student"
                    )
                  }
                >
                  <GraduationCap
                    size={18}
                  />

                  <span>
                    Student
                    <small>
                      Attendance
                      participant
                    </small>
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    form.role ===
                    "teacher"
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    changeRole(
                      "teacher"
                    )
                  }
                >
                  <BriefcaseBusiness
                    size={18}
                  />

                  <span>
                    Teacher
                    <small>
                      Teaching staff
                    </small>
                  </span>
                </button>
              </div>

              <div className="um-form-grid">
                <label className="um-field">
                  <span>
                    First Name *
                  </span>

                  <div className="um-input">
                    <UserRound
                      size={16}
                    />

                    <input
                      name="firstName"
                      value={
                        form.firstName
                      }
                      onChange={
                        handleFieldChange
                      }
                      placeholder="e.g. Faris"
                    />
                  </div>
                </label>

                <label className="um-field">
                  <span>
                    Last Name
                  </span>

                  <div className="um-input">
                    <UserRound
                      size={16}
                    />

                    <input
                      name="lastName"
                      value={
                        form.lastName
                      }
                      onChange={
                        handleFieldChange
                      }
                      placeholder="e.g. Iskandar"
                    />
                  </div>
                </label>

                <label className="um-field um-span-2">
                  <span>
                    Login Email *
                  </span>

                  <div className="um-combo-input">
                    <div className="um-input">
                      <Mail
                        size={16}
                      />

                      <input
                        type="email"
                        name="email"
                        value={
                          form.email
                        }
                        onChange={
                          handleFieldChange
                        }
                        placeholder="student@biosync.net"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleGenerateEmail
                      }
                    >
                      <WandSparkles
                        size={14}
                      />

                      Generate
                    </button>
                  </div>
                </label>

                <label className="um-field um-span-2">
                  <span>
                    Temporary Password *
                  </span>

                  <div className="um-combo-input">
                    <div className="um-input">
                      <KeyRound
                        size={16}
                      />

                      <input
                        type={
                          showPassword
                            ? "text"
                            : "password"
                        }
                        name="password"
                        value={
                          form.password
                        }
                        onChange={
                          handleFieldChange
                        }
                        placeholder="Minimum 8 characters"
                      />

                      <button
                        type="button"
                        className="um-eye-button"
                        onClick={() =>
                          setShowPassword(
                            (value) =>
                              !value
                          )
                        }
                      >
                        {showPassword ? (
                          <EyeOff
                            size={15}
                          />
                        ) : (
                          <Eye
                            size={15}
                          />
                        )}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleGeneratePassword
                      }
                    >
                      <WandSparkles
                        size={14}
                      />

                      Generate
                    </button>
                  </div>

                  <small className="um-field-help">
                    Password is used
                    only for Firebase
                    Authentication and
                    is not stored in
                    Firestore.
                  </small>
                </label>

                {form.role ===
                  "student" && (
                  <>
                    <label className="um-field">
                      <span>
                        Student ID *
                      </span>

                      <div className="um-input">
                        <Hash
                          size={16}
                        />

                        <input
                          name="studentId"
                          value={
                            form.studentId
                          }
                          onChange={
                            handleFieldChange
                          }
                          placeholder="DIT25061111"
                        />
                      </div>
                    </label>

                    <label className="um-field">
                      <span>
                        Intake *
                      </span>

                      <div className="um-input">
                        <CalendarDays
                          size={16}
                        />

                        <input
                          name="intake"
                          value={
                            form.intake
                          }
                          onChange={
                            handleFieldChange
                          }
                          placeholder="Jan 2026"
                        />
                      </div>
                    </label>

                    <label className="um-field um-span-2">
                      <span>
                        Course *
                      </span>

                      <div className="um-input">
                        <BookOpen
                          size={16}
                        />

                        <input
                          name="course"
                          value={
                            form.course
                          }
                          onChange={
                            handleFieldChange
                          }
                          placeholder="Diploma In Information Technology"
                        />
                      </div>
                    </label>
                  </>
                )}

                <label className="um-field">
                  <span>
                    Department
                    {form.role ===
                    "student"
                      ? " *"
                      : ""}
                  </span>

                  <div className="um-input">
                    <Building2
                      size={16}
                    />

                    <input
                      name="department"
                      value={
                        form.department
                      }
                      onChange={
                        handleFieldChange
                      }
                      placeholder="Computer Information"
                    />
                  </div>
                </label>

                <label className="um-field">
                  <span>
                    Phone Number
                  </span>

                  <div className="um-input">
                    <Phone
                      size={16}
                    />

                    <input
                      name="phoneNum"
                      value={
                        form.phoneNum
                      }
                      onChange={
                        handleFieldChange
                      }
                      placeholder="6012..."
                    />
                  </div>
                </label>
              </div>

              <div className="um-security-note">
                <ShieldCheck
                  size={17}
                />

                <p>
                  Only Student and
                  Teacher accounts can
                  be created here.
                  Administrator account
                  creation is blocked.
                </p>
              </div>

              <div className="um-modal-actions">
                <button
                  type="button"
                  className="um-button secondary"
                  disabled={
                    creating
                  }
                  onClick={() =>
                    setCreateOpen(
                      false
                    )
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="um-button primary"
                  disabled={
                    creating
                  }
                >
                  {creating ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className="um-spin"
                      />

                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus
                        size={16}
                      />

                      Create User
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================
          CREATED CREDENTIALS
      =================================================== */}

      {createdCredentials && (
        <div className="um-modal-backdrop">
          <div className="um-modal um-success-modal">
            <div className="um-success-icon">
              <Check size={28} />
            </div>

            <h2>
              Account Created
            </h2>

            <p className="um-success-copy">
              The new{" "}
              {capitalize(
                createdCredentials.role
              )}{" "}
              account is ready to log
              in to BioSync.
            </p>

            <div className="um-credential-box">
              <span>
                User
              </span>

              <strong>
                {
                  createdCredentials.fullName
                }
              </strong>
            </div>

            <div className="um-credential-box">
              <span>
                Login Email
              </span>

              <div>
                <strong>
                  {
                    createdCredentials.email
                  }
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      createdCredentials.email,
                      "Email"
                    )
                  }
                >
                  <Copy
                    size={14}
                  />
                </button>
              </div>
            </div>

            <div className="um-credential-box password">
              <span>
                Temporary Password
              </span>

              <div>
                <strong>
                  {
                    createdCredentials.password
                  }
                </strong>

                <button
                  type="button"
                  onClick={() =>
                    copyText(
                      createdCredentials.password,
                      "Password"
                    )
                  }
                >
                  <Copy
                    size={14}
                  />
                </button>
              </div>
            </div>

            <div className="um-warning-note">
              <KeyRound
                size={16}
              />

              <span>
                Save or share the
                temporary password now.
                BioSync does not store
                this password in
                Firestore.
              </span>
            </div>

            <button
              type="button"
              className="um-button primary full"
              onClick={() =>
                setCreatedCredentials(
                  null
                )
              }
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ===================================================
          USER DETAILS
      =================================================== */}

      {selectedUser && (
        <div className="um-modal-backdrop">
          <div className="um-modal um-details-modal">
            <div className="um-modal-header">
              <div>
                <div className="um-modal-icon">
                  <UserRound
                    size={19}
                  />
                </div>

                <div>
                  <h2>
                    User Details
                  </h2>

                  <p>
                    BioSync account
                    information
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="um-close-button"
                onClick={() =>
                  setSelectedUser(
                    null
                  )
                }
              >
                <X size={18} />
              </button>
            </div>

            <div className="um-detail-profile">
              <div className="um-detail-avatar">
                {getInitials(
                  selectedUser
                )}
              </div>

              <div>
                <h3>
                  {getFullName(
                    selectedUser
                  )}
                </h3>

                <p>
                  {selectedUser.email}
                </p>

                <div className="um-detail-badges">
                  <span
                    className={`um-role-badge ${selectedUser.role}`}
                  >
                    {capitalize(
                      selectedUser.role
                    )}
                  </span>

                  <span
                    className={`um-status-badge ${
                      selectedUser.active !==
                      false
                        ? "active"
                        : "inactive"
                    }`}
                  >
                    <span />

                    {selectedUser.active !==
                    false
                      ? "Active"
                      : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="um-detail-grid">
              <div>
                <span>
                  Firebase UID
                </span>

                <strong className="um-detail-uid">
                  {
                    selectedUser.id
                  }
                </strong>
              </div>

              <div>
                <span>
                  Student ID
                </span>

                <strong>
                  {selectedUser.studentId ||
                    "Not applicable"}
                </strong>
              </div>

              <div>
                <span>
                  Department
                </span>

                <strong>
                  {selectedUser.department ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>
                  Course
                </span>

                <strong>
                  {selectedUser.course ||
                    "Not applicable"}
                </strong>
              </div>

              <div>
                <span>
                  Intake
                </span>

                <strong>
                  {selectedUser.intake ||
                    "Not applicable"}
                </strong>
              </div>

              <div>
                <span>
                  Phone
                </span>

                <strong>
                  {selectedUser.phoneNum ||
                    "Not available"}
                </strong>
              </div>

              <div>
                <span>
                  Created
                </span>

                <strong>
                  {formatDate(
                    selectedUser.createdAt
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Role
                </span>

                <strong>
                  {capitalize(
                    selectedUser.role
                  )}
                </strong>
              </div>
            </div>

            <div className="um-biometric-section">
              <h4>
                Biometric Enrollment
              </h4>

              <div>
                <div>
                  <ScanFace
                    size={20}
                  />

                  <span>
                    Face Recognition
                  </span>

                  <strong
                    className={
                      hasFaceBiometric(
                        selectedUser
                      )
                        ? "ready"
                        : ""
                    }
                  >
                    {hasFaceBiometric(
                      selectedUser
                    )
                      ? "Registered"
                      : "Not configured"}
                  </strong>
                </div>

                <div>
                  <Fingerprint
                    size={20}
                  />

                  <span>
                    Fingerprint
                  </span>

                  <strong
                    className={
                      hasFingerprintBiometric(
                        selectedUser
                      )
                        ? "ready"
                        : ""
                    }
                  >
                    {hasFingerprintBiometric(
                      selectedUser
                    )
                      ? "Registered"
                      : "Not configured"}
                  </strong>
                </div>
              </div>
            </div>

            <div className="um-modal-actions">
              <button
                type="button"
                className="um-button secondary"
                onClick={() =>
                  setSelectedUser(
                    null
                  )
                }
              >
                Close
              </button>

              {selectedUser.role !==
                "admin" && (
                <button
                  type="button"
                  className={`um-button ${
                    selectedUser.active !==
                    false
                      ? "danger"
                      : "success"
                  }`}
                  onClick={() => {
                    handleStatusChange(
                      selectedUser
                    );

                    setSelectedUser(
                      null
                    );
                  }}
                >
                  {selectedUser.active !==
                  false ? (
                    <PowerOff
                      size={15}
                    />
                  ) : (
                    <Power
                      size={15}
                    />
                  )}

                  {selectedUser.active !==
                  false
                    ? "Deactivate User"
                    : "Activate User"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement;