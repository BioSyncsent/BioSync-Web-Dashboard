import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import { Bell, Menu, Wifi } from "lucide-react";

import { db } from "../../firebase/firebase";
import { useAuth } from "../../contexts/AuthContext";

import "./Navbar.css";

function getPageName(pathname) {
  if (pathname.includes("/timetable")) return "CID Timetable";
  if (pathname.includes("/account-center")) return "Account Center";
  if (pathname.includes("/attendance")) return "Attendance";
  if (pathname.includes("/disputes")) return "Disputes";
  if (pathname.includes("/analytics")) return "Analytics";
  if (pathname.includes("/devices")) return "Devices";
  if (pathname.includes("/users")) return "User Management";

  return "Dashboard";
}

function capitalize(value) {
  return value
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : "";
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kuala_Lumpur",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

const navbarStyles = `
  .db-shell .db-navbar.bs-navbar {
    display: flex;
    align-items: center;
    gap: 14px;

    min-height: 76px;
    padding: 14px 24px;

    border-bottom: 1px solid rgba(109, 217, 236, 0.16);
    background: #061820;
    box-shadow: none;

    font-family: "Inter", sans-serif;
  }

  .db-shell .bs-navbar .db-navbar-title-block {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 4px;

    width: auto;
    min-width: 0;
  }

.db-shell .bs-navbar .db-navbar-title {
  margin: 0;

  font-family: "Inter", sans-serif !important;
  font-size: 20px;
  font-weight: 600;
  font-style: normal;
  line-height: 1.35;
  letter-spacing: -0.025em;

  color: #edf8fc;
  text-shadow: none;
}

.db-shell .bs-navbar .db-navbar-title-kicker {
  margin: 0;

  font-family: "Inter", sans-serif !important;
  font-size: 11px;
  font-weight: 400;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: 0.025em;
  text-transform: none;

  color: #89adbd;
}
  .db-shell .bs-navbar .bs-navbar-right {
    display: flex;
    align-items: center;
    gap: 18px;
    margin-left: auto;
  }

  .db-shell .bs-navbar .bs-navbar-date {
    color: #a3bfcb;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .db-shell .bs-navbar .db-navbar-sync {
    display: flex;
    align-items: center;
    gap: 7px;

    min-width: 105px;
    padding: 7px 10px;

    border: 1px solid #294752;
    border-radius: 999px;

    background: #0a2029;
    color: #a9c5d1;

    font-size: 11px;
    font-weight: 500;
  }

  .db-shell .bs-navbar .db-navbar-sync-live {
    border-color: #206b55;
    background: #09261f;
    color: #77e3b5;
  }

  .db-shell .bs-navbar .db-navbar-sync-error {
    border-color: #854447;
    background: #321b21;
    color: #fca5a5;
  }

  .db-shell .bs-navbar .db-navbar-icon-btn {
    position: relative;
    display: grid;
    place-items: center;

    width: 36px;
    height: 36px;
    padding: 0;
    overflow: visible;

    border: 1px solid #2b5562;
    border-radius: 9px;

    background: #0c2530;
    color: #c4e4ee;
    cursor: pointer;
  }

  .db-shell .bs-navbar .db-navbar-icon-btn:hover {
    background: #123743;
    border-color: #64c8da;
  }

  .db-shell .bs-navbar .db-navbar-icon-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .db-shell .bs-navbar .db-navbar-notification-count {
    position: absolute;
    top: -5px;
    right: -5px;

    display: grid;
    place-items: center;

    min-width: 18px;
    height: 18px;
    padding: 0 4px;

    border: 2px solid #061820;
    border-radius: 999px;

    background: #f43f5e;
    color: #ffffff;

    font-size: 9px;
    font-weight: 600;
    line-height: 1;
  }

  .db-shell .bs-navbar .bs-navbar-menu {
    display: none;
    place-items: center;

    width: 36px;
    height: 36px;
    flex-shrink: 0;
    padding: 0;

    border: 1px solid #2b5562;
    border-radius: 9px;

    background: #0c2530;
    color: #c4e4ee;
    cursor: pointer;
  }

  .db-shell .bs-navbar button:focus-visible {
    outline: 2px solid #78dce9;
    outline-offset: 3px;
  }

  @media (max-width: 1000px) {
    .db-shell .bs-navbar .bs-navbar-date {
      display: none;
    }
  }

  @media (max-width: 700px) {
    .db-shell .db-navbar.bs-navbar {
      padding: 12px 14px;
      gap: 10px;
    }

    .db-shell .bs-navbar .bs-navbar-menu {
      display: grid;
    }

    .db-shell .bs-navbar .db-navbar-title {
      font-size: 18px;
    }

    .db-shell .bs-navbar .db-navbar-title-kicker {
      font-size: 10px;
    }

    .db-shell .bs-navbar .db-navbar-sync {
      display: none;
    }

    .db-shell .bs-navbar .bs-navbar-right {
      gap: 9px;
    }
  }
`;

export default function Navbar({ onOpenMenu }) {
  const { user } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [pendingDisputes, setPendingDisputes] = useState(0);
  const [syncState, setSyncState] = useState("loading");
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const role = String(user?.role || "").trim().toLowerCase();
  const department = String(user?.department || "").trim();
  const userId = user?.uid;

  const validRole = ["admin", "teacher", "student"].includes(role);
  const pageName = getPageName(location.pathname);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  // Sync status reflects this notification data listener.
  useEffect(() => {
    setPendingDisputes(0);
    setSyncState("loading");

    if (!userId || !role) return undefined;

    let source;

    if (role === "admin") {
      source = collection(db, "disputes");
    } else if (role === "teacher") {
      if (!department) {
        setSyncState("error");
        return undefined;
      }

      source = query(
        collection(db, "disputes"),
        where("department", "==", department)
      );
    } else if (role === "student") {
      source = query(
        collection(db, "disputes"),
        where("userId", "==", userId)
      );
    } else {
      setSyncState("error");
      return undefined;
    }

    return onSnapshot(
      source,
      { includeMetadataChanges: true },
      (snapshot) => {
        const count = snapshot.docs.reduce((total, document) => {
          const status = String(document.data().status || "")
            .trim()
            .toLowerCase();

          return total + (status === "pending" ? 1 : 0);
        }, 0);

        setPendingDisputes(count);

        setSyncState(
          snapshot.metadata.fromCache ? "cached" : "live"
        );
      },
      (error) => {
        console.error("Navbar notification listener failed:", error);
        setSyncState("error");
      }
    );
  }, [userId, role, department]);

  const syncLabel = {
    loading: "Connecting",
    cached: "Cached Data",
    live: "Live Sync",
    error: "Sync Error",
  }[syncState];

  const syncClassName = [
    "db-navbar-sync",
    syncState === "live" ? "db-navbar-sync-live" : "",
    syncState === "error" ? "db-navbar-sync-error" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <style>{navbarStyles}</style>

      <header className="db-navbar bs-navbar bs-navbar-dark">
        <button
          type="button"
          className="bs-navbar-menu"
          onClick={onOpenMenu}
          aria-label="Open navigation"
        >
          <Menu size={20} aria-hidden="true" />
        </button>

        <div className="db-navbar-title-block">
          <h2 className="db-navbar-title">
            {pageName}
          </h2>

          <span className="db-navbar-title-kicker">
            BioSync Sentinel · {capitalize(role)} Portal
          </span>
        </div>

        <div className="bs-navbar-right">
          <time
            className="bs-navbar-date"
            dateTime={currentDate.toISOString()}
          >
            {dateFormatter.format(currentDate)}
          </time>

          <div
            className={syncClassName}
            role="status"
            aria-live="polite"
            title="Connection status of the dispute notification listener"
          >
            <Wifi size={14} aria-hidden="true" />
            <span>{syncLabel}</span>
          </div>

          <button
            type="button"
            className="db-navbar-icon-btn"
            disabled={!validRole}
            onClick={() => navigate(`/${role}/disputes`)}
            aria-label={
              pendingDisputes > 0
                ? `Open disputes: ${pendingDisputes} pending`
                : "Open disputes"
            }
            title="Pending disputes"
          >
            <Bell size={19} aria-hidden="true" />

            {pendingDisputes > 0 && (
              <span
                className="db-navbar-notification-count"
                aria-hidden="true"
              >
                {pendingDisputes > 99 ? "99+" : pendingDisputes}
              </span>
            )}
          </button>
        </div>
      </header>
    </>
  );
}