import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authService } from '../services/authService';

const ProtectedRoute = ({ children }) => {
  const user = authService.getCurrentUser();
  const token = localStorage.getItem('token');
  const location = useLocation();
  
  // Not logged in
  if (!user || !token) {
    return <Navigate to="/login" replace />;
  }

  // Allow access to pending approval page
  if (location.pathname === '/pending-approval') {
    return children;
  }

  // Allow access to admin dashboard only for teachers
  if (location.pathname === '/admin/dashboard') {
    if (user.role !== 'TEACHER') {
      return <Navigate to="/home" replace />;
    }
    return children;
  }

  // Check if user is pending or rejected (but not teachers)
  if (user.role !== 'TEACHER' && (user.approval_status === 'PENDING' || user.approval_status === 'REJECTED')) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Check if account is inactive
  if (!user.is_active && user.role !== 'TEACHER') {
    return <Navigate to="/pending-approval" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
