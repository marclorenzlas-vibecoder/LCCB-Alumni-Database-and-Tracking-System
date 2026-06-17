import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';
import UserLayout from './UserLayout';

const PendingApproval = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [dots, setDots] = useState('');

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

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(dotInterval);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  const isRejected = user?.approval_status === 'REJECTED';

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

      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          {user?.approval_status === 'PENDING' && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              {/* Header with gradient */}
              <div className="relative bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-400 px-8 pt-10 pb-16 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-lg">
                  <svg className="h-10 w-10 text-amber-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-white">Account Under Review</h1>
                <p className="mt-1 text-amber-100 text-sm font-medium">We're verifying your alumni status</p>
              </div>

              {/* Content */}
              <div className="-mt-8 relative px-8 pb-8">
                {/* Status card */}
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 mb-5">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      PENDING
                    </span>
                    <span className="text-xs text-amber-600 font-medium">
                      Checking every 10s{dots}
                    </span>
                  </div>
                </div>

                {/* User info */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-5">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Registration Details</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Username</span>
                      <span className="text-sm font-semibold text-gray-900">{user?.username}</span>
                    </div>
                    <div className="border-t border-gray-200" />
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">Email</span>
                      <span className="text-sm font-semibold text-gray-900">{user?.email}</span>
                    </div>
                  </div>
                </div>

                {/* What happens next */}
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-5 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">What happens next?</p>
                      <ul className="mt-2 space-y-1.5">
                        <li className="flex items-start gap-2 text-sm text-gray-600">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Admin will review your registration
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-600">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          You will be notified once approved
                        </li>
                        <li className="flex items-start gap-2 text-sm text-gray-600">
                          <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          This page updates automatically
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Logout button */}
                <button
                  type="button"
                  onClick={() => setConfirmLogoutOpen(true)}
                  className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Log out
                </button>
              </div>
            </div>
          )}

          {isRejected && (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden">
              {/* Rejected header */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 px-8 pt-10 pb-16 text-center">
                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/90 shadow-lg">
                  <svg className="h-10 w-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-white">Registration Rejected</h1>
                <p className="mt-1 text-red-100 text-sm font-medium">Your application was not approved</p>
              </div>

              <div className="-mt-8 relative px-8 pb-8">
                {/* Rejection reason */}
                <div className="rounded-xl border border-red-200 bg-red-50 p-5 mb-5">
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Reason</p>
                  <p className="text-sm text-red-700 leading-relaxed">
                    {user?.rejected_reason || 'Your registration has been rejected by the administrator.'}
                  </p>
                </div>

                {/* Info */}
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 mb-6">
                  <p className="text-sm text-gray-600">
                    Please contact the administrator if you have questions or wish to reapply.
                  </p>
                  <p className="mt-2 text-sm font-semibold text-gray-900">admin@lccbonline.com</p>
                </div>

                {/* Back to login */}
                <button
                  type="button"
                  onClick={() => setConfirmLogoutOpen(true)}
                  className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default PendingApproval;
