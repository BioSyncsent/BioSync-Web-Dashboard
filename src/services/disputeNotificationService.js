import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

/* =========================================================
   HELPERS
========================================================= */

function toSafeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value?.toDate === "function"
  ) {
    return value.toDate();
  }

  const convertedDate = new Date(value);

  return Number.isNaN(
    convertedDate.getTime()
  )
    ? null
    : convertedDate;
}

function toMilliseconds(value) {
  const date = toSafeDate(value);

  return date
    ? date.getTime()
    : 0;
}

function normalizeStatus(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/* =========================================================
   ADMIN NOTIFICATION

   Counts disputes submitted after the admin last clicked
   the Disputes sidebar link.
========================================================= */

export function subscribeToAdminDisputeNotificationCount(
  lastSeenAt,
  onData,
  onError
) {
  const safeLastSeenAt =
    Number(lastSeenAt) || 0;

  return onSnapshot(
    collection(db, "disputes"),

    (snapshot) => {
      const count = snapshot.docs.filter(
        (disputeDocument) => {
          const data =
            disputeDocument.data();

          const submittedTime =
            toMilliseconds(
              data.submittedAt ??
                data.createdAt ??
                data.timestamp
            );

          const status =
            normalizeStatus(data.status);

          if (!submittedTime) {
            return false;
          }

          if (status === "cancelled") {
            return false;
          }

          return (
            submittedTime >
            safeLastSeenAt
          );
        }
      ).length;

      console.log(
        "Admin new dispute count:",
        count
      );

      onData(count);
    },

    (error) => {
      console.error(
        "Unable to load admin dispute notifications:",
        error
      );

      onError?.(error);
    }
  );
}

/* =========================================================
   STUDENT NOTIFICATION

   Counts disputes that received an admin response after
   the student last clicked the Disputes sidebar link.
========================================================= */

export function subscribeToStudentResponseNotificationCount(
  studentUid,
  lastSeenAt,
  onData,
  onError
) {
  if (!studentUid) {
    onData(0);
    return () => {};
  }

  const safeLastSeenAt =
    Number(lastSeenAt) || 0;

  const studentDisputeQuery = query(
    collection(db, "disputes"),
    where("userId", "==", studentUid)
  );

  return onSnapshot(
    studentDisputeQuery,

    (snapshot) => {
      const count = snapshot.docs.filter(
        (disputeDocument) => {
          const data =
            disputeDocument.data();

          const responseTime =
            toMilliseconds(
              data.reviewedAt ??
                data.resolvedAt
            );

          const status =
            normalizeStatus(data.status);

          if (!responseTime) {
            return false;
          }

          if (
            status === "pending" ||
            status === "cancelled"
          ) {
            return false;
          }

          return (
            responseTime >
            safeLastSeenAt
          );
        }
      ).length;

      console.log(
        "Student new response count:",
        count
      );

      onData(count);
    },

    (error) => {
      console.error(
        "Unable to load student response notifications:",
        error
      );

      onError?.(error);
    }
  );
}