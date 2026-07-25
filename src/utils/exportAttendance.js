/**
 * Export Attendance Data to CSV
 */
export const exportToCSV = (records, filename = "attendance") => {
  if (records.length === 0) {
    alert("No records to export");
    return;
  }

  // Prepare CSV headers
  const headers = [
    "Student Name",
    "Student ID",
    "Course",
    "Date",
    "Time",
    "Status",
    "Auth Method",
    "Device ID",
  ];

  // Prepare CSV rows
  const rows = records.map((record) => {
    const date = new Date(record.timestamp);
    const dateStr = date.toLocaleDateString("en-MY");
    const timeStr = date.toLocaleTimeString("en-MY");

    return [
      record.studentName || "Unknown",
      record.studentId || "N/A",
      record.course || "N/A",
      dateStr,
      timeStr,
      record.status || "N/A",
      record.authMethod || "N/A",
      record.deviceId || "N/A",
    ];
  });

  // Create CSV content
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`) // Escape quotes
        .join(",")
    ),
  ].join("\n");

  // Add BOM for proper UTF-8 encoding with special characters
  const BOM = "\uFEFF";
  const csvWithBOM = BOM + csvContent;

  // Create blob and download
  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `${filename}_${new Date().toISOString().split("T")[0]}.csv`
  );
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export Attendance Data to PDF
 */
export const exportToPDF = (records, title = "Attendance Report") => {
  if (records.length === 0) {
    alert("No records to export");
    return;
  }

  // Create HTML table
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Arial', sans-serif;
          color: #2f3b52;
          line-height: 1.5;
          background: white;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 3px solid #56b6ff;
          padding-bottom: 20px;
        }

        .header h1 {
          font-size: 28px;
          color: #1e3a5f;
          margin-bottom: 10px;
        }

        .header p {
          font-size: 14px;
          color: #556070;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 15px;
          margin-bottom: 30px;
        }

        .summary-card {
          background: #f8fafd;
          padding: 15px;
          border-radius: 8px;
          border-left: 4px solid #56b6ff;
          text-align: center;
        }

        .summary-card h3 {
          font-size: 12px;
          color: #556070;
          text-transform: uppercase;
          margin-bottom: 8px;
          font-weight: 600;
        }

        .summary-card .value {
          font-size: 24px;
          font-weight: 700;
          color: #1e3a5f;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }

        thead {
          background: #56b6ff;
          color: white;
        }

        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #d8e9f8;
          font-size: 13px;
        }

        tbody tr:nth-child(even) {
          background: rgba(86, 182, 255, 0.05);
        }

        tbody tr:hover {
          background: rgba(86, 182, 255, 0.1);
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: capitalize;
        }

        .status-present {
          background: rgba(16, 185, 129, 0.2);
          color: #10b981;
        }

        .status-late {
          background: rgba(250, 204, 21, 0.2);
          color: #f59e0b;
        }

        .status-absent {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .footer {
          text-align: center;
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #d8e9f8;
          font-size: 12px;
          color: #556070;
        }

        @media print {
          body {
            background: white;
          }
          .container {
            padding: 0;
          }
          .summary {
            break-inside: avoid;
          }
          table {
            break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${title}</h1>
          <p>Generated on ${new Date().toLocaleDateString("en-MY", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })} at ${new Date().toLocaleTimeString("en-MY")}</p>
        </div>

        <div class="summary">
          <div class="summary-card">
            <h3>Total Records</h3>
            <div class="value">${records.length}</div>
          </div>
          <div class="summary-card">
            <h3>Present</h3>
            <div class="value">${records.filter((r) => r.status === "present").length}</div>
          </div>
          <div class="summary-card">
            <h3>Late</h3>
            <div class="value">${records.filter((r) => r.status === "late").length}</div>
          </div>
          <div class="summary-card">
            <h3>Absent</h3>
            <div class="value">${records.filter((r) => r.status === "absent").length}</div>
          </div>
          <div class="summary-card">
            <h3>Attendance %</h3>
            <div class="value">${records.length > 0 ? ((records.filter((r) => r.status === "present").length / records.length) * 100).toFixed(1) : 0}%</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Student ID</th>
              <th>Course</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Auth Method</th>
            </tr>
          </thead>
          <tbody>
            ${records
              .map((record) => {
                const date = new Date(record.timestamp);
                const dateStr = date.toLocaleDateString("en-MY");
                const timeStr = date.toLocaleTimeString("en-MY");
                return `
              <tr>
                <td>${record.studentName || "Unknown"}</td>
                <td>${record.studentId || "N/A"}</td>
                <td>${record.course || "N/A"}</td>
                <td>${dateStr}</td>
                <td>${timeStr}</td>
                <td>
                  <span class="status-badge status-${record.status || "unknown"}">
                    ${record.status || "Unknown"}
                  </span>
                </td>
                <td>${record.authMethod || "N/A"}</td>
              </tr>
            `;
              })
              .join("")}
          </tbody>
        </table>

        <div class="footer">
          <p>BioSync Sentinel - Attendance Management System</p>
          <p>This is an automatically generated report. Please verify all details before using.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  // Create blob and open in new window
  const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, "_blank");

  // Wait for window to load and then print
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};