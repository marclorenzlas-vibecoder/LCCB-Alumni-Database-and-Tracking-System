import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

const normalizeRole = (value) => (typeof value === 'string' ? value.trim().toUpperCase() : '');

const ProtectedRoute = ({ children, allowedRoles = null, redirectTo = '/home' }) => {
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('token');
  const location = useLocation();

  // If there's no token, force to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If we have a token but user is not yet available (e.g. restoring session), don't redirect yet — wait for auth to initialize
  if (!user && token) {
    return null; // render nothing until auth state is hydrated
  }

  // If account is blocked, force to login
  if (user?.is_blocked === true || user?.isBlocked === true) {
    return <Navigate to="/login" replace />;
  }

  // Allow access to pending approval page
  if (location.pathname === '/pending-approval') {
    return children;
  }

  // Check if user is pending or rejected (but not teachers)
  if (((user?.role || '').toUpperCase() !== 'TEACHER') && (user.approval_status === 'PENDING' || user.approval_status === 'REJECTED')) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Check if account is inactive
  if (user.is_active === false && ((user?.role || '').toUpperCase() !== 'TEACHER')) {
    return <Navigate to="/pending-approval" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = normalizeRole(user.role || authService.getRole());
    const permittedRoles = allowedRoles.map(normalizeRole);

    if (!permittedRoles.includes(userRole)) {
      return <Navigate to={redirectTo} replace />;
    }
  }
  
  return children;
};

export default ProtectedRoute;
