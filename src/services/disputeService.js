import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "../firebase/firebase";

/* =========================================================
   GENERAL HELPERS
========================================================= */

function toSafeDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value?.toDate === "function") {
    return value.toDate();
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime())
    ? null
    : parsedDate;
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeDisputeStatus(value) {
  const status = normalizeText(value).replace(
    /[\s-]+/g,
    "_"
  );

  if (!status) {
    return "pending";
  }

  if (
    status === "under_review" ||
    status === "reviewing"
  ) {
    return "under_review";
  }

  if (
    status === "awaiting_information" ||
    status === "awaiting_info"
  ) {
    return "awaiting_information";
  }

  if (status === "approved") {
    return "approved";
  }

  if (status === "rejected") {
    return "rejected";
  }

  if (status === "cancelled") {
    return "cancelled";
  }

  if (status === "closed") {
    return "closed";
  }

  return "pending";
}

function normalizeAttendanceStatus(value) {
  const status = normalizeText(value);

  if (status.includes("present")) {
    return "present";
  }

  if (status.includes("late")) {
    return "late";
  }

  if (status.includes("absent")) {
    return "absent";
  }

  if (status.includes("excused")) {
    return "excused";
  }

  return "unknown";
}

function getUserName(user, fallback = {}) {
  const fullName = [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName ||
    fallback.studentName ||
    fallback.userName ||
    fallback.name ||
    "Unknown Student"
  );
}

function formatDateLabel(value) {
  const date = toSafeDate(value);

  if (!date) {
    return "N/A";
  }

  return date.toLocaleDateString("en-MY");
}

function formatTimeLabel(value) {
  const date = toSafeDate(value);

  if (!date) {
    return "N/A";
  }

  return date.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   RECORD NORMALIZATION
========================================================= */

function normalizeAttendanceDocument(
  attendanceDocument
) {
  const raw = attendanceDocument.data();

  const timestamp = toSafeDate(
    raw.timestamp ??
      raw.date ??
      raw.checkInTime ??
      raw.createdAt
  );

  return {
    id: attendanceDocument.id,

    userId:
      raw.userId ||
      raw.uid ||
      "",

    name:
      raw.name ||
      raw.studentName ||
      raw.fullName ||
      "Unknown Student",

    studentId:
      raw.studentId ||
      "N/A",

    status: normalizeAttendanceStatus(
      raw.status
    ),

    authMethod:
      raw.authMethod ||
      raw.authenticationMethod ||
      raw.method ||
      "Unknown",

    deviceId:
      raw.deviceId ||
      raw.terminalId ||
      "N/A",

    deviceName:
      raw.deviceName ||
      raw.terminalName ||
      raw.deviceId ||
      "N/A",

    location:
      raw.location ||
      raw.terminalLocation ||
      raw.deviceLocation ||
      "N/A",

    verificationResult:
      raw.verificationResult ||
      raw.verificationStatus ||
      "N/A",

    timestamp,

    dateLabel: formatDateLabel(timestamp),

    timeLabel: formatTimeLabel(timestamp),

    raw,
  };
}

function normalizeDisputeDocument(
  disputeDocument,
  usersMap,
  attendanceMap
) {
  const raw = disputeDocument.data();

  const userId =
    raw.userId ||
    raw.uid ||
    "";

  const attendanceId =
    raw.attendanceId ||
    raw.attendanceRecordId ||
    "";

  const user = usersMap[userId] || null;

  const attendance =
    attendanceMap[attendanceId] || null;

  const submittedAt = toSafeDate(
    raw.submittedAt ??
      raw.createdAt ??
      raw.timestamp
  );

  const reviewedAt = toSafeDate(
    raw.reviewedAt
  );

  const resolvedAt = toSafeDate(
    raw.resolvedAt ??
      raw.updatedAt
  );

  return {
    id: disputeDocument.id,

    userId,
    attendanceId,

    studentName: getUserName(user, raw),

    studentId:
      user?.studentId ||
      raw.studentId ||
      "N/A",

    email:
      user?.email ||
      raw.email ||
      "N/A",

    course:
      user?.course ||
      raw.course ||
      "N/A",

    department:
      user?.department ||
      raw.department ||
      "N/A",

    reason:
      raw.reason ||
      "No reason provided.",

    description:
      raw.description ||
      raw.explanation ||
      "",

    originalStatus:
      normalizeAttendanceStatus(
        raw.originalStatus ||
          attendance?.status
      ),

    requestedStatus:
      normalizeAttendanceStatus(
        raw.requestedStatus ||
          raw.requestedCorrection
      ),

    status: normalizeDisputeStatus(
      raw.status
    ),

    priority: normalizeText(
      raw.priority || "normal"
    ),

    evidenceUrl:
      raw.evidenceUrl ||
      raw.attachmentUrl ||
      "",

    adminComment:
      raw.adminComment ||
      raw.reviewComment ||
      "",

    teacherComment:
      raw.teacherComment ||
      "",

    teacherRecommendation:
      raw.teacherRecommendation ||
      "",

    submittedAt,
    reviewedAt,
    resolvedAt,

    reviewedBy:
      raw.reviewedBy ||
      null,

    cancelledAt: toSafeDate(
      raw.cancelledAt
    ),

    attendance: attendance
      ? {
          ...attendance,
          originalStatus:
            attendance.status,
        }
      : null,

    raw,
  };
}

/* =========================================================
   ADMIN: REAL-TIME DISPUTE MANAGEMENT
========================================================= */

export function subscribeToDisputesManagement(
  onData,
  onError
) {
  let disputeDocuments = [];
  let usersMap = {};
  let attendanceMap = {};

  let disputesReady = false;
  let usersReady = false;
  let attendanceReady = false;

  function emitDisputes() {
    if (
      !disputesReady ||
      !usersReady ||
      !attendanceReady
    ) {
      return;
    }

    const disputes = disputeDocuments
      .map((disputeDocument) =>
        normalizeDisputeDocument(
          disputeDocument,
          usersMap,
          attendanceMap
        )
      )
      .sort((first, second) => {
        const firstTime =
          first.submittedAt?.getTime?.() ||
          0;

        const secondTime =
          second.submittedAt?.getTime?.() ||
          0;

        return secondTime - firstTime;
      });

    onData(disputes);
  }

  const unsubscribeUsers = onSnapshot(
    collection(db, "users"),

    (snapshot) => {
      const nextUsersMap = {};

      snapshot.docs.forEach(
        (userDocument) => {
          nextUsersMap[userDocument.id] = {
            id: userDocument.id,
            ...userDocument.data(),
          };
        }
      );

      usersMap = nextUsersMap;
      usersReady = true;

      emitDisputes();
    },

    (error) => {
      console.error(
        "Unable to subscribe to users:",
        error
      );

      onError?.(error);
    }
  );

  const unsubscribeAttendance =
    onSnapshot(
      collection(db, "attendance"),

      (snapshot) => {
        const nextAttendanceMap = {};

        snapshot.docs.forEach(
          (attendanceDocument) => {
            nextAttendanceMap[
              attendanceDocument.id
            ] =
              normalizeAttendanceDocument(
                attendanceDocument
              );
          }
        );

        attendanceMap =
          nextAttendanceMap;

        attendanceReady = true;

        emitDisputes();
      },

      (error) => {
        console.error(
          "Unable to subscribe to attendance:",
          error
        );

        onError?.(error);
      }
    );

  const unsubscribeDisputes =
    onSnapshot(
      collection(db, "disputes"),

      (snapshot) => {
        disputeDocuments =
          snapshot.docs;

        disputesReady = true;

        emitDisputes();
      },

      (error) => {
        console.error(
          "Unable to subscribe to disputes:",
          error
        );

        onError?.(error);
      }
    );

  return () => {
    unsubscribeUsers();
    unsubscribeAttendance();
    unsubscribeDisputes();
  };
}

/* =========================================================
   DASHBOARD: PENDING DISPUTE COUNT
========================================================= */

export function subscribeToPendingDisputes(
  onData,
  onError
) {
  return onSnapshot(
    collection(db, "disputes"),

    (snapshot) => {
      const pendingCount =
        snapshot.docs.filter(
          (disputeDocument) => {
            return (
              normalizeDisputeStatus(
                disputeDocument.data().status
              ) === "pending"
            );
          }
        ).length;

      onData(pendingCount);
    },

    (error) => {
      console.error(
        "Unable to subscribe to pending disputes:",
        error
      );

      onError?.(error);
    }
  );
}

/* =========================================================
   STUDENT: OWN ATTENDANCE RECORDS
========================================================= */

export function subscribeToStudentAttendance(
  student,
  onData,
  onError
) {
  if (!student?.uid) {
    onData([]);
    return () => {};
  }

  const attendanceQuery = query(
    collection(db, "attendance"),
    where("userId", "==", student.uid)
  );

  return onSnapshot(
    attendanceQuery,

    (snapshot) => {
      const records = snapshot.docs
        .map((attendanceDocument) =>
          normalizeAttendanceDocument(
            attendanceDocument
          )
        )
        .sort((first, second) => {
          const firstTime =
            first.timestamp?.getTime?.() ||
            0;

          const secondTime =
            second.timestamp?.getTime?.() ||
            0;

          return secondTime - firstTime;
        });

      console.log(
        "Logged-in student UID:",
        student.uid
      );

      console.log(
        "Student attendance records:",
        records
      );

      onData(records);
    },

    (error) => {
      console.error(
        "Unable to load student attendance:",
        error
      );

      onError?.(error);
    }
  );
}

/* =========================================================
   STUDENT: OWN DISPUTES
========================================================= */

export function subscribeToStudentDisputes(
  student,
  onData,
  onError
) {
  if (!student?.uid) {
    onData([]);
    return () => {};
  }

  let disputeDocuments = [];
  let attendanceMap = {};

  let disputesReady = false;
  let attendanceReady = false;

  function emitStudentDisputes() {
    if (
      !disputesReady ||
      !attendanceReady
    ) {
      return;
    }

    const usersMap = {
      [student.uid]: student,
    };

    const disputes = disputeDocuments
      .map((disputeDocument) =>
        normalizeDisputeDocument(
          disputeDocument,
          usersMap,
          attendanceMap
        )
      )
      .sort((first, second) => {
        const firstTime =
          first.submittedAt?.getTime?.() ||
          0;

        const secondTime =
          second.submittedAt?.getTime?.() ||
          0;

        return secondTime - firstTime;
      });

    onData(disputes);
  }

  const attendanceQuery = query(
    collection(db, "attendance"),
    where("userId", "==", student.uid)
  );

  const disputeQuery = query(
    collection(db, "disputes"),
    where("userId", "==", student.uid)
  );

  const unsubscribeAttendance =
    onSnapshot(
      attendanceQuery,

      (snapshot) => {
        const nextAttendanceMap = {};

        snapshot.docs.forEach(
          (attendanceDocument) => {
            nextAttendanceMap[
              attendanceDocument.id
            ] =
              normalizeAttendanceDocument(
                attendanceDocument
              );
          }
        );

        attendanceMap =
          nextAttendanceMap;

        attendanceReady = true;

        emitStudentDisputes();
      },

      (error) => {
        console.error(
          "Unable to load student attendance for disputes:",
          error
        );

        onError?.(error);
      }
    );

  const unsubscribeDisputes =
    onSnapshot(
      disputeQuery,

      (snapshot) => {
        disputeDocuments =
          snapshot.docs;

        disputesReady = true;

        emitStudentDisputes();
      },

      (error) => {
        console.error(
          "Unable to load student disputes:",
          error
        );

        onError?.(error);
      }
    );

  return () => {
    unsubscribeAttendance();
    unsubscribeDisputes();
  };
}

/* =========================================================
   AUDIT LOG
========================================================= */

async function createDisputeAuditLog({
  action,
  actor,
  disputeId,
  attendanceId,
  details = {},
}) {
  if (!actor?.uid) {
    console.warn(
      "Audit log skipped because actor UID is missing."
    );

    return;
  }

  try {
    await addDoc(
      collection(db, "auditLogs"),
      {
        action,

        actorId: actor.uid,

        actorEmail:
          actor.email ||
          null,

        actorName:
          actor.fullName ||
          actor.email ||
          "Unknown User",

        actorRole:
          actor.role ||
          "unknown",

        targetType: "dispute",

        targetId:
          disputeId ||
          null,

        attendanceId:
          attendanceId ||
          null,

        details,

        timestamp: serverTimestamp(),
      }
    );
  } catch (error) {
    /*
      The main dispute action should not fail
      only because the audit log failed.
    */
    console.error(
      "Unable to create dispute audit log:",
      error
    );
  }
}

/* =========================================================
   STUDENT: CREATE DISPUTE
========================================================= */

export async function createStudentDispute(
  formData,
  student,
  existingDisputes = []
) {
  if (!student?.uid) {
    throw new Error(
      "You must be logged in to submit a dispute."
    );
  }

  if (!formData.attendanceId) {
    throw new Error(
      "Please select an attendance record."
    );
  }

  if (!formData.reason?.trim()) {
    throw new Error(
      "Please select a dispute reason."
    );
  }

  if (!formData.description?.trim()) {
    throw new Error(
      "Please provide an explanation."
    );
  }

  if (!formData.requestedStatus) {
    throw new Error(
      "Please select the requested attendance status."
    );
  }

  const activeStatuses = [
    "pending",
    "under_review",
    "awaiting_information",
  ];

  const duplicateDispute =
    existingDisputes.some((dispute) => {
      return (
        dispute.attendanceId ===
          formData.attendanceId &&
        activeStatuses.includes(
          dispute.status
        )
      );
    });

  if (duplicateDispute) {
    throw new Error(
      "An active dispute already exists for this attendance record."
    );
  }

  const studentName =
    student.fullName ||
    [
      student.firstName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ")
      .trim();

  const disputeReference = await addDoc(
    collection(db, "disputes"),
    {
      userId: student.uid,

      studentId:
        student.studentId ||
        "",

      studentName:
        studentName ||
        "Unknown Student",

      email:
        student.email ||
        "",

      course:
        student.course ||
        "",

      department:
        student.department ||
        "",

      attendanceId:
        formData.attendanceId,

      originalStatus:
        normalizeAttendanceStatus(
          formData.originalStatus
        ),

      requestedStatus:
        normalizeAttendanceStatus(
          formData.requestedStatus
        ),

      reason:
        formData.reason.trim(),

      description:
        formData.description.trim(),

      evidenceUrl:
        formData.evidenceUrl?.trim() ||
        "",

      status: "pending",

      priority: "normal",

      adminComment: "",

      teacherComment: "",

      teacherRecommendation: "",

      reviewedBy: null,

      submittedAt: serverTimestamp(),

      reviewedAt: null,

      resolvedAt: null,

      cancelledAt: null,

      createdAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    }
  );

  await createDisputeAuditLog({
    action: "dispute_submitted",

    actor: student,

    disputeId:
      disputeReference.id,

    attendanceId:
      formData.attendanceId,

    details: {
      originalStatus:
        normalizeAttendanceStatus(
          formData.originalStatus
        ),

      requestedStatus:
        normalizeAttendanceStatus(
          formData.requestedStatus
        ),

      reason:
        formData.reason.trim(),
    },
  });

  return disputeReference.id;
}

/* =========================================================
   STUDENT: UPDATE PENDING DISPUTE
========================================================= */

export async function updateStudentDispute(
  disputeId,
  formData,
  student
) {
  if (!disputeId) {
    throw new Error(
      "Dispute ID is required."
    );
  }

  if (!student?.uid) {
    throw new Error(
      "You must be logged in."
    );
  }

  if (!formData.reason?.trim()) {
    throw new Error(
      "Please select a dispute reason."
    );
  }

  if (!formData.description?.trim()) {
    throw new Error(
      "Please provide an explanation."
    );
  }

  if (!formData.requestedStatus) {
    throw new Error(
      "Please select the requested attendance status."
    );
  }

  await updateDoc(
    doc(db, "disputes", disputeId),
    {
      requestedStatus:
        normalizeAttendanceStatus(
          formData.requestedStatus
        ),

      reason:
        formData.reason.trim(),

      description:
        formData.description.trim(),

      evidenceUrl:
        formData.evidenceUrl?.trim() ||
        "",

      updatedAt: serverTimestamp(),
    }
  );

  await createDisputeAuditLog({
    action: "dispute_updated",

    actor: student,

    disputeId,

    attendanceId:
      formData.attendanceId,

    details: {
      requestedStatus:
        normalizeAttendanceStatus(
          formData.requestedStatus
        ),

      reason:
        formData.reason.trim(),
    },
  });
}

/* =========================================================
   STUDENT: CANCEL PENDING DISPUTE
========================================================= */

export async function cancelStudentDispute(
  dispute,
  student
) {
  if (!dispute?.id) {
    throw new Error(
      "Dispute ID is required."
    );
  }

  if (!student?.uid) {
    throw new Error(
      "You must be logged in."
    );
  }

  if (dispute.status !== "pending") {
    throw new Error(
      "Only pending disputes can be cancelled."
    );
  }

  await updateDoc(
    doc(db, "disputes", dispute.id),
    {
      status: "cancelled",

      cancelledAt: serverTimestamp(),

      updatedAt: serverTimestamp(),
    }
  );

  await createDisputeAuditLog({
    action: "dispute_cancelled",

    actor: student,

    disputeId: dispute.id,

    attendanceId:
      dispute.attendanceId,

    details: {
      previousStatus:
        dispute.status,
    },
  });
}

/* =========================================================
   ADMIN: REVIEW DISPUTE
========================================================= */

export async function reviewDispute({
  disputeId,
  attendanceId,
  status,
  adminComment,
  correctedAttendanceStatus,
  adminUser,
}) {
  if (!disputeId) {
    throw new Error(
      "Dispute ID is required."
    );
  }

  if (!adminUser?.uid) {
    throw new Error(
      "Administrator information is missing."
    );
  }

  const normalizedStatus =
    normalizeDisputeStatus(status);

  const allowedStatuses = [
    "pending",
    "under_review",
    "awaiting_information",
    "approved",
    "rejected",
    "closed",
  ];

  if (
    !allowedStatuses.includes(
      normalizedStatus
    )
  ) {
    throw new Error(
      "The selected dispute status is invalid."
    );
  }

  const finalStatuses = [
    "approved",
    "rejected",
    "closed",
  ];

  const disputeUpdate = {
    status: normalizedStatus,

    adminComment:
      adminComment?.trim() ||
      "",

    reviewedBy:
      adminUser.uid,

    reviewedAt: serverTimestamp(),

    updatedAt: serverTimestamp(),
  };

  if (
    finalStatuses.includes(
      normalizedStatus
    )
  ) {
    disputeUpdate.resolvedAt =
      serverTimestamp();
  }

  await updateDoc(
    doc(db, "disputes", disputeId),
    disputeUpdate
  );

  if (
    normalizedStatus === "approved" &&
    attendanceId &&
    correctedAttendanceStatus
  ) {
    const normalizedCorrection =
      normalizeAttendanceStatus(
        correctedAttendanceStatus
      );

    if (
      normalizedCorrection === "unknown"
    ) {
      throw new Error(
        "The corrected attendance status is invalid."
      );
    }

    await updateDoc(
      doc(
        db,
        "attendance",
        attendanceId
      ),
      {
        status:
          normalizedCorrection,

        updatedBy:
          adminUser.uid,

        updatedAt:
          serverTimestamp(),

        correctionSource:
          "approved_dispute",

        relatedDisputeId:
          disputeId,
      }
    );
  }

  await createDisputeAuditLog({
    action:
      `dispute_${normalizedStatus}`,

    actor: adminUser,

    disputeId,
    attendanceId,

    details: {
      status: normalizedStatus,

      adminComment:
        adminComment?.trim() ||
        "",

      correctedAttendanceStatus:
        correctedAttendanceStatus
          ? normalizeAttendanceStatus(
              correctedAttendanceStatus
            )
          : null,
    },
  });
}