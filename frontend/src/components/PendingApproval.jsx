import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import AlumniLogo from '../assets/alumnilogo2.png';

const PendingApproval = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());

  useEffect(() => {
    // Check if user is now approved (poll every 10 seconds)
    const checkApprovalStatus = async () => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // If approved or teacher, redirect to home
      if (currentUser.approval_status === 'APPROVED' || currentUser.role === 'TEACHER') {
        navigate('/home');
        window.location.reload();
      }

      // If rejected, show message but stay on page
      if (currentUser.approval_status === 'REJECTED') {
        setUser(currentUser);
      }
    };

    checkApprovalStatus();
    const interval = setInterval(checkApprovalStatus, 10000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center justify-center rounded-full bg-blue-100 p-3">
            <img 
              src={AlumniLogo}
              alt="LCCB Alumni Logo" 
              className="h-16 w-16 object-contain"
            />
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">LCCB Alumni</h1>
          <p className="text-sm text-gray-600">Account Status</p>
        </div>

        {/* Status Content */}
        {user?.approval_status === 'PENDING' && (
          <div className="text-center">
            {/* Pending Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-yellow-100 rounded-full p-4">
                <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-3">Approval Pending</h2>
            <p className="text-gray-600 mb-6">
              Your account is currently under review by our administrators. You will be notified once your account has been approved.
            </p>

            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Username:</span>
                <span className="text-sm font-medium text-gray-900">{user.username}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Email:</span>
                <span className="text-sm font-medium text-gray-900">{user.email}</span>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">What happens next?</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Admin will review your registration</li>
                    <li>You'll receive a notification when approved</li>
                    <li>This page will automatically update</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {user?.approval_status === 'REJECTED' && (
          <div className="text-center">
            {/* Rejected Icon */}
            <div className="flex justify-center mb-4">
              <div className="bg-red-100 rounded-full p-4">
                <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-3">Registration Rejected</h2>
            <p className="text-gray-600 mb-4">
              {user.rejected_reason || 'Your registration request has been rejected by the administrator.'}
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Important</p>
                  <p className="text-xs">Please go back to the login page. Your account will be removed from the system.</p>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">Need help or want to reapply?</p>
              <p className="text-sm font-medium text-gray-900">Contact: admin@lccbonline.com</p>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`w-full py-3 px-4 ${
            user?.approval_status === 'REJECTED' 
              ? 'bg-red-600 hover:bg-red-700' 
              : 'bg-gray-600 hover:bg-gray-700'
          } text-white font-medium rounded-lg transition-colors duration-200 flex items-center justify-center`}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {user?.approval_status === 'REJECTED' ? 'Back to Login' : 'Logout'}
        </button>
      </div>
    </div>
  );
};

export default PendingApproval;
