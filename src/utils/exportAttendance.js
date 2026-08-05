import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function toSafeDate(value) {
  if (!value) return null;

  if (value instanceof Date) {
    return value;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  const parsed = new Date(value);

  return Number.isNaN(parsed.getTime())
    ? null
    : parsed;
}

function formatDate(value) {
  const date = toSafeDate(value);

  return date
    ? date.toLocaleDateString("en-MY")
    : "N/A";
}

function formatTime(value) {
  const date = toSafeDate(value);

  return date
    ? date.toLocaleTimeString("en-MY", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "N/A";
}

function escapeCSV(value) {
  return `"${String(value ?? "")
    .replace(/"/g, '""')}"`;
}

export function exportToCSV(
  records,
  filename = "attendance"
) {
  if (!Array.isArray(records) || records.length === 0) {
    alert("No attendance records to export.");
    return;
  }

  const headers = [
    "Student Name",
    "Student ID",
    "Email",
    "Course",
    "Department",
    "Date",
    "Time",
    "Status",
    "Authentication Method",
    "Device",
    "Verification Result",
    "RFID Card ID",
  ];

  const rows = records.map((record) => [
    record.studentName || "Unknown",
    record.studentId || "N/A",
    record.email || "N/A",
    record.course || "N/A",
    record.department || "N/A",
    formatDate(record.timestamp),
    formatTime(record.timestamp),
    record.status || "N/A",
    record.authMethod || "N/A",
    record.deviceId || "N/A",
    record.verificationResult || "N/A",
    record.rfidCardId || "N/A",
  ]);

  const csv = [
    headers.map(escapeCSV).join(","),
    ...rows.map((row) =>
      row.map(escapeCSV).join(",")
    ),
  ].join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download =
    `${filename}_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

export function exportToPDF(
  records,
  title = "BioSync Attendance Report"
) {
  if (!Array.isArray(records) || records.length === 0) {
    alert("No attendance records to export.");
    return;
  }

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const present = records.filter(
    (record) => record.status === "present"
  ).length;

  const late = records.filter(
    (record) => record.status === "late"
  ).length;

  const absent = records.filter(
    (record) => record.status === "absent"
  ).length;

  pdf.setFontSize(18);
  pdf.text(title, 14, 16);

  pdf.setFontSize(10);
  pdf.text(
    `Generated: ${new Date().toLocaleString("en-MY")}`,
    14,
    23
  );

  pdf.text(
    `Total: ${records.length}   Present: ${present}   Late: ${late}   Absent: ${absent}`,
    14,
    29
  );

  autoTable(pdf, {
    startY: 35,

    head: [[
      "Student",
      "Student ID",
      "Course",
      "Department",
      "Date",
      "Time",
      "Status",
      "Method",
      "Device",
      "Verification",
    ]],

    body: records.map((record) => [
      record.studentName || "Unknown",
      record.studentId || "N/A",
      record.course || "N/A",
      record.department || "N/A",
      formatDate(record.timestamp),
      formatTime(record.timestamp),
      record.status || "N/A",
      record.authMethod || "N/A",
      record.deviceId || "N/A",
      record.verificationResult || "N/A",
    ]),

    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },

    headStyles: {
      fillColor: [86, 182, 255],
      textColor: [255, 255, 255],
    },

    alternateRowStyles: {
      fillColor: [245, 250, 255],
    },

    margin: {
      left: 14,
      right: 14,
    },
  });

  pdf.save(
    `attendance_${new Date()
      .toISOString()
      .slice(0, 10)}.pdf`
  );
}