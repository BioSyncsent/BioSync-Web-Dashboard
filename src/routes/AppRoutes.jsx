import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import Unauthorized from "../pages/Unauthorized";

import DashboardLayout from "../components/layout/DashboardLayout";

/* =========================================================
   ADMIN
========================================================= */

import AdminDashboard from "../pages/admin/Dashboard";
import AdminAttendance from "../pages/admin/Attendance";
import AdminDisputes from "../pages/admin/Disputes";
import AdminDevices from "../pages/admin/Devices";
import AdminAnalytics from "../pages/admin/Analytics";
import AdminUserManagement from "../pages/admin/UserManagement";
import AdminAccountCenter from "../pages/admin/AccountCenter";

/* =========================================================
   TEACHER
========================================================= */

import TeacherDashboard from "../pages/teacher/Dashboard";
import TeacherAttendance from "../pages/teacher/Attendance";
import TeacherDisputes from "../pages/teacher/Disputes";
import TeacherAnalytics from "../pages/teacher/Analytics";
import TeacherAccountCenter from "../pages/teacher/AccountCenter";

/* =========================================================
   STUDENT
========================================================= */

import StudentDashboard from "../pages/student/Dashboard";
import StudentAttendance from "../pages/student/Attendance";
import StudentDisputes from "../pages/student/Disputes";
import StudentAnalytics from "../pages/student/Analytics";
import StudentAccountCenter from "../pages/student/AccountCenter";

/* =========================================================
   ROUTES
========================================================= */

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}

        <Route
          path="/"
          element={<LandingPage />}
        />

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/unauthorized"
          element={<Unauthorized />}
        />

        {/* =================================================
            ADMIN
        ================================================= */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute
              allowedRoles={["admin"]}
            >
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="dashboard"
            element={<AdminDashboard />}
          />

          <Route
            path="attendance"
            element={<AdminAttendance />}
          />

          <Route
            path="disputes"
            element={<AdminDisputes />}
          />

          <Route
            path="devices"
            element={<AdminDevices />}
          />

          <Route
            path="analytics"
            element={<AdminAnalytics />}
          />

          <Route
            path="users"
            element={<AdminUserManagement />}
          />

          <Route
            path="account-center"
            element={<AdminAccountCenter />}
          />
        </Route>

        {/* =================================================
            TEACHER
        ================================================= */}

        <Route
          path="/teacher"
          element={
            <ProtectedRoute
              allowedRoles={["teacher"]}
            >
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="dashboard"
            element={<TeacherDashboard />}
          />

          <Route
            path="attendance"
            element={<TeacherAttendance />}
          />

          <Route
            path="disputes"
            element={<TeacherDisputes />}
          />

          <Route
            path="analytics"
            element={<TeacherAnalytics />}
          />

          <Route
            path="account-center"
            element={<TeacherAccountCenter />}
          />
        </Route>

        {/* =================================================
            STUDENT
        ================================================= */}

        <Route
          path="/student"
          element={
            <ProtectedRoute
              allowedRoles={["student"]}
            >
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="dashboard"
            element={<StudentDashboard />}
          />

          <Route
            path="attendance"
            element={<StudentAttendance />}
          />

          <Route
            path="disputes"
            element={<StudentDisputes />}
          />

          <Route
            path="analytics"
            element={<StudentAnalytics />}
          />

          <Route
            path="account-center"
            element={<StudentAccountCenter />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;