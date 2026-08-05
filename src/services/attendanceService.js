import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";


/* =========================================================
   NORMALIZATION HELPERS
========================================================= */

function toSafeDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime())
    ? null
    : parsedDate;
}

function normalizeStatus(value) {
  const status = String(value || "")
    .trim()
    .toLowerCase();

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

function normalizeVerificationResult(raw) {
  const result =
    raw.verificationResult ??
    raw.verificationStatus ??
    raw.result ??
    null;

  if (result) {
    return String(result)
      .trim()
      .toLowerCase();
  }

  const status = normalizeStatus(raw.status);

  if (status === "absent") {
    return "flagged";
  }

  return "verified";
}

function getStudentName(user, rawRecord) {
  const userName = [
    user?.firstName,
    user?.lastName,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    userName ||
    rawRecord.studentName ||
    rawRecord.name ||
    rawRecord.fullName ||
    rawRecord.userName ||
    "Unknown User"
  );
}

function formatDateLabel(date) {
  if (!date) return "N/A";

  return date.toLocaleDateString("en-MY");
}

function formatTimeLabel(date) {
  if (!date) return "N/A";

  return date.toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* =========================================================
   RECORD NORMALIZATION
========================================================= */

function normalizeAttendanceRecord(
  attendanceDoc,
  usersMap
) {
  const raw = attendanceDoc.data();

  const userId =
    raw.userId ||
    raw.uid ||
    raw.usedId ||
    "";

  const user = usersMap[userId] || null;

  const timestamp = toSafeDate(
    raw.timestamp ??
      raw.date ??
      raw.checkInTime ??
      raw.createdAt ??
      raw.time
  );

  const studentName = getStudentName(
    user,
    raw
  );

  const authMethod =
    raw.authMethod ||
    raw.authenticationMethod ||
    raw.method ||
    "Unknown";

  const deviceId =
    raw.deviceId ||
    raw.terminalId ||
    "N/A";

  return {
    id: attendanceDoc.id,

    userId,

    studentName,
    name: studentName,

    studentId:
      user?.studentId ||
      raw.studentId ||
      raw.employeeId ||
      "N/A",

    email:
      user?.email ||
      raw.email ||
      "",

    course:
      user?.course ||
      raw.course ||
      "N/A",

    department:
      user?.department ||
      raw.department ||
      "N/A",

    intake:
      user?.intake ||
      raw.intake ||
      "N/A",

    phoneNum:
      user?.phoneNum ||
      raw.phoneNum ||
      "N/A",

    role:
      user?.role ||
      raw.role ||
      null,

    active:
      user?.active ??
      raw.active ??
      true,

    status: normalizeStatus(raw.status),

    authMethod,
    method: authMethod,

    deviceId,

    deviceName:
      raw.deviceName ||
      raw.terminalName ||
      deviceId,

    location:
      raw.location ||
      raw.deviceLocation ||
      raw.terminalLocation ||
      "N/A",

    rfidCardId:
      raw.rfidCardId ||
      raw.rfidId ||
      user?.rfidCardId ||
      "N/A",

    faceConfidence:
      raw.faceConfidence ??
      raw.confidenceScore ??
      null,

    livenessResult:
      raw.livenessResult ??
      raw.livenessStatus ??
      "N/A",

    fingerprintResult:
      raw.fingerprintResult ??
      raw.fingerprintStatus ??
      "N/A",

    verificationResult:
      normalizeVerificationResult(raw),

    verificationAttempts:
      raw.verificationAttempts ??
      raw.attemptCount ??
      1,

    source:
      raw.source ||
      "device",

    notes:
      raw.notes ||
      raw.reason ||
      "",

    relatedDisputeId:
      raw.relatedDisputeId ||
      raw.disputeId ||
      null,

    timestamp,
    date: timestamp,

    dateLabel: formatDateLabel(timestamp),
    timeLabel: formatTimeLabel(timestamp),

    createdAt: toSafeDate(raw.createdAt),
    updatedAt: toSafeDate(raw.updatedAt),

    createdBy:
      raw.createdBy ||
      null,

    updatedBy:
      raw.updatedBy ||
      null,

    raw,
  };
}

/* =========================================================
   REAL-TIME ATTENDANCE SUBSCRIPTION
========================================================= */

/**
 * Subscribes to attendance and users collections.
 *
 * Attendance records are enriched using data from users/{userId}.
 * Used by the Admin Attendance Management page.
 */
/**
 * Loads attendance records once.
 *
 * Used by Analytics.jsx and any page that does not require
 * a real-time Firestore subscription.
 */
export async function fetchAttendanceRecords() {
  const [
    attendanceSnapshot,
    usersSnapshot,
  ] = await Promise.all([
    getDocs(collection(db, "attendance")),
    getDocs(collection(db, "users")),
  ]);

  const usersMap = {};

  usersSnapshot.docs.forEach((userDocument) => {
    usersMap[userDocument.id] = {
      id: userDocument.id,
      ...userDocument.data(),
    };
  });

  return attendanceSnapshot.docs
    .map((attendanceDocument) =>
      normalizeAttendanceRecord(
        attendanceDocument,
        usersMap
      )
    )
    .sort((firstRecord, secondRecord) => {
      const firstTime =
        firstRecord.timestamp?.getTime?.() || 0;

      const secondTime =
        secondRecord.timestamp?.getTime?.() || 0;

      return secondTime - firstTime;
    });
}
export function subscribeToAttendanceManagement(
  onData,
  onError
) {
  let attendanceDocuments = [];
  let usersMap = {};

  let attendanceReady = false;
  let usersReady = false;

  const emitRecords = () => {
    if (!attendanceReady || !usersReady) {
      return;
    }

    const records = attendanceDocuments
      .map((attendanceDocument) =>
        normalizeAttendanceRecord(
          attendanceDocument,
          usersMap
        )
      )
      .sort((firstRecord, secondRecord) => {
        const firstTime =
          firstRecord.timestamp?.getTime?.() ||
          0;

        const secondTime =
          secondRecord.timestamp?.getTime?.() ||
          0;

        return secondTime - firstTime;
      });

    onData(records);
  };

  const unsubscribeUsers = onSnapshot(
    collection(db, "users"),

    (snapshot) => {
      const nextUsersMap = {};

      snapshot.docs.forEach((userDocument) => {
        nextUsersMap[userDocument.id] = {
          id: userDocument.id,
          ...userDocument.data(),
        };
      });

      usersMap = nextUsersMap;
      usersReady = true;

      emitRecords();
    },

    (error) => {
      console.error(
        "Unable to subscribe to users:",
        error
      );

      onError?.(error);
    }
  );

  const unsubscribeAttendance = onSnapshot(
    collection(db, "attendance"),

    (snapshot) => {
      attendanceDocuments = snapshot.docs;
      attendanceReady = true;

      emitRecords();
    },

    (error) => {
      console.error(
        "Unable to subscribe to attendance:",
        error
      );

      onError?.(error);
    }
  );

  return () => {
    unsubscribeUsers();
    unsubscribeAttendance();
  };
}

/**
 * Dashboard-compatible attendance subscription.
 *
 * This function exists because Dashboard.jsx imports
 * subscribeToAttendanceRecords.
 */
export function subscribeToAttendanceRecords(
  onData,
  onError
) {
  return subscribeToAttendanceManagement(
    (records) => {
      const dashboardRecords = records.map(
        (record) => ({
          ...record,

          name:
            record.studentName ||
            record.name ||
            "Unknown User",

          method:
            record.authMethod ||
            record.method ||
            "Unknown",

          date: record.timestamp,

          dateLabel: formatDateLabel(
            record.timestamp
          ),

          timeLabel: formatTimeLabel(
            record.timestamp
          ),
        })
      );

      onData(dashboardRecords);
    },

    onError
  );
}

/* =========================================================
   AUDIT LOG
========================================================= */

async function createAuditLog({
  action,
  actor,
  attendanceId,
  details = {},
}) {
  try {
    await addDoc(
      collection(db, "auditLogs"),
      {
        action,

        actorId:
          actor?.uid ||
          null,

        actorEmail:
          actor?.email ||
          null,

        actorName:
          actor?.fullName ||
          actor?.email ||
          "Unknown administrator",

        actorRole:
          actor?.role ||
          "admin",

        targetType: "attendance",

        targetId:
          attendanceId ||
          null,

        details,

        timestamp: serverTimestamp(),
      }
    );
  } catch (error) {
    /*
      An attendance operation should not fail only
      because its audit log could not be created.
    */
    console.error(
      "Unable to create audit log:",
      error
    );
  }
}

/* =========================================================
   CREATE MANUAL ATTENDANCE
========================================================= */

export async function addManualAttendance(
  formData,
  adminUser
) {
  const timestamp = new Date(
    `${formData.date}T${formData.time}`
  );

  if (
    Number.isNaN(timestamp.getTime())
  ) {
    throw new Error(
      "The selected attendance date or time is invalid."
    );
  }

  if (!formData.userId) {
    throw new Error(
      "A student must be selected."
    );
  }

  const attendanceReference = await addDoc(
    collection(db, "attendance"),
    {
      userId: formData.userId,

      status:
        formData.status ||
        "present",

      authMethod:
        formData.authMethod ||
        "Manual",

      deviceId:
        formData.deviceId ||
        "Admin Portal",

      timestamp,

      source:
        formData.source ||
        "manual",

      verificationResult:
        formData.verificationResult ||
        "manual",

      notes:
        formData.notes ||
        "",

      createdBy:
        adminUser?.uid ||
        null,

      updatedBy:
        adminUser?.uid ||
        null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
  );

  await createAuditLog({
    action: "attendance_created",

    actor: adminUser,

    attendanceId:
      attendanceReference.id,

    details: {
      userId: formData.userId,

      status:
        formData.status ||
        "present",

      authMethod:
        formData.authMethod ||
        "Manual",

      source: "manual",
    },
  });

  return attendanceReference.id;
}

/* =========================================================
   UPDATE ATTENDANCE
========================================================= */

export async function updateAttendanceRecord(
  attendanceId,
  formData,
  adminUser
) {
  if (!attendanceId) {
    throw new Error(
      "Attendance record ID is required."
    );
  }

  const timestamp = new Date(
    `${formData.date}T${formData.time}`
  );

  if (
    Number.isNaN(timestamp.getTime())
  ) {
    throw new Error(
      "The selected attendance date or time is invalid."
    );
  }

  await updateDoc(
    doc(
      db,
      "attendance",
      attendanceId
    ),
    {
      userId: formData.userId,

      status:
        formData.status ||
        "present",

      authMethod:
        formData.authMethod ||
        "Manual",

      deviceId:
        formData.deviceId ||
        "Admin Portal",

      timestamp,

      source:
        formData.source ||
        "manual",

      verificationResult:
        formData.verificationResult ||
        "manual",

      notes:
        formData.notes ||
        "",

      updatedBy:
        adminUser?.uid ||
        null,

      updatedAt: serverTimestamp(),
    }
  );

  await createAuditLog({
    action: "attendance_updated",

    actor: adminUser,

    attendanceId,

    details: {
      userId: formData.userId,

      status:
        formData.status,

      authMethod:
        formData.authMethod,
    },
  });
}

/* =========================================================
   DELETE ONE ATTENDANCE RECORD
========================================================= */

export async function deleteAttendanceRecord(
  attendanceId,
  adminUser
) {
  if (!attendanceId) {
    throw new Error(
      "Attendance record ID is required."
    );
  }

  await deleteDoc(
    doc(
      db,
      "attendance",
      attendanceId
    )
  );

  await createAuditLog({
    action: "attendance_deleted",

    actor: adminUser,

    attendanceId,

    details: {
      deletedRecordId: attendanceId,
    },
  });
}

/* =========================================================
   BULK DELETE ATTENDANCE RECORDS
========================================================= */

export async function deleteAttendanceRecords(
  attendanceIds,
  adminUser
) {
  if (
    !Array.isArray(attendanceIds) ||
    attendanceIds.length === 0
  ) {
    throw new Error(
      "No attendance records were selected."
    );
  }

  await Promise.all(
    attendanceIds.map((attendanceId) =>
      deleteDoc(
        doc(
          db,
          "attendance",
          attendanceId
        )
      )
    )
  );

  await createAuditLog({
    action: "attendance_bulk_deleted",

    actor: adminUser,

    attendanceId: null,

    details: {
      attendanceIds,

      totalDeleted:
        attendanceIds.length,
    },
  });
}

/* =========================================================
   SUMMARY HELPERS
========================================================= */

export function getSummary(records = []) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;

      if (record.status === "present") {
        summary.present += 1;
      } else if (
        record.status === "late"
      ) {
        summary.late += 1;
      } else if (
        record.status === "absent"
      ) {
        summary.absent += 1;
      } else if (
        record.status === "excused"
      ) {
        summary.excused += 1;
      } else {
        summary.unknown += 1;
      }

      return summary;
    },

    {
      total: 0,
      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
      unknown: 0,
    }
  );
}

/* =========================================================
   WEEKLY CHART DATA
========================================================= */

const WEEKDAY_LABELS = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

function getRecordDate(record) {
  return (
    toSafeDate(record.timestamp) ||
    toSafeDate(record.date)
  );
}

export function getWeeklyChartData(
  records = []
) {
  const days = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (
    let index = 6;
    index >= 0;
    index -= 1
  ) {
    const date = new Date(today);

    date.setDate(
      date.getDate() - index
    );

    days.push({
      key: date.toDateString(),

      day:
        WEEKDAY_LABELS[
          date.getDay()
        ],

      present: 0,
      late: 0,
      absent: 0,
    });
  }

  const recordsByDay =
    Object.fromEntries(
      days.map((day) => [
        day.key,
        day,
      ])
    );

  records.forEach((record) => {
    const recordDate =
      getRecordDate(record);

    if (!recordDate) {
      return;
    }

    const day =
      recordsByDay[
        recordDate.toDateString()
      ];

    if (!day) {
      return;
    }

    if (record.status === "present") {
      day.present += 1;
    } else if (
      record.status === "late"
    ) {
      day.late += 1;
    } else if (
      record.status === "absent"
    ) {
      day.absent += 1;
    }
  });

  return days.map(
    ({ key, ...day }) => day
  );
}

/* =========================================================
   14-DAY TREND DATA
========================================================= */

export function getTrendData(
  records = []
) {
  const days = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (
    let index = 13;
    index >= 0;
    index -= 1
  ) {
    const date = new Date(today);

    date.setDate(
      date.getDate() - index
    );

    days.push({
      key: date.toDateString(),

      date: date.toLocaleDateString(
        "en-MY",
        {
          month: "short",
          day: "numeric",
        }
      ),

      present: 0,
      late: 0,
      absent: 0,
    });
  }

  const recordsByDay =
    Object.fromEntries(
      days.map((day) => [
        day.key,
        day,
      ])
    );

  records.forEach((record) => {
    const recordDate =
      getRecordDate(record);

    if (!recordDate) {
      return;
    }

    const day =
      recordsByDay[
        recordDate.toDateString()
      ];

    if (!day) {
      return;
    }

    if (record.status === "present") {
      day.present += 1;
    } else if (
      record.status === "late"
    ) {
      day.late += 1;
    } else if (
      record.status === "absent"
    ) {
      day.absent += 1;
    }
  });

  return days.map(
    ({ key, ...day }) => day
  );
}

/* =========================================================
   RECENT ACTIVITY
========================================================= */

export function getRecentActivity(
  records = [],
  count = 6
) {
  return [...records]
    .map((record) => {
      const timestamp =
        getRecordDate(record);

      return {
        ...record,

        timestamp,
        date: timestamp,

        name:
          record.studentName ||
          record.name ||
          "Unknown User",

        method:
          record.authMethod ||
          record.method ||
          "Unknown",

        dateLabel:
          formatDateLabel(timestamp),

        timeLabel:
          formatTimeLabel(timestamp),
      };
    })

    .filter(
      (record) =>
        record.timestamp instanceof Date
    )

    .sort(
      (firstRecord, secondRecord) =>
        secondRecord.timestamp.getTime() -
        firstRecord.timestamp.getTime()
    )

    .slice(0, count);
}