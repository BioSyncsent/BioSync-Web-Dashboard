import {
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebase";

const timetableRef = doc(db, "timetables", "CID");

export const DEFAULT_SESSIONS = [
  {
    id: "cid-mon-spg",
    subjectCode: "SPG 0562",
    day: 1,
    startTime: "09:00",
    endTime: "13:00",
    color: "teal",
  },
  {
    id: "cid-mon-ntc",
    subjectCode: "NTC 1052",
    day: 1,
    startTime: "14:00",
    endTime: "18:00",
    color: "blue",
  },
  {
    id: "cid-wed-2383",
    subjectCode: "CBS 2383",
    day: 3,
    startTime: "08:00",
    endTime: "13:00",
    color: "teal",
  },
  {
    id: "cid-thu-2363",
    subjectCode: "CBS 2363",
    day: 4,
    startTime: "08:00",
    endTime: "13:00",
    color: "blue",
  },
  {
    id: "cid-thu-2372",
    subjectCode: "CBS 2372",
    day: 4,
    startTime: "14:00",
    endTime: "17:00",
    color: "teal",
  },
];

export function timeToMinutes(value) {
  if (!/^\d{2}:\d{2}$/.test(value || "")) {
    return NaN;
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (hours > 23 || minutes > 59) {
    return NaN;
  }

  return hours * 60 + minutes;
}

function validateSession(session) {
  const start = timeToMinutes(session.startTime);
  const end = timeToMinutes(session.endTime);

  if (
    typeof session.id !== "string" ||
    !session.id ||
    !session.subjectCode?.trim() ||
    session.subjectCode.trim().length > 40
  ) {
    throw new Error("Enter a subject code of up to 40 characters.");
  }

  if (
    !Number.isInteger(session.day) ||
    session.day < 1 ||
    session.day > 5
  ) {
    throw new Error("Choose a day from Monday to Friday.");
  }

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new Error("End time must be later than start time.");
  }

  if (!["teal", "blue"].includes(session.color)) {
    throw new Error("Choose a valid session colour.");
  }
}

function validateSchedule(sessions) {
  if (sessions.length > 50) {
    throw new Error("This timetable supports up to 50 weekly sessions.");
  }

  const ids = new Set();

  sessions.forEach((session) => {
    validateSession(session);

    if (ids.has(session.id)) {
      throw new Error("Duplicate session ID.");
    }

    ids.add(session.id);
  });

  for (let first = 0; first < sessions.length; first += 1) {
    for (let second = first + 1; second < sessions.length; second += 1) {
      const a = sessions[first];
      const b = sessions[second];

      if (
        a.day === b.day &&
        timeToMinutes(a.startTime) < timeToMinutes(b.endTime) &&
        timeToMinutes(b.startTime) < timeToMinutes(a.endTime)
      ) {
        throw new Error(
          `${a.subjectCode} overlaps with ${b.subjectCode}.`
        );
      }
    }
  }
}

export function subscribeToTimetable(onData, onError) {
  return onSnapshot(
    timetableRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({ exists: false, revision: 0, sessions: [] });
        return;
      }

      const data = snapshot.data();

      onData({
        exists: true,
        revision: Number(data.revision) || 0,
        sessions: Array.isArray(data.sessions) ? data.sessions : [],
      });
    },
    onError
  );
}

async function changeSchedule(expectedRevision, transform) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in again.");
  }

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(timetableRef);
    const data = snapshot.exists() ? snapshot.data() : {};
    const revision = Number(data.revision) || 0;

    if (revision !== expectedRevision) {
      throw new Error(
        "The timetable changed while you were editing. Close this form and try again."
      );
    }

    const current = Array.isArray(data.sessions) ? data.sessions : [];
    const sessions = transform(current);

    validateSchedule(sessions);

    transaction.set(timetableRef, {
      department: "CID",
      timeZone: "Asia/Kuala_Lumpur",
      sessions,
      revision: revision + 1,
      updatedAt: serverTimestamp(),
      updatedBy: user.uid,
    });
  });
}

export function saveTimetableSession(session, revision, editing = false) {
  const clean = {
    id: session.id,
    subjectCode: session.subjectCode.trim().toUpperCase(),
    day: Number(session.day),
    startTime: session.startTime,
    endTime: session.endTime,
    color: session.color,
  };

  return changeSchedule(revision, (sessions) => {
    if (editing) {
      if (!sessions.some((item) => item.id === clean.id)) {
        throw new Error("This session no longer exists.");
      }

      return sessions.map((item) =>
        item.id === clean.id ? clean : item
      );
    }

    return [...sessions, clean];
  });
}

export function deleteTimetableSession(id, revision) {
  return changeSchedule(revision, (sessions) =>
    sessions.filter((session) => session.id !== id)
  );
}

export function loadDefaultTimetable(revision) {
  return changeSchedule(revision, (sessions) => {
    if (sessions.length) {
      throw new Error("The timetable already contains sessions.");
    }

    return DEFAULT_SESSIONS.map((session) => ({ ...session }));
  });
}