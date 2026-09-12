import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  db,
} from "../firebase/firebase";

/* =========================================================
   HELPERS
========================================================= */

function toSafeDate(
  value
) {
  if (!value) {
    return null;
  }

  if (
    value instanceof
    Date
  ) {
    return value;
  }

  if (
    typeof value?.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function toMilliseconds(
  value
) {
  return (
    toSafeDate(
      value
    )?.getTime?.() ||
    0
  );
}

function normalizeStatus(
  value
) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(
      /[\s-]+/g,
      "_"
    );
}

/* =========================================================
   ADMIN
   NEW STUDENT DISPUTE NOTIFICATIONS
========================================================= */

export function subscribeToAdminDisputeNotificationCount(
  lastSeenAt,
  onData,
  onError
) {
  const safeLastSeen =
    Number(
      lastSeenAt
    ) ||
    0;

  return onSnapshot(
    collection(
      db,
      "disputes"
    ),

    (snapshot) => {
      const count =
        snapshot.docs.filter(
          (document) => {
            const data =
              document.data();

            const submittedAt =
              toMilliseconds(
                data.submittedAt ??
                  data.createdAt
              );

            /*
              Admin is notified about every
              NEW dispute submission.

              We intentionally do not require
              status === pending because the
              teacher may review it before the
              administrator opens the page.
            */

            return (
              submittedAt >
              safeLastSeen
            );
          }
        ).length;

      onData(
        count
      );
    },

    (error) => {
      console.error(
        "Admin dispute notification error:",
        error
      );

      onError?.(
        error
      );
    }
  );
}

/* =========================================================
   TEACHER
   NEW SAME-DEPARTMENT DISPUTES
========================================================= */

export function subscribeToTeacherDisputeNotificationCount(
  department,
  lastSeenAt,
  onData,
  onError
) {
  if (
    !department
  ) {
    onData(0);

    return () => {};
  }

  const disputeQuery =
    query(
      collection(
        db,
        "disputes"
      ),

      where(
        "department",
        "==",
        department
      )
    );

  const safeLastSeen =
    Number(
      lastSeenAt
    ) ||
    0;

  return onSnapshot(
    disputeQuery,

    (snapshot) => {
      const count =
        snapshot.docs.filter(
          (document) => {
            const data =
              document.data();

            const submittedAt =
              toMilliseconds(
                data.submittedAt ??
                  data.createdAt
              );

            const status =
              normalizeStatus(
                data.status
              );

            return (
              submittedAt >
                safeLastSeen &&
              status ===
                "pending"
            );
          }
        ).length;

      onData(
        count
      );
    },

    (error) => {
      console.error(
        "Teacher dispute notification error:",
        error
      );

      onError?.(
        error
      );
    }
  );
}

/* =========================================================
   STUDENT
   NEW TEACHER RESPONSE
========================================================= */

export function subscribeToStudentResponseNotificationCount(
  studentUid,
  lastSeenAt,
  onData,
  onError
) {
  if (
    !studentUid
  ) {
    onData(0);

    return () => {};
  }

  const studentQuery =
    query(
      collection(
        db,
        "disputes"
      ),

      where(
        "userId",
        "==",
        studentUid
      )
    );

  const safeLastSeen =
    Number(
      lastSeenAt
    ) ||
    0;

  return onSnapshot(
    studentQuery,

    (snapshot) => {
      const count =
        snapshot.docs.filter(
          (document) => {
            const data =
              document.data();

            const responseTime =
              toMilliseconds(
                data.reviewedAt ??
                  data.resolvedAt
              );

            const status =
              normalizeStatus(
                data.status
              );

            return (
              responseTime >
                safeLastSeen &&
              [
                "approved",
                "rejected",
              ].includes(
                status
              )
            );
          }
        ).length;

      onData(
        count
      );
    },

    (error) => {
      console.error(
        "Student dispute response notification error:",
        error
      );

      onError?.(
        error
      );
    }
  );
}