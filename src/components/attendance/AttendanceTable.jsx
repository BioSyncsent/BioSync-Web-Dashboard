import { useMemo, useState } from "react";
import { Search, ScanFace } from "lucide-react";
import StatusBadge from "./StatusBadge";

function AttendanceTable({ records }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.userId.toLowerCase().includes(q) ||
        r.method.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, search, statusFilter]);

  return (
    <div className="bs-card bs-table-card">
      <div className="bs-table-toolbar">
        <div className="bs-card-header" style={{ marginBottom: 0 }}>
          <h3>Attendance Records</h3>
          <span className="bs-card-subtitle">{filtered.length} of {records.length} entries</span>
        </div>

        <div className="bs-toolbar-controls">
          <div className="bs-search-box">
            <Search size={16} className="bs-search-icon" />
            <input
              type="text"
              placeholder="Search name, ID, or method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="bs-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
        </div>
      </div>

      <div className="bs-table-scroll">
        <table className="bs-table">
          <thead>
            <tr>
              <th>User</th>
              <th>User ID</th>
              <th>Method</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="bs-table-empty">
                  No matching attendance records.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id}>
                  <td className="bs-table-user">
                    <span className="bs-avatar">
                      <ScanFace size={14} />
                    </span>
                    {r.name}
                  </td>
                  <td>{r.userId}</td>
                  <td>{r.method}</td>
                  <td>{r.dateLabel}</td>
                  <td>{r.timeLabel}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AttendanceTable;