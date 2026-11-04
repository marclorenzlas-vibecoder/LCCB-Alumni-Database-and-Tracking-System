import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { API_BASE_URL } from '../config/apiBaseUrl';
import ConfirmModal from './ConfirmModal';
import UserLayout from './UserLayout';

const PendingApproval = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/auth/pending-status`, {
          headers: {
            Authorization: `Bearer ${token}`
          },
          cache: 'no-store'
        });

        if (!response.ok) {
          throw new Error(`Pending status request failed with status ${response.status}`);
        }

        const status = await response.json();
        const updatedUser = {
          ...currentUser,
          approval_status: status.status,
          rejected_reason: status.rejected_reason || currentUser.rejected_reason
        };

        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);

        if (status.status === 'APPROVED') {
          navigate('/home');
        }
      } catch (error) {
        console.error('Error checking registration status:', error);
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
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    const token = localStorage.getItem('token');

    authService.clearLocalSession();
    setUser(null);
    window.dispatchEvent(new Event('logout'));
    navigate('/login', { replace: true });

    if (token) {
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        keepalive: true
      }).catch(() => {});
    }

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
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
              <div className="relative bg-gradient-to-br from-blue-950 via-blue-900 to-cyan-700 px-8 pb-16 pt-10 text-center">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
                <div className="relative mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/95 shadow-xl">
                  <svg className="h-10 w-10 animate-pulse text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h1 className="relative text-2xl font-bold text-white">Account Under Review</h1>
                <p className="relative mt-2 text-sm font-medium text-blue-100">Your registration is being verified</p>
              </div>

              <div className="relative -mt-8 px-6 pb-6 sm:px-8 sm:pb-8">
                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold tracking-wide text-amber-700 shadow-sm">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      PENDING
                    </span>
                    <span className="text-xs font-medium text-amber-700">
                      Checking every 10s{dots}
                    </span>
                  </div>
                </div>

                <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Registration details</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-xs text-slate-400">Username</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.username}</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-xs text-slate-400">Email</p>
                      <p className="mt-1 truncate text-sm font-semibold text-slate-900">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">What happens next?</p>
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
                  disabled={isLoggingOut}
                  className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  {isLoggingOut ? 'Logging out...' : 'Log out'}
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
                <p className="mt-1 text-red-100 text-sm font-medium">Your account has been rejected</p>
              </div>

              <div className="-mt-8 relative px-8 pb-8">
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Decision details</p>
                    <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-red-700">
                      Rejected
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-red-800">
                    {user?.rejected_reason || 'The information submitted could not be verified.'}
                  </p>
                </div>

                <div className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm leading-6 text-blue-800">
                    You may submit a new registration using updated and accurate information.
                  </p>
                </div>

                {/* Back to login */}
                <button
                  type="button"
                  onClick={() => setConfirmLogoutOpen(true)}
                  disabled={isLoggingOut}
                  className="w-full rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700"
                >
                  {isLoggingOut ? 'Logging out...' : 'Back to Login'}
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
