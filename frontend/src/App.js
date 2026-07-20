import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import AppShell from "@/components/AppShell";
import Dashboard from "@/pages/Dashboard";
import Members from "@/pages/Members";
import MemberDetail from "@/pages/MemberDetail";
import Memberships from "@/pages/Memberships";
import CheckIn from "@/pages/CheckIn";
import Attendance from "@/pages/Attendance";
import Trainers from "@/pages/Trainers";
import Payments from "@/pages/Payments";
import Expenses from "@/pages/Expenses";
import Reports from "@/pages/Reports";
import Leads from "@/pages/Leads";
import Branches from "@/pages/Branches";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import "@/App.css";

function Protected({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="font-display text-2xl text-white/60 tracking-widest">FITMORE</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function RootRedirect() {
  const { user, ready } = useAuth();
  if (!ready) return null;
  return <Navigate to={user ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Toaster theme="dark" position="top-right" />
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <Protected>
                  <AppShell />
                </Protected>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/members" element={<Members />} />
              <Route path="/members/:id" element={<MemberDetail />} />
              <Route path="/memberships" element={<Memberships />} />
              <Route path="/checkin" element={<CheckIn />} />
              <Route path="/attendance" element={<Attendance />} />
              <Route path="/trainers" element={<Trainers />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
