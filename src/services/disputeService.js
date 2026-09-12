import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  db,
} from "../firebase/firebase";


/* =========================================================
   HELPERS
========================================================= */

function toSafeDate(value) {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date
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


function normalizeText(value) {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}


function cleanDepartment(value) {
  return String(
    value || ""
  ).trim();
}


function normalizeDisputeStatus(
  value
) {
  const status =
    normalizeText(
      value
    ).replace(
      /[\s-]+/g,
      "_"
    );

  const allowed = [
    "pending",
    "under_review",
    "awaiting_information",
    "approved",
    "rejected",
    "cancelled",
    "closed",
  ];

  if (!status) {
    return "pending";
  }

  return allowed.includes(
    status
  )
    ? status
    : "pending";
}


function normalizeAttendanceStatus(
  value
) {
  const status =
    normalizeText(value);

  if (
    status.includes(
      "missing"
    )
  ) {
    return "missing";
  }

  if (
    status.includes(
      "present"
    )
  ) {
    return "present";
  }

  if (
    status.includes(
      "late"
    )
  ) {
    return "late";
  }

  if (
    status.includes(
      "absent"
    )
  ) {
    return "absent";
  }

  if (
    status.includes(
      "excused"
    )
  ) {
    return "excused";
  }

  return "unknown";
}


function getUserName(
  user,
  fallback = {}
) {
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
    fallback.name ||
    fallback.userName ||
    "Unknown Student"
  );
}


function formatDateLabel(
  value
) {
  const date =
    toSafeDate(value);

  if (!date) {
    return "N/A";
  }

  return date.toLocaleDateString(
    "en-MY"
  );
}


function formatTimeLabel(
  value
) {
  const date =
    toSafeDate(value);

  if (!date) {
    return "N/A";
  }

  return date.toLocaleTimeString(
    "en-MY",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}


/* =========================================================
   NORMALIZE ATTENDANCE
========================================================= */

function normalizeAttendanceDocument(
  attendanceDocument
) {
  const raw =
    attendanceDocument.data();

  const timestamp =
    toSafeDate(
      raw.timestamp ??
        raw.date ??
        raw.checkInTime ??
        raw.createdAt
    );

  return {
    id:
      attendanceDocument.id,

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

    status:
      normalizeAttendanceStatus(
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
      raw.deviceLocation ||
      raw.terminalLocation ||
      "N/A",

    verificationResult:
      raw.verificationResult ||
      raw.verificationStatus ||
      "N/A",

    timestamp,

    dateLabel:
      formatDateLabel(
        timestamp
      ),

    timeLabel:
      formatTimeLabel(
        timestamp
      ),

    raw,
  };
}


/* =========================================================
   NORMALIZE DISPUTE
========================================================= */

function normalizeDisputeDocument(
  disputeDocument,
  user = null,
  attendance = null
) {
  const raw =
    disputeDocument.data();

  const submittedAt =
    toSafeDate(
      raw.submittedAt ??
        raw.createdAt ??
        raw.timestamp
    );

  const reviewedAt =
    toSafeDate(
      raw.reviewedAt
    );

  const resolvedAt =
    toSafeDate(
      raw.resolvedAt ??
        raw.updatedAt
    );

  return {
    id:
      disputeDocument.id,

    userId:
      raw.userId ||
      raw.uid ||
      "",

    attendanceId:
      raw.attendanceId ||
      raw.attendanceRecordId ||
      "",

    issueType:
      raw.issueType ||
      "",

    attendanceDate:
      raw.attendanceDate ||
      "",

    requestedTime:
      raw.requestedTime ||
      "",

    missingAttendance:
      Boolean(
        raw.missingAttendance
      ),

    studentName:
      getUserName(
        user,
        raw
      ),

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
      cleanDepartment(
        raw.department ||
          user?.department ||
          ""
      ),

    reason:
      raw.reason ||
      "No reason provided.",

    description:
      raw.description ||
      raw.explanation ||
      "",

    originalStatus:
      raw.missingAttendance
        ? "missing"
        : normalizeAttendanceStatus(
            raw.originalStatus ||
              attendance?.status
          ),

    requestedStatus:
      normalizeAttendanceStatus(
        raw.requestedStatus ||
          raw.requestedCorrection
      ),

    status:
      normalizeDisputeStatus(
        raw.status
      ),

    priority:
      normalizeText(
        raw.priority ||
          "normal"
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
      raw.adminComment ||
      raw.reviewComment ||
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

    cancelledAt:
      toSafeDate(
        raw.cancelledAt
      ),

    attendance,

    raw,
  };
}


/* =========================================================
   ADMIN - ALL DISPUTES
========================================================= */

export function subscribeToDisputesManagement(
  onData,
  onError
) {
  let disputeDocuments =
    [];

  let usersMap = {};

  let attendanceMap = {};

  let disputesReady =
    false;

  let usersReady =
    false;

  let attendanceReady =
    false;


  function emit() {
    if (
      !disputesReady ||
      !usersReady ||
      !attendanceReady
    ) {
      return;
    }

    const disputes =
      disputeDocuments
        .map(
          (
            disputeDocument
          ) => {
            const raw =
              disputeDocument.data();

            const userId =
              raw.userId ||
              raw.uid ||
              "";

            const attendanceId =
              raw.attendanceId ||
              raw.attendanceRecordId ||
              "";

            return normalizeDisputeDocument(
              disputeDocument,

              usersMap[
                userId
              ] ||
                null,

              attendanceMap[
                attendanceId
              ] ||
                null
            );
          }
        )
        .sort(
          (
            first,
            second
          ) =>
            (
              second.submittedAt
                ?.getTime?.() ||
              0
            ) -
            (
              first.submittedAt
                ?.getTime?.() ||
              0
            )
        );

    onData(disputes);
  }


  const unsubscribeUsers =
    onSnapshot(
      collection(
        db,
        "users"
      ),

      (snapshot) => {
        const nextUsers =
          {};

        snapshot.docs.forEach(
          (
            userDocument
          ) => {
            nextUsers[
              userDocument.id
            ] = {
              id:
                userDocument.id,

              ...userDocument.data(),
            };
          }
        );

        usersMap =
          nextUsers;

        usersReady =
          true;

        emit();
      },

      (error) => {
        console.error(
          "Unable to load dispute users:",
          error
        );

        onError?.(
          error
        );
      }
    );


  const unsubscribeAttendance =
    onSnapshot(
      collection(
        db,
        "attendance"
      ),

      (snapshot) => {
        const nextAttendance =
          {};

        snapshot.docs.forEach(
          (
            attendanceDocument
          ) => {
            nextAttendance[
              attendanceDocument.id
            ] =
              normalizeAttendanceDocument(
                attendanceDocument
              );
          }
        );

        attendanceMap =
          nextAttendance;

        attendanceReady =
          true;

        emit();
      },

      (error) => {
        console.error(
          "Unable to load dispute attendance:",
          error
        );

        onError?.(
          error
        );
      }
    );


  const unsubscribeDisputes =
    onSnapshot(
      collection(
        db,
        "disputes"
      ),

      (snapshot) => {
        disputeDocuments =
          snapshot.docs;

        disputesReady =
          true;

        emit();
      },

      (error) => {
        console.error(
          "Unable to load disputes:",
          error
        );

        onError?.(
          error
        );
      }
    );


  return () => {
    unsubscribeUsers();

    unsubscribeAttendance();

    unsubscribeDisputes();
  };
}


/* =========================================================
   TEACHER - SAME DEPARTMENT DISPUTES
========================================================= */

export function subscribeToTeacherDisputes(
  teacher,
  onData,
  onError
) {
  if (
    !teacher?.uid
  ) {
    onData([]);

    return () => {};
  }

  const department =
    cleanDepartment(
      teacher.department
    );

  if (
    !department
  ) {
    console.warn(
      "Teacher has no department assigned."
    );

    onData([]);

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


  return onSnapshot(
    disputeQuery,

    async (
      snapshot
    ) => {
      try {
        const disputes =
          await Promise.all(
            snapshot.docs.map(
              async (
                disputeDocument
              ) => {
                const raw =
                  disputeDocument.data();

                let student =
                  null;

                let attendance =
                  null;


                if (
                  raw.userId
                ) {
                  const userSnapshot =
                    await getDoc(
                      doc(
                        db,
                        "users",
                        raw.userId
                      )
                    );

                  if (
                    userSnapshot.exists()
                  ) {
                    student = {
                      id:
                        userSnapshot.id,

                      ...userSnapshot.data(),
                    };
                  }
                }


                if (
                  raw.attendanceId
                ) {
                  const attendanceSnapshot =
                    await getDoc(
                      doc(
                        db,
                        "attendance",
                        raw.attendanceId
                      )
                    );

                  if (
                    attendanceSnapshot.exists()
                  ) {
                    attendance =
                      normalizeAttendanceDocument(
                        attendanceSnapshot
                      );
                  }
                }


                return normalizeDisputeDocument(
                  disputeDocument,
                  student,
                  attendance
                );
              }
            )
          );


        disputes.sort(
          (
            first,
            second
          ) =>
            (
              second.submittedAt
                ?.getTime?.() ||
              0
            ) -
            (
              first.submittedAt
                ?.getTime?.() ||
              0
            )
        );

        onData(
          disputes
        );
      } catch (
        error
      ) {
        console.error(
          "Unable to load teacher disputes:",
          error
        );

        onError?.(
          error
        );
      }
    },

    (error) => {
      console.error(
        "Teacher dispute subscription error:",
        error
      );

      onError?.(
        error
      );
    }
  );
}


/* =========================================================
   PENDING COUNT
========================================================= */

export function subscribeToPendingDisputes(
  onData,
  onError
) {
  return onSnapshot(
    collection(
      db,
      "disputes"
    ),

    (snapshot) => {
      const count =
        snapshot.docs.filter(
          (
            document
          ) =>
            normalizeDisputeStatus(
              document
                .data()
                .status
            ) ===
            "pending"
        ).length;

      onData(
        count
      );
    },

    (error) => {
      console.error(
        "Unable to load pending disputes:",
        error
      );

      onError?.(
        error
      );
    }
  );
}


/* =========================================================
   STUDENT ATTENDANCE
========================================================= */

export function subscribeToStudentAttendance(
  student,
  onData,
  onError
) {
  if (
    !student?.uid
  ) {
    onData([]);

    return () => {};
  }


  const attendanceQuery =
    query(
      collection(
        db,
        "attendance"
      ),

      where(
        "userId",
        "==",
        student.uid
      )
    );


  return onSnapshot(
    attendanceQuery,

    (snapshot) => {
      const records =
        snapshot.docs
          .map(
            (
              attendanceDocument
            ) =>
              normalizeAttendanceDocument(
                attendanceDocument
              )
          )
          .sort(
            (
              first,
              second
            ) =>
              (
                second.timestamp
                  ?.getTime?.() ||
                0
              ) -
              (
                first.timestamp
                  ?.getTime?.() ||
                0
              )
          );

      onData(
        records
      );
    },

    (error) => {
      console.error(
        "Unable to load student attendance:",
        error
      );

      onError?.(
        error
      );
    }
  );
}


/* =========================================================
   STUDENT DISPUTES
========================================================= */

export function subscribeToStudentDisputes(
  student,
  onData,
  onError
) {
  if (
    !student?.uid
  ) {
    onData([]);

    return () => {};
  }

  let disputeDocuments =
    [];

  let attendanceMap =
    {};

  let disputesReady =
    false;

  let attendanceReady =
    false;


  function emit() {
    if (
      !disputesReady ||
      !attendanceReady
    ) {
      return;
    }

    const disputes =
      disputeDocuments
        .map(
          (
            disputeDocument
          ) => {
            const raw =
              disputeDocument.data();

            return normalizeDisputeDocument(
              disputeDocument,

              student,

              attendanceMap[
                raw.attendanceId
              ] ||
                null
            );
          }
        )
        .sort(
          (
            first,
            second
          ) =>
            (
              second.submittedAt
                ?.getTime?.() ||
              0
            ) -
            (
              first.submittedAt
                ?.getTime?.() ||
              0
            )
        );

    onData(
      disputes
    );
  }


  const attendanceQuery =
    query(
      collection(
        db,
        "attendance"
      ),

      where(
        "userId",
        "==",
        student.uid
      )
    );


  const disputeQuery =
    query(
      collection(
        db,
        "disputes"
      ),

      where(
        "userId",
        "==",
        student.uid
      )
    );


  const unsubscribeAttendance =
    onSnapshot(
      attendanceQuery,

      (snapshot) => {
        const nextAttendance =
          {};

        snapshot.docs.forEach(
          (
            attendanceDocument
          ) => {
            nextAttendance[
              attendanceDocument.id
            ] =
              normalizeAttendanceDocument(
                attendanceDocument
              );
          }
        );

        attendanceMap =
          nextAttendance;

        attendanceReady =
          true;

        emit();
      },

      (error) => {
        console.error(
          "Unable to load student attendance for disputes:",
          error
        );

        onError?.(
          error
        );
      }
    );


  const unsubscribeDisputes =
    onSnapshot(
      disputeQuery,

      (snapshot) => {
        disputeDocuments =
          snapshot.docs;

        disputesReady =
          true;

        emit();
      },

      (error) => {
        console.error(
          "Unable to load student disputes:",
          error
        );

        onError?.(
          error
        );
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
  if (
    !actor?.uid
  ) {
    console.warn(
      "Dispute audit log skipped because actor UID is missing."
    );

    return;
  }

  try {
    await addDoc(
      collection(
        db,
        "auditLogs"
      ),

      {
        action,

        actorId:
          actor.uid,

        actorEmail:
          actor.email ||
          null,

        actorName:
          actor.fullName ||
          [
            actor.firstName,
            actor.lastName,
          ]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          actor.email ||
          "Unknown User",

        actorRole:
          actor.role ||
          "unknown",

        targetType:
          "dispute",

        targetId:
          disputeId ||
          null,

        attendanceId:
          attendanceId ||
          null,

        details,

        timestamp:
          serverTimestamp(),
      }
    );
  } catch (
    error
  ) {
    /*
      Do not fail the main dispute action
      only because audit logging fails.
    */

    console.error(
      "Unable to create dispute audit log:",
      error
    );
  }
}


/* =========================================================
   STUDENT CREATE DISPUTE
========================================================= */

export async function createStudentDispute(
  formData,
  student,
  existingDisputes = []
) {
  if (
    !student?.uid
  ) {
    throw new Error(
      "You must be logged in to submit a dispute."
    );
  }


  const department =
    cleanDepartment(
      student.department
    );


  if (
    !department
  ) {
    throw new Error(
      "Your student account does not have a department assigned."
    );
  }


  if (
    !formData.issueType
  ) {
    throw new Error(
      "Please select the attendance issue type."
    );
  }


  const missingAttendance =
    formData.issueType ===
      "missing_record" ||
    Boolean(
      formData.missingAttendance
    );


  const needsExistingRecord =
    [
      "wrong_status",
      "wrong_checkin_time",
      "approved_absence",
    ].includes(
      formData.issueType
    );


  if (
    needsExistingRecord &&
    !formData.attendanceId
  ) {
    throw new Error(
      "Please select the attendance record related to this dispute."
    );
  }


  if (
    missingAttendance &&
    !formData.attendanceDate
  ) {
    throw new Error(
      "Please select the attendance date."
    );
  }


  if (
    formData.issueType ===
      "wrong_checkin_time" &&
    !formData.requestedTime
  ) {
    throw new Error(
      "Please enter the correct check-in time."
    );
  }


  if (
    !formData.description?.trim()
  ) {
    throw new Error(
      "Please provide an explanation."
    );
  }


  if (
    !formData.requestedStatus
  ) {
    throw new Error(
      "Please select the requested attendance status."
    );
  }


  if (
    formData.attendanceId
  ) {
    const activeStatuses =
      [
        "pending",
        "under_review",
        "awaiting_information",
      ];

    const duplicate =
      existingDisputes.some(
        (
          dispute
        ) =>
          dispute.attendanceId ===
            formData.attendanceId &&
          activeStatuses.includes(
            dispute.status
          )
      );

    if (
      duplicate
    ) {
      throw new Error(
        "An active dispute already exists for this attendance record."
      );
    }
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


  const disputeReference =
    await addDoc(
      collection(
        db,
        "disputes"
      ),

      {
        userId:
          student.uid,

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

        department,

        issueType:
          formData.issueType,

        attendanceId:
          formData.attendanceId ||
          "",

        attendanceDate:
          formData.attendanceDate ||
          "",

        requestedTime:
          formData.requestedTime ||
          "",

        missingAttendance,

        originalStatus:
          missingAttendance
            ? "missing"
            : normalizeAttendanceStatus(
                formData.originalStatus
              ),

        requestedStatus:
          normalizeAttendanceStatus(
            formData.requestedStatus
          ),

        reason:
          formData.reason?.trim() ||
          formData.issueType,

        description:
          formData.description.trim(),

        evidenceUrl:
          formData.evidenceUrl?.trim() ||
          "",

        status:
          "pending",

        priority:
          "normal",

        adminComment:
          "",

        teacherComment:
          "",

        teacherRecommendation:
          "",

        reviewedBy:
          null,

        reviewedAt:
          null,

        resolvedAt:
          null,

        cancelledAt:
          null,

        submittedAt:
          serverTimestamp(),

        createdAt:
          serverTimestamp(),

        updatedAt:
          serverTimestamp(),
      }
    );


  await createDisputeAuditLog({
    action:
      "dispute_submitted",

    actor:
      student,

    disputeId:
      disputeReference.id,

    attendanceId:
      formData.attendanceId ||
      null,

    details: {
      department,

      issueType:
        formData.issueType,

      missingAttendance,

      attendanceDate:
        formData.attendanceDate ||
        null,

      requestedTime:
        formData.requestedTime ||
        null,

      requestedStatus:
        normalizeAttendanceStatus(
          formData.requestedStatus
        ),
    },
  });


  return disputeReference.id;
}


/* =========================================================
   STUDENT UPDATE DISPUTE
========================================================= */

export async function updateStudentDispute(
  disputeId,
  formData,
  student
) {
  if (
    !disputeId
  ) {
    throw new Error(
      "Dispute ID is required."
    );
  }


  if (
    !student?.uid
  ) {
    throw new Error(
      "You must be logged in."
    );
  }


  if (
    !formData.description?.trim()
  ) {
    throw new Error(
      "Please provide an explanation."
    );
  }


  await updateDoc(
    doc(
      db,
      "disputes",
      disputeId
    ),

    {
      requestedStatus:
        normalizeAttendanceStatus(
          formData.requestedStatus
        ),

      requestedTime:
        formData.requestedTime ||
        "",

      reason:
        formData.reason?.trim() ||
        formData.issueType ||
        "Attendance dispute",

      description:
        formData.description.trim(),

      evidenceUrl:
        formData.evidenceUrl?.trim() ||
        "",

      updatedAt:
        serverTimestamp(),
    }
  );


  await createDisputeAuditLog({
    action:
      "dispute_updated",

    actor:
      student,

    disputeId,

    attendanceId:
      formData.attendanceId ||
      null,

    details: {
      requestedStatus:
        normalizeAttendanceStatus(
          formData.requestedStatus
        ),

      requestedTime:
        formData.requestedTime ||
        null,
    },
  });
}


/* =========================================================
   STUDENT CANCEL DISPUTE
========================================================= */

export async function cancelStudentDispute(
  dispute,
  student
) {
  if (
    !dispute?.id
  ) {
    throw new Error(
      "Dispute ID is required."
    );
  }


  if (
    !student?.uid
  ) {
    throw new Error(
      "You must be logged in."
    );
  }


  if (
    dispute.status !==
    "pending"
  ) {
    throw new Error(
      "Only pending disputes can be cancelled."
    );
  }


  await updateDoc(
    doc(
      db,
      "disputes",
      dispute.id
    ),

    {
      status:
        "cancelled",

      cancelledAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    }
  );


  await createDisputeAuditLog({
    action:
      "dispute_cancelled",

    actor:
      student,

    disputeId:
      dispute.id,

    attendanceId:
      dispute.attendanceId ||
      null,

    details: {
      previousStatus:
        dispute.status,
    },
  });
}


/* =========================================================
   TEACHER REVIEW
========================================================= */

export async function reviewDisputeByTeacher({
  disputeId,
  attendanceId,
  status,
  teacherComment,
  correctedAttendanceStatus,
  teacherUser,
}) {
  if (
    !disputeId
  ) {
    throw new Error(
      "Dispute ID is required."
    );
  }


  if (
    !teacherUser?.uid ||
    teacherUser?.role !==
      "teacher"
  ) {
    throw new Error(
      "Only a teacher can review this dispute."
    );
  }


  const decision =
    normalizeDisputeStatus(
      status
    );


  if (
    decision !==
      "approved" &&
    decision !==
      "rejected"
  ) {
    throw new Error(
      "The dispute must be approved or rejected."
    );
  }


  let correctedStatus =
    "";


  if (
    decision ===
    "approved"
  ) {
    correctedStatus =
      normalizeAttendanceStatus(
        correctedAttendanceStatus
      );


    if (
      correctedStatus ===
        "unknown" ||
      correctedStatus ===
        "missing"
    ) {
      throw new Error(
        "Please select a valid corrected attendance status."
      );
    }
  }


  await updateDoc(
    doc(
      db,
      "disputes",
      disputeId
    ),

    {
      status:
        decision,

      teacherComment:
        teacherComment?.trim() ||
        "",

      teacherRecommendation:
        decision ===
        "approved"
          ? correctedStatus
          : "no_change",

      reviewedBy:
        teacherUser.uid,

      reviewedAt:
        serverTimestamp(),

      resolvedAt:
        serverTimestamp(),

      updatedAt:
        serverTimestamp(),
    }
  );


  /*
    If this dispute is connected to an existing
    attendance record, update that attendance.
    Missing-record disputes currently do not
    create a brand-new attendance document.
  */

  if (
    decision ===
      "approved" &&
    attendanceId
  ) {
    await updateDoc(
      doc(
        db,
        "attendance",
        attendanceId
      ),

      {
        status:
          correctedStatus,

        updatedBy:
          teacherUser.uid,

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
      `dispute_${decision}`,

    actor:
      teacherUser,

    disputeId,

    attendanceId:
      attendanceId ||
      null,

    details: {
      teacherComment:
        teacherComment?.trim() ||
        "",

      correctedAttendanceStatus:
        decision ===
        "approved"
          ? correctedStatus
          : null,
    },
  });
}


/* =========================================================
   ADMIN DELETE DISPUTE
========================================================= */

export async function deleteDisputeByAdmin(
  dispute,
  adminUser
) {
  if (
    !dispute?.id
  ) {
    throw new Error(
      "Dispute ID is required."
    );
  }


  if (
    !adminUser?.uid
  ) {
    throw new Error(
      "Administrator information is missing."
    );
  }


  if (
    String(
      adminUser.role ||
        ""
    ).toLowerCase() !==
    "admin"
  ) {
    throw new Error(
      "Only an administrator can delete disputes."
    );
  }


  /*
    Write the audit record BEFORE deleting
    the dispute so the original dispute data
    is still available for the audit trail.
  */

  await createDisputeAuditLog({
    action:
      "dispute_deleted",

    actor:
      adminUser,

    disputeId:
      dispute.id,

    attendanceId:
      dispute.attendanceId ||
      null,

    details: {
      studentUserId:
        dispute.userId ||
        null,

      studentId:
        dispute.studentId ||
        null,

      studentName:
        dispute.studentName ||
        null,

      department:
        dispute.department ||
        null,

      issueType:
        dispute.issueType ||
        null,

      reason:
        dispute.reason ||
        null,

      previousStatus:
        dispute.status ||
        null,

      originalStatus:
        dispute.originalStatus ||
        null,

      requestedStatus:
        dispute.requestedStatus ||
        null,

      submittedAt:
        dispute.submittedAt
          ? dispute.submittedAt.toISOString?.() ||
            String(
              dispute.submittedAt
            )
          : null,
    },
  });


  await deleteDoc(
    doc(
      db,
      "disputes",
      dispute.id
    )
  );
}