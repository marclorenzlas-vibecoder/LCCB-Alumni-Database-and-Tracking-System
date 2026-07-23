import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AlumniLogo from "../assets/alumnilogo2.png";
import Navbar from "./Navbar";
import ConfirmModal from "./ConfirmModal";
import { authService } from "../services/authService";
import { IMAGE_BASE_URL } from "../config/apiBaseUrl";

const topNavItems = [
  {
    path: "/settings",
    label: "Settings",
    icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z",
  },
  {
    path: "/notifications",
    label: "Notifications",
    icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9",
  },
];

const mainNavItems = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: "M4 6h7M4 10h7M4 14h7M4 18h7M15 6h5M15 10h5M15 14h5M15 18h5",
  },
  {
    path: "/home",
    label: "Home",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    path: "/alumni",
    label: "Alumni Directory",
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
  {
    path: "/events",
    label: "Events",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    path: "/achievements",
    label: "Achievements",
    icon: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  },
  {
    path: "/employment",
    label: "Employment",
    icon: "M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
  },
  {
    path: "/donations",
    label: "Donations",
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

const adminNavItems = [
  {
    path: "/pending-approval",
    label: "Pending Requests",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    role: "TEACHER",
  },
  {
    path: "/manage-users",
    label: "Manage Users",
    icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14c-3.333 0-6 1.334-6 4v2h12v-2c0-2.666-2.667-4-6-4z",
  },
  {
    path: "/teachers",
    label: "Teachers",
    icon: "M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0118 14.5c0 2.485-2.686 4.5-6 4.5s-6-2.015-6-4.5c0-1.36.29-2.68.84-3.922L12 14z",
    role: "TEACHER",
  },
  {
    path: "/activity-logs",
    label: "Activity Logs",
    icon: "M12 8v5l3 2m6-3a9 9 0 11-3.36-7.02M21 3v5h-5",
    role: "TEACHER",
  },
];

const isItemActive = (locationPath, itemPath) => {
  if (itemPath === "/settings") {
    return (
      locationPath === "/settings" ||
      locationPath.startsWith("/settings/") ||
      locationPath === "/profile"
    );
  }
  return locationPath === itemPath;
};

const getProfileImageSrc = (user) => {
  const imagePath = user?.profile_image || user?.profileImage;
  if (!imagePath) return "";
  return imagePath.startsWith("http")
    ? imagePath
    : `${IMAGE_BASE_URL}${imagePath}`;
};

const getUserInitials = (user) => {
  const alumni = user?.alumni;
  const first =
    alumni?.firstName ||
    alumni?.first_name ||
    user?.firstName ||
    user?.username ||
    "U";
  const last = alumni?.lastName || alumni?.last_name || user?.lastName || "";
  return `${first.charAt(0)}${last ? last.charAt(0) : ""}`.toUpperCase() || "U";
};

const getUserDisplayName = (user) => {
  const alumni = user?.alumni;
  const first =
    alumni?.firstName || alumni?.first_name || user?.firstName || "";
  const last = alumni?.lastName || alumni?.last_name || user?.lastName || "";
  const full = `${first} ${last}`.trim();
  return full || user?.username || "User";
};

const getRoleLabel = (role) => {
  if (role === "TEACHER") return "Faculty";
  if (role === "ADMIN") return "Admin";
  return "Alumni";
};

const SIDEBAR_SCROLL_KEY = "userSidebarScrollTop";

const SidebarIcon = ({ d, className = "h-5 w-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      d={d}
    />
  </svg>
);

const SidebarPanelToggle = ({ onClick, expanded }) => (
  <button
    type="button"
    onClick={onClick}
    className="app-sidebar-track text-blue-200/80 transition-colors hover:bg-blue-800/60 hover:text-white"
    aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
    title={expanded ? "Collapse sidebar" : "Expand sidebar"}
  >
    <svg
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="1.5" />
      <path strokeLinecap="round" strokeWidth="1.5" d="M9 4v16" />
    </svg>
  </button>
);

const LogoutIcon = ({ className = "h-5 w-5" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.75"
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
    />
  </svg>
);

const UserLayout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const readCollapsedPreference = () => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "true";
    } catch {
      return false;
    }
  };

  const [collapsed, setCollapsed] = useState(readCollapsedPreference);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const sidebarScrollRef = useRef(null);
  const prevScrollRef = useRef(null);
  const user = authService.getCurrentUser();
  const [isLargeScreen, setIsLargeScreen] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : false,
  );

  const userRole = (authService.getRole() || "").toUpperCase();
  const isAdminSide = userRole === "TEACHER" || userRole === "ADMIN";

  const visibleTop = topNavItems.filter((item) => !item.role || isAdminSide);
  const visibleMain = mainNavItems.filter((item) => !item.role || isAdminSide);
  const visibleAdmin = adminNavItems.filter(
    (item) => !item.role || isAdminSide,
  );

  const isDesktopCollapsed = collapsed && isLargeScreen;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    if (!isLargeScreen) {
      setSidebarOpen(false);
    }
    try {
      localStorage.setItem("sidebarCollapsed", String(next));
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (!isLargeScreen) setSidebarOpen(false);
  }, [location.pathname, isLargeScreen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width:1024px)");
    const onChange = (e) => setIsLargeScreen(e.matches);
    try {
      mq.addEventListener("change", onChange);
    } catch {
      mq.addListener(onChange);
    }
    setIsLargeScreen(mq.matches);
    return () => {
      try {
        mq.removeEventListener("change", onChange);
      } catch {
        mq.removeListener(onChange);
      }
    };
  }, []);

  useEffect(() => {
    if (prevScrollRef.current != null) {
      const y = prevScrollRef.current;
      requestAnimationFrame(() => {
        window.scrollTo(0, y);
        prevScrollRef.current = null;
      });
    }
  }, [location.pathname]);

  useLayoutEffect(() => {
    const sidebarElement = sidebarScrollRef.current;
    if (!sidebarElement) return;
    const savedScrollTop = Number(
      sessionStorage.getItem(SIDEBAR_SCROLL_KEY) || "0",
    );
    sidebarElement.scrollTop = Number.isFinite(savedScrollTop)
      ? savedScrollTop
      : 0;
  }, []);

  useEffect(() => {
    const sidebarElement = sidebarScrollRef.current;
    if (!sidebarElement) return undefined;
    const handleSidebarScroll = () => {
      sessionStorage.setItem(
        SIDEBAR_SCROLL_KEY,
        String(sidebarElement.scrollTop),
      );
    };
    sidebarElement.addEventListener("scroll", handleSidebarScroll, {
      passive: true,
    });
    return () =>
      sidebarElement.removeEventListener("scroll", handleSidebarScroll);
  }, []);

  const navigatePreservingScroll = (path) => {
    if (isItemActive(location.pathname, path)) {
      if (!isLargeScreen) {
        setSidebarOpen(false);
      }
      return;
    }

    if (isLargeScreen) {
      navigate(path);
      return;
    }
    prevScrollRef.current = window.scrollY;
    const sidebarElement = sidebarScrollRef.current;
    if (sidebarElement) {
      sessionStorage.setItem(
        SIDEBAR_SCROLL_KEY,
        String(sidebarElement.scrollTop),
      );
    }
    setSidebarOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    await authService.logout();
    navigate("/login", { replace: true });
  };

  const openLogoutConfirm = () => {
    setConfirmLogoutOpen(true);
  };

  const renderNavButton = (item) => {
    const isActive = isItemActive(location.pathname, item.path);
    return (
      <button
        key={item.path}
        type="button"
        title={isDesktopCollapsed ? item.label : undefined}
        onClick={(e) => {
          e.preventDefault();
          navigatePreservingScroll(item.path);
        }}
        className={`app-sidebar-nav-btn app-sidebar-row rounded-lg text-sm font-medium ${
          isActive ? "is-active" : "text-blue-100/90"
        }`}
      >
        <span className="app-sidebar-track">
          <SidebarIcon d={item.icon} className="h-5 w-5" />
        </span>
        <span className="app-sidebar-label app-sidebar-fade truncate">
          {item.label}
        </span>
      </button>
    );
  };

  if (!isAdminSide) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
          {children}
        </main>
      </div>
    );
  }

  const profileImage = getProfileImageSrc(user);
  const displayName = getUserDisplayName(user);
  const roleLabel = getRoleLabel(userRole);

  const renderProfileAvatar = () =>
    profileImage ? (
      <img
        src={profileImage}
        alt={displayName}
        className="h-full w-full object-cover"
      />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-blue-700 text-xs font-semibold text-white">
        {getUserInitials(user)}
      </div>
    );

  const sidebarContent = (
    <>
      <div className="sidebar-top app-sidebar-pad flex h-14 shrink-0 items-center gap-1 border-b border-blue-800/50">
        <button
          type="button"
          onClick={() => {
            if (location.pathname !== "/dashboard") {
              navigate("/dashboard");
            }
          }}
          className="sidebar-brand-btn app-sidebar-row min-w-0 flex-1 rounded-lg hover:bg-blue-800/60"
          title="Dashboard"
        >
          <span className="app-sidebar-track">
            <img
              src={AlumniLogo}
              alt=""
              className="h-8 w-8 rounded-lg bg-white/95 p-0.5 object-contain"
            />
          </span>
          <span className="app-sidebar-label app-sidebar-fade truncate text-sm font-semibold text-white">
            LCCB Admin
          </span>
        </button>
        <SidebarPanelToggle
          onClick={toggleCollapsed}
          expanded={!isDesktopCollapsed}
        />
      </div>

      <nav
        ref={sidebarScrollRef}
        className="app-sidebar-pad min-h-0 flex-1 overflow-x-hidden overflow-y-auto py-1"
      >
        <div className="flex flex-col gap-px">
          {visibleTop.map(renderNavButton)}
        </div>
        <div className="my-1 border-t border-blue-800/50" />
        <div className="flex flex-col gap-px">
          {visibleMain.map(renderNavButton)}
        </div>
        {visibleAdmin.length > 0 && (
          <>
            <div className="my-1 border-t border-blue-800/50" />
            <div className="flex flex-col gap-px">
              {visibleAdmin.map(renderNavButton)}
            </div>
          </>
        )}
      </nav>

      <div className="app-sidebar-pad mt-auto shrink-0 border-t border-blue-800/50 py-1">
        <div className="sidebar-footer-panel flex flex-col gap-px py-0.5">
          <div
            className="app-sidebar-row py-0.5"
            title={isDesktopCollapsed ? displayName : undefined}
          >
            <span className="app-sidebar-track">
              <span className="block h-8 w-8 overflow-hidden rounded-full border border-blue-400/40">
                {renderProfileAvatar()}
              </span>
            </span>
            <span className="app-sidebar-label app-sidebar-fade min-w-0">
              <span className="block truncate text-sm font-medium text-white">
                {displayName}
              </span>
              <span className="block truncate text-xs text-blue-200/75">
                {roleLabel}
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={openLogoutConfirm}
            className="app-sidebar-logout-btn app-sidebar-row rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500"
            aria-label="Log out"
            title={isDesktopCollapsed ? "Log out" : undefined}
          >
            <span className="app-sidebar-track">
              <LogoutIcon className="h-5 w-5" />
            </span>
            <span className="app-sidebar-label app-sidebar-fade truncate text-left">
              Log out
            </span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className={`bg-white ${isLargeScreen && isAdminSide ? "h-screen overflow-hidden" : "min-h-screen"}`}
    >
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

      {isLargeScreen ? (
        <div className="app-sidebar-shell h-full">
          <aside
            className="app-sidebar-aside flex h-full flex-col overflow-hidden border-r border-blue-800/50 bg-blue-950 text-white"
            data-collapsed={isDesktopCollapsed ? "true" : "false"}
          >
            {sidebarContent}
          </aside>
          <div className="app-sidebar-main h-full overflow-y-auto overflow-x-hidden bg-white">
            <main className="px-4 py-3 sm:px-5 lg:px-6 lg:py-4">
              {children}
            </main>
          </div>
        </div>
      ) : (
        <>
          <aside
            className={`app-sidebar-aside fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-blue-800/50 bg-blue-950 text-white transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {sidebarContent}
          </aside>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setSidebarOpen(false)}
            className={`fixed inset-0 z-30 bg-slate-950/60 transition-opacity duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${
              sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          />
          <div className="min-h-screen">
            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
                  aria-label="Open navigation"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                    LCCB Alumni
                  </p>
                  <h1 className="text-base font-semibold text-slate-900">
                    Network
                  </h1>
                </div>
              </div>
            </header>
            <main className="min-h-screen px-4 py-3 sm:px-5 lg:px-6 lg:py-4">
              {children}
            </main>
          </div>
        </>
      )}
    </div>
  );
};

export default UserLayout;
