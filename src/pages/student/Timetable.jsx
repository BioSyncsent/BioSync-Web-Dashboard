import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Eye,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import {
  subscribeToTimetable,
  timeToMinutes,
} from "../../services/timetableService";

import "./Timetable.css";

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

function malaysiaClock() {
  const now = new Date();

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value])
  );

  return {
    day: DAYS.indexOf(values.weekday) + 1,
    minutes: Number(values.hour) * 60 + Number(values.minute),
    time: `${values.hour}:${values.minute}`,
    label: new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kuala_Lumpur",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now),
  };
}

function validSession(session) {
  return (
    session &&
    typeof session.id === "string" &&
    Boolean(session.id) &&
    typeof session.subjectCode === "string" &&
    Boolean(session.subjectCode.trim()) &&
    Number.isInteger(session.day) &&
    session.day >= 1 &&
    session.day <= 5 &&
    Number.isFinite(timeToMinutes(session.startTime)) &&
    Number.isFinite(timeToMinutes(session.endTime)) &&
    timeToMinutes(session.endTime) > timeToMinutes(session.startTime)
  );
}

function sessionStatus(session, clock) {
  if (session.day !== clock.day) return "Scheduled";
  if (clock.minutes < timeToMinutes(session.startTime)) return "Upcoming";
  if (clock.minutes < timeToMinutes(session.endTime)) return "In progress";
  return "Completed";
}

function SessionDetails({ session, clock, onClose }) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="teacher-tt-dialog"
      aria-labelledby="student-session-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="teacher-tt-dialog-content">
        <header>
          <div>
            <span className="teacher-tt-eyebrow">CLASS DETAILS</span>
            <h2 id="student-session-title">{session.subjectCode}</h2>
          </div>

          <button
            type="button"
            aria-label="Close class details"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <dl>
          {[
            ["Timetable", "Shared CID schedule"],
            ["Day", DAYS[session.day - 1]],
            ["Start time", session.startTime],
            ["End time", session.endTime],
            ["Timezone", "Malaysia · UTC+8"],
            ["Session status", sessionStatus(session, clock)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <p className="teacher-tt-note">
          These details describe the class schedule. Your attendance result
          is available on the My Attendance page.
        </p>
      </div>
    </dialog>
  );
}

export default function StudentTimetable() {
  const { user } = useAuth();

  const [schedule, setSchedule] = useState({
    exists: false,
    revision: 0,
    sessions: [],
  });

  const [clock, setClock] = useState(malaysiaClock);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);

  const canRead =
    user?.role === "student" &&
    user?.active !== false &&
    user?.department === "CID";

  useEffect(() => {
    if (!canRead) {
      setSchedule({ exists: false, revision: 0, sessions: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    setSelectedId(null);

    return subscribeToTimetable(
      (data) => {
        const ids = new Set();

        const invalid = data.sessions.some((session) => {
          if (!validSession(session) || ids.has(session.id)) return true;
          ids.add(session.id);
          return false;
        });

        if (invalid) {
          setError(
            "The timetable contains invalid sessions. Please contact the administrator."
          );
          setLoading(false);
          return;
        }

        setSchedule(data);
        setError("");
        setLoading(false);
      },
      (failure) => {
        setError(
          failure.code === "permission-denied"
            ? "Timetable access was denied. Your account must be an active CID student."
            : failure.message || "Unable to load the timetable."
        );
        setLoading(false);
      }
    );
  }, [canRead, user?.uid, retry]);

  useEffect(() => {
    const update = () => setClock(malaysiaClock());
    const timer = window.setInterval(update, 15000);

    window.addEventListener("focus", update);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  const sessions = useMemo(
    () =>
      [...schedule.sessions].sort(
        (a, b) =>
          a.day - b.day ||
          timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
      ),
    [schedule.sessions]
  );

  const todaySessions = sessions.filter(
    (session) => session.day === clock.day
  );

  const current = todaySessions.find(
    (session) =>
      clock.minutes >= timeToMinutes(session.startTime) &&
      clock.minutes < timeToMinutes(session.endTime)
  );

  const next = useMemo(
    () =>
      sessions
        .map((session) => {
          let daysAway = (session.day - clock.day + 7) % 7;

          if (
            daysAway === 0 &&
            timeToMinutes(session.startTime) <= clock.minutes
          ) {
            daysAway = 7;
          }

          return {
            session,
            daysAway,
            distance:
              daysAway * 1440 +
              timeToMinutes(session.startTime) -
              clock.minutes,
          };
        })
        .sort((a, b) => a.distance - b.distance)[0],
    [sessions, clock.day, clock.minutes]
  );

  const weeklySessions = sessions.filter((session) =>
    session.subjectCode
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const selectedSession = selectedId
    ? sessions.find((session) => session.id === selectedId)
    : null;

  function sessionCard(session) {
    const status = sessionStatus(session, clock);

    return (
      <button
        type="button"
        key={session.id}
        className={`teacher-tt-session ${
          session.color === "blue" ? "is-blue" : ""
        } ${status === "In progress" ? "is-current" : ""}`}
        onClick={() => setSelectedId(session.id)}
        aria-label={`View ${session.subjectCode}, ${
          DAYS[session.day - 1]
        }, ${session.startTime} to ${session.endTime}`}
      >
        <span
          className={`teacher-tt-status status-${status
            .toLowerCase()
            .replaceAll(" ", "-")}`}
        >
          {status}
        </span>

        <strong>{session.subjectCode}</strong>

        <span className="teacher-tt-session-time">
          <Clock3 size={14} />
          {session.startTime} – {session.endTime}
        </span>

        <span className="teacher-tt-detail-link">
          Class details <Eye size={14} />
        </span>
      </button>
    );
  }

  if (!canRead) {
    return (
      <section className="teacher-tt-page">
        <div className="teacher-tt-panel">
          This timetable is currently available to active CID students only.
        </div>
      </section>
    );
  }

  return (
    <section className="teacher-tt-page" aria-label="Student timetable">
      <header className="teacher-tt-hero">
        <div>
          <span className="teacher-tt-eyebrow">
            <ShieldCheck size={14} /> STUDENT WORKSPACE
          </span>

          <h1>My <span>Timetable</span></h1>

          <p>Plan your day and check when your next class begins.</p>

          <div className="teacher-tt-tags">
            <span>Shared CID schedule</span>
            <span>View only</span>
            <span>Malaysia time</span>
          </div>
        </div>

        <div className="teacher-tt-clock">
          <Clock3 size={20} />
          <strong>{clock.time}</strong>
          <span>{clock.label}</span>
        </div>
      </header>

      {loading ? (
        <div className="teacher-tt-panel teacher-tt-empty" role="status">
          Loading your timetable…
        </div>
      ) : error ? (
        <div className="teacher-tt-panel teacher-tt-error" role="alert">
          <h2>Unable to show timetable</h2>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setRetry((value) => value + 1)}
          >
            <RefreshCw size={15} /> Retry
          </button>
        </div>
      ) : (
        <>
          <div className="teacher-tt-summary">
            <article className="teacher-tt-panel">
              <span><CalendarDays size={17} /> Today’s Classes</span>
              <strong>{todaySessions.length}</strong>
              <small>{clock.day ? DAYS[clock.day - 1] : "Weekend"}</small>
            </article>

            <article className="teacher-tt-panel">
              <span><Clock3 size={17} /> Current Class</span>
              <strong>{current?.subjectCode || "No active class"}</strong>
              <small>
                {current
                  ? `${current.startTime} – ${current.endTime}`
                  : "Outside scheduled class hours"}
              </small>
            </article>

            <article className="teacher-tt-panel">
              <span><BookOpen size={17} /> Next Class</span>
              <strong>{next?.session.subjectCode || "No sessions"}</strong>
              <small>
                {next
                  ? `${
                      next.daysAway === 0
                        ? "Today"
                        : DAYS[next.session.day - 1]
                    } · ${next.session.startTime}${
                      next.daysAway === 7 ? " · next week" : ""
                    }`
                  : "Waiting for the administrator"}
              </small>
            </article>
          </div>

          <section className="teacher-tt-panel">
            <div className="teacher-tt-section-header">
              <div>
                <span className="teacher-tt-eyebrow">YOUR DAILY SCHEDULE</span>
                <h2>Today’s Classes</h2>
                <p>{clock.label}</p>
              </div>

              <span className="teacher-tt-count">
                {todaySessions.length} session(s)
              </span>
            </div>

            {todaySessions.length ? (
              <div className="teacher-tt-today">
                {todaySessions.map(sessionCard)}
              </div>
            ) : (
              <div className="teacher-tt-empty">
                <CalendarDays size={28} />
                <h3>No classes scheduled today</h3>
                <p>Check your weekly timetable for the next class.</p>
              </div>
            )}
          </section>

          <section className="teacher-tt-panel">
            <div className="teacher-tt-section-header">
              <div>
                <span className="teacher-tt-eyebrow">SHARED CID SCHEDULE</span>
                <h2>Weekly Timetable</h2>
                <p>Updates from the administrator appear automatically.</p>
              </div>

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search subject code…"
                aria-label="Search weekly timetable subjects"
              />
            </div>

            {!sessions.length ? (
              <div className="teacher-tt-empty">
                <h3>No timetable sessions yet</h3>
                <p>The administrator has not added the schedule yet.</p>
              </div>
            ) : (
              <>
                {search.trim() && !weeklySessions.length && (
                  <p className="teacher-tt-note">
                    No subjects match your search.
                  </p>
                )}

                <div className="teacher-tt-week">
                  {DAYS.map((day, index) => {
                    const daily = weeklySessions.filter(
                      (session) => session.day === index + 1
                    );

                    return (
                      <article
                        key={day}
                        className={`teacher-tt-day ${
                          clock.day === index + 1 ? "is-today" : ""
                        }`}
                      >
                        <header>
                          <h3>{day}</h3>
                          {clock.day === index + 1 && <span>Today</span>}
                        </header>

                        <div className="teacher-tt-day-sessions">
                          {daily.length ? (
                            daily.map(sessionCard)
                          ) : (
                            <p className="teacher-tt-no-session">
                              {search.trim()
                                ? "No matching sessions"
                                : "No sessions"}
                            </p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <p className="teacher-tt-note">
            Class times follow Malaysia time. Present/Late results and
            grace-period enforcement will be connected to timetable
            sessions in the attendance integration.
          </p>
        </>
      )}

      {!loading && !error && selectedSession && (
        <SessionDetails
          session={selectedSession}
          clock={clock}
          onClose={() => setSelectedId(null)}
        />
      )}
    </section>
  );
}