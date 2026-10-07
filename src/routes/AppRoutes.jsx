import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import Unauthorized from "../pages/Unauthorized";

import DashboardLayout from "../components/layout/DashboardLayout";

// Admin timetable uses the existing shared page.
import AdminTimetable from "../pages/shared/Timetable";

// Admin pages.
import AdminDashboard from "../pages/admin/Dashboard";
import AdminAttendance from "../pages/admin/Attendance";
import AdminDisputes from "../pages/admin/Disputes";
import AdminDevices from "../pages/admin/Devices";
import AdminAnalytics from "../pages/admin/Analytics";
import AdminUserManagement from "../pages/admin/UserManagement";
import AdminAccountCenter from "../pages/admin/AccountCenter";

// Teacher pages.
import TeacherDashboard from "../pages/teacher/Dashboard";
import TeacherTimetable from "../pages/teacher/Timetable";
import TeacherAttendance from "../pages/teacher/Attendance";
import TeacherDisputes from "../pages/teacher/Disputes";
import TeacherAnalytics from "../pages/teacher/Analytics";
import TeacherAccountCenter from "../pages/teacher/AccountCenter";

// Student pages.
import StudentDashboard from "../pages/student/Dashboard";
import StudentTimetable from "../pages/student/Timetable";
import StudentAttendance from "../pages/student/Attendance";
import StudentDisputes from "../pages/student/Disputes";
import StudentAnalytics from "../pages/student/Analytics";
import StudentAccountCenter from "../pages/student/AccountCenter";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Admin workspace */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="timetable" element={<AdminTimetable />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="disputes" element={<AdminDisputes />} />
          <Route path="devices" element={<AdminDevices />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<AdminUserManagement />} />
          <Route
            path="account-center"
            element={<AdminAccountCenter />}
          />
        </Route>

        {/* Teacher workspace */}
        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<TeacherDashboard />} />
          <Route path="timetable" element={<TeacherTimetable />} />
          <Route path="attendance" element={<TeacherAttendance />} />
          <Route path="disputes" element={<TeacherDisputes />} />
          <Route path="analytics" element={<TeacherAnalytics />} />
          <Route
            path="account-center"
            element={<TeacherAccountCenter />}
          />
        </Route>

        {/* Student workspace */}
        <Route
          path="/student"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="timetable" element={<StudentTimetable />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="disputes" element={<StudentDisputes />} />
          <Route path="analytics" element={<StudentAnalytics />} />
          <Route
            path="account-center"
            element={<StudentAccountCenter />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}