import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import ConfirmModal from './ConfirmModal';
import AlumniLogo from '../assets/alumnilogo2.png';
import UserLayout from './UserLayout';

const PendingApproval = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  useEffect(() => {
    // Check if user is now approved (poll every 10 seconds)
    const checkApprovalStatus = async () => {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        navigate('/login');
        return;
      }

      // If approved, redirect to home
      if (currentUser.approval_status === 'APPROVED') {
        navigate('/home');
        return;
      }

      // If this account is a teacher or admin and somehow landed here, send to dashboard
      if (['TEACHER', 'ADMIN'].includes((currentUser?.role || '').toUpperCase())) {
        navigate('/dashboard');
        return;
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
    <UserLayout>
      <div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
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

        <div className="mx-auto max-w-4xl space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4 border-b border-slate-200 pb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 p-2">
              <img src={AlumniLogo} alt="LCCB Alumni Logo" className="h-10 w-10 object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Pending Approval</h1>
              <p className="text-sm text-slate-500">Your registration is being reviewed.</p>
            </div>
          </div>

          {user?.approval_status === 'PENDING' && (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-amber-100 p-4 text-amber-700">
                    <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Approval Pending</h2>
                    <p className="mt-1 text-slate-600">Your account is currently under review by our administrators.</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-500">Username</span>
                    <span className="font-medium text-slate-900">{user.username}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 text-sm">
                    <span className="text-slate-500">Email</span>
                    <span className="font-medium text-slate-900">{user.email}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-blue-100 p-3 text-blue-700">
                    <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">What happens next?</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                      <li>Admin will review your registration</li>
                      <li>You’ll receive a notification when approved</li>
                      <li>This page will automatically update</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user?.approval_status === 'REJECTED' && (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-rose-100 p-4 text-rose-700">
                    <svg className="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">Registration Rejected</h2>
                    <p className="mt-1 text-slate-600">{user.rejected_reason || 'Your registration request has been rejected by the administrator.'}</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                  Please go back to the login page. Your account will be removed from the system.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-sm text-slate-500">Need help or want to reapply?</p>
                <p className="mt-2 text-sm font-medium text-slate-900">Contact: admin@lccbonline.com</p>
              </div>
            </div>
          )}

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button
              onClick={() => setConfirmLogoutOpen(true)}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 ${
                user?.approval_status === 'REJECTED'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-slate-600 hover:bg-slate-700'
              }`}
            >
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {user?.approval_status === 'REJECTED' ? 'Back to Login' : 'Logout'}
            </button>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default PendingApproval;
