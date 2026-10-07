import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  sendPasswordResetEmail,
} from "firebase/auth";

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
  Pencil,
  Phone,
  Plus,
  Power,
  PowerOff,
  Radio,
  Save,
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
  auth,
} from "../../firebase/firebase";

import {
  createManagedUser,
  subscribeToManagedAuthProfiles,
  subscribeToManagedUsers,
  updateManagedUserProfile,
  updateManagedUserStatus,
} from "../../services/userManagementService";

import "./UserManagement.css";


/* =========================================================
   DEPARTMENTS
========================================================= */

const DEPARTMENT_OPTIONS = [
  {
    value: "CID",
    label:
      "Computer Information Department (CID)",
  },
];


/* =========================================================
   EMPTY FORM
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

  return (
    name ||
    "Unnamed User"
  );
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
  const text =
    String(
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
      typeof value?.toDate ===
      "function"
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


function generateEmailAddress(
  firstName,
  lastName
) {
  const first =
    String(
      firstName || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );

  const last =
    String(
      lastName || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );

  if (
    !first &&
    !last
  ) {
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

  function randomCharacter(
    characters
  ) {
    const values =
      new Uint32Array(1);

    crypto.getRandomValues(
      values
    );

    return characters[
      values[0] %
        characters.length
    ];
  }

  let password =
    randomCharacter(
      uppercase
    ) +
    randomCharacter(
      lowercase
    ) +
    randomCharacter(
      numbers
    ) +
    randomCharacter(
      symbols
    );

  while (
    password.length < 12
  ) {
    password +=
      randomCharacter(all);
  }

  return password
    .split("")
    .sort(
      () =>
        Math.random() -
        0.5
    )
    .join("");
}


function readableError(error) {
  const code =
    error?.code ||
    "";

  if (
    code ===
    "auth/email-already-in-use"
  ) {
    return "This email is already registered.";
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
      "permission-denied" ||
    code ===
      "firestore/permission-denied"
  ) {
    return "Firestore permission denied.";
  }

  return (
    error?.message ||
    "Unable to complete this action."
  );
}


/* =========================================================
   BIOMETRIC ENROLLMENT HELPERS
========================================================= */

function getEnrollmentStatus(
  profile,
  type
) {
  const value =
    String(
      profile?.[
        `${type}Status`
      ] ||
        profile?.[
          type
        ]?.status ||
        profile?.biometrics?.[
          type
        ]?.status ||
        ""
    )
      .trim()
      .toLowerCase();

  return [
    "enrolled",
    "registered",
    "complete",
    "completed",
    "active",
  ].includes(value);
}


function getEnrollmentProgress(
  profile
) {
  const enrolled =
    [
      "rfid",
      "face",
      "fingerprint",
    ].filter(
      (type) =>
        getEnrollmentStatus(
          profile,
          type
        )
    ).length;

  return {
    enrolled,

    percentage:
      Math.round(
        (
          enrolled /
          3
        ) *
          100
      ),
  };
}


/* =========================================================
   COMPONENT
========================================================= */

function UserManagement() {
  const [
    users,
    setUsers,
  ] = useState([]);

  const [
    authProfiles,
    setAuthProfiles,
  ] = useState({});

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
    enrollmentFilter,
    setEnrollmentFilter,
  ] = useState("all");

  const [
    sortBy,
    setSortBy,
  ] = useState("newest");

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

  const [
    editUser,
    setEditUser,
  ] = useState(null);

  const [
    editForm,
    setEditForm,
  ] = useState(null);

  const [
    editing,
    setEditing,
  ] = useState(false);


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
          console.error(
            "User subscription error:",
            error
          );

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
     AUTH PROFILE LISTENER
  ======================================================= */

  useEffect(() => {
    const unsubscribe =
      subscribeToManagedAuthProfiles(
        (profiles) => {
          setAuthProfiles(
            profiles
          );
        },

        (error) => {
          console.warn(
            "Auth profile listener error:",
            error
          );

          setAuthProfiles(
            {}
          );
        }
      );

    return () =>
      unsubscribe();
  }, []);


  /* =======================================================
     ESC KEY
  ======================================================= */

  useEffect(() => {
    function handleKeyDown(
      event
    ) {
      if (
        event.key !==
        "Escape"
      ) {
        return;
      }

      setCreateOpen(false);

      setSelectedUser(
        null
      );

      setCreatedCredentials(
        null
      );

      setEditUser(null);

      setEditForm(null);
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

  const summary =
    useMemo(() => {
      const pendingEnrollment =
        users.filter(
          (item) => {
            if (
              item.role ===
              "admin"
            ) {
              return false;
            }

            const profile =
              authProfiles[
                item.id
              ] || {};

            return (
              getEnrollmentProgress(
                profile
              ).enrolled < 3
            );
          }
        ).length;

      return {
        total:
          users.length,

        students:
          users.filter(
            (item) =>
              item.role ===
              "student"
          ).length,

        teachers:
          users.filter(
            (item) =>
              item.role ===
              "teacher"
          ).length,

        pendingEnrollment,
      };
    }, [
      users,
      authProfiles,
    ]);


  /* =======================================================
     FILTERED USERS
  ======================================================= */

  const filteredUsers =
    useMemo(() => {
      const searchText =
        search
          .trim()
          .toLowerCase();

      let result =
        users.filter(
          (item) => {
            const profile =
              authProfiles[
                item.id
              ] || {};

            const progress =
              getEnrollmentProgress(
                profile
              );

            const searchable =
              [
                getFullName(
                  item
                ),
                item.email,
                item.studentId,
                item.department,
                item.course,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !searchText ||
              searchable.includes(
                searchText
              );

            const matchesRole =
              roleFilter ===
                "all" ||
              item.role ===
                roleFilter;

            const matchesStatus =
              statusFilter ===
                "all" ||
              (
                statusFilter ===
                  "active" &&
                item.active !==
                  false
              ) ||
              (
                statusFilter ===
                  "inactive" &&
                item.active ===
                  false
              );

            const matchesEnrollment =
              enrollmentFilter ===
                "all" ||
              (
                enrollmentFilter ===
                  "complete" &&
                progress.enrolled ===
                  3
              ) ||
              (
                enrollmentFilter ===
                  "pending" &&
                progress.enrolled <
                  3
              );

            return (
              matchesSearch &&
              matchesRole &&
              matchesStatus &&
              matchesEnrollment
            );
          }
        );

      result = [
        ...result,
      ];

      if (
        sortBy === "name"
      ) {
        result.sort(
          (a, b) =>
            getFullName(
              a
            ).localeCompare(
              getFullName(
                b
              )
            )
        );
      }

      if (
        sortBy ===
        "name-desc"
      ) {
        result.sort(
          (a, b) =>
            getFullName(
              b
            ).localeCompare(
              getFullName(
                a
              )
            )
        );
      }

      if (
        sortBy ===
        "oldest"
      ) {
        result.reverse();
      }

      return result;
    }, [
      users,
      authProfiles,
      search,
      roleFilter,
      statusFilter,
      enrollmentFilter,
      sortBy,
    ]);


  /* =======================================================
     CREATE FORM
  ======================================================= */

  function handleFieldChange(
    event
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setForm(
      (current) => ({
        ...current,

        [name]:
          value,
      })
    );
  }


  function changeRole(
    role
  ) {
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
        "Enter a first name before generating an email."
      );

      return;
    }

    setForm(
      (current) => ({
        ...current,

        email:
          generated,
      })
    );
  }


  function handleGeneratePassword() {
    const generated =
      generateTemporaryPassword();

    setForm(
      (current) => ({
        ...current,

        password:
          generated,
      })
    );

    setShowPassword(
      true
    );

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
      form.password.length <
      8
    ) {
      return "Temporary password must contain at least 8 characters.";
    }

    if (
      !form.department.trim()
    ) {
      return "Department is required.";
    }

    if (
      form.role ===
      "student"
    ) {
      if (
        !form.studentId.trim()
      ) {
        return "Student ID is required.";
      }

      if (
        !form.course.trim()
      ) {
        return "Course is required.";
      }

      if (
        !form.intake.trim()
      ) {
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

    if (
      validationError
    ) {
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

      setShowPassword(
        false
      );

      toast.success(
        "User account created successfully"
      );
    } catch (error) {
      console.error(
        "Create user error:",
        error
      );

      toast.error(
        readableError(
          error
        )
      );
    } finally {
      setCreating(false);
    }
  }


  /* =======================================================
     ACTIVATE / DEACTIVATE
  ======================================================= */

  async function handleStatusChange(
    targetUser
  ) {
    if (
      targetUser.role ===
      "admin"
    ) {
      toast.error(
        "Administrator accounts are protected."
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
      console.error(
        error
      );

      toast.error(
        readableError(
          error
        )
      );
    } finally {
      setStatusChangingId(
        ""
      );
    }
  }


  /* =======================================================
     EDIT USER
  ======================================================= */

  function openEditUser(
    targetUser
  ) {
    setEditUser(
      targetUser
    );

    setEditForm({
      role:
        targetUser.role,

      firstName:
        targetUser.firstName ||
        "",

      lastName:
        targetUser.lastName ||
        "",

      studentId:
        targetUser.studentId ||
        "",

      course:
        targetUser.course ||
        "",

      intake:
        targetUser.intake ||
        "",

      department:
        targetUser.department ||
        "",

      phoneNum:
        targetUser.phoneNum ||
        "",
    });
  }


  async function saveEditedUser(
    event
  ) {
    event.preventDefault();

    if (
      !editUser ||
      !editForm
    ) {
      return;
    }

    if (
      !editForm.firstName.trim()
    ) {
      toast.error(
        "First name is required"
      );

      return;
    }

    if (
      !editForm.department.trim()
    ) {
      toast.error(
        "Department is required"
      );

      return;
    }

    setEditing(true);

    try {
      await updateManagedUserProfile(
        editUser.id,
        editForm
      );

      toast.success(
        "User profile updated"
      );

      setEditUser(null);

      setEditForm(null);
    } catch (error) {
      console.error(
        error
      );

      toast.error(
        readableError(
          error
        )
      );
    } finally {
      setEditing(false);
    }
  }


  /* =======================================================
     PASSWORD RESET
  ======================================================= */

  async function resetUserPassword(
    targetUser
  ) {
    if (
      !targetUser?.email
    ) {
      toast.error(
        "This user has no email address"
      );

      return;
    }

    const confirmed =
      window.confirm(
        `Send a password reset email to ${targetUser.email}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await sendPasswordResetEmail(
        auth,
        targetUser.email
      );

      toast.success(
        `Password reset email sent to ${targetUser.email}`
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


  /* =======================================================
     COPY TEXT
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

      {/* HEADER */}

      <header className="um-page-header">
        <div>
          <div className="um-eyebrow">
            <UsersRound
              size={15}
            />

            Administration
          </div>

<h1 className="biosync-user-title">
  <span>User</span>{" "}
  <span>Management</span>
</h1>

          <p>
            Create, monitor and manage
            BioSync student and teacher
            identities, account access
            and biometric enrollment.
          </p>
        </div>

        <button
          type="button"
          className="um-create-button"
          onClick={() =>
            setCreateOpen(
              true
            )
          }
        >
          <UserPlus
            size={17}
          />

          Create User
        </button>
      </header>


      {/* SUMMARY */}

      <section className="um-summary-grid">
        <div className="um-summary-card">
          <div className="um-summary-icon blue">
            <UsersRound
              size={21}
            />
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
            <GraduationCap
              size={21}
            />
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
            <BriefcaseBusiness
              size={21}
            />
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
            <Fingerprint
              size={21}
            />
          </div>

          <div>
            <span>
              Pending Enrollment
            </span>

            <strong>
              {
                summary.pendingEnrollment
              }
            </strong>
          </div>
        </div>
      </section>


      {/* USERS */}

      <section className="um-users-card">
        <div className="um-toolbar">
          <div className="um-search">
            <Search
              size={17}
            />

            <input
              type="text"
              value={search}
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search name, email, student ID, course or department..."
            />
          </div>

          <div className="um-filters">
            <select
              value={
                roleFilter
              }
              onChange={(
                event
              ) =>
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
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
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

            <select
              value={
                enrollmentFilter
              }
              onChange={(
                event
              ) =>
                setEnrollmentFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Enrollment
              </option>

              <option value="complete">
                Fully Enrolled
              </option>

              <option value="pending">
                Pending Enrollment
              </option>
            </select>

            <select
              value={sortBy}
              onChange={(
                event
              ) =>
                setSortBy(
                  event.target.value
                )
              }
            >
              <option value="newest">
                Newest
              </option>

              <option value="oldest">
                Oldest
              </option>

              <option value="name">
                Name A-Z
              </option>

              <option value="name-desc">
                Name Z-A
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
            Firebase Authentication ·
            Firestore · BioSync Enrollment
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
            <CircleOff
              size={28}
            />

            <strong>
              {loadError}
            </strong>
          </div>
        ) : (
          <div className="um-table-wrap">
            <table className="um-table">
              <thead>
                <tr>
                  <th>
                    User
                  </th>

                  <th>
                    ID
                  </th>

                  <th>
                    Department
                  </th>

                  <th>
                    Role
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Created
                  </th>

                  <th>
                    Enrollment
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map(
                  (item) => {
                    const active =
                      item.active !==
                      false;

                    const profile =
                      authProfiles[
                        item.id
                      ] || {};

                    const progress =
                      getEnrollmentProgress(
                        profile
                      );

                    return (
                      <tr
                        key={
                          item.id
                        }
                      >
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
                          <strong>
                            {item.department ||
                              "—"}
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`um-role-badge ${
                              item.role ||
                              "unknown"
                            }`}
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
                          {item.role ===
                          "admin" ? (
                            <span className="um-protected">
                              <ShieldCheck
                                size={13}
                              />

                              Protected
                            </span>
                          ) : (
                            <div className="um-enrollment-cell">
                              <div className="um-enrollment-icons">
                                <span
                                  className={
                                    getEnrollmentStatus(
                                      profile,
                                      "rfid"
                                    )
                                      ? "ready"
                                      : ""
                                  }
                                  title="RFID"
                                >
                                  <Radio
                                    size={13}
                                  />
                                </span>

                                <span
                                  className={
                                    getEnrollmentStatus(
                                      profile,
                                      "face"
                                    )
                                      ? "ready"
                                      : ""
                                  }
                                  title="Face"
                                >
                                  <ScanFace
                                    size={13}
                                  />
                                </span>

                                <span
                                  className={
                                    getEnrollmentStatus(
                                      profile,
                                      "fingerprint"
                                    )
                                      ? "ready"
                                      : ""
                                  }
                                  title="Fingerprint"
                                >
                                  <Fingerprint
                                    size={13}
                                  />
                                </span>
                              </div>

                              <div className="um-progress">
                                <div>
                                  <span
                                    style={{
                                      width: `${progress.percentage}%`,
                                    }}
                                  />
                                </div>

                                <small>
                                  {
                                    progress.percentage
                                  }
                                  %
                                </small>
                              </div>
                            </div>
                          )}
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

                            {item.role !==
                              "admin" && (
                              <button
                                type="button"
                                className="um-action-button"
                                onClick={() =>
                                  openEditUser(
                                    item
                                  )
                                }
                              >
                                <Pencil
                                  size={14}
                                />

                                Edit
                              </button>
                            )}

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
                      colSpan="8"
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


      {/* CREATE USER MODAL */}

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
                    Create a new Student or
                    Teacher account.
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
                <X
                  size={18}
                />
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
                      Attendance participant
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
                      placeholder="e.g. Ali"
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
                        placeholder="user@biosync.net"
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
                    Password is stored only
                    in Firebase
                    Authentication.
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
                    Department *
                  </span>

                  <div className="um-input">
                    <Building2
                      size={16}
                    />

                    <select
                      name="department"
                      value={
                        form.department
                      }
                      onChange={
                        handleFieldChange
                      }
                    >
                      <option value="">
                        Select department
                      </option>

                      {DEPARTMENT_OPTIONS.map(
                        (
                          department
                        ) => (
                          <option
                            key={
                              department.value
                            }
                            value={
                              department.value
                            }
                          >
                            {
                              department.label
                            }
                          </option>
                        )
                      )}
                    </select>
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
                  Students and teachers must
                  belong to a department.
                  Teachers can only access
                  students in the same
                  department.
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


      {/* CREATED ACCOUNT */}

      {createdCredentials && (
        <div className="um-modal-backdrop">
          <div className="um-modal um-success-modal">
            <div className="um-success-icon">
              <Check
                size={28}
              />
            </div>

            <h2>
              Account Created
            </h2>

            <p className="um-success-copy">
              The new{" "}
              {capitalize(
                createdCredentials.role
              )}{" "}
              account is ready.
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
                Department
              </span>

              <strong>
                {createdCredentials.department ||
                  "Not available"}
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


      {/* USER DETAILS */}

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
                    BioSync account information
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
                <X
                  size={18}
                />
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
                  {
                    selectedUser.email
                  }
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


            {selectedUser.role !==
              "admin" && (
              <div className="um-biometric-section">
                <h4>
                  Biometric Enrollment
                </h4>

                {(() => {
                  const profile =
                    authProfiles[
                      selectedUser.id
                    ] || {};

                  const progress =
                    getEnrollmentProgress(
                      profile
                    );

                  return (
                    <>
                      <div>
                        <div>
                          <Radio
                            size={20}
                          />

                          <span>
                            RFID
                          </span>

                          <strong
                            className={
                              getEnrollmentStatus(
                                profile,
                                "rfid"
                              )
                                ? "ready"
                                : ""
                            }
                          >
                            {getEnrollmentStatus(
                              profile,
                              "rfid"
                            )
                              ? "Enrolled"
                              : "Pending"}
                          </strong>
                        </div>

                        <div>
                          <ScanFace
                            size={20}
                          />

                          <span>
                            Face Recognition
                          </span>

                          <strong
                            className={
                              getEnrollmentStatus(
                                profile,
                                "face"
                              )
                                ? "ready"
                                : ""
                            }
                          >
                            {getEnrollmentStatus(
                              profile,
                              "face"
                            )
                              ? "Enrolled"
                              : "Pending"}
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
                              getEnrollmentStatus(
                                profile,
                                "fingerprint"
                              )
                                ? "ready"
                                : ""
                            }
                          >
                            {getEnrollmentStatus(
                              profile,
                              "fingerprint"
                            )
                              ? "Enrolled"
                              : "Pending"}
                          </strong>
                        </div>
                      </div>

                      <div className="um-progress um-detail-progress">
                        <div>
                          <span
                            style={{
                              width: `${progress.percentage}%`,
                            }}
                          />
                        </div>

                        <small>
                          Overall enrollment:{" "}
                          {
                            progress.percentage
                          }
                          %
                        </small>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}


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
                <>
                  <button
                    type="button"
                    className="um-button secondary"
                    onClick={() =>
                      resetUserPassword(
                        selectedUser
                      )
                    }
                  >
                    <KeyRound
                      size={15}
                    />

                    Reset Password
                  </button>

                  <button
                    type="button"
                    className="um-button primary"
                    onClick={() => {
                      openEditUser(
                        selectedUser
                      );

                      setSelectedUser(
                        null
                      );
                    }}
                  >
                    <Pencil
                      size={15}
                    />

                    Edit User
                  </button>

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
                      ? "Deactivate"
                      : "Activate"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


      {/* EDIT USER */}

      {editUser &&
        editForm && (
        <div className="um-modal-backdrop">
          <form
            className="um-modal um-edit-modal"
            onSubmit={
              saveEditedUser
            }
          >
            <div className="um-modal-header">
              <div>
                <div className="um-modal-icon">
                  <Pencil
                    size={18}
                  />
                </div>

                <div>
                  <h2>
                    Edit User
                  </h2>

                  <p>
                    Update safe BioSync profile information.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="um-close-button"
                onClick={() => {
                  setEditUser(
                    null
                  );

                  setEditForm(
                    null
                  );
                }}
              >
                <X
                  size={18}
                />
              </button>
            </div>


            <div className="um-form-grid">
              <label className="um-field">
                <span>
                  First Name
                </span>

                <div className="um-input">
                  <UserRound
                    size={15}
                  />

                  <input
                    value={
                      editForm.firstName
                    }
                    onChange={(
                      event
                    ) =>
                      setEditForm(
                        (
                          current
                        ) => ({
                          ...current,

                          firstName:
                            event.target.value,
                        })
                      )
                    }
                  />
                </div>
              </label>


              <label className="um-field">
                <span>
                  Last Name
                </span>

                <div className="um-input">
                  <UserRound
                    size={15}
                  />

                  <input
                    value={
                      editForm.lastName
                    }
                    onChange={(
                      event
                    ) =>
                      setEditForm(
                        (
                          current
                        ) => ({
                          ...current,

                          lastName:
                            event.target.value,
                        })
                      )
                    }
                  />
                </div>
              </label>


              {editForm.role ===
                "student" && (
                <>
                  <label className="um-field">
                    <span>
                      Student ID
                    </span>

                    <div className="um-input">
                      <Hash
                        size={15}
                      />

                      <input
                        value={
                          editForm.studentId
                        }
                        onChange={(
                          event
                        ) =>
                          setEditForm(
                            (
                              current
                            ) => ({
                              ...current,

                              studentId:
                                event.target.value,
                            })
                          )
                        }
                      />
                    </div>
                  </label>

                  <label className="um-field">
                    <span>
                      Intake
                    </span>

                    <div className="um-input">
                      <CalendarDays
                        size={15}
                      />

                      <input
                        value={
                          editForm.intake
                        }
                        onChange={(
                          event
                        ) =>
                          setEditForm(
                            (
                              current
                            ) => ({
                              ...current,

                              intake:
                                event.target.value,
                            })
                          )
                        }
                      />
                    </div>
                  </label>

                  <label className="um-field um-span-2">
                    <span>
                      Course
                    </span>

                    <div className="um-input">
                      <BookOpen
                        size={15}
                      />

                      <input
                        value={
                          editForm.course
                        }
                        onChange={(
                          event
                        ) =>
                          setEditForm(
                            (
                              current
                            ) => ({
                              ...current,

                              course:
                                event.target.value,
                            })
                          )
                        }
                      />
                    </div>
                  </label>
                </>
              )}


              <label className="um-field">
                <span>
                  Department
                </span>

                <div className="um-input">
                  <Building2
                    size={15}
                  />

                  <select
                    value={
                      editForm.department
                    }
                    onChange={(
                      event
                    ) =>
                      setEditForm(
                        (
                          current
                        ) => ({
                          ...current,

                          department:
                            event.target.value,
                        })
                      )
                    }
                  >
                    <option value="">
                      Select department
                    </option>

                    {DEPARTMENT_OPTIONS.map(
                      (
                        department
                      ) => (
                        <option
                          key={
                            department.value
                          }
                          value={
                            department.value
                          }
                        >
                          {
                            department.label
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </label>


              <label className="um-field">
                <span>
                  Phone Number
                </span>

                <div className="um-input">
                  <Phone
                    size={15}
                  />

                  <input
                    value={
                      editForm.phoneNum
                    }
                    onChange={(
                      event
                    ) =>
                      setEditForm(
                        (
                          current
                        ) => ({
                          ...current,

                          phoneNum:
                            event.target.value,
                        })
                      )
                    }
                  />
                </div>
              </label>
            </div>


            <div className="um-security-note">
              <ShieldCheck
                size={16}
              />

              <p>
                Firebase UID, login email,
                role and biometric templates
                cannot be changed here.
              </p>
            </div>


            <div className="um-modal-actions">
              <button
                type="button"
                className="um-button secondary"
                onClick={() => {
                  setEditUser(
                    null
                  );

                  setEditForm(
                    null
                  );
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="um-button primary"
                disabled={
                  editing
                }
              >
                {editing ? (
                  <>
                    <LoaderCircle
                      size={15}
                      className="um-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <Save
                      size={15}
                    />

                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default UserManagement;
