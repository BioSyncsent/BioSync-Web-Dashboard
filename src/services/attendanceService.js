import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

const VALID_STATUSES = new Set([
  "present",
  "late",
  "absent",
  "excused",
]);

/* =========================================================
   NORMALIZATION
========================================================= */

function toSafeDate(value) {
  if (value == null || value === "") return null;

  try {
    const date =
      value instanceof Date
        ? value
        : typeof value.toDate === "function"
          ? value.toDate()
          : new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toLowerCase();

  // Exact values prevent "not present" becoming "present".
  return VALID_STATUSES.has(status) ? status : "unknown";
}

function verificationResult(raw) {
  const explicit =
    raw.verificationResult ??
    raw.verificationStatus ??
    raw.result;

  if (explicit != null && String(explicit).trim()) {
    return String(explicit).trim().toLowerCase();
  }

  const method =
    raw.authMethod ||
    raw.authenticationMethod ||
    raw.method ||
    "";

  if (
    String(raw.source || "").toLowerCase() === "manual" ||
    String(method).toLowerCase() === "manual"
  ) {
    return "manual";
  }

  // Attendance status does not prove authentication succeeded.
  return "unknown";
}

function getStudentName(user, raw) {
  return (
    user?.fullName ||
    [user?.firstName, user?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    raw.studentName ||
    raw.name ||
    raw.fullName ||
    raw.userName ||
    "Unknown User"
  );
}

function formatDateLabel(value) {
  const date = toSafeDate(value);
  return date ? date.toLocaleDateString("en-MY") : "N/A";
}

function formatTimeLabel(value) {
  const date = toSafeDate(value);

  return date
    ? date.toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";
}

function recordTimestamp(raw) {
  return [
    raw.timestamp,
    raw.date,
    raw.checkInTime,
    raw.createdAt,
    raw.time,
  ]
    .map(toSafeDate)
    .find(Boolean) || null;
}

function normalizeAttendanceRecord(document, usersMap) {
  const raw = document.data();

  const userId = raw.userId || raw.uid || raw.usedId || "";
  const user = usersMap[userId] || null;
  const timestamp = recordTimestamp(raw);

  const studentName = getStudentName(user, raw);

  const authMethod =
    raw.authMethod ||
    raw.authenticationMethod ||
    raw.method ||
    "Unknown";

  const deviceId = raw.deviceId || raw.terminalId || "N/A";

  return {
    id: document.id,
    userId,

    studentName,
    name: studentName,

    studentId:
      user?.studentId ||
      raw.studentId ||
      raw.employeeId ||
      "N/A",

    email: user?.email || raw.email || "",
    course: user?.course || raw.course || "N/A",
    department: user?.department || raw.department || "N/A",
    intake: user?.intake || raw.intake || "N/A",
    phoneNum: user?.phoneNum || raw.phoneNum || "N/A",

    role: user?.role || raw.role || null,
    active: user?.active ?? raw.active ?? true,

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

    verificationResult: verificationResult(raw),

    verificationAttempts:
      raw.verificationAttempts ??
      raw.attemptCount ??
      null,

    source:
      raw.source ||
      (String(authMethod).toLowerCase() === "manual"
        ? "manual"
        : "unknown"),

    notes: raw.notes || raw.reason || "",

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

    createdBy: raw.createdBy || null,
    updatedBy: raw.updatedBy || null,

    raw,
  };
}

function usersFromSnapshot(snapshot) {
  return Object.fromEntries(
    snapshot.docs.map((document) => [
      document.id,
      { ...document.data(), id: document.id },
    ])
  );
}

function normalizedRecords(documents, usersMap) {
  return documents
    .map((document) =>
      normalizeAttendanceRecord(document, usersMap)
    )
    .sort((first, second) => {
      const difference =
        (second.timestamp?.getTime() ?? 0) -
        (first.timestamp?.getTime() ?? 0);

      return difference || first.id.localeCompare(second.id);
    });
}

/* =========================================================
   READ RECORDS
   Collection-wide reads require administrator permissions.
========================================================= */

export async function fetchAttendanceRecords() {
  const [attendanceSnapshot, usersSnapshot] = await Promise.all([
    getDocs(collection(db, "attendance")),
    getDocs(collection(db, "users")),
  ]);

  return normalizedRecords(
    attendanceSnapshot.docs,
    usersFromSnapshot(usersSnapshot)
  );
}

export function subscribeToAttendanceManagement(onData, onError) {
  let attendanceDocuments = [];
  let usersMap = {};

  let attendanceReady = false;
  let usersReady = false;
  let stopped = false;

  function emit() {
    if (stopped || !attendanceReady || !usersReady) return;

    onData(normalizedRecords(attendanceDocuments, usersMap));
  }

  function fail(error) {
    if (stopped) return;

    // Stop publishing potentially stale combined data after an error.
    stopped = true;
    onError?.(error);
  }

  const unsubscribeUsers = onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      usersMap = usersFromSnapshot(snapshot);
      usersReady = true;
      emit();
    },
    fail
  );

  const unsubscribeAttendance = onSnapshot(
    collection(db, "attendance"),
    (snapshot) => {
      attendanceDocuments = snapshot.docs;
      attendanceReady = true;
      emit();
    },
    fail
  );

  return () => {
    stopped = true;
    unsubscribeUsers();
    unsubscribeAttendance();
  };
}

export function subscribeToAttendanceRecords(onData, onError) {
  return subscribeToAttendanceManagement(onData, onError);
}

/* =========================================================
   VALIDATION
========================================================= */

function documentId(value, label) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.includes("/")
  ) {
    throw new Error(`${label} is invalid.`);
  }

  return value;
}

function selectedTimestamp(formData) {
  const dateText = String(formData.date || "");
  const timeText = String(formData.time || "");

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateText) ||
    !/^\d{2}:\d{2}$/.test(timeText)
  ) {
    throw new Error("Select a valid attendance date and time.");
  }

  // Matches the current page's browser-local date/time inputs.
  const timestamp = new Date(`${dateText}T${timeText}:00`);

  if (Number.isNaN(timestamp.getTime())) {
    throw new Error("The attendance date or time is invalid.");
  }

  const [year, month, day] = dateText.split("-").map(Number);
  const [hour, minute] = timeText.split(":").map(Number);

  // Reject dates that JavaScript silently rolls into another day.
  if (
    timestamp.getFullYear() !== year ||
    timestamp.getMonth() + 1 !== month ||
    timestamp.getDate() !== day ||
    timestamp.getHours() !== hour ||
    timestamp.getMinutes() !== minute
  ) {
    throw new Error("The attendance date or time is invalid.");
  }

  return timestamp;
}

function correctionValues(formData) {
  const status = String(formData.status || "").trim().toLowerCase();
  const notes = String(formData.notes || "").trim();

  if (!VALID_STATUSES.has(status)) {
    throw new Error("Choose a valid attendance status.");
  }

  if (!notes) {
    throw new Error("A reason is required for manual attendance changes.");
  }

  if (notes.length > 1000) {
    throw new Error("The reason must be 1,000 characters or fewer.");
  }

  return {
    status,
    notes,
    timestamp: selectedTimestamp(formData),
  };
}

function actorId(adminUser) {
  const currentUser = auth.currentUser;

  if (!currentUser || currentUser.uid !== adminUser?.uid) {
    throw new Error("Your session changed. Please sign in again.");
  }

  return currentUser.uid;
}

async function requireAdmin(transaction, uid) {
  const snapshot = await transaction.get(doc(db, "users", uid));

  if (
    !snapshot.exists() ||
    snapshot.data().role !== "admin" ||
    snapshot.data().active !== true
  ) {
    throw new Error("An active administrator account is required.");
  }
}

function auditReference() {
  return doc(collection(db, "auditLogs"));
}

function auditData(action, uid, attendanceId, details = {}) {
  // These four top-level fields match the uploaded audit rules.
  return {
    actorId: uid,
    action,
    timestamp: serverTimestamp(),
    details: {
      targetType: "attendance",
      attendanceId: attendanceId || null,
      ...details,
    },
  };
}

function sameMinute(first, second) {
  return (
    first &&
    second &&
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate() &&
    first.getHours() === second.getHours() &&
    first.getMinutes() === second.getMinutes()
  );
}

/* =========================================================
   ADD MANUAL ATTENDANCE
========================================================= */

export async function addManualAttendance(formData, adminUser) {
  const uid = actorId(adminUser);
  const userId = documentId(formData.userId, "Student ID");
  const values = correctionValues(formData);

  const attendanceRef = doc(collection(db, "attendance"));
  const logRef = auditReference();

  await runTransaction(db, async (transaction) => {
    await requireAdmin(transaction, uid);

    const studentSnapshot = await transaction.get(
      doc(db, "users", userId)
    );

    if (
      !studentSnapshot.exists() ||
      studentSnapshot.data().role !== "student" ||
      studentSnapshot.data().active === false
    ) {
      throw new Error("Select an existing active student.");
    }

    const student = studentSnapshot.data();

    transaction.set(attendanceRef, {
      userId,
      studentName: getStudentName(student, {}),
      studentId: student.studentId || "N/A",
      department: student.department || "N/A",
      course: student.course || "N/A",

      ...values,

      // Enforced here, regardless of values passed by the form.
      authMethod: "Manual",
      deviceId: "Admin Portal",
      source: "manual",
      verificationResult: "manual",

      createdBy: uid,
      updatedBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    transaction.set(
      logRef,
      auditData("attendance_created", uid, attendanceRef.id, {
        userId,
        status: values.status,
        timestamp: values.timestamp,
        notes: values.notes,
        source: "manual",
      })
    );
  });

  return attendanceRef.id;
}

/* =========================================================
   EDIT ATTENDANCE
========================================================= */

export async function updateAttendanceRecord(
  attendanceId,
  formData,
  adminUser
) {
  const uid = actorId(adminUser);
  const id = documentId(attendanceId, "Attendance record ID");
  const values = correctionValues(formData);

  const attendanceRef = doc(db, "attendance", id);
  const logRef = auditReference();

  await runTransaction(db, async (transaction) => {
    await requireAdmin(transaction, uid);

    const snapshot = await transaction.get(attendanceRef);

    if (!snapshot.exists()) {
      throw new Error("This attendance record no longer exists.");
    }

    const before = snapshot.data();
    const existingUserId =
      before.userId || before.uid || before.usedId || "";

    if (
      formData.userId &&
      formData.userId !== existingUserId
    ) {
      throw new Error("An attendance record cannot be reassigned.");
    }

    const originalTimestamp = recordTimestamp(before);

    const changes = {
      status: values.status,
      notes: values.notes,
      updatedBy: uid,
      updatedAt: serverTimestamp(),
      correctionSource: "admin",
    };

    // Avoid truncating seconds when the administrator did not
    // actually change the displayed date/time.
    const timeChanged = !sameMinute(
      originalTimestamp,
      values.timestamp
    );

    if (timeChanged) {
      changes.timestamp = values.timestamp;
    }

    // Authentication, verification, device, source, and userId
    // are deliberately excluded from the update.
    transaction.update(attendanceRef, changes);

    transaction.set(
      logRef,
      auditData("attendance_updated", uid, id, {
        userId: existingUserId,
        before: {
          status: before.status || "unknown",
          notes: before.notes || before.reason || "",
          timestamp: originalTimestamp,
        },
        after: {
          status: values.status,
          notes: values.notes,
          timestamp: timeChanged
            ? values.timestamp
            : originalTimestamp,
        },
      })
    );
  });
}

/* =========================================================
   DELETE ONE RECORD
========================================================= */

export async function deleteAttendanceRecord(
  attendanceId,
  adminUser
) {
  const uid = actorId(adminUser);
  const id = documentId(attendanceId, "Attendance record ID");

  const attendanceRef = doc(db, "attendance", id);
  const logRef = auditReference();

  await runTransaction(db, async (transaction) => {
    await requireAdmin(transaction, uid);

    const snapshot = await transaction.get(attendanceRef);

    if (!snapshot.exists()) {
      throw new Error("This attendance record was already deleted.");
    }

    const before = snapshot.data();

    transaction.delete(attendanceRef);

    transaction.set(
      logRef,
      auditData("attendance_deleted", uid, id, {
        userId: before.userId || before.uid || before.usedId || "",
        status: before.status || "unknown",
        timestamp: recordTimestamp(before),
        notes: before.notes || before.reason || "",
        authMethod:
          before.authMethod ||
          before.authenticationMethod ||
          before.method ||
          "Unknown",
      })
    );
  });
}

/* =========================================================
   BULK DELETE
========================================================= */

export async function deleteAttendanceRecords(
  attendanceIds,
  adminUser
) {
  const uid = actorId(adminUser);

  if (!Array.isArray(attendanceIds) || !attendanceIds.length) {
    throw new Error("No attendance records were selected.");
  }

  const ids = [
    ...new Set(
      attendanceIds.map((id) =>
        documentId(id, "Attendance record ID")
      )
    ),
  ];

  // Intentional application limit: one atomic operation,
  // with no partial-success chunking.
  if (ids.length > 100) {
    throw new Error("Delete at most 100 records at a time.");
  }

  if (
    adminUser.role !== "admin" ||
    adminUser.active === false
  ) {
    throw new Error("An active administrator account is required.");
  }

  // Firestore security rules enforce the current database role.
  const batch = writeBatch(db);

  ids.forEach((id) => {
    batch.delete(doc(db, "attendance", id));
  });

  batch.set(
    auditReference(),
    auditData("attendance_bulk_deleted", uid, null, {
      attendanceIds: ids,
      totalRequested: ids.length,
    })
  );

  await batch.commit();
}

/* =========================================================
   SUMMARY
========================================================= */

export function getSummary(records = []) {
  return records.reduce(
    (summary, record) => {
      summary.total += 1;

      const status = normalizeStatus(record.status);
      summary[status] += 1;

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
   CHART HELPERS
========================================================= */

function getRecordDate(record) {
  return toSafeDate(record.timestamp) || toSafeDate(record.date);
}

function buildDailyData(records, numberOfDays, labelKey) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = [];

  for (let index = numberOfDays - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - index);

    days.push({
      key: date.toDateString(),

      [labelKey]:
        labelKey === "day"
          ? date.toLocaleDateString("en-US", {
              weekday: "short",
            })
          : date.toLocaleDateString("en-MY", {
              month: "short",
              day: "numeric",
            }),

      present: 0,
      late: 0,
      absent: 0,
      excused: 0,
    });
  }

  const lookup = new Map(
    days.map((day) => [day.key, day])
  );

  records.forEach((record) => {
    const date = getRecordDate(record);
    if (!date) return;

    const day = lookup.get(date.toDateString());
    const status = normalizeStatus(record.status);

    if (day && VALID_STATUSES.has(status)) {
      day[status] += 1;
    }
  });

  return days.map(({ key, ...day }) => day);
}

export function getWeeklyChartData(records = []) {
  return buildDailyData(records, 7, "day");
}

export function getTrendData(records = []) {
  return buildDailyData(records, 14, "date");
}

export function getRecentActivity(records = [], count = 6) {
  const limit = Number.isFinite(Number(count))
    ? Math.max(0, Math.floor(Number(count)))
    : 6;

  return [...records]
    .map((record) => {
      const timestamp = getRecordDate(record);

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

        dateLabel: formatDateLabel(timestamp),
        timeLabel: formatTimeLabel(timestamp),
      };
    })
    .filter((record) => Boolean(record.timestamp))
    .sort(
      (first, second) =>
        second.timestamp.getTime() -
        first.timestamp.getTime()
    )
    .slice(0, limit);
}