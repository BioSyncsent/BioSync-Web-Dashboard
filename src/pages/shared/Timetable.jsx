import { useEffect, useRef, useState } from "react";

import {
  CalendarDays,
  Clock3,
  Info,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";

import {
  deleteTimetableSession,
  loadDefaultTimetable,
  saveTimetableSession,
  subscribeToTimetable,
  timeToMinutes,
} from "../../services/timetableService";

import "./Timetable.css";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

function emptyForm() {
  return {
    id: "",
    subjectCode: "",
    day: 1,
    startTime: "09:00",
    endTime: "10:00",
    color: "teal",
  };
}

function malaysiaDay() {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    weekday: "long",
  }).format(new Date());

  return DAYS.indexOf(name) + 1;
}

function readableError(error) {
  if (error?.code === "permission-denied") {
    return "Access denied. Check your account department and the timetable Firestore rules.";
  }

  return error?.message || "Unable to complete this action.";
}

export default function Timetable() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";

  const canRead =
    isAdmin ||
    (["teacher", "student"].includes(user?.role) &&
      user?.department === "CID");

  const [schedule, setSchedule] = useState({
    exists: false,
    revision: 0,
    sessions: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formRevision, setFormRevision] = useState(0);
  const [formError, setFormError] = useState("");
  const [today, setToday] = useState(malaysiaDay);

  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const actionRef = useRef(false);

  useEffect(() => {
    if (!canRead) {
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setError("");

    return subscribeToTimetable(
      (data) => {
        setSchedule(data);
        setLoading(false);
      },
      (failure) => {
        setError(readableError(failure));
        setLoading(false);
      }
    );
  }, [canRead, user?.uid]);

  useEffect(() => {
    const timer = window.setInterval(() => setToday(malaysiaDay()), 60000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!modalOpen) return undefined;

    const dialog = dialogRef.current;
    dialog?.querySelector("input")?.focus();

    function handleKey(event) {
      if (event.key === "Escape" && !actionRef.current) {
        setModalOpen(false);
        return;
      }

      if (event.key !== "Tab") return;

      const items = Array.from(
        dialog?.querySelectorAll(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled)'
        ) || []
      );

      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("keydown", handleKey);
      openerRef.current?.focus();
    };
  }, [modalOpen]);

  const sessions = schedule.sessions;
  const editing = Boolean(form.id);

  const starts = sessions
    .map((session) => timeToMinutes(session.startTime))
    .filter(Number.isFinite);

  const ends = sessions
    .map((session) => timeToMinutes(session.endTime))
    .filter(Number.isFinite);

  const gridStart = Math.floor(Math.min(480, ...starts) / 60) * 60;
  const gridEnd = Math.ceil(Math.max(1080, ...ends) / 60) * 60;
  const hours = (gridEnd - gridStart) / 60;
  const gridHeight = hours * 64;

  function openForm(session, event) {
    openerRef.current = event.currentTarget;
    setForm(session ? { ...session } : emptyForm());
    setFormRevision(schedule.revision);
    setFormError("");
    setNotice("");
    setModalOpen(true);
  }

  function closeForm() {
    if (!actionRef.current) {
      setModalOpen(false);
    }
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: name === "day" ? Number(value) : value,
    }));
  }

  async function save(event) {
    event.preventDefault();

    if (actionRef.current) return;

    actionRef.current = true;
    setBusy(true);
    setFormError("");

    try {
      await saveTimetableSession(
        {
          ...form,
          id: form.id || window.crypto.randomUUID(),
        },
        formRevision,
        editing
      );

      setModalOpen(false);
      setNotice(editing ? "Session updated." : "Session added.");
    } catch (failure) {
      setFormError(readableError(failure));
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }

  async function removeSession() {
    if (actionRef.current) return;

    if (!window.confirm(`Delete ${form.subjectCode} from the weekly timetable?`)) {
      return;
    }

    actionRef.current = true;
    setBusy(true);
    setFormError("");

    try {
      await deleteTimetableSession(form.id, formRevision);
      setModalOpen(false);
      setNotice("Session deleted.");
    } catch (failure) {
      setFormError(readableError(failure));
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }

  async function loadExample() {
    if (actionRef.current) return;

    actionRef.current = true;
    setBusy(true);
    setError("");

    try {
      await loadDefaultTimetable(schedule.revision);
      setNotice("The example CID timetable has been saved.");
    } catch (failure) {
      setError(readableError(failure));
    } finally {
      actionRef.current = false;
      setBusy(false);
    }
  }

  if (!canRead) {
    return (
      <section className="tt-page">
        <div className="tt-message">
          This timetable is currently available to CID accounts only.
        </div>
      </section>
    );
  }

  return (
    <section className="tt-page" aria-label="CID weekly timetable">
      <div className="tt-toolbar">
        <p>
          {isAdmin
            ? "Manage the shared weekly schedule for CID students."
            : "View the shared weekly schedule for CID students."}
        </p>

        {isAdmin && (
          <button
            className="tt-primary"
            disabled={loading || busy || Boolean(error)}
            onClick={(event) => openForm(null, event)}
          >
            <Plus size={18} />
            Add Session
          </button>
        )}
      </div>

      {error && <div className="tt-message tt-error" role="alert">{error}</div>}
      {notice && <div className="tt-message" role="status">{notice}</div>}

      <div className="tt-summary">
        <article>
          <span className="tt-summary-icon"><CalendarDays size={25} /></span>
          <div>
            <strong>{loading ? "…" : sessions.length}</strong>
            <span>Weekly Sessions</span>
          </div>
        </article>

        <article>
          <span className="tt-summary-icon"><Users size={25} /></span>
          <div><strong>CID</strong><span>Shared Timetable</span></div>
        </article>

        <article>
          <span className="tt-summary-icon"><Clock3 size={25} /></span>
          <div><strong>MYT</strong><span>Malaysia Time · UTC+8</span></div>
        </article>
      </div>

      {loading ? (
        <div className="tt-empty" role="status">Loading timetable…</div>
      ) : error ? null : sessions.length === 0 ? (
        <div className="tt-empty">
          <CalendarDays size={35} />
          <h2>No sessions yet</h2>
          <p>
            {isAdmin
              ? "Add your first session or load the example schedule."
              : "The administrator has not added any sessions yet."}
          </p>

          {isAdmin && (
            <button className="tt-primary" disabled={busy} onClick={loadExample}>
              {busy ? "Saving…" : "Load Example CID Timetable"}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="tt-calendar-scroll">
            <div className="tt-calendar">
              <div className="tt-calendar-header">
                <span>Time</span>
                {DAYS.map((day, index) => (
                  <span key={day} className={today === index + 1 ? "is-today" : ""}>
                    {day}
                  </span>
                ))}
              </div>

              <div className="tt-calendar-body">
                <div className="tt-time-rail" style={{ height: gridHeight }}>
                  {Array.from({ length: hours + 1 }, (_, index) => {
                    const hour = gridStart / 60 + index;

                    return (
                      <span
                        key={hour}
                        style={{ top: index * 64 }}
                        className={
                          index === 0 ? "tt-first-time" :
                          index === hours ? "tt-last-time" : ""
                        }
                      >
                        {String(hour).padStart(2, "0")}:00
                      </span>
                    );
                  })}
                </div>

                {DAYS.map((day, index) => (
                  <div
                    key={day}
                    className={`tt-day-column${today === index + 1 ? " is-today" : ""}`}
                    style={{ height: gridHeight }}
                  >
                    {sessions
                      .filter((session) => session.day === index + 1)
                      .map((session) => {
                        const start = timeToMinutes(session.startTime);
                        const end = timeToMinutes(session.endTime);

                        const style = {
                          top: ((start - gridStart) / 60) * 64,
                          height: ((end - start) / 60) * 64,
                        };

                        const content = (
                          <>
                            <strong>{session.subjectCode}</strong>
                            <span>{session.startTime} – {session.endTime}</span>
                            {isAdmin && <Pencil size={14} />}
                          </>
                        );

                        return isAdmin ? (
                          <button
                            key={session.id}
                            className={`tt-session tt-session-${session.color}`}
                            style={style}
                            title={`${session.subjectCode}: ${session.startTime}–${session.endTime}. Edit session`}
                            onClick={(event) => openForm(session, event)}
                          >
                            {content}
                          </button>
                        ) : (
                          <article
                            key={session.id}
                            className={`tt-session tt-session-${session.color}`}
                            style={style}
                            title={`${session.subjectCode}: ${session.startTime}–${session.endTime}`}
                          >
                            {content}
                          </article>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tt-mobile-list">
            {DAYS.map((day, index) => {
              const daily = sessions
                .filter((session) => session.day === index + 1)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <article className="tt-mobile-day" key={day}>
                  <h2>{day}{today === index + 1 && <small>Today</small>}</h2>

                  {daily.length === 0 ? (
                    <p>No sessions</p>
                  ) : daily.map((session) => (
                    <div className="tt-mobile-session" key={session.id}>
                      <div>
                        <strong>{session.subjectCode}</strong>
                        <span>{session.startTime} – {session.endTime}</span>
                      </div>

                      {isAdmin && (
                        <button
                          className="tt-icon-button"
                          aria-label={`Edit ${session.subjectCode}`}
                          onClick={(event) => openForm(session, event)}
                        >
                          <Pencil size={17} />
                        </button>
                      )}
                    </div>
                  ))}
                </article>
              );
            })}
          </div>
        </>
      )}

      <div className="tt-note">
        <Info size={18} />
        <span>
          Weekly schedule in Malaysia time. Attendance timing and grace-period
          enforcement will be connected in the next stage.
        </span>
      </div>

      {modalOpen && (
        <div
          className="tt-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeForm();
          }}
        >
          <section
            ref={dialogRef}
            className="tt-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tt-form-title"
          >
            <div className="tt-modal-heading">
              <h2 id="tt-form-title">{editing ? "Edit Session" : "Add Session"}</h2>
              <button
                className="tt-icon-button"
                onClick={closeForm}
                disabled={busy}
                aria-label="Close form"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={save}>
              <fieldset disabled={busy}>
                <label>
                  Subject code
                  <input
                    name="subjectCode"
                    value={form.subjectCode}
                    onChange={updateField}
                    placeholder="e.g. SPG 0562"
                    maxLength={40}
                    required
                  />
                </label>

                <label>
                  Day
                  <select name="day" value={form.day} onChange={updateField}>
                    {DAYS.map((day, index) => (
                      <option value={index + 1} key={day}>{day}</option>
                    ))}
                  </select>
                </label>

                <div className="tt-form-row">
                  <label>
                    Start time
                    <input
                      type="time"
                      name="startTime"
                      value={form.startTime}
                      onChange={updateField}
                      required
                    />
                  </label>

                  <label>
                    End time
                    <input
                      type="time"
                      name="endTime"
                      value={form.endTime}
                      onChange={updateField}
                      required
                    />
                  </label>
                </div>

                <label>
                  Colour
                  <select name="color" value={form.color} onChange={updateField}>
                    <option value="teal">Teal</option>
                    <option value="blue">Blue</option>
                  </select>
                </label>
              </fieldset>

              {formError && <p className="tt-form-error" role="alert">{formError}</p>}

              <div className="tt-form-actions">
                {editing && (
                  <button
                    type="button"
                    className="tt-danger"
                    disabled={busy}
                    onClick={removeSession}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}

                <button
                  type="button"
                  className="tt-secondary"
                  disabled={busy}
                  onClick={closeForm}
                >
                  Cancel
                </button>

                <button className="tt-primary" disabled={busy} type="submit">
                  {busy ? "Saving…" : "Save Session"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </section>
  );
}