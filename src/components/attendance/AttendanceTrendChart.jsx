import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

function AttendanceTrendChart({ data }) {
  return (
    <div className="bs-card bs-chart-card">
      <div className="bs-card-header">
        <h3>Attendance Trend</h3>
        <span className="bs-card-subtitle">Last 14 days</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.5} vertical={false} />
          <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #BFDBFE",
              boxShadow: "0 8px 24px rgba(59,130,246,0.15)",
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Line
            type="monotone"
            dataKey="present"
            name="Present"
            stroke="#3B82F6"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="late"
            name="Late"
            stroke="#FACC15"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="absent"
            name="Absent"
            stroke="#F87171"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AttendanceTrendChart;