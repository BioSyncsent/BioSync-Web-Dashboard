import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";

function extractDate(raw) {
  const candidate =
    raw.date ?? raw.timestamp ?? raw.checkInTime ?? raw.createdAt ?? raw.time ?? null;

  if (!candidate) return null;
  if (typeof candidate.toDate === "function") return candidate.toDate();
  const parsed = new Date(candidate);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeStatus(raw) {
  const status = (raw.status || "").toString().toLowerCase();
  if (status.includes("present")) return "present";
  if (status.includes("late")) return "late";
  if (status.includes("absent")) return "absent";
  return "unknown";
}

function normalizeRecord(doc) {
  const raw = doc.data();
  const date = extractDate(raw);

  return {
    id: doc.id,
    userId: raw.userId || raw.usedId || raw.uid || "—",
    name: raw.name || raw.fullName || raw.userName || raw.userId || raw.usedId || "Unknown",
    method: raw.authMethod || raw.method || "Unknown",
    status: normalizeStatus(raw),
    date,
    timeLabel: date
      ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "—",
    dateLabel: date ? date.toLocaleDateString() : "—",
  };
}

export async function fetchAttendanceRecords() {
  const snapshot = await getDocs(collection(db, "attendance"));
  return snapshot.docs.map(normalizeRecord);
}

export function getSummary(records) {
  const summary = { total: records.length, present: 0, absent: 0, late: 0 };
  for (const r of records) {
    if (r.status === "present") summary.present += 1;
    else if (r.status === "absent") summary.absent += 1;
    else if (r.status === "late") summary.late += 1;
  }
  return summary;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getWeeklyChartData(records) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toDateString(),
      day: WEEKDAY_LABELS[d.getDay()],
      present: 0,
      absent: 0,
      late: 0,
    });
  }

  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));

  for (const r of records) {
    if (!r.date) continue;
    const key = r.date.toDateString();
    const bucket = byKey[key];
    if (!bucket) continue;
    if (r.status === "present") bucket.present += 1;
    else if (r.status === "absent") bucket.absent += 1;
    else if (r.status === "late") bucket.late += 1;
  }

  return days.map(({ key, ...rest }) => rest);
}

export function getTrendData(records) {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push({
      key: d.toDateString(),
      date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      present: 0,
      absent: 0,
      late: 0,
    });
  }

  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));

  for (const r of records) {
    if (!r.date) continue;
    const key = r.date.toDateString();
    const bucket = byKey[key];
    if (!bucket) continue;
    if (r.status === "present") bucket.present += 1;
    else if (r.status === "absent") bucket.absent += 1;
    else if (r.status === "late") bucket.late += 1;
  }

  return days.map(({ key, ...rest }) => rest);
}

export function getRecentActivity(records, count = 6) {
  return [...records]
    .filter((r) => r.date)
    .sort((a, b) => b.date - a.date)
    .slice(0, count);
}