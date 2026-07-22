import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

import LandingPage from "../pages/LandingPage";
import Login from "../pages/Login";
import Unauthorized from "../pages/Unauthorized";

import DashboardLayout from "../components/layout/DashboardLayout";

import AdminDashboard from "../pages/admin/Dashboard";
import AdminAttendance from "../pages/admin/Attendance";
import AdminDisputes from "../pages/admin/Disputes";
import AdminProfile from "../pages/admin/Profile";
import AdminDevices from "../pages/admin/Devices";
import AdminAnalytics from "../pages/admin/Analytics";
import AdminSettings from "../pages/admin/Settings";

import TeacherDashboard from "../pages/teacher/Dashboard";
import TeacherAttendance from "../pages/teacher/Attendance";
import TeacherDisputes from "../pages/teacher/Disputes";
import TeacherAnalytics from "../pages/teacher/Analytics";
import TeacherProfile from "../pages/teacher/Profile";
import TeacherSettings from "../pages/teacher/Settings";

import StudentDashboard from "../pages/student/Dashboard";
import StudentAttendance from "../pages/student/Attendance";
import StudentDisputes from "../pages/student/Disputes";
import StudentAnalytics from "../pages/student/Analytics";
import StudentProfile from "../pages/student/Profile";
import StudentSettings from "../pages/student/Settings";

function AppRoutes() {

return (

<BrowserRouter>

<Routes>


{/* Public */}

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


{/* ADMIN */}

<Route
    path="/admin"
    element={
        <ProtectedRoute allowedRoles={["admin"]}>
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
        path="profile" 
        element={<AdminProfile />} 
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
        path="settings" 
        element={<AdminSettings />} 
    />

    <Route 
        path="analytics" 
        element={<AdminAnalytics />} 
    />

</Route>



{/* TEACHER */}

<Route
    path="/teacher"
    element={
        <ProtectedRoute allowedRoles={["teacher"]}>
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
        path="profile" 
        element={<TeacherProfile />} 
    />

    <Route 
        path="settings" 
        element={<TeacherSettings />} 
    />

    <Route 
        path="analytics" 
        element={<TeacherAnalytics />} 
    />

</Route>



{/* STUDENT */}

<Route
    path="/student"
    element={
        <ProtectedRoute allowedRoles={["student"]}>
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
        path="profile" 
        element={<StudentProfile />} 
    />

    <Route 
        path="settings" 
        element={<StudentSettings />} 
    />

    <Route 
        path="analytics" 
        element={<StudentAnalytics />} 
    />

</Route>


</Routes>

</BrowserRouter>

);

}

export default AppRoutes;