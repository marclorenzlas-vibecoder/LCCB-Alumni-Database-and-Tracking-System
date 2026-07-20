import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import AlumniDirectory from './components/AlumniDirectory';
import AlumniProfile from './components/AlumniProfile';
import Profile from './components/Profile';
import Settings from './components/Settings';
import ChangePassword from './components/ChangePassword';
import AdminDashboard from './components/AdminDashboard';
import PendingApproval from './components/PendingApproval';
import Events from './components/Events';
import EventDetail from './components/EventDetail';
import Achievements from './components/Achievements';
import AchievementDetail from './components/AchievementDetail';
import Employment from './components/Employment';
import JobApplications from './components/JobApplications';
import Donations from './components/Donations';
import DonatePage from './components/DonatePage';
import AdminCampaignReceipts from './components/AdminCampaignReceipts';
import Notifications from './components/Notifications';
import LiveDonationToast from './components/LiveDonationToast';
import OAuthCallback from './components/OAuthCallback';
import TeacherLogin from './components/TeacherLogin';
import TeacherRegister from './components/TeacherRegister';
import TeacherManagement from './components/TeacherManagement';
import ManageUsers from './components/ManageUsers';
import ActivityLogs from './components/ActivityLogs';
import ProtectedRoute from './components/ProtectedRoute';
import { realtimeClient } from './services/realtimeClient';
import { API_BASE_URL } from './config/apiBaseUrl';
import { authService } from './services/authService';
import {
  BLOCKED_MESSAGE,
  handleAccountBlocked,
  startSessionGuard,
  stopSessionGuard
} from './utils/sessionGuard';

function AppContent() {
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('token');
  const isAuthenticated = !!(user && token);

  // Navbar not shown - all authenticated pages use sidebar layouts

  return (
    <div className="min-h-screen">
      <ToastContainer position="top-right" autoClose={3500} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover draggable theme="colored"/>
      <LiveDonationToast />
      <div>
        <Routes>
          <Route path="/" element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/Login" replace />
            )
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          } />
          <Route path="/home" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />
          <Route path="/settings/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />
          <Route path="/pending-approval" element={
            <ProtectedRoute>
              {['teacher', 'admin'].includes((user?.role || '').toLowerCase()) ? <AdminDashboard pendingOnly /> : <PendingApproval />}
            </ProtectedRoute>
          } />
          <Route path="/login" element={<Login />} />
          <Route path="/Login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/teacher/login" element={<TeacherLogin />} />
          <Route path="/teacher/register" element={<TeacherRegister />} />
          <Route path="/alumni" element={
            <ProtectedRoute>
              <AlumniDirectory />
            </ProtectedRoute>
          } />
          <Route path="/alumni/profile/:id" element={
            <ProtectedRoute>
              <AlumniProfile />
            </ProtectedRoute>
          } />
          <Route path="/events" element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          } />
          <Route path="/events/:id" element={
            <ProtectedRoute>
              <EventDetail />
            </ProtectedRoute>
          } />
          <Route path="/achievements" element={
            <ProtectedRoute>
              <Achievements />
            </ProtectedRoute>
          } />
          <Route path="/achievements/:id" element={
            <ProtectedRoute>
              <AchievementDetail />
            </ProtectedRoute>
          } />
          <Route path="/employment" element={
            <ProtectedRoute>
              <Employment />
            </ProtectedRoute>
          } />
          <Route path="/job-applications/:jobId" element={
            <ProtectedRoute>
              <JobApplications />
            </ProtectedRoute>
          } />
          <Route path="/donations" element={
            <ProtectedRoute>
              <Donations />
            </ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          } />
          <Route path="/donate/:campaignId" element={
            <ProtectedRoute allowedRoles={['ALUMNI', 'TEACHER', 'ADMIN']} redirectTo="/home">
              <DonatePage />
            </ProtectedRoute>
          } />
          <Route path="/admin/donate/:campaignId" element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']} redirectTo="/home">
              <AdminCampaignReceipts />
            </ProtectedRoute>
          } />
          <Route path="/teachers" element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']} redirectTo="/home">
              <TeacherManagement />
            </ProtectedRoute>
          } />
          <Route path="/manage-users" element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']} redirectTo="/home">
              <ManageUsers />
            </ProtectedRoute>
          } />
          <Route path="/activity-logs" element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']} redirectTo="/home">
              <ActivityLogs />
            </ProtectedRoute>
          } />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  const [sessionVersion, setSessionVersion] = React.useState(0);

  // Remount routes only when auth token changes across tabs — not on profile updates.
  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key === 'token' || event.key === 'user') {
        setSessionVersion((value) => value + 1);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const forceBlockedLogout = React.useCallback((message = BLOCKED_MESSAGE) => {
    handleAccountBlocked(message);
  }, []);

  useEffect(() => {
    const refreshCurrentUser = async () => {
      const currentUser = authService.getCurrentUser();
      const token = localStorage.getItem('token');
      if (!currentUser?.id || !token) return;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/profile/${currentUser.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) return;

        const freshUser = await response.json();
        if (freshUser?.alumni) {
          freshUser.alumni = {
            ...freshUser.alumni,
            dateOfBirth: freshUser.alumni.dateOfBirth || freshUser.alumni.date_of_birth || null,
            date_of_birth: freshUser.alumni.date_of_birth || freshUser.alumni.dateOfBirth || null
          };
        }

        if (freshUser?.is_blocked === true) {
          forceBlockedLogout(freshUser?.error || BLOCKED_MESSAGE);
          return;
        }

        const latestUser = authService.getCurrentUser();
        const previous = JSON.stringify(latestUser || {});
        const next = JSON.stringify(freshUser || {});
        if (previous !== next) {
          localStorage.setItem('user', JSON.stringify(freshUser));
          window.dispatchEvent(new CustomEvent('auth-user-updated', { detail: freshUser }));
        }
      } catch (error) {
        console.error('Failed to refresh user from realtime event:', error);
      }
    };

    const unsubProfile = realtimeClient.subscribe('profile.updated', (payload) => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.id) return;
      if (!payload?.userId || Number(payload.userId) === Number(currentUser.id)) {
        refreshCurrentUser();
      }
    });

    const unsubAlumni = realtimeClient.subscribe('alumni.updated', (payload) => {
      const currentUser = authService.getCurrentUser();
      const currentAlumniId = currentUser?.alumni?.id;
      if (!currentAlumniId || !payload?.alumniId) return;
      if (Number(payload.alumniId) === Number(currentAlumniId)) {
        refreshCurrentUser();
      }
    });

    const unsubBlocked = realtimeClient.subscribe('user.blocked', (payload) => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser?.id || !payload?.userId) return;
      if (Number(payload.userId) !== Number(currentUser.id)) return;
      if (payload?.is_blocked === true) {
        forceBlockedLogout(BLOCKED_MESSAGE);
      } else {
        // If user was unblocked and they are currently logged out, no-op.
        // If still logged in, refresh profile data.
        refreshCurrentUser();
      }
    });

    return () => {
      unsubProfile();
      unsubAlumni();
      unsubBlocked();
    };
  }, [forceBlockedLogout]);

  // Clean up stale localStorage data (one-time on mount)
  const [isAuthenticated, setIsAuthenticated] = React.useState(() => {
    const user = authService.getCurrentUser();
    const token = localStorage.getItem('token');

    if (user && !token) {
      localStorage.removeItem('user');
    }
    if (token && !user) {
      localStorage.removeItem('token');
    }

    return !!(authService.getCurrentUser() && localStorage.getItem('token'));
  });

  // Keep isAuthenticated in sync with localStorage
  useEffect(() => {
    const syncAuth = () => {
      const user = authService.getCurrentUser();
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!(user && token));
    };

    window.addEventListener('storage', syncAuth);
    window.addEventListener('auth-user-updated', syncAuth);
    window.addEventListener('logout', syncAuth);

    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('auth-user-updated', syncAuth);
      window.removeEventListener('logout', syncAuth);
    };
  }, []);

  // Active session guard: poll authenticated session-status + realtime block events.
  useEffect(() => {
    if (!isAuthenticated) {
      stopSessionGuard();
      return undefined;
    }

    realtimeClient.connect();
    startSessionGuard();

    const handleLogout = () => {
      authService.logout();
    };

    const handleStorage = (event) => {
      if (event.key === 'token' && !event.newValue) {
        handleLogout();
      }
    };

    const handleBeforeUnload = () => {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return;

      try {
        fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${currentToken}`
          },
          keepalive: true
        });
      } catch {
        // Ignore unload network errors.
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('logout', handleLogout);

    return () => {
      stopSessionGuard();
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      window.removeEventListener('logout', handleLogout);
    };
  }, [isAuthenticated]);

  return (
    <Router>
      <AppContent key={sessionVersion} />
    </Router>
  );
}

export default App;
