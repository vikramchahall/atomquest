import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import MyGoals from "./pages/employee/MyGoals";
import CreateGoal from "./pages/employee/CreateGoal";
import QuarterlyUpdate from "./pages/employee/QuarterlyUpdate";
import TeamDashboard from "./pages/manager/TeamDashboard";
import ApproveGoals from "./pages/manager/ApproveGoals";
import CheckIn from "./pages/manager/CheckIn";
import AdminDashboard from "./pages/admin/AdminDashboard";
import CycleManager from "./pages/admin/CycleManager";
import UserManager from "./pages/admin/UserManager";
import AuditTrail from "./pages/admin/AuditTrail";
import Analytics from "./pages/admin/Analytics";
import Escalations from "./pages/admin/Escalations";

function Spinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-dark-950">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-600 font-body text-xs">Loading...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children, roles }) {
  const { user, profile, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && profile && !roles.includes(profile.role))
    return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Protected shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* Employee */}
        <Route
          path="my-goals"
          element={
            <ProtectedRoute roles={["employee", "manager", "admin"]}>
              <MyGoals />
            </ProtectedRoute>
          }
        />
        <Route
          path="create-goal"
          element={
            <ProtectedRoute roles={["employee", "manager"]}>
              <CreateGoal />
            </ProtectedRoute>
          }
        />
        <Route
          path="quarterly-update"
          element={
            <ProtectedRoute roles={["employee", "manager"]}>
              <QuarterlyUpdate />
            </ProtectedRoute>
          }
        />

        {/* Manager */}
        <Route
          path="team"
          element={
            <ProtectedRoute roles={["manager", "admin"]}>
              <TeamDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="approve"
          element={
            <ProtectedRoute roles={["manager", "admin"]}>
              <ApproveGoals />
            </ProtectedRoute>
          }
        />
        <Route
          path="checkin/:employeeId"
          element={
            <ProtectedRoute roles={["manager", "admin"]}>
              <CheckIn />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route
          path="admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="cycles"
          element={
            <ProtectedRoute roles={["admin"]}>
              <CycleManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <UserManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute roles={["admin"]}>
              <AuditTrail />
            </ProtectedRoute>
          }
        />
        <Route
          path="escalations"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Escalations />
            </ProtectedRoute>
          }
        />

        {/* Shared */}
        <Route
          path="analytics"
          element={
            <ProtectedRoute roles={["admin", "manager"]}>
              <Analytics />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}