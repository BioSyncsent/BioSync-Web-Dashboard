import {
  AlertCircle,
  CheckCircle,
  Clock3,
  Eye,
  Filter,
  MessageSquareWarning,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import toast, {
  Toaster,
} from "react-hot-toast";

import {
  useAuth,
} from "../../contexts/AuthContext";

import {
  useFirestoreSubscription,
} from "../../hooks/useFirestoreSubscription";

import DisputeDetailsModal from "../../components/DisputeDetailsModal";

import {
  deleteDisputeByAdmin,
  subscribeToDisputesManagement,
} from "../../services/disputeService";

import "./Disputes.css";


function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
  helper,
}) {
  return (
    <div className="dp-card dp-summary-card">
      <div
        className={`dp-summary-icon dp-summary-${tone}`}
      >
        <Icon size={20} />
      </div>

      <div>
        <span>{label}</span>

        <strong>
          {value}
        </strong>

        {helper && (
          <small>
            {helper}
          </small>
        )}
      </div>
    </div>
  );
}


function StatusBadge({
  status,
}) {
  const labels = {
    pending:
      "Pending",

    approved:
      "Approved",

    rejected:
      "Rejected",

    cancelled:
      "Cancelled",

    under_review:
      "Under Review",

    awaiting_information:
      "Awaiting Information",

    closed:
      "Closed",
  };

  return (
    <span
      className={`dp-status dp-status-${status}`}
    >
      {labels[status] ||
        status}
    </span>
  );
}


function formatDate(
  value
) {
  if (!value) {
    return "N/A";
  }

  try {
    const date =
      value instanceof Date
        ? value
        : typeof value?.toDate ===
            "function"
          ? value.toDate()
          : new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "N/A";
    }

    return date.toLocaleString(
      "en-MY",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  } catch {
    return "N/A";
  }
}


function Disputes() {
  const {
    user,
  } = useAuth();

  const subscription =
    useFirestoreSubscription(
      subscribeToDisputesManagement,
      []
    );

  const disputes =
    subscription.data ||
    [];

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("all");

  const [
    departmentFilter,
    setDepartmentFilter,
  ] = useState("all");

  const [
    sortBy,
    setSortBy,
  ] = useState("newest");

  const [
    selectedDispute,
    setSelectedDispute,
  ] = useState(null);

  const [
    deletingId,
    setDeletingId,
  ] = useState("");


  /* =======================================================
     DEPARTMENTS
  ======================================================= */

  const departments =
    useMemo(() => {
      return Array.from(
        new Set(
          disputes
            .map(
              (item) =>
                item.department
            )
            .filter(Boolean)
        )
      ).sort();
    }, [
      disputes,
    ]);


  /* =======================================================
     FILTER
  ======================================================= */

  const filtered =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      let result =
        disputes.filter(
          (dispute) => {
            const searchable =
              [
                dispute.studentName,
                dispute.studentId,
                dispute.email,
                dispute.department,
                dispute.course,
                dispute.reason,
                dispute.description,
                dispute.id,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !query ||
              searchable.includes(
                query
              );

            const matchesStatus =
              statusFilter ===
                "all" ||
              dispute.status ===
                statusFilter;

            const matchesDepartment =
              departmentFilter ===
                "all" ||
              dispute.department ===
                departmentFilter;

            return (
              matchesSearch &&
              matchesStatus &&
              matchesDepartment
            );
          }
        );

      result = [
        ...result,
      ];

      result.sort(
        (
          first,
          second
        ) => {
          const firstTime =
            first.submittedAt
              ?.getTime?.() ||
            0;

          const secondTime =
            second.submittedAt
              ?.getTime?.() ||
            0;

          if (
            sortBy ===
            "oldest"
          ) {
            return (
              firstTime -
              secondTime
            );
          }

          return (
            secondTime -
            firstTime
          );
        }
      );

      return result;
    }, [
      disputes,
      search,
      statusFilter,
      departmentFilter,
      sortBy,
    ]);


  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(
      () => ({
        total:
          disputes.length,

        pending:
          disputes.filter(
            (item) =>
              item.status ===
              "pending"
          ).length,

        approved:
          disputes.filter(
            (item) =>
              item.status ===
              "approved"
          ).length,

        rejected:
          disputes.filter(
            (item) =>
              item.status ===
              "rejected"
          ).length,

        cancelled:
          disputes.filter(
            (item) =>
              item.status ===
              "cancelled"
          ).length,
      }),
      [
        disputes,
      ]
    );


  /* =======================================================
     DELETE
  ======================================================= */

  async function handleDelete(
    dispute
  ) {
    const confirmed =
      window.confirm(
        `Delete dispute from ${dispute.studentName || "this student"}?\n\nThis removes the dispute record permanently. The deletion will still be recorded in Audit Logs.`
      );

    if (!confirmed) {
      return;
    }

    setDeletingId(
      dispute.id
    );

    try {
      await deleteDisputeByAdmin(
        dispute,
        user
      );

      if (
        selectedDispute?.id ===
        dispute.id
      ) {
        setSelectedDispute(
          null
        );
      }

      toast.success(
        "Dispute deleted successfully"
      );
    } catch (error) {
      console.error(
        "Delete dispute error:",
        error
      );

      toast.error(
        error?.message ||
          "Unable to delete dispute."
      );
    } finally {
      setDeletingId("");
    }
  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    subscription.loading
  ) {
    return (
      <div className="dp-page">
        <div className="dp-loading-card">
          <div className="dp-skeleton" />
          <div className="dp-skeleton" />
          <div className="dp-skeleton" />
        </div>
      </div>
    );
  }


  /* =======================================================
     ERROR
  ======================================================= */

  if (
    subscription.error
  ) {
    return (
      <div className="dp-page">
        <div className="dp-card dp-error-state">
          <AlertCircle
            size={34}
          />

          <div>
            <h2>
              Unable to load disputes
            </h2>

            <p>
              {subscription.error
                .message ||
                "Unable to load dispute records."}
            </p>
          </div>

          <button
            type="button"
            className="dp-btn dp-btn-primary"
            onClick={
              subscription.retry
            }
          >
            <RefreshCw
              size={16}
            />

            Retry
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="dp-page">
      <Toaster position="top-right" />

      {/* ===================================================
          HERO
      =================================================== */}

      <section className="dp-admin-hero">
        <div className="dp-admin-grid" />

        <div className="dp-admin-copy">
          <span className="dp-admin-eyebrow">
            <ShieldCheck
              size={14}
            />

            Administrator Oversight
          </span>

          <h1>
            Attendance Disputes
          </h1>

          <p>
            Monitor disputes across BioSync,
            review teacher decisions and manage
            obsolete dispute records.
          </p>

          <div className="dp-admin-meta">
            <span>
              <MessageSquareWarning
                size={13}
              />

              {
                summary.total
              }{" "}
              total records
            </span>

            <span>
              <Clock3
                size={13}
              />

              {
                summary.pending
              }{" "}
              awaiting review
            </span>

            <span className="dp-admin-live">
              <i />

              Live Firestore sync
            </span>
          </div>
        </div>

        <div className="dp-admin-hero-icon">
          <MessageSquareWarning
            size={40}
          />

          <strong>
            {
              summary.pending
            }
          </strong>

          <span>
            Pending
          </span>
        </div>
      </section>


      {/* ===================================================
          SUMMARY
      =================================================== */}

      <div className="dp-summary-grid">
        <SummaryCard
          icon={
            MessageSquareWarning
          }
          label="Total"
          value={
            summary.total
          }
          helper="All disputes"
          tone="blue"
        />

        <SummaryCard
          icon={Clock3}
          label="Pending"
          value={
            summary.pending
          }
          helper="Needs teacher review"
          tone="yellow"
        />

        <SummaryCard
          icon={CheckCircle}
          label="Approved"
          value={
            summary.approved
          }
          helper="Accepted requests"
          tone="green"
        />

        <SummaryCard
          icon={XCircle}
          label="Rejected"
          value={
            summary.rejected
          }
          helper="Rejected requests"
          tone="red"
        />

        <SummaryCard
          icon={AlertCircle}
          label="Cancelled"
          value={
            summary.cancelled
          }
          helper="Cancelled by students"
          tone="purple"
        />
      </div>


      {/* ===================================================
          FILTERS
      =================================================== */}

      <div className="dp-card dp-filter-card">
        <div className="dp-filter-heading">
          <div>
            <Filter
              size={17}
            />

            <div>
              <strong>
                Find Disputes
              </strong>

              <span>
                Search and filter dispute records.
              </span>
            </div>
          </div>

          <span>
            {filtered.length} result
            {filtered.length ===
            1
              ? ""
              : "s"}
          </span>
        </div>

        <div className="dp-search-box">
          <Search size={18} />

          <input
            value={search}
            onChange={(
              event
            ) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search student, ID, course, department, reason or dispute ID..."
          />
        </div>

        <div className="dp-filter-grid">
          <div className="dp-filter-group">
            <label>
              Status
            </label>

            <select
              value={
                statusFilter
              }
              onChange={(
                event
              ) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Statuses
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="under_review">
                Under Review
              </option>

              <option value="awaiting_information">
                Awaiting Information
              </option>

              <option value="approved">
                Approved
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="cancelled">
                Cancelled
              </option>

              <option value="closed">
                Closed
              </option>
            </select>
          </div>


          <div className="dp-filter-group">
            <label>
              Department
            </label>

            <select
              value={
                departmentFilter
              }
              onChange={(
                event
              ) =>
                setDepartmentFilter(
                  event.target.value
                )
              }
            >
              <option value="all">
                All Departments
              </option>

              {departments.map(
                (department) => (
                  <option
                    key={
                      department
                    }
                    value={
                      department
                    }
                  >
                    {department}
                  </option>
                )
              )}
            </select>
          </div>


          <div className="dp-filter-group">
            <label>
              Sort
            </label>

            <select
              value={sortBy}
              onChange={(
                event
              ) =>
                setSortBy(
                  event.target.value
                )
              }
            >
              <option value="newest">
                Newest First
              </option>

              <option value="oldest">
                Oldest First
              </option>
            </select>
          </div>
        </div>
      </div>


      {/* ===================================================
          TABLE
      =================================================== */}

      <div className="dp-card dp-table-card">
        <div className="dp-table-header">
          <div>
            <span className="dp-table-eyebrow">
              Administrative Records
            </span>

            <h2>
              All Disputes
            </h2>

            <p>
              Teachers approve or reject.
              Administrators oversee and can
              remove obsolete records.
            </p>
          </div>
        </div>


        <div className="dp-table-scroll">
          <table className="dp-table">
            <thead>
              <tr>
                <th>
                  Student
                </th>

                <th>
                  Department
                </th>

                <th>
                  Attendance
                </th>

                <th>
                  Reason
                </th>

                <th>
                  Submitted
                </th>

                <th>
                  Status
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filtered.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="dp-empty-cell"
                  >
                    <MessageSquareWarning
                      size={42}
                    />

                    <p>
                      No disputes found.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map(
                  (
                    dispute
                  ) => (
                    <tr
                      key={
                        dispute.id
                      }
                    >
                      <td>
                        <div className="dp-student-cell">
                          <span>
                            {dispute.studentName
                              ?.charAt(
                                0
                              )
                              .toUpperCase() ||
                              "S"}
                          </span>

                          <div>
                            <strong>
                              {
                                dispute.studentName
                              }
                            </strong>

                            <small>
                              {
                                dispute.studentId
                              }
                            </small>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="dp-department-badge">
                          {dispute.department ||
                            "N/A"}
                        </span>
                      </td>

                      <td>
                        <div className="dp-attendance-cell">
                          <strong>
                            {
                              dispute.originalStatus
                            }
                          </strong>

                          <small>
                            Requested:{" "}
                            {
                              dispute.requestedStatus
                            }
                          </small>
                        </div>
                      </td>

                      <td>
                        <span className="dp-reason-cell">
                          {
                            dispute.reason
                          }
                        </span>
                      </td>

                      <td>
                        <div className="dp-date-cell">
                          <strong>
                            {formatDate(
                              dispute.submittedAt
                            )}
                          </strong>
                        </div>
                      </td>

                      <td>
                        <StatusBadge
                          status={
                            dispute.status
                          }
                        />
                      </td>

                      <td>
                        <div className="dp-action-group">
                          <button
                            type="button"
                            className="dp-view-button"
                            onClick={() =>
                              setSelectedDispute(
                                dispute
                              )
                            }
                          >
                            <Eye
                              size={15}
                            />

                            View
                          </button>

                          <button
                            type="button"
                            className="dp-delete-button"
                            disabled={
                              deletingId ===
                              dispute.id
                            }
                            onClick={() =>
                              handleDelete(
                                dispute
                              )
                            }
                          >
                            {deletingId ===
                            dispute.id ? (
                              <RefreshCw
                                size={15}
                                className="dp-spin"
                              />
                            ) : (
                              <Trash2
                                size={15}
                              />
                            )}

                            {deletingId ===
                            dispute.id
                              ? "Deleting"
                              : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* ===================================================
          DETAILS
      =================================================== */}

      {selectedDispute && (
        <DisputeDetailsModal
          dispute={
            selectedDispute
          }
          readOnly
          onClose={() =>
            setSelectedDispute(
              null
            )
          }
        />
      )}
    </div>
  );
}

export default Disputes;