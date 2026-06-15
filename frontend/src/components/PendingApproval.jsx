import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';
import UserLayout from './UserLayout';

const PendingApproval = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  useEffect(() => {
    const checkApprovalStatus = async () => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }

      if (currentUser.approval_status === 'APPROVED') {
        navigate('/home');
        return;
      }

      if (['TEACHER', 'ADMIN'].includes((currentUser?.role || '').toUpperCase())) {
        navigate('/dashboard');
        return;
      }

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
    <UserLayout>
      <ConfirmModal
        isOpen={confirmLogoutOpen}
        onClose={() => setConfirmLogoutOpen(false)}
        onConfirm={() => {
          setConfirmLogoutOpen(false);
          handleLogout();
        }}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmText="Log Out"
        cancelText="Cancel"
        type="danger"
      />

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200 flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-semibold text-gray-900">Pending Approval</h2>
          <button
            onClick={() => setConfirmLogoutOpen(true)}
            className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
              user?.approval_status === 'REJECTED'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-slate-600 hover:bg-slate-700'
            }`}
          >
            {user?.approval_status === 'REJECTED' ? 'Back to Login' : 'Logout'}
          </button>
        </div>

        <div className="p-6">
          {user?.approval_status === 'PENDING' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-amber-100 p-3 text-amber-600">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Approval Pending</h3>
                    <p className="mt-1 text-sm text-gray-600">Your account is currently under review.</p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-500">Username</span>
                    <span className="font-medium text-gray-900">{user.username}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-gray-500">Email</span>
                    <span className="font-medium text-gray-900">{user.email}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-blue-100 p-3 text-blue-600">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">What happens next?</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
                      <li>Admin will review your registration</li>
                      <li>You will receive a notification when approved</li>
                      <li>This page will automatically update</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user?.approval_status === 'REJECTED' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-xl border border-red-200 bg-red-50 p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl bg-red-100 p-3 text-red-600">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Registration Rejected</h3>
                    <p className="mt-1 text-sm text-gray-600">{user.rejected_reason || 'Your registration has been rejected by the administrator.'}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-red-200 bg-white p-4 text-sm text-red-700">
                  Please go back to the login page. Your account will be removed from the system.
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-6">
                <p className="text-sm text-gray-500">Need help or want to reapply?</p>
                <p className="mt-2 text-sm font-medium text-gray-900">Contact: admin@lccbonline.com</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default PendingApproval;
