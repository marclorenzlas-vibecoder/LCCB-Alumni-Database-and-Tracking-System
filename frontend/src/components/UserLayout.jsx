import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AlumniLogo from '../assets/alumnilogo2.png';
import Navbar from './Navbar';
import ConfirmModal from './ConfirmModal';
import { authService } from '../services/authService';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';

const topNavItems = [
  {
    path: '/profile',
    label: 'Manage Profile',
    description: 'Update account details',
    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  {
    path: '/notifications',
    label: 'Notifications',
    description: 'Alerts and activity updates',
    icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
  }
];

const mainNavItems = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    description: 'Overview and quick actions',
    icon: 'M4 6h7M4 10h7M4 14h7M4 18h7M15 6h5M15 10h5M15 14h5M15 18h5'
  },
  {
    path: '/home',
    label: 'Home',
    description: 'Main feed and announcements',
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'
  },
  {
    path: '/alumni',
    label: 'Alumni Directory',
    description: 'Find and connect with alumni',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
  },
  {
    path: '/events',
    label: 'Events',
    description: 'Upcoming alumni events',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
  },
  {
    path: '/employment',
    label: 'Employment',
    description: 'Career opportunities',
    icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
  },
  {
    path: '/donations',
    label: 'Donations',
    description: 'Support the community',
    icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z'
  },
  {
    path: '/achievements',
    label: 'Achievements',
    description: 'Honors and recognitions',
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z'
  }
];

const adminNavItems = [
  {
    path: '/pending-approval',
    label: 'Pending Requests',
    description: 'Review registration requests',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    role: 'TEACHER'
  },
  {
    path: '/manage-users',
    label: 'Manage Users',
    description: 'Block and unblock alumni accounts',
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  },
  {
    path: '/teachers',
    label: 'Teachers',
    description: 'Teacher account management',
    icon: 'M12 14a4 4 0 100-8 4 4 0 000 8zm0 2c-3.333 0-6 1.334-6 4v2h12v-2c0-2.666-2.667-4-6-4zm7-10h3m-1.5-1.5V7.5',
    role: 'TEACHER'
  },
  {
    path: '/alumni-list',
    label: 'Alumni List',
    description: 'Official alumni records',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    role: 'TEACHER'
  }
];

const isItemActive = (locationPath, itemPath) => locationPath === itemPath;

const getProfileImageSrc = (user) => {
  const imagePath = user?.profile_image || user?.profileImage;
  if (!imagePath) return '';
  return imagePath.startsWith('http') ? imagePath : `${IMAGE_BASE_URL}${imagePath}`;
};

const getUserInitial = (user) => {
  const first = user?.first_name || user?.firstName || user?.username || 'U';
  return first.charAt(0).toUpperCase();
};

const SIDEBAR_SCROLL_KEY = 'userSidebarScrollTop';

const UserLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebarCollapsed') === 'true';
    } catch { return false; }
  });
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const sidebarScrollRef = useRef(null);
  const prevScrollRef = useRef(null);
  const user = authService.getCurrentUser();
  const [isLargeScreen, setIsLargeScreen] = useState(typeof window !== 'undefined' ? window.innerWidth >= 1024 : false);

  // Normalize role for case-insensitive comparisons throughout the layout
  const userRole = (authService.getRole() || '').toUpperCase();
  const isAdminSide = userRole === 'TEACHER' || userRole === 'ADMIN';

  const visibleTop = topNavItems.filter((item) => !item.role || isAdminSide);
  const visibleMain = mainNavItems.filter((item) => !item.role || isAdminSide);
  const visibleAdmin = adminNavItems.filter((item) => !item.role || isAdminSide);

  useEffect(() => {
    // Only auto-close the mobile sidebar on navigation; avoid changing desktop sidebar state
    if (!isLargeScreen) setSidebarOpen(false);
  }, [location.pathname, isLargeScreen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width:1024px)');
    const onChange = (e) => setIsLargeScreen(e.matches);
    try { mq.addEventListener('change', onChange); } catch { mq.addListener(onChange); }
    setIsLargeScreen(mq.matches);
    return () => { try { mq.removeEventListener('change', onChange); } catch { mq.removeListener(onChange); } };
  }, []);

  useEffect(() => {
    // After navigation, restore previous scroll if set (preserve scroll)
    if (prevScrollRef.current != null) {
      const y = prevScrollRef.current;
      // next tick so new content is rendered
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
        prevScrollRef.current = null;
      });
    }
  }, [location.pathname]);

  useLayoutEffect(() => {
    const sidebarElement = sidebarScrollRef.current;
    if (!sidebarElement) return;

    const savedScrollTop = Number(sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || '0');
    sidebarElement.scrollTop = Number.isFinite(savedScrollTop) ? savedScrollTop : 0;
  }, []);

  useEffect(() => {
    const sidebarElement = sidebarScrollRef.current;
    if (!sidebarElement) return undefined;

    const handleSidebarScroll = () => {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(sidebarElement.scrollTop));
    };

    sidebarElement.addEventListener('scroll', handleSidebarScroll, { passive: true });
    return () => {
      sidebarElement.removeEventListener('scroll', handleSidebarScroll);
    };
  }, []);

  const navigatePreservingScroll = (path) => {
    // On large screens don't close or animate the sidebar - navigate directly to avoid visual flicker
    if (isLargeScreen) {
      navigate(path);
      return;
    }

    prevScrollRef.current = window.scrollY;
    const sidebarElement = sidebarScrollRef.current;
    if (sidebarElement) {
      sessionStorage.setItem(SIDEBAR_SCROLL_KEY, String(sidebarElement.scrollTop));
    }
    setSidebarOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login', { replace: true });
  };

  const openLogoutConfirm = () => {
    setConfirmLogoutOpen(true);
  };

  if (!isAdminSide) {
    return (
      <div className="min-h-screen bg-slate-100">
        <Navbar />
        <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
        <ConfirmModal
          isOpen={confirmLogoutOpen}
          onClose={() => setConfirmLogoutOpen(false)}
          onConfirm={async () => {
            setConfirmLogoutOpen(false);
            await handleLogout();
          }}
          title="Log Out"
          message="Are you sure you want to log out?"
          confirmText="Log Out"
          cancelText="Cancel"
          type="danger"
        />
        <aside
          className={`fixed inset-y-0 left-0 z-40 overflow-hidden border-r border-blue-950/70 bg-gradient-to-b from-blue-950 via-blue-900 to-blue-950 text-white shadow-2xl transition-transform duration-300 ease-in-out w-72 ${
            /* On large screens: keep sidebar visible unless collapsed; on small screens: use sidebarOpen state */
            collapsed ? '-translate-x-full' : (isLargeScreen || sidebarOpen ? 'translate-x-0' : '-translate-x-full')
          }`}
        >
        <div className={`flex h-full flex-col transition-opacity duration-200 ${collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="border-b border-blue-300/20 px-6 py-5">
            <button onClick={(e) => { e.preventDefault(); prevScrollRef.current = window.scrollY; navigate('/dashboard'); }} className="flex w-full items-center gap-3 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 p-1 shadow-lg shadow-blue-950/30">
                <img src={AlumniLogo} alt="LCCB Alumni Association Inc. Logo" className="h-10 w-10 rounded-full object-contain" />
              </div>
              <div className="flex min-w-0 flex-col items-start">
                <p className={`text-lg font-bold tracking-tight ${collapsed ? 'hidden' : ''}`}>LCCB Alumni</p>
                <p className={`text-xs uppercase tracking-[0.28em] text-blue-200 ${collapsed ? 'hidden' : ''}`}>Alumni Network</p>
              </div>
            </button>
          </div>

          <nav ref={sidebarScrollRef} className="flex-1 overflow-y-auto px-4 py-5">
            {/* Top group */}
            <div className="space-y-2">
              {visibleTop.map((item) => {
                const isActive = isItemActive(location.pathname, item.path);
                return (
                  <button
                    key={item.path}
                    onClick={(e) => { e.preventDefault(); navigatePreservingScroll(item.path); }}
                    className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-blue-300/45 bg-blue-400/20 text-white shadow-lg shadow-blue-950/30'
                        : 'border-blue-300/15 text-blue-100/90 hover:border-blue-300/35 hover:bg-blue-400/10 hover:text-white'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-blue-200 text-blue-950' : 'bg-blue-200/10 text-blue-100 group-hover:bg-blue-200/20'}`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                      </svg>
                    </span>
                    <span className={`min-w-0 ${collapsed ? 'hidden' : ''}`}>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-blue-100/65 group-hover:text-blue-100/90">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="my-3">
              <hr className="border-blue-300/20" />
            </div>

            {/* Main pages */}
            <div className="space-y-2">
              {visibleMain.map((item) => {
                const isActive = isItemActive(location.pathname, item.path);
                return (
                  <button
                    key={item.path}
                    onClick={(e) => { e.preventDefault(); navigatePreservingScroll(item.path); }}
                    className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? 'border-blue-300/45 bg-blue-400/20 text-white shadow-lg shadow-blue-950/30'
                        : 'border-blue-300/15 text-blue-100/90 hover:border-blue-300/35 hover:bg-blue-400/10 hover:text-white'
                    }`}
                  >
                    <span className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-blue-200 text-blue-950' : 'bg-blue-200/10 text-blue-100 group-hover:bg-blue-200/20'}`}>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                      </svg>
                    </span>
                    <span className={`${collapsed ? 'hidden' : 'min-w-0'}`}>
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-blue-100/65 group-hover:text-blue-100/90">{item.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {visibleAdmin.length > 0 && (
              <>
                <div className="my-3">
                  <hr className="border-blue-300/20" />
                </div>

                <div className="space-y-3">
                      {visibleAdmin.map((item) => {
                        const isActive = isItemActive(location.pathname, item.path);
                        return (
                          <button
                            key={item.path}
                            onClick={(e) => { e.preventDefault(); navigatePreservingScroll(item.path); }}
                            className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 ${
                              isActive
                                ? 'border-blue-300/45 bg-blue-400/20 text-white shadow-lg shadow-blue-950/30'
                                : 'border-blue-300/15 text-blue-100/90 hover:border-blue-300/35 hover:bg-blue-400/10 hover:text-white'
                            }`}
                          >
                            <span className={`mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-blue-200 text-blue-950' : 'bg-blue-200/10 text-blue-100 group-hover:bg-blue-200/20'}`}>
                              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
                              </svg>
                            </span>
                            <span className={`${collapsed ? 'hidden' : 'min-w-0'}`}>
                              <span className="block text-sm font-semibold">{item.label}</span>
                              <span className="mt-1 block text-xs leading-5 text-blue-100/65 group-hover:text-blue-100/90">{item.description}</span>
                            </span>
                          </button>
                        );
                      })}
                </div>
              </>
            )}
          </nav>

          <div className="border-t border-blue-300/20 px-4 py-3">
            <div className="rounded-xl border border-blue-300/20 bg-blue-900/30 p-3 backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.22em] text-blue-100/70">Signed in as</p>
              <div className="mt-2 flex items-center gap-2.5">
                {getProfileImageSrc(user) ? (
                  <img
                    src={getProfileImageSrc(user)}
                    alt={user?.username || 'Alumni'}
                    className="h-9 w-9 rounded-full border border-blue-200/40 object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200/40 bg-blue-500/30 text-xs font-bold text-white">
                    {getUserInitial(user)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{user?.username || 'Alumni'}</p>
                  <p className="truncate text-[11px] text-blue-100/70">{user?.email || 'user@example.com'}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={openLogoutConfirm}
                className="group inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white hover:bg-blue-800/40"
              >
                <svg className="h-4 w-4 text-blue-100/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 11-4 0v-1m0-10V5a2 2 0 114 0v1" />
                </svg>
                <span className={`${collapsed ? 'hidden' : ''}`}>Log out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        aria-pressed={collapsed}
        onClick={() => {
          const next = !collapsed;
          setCollapsed(next);
          try { localStorage.setItem('sidebarCollapsed', String(next)); } catch {}
        }}
        className={`fixed top-1/2 z-50 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-lg shadow-slate-300/40 transition-all duration-300 lg:flex ${collapsed ? 'left-2' : 'left-[17.25rem]'}`}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <svg className={`h-4 w-4 transition-transform duration-300 ${collapsed ? 'rotate-0' : 'rotate-180'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/60 lg:hidden"
        />
      )}

      <div className={`transition-[padding] duration-300 ease-in-out ${collapsed ? 'lg:pl-0' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-sky-200 hover:text-sky-700"
              aria-label="Open navigation"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">LCCB Alumni</p>
              <h1 className="text-base font-semibold text-slate-900">Network</h1>
            </div>
          </div>
        </header>

        <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
};

export default UserLayout;
