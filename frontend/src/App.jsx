import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import AlumniDirectory from './components/AlumniDirectory';
import AlumniProfile from './components/AlumniProfile';
import Profile from './components/Profile';
import AdminDashboard from './components/AdminDashboard';
import PendingApproval from './components/PendingApproval';
import Events from './components/Events';
import EventDetail from './components/EventDetail';
import Achievements from './components/Achievements';
import Employment from './components/Employment';
import Donations from './components/Donations';
import OAuthCallback from './components/OAuthCallback';
import TeacherLogin from './components/TeacherLogin';
import TeacherRegister from './components/TeacherRegister';
import TeacherManagement from './components/TeacherManagement';
import ManageUsers from './components/ManageUsers';
import ProtectedRoute from './components/ProtectedRoute';
import { authService } from './services/authService';

function AppContent() {
  const location = useLocation();
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('token');
  const isAuthenticated = !!(user && token);

  // Pages where Navbar should be hidden
  const hideNavbarRoutes = ['/login', '/Login', '/register', '/teacher/login', '/teacher/register', '/pending-approval'];
  const shouldShowNavbar = isAuthenticated && !hideNavbarRoutes.includes(location.pathname);
  
  // Pages that need full width without container padding
  const fullWidthRoutes = ['/', '/home'];
  const needsContainer = shouldShowNavbar && !fullWidthRoutes.includes(location.pathname);

  return (
    <div className="min-h-screen">
      {shouldShowNavbar && <Navbar />}
      <div className={needsContainer ? "container mx-auto px-4 py-8" : ""}>
        <Routes>
          <Route path="/" element={
            isAuthenticated ? (
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            ) : (
              <Navigate to="/Login" replace />
            )
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
              <PendingApproval />
            </ProtectedRoute>
          } />
          <Route path="/admin/dashboard" element={
            <ProtectedRoute>
              <AdminDashboard />
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
          <Route path="/donations" element={
            <ProtectedRoute>
              <Donations />
            </ProtectedRoute>
          } />
          <Route path="/teachers" element={
            <ProtectedRoute>
              <TeacherManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/manage-users" element={
            <ProtectedRoute>
              <ManageUsers />
            </ProtectedRoute>
          } />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
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

    // Listen for beforeunload to handle tab/browser closing
    const handleBeforeUnload = () => {
      if (document.visibilityState === 'hidden') {
        // Don't clear localStorage here, as it would affect other tabs
      }
    };

    // Add event listeners
    window.addEventListener('storage', handleStorage);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('logout', handleLogout);

    // Cleanup event listeners
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('logout', handleLogout);
    };
  }, [isAuthenticated]);

  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
