import { useState } from "react";
import {
  Monitor,
  Cpu,
  Radio,
  ScanFace,
  Fingerprint,
  Camera,
  ShieldCheck,
  CheckCircle2,
  Circle,
  Clock3,
  ChevronDown,
  Activity,
  MapPin,
  Wifi,
  ListChecks,
  ArrowRight,
} from "lucide-react";

import "./Devices.css";

const components = [
  {
    name: "Processing hub",
    detail: "Mini PC • Ubuntu/Linux • Python terminal application",
    status: "planned",
    icon: Cpu,
  },
  {
    name: "RFID identification",
    detail: "ESP32 + RC522 • Card reading and duplicate checks tested",
    status: "tested",
    icon: Radio,
  },
  {
    name: "Face verification",
    detail: "Local face capture and matching tested in the prototype",
    status: "tested",
    icon: ScanFace,
  },
  {
    name: "Fingerprint fallback",
    detail: "Waveshare Fingerprint Sensor E • Communication testing",
    status: "testing",
    icon: Fingerprint,
  },
  {
    name: "Camera integration",
    detail: "Logitech Brio 100 • Final terminal integration pending",
    status: "planned",
    icon: Camera,
  },
  {
    name: "Touchscreen interface",
    detail: "7-inch touchscreen • Planned native PySide6 interface",
    status: "planned",
    icon: Monitor,
  },
  {
    name: "Liveness verification",
    detail: "Additional verification before attendance is accepted",
    status: "planned",
    icon: ShieldCheck,
  },
  {
    name: "Status indicator",
    detail: "WS2812B RGB LED • Planned visual feedback",
    status: "planned",
    icon: Activity,
  },
];

const initialTasks = [
  { id: "sensor", label: "Confirm fingerprint sensor communication" },
  { id: "gui", label: "Complete the touchscreen terminal interface" },
  { id: "liveness", label: "Integrate and test liveness verification" },
  { id: "encryption", label: "Encrypt biometric templates for storage" },
  { id: "attendance", label: "Test attendance write-back to Firestore" },
  { id: "heartbeat", label: "Connect terminal heartbeat and health reporting" },
  { id: "endtoend", label: "Run the complete attendance verification flow" },
];

const statusLabels = {
  tested: "Prototype tested",
  testing: "Testing",
  planned: "Pending integration",
};

function Devices() {
  const [showHardware, setShowHardware] = useState(true);
  const [completedTasks, setCompletedTasks] = useState([]);

  const testedCount = components.filter(
    (component) => component.status === "tested"
  ).length;

  const readiness = Math.round(
    (completedTasks.length / initialTasks.length) * 100
  );

  function toggleTask(id) {
    setCompletedTasks((current) =>
      current.includes(id)
        ? current.filter((taskId) => taskId !== id)
        : [...current, id]
    );
  }

  return (
    <div className="bdev-page">
      <header className="bdev-hero">
        <div className="bdev-hero-grid" aria-hidden="true" />

        <div className="bdev-hero-copy">
          <span className="bdev-eyebrow">
            <Cpu size={14} />
            Terminal management
          </span>

          <h1>BioSync Devices</h1>

          <p>
            Track terminal development, hardware readiness and the steps
            required before deployment.
          </p>

          <div className="bdev-hero-meta">
            <span>
              <span className="bdev-dot" />
              Development stage
            </span>
            <span>BioSync Sentinel</span>
          </div>
        </div>

        <div className="bdev-hero-icon" aria-hidden="true">
          <Monitor size={42} strokeWidth={1.4} />
        </div>
      </header>

      <section className="bdev-summary" aria-label="Device overview">
        <div className="bdev-stat">
          <span className="bdev-stat-icon">
            <Monitor size={21} />
          </span>
          <div>
            <span className="bdev-stat-label">Planned terminal</span>
            <strong>01</strong>
            <small>Initial development unit</small>
          </div>
        </div>

        <div className="bdev-stat">
          <span className="bdev-stat-icon bdev-tone-green">
            <CheckCircle2 size={21} />
          </span>
          <div>
            <span className="bdev-stat-label">Prototype tested</span>
            <strong>
              {testedCount}
              <span> / {components.length}</span>
            </strong>
            <small>Reported component progress</small>
          </div>
        </div>

        <div className="bdev-stat">
          <span className="bdev-stat-icon bdev-tone-amber">
            <Clock3 size={21} />
          </span>
          <div>
            <span className="bdev-stat-label">Deployment stage</span>
            <strong className="bdev-stat-word">In development</strong>
            <small>Final integration pending</small>
          </div>
        </div>

        <div className="bdev-stat">
          <span className="bdev-stat-icon bdev-tone-muted">
            <Wifi size={21} />
          </span>
          <div>
            <span className="bdev-stat-label">Live monitoring</span>
            <strong className="bdev-stat-word">Not connected</strong>
            <small>Heartbeat reporting pending</small>
          </div>
        </div>
      </section>

      <div className="bdev-main-grid">
        <section className="bdev-card bdev-terminal">
          <div className="bdev-card-heading">
            <div>
              <span className="bdev-eyebrow">Development unit</span>
              <h2>Attendance Terminal 01</h2>
              <p>Planned hardware configuration for the first gateway.</p>
            </div>
            <span className="bdev-badge bdev-badge-testing">
              In development
            </span>
          </div>

          <div className="bdev-terminal-banner">
            <div className="bdev-terminal-symbol" aria-hidden="true">
              <Monitor size={37} strokeWidth={1.5} />
            </div>
            <div>
              <strong>BioSync Sentinel Gateway</strong>
              <p>RFID identity claim with biometric verification</p>
              <span className="bdev-terminal-location">
                <MapPin size={13} />
                Deployment location not assigned
              </span>
            </div>
          </div>

          <dl className="bdev-spec-grid">
            <div>
              <dt>Processing platform</dt>
              <dd>Mini PC · Ubuntu/Linux</dd>
            </div>
            <div>
              <dt>Terminal application</dt>
              <dd>Python · PySide6</dd>
            </div>
            <div>
              <dt>Microcontroller</dt>
              <dd>ESP32</dd>
            </div>
            <div>
              <dt>Attendance service</dt>
              <dd>Cloud Firestore</dd>
            </div>
          </dl>

          <div className="bdev-hardware-heading">
            <div>
              <h3>Hardware & verification readiness</h3>
              <p>Prototype tests do not indicate deployment readiness.</p>
            </div>

            <button
              type="button"
              className="bdev-icon-button"
              onClick={() => setShowHardware((value) => !value)}
              aria-expanded={showHardware}
              aria-controls="bdev-hardware-list"
              aria-label={
                showHardware ? "Collapse component list" : "Expand component list"
              }
            >
              <ChevronDown
                size={18}
                className={showHardware ? "bdev-chevron-open" : ""}
              />
            </button>
          </div>

          {showHardware && (
            <div className="bdev-hardware-list" id="bdev-hardware-list">
              {components.map(({ name, detail, status, icon: Icon }) => (
                <div className="bdev-component" key={name}>
                  <span className="bdev-component-icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <div className="bdev-component-copy">
                    <strong>{name}</strong>
                    <p>{detail}</p>
                  </div>
                  <span className={`bdev-badge bdev-badge-${status}`}>
                    {statusLabels[status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <aside className="bdev-side-column">
          <section className="bdev-card">
            <div className="bdev-section-title">
              <span className="bdev-section-icon">
                <Activity size={18} />
              </span>
              <div>
                <h2>Terminal health</h2>
                <p>Live telemetry will appear after integration.</p>
              </div>
            </div>

            <div className="bdev-health-state">
              <Wifi size={26} />
              <strong>Awaiting terminal connection</strong>
              <p>
                No heartbeat has been connected to this page. Connection
                status and sensor health are not available yet.
              </p>
            </div>

            <dl className="bdev-health-list">
              <div>
                <dt>Last heartbeat</dt>
                <dd>Unavailable</dd>
              </div>
              <div>
                <dt>Camera health</dt>
                <dd>Not monitored</dd>
              </div>
              <div>
                <dt>Sensor health</dt>
                <dd>Not monitored</dd>
              </div>
              <div>
                <dt>Last attendance sync</dt>
                <dd>Unavailable</dd>
              </div>
            </dl>
          </section>

          <section className="bdev-card">
            <div className="bdev-section-title">
              <span className="bdev-section-icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <h2>Planned verification flow</h2>
                <p>How the completed terminal will verify attendance.</p>
              </div>
            </div>

            <ol className="bdev-flow">
              <li>
                <span>01</span>
                <div>
                  <strong>Tap RFID card</strong>
                  <p>Identify the claimed account.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Face & liveness verification</strong>
                  <p>Confirm identity and a live presence.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Fingerprint fallback</strong>
                  <p>Used if face or liveness verification fails.</p>
                </div>
              </li>
            </ol>

            <div className="bdev-flow-result">
              <ArrowRight size={15} />
              <span>Verified: record attendance. Failed: deny attendance.</span>
            </div>
          </section>

          <section className="bdev-card">
            <div className="bdev-section-title">
              <span className="bdev-section-icon">
                <ListChecks size={18} />
              </span>
              <div>
                <h2>Deployment checklist</h2>
                <p>Tick completed work during this review.</p>
              </div>
            </div>

            <div className="bdev-progress-heading">
              <span>
                {completedTasks.length} of {initialTasks.length} completed
              </span>
              <strong>{readiness}%</strong>
            </div>

            <div
              className="bdev-progress"
              role="progressbar"
              aria-label="Deployment checklist completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={readiness}
            >
              <span style={{ width: `${readiness}%` }} />
            </div>

            <div className="bdev-checklist">
              {initialTasks.map((task) => {
                const checked = completedTasks.includes(task.id);

                return (
                  <label
                    className={`bdev-task ${checked ? "bdev-task-done" : ""}`}
                    key={task.id}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleTask(task.id)}
                    />
                    {checked ? (
                      <CheckCircle2 size={17} aria-hidden="true" />
                    ) : (
                      <Circle size={17} aria-hidden="true" />
                    )}
                    <span>{task.label}</span>
                  </label>
                );
              })}
            </div>

            <p className="bdev-checklist-note">
              Checklist changes are temporary and reset when this page is
              reopened or refreshed.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default Devices;