import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';

// Component Layouts
import Navbar from './components/Navbar.jsx';
import Sidebar from './components/Sidebar.jsx';

// Auth Pages
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

// User Pages
import Dashboard from './pages/Dashboard.jsx';
import PublicProfile from './pages/PublicProfile.jsx';
import EditProfile from './pages/EditProfile.jsx';
import Discover from './pages/Discover.jsx';
import Connections from './pages/Connections.jsx';
import Skills from './pages/Skills.jsx';
import QRProfile from './pages/QRProfile.jsx';
import QRScanner from './pages/QRScanner.jsx';
import Services from './pages/Services.jsx';
import ServiceDetails from './pages/ServiceDetails.jsx';
import Availability from './pages/Availability.jsx';
import Bookings from './pages/Bookings.jsx';
import Complaints from './pages/Complaints.jsx';
import NewComplaint from './pages/NewComplaint.jsx';
import ComplaintDetails from './pages/ComplaintDetails.jsx';
import Helpdesk from './pages/Helpdesk.jsx';
import NewTicket from './pages/NewTicket.jsx';
import TicketDetails from './pages/TicketDetails.jsx';
import Help from './pages/Help.jsx';
import HelpArticle from './pages/HelpArticle.jsx';
import Notifications from './pages/Notifications.jsx';

// Admin Pages
import AdminLayout from './admin/AdminLayout.jsx';
import AdminDashboard from './admin/AdminDashboard.jsx';
import AdminUsers from './admin/AdminUsers.jsx';
import AdminSkills from './admin/AdminSkills.jsx';
import AdminServices from './admin/AdminServices.jsx';
import AdminBookings from './admin/AdminBookings.jsx';
import AdminComplaints from './admin/AdminComplaints.jsx';
import AdminReports from './admin/AdminReports.jsx';
import AdminHelpdesk from './admin/AdminHelpdesk.jsx';
import AdminReviews from './admin/AdminReviews.jsx';
import AdminHelpCenter from './admin/AdminHelpCenter.jsx';
import AdminAnalytics from './admin/AdminAnalytics.jsx';
import AdminAuditLogs from './admin/AdminAuditLogs.jsx';

// Route Guards
const ProtectedUserRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

const ProtectedAdminRoute = () => {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
};

// Main Standard App Shell (Navbar + Sidebar + Content)
const MainAppLayout = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div className="app-container">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Main User & Public Route Tree */}
          <Route element={<MainAppLayout />}>
            {/* Root redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Public/Auth Accessible Pages */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/u/:username" element={<PublicProfile />} />
            <Route path="/help" element={<Help />} />
            <Route path="/help/:slug" element={<HelpArticle />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/services" element={<Services />} />
            <Route path="/services/:id" element={<ServiceDetails />} />

            {/* Authenticated User Routes */}
            <Route element={<ProtectedUserRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/edit-profile" element={<EditProfile />} />
              <Route path="/connections" element={<Connections />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/qr-profile" element={<QRProfile />} />
              <Route path="/qr-scanner" element={<QRScanner />} />
              <Route path="/availability" element={<Availability />} />
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/complaints" element={<Complaints />} />
              <Route path="/complaints/new" element={<NewComplaint />} />
              <Route path="/complaints/:id" element={<ComplaintDetails />} />
              <Route path="/helpdesk" element={<Helpdesk />} />
              <Route path="/helpdesk/new" element={<NewTicket />} />
              <Route path="/helpdesk/:id" element={<TicketDetails />} />
              <Route path="/notifications" element={<Notifications />} />
            </Route>
          </Route>

          {/* Admin Protected Console */}
          <Route element={<ProtectedAdminRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="skills" element={<AdminSkills />} />
              <Route path="services" element={<AdminServices />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="complaints" element={<AdminComplaints />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="helpdesk" element={<AdminHelpdesk />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="articles" element={<AdminHelpCenter />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
            </Route>
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
