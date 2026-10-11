import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Fingerprint,
  MessageSquareWarning,
  Monitor,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import { db } from "../../firebase/firebase";
import { useFirestoreSubscription } from "../../hooks/useFirestoreSubscription";
import { subscribeToDisputesManagement } from "../../services/disputeService";

import "./Dashboard.css";

/* Change this only if your attendance timestamp field has another name. */
const ATTENDANCE_TIME_FIELD = "time";

function toDate(value) {
  if (!value) return null;

  const date =
    typeof value.toDate === "function"
      ? value.toDate()
      : value instanceof Date
        ? value
        : new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatTime(date) {
  if (!date) return "Unavailable";

  return date.toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusOf(value) {
  return String(value || "unknown").trim().toLowerCase();
}

function readable(value) {
  return String(value || "Unavailable").replaceAll("_", " ");
}

function Metric({ icon: Icon, label, value, helper, tone = "cyan" }) {
  return (
    <div className={`bad-metric bad-tone-${tone}`}>
      <span className="bad-metric-icon">
        <Icon size={21} aria-hidden="true" />
      </span>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{helper}</small>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fromCache, setFromCache] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [scope, setScope] = useState("today");
  const [search, setSearch] = useState("");
  const [now, setNow] = useState(() => new Date());

  const disputesSubscription = useFirestoreSubscription(
    subscribeToDisputesManagement,
    []
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError("");

    const attendanceQuery = query(
      collection(db, "attendance"),
      orderBy(ATTENDANCE_TIME_FIELD, "desc"),
      limit(200)
    );

    return onSnapshot(
      attendanceQuery,
      { includeMetadataChanges: true },
      (snapshot) => {
        setRecords(
          snapshot.docs.map((document) => {
            const data = document.data();

            return {
              ...data,
              id: document.id,
              recordTime: toDate(data[ATTENDANCE_TIME_FIELD]),
              normalizedStatus: statusOf(data.status),
            };
          })
        );
        setFromCache(snapshot.metadata.fromCache);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message || "Unable to load attendance.");
        setLoading(false);
      }
    );
  }, [retryKey]);

  const today = dayKey(now);

  const scopedRecords = useMemo(
    () =>
      scope === "today"
        ? records.filter((record) => dayKey(record.recordTime) === today)
        : records,
    [records, scope, today]
  );

  const summary = useMemo(() => {
    const count = (status) =>
      scopedRecords.filter(
        (record) => record.normalizedStatus === status
      ).length;

    const present = count("present");
    const late = count("late");
    const absent = count("absent");
    const classified = present + late + absent;

    return {
      total: scopedRecords.length,
      present,
      late,
      absent,
      other: scopedRecords.length - classified,
      rate: classified ? Math.round(((present + late) / classified) * 100) : null,
    };
  }, [scopedRecords]);

  const visibleRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return scopedRecords.filter((record) =>
      [
        record.name,
        record.studentName,
        record.studentId,
        record.status,
        record.method,
        record.authMethod,
        record.authenticationMethod,
        record.terminalId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [scopedRecords, search]);

  const week = useMemo(() => {
    /* UTC dates here represent calendar days in Malaysia. */
    const anchor = new Date(`${today}T12:00:00+08:00`);

    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(anchor);
      date.setUTCDate(date.getUTCDate() - (6 - index));

      const key = dayKey(date);
      const daily = records.filter(
        (record) => dayKey(record.recordTime) === key
      );

      return {
        key,
        label: date.toLocaleDateString("en-MY", {
          timeZone: "Asia/Kuala_Lumpur",
          weekday: "short",
        }),
        present: daily.filter((r) => r.normalizedStatus === "present").length,
        late: daily.filter((r) => r.normalizedStatus === "late").length,
        absent: daily.filter((r) => r.normalizedStatus === "absent").length,
      };
    });
  }, [records, today]);

  const chartMax = Math.max(
    1,
    ...week.map((day) => day.present + day.late + day.absent)
  );

  const pendingDisputes = (disputesSubscription.data || []).filter(
    (dispute) =>
      ["pending", "under_review", "awaiting_information"].includes(
        statusOf(dispute.status)
      )
  );

  const unavailable = loading || Boolean(error);
  const metricValue = (value) => (unavailable ? "—" : value);
  const rateText =
    unavailable || summary.rate === null ? "—" : `${summary.rate}%`;

  return (
    <div className="bad-page">
      <header className="bad-hero">
        <div className="bad-hero-grid" aria-hidden="true" />

        <div className="bad-hero-copy">
          <span className="bad-eyebrow">
            <ShieldCheck size={15} />
            BioSync administration
          </span>

          <h1>Admin Dashboard</h1>

          <p>
            Monitor attendance activity, follow up on disputes and access
            your BioSync management tools.
          </p>

          <div className="bad-hero-tags">
            <span>
              <Activity size={14} />
              {loading
                ? "Loading attendance"
                : error
                  ? "Attendance unavailable"
                  : fromCache
                    ? "Cached attendance data"
                    : "Attendance subscription active"}
            </span>
            <span>
              <Clock3 size={14} />
              {now.toLocaleDateString("en-MY", {
                timeZone: "Asia/Kuala_Lumpur",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        <div className="bad-hero-score">
          <div
            className="bad-ring"
            style={{
              "--score":
                unavailable || summary.rate === null ? 0 : summary.rate,
            }}
            aria-label={`Recorded attendance rate: ${rateText}`}
          >
            <div>
              <strong>{rateText}</strong>
              <span>Recorded rate</span>
            </div>
          </div>
          <strong>{scope === "today" ? "Today’s attendance" : "Recent attendance"}</strong>
          <small>Present + late / classified records</small>
        </div>
      </header>

      <div className="bad-toolbar">
        <div>
          <h2>Attendance overview</h2>
          <p>Based on the latest 200 records · Malaysia time</p>
        </div>

        <div className="bad-scope" aria-label="Attendance period">
          <button
            type="button"
            aria-pressed={scope === "today"}
            onClick={() => setScope("today")}
          >
            Today
          </button>
          <button
            type="button"
            aria-pressed={scope === "recent"}
            onClick={() => setScope("recent")}
          >
            Recent records
          </button>
        </div>
      </div>

      {error && (
        <div className="bad-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
            Retry attendance
          </button>
        </div>
      )}

      <div className="bad-metrics">
        <Metric
          icon={Users}
          label="Total records"
          value={metricValue(summary.total)}
          helper="Selected period"
        />
        <Metric
          icon={CheckCircle2}
          label="Present"
          value={metricValue(summary.present)}
          helper="Recorded as present"
          tone="green"
        />
        <Metric
          icon={Clock3}
          label="Late"
          value={metricValue(summary.late)}
          helper="Recorded as late"
          tone="amber"
        />
        <Metric
          icon={XCircle}
          label="Absent"
          value={metricValue(summary.absent)}
          helper="Explicit absence records"
          tone="red"
        />
        <Metric
          icon={Activity}
          label="Attendance rate"
          value={rateText}
          helper="Present + late"
        />
      </div>

      <div className="bad-content-grid">
        <section className="bad-card">
          <div className="bad-card-heading">
            <div>
              <span className="bad-eyebrow">Attendance activity</span>
              <h2>Last seven days</h2>
              <p>Daily counts within the loaded attendance records.</p>
            </div>
            <span className="bad-heading-icon">
              <BarChart3 size={21} />
            </span>
          </div>

          {unavailable ? (
            <div className="bad-empty">
              {loading ? "Loading activity…" : "Activity unavailable."}
            </div>
          ) : (
            <>
              <div className="bad-chart">
                {week.map((day) => (
                  <div className="bad-chart-day" key={day.key}>
                    <div className="bad-chart-track">
                      <div
                        className="bad-chart-stack"
                        title={`${day.key}: ${day.present} present, ${day.late} late, ${day.absent} absent`}
                      >
                        <span
                          className="bad-bar-absent"
                          style={{ height: `${(day.absent / chartMax) * 100}%` }}
                        />
                        <span
                          className="bad-bar-late"
                          style={{ height: `${(day.late / chartMax) * 100}%` }}
                        />
                        <span
                          className="bad-bar-present"
                          style={{ height: `${(day.present / chartMax) * 100}%` }}
                        />
                      </div>
                    </div>
                    <strong>{day.present + day.late + day.absent}</strong>
                    <span>{day.label}</span>
                  </div>
                ))}
              </div>

              <div className="bad-legend">
                <span><i className="bad-bar-present" />Present</span>
                <span><i className="bad-bar-late" />Late</span>
                <span><i className="bad-bar-absent" />Absent</span>
              </div>
            </>
          )}

          <p className="bad-footnote">
            Missing attendance records are not automatically counted as absent.
            {summary.other > 0 && !unavailable
              ? ` ${summary.other} records in the selected period have other statuses.`
              : ""}
          </p>
        </section>

        <section className="bad-card">
          <div className="bad-card-heading">
            <div>
              <span className="bad-eyebrow">Requires attention</span>
              <h2>Dispute follow-up</h2>
              <p>Open requests awaiting progress.</p>
            </div>
            <span className="bad-heading-icon">
              <MessageSquareWarning size={21} />
            </span>
          </div>

          {disputesSubscription.loading ? (
            <div className="bad-empty">Loading disputes…</div>
          ) : disputesSubscription.error ? (
            <div className="bad-empty">
              <p>Unable to load disputes.</p>
              <button
                type="button"
                className="bad-button"
                onClick={disputesSubscription.retry}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="bad-attention-count">
                <strong>{pendingDisputes.length}</strong>
                <span>open dispute requests</span>
              </div>

              <div className="bad-dispute-list">
                {pendingDisputes.slice(0, 3).map((dispute) => (
                  <Link
                    to="/admin/disputes"
                    className="bad-dispute"
                    key={dispute.id}
                  >
                    <div>
                      <strong>{dispute.studentName || "Student"}</strong>
                      <span>{dispute.reason || "Attendance correction"}</span>
                    </div>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}

                {pendingDisputes.length === 0 && (
                  <p className="bad-empty">No open disputes.</p>
                )}
              </div>
            </>
          )}

          <Link to="/admin/disputes" className="bad-button">
            Manage disputes <ArrowUpRight size={15} />
          </Link>
        </section>
      </div>

      <section className="bad-card bad-records">
        <div className="bad-card-heading">
          <div>
            <span className="bad-eyebrow">Attendance records</span>
            <h2>Recent activity</h2>
            <p>Showing up to 10 matching records for the selected period.</p>
          </div>
          <Link to="/admin/attendance" className="bad-text-link">
            View attendance <ArrowUpRight size={15} />
          </Link>
        </div>

        <label className="bad-search">
          <Search size={17} aria-hidden="true" />
          <input
            aria-label="Search attendance records"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, student ID, status or terminal…"
          />
        </label>

        <div className="bad-table-scroll">
          <table className="bad-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Terminal</th>
                <th>Recorded time</th>
              </tr>
            </thead>
            <tbody>
              {unavailable || visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="bad-empty">
                    {loading
                      ? "Loading attendance…"
                      : error
                        ? "Attendance unavailable."
                        : "No matching attendance records."}
                  </td>
                </tr>
              ) : (
                visibleRecords.slice(0, 10).map((record) => (
                  <tr key={record.id}>
                    <td>
                      <div className="bad-student">
                        <span>
                          {(record.name || record.studentName || "S")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                        <div>
                          <strong>
                            {record.name || record.studentName || "Unknown student"}
                          </strong>
                          <small>{record.studentId || "ID unavailable"}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`bad-status bad-status-${["present", "late", "absent"].includes(record.normalizedStatus) ? record.normalizedStatus : "other"}`}
                      >
                        {readable(record.normalizedStatus)}
                      </span>
                    </td>
                    <td>
                      <span className="bad-method">
                        <Fingerprint size={14} />
                        {readable(
                          record.method ||
                          record.authMethod ||
                          record.authenticationMethod
                        )}
                      </span>
                    </td>
                    <td>{record.terminalId || "Unavailable"}</td>
                    <td>{formatTime(record.recordTime)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <nav className="bad-quick-links" aria-label="Admin quick actions">
        {[
          ["/admin/attendance", "Attendance", "Manage attendance records", Activity],
          ["/admin/disputes", "Disputes", "Follow up on correction requests", MessageSquareWarning],
          ["/admin/analytics", "Analytics", "Explore attendance performance", BarChart3],
          ["/admin/devices", "Devices", "Track terminal development", Monitor],
        ].map(([path, label, description, Icon]) => (
          <Link to={path} key={path}>
            <span className="bad-heading-icon"><Icon size={20} /></span>
            <div>
              <strong>{label}</strong>
              <small>{description}</small>
            </div>
            <ArrowUpRight size={17} />
          </Link>
        ))}
      </nav>
    </div>
  );
}