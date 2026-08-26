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
import AdminDashboard from './components/AdminDashboard';
import AlumniList from './components/AlumniList';
import PendingApproval from './components/PendingApproval';
import Events from './components/Events';
import EventDetail from './components/EventDetail';
import Achievements from './components/Achievements';
import Employment from './components/Employment';
import JobApplications from './components/JobApplications';
import Donations from './components/Donations';
import DonatePage from './components/DonatePage';
import Notifications from './components/Notifications';
import LiveDonationToast from './components/LiveDonationToast';
import OAuthCallback from './components/OAuthCallback';
import TeacherLogin from './components/TeacherLogin';
import TeacherRegister from './components/TeacherRegister';
import TeacherManagement from './components/TeacherManagement';
import ManageUsers from './components/ManageUsers';
import ProtectedRoute from './components/ProtectedRoute';
import { realtimeClient } from './services/realtimeClient';
import { API_BASE_URL } from './config/apiBaseUrl';
import { authService } from './services/authService';

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
              {['teacher', 'admin'].includes(authService.getRole()) ? <AdminDashboard /> : <Dashboard />}
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
          <Route path="/pending-approval" element={
            <ProtectedRoute>
              {['teacher', 'admin'].includes(authService.getRole()) ? <AdminDashboard pendingOnly /> : <PendingApproval />}
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
          <Route path="/alumni-list" element={
            <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']} redirectTo="/home">
              <AlumniList />
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

  useEffect(() => {
    const handleSessionChange = () => {
      setSessionVersion((value) => value + 1);
    };

    window.addEventListener('auth-user-updated', handleSessionChange);
    window.addEventListener('storage', handleSessionChange);

    return () => {
      window.removeEventListener('auth-user-updated', handleSessionChange);
      window.removeEventListener('storage', handleSessionChange);
    };
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
        localStorage.setItem('user', JSON.stringify(freshUser));
        window.dispatchEvent(new CustomEvent('auth-user-updated', { detail: freshUser }));
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

    return () => {
      unsubProfile();
      unsubAlumni();
    };
  }, []);

  // Check if user is authenticated by looking for both user and token
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('token');
  
  // If we have user data but no token, clear the user data
  if (user && !token) {
    localStorage.removeItem('user');
  }
  
  // If we have token but no user data, clear the token
  if (token && !user) {
    localStorage.removeItem('token');
  }
  
  const isAuthenticated = !!(user && token);
  
  // Debug logging
  console.log('App render - user:', user);
  console.log('App render - token:', token);
  console.log('App render - isAuthenticated:', isAuthenticated);
  console.log('App session version:', sessionVersion);

  // Initialize session management
  useEffect(() => {
    const handleLogout = () => {
      if (isAuthenticated) {
        authService.logout();
      }
    };

    // Listen for storage events (triggered when localStorage is modified in other tabs)
    const handleStorage = (event) => {
      if (event.key === 'token' && !event.newValue) {
        handleLogout();
      }
    };

    // Best-effort logout signal so closed tabs do not remain counted as active.
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

    // Add event listeners
    window.addEventListener('storage', handleStorage);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    window.addEventListener('logout', handleLogout);

    // Cleanup event listeners
    return () => {
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
