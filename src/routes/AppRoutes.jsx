import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Attendance from "../pages/Attendance";


function AppRoutes() {

  return (

    <BrowserRouter>

      <Routes>


        {/* Public route */}
        <Route 
          path="/" 
          element={<Login />} 
        />


        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />


        <Route
          path="/attendance"
          element={
            <ProtectedRoute>
              <Attendance />
            </ProtectedRoute>
          }
        />


      </Routes>

    </BrowserRouter>

  );

}


export default AppRoutes;