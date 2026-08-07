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

function getTime(value) {
  if (!value) return 0;

  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().getTime();
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
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
  const usersRef = collection(
    db,
    "users"
  );

  return onSnapshot(
    usersRef,
    (snapshot) => {
      const users = snapshot.docs
        .map((userDoc) => ({
          id: userDoc.id,
          uid: userDoc.id,
          ...userDoc.data(),
        }))
        .sort(
          (a, b) =>
            getTime(b.createdAt) -
            getTime(a.createdAt)
        );

      onData(users);
    },
    (error) => {
      console.error(
        "User Management subscription error:",
        error
      );

      if (onError) {
        onError(error);
      }
    }
  );
}

/* =========================================================
   CREATE USER

   Secondary Auth is used so the currently logged-in
   administrator is NOT replaced by the new user.
========================================================= */

export async function createManagedUser(
  formData
) {
  const role = clean(
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

  const email = clean(
    formData.email
  ).toLowerCase();

  const password = String(
    formData.password || ""
  );

  if (!email) {
    throw new Error(
      "Email address is required."
    );
  }

  if (password.length < 8) {
    throw new Error(
      "Temporary password must contain at least 8 characters."
    );
  }

  let createdFirebaseUser = null;
  let firestoreCreated = false;

  try {
    /* -------------------------------------------------------
       CREATE FIREBASE AUTH ACCOUNT
    ------------------------------------------------------- */

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

    /* -------------------------------------------------------
       BASE FIRESTORE PROFILE
    ------------------------------------------------------- */

    const userDocument = {
      active: true,
      createdAt: serverTimestamp(),
      email,
      firstName: clean(
        formData.firstName
      ),
      lastName: clean(
        formData.lastName
      ),
      role,
    };

    /* -------------------------------------------------------
       STUDENT FIELDS
    ------------------------------------------------------- */

    if (role === "student") {
      userDocument.studentId =
        clean(formData.studentId);

      userDocument.course =
        clean(formData.course);

      userDocument.department =
        clean(formData.department);

      userDocument.intake =
        clean(formData.intake);

      if (clean(formData.phoneNum)) {
        userDocument.phoneNum =
          clean(formData.phoneNum);
      }
    }

    /* -------------------------------------------------------
       TEACHER OPTIONAL FIELDS
    ------------------------------------------------------- */

    if (role === "teacher") {
      if (clean(formData.department)) {
        userDocument.department =
          clean(formData.department);
      }

      if (clean(formData.phoneNum)) {
        userDocument.phoneNum =
          clean(formData.phoneNum);
      }
    }

    /* -------------------------------------------------------
       CREATE USERS/{UID}
    ------------------------------------------------------- */

    await setDoc(
      doc(
        db,
        "users",
        uid
      ),
      userDocument
    );

    firestoreCreated = true;

    return {
      uid,
      email,
      role,
      firstName:
        userDocument.firstName,
      lastName:
        userDocument.lastName,
    };
  } catch (error) {
    /*
      If Authentication succeeded but Firestore failed,
      remove the newly created Authentication account.

      This prevents orphan Firebase Auth users.
    */

    if (
      createdFirebaseUser &&
      !firestoreCreated
    ) {
      try {
        await deleteUser(
          createdFirebaseUser
        );
      } catch (rollbackError) {
        console.error(
          "Unable to rollback Firebase Auth user:",
          rollbackError
        );
      }
    }

    throw error;
  } finally {
    /*
      Always sign out SECONDARY Auth only.
      Primary admin Auth remains logged in.
    */

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
   ACTIVATE / DEACTIVATE USER
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
      active: Boolean(active),
    }
  );
}