import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function WeeklyAttendanceChart({ data }) {
  return (
    <div className="bs-card bs-chart-card">
      <div className="bs-card-header">
        <h3>Weekly Attendance</h3>
        <span className="bs-card-subtitle">Present / Absent / Late — last 7 days</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barGap={4} barCategoryGap="20%">
          <defs>
            <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.5} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.5} vertical={false} />
          <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #BFDBFE",
              boxShadow: "0 8px 24px rgba(59,130,246,0.15)",
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="present" name="Present" fill="url(#presentGradient)" radius={[6, 6, 0, 0]} />
          <Bar dataKey="late" name="Late" fill="#FACC15" radius={[6, 6, 0, 0]} />
          <Bar dataKey="absent" name="Absent" fill="#F87171" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default WeeklyAttendanceChart;