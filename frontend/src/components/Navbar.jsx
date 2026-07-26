import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AlumniLogo from "../assets/alumnilogo2.png";
import { authService } from "../services/authService";
import ConfirmModal from "./ConfirmModal";
import AuthStatusOverlay from "./AuthStatusOverlay";
import BirthdayGreetingComposer from "./BirthdayGreetingComposer";
import BirthdayGreetingReceiptModal from "./BirthdayGreetingReceiptModal";
import { API_BASE_URL, IMAGE_BASE_URL } from "../config/apiBaseUrl";
import { realtimeClient } from "../services/realtimeClient";
import { toast } from "react-toastify";

const getNotificationImageSrc = (notification) => {
  const imagePath = notification?.sender_profile_image;
  if (!imagePath) return "";
  return imagePath.startsWith("http")
    ? imagePath
    : `${IMAGE_BASE_URL}${imagePath}`;
};

const getNotificationInitial = (notification) => {
  const name = String(
    notification?.sender_name || notification?.title || "U",
  ).trim();
  return name.charAt(0).toUpperCase() || "U";
};

const isPendingRegistrationNotification = (notification) => {
  const title = String(notification?.title || "").toLowerCase();
  const message = String(notification?.message || "").toLowerCase();
  const link = String(notification?.link || "").toLowerCase();
  return link === "/pending-approval" ||
    title.includes("registration") ||
    message.includes("needs your approval");
};

const getEffectiveNotificationType = (notification) => {
  const type = String(notification?.type || "GENERAL").toUpperCase();
  if (type === "JOB_APPLICATION") return "JOB_APPLICATION";
  if (isPendingRegistrationNotification(notification)) return "REGISTRATION";
  return type;
};

const BELL_TYPE_LABELS = {
  EVENT: "Events",
  ACHIEVEMENT: "Achievements",
  ANNOUNCEMENT: "Announcements",
  DONATION: "Donations",
  JOB_APPLICATION: "Job Applications",
  REGISTRATION: "Registrations",
  GENERAL: "System",
};

const getBellDateGroup = (value) => {
  if (!value) return "Earlier";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "Today";
  if (date >= startOfYesterday) return "Yesterday";
  return "Earlier";
};

const isUrgentNotification = (notification) => (
  !notification?.is_read &&
  ["REGISTRATION", "JOB_APPLICATION"].includes(getEffectiveNotificationType(notification))
);

const sortNotifications = (notifications) => (
  [...notifications].sort((a, b) => {
    const rankA = isUrgentNotification(a) ? 0 : !a?.is_read ? 1 : 2;
    const rankB = isUrgentNotification(b) ? 0 : !b?.is_read ? 1 : 2;
    if (rankA !== rankB) return rankA - rankB;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  })
);

const groupNotifications = (notifications) => {
  const sections = [];
  const sectionMap = new Map();

  for (const notification of sortNotifications(notifications)) {
    const effectiveType = getEffectiveNotificationType(notification);
    const sectionLabel = isUrgentNotification(notification)
      ? "Urgent"
      : `${getBellDateGroup(notification.created_at)} · ${BELL_TYPE_LABELS[effectiveType] || BELL_TYPE_LABELS.GENERAL}`;

    if (!sectionMap.has(sectionLabel)) {
      const section = { label: sectionLabel, items: [] };
      sectionMap.set(sectionLabel, section);
      sections.push(section);
    }

    sectionMap.get(sectionLabel).items.push(notification);
  }

  return sections;
};

const formatNotificationPreview = (message = "") => String(message || "")
  .replace(/\s+/g, " ")
  .trim();

const MIN_LOGOUT_DISPLAY_MS = 1200;
const LOGOUT_SUCCESS_DISPLAY_MS = 1100;

const BellNotificationIcon = ({ notification, isBirthday }) => {
  const TYPE_COLORS = {
    EVENT: 'from-purple-500 to-indigo-600',
    ACHIEVEMENT: 'from-amber-400 to-orange-500',
    ANNOUNCEMENT: 'from-sky-500 to-cyan-600',
    DONATION: 'from-emerald-500 to-teal-600',
    JOB_APPLICATION: 'from-rose-500 to-red-600',
    REGISTRATION: 'from-red-500 to-rose-600',
    GENERAL: 'from-blue-500 to-blue-700',
  };
  const TYPE_ICONS = {
    EVENT: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    ACHIEVEMENT: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    ANNOUNCEMENT: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
    DONATION: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
    JOB_APPLICATION: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    REGISTRATION: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8',
  };
  const BIRTHDAY_ICON = 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7';

  const type = getEffectiveNotificationType(notification);
  const color = TYPE_COLORS[type] || TYPE_COLORS.GENERAL;
  const iconPath = isBirthday ? BIRTHDAY_ICON : (TYPE_ICONS[type] || TYPE_ICONS.EVENT);

  return (
    <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br ${color} text-white shadow-sm`}>
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d={iconPath} />
      </svg>
    </div>
  );
};

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [bellFilter, setBellFilter] = useState('all');
  const [bellMenuOpen, setBellMenuOpen] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutStatus, setLogoutStatus] = useState("processing");
  const [birthdayGreetingComposer, setBirthdayGreetingComposer] = useState({
    isOpen: false,
    birthdayAlumniId: null,
    birthdayAlumniName: "",
    message: "",
  });
  const [birthdayGreetingPopup, setBirthdayGreetingPopup] = useState({
    isOpen: false,
    senderName: "Someone",
    message: "",
  });
  const [birthdayCelebrationPopup, setBirthdayCelebrationPopup] = useState({
    isOpen: false,
    celebrantName: "Alumni",
  });
  const [graffitiBurst, setGraffitiBurst] = useState([]);
  const [sendingBirthdayGreeting, setSendingBirthdayGreeting] = useState(false);
  const [greetingSendSuccess, setGreetingSendSuccess] = useState(false);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [user, setUser] = useState(authService.getCurrentUser());
  const [notifications, setNotifications] = useState(() => {
    try {
      const raw = sessionStorage.getItem("cachedNotifications");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  });
  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.is_read).length
    : 0;
  const notificationRef = useRef(null);
  const bellMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const syncUserFromStorage = useCallback(() => {
    setUser(authService.getCurrentUser());
  }, []);

  const createGraffitiBurst = useCallback(() => {
    const colors = [
      "#ff4fd8",
      "#ffd84d",
      "#36d7ff",
      "#7c5cff",
      "#ff7a59",
      "#8bff6a",
    ];
    return Array.from({ length: 24 }, (_, index) => {
      const angle = (index / 24) * Math.PI * 2;
      const distance = 70 + (index % 5) * 18;
      const size = 10 + (index % 4) * 6;
      const travelX = `${Math.cos(angle) * (180 + (index % 6) * 22)}px`;
      const travelY = `${Math.sin(angle) * (160 + (index % 5) * 18)}px`;
      return {
        id: `${Date.now()}-${index}`,
        left: `calc(50% + ${Math.cos(angle) * distance}px)`,
        top: `calc(42% + ${Math.sin(angle) * distance}px)`,
        size,
        color: colors[index % colors.length],
        delay: `${index * 28}ms`,
        rotate: `${(index % 8) * 18}deg`,
        travelX,
        travelY,
      };
    });
  }, []);

  const isBirthdayNotification = (notification) => {
    const title = String(notification?.title || "").toLowerCase();
    const message = String(notification?.message || "").toLowerCase();
    const type = String(notification?.type || "").toUpperCase();

    // Exclude personal greeting receipts like "X sent you a birthday greeting"
    if (title.includes("sent you a birthday greeting")) return false;

    // Only treat announcement-style birthday notices (created by the birthday worker)
    // as composer-open triggers. Greeting notifications (type GENERAL) should not
    // open the composer when clicked.
    if (type === "ANNOUNCEMENT") {
      return title.includes("birthday") || message.includes("birthday");
    }

    // Also allow direct "Happy Birthday, Name!" or "Birthday today: Name" titles
    return /^happy birthday,|^birthday today:/i.test(title);
  };

  const getBirthdayAlumniIdFromNotification = (notification) => {
    const link = String(notification?.link || "");
    const match = link.match(/\/alumni\/profile\/(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const getBirthdayAlumniNameFromNotification = (notification) => {
    const title = String(notification?.title || "");
    return title
      .replace(/^happy birthday,\s*/i, "")
      .replace(/^birthday today:\s*/i, "")
      .replace(/\s*sent you a birthday greeting.*$/i, "")
      .replace(/!$/, "")
      .trim();
  };

  const isBirthdayGreetingReceipt = (notification) => {
    const title = String(notification?.title || "").toLowerCase();
    return title.includes("sent you a birthday greeting");
  };

  const getSenderNameFromGreetingTitle = (notification) => {
    const title = String(notification?.title || "");
    const match = title.match(/^(.*?)\s+sent you a birthday greeting/i);
    return match?.[1]?.trim() || "Someone";
  };

  const getCurrentUserBirthdayName = () => {
    const currentUser = authService.getCurrentUser();
    const firstName = String(
      currentUser?.alumni?.firstName || currentUser?.alumni?.first_name || "",
    ).trim();
    const lastName = String(
      currentUser?.alumni?.lastName || currentUser?.alumni?.last_name || "",
    ).trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || String(currentUser?.username || "").trim();
  };

  const isOwnBirthdayNotification = (notification) => {
    const title = String(notification?.title || "");
    const notificationName = title
      .replace(/^happy birthday,\s*/i, "")
      .replace(/^birthday today:\s*/i, "")
      .replace(/!$/, "")
      .trim();

    const currentUserName = getCurrentUserBirthdayName();
    if (!currentUserName || !notificationName) return false;

    return notificationName.toLowerCase() === currentUserName.toLowerCase();
  };

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (user && token) {
      try {
        const response = await fetch(`${API_BASE_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        const list = Array.isArray(data) ? data : [];
        const role = String(
          user?.role || authService.getRole?.() || "",
        ).toUpperCase();
        const visible =
          role === "ADMIN"
            ? list
            : list.filter(
                (n) => String(n.type || "").toUpperCase() !== "DONATION",
              );
        setNotifications(visible);
        try {
          sessionStorage.setItem(
            "cachedNotifications",
            JSON.stringify(visible),
          );
        } catch {}
      } catch (error) {
        console.error("Error fetching notifications:", error);
        // keep cached notifications when network fails
      }
    }
  }, [user, token]);

  useEffect(() => {
    fetchNotifications();
    // Keep polling as backup every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleOpenBirthdayGreeting = (event) => {
      const { id, name } = event.detail || {};
      if (!id) return;
      setGreetingSendSuccess(false);
      setBirthdayGreetingComposer({
        isOpen: true,
        birthdayAlumniId: id,
        birthdayAlumniName: name || "Alumni",
        message: `Happy Birthday, ${name || "Alumni"}! Wishing you a wonderful day.`,
      });
    };

    window.addEventListener(
      "open-birthday-greeting",
      handleOpenBirthdayGreeting,
    );
    return () =>
      window.removeEventListener(
        "open-birthday-greeting",
        handleOpenBirthdayGreeting,
      );
  }, []);

  useEffect(() => {
    if (!birthdayCelebrationPopup.isOpen) {
      setGraffitiBurst([]);
      return;
    }

    const burst = createGraffitiBurst();
    setGraffitiBurst(burst);

    const timeout = setTimeout(() => {
      setGraffitiBurst([]);
    }, 1800);

    return () => clearTimeout(timeout);
  }, [birthdayCelebrationPopup.isOpen, createGraffitiBurst]);

  const handleNotificationClick = async (notification) => {
    try {
      // Mark as read on server
      await fetch(`${API_BASE_URL}/notifications/${notification.id}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Update local state
      const updated = notifications.map((n) =>
        n.id === notification.id ? { ...n, is_read: true } : n,
      );
      setNotifications(updated);
      try {
        sessionStorage.setItem("cachedNotifications", JSON.stringify(updated));
      } catch {}

      // Greeting receipt (someone sent you a greeting)
      if (isBirthdayGreetingReceipt(notification)) {
        const senderName = getSenderNameFromGreetingTitle(notification);
        const message = String(notification?.message || "").trim();

        setBirthdayGreetingPopup({
          isOpen: true,
          senderName,
          message: message || `${senderName} wished you a happy birthday!`,
        });
        setShowNotifications(false);
        return;
      }

      // Own birthday celebration
      if (isOwnBirthdayNotification(notification)) {
        const celebrantName =
          getCurrentUserBirthdayName() ||
          getBirthdayAlumniNameFromNotification(notification) ||
          "Alumni";
        setBirthdayCelebrationPopup({ isOpen: true, celebrantName });
        setShowNotifications(false);
        return;
      }

      // Announcement-type birthday (open composer)
      if (isBirthdayNotification(notification)) {
        let birthdayAlumniId =
          getBirthdayAlumniIdFromNotification(notification);
        let birthdayAlumniName =
          getBirthdayAlumniNameFromNotification(notification) || "Alumni";

        if (!birthdayAlumniId) {
          try {
            const resp = await fetch(`${API_BASE_URL}/alumni`);
            if (resp.ok) {
              const list = await resp.json();
              const found = list.find((a) => {
                const full =
                  `${a.first_name || ""} ${a.last_name || ""}`.trim();
                return (
                  full.toLowerCase() === birthdayAlumniName.toLowerCase() ||
                  full.toLowerCase().includes(birthdayAlumniName.toLowerCase())
                );
              });
              if (found) {
                birthdayAlumniId = found.id;
                birthdayAlumniName =
                  `${found.first_name} ${found.last_name}`.trim();
              }
            }
          } catch (err) {
            console.error(
              "Error resolving alumni by name for greeting composer:",
              err,
            );
          }
        }

        if (!birthdayAlumniId) {
          toast.error(
            "Unable to open greeting composer for this birthday notification.",
          );
          setShowNotifications(false);
          return;
        }

        setBirthdayGreetingComposer({
          isOpen: true,
          birthdayAlumniId,
          birthdayAlumniName,
          message: `Happy Birthday, ${birthdayAlumniName}! Wishing you a wonderful day.`,
        });
        setShowNotifications(false);
        return;
      }

      if (!notification.link && getEffectiveNotificationType(notification) === "JOB_APPLICATION") {
        setShowNotifications(false);
        navigate("/employment");
        return;
      }

      if (!notification.link && getEffectiveNotificationType(notification) === "REGISTRATION") {
        setShowNotifications(false);
        navigate("/pending-approval");
        return;
      }

      // Default: navigate to link if present
      if (notification.link) {
        setShowNotifications(false);
        navigate(notification.link);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  // Update user state when location changes (e.g., after profile update)
  useEffect(() => {
    syncUserFromStorage();
  }, [location]);

  useEffect(() => {
    const handleProfileUpdated = () => {
      syncUserFromStorage();
      fetchNotifications();
    };

    const handleNotificationCreated = (payload) => {
      const type = String(
        payload?.type || payload?.notification?.type || "",
      ).toUpperCase();
      const role = String(
        authService.getRole?.() || user?.role || "",
      ).toUpperCase();
      if (type === "DONATION" && role !== "ADMIN") return;
      fetchNotifications();
    };

    const handleStorageChange = (event) => {
      if (event.key === "user" || event.key === "token") {
        syncUserFromStorage();
        fetchNotifications();
      }
    };

    window.addEventListener("auth-user-updated", handleProfileUpdated);
    window.addEventListener("storage", handleStorageChange);
    const unsubscribeNotification = realtimeClient.subscribe(
      "notification.created",
      handleNotificationCreated,
    );

    return () => {
      window.removeEventListener("auth-user-updated", handleProfileUpdated);
      window.removeEventListener("storage", handleStorageChange);
      unsubscribeNotification();
    };
  }, [fetchNotifications, syncUserFromStorage, user?.role]);

  // Close notification dropdown and bell menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false);
        setBellMenuOpen(false);
      }
      if (
        bellMenuRef.current &&
        !bellMenuRef.current.contains(event.target)
      ) {
        setBellMenuOpen(false);
      }
    };

    if (showNotifications) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotifications]);

  // Close user menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showUserMenu]);

  const handleLogout = async () => {
    setLogoutStatus("processing");
    setIsLoggingOut(true);
    const startedAt = Date.now();

    await authService.logout({ clearLocalSession: false });
    const remainingTime = MIN_LOGOUT_DISPLAY_MS - (Date.now() - startedAt);
    if (remainingTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, remainingTime));
    }

    setLogoutStatus("success");
    await new Promise((resolve) => setTimeout(resolve, LOGOUT_SUCCESS_DISPLAY_MS));
    authService.clearLocalSession();
    navigate("/login", { replace: true });
  };

  const birthdayHeading = "Happy Birthday,";
  const birthdayHeadingLetters = birthdayHeading.split("");

  const handleSendBirthdayGreeting = async (event) => {
    event.preventDefault();

    if (!birthdayGreetingComposer.birthdayAlumniId) {
      toast.error("Unable to determine recipient for the greeting.");
      return;
    }

    const messageToSend =
      birthdayGreetingComposer.message &&
      birthdayGreetingComposer.message.trim()
        ? birthdayGreetingComposer.message.trim()
        : `Happy Birthday, ${birthdayGreetingComposer.birthdayAlumniName}! Wishing you a wonderful day.`;

    try {
      setSendingBirthdayGreeting(true);
      const response = await fetch(
        `${API_BASE_URL}/notifications/birthday-greetings`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            birthdayAlumniId: birthdayGreetingComposer.birthdayAlumniId,
            greetingText: messageToSend,
          }),
        },
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const serverMsg = data?.error || data?.message || null;
        const text = serverMsg || `Server returned ${response.status}`;
        console.error("Birthday greeting failed:", response.status, data);
        throw new Error(text);
      }

      setGreetingSendSuccess(true);
      toast.success(
        `Greeting sent to ${birthdayGreetingComposer.birthdayAlumniName}!`,
      );
      fetchNotifications();
      window.setTimeout(() => {
        setGreetingSendSuccess(false);
        setBirthdayGreetingComposer({
          isOpen: false,
          birthdayAlumniId: null,
          birthdayAlumniName: "",
          message: "",
        });
      }, 1800);
    } catch (error) {
      toast.error(error.message || "Failed to send birthday greeting");
    } finally {
      setSendingBirthdayGreeting(false);
    }
  };

  const openLogoutConfirm = () => {
    setShowUserMenu(false);
    setIsMobileMenuOpen(false);
    setConfirmLogoutOpen(true);
  };

  const navItems = [
    {
      path: "/home",
      label: "Home",
      icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    },
    {
      path: "/alumni",
      label: "Alumni",
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

  return (
    <nav className="bg-blue-700 text-white shadow-xl sticky top-0 z-50 backdrop-blur-sm bg-opacity-95">
      {birthdayCelebrationPopup.isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[122] overflow-hidden bg-slate-950/90 backdrop-blur-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.16),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(251,191,36,0.12),_transparent_40%)]"></div>

            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 18 }).map((_, index) => {
                const left = (index * 13) % 100;
                const size = 5 + (index % 3) * 3;
                const delay = (index % 6) * 220;
                const duration = 10000 + (index % 5) * 900;
                const colors = [
                  "bg-pink-400",
                  "bg-amber-300",
                  "bg-sky-400",
                  "bg-violet-400",
                ];

                return (
                  <span
                    key={index}
                    className={`absolute rounded-full ${colors[index % colors.length]} shadow-lg`}
                    style={{
                      left: `${left}%`,
                      top: `${-8 - (index % 5) * 7}%`,
                      width: `${size}px`,
                      height: `${size}px`,
                      opacity: 0.82,
                      animation: `confetti-fall ${duration}ms linear infinite`,
                      animationDelay: `${delay}ms`,
                    }}
                  />
                );
              })}
            </div>

            <div className="absolute inset-0 flex items-center justify-center px-4 py-8 sm:px-6">
              <div className="relative w-full max-w-3xl overflow-visible bg-transparent">
                <button
                  type="button"
                  onClick={() =>
                    setBirthdayCelebrationPopup({
                      isOpen: false,
                      celebrantName: "Alumni",
                    })
                  }
                  className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white"
                  aria-label="Close celebration"
                >
                  <span className="text-xl leading-none">×</span>
                </button>

                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.10),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(56,189,248,0.10),_transparent_40%)] opacity-70"></div>

                <div className="pointer-events-none absolute inset-0 overflow-visible">
                  {graffitiBurst.map((particle) => (
                    <span
                      key={particle.id}
                      className="absolute graffiti-burst"
                      style={{
                        left: particle.left,
                        top: particle.top,
                        width: `${particle.size}px`,
                        height: `${particle.size}px`,
                        background: particle.color,
                        boxShadow: `0 0 18px ${particle.color}, 0 0 36px ${particle.color}`,
                        animationDelay: particle.delay,
                        "--graffiti-rotate": particle.rotate,
                        "--graffiti-color": particle.color,
                        "--graffiti-x": particle.travelX,
                        "--graffiti-y": particle.travelY,
                      }}
                    />
                  ))}
                </div>

                <div className="relative px-6 py-10 text-center sm:px-10 lg:px-16 lg:py-14">
                  <div className="mx-auto max-w-2xl space-y-6">
                    <p className="text-xs font-bold uppercase tracking-[0.44em] text-white/70">
                      Celebration time
                    </p>

                    <div className="space-y-3">
                      <h3
                        className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
                        aria-label="Happy Birthday,"
                      >
                        {birthdayHeadingLetters.map((letter, index) =>
                          letter === " " ? (
                            <span
                              key={`space-${index}`}
                              className="inline-block w-[0.35em]"
                            >
                              &nbsp;
                            </span>
                          ) : (
                            <span
                              key={`${letter}-${index}`}
                              className="letter-reveal"
                              style={{ animationDelay: `${index * 0.08}s` }}
                            >
                              {letter}
                            </span>
                          ),
                        )}
                      </h3>
                      <h4 className="bg-gradient-to-r from-amber-200 via-yellow-200 to-pink-200 bg-clip-text text-4xl font-black leading-tight text-transparent sm:text-5xl lg:text-6xl drop-shadow-[0_8px_30px_rgba(251,191,36,0.28)]">
                        {birthdayCelebrationPopup.celebrantName}!
                      </h4>
                    </div>

                    <div className="mx-auto h-px w-40 bg-gradient-to-r from-transparent via-white/65 to-transparent"></div>

                    <p className="mx-auto max-w-xl text-base leading-8 text-white/95 sm:text-lg">
                      Wishing you a bright day filled with joy, good company,
                      and a little sparkle.
                    </p>

                    <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-[11px] uppercase tracking-[0.32em] text-white/80">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300 animate-pulse"></span>
                      <span>Celebrate</span>
                      <span
                        className="inline-block h-1.5 w-1.5 rounded-full bg-sky-300 animate-pulse"
                        style={{ animationDelay: "220ms" }}
                      ></span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}

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

      {isLoggingOut && (
        <AuthStatusOverlay
          status={logoutStatus}
          processingTitle="Signing out..."
          processingMessage="Please wait while we secure your session."
          successTitle="Logout successful!"
          successMessage="Redirecting to login..."
        />
      )}

      <BirthdayGreetingComposer
        isOpen={birthdayGreetingComposer.isOpen}
        onClose={() => {
          setGreetingSendSuccess(false);
          setBirthdayGreetingComposer({
            isOpen: false,
            birthdayAlumniId: null,
            birthdayAlumniName: "",
            message: "",
          });
        }}
        recipientId={birthdayGreetingComposer.birthdayAlumniId}
        recipientName={birthdayGreetingComposer.birthdayAlumniName}
        message={birthdayGreetingComposer.message}
        onMessageChange={(value) =>
          setBirthdayGreetingComposer((prev) => ({ ...prev, message: value }))
        }
        authToken={token}
        onSubmit={handleSendBirthdayGreeting}
        sending={sendingBirthdayGreeting}
        sendSuccess={greetingSendSuccess}
      />

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <BirthdayGreetingReceiptModal
          isOpen={birthdayGreetingPopup.isOpen}
          senderName={birthdayGreetingPopup.senderName}
          message={birthdayGreetingPopup.message}
          recipientName={getCurrentUserBirthdayName()}
          onClose={() =>
            setBirthdayGreetingPopup({
              isOpen: false,
              senderName: "Someone",
              message: "",
            })
          }
        />

        <div className="flex justify-between items-center h-20">
          {/* Logo/Brand Section */}
          <Link
            to="/home"
            className="flex items-center space-x-3 group flex-shrink-0"
          >
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full blur opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative inline-flex items-center justify-center rounded-full overflow-hidden shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:scale-105">
                <img
                  src={AlumniLogo}
                  alt="LCC Alumni Association Inc. Logo"
                  className="h-11 w-11 object-cover block rounded-full scale-[1.05] transform"
                />
              </div>
            </div>
            <div className="whitespace-nowrap flex flex-col justify-center">
              <h1 className="text-lg font-black tracking-wider leading-none text-white uppercase">
                LCCB Alumni
              </h1>
              <p className="text-[9px] font-bold tracking-[0.22em] text-blue-200 uppercase mt-1">
                Connecting Excellence
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center justify-center flex-1 space-x-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative group px-3 py-2.5 rounded-none text-sm font-medium transition-all duration-300 flex items-center gap-1.5 ${
                    isActive
                      ? "bg-white bg-opacity-20 text-white shadow-md"
                      : "text-blue-50 hover:text-white hover:bg-white hover:bg-opacity-15"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={item.icon}
                    />
                  </svg>
                  <span className="font-semibold text-sm">{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side: Bell + Profile */}
          {token ? (
            <div className="hidden md:flex items-center gap-2 ml-auto flex-shrink-0">
              {/* Notification Bell */}
                <div
                  className="relative flex-shrink-0"
                  ref={notificationRef}
                >
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2.5 text-white hover:bg-white hover:bg-opacity-20 rounded-none transition-all duration-300 transform hover:scale-110"
                  >
                    <svg
                      className={`w-6 h-6 ${unreadCount > 0 ? "animate-pulse" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                      />
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-xs font-bold leading-none text-white shadow-lg">
                        <span className={unreadCount > 9 ? "leading-none" : "relative -left-px leading-none"}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      </span>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="dropdown-menu-panel absolute right-0 mt-3 bg-white rounded-2xl shadow-[0_2px_20px_rgba(0,0,0,0.15)] z-50 flex flex-col border border-gray-100/80 overflow-hidden" style={{ width: 380, maxHeight: '85vh' }}>
                      {/* Sticky header */}
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <h3 className="text-[17px] font-bold text-gray-900">
                            Notifications
                          </h3>
                          {unreadCount > 0 && (
                            <span className="shrink-0 text-[11px] text-gray-500">
                              {unreadCount} unread
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {/* Three-dot menu */}
                          {notifications.length > 0 && (
                            <div className="relative" ref={bellMenuRef}>
                              <button
                                onClick={() => setBellMenuOpen(!bellMenuOpen)}
                                className="p-1.5 rounded-full hover:bg-gray-100 transition-colors text-gray-700 hover:text-gray-900"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01" />
                                </svg>
                              </button>
                              {bellMenuOpen && (
                                <div className="absolute right-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                                  {unreadCount > 0 && (
                                    <button
                                      onClick={async () => {
                                        setBellMenuOpen(false);
                                        try {
                                          await fetch(`${API_BASE_URL}/notifications/read-all`, {
                                            method: "PUT",
                                            headers: {
                                              Authorization: `Bearer ${token}`,
                                              "Content-Type": "application/json",
                                            },
                                          });
                                          setNotifications(
                                            notifications.map((n) => ({ ...n, is_read: true }))
                                          );
                                        } catch (error) {
                                          console.error("Error marking all as read:", error);
                                        }
                                      }}
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                    >
                                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                      </svg>
                                      Mark all read
                                    </button>
                                  )}
                                  <button
                                    onClick={async () => {
                                      setBellMenuOpen(false);
                                      try {
                                        await fetch(`${API_BASE_URL}/notifications`, {
                                          method: "DELETE",
                                          headers: {
                                            Authorization: `Bearer ${token}`,
                                            "Content-Type": "application/json",
                                          },
                                        });
                                        setNotifications([]);
                                      } catch (error) {
                                        console.error("Error clearing notifications:", error);
                                      }
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Clear all
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* All / Unread filter tabs */}
                      <div className="flex border-b border-gray-100 flex-shrink-0">
                        {[
                          { key: 'all', label: 'All' },
                          { key: 'unread', label: 'Unread' },
                        ].map((tab) => (
                          <button
                            key={tab.key}
                            onClick={() => setBellFilter(tab.key)}
                            className={`flex-1 py-2.5 text-[13px] font-semibold transition-colors relative ${
                              bellFilter === tab.key
                                ? 'text-blue-600'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                          >
                            {tab.label}
                            {tab.key === 'unread' && unreadCount > 0 && (
                              <span className="ml-1 text-[11px]">({unreadCount})</span>
                            )}
                            {bellFilter === tab.key && (
                              <div className="absolute bottom-0 left-4 right-4 h-[3px] bg-blue-600 rounded-full" />
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Scrollable notification list */}
                      <div className="overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#d1d5db transparent' }}>
                        {(() => {
                          const filtered = sortNotifications(bellFilter === 'unread'
                            ? notifications.filter((n) => !n.is_read)
                            : notifications
                          ).slice(0, 6);
                          return filtered.length > 0 ? (
                          groupNotifications(filtered).map((section) => (
                            <div key={section.label}>
                              <div className="px-5 py-2 flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{section.label}</span>
                                </div>
                              {section.items.map((notif) => (
                                <div
                                  key={notif.id}
                                  className={`px-4 py-3 cursor-pointer border-b border-gray-50 transition-all duration-200 group ${
                                    isUrgentNotification(notif)
                                      ? "bg-red-50/80 hover:bg-red-100/80"
                                      : !notif.is_read
                                      ? "bg-blue-50/60 hover:bg-blue-100/70"
                                      : "hover:bg-gray-50"
                                  }`}
                                  onClick={() => handleNotificationClick(notif)}
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="relative mt-0.5 flex-shrink-0">
                                      {getNotificationImageSrc(notif) ? (
                                        <img
                                          src={getNotificationImageSrc(notif)}
                                          alt={notif.sender_name || "Sender"}
                                          className="h-10 w-10 rounded-full border border-gray-200 object-cover shadow-sm"
                                        />
                                      ) : (
                                        <BellNotificationIcon notification={notif} isBirthday={(notif.type || "").toLowerCase().includes("birthday") || String(notif?.title || "").toLowerCase().includes("birthday")} />
                                      )}
                                      <span
                                        className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${!notif.is_read ? (isUrgentNotification(notif) ? "bg-red-600" : "bg-blue-500") : "bg-gray-300"}`}
                                      />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                      <p
                                        className={`text-[13px] leading-snug ${!notif.is_read ? "font-bold text-gray-900" : "font-semibold text-gray-700"} group-hover:text-blue-900 transition-colors line-clamp-1`}
                                      >
                                        {notif.title}
                                      </p>
                                      <p className="text-[12px] text-gray-500 mt-0.5 line-clamp-2 leading-snug">
                                        {formatNotificationPreview(notif.message) || "No details available."}
                                      </p>
                                      <p className="text-[11px] text-gray-400 mt-1 font-medium">
                                        {new Date(
                                          notif.created_at,
                                        ).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ))
                        ) : (
                          <div className="px-5 py-16 text-center">
                            <div className="mx-auto w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                              <svg
                                className="w-7 h-7 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                                />
                              </svg>
                            </div>
                            <p className="text-sm text-gray-500 font-semibold">
                              {bellFilter === 'unread' ? 'No unread notifications' : 'All caught up!'}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {bellFilter === 'unread' ? 'You\'ve read all your notifications' : 'We\'ll notify you when something arrives'}
                            </p>
                          </div>
                        )}
                        )()}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Profile Dropdown */}
                <div
                  className="relative flex-shrink-0"
                  ref={userMenuRef}
                >
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="app-navbar-menu-button whitespace-nowrap"
                  >
                    {user?.profile_image ? (
                      <img
                        src={`${IMAGE_BASE_URL}${user.profile_image}`}
                        alt={user?.username || "User"}
                        className="h-7 w-7 rounded-none object-cover border border-white shadow-sm"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-none bg-blue-700 text-xs font-bold text-white shadow-sm">
                        {user?.username?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}
                    <span className="hidden lg:inline text-xs text-white">
                      {user?.username || "User"}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform duration-300 ${showUserMenu ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {showUserMenu && (
                    <div className="dropdown-menu-panel app-navbar-dropdown absolute right-0 mt-3 w-56 z-50">
                      <div className="app-navbar-dropdown-header border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="app-navbar-dropdown-icon overflow-hidden bg-white">
                            {user?.profile_image ? (
                              <img
                                src={`${IMAGE_BASE_URL}${user.profile_image}`}
                                alt={user?.username || "User"}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="text-[10px] font-bold text-blue-700">
                                {user?.username?.charAt(0).toUpperCase() || "U"}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-gray-900">
                              {user?.username}
                            </p>
                            <span className="mt-1 inline-flex rounded-none bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-700">
                              {user?.role?.toLowerCase() || "User"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Link
                        to="/settings"
                        replace={
                          location.pathname === "/settings" ||
                          location.pathname.startsWith("/settings/")
                        }
                        onClick={(event) => {
                          setShowUserMenu(false);
                          if (
                            location.pathname === "/settings" ||
                            location.pathname.startsWith("/settings/")
                          ) {
                            event.preventDefault();
                          }
                        }}
                        className="dropdown-menu-item app-navbar-dropdown-item group hover:bg-blue-50"
                      >
                        <span className="app-navbar-dropdown-icon group-hover:bg-blue-100">
                          <svg
                            className="h-4 w-4 text-inherit transition-colors group-hover:text-blue-700"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </span>
                        <span className="font-medium group-hover:text-blue-600">
                          Settings
                        </span>
                      </Link>
                      {["teacher", "admin"].includes(authService.getRole()) && (
                        <>
                          <Link
                            to="/pending-approval"
                            onClick={() => setShowUserMenu(false)}
                            className="dropdown-menu-item app-navbar-dropdown-item group hover:bg-blue-50"
                          >
                            <span className="app-navbar-dropdown-icon group-hover:bg-blue-100">
                              <svg
                                className="h-4 w-4 text-inherit transition-colors group-hover:text-blue-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                              </svg>
                            </span>
                            <span className="font-medium group-hover:text-blue-600">
                              Pending Requests
                            </span>
                          </Link>
                          <Link
                            to="/manage-users"
                            onClick={() => setShowUserMenu(false)}
                            className="dropdown-menu-item app-navbar-dropdown-item group hover:bg-blue-50"
                          >
                            <span className="app-navbar-dropdown-icon group-hover:bg-blue-100">
                              <svg
                                className="h-4 w-4 text-inherit transition-colors group-hover:text-blue-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                />
                              </svg>
                            </span>
                            <span className="font-medium group-hover:text-blue-600">
                              Manage Users
                            </span>
                          </Link>
                        </>
                      )}
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={openLogoutConfirm}
                        className="dropdown-menu-item app-navbar-dropdown-item w-full text-left group hover:bg-red-50"
                      >
                        <span className="app-navbar-dropdown-icon bg-red-50 text-red-600 ring-red-100 group-hover:bg-red-100 group-hover:text-red-700">
                          <svg
                            className="h-4 w-4 transition-colors"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                        </span>
                        <span className="font-semibold group-hover:text-red-700">
                          Logout
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-3 flex flex-shrink-0 items-center gap-2 whitespace-nowrap rounded-none bg-white px-5 py-2.5 text-sm font-bold text-blue-600 shadow-lg transition-all duration-300 hover:bg-blue-50 hover:shadow-xl hover:scale-105"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                  />
                </svg>
                <span>Login</span>
              </Link>
            )}

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            {token && (
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-none transition-all"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-xs font-bold leading-none text-white">
                    <span className={unreadCount > 9 ? "leading-none" : "relative -left-px leading-none"}>
                      {unreadCount}
                    </span>
                  </span>
                )}
              </button>
            )}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center rounded-none p-2.5 text-white hover:bg-white hover:bg-opacity-20 hover:text-blue-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-all"
            >
              <span className="sr-only">Open main menu</span>
              {!isMobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`md:hidden ${isMobileMenuOpen ? "block" : "hidden"}`}>
          <div className="px-3 pt-3 pb-4 space-y-2 bg-blue-700 bg-opacity-95 backdrop-blur-sm rounded-b-xl shadow-xl border-t border-white border-opacity-20">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`block px-4 py-3 rounded-none text-base font-semibold transition-all duration-200 flex items-center gap-3 ${
                    isActive
                      ? "bg-white bg-opacity-25 text-white shadow-md"
                      : "text-blue-50 hover:text-white hover:bg-white hover:bg-opacity-15"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d={item.icon}
                    />
                  </svg>
                  {item.label}
                </Link>
              );
            })}

            {token ? (
              <>
                <div className="border-t border-white border-opacity-20 my-2 pt-2">
                  <Link
                    to="/settings"
                    replace={
                      location.pathname === "/settings" ||
                      location.pathname.startsWith("/settings/")
                    }
                    className="text-white hover:bg-white hover:bg-opacity-15 block px-4 py-3 rounded-none text-base font-semibold transition-all flex items-center gap-3"
                    onClick={(event) => {
                      setIsMobileMenuOpen(false);
                      if (
                        location.pathname === "/settings" ||
                        location.pathname.startsWith("/settings/")
                      ) {
                        event.preventDefault();
                      }
                    }}
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    Settings
                  </Link>
                  <button
                    onClick={openLogoutConfirm}
                    className="w-full text-left text-red-300 hover:text-white hover:bg-red-500 hover:bg-opacity-30 px-4 py-3 rounded-none text-base font-semibold transition-all flex items-center gap-3"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="border-t border-white border-opacity-20 my-2 pt-2">
                <Link
                  to="/login"
                  className="text-white bg-white bg-opacity-20 hover:bg-opacity-30 block px-4 py-3 rounded-none text-base font-bold transition-all flex items-center gap-3 shadow-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                  </svg>
                  Login / Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
