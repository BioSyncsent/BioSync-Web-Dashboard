import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  db,
  secondaryAuth,
} from "../firebase/firebase";

/* =========================================================
   HELPERS
========================================================= */

function clean(value) {
  return String(value || "").trim();
}

function normalizeDepartment(value) {
  const department = clean(value);

  const normalized = department
    .toLowerCase()
    .replace(/\s+/g, " ");

  if (
    normalized === "cid" ||
    normalized === "computer information" ||
    normalized === "computer information department"
  ) {
    return "CID";
  }

  return department;
}

function getTime(value) {
  if (!value) return 0;

  if (
    typeof value?.toMillis ===
    "function"
  ) {
    return value.toMillis();
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value.toDate().getTime();
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? 0
    : date.getTime();
}

/* =========================================================
   REAL-TIME USER LIST
========================================================= */

export function subscribeToManagedUsers(
  onData,
  onError
) {
  return onSnapshot(
    collection(
      db,
      "users"
    ),

    (snapshot) => {
      const users =
        snapshot.docs
          .map(
            (userDoc) => ({
              id:
                userDoc.id,

              uid:
                userDoc.id,

              ...userDoc.data(),
            })
          )
          .sort(
            (
              a,
              b
            ) =>
              getTime(
                b.createdAt
              ) -
              getTime(
                a.createdAt
              )
          );

      onData(users);
    },

    (error) => {
      console.error(
        "User Management subscription error:",
        error
      );

      onError?.(error);
    }
  );
}

/* =========================================================
   REAL-TIME AUTH PROFILE LIST
========================================================= */

export function subscribeToManagedAuthProfiles(
  onData,
  onError
) {
  return onSnapshot(
    collection(
      db,
      "authProfile"
    ),

    (snapshot) => {
      const profiles = {};

      snapshot.docs.forEach(
        (document) => {
          profiles[
            document.id
          ] = {
            id:
              document.id,

            ...document.data(),
          };
        }
      );

      onData(profiles);
    },

    (error) => {
      console.warn(
        "Auth profile subscription unavailable:",
        error
      );

      onError?.(error);
    }
  );
}

/* =========================================================
   CREATE USER
========================================================= */

export async function createManagedUser(
  formData
) {
  const role =
    clean(
      formData.role
    ).toLowerCase();

  if (
    role !== "student" &&
    role !== "teacher"
  ) {
    throw new Error(
      "Only Student and Teacher accounts can be created."
    );
  }

  const email =
    clean(
      formData.email
    ).toLowerCase();

  const password =
    String(
      formData.password ||
        ""
    );

  const department =
    normalizeDepartment(
      formData.department
    );

  if (!email) {
    throw new Error(
      "Email address is required."
    );
  }

  if (
    password.length < 8
  ) {
    throw new Error(
      "Temporary password must contain at least 8 characters."
    );
  }

  if (!department) {
    throw new Error(
      "Department is required for Student and Teacher accounts."
    );
  }

  let createdFirebaseUser =
    null;

  let firestoreCreated =
    false;

  try {
    const credential =
      await createUserWithEmailAndPassword(
        secondaryAuth,
        email,
        password
      );

    createdFirebaseUser =
      credential.user;

    const uid =
      createdFirebaseUser.uid;

    const userDocument = {
      active: true,

      createdAt:
        serverTimestamp(),

      email,

      firstName:
        clean(
          formData.firstName
        ),

      lastName:
        clean(
          formData.lastName
        ),

      role,

      department,
    };

    if (
      clean(
        formData.phoneNum
      )
    ) {
      userDocument.phoneNum =
        clean(
          formData.phoneNum
        );
    }

    if (
      role === "student"
    ) {
      userDocument.studentId =
        clean(
          formData.studentId
        );

      userDocument.course =
        clean(
          formData.course
        );

      userDocument.intake =
        clean(
          formData.intake
        );
    }

    await setDoc(
      doc(
        db,
        "users",
        uid
      ),
      userDocument
    );

    await setDoc(
      doc(
        db,
        "authProfile",
        uid
      ),
      {
        userId: uid,

        rfidStatus:
          "pending",

        faceStatus:
          "pending",

        fingerprintStatus:
          "pending",

        registrationStatus:
          "pending",

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    firestoreCreated =
      true;

    return {
      uid,
      email,
      role,

      firstName:
        userDocument.firstName,

      lastName:
        userDocument.lastName,

      department,
    };
  } catch (error) {
    if (
      createdFirebaseUser &&
      !firestoreCreated
    ) {
      try {
        await deleteUser(
          createdFirebaseUser
        );
      } catch (
        rollbackError
      ) {
        console.error(
          "Unable to rollback Firebase Auth user:",
          rollbackError
        );
      }
    }

    throw error;
  } finally {
    try {
      await signOut(
        secondaryAuth
      );
    } catch (error) {
      console.warn(
        "Secondary Firebase Auth sign-out warning:",
        error
      );
    }
  }
}

/* =========================================================
   UPDATE SAFE USER PROFILE FIELDS
========================================================= */

export async function updateManagedUserProfile(
  userId,
  values
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  const role =
    clean(
      values.role
    ).toLowerCase();

  const payload = {
    firstName:
      clean(
        values.firstName
      ),

    lastName:
      clean(
        values.lastName
      ),

    department:
      normalizeDepartment(
        values.department
      ),

    phoneNum:
      clean(
        values.phoneNum
      ),

    updatedAt:
      serverTimestamp(),
  };

  if (
    role === "student"
  ) {
    payload.studentId =
      clean(
        values.studentId
      );

    payload.course =
      clean(
        values.course
      );

    payload.intake =
      clean(
        values.intake
      );
  }

  await updateDoc(
    doc(
      db,
      "users",
      userId
    ),
    payload
  );
}

/* =========================================================
   ACTIVATE / DEACTIVATE
========================================================= */

export async function updateManagedUserStatus(
  userId,
  active
) {
  if (!userId) {
    throw new Error(
      "User ID is required."
    );
  }

  await updateDoc(
    doc(
      db,
      "users",
      userId
    ),
    {
      active:
        Boolean(active),

      updatedAt:
        serverTimestamp(),
    }
  );
}