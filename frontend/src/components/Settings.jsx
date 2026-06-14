import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import UserLayout from "./UserLayout";
import { authService } from "../services/authService";
import { API_BASE_URL } from "../config/apiBaseUrl";
import {
  areNotificationsEnabled,
  setNotificationEnabled,
} from "../utils/notificationPreferences";

const SETTINGS_TABS = [
  {
    id: "account",
    label: "Account Settings",
    description: "View your account details and profile shortcuts.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
        />
      </svg>
    ),
  },
  {
    id: "security",
    label: "Security",
    description: "Update your password and protect your account.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
        />
      </svg>
    ),
  },

  {
    id: "notifications",
    label: "Notifications",
    description: "Manage alerts for events, updates, and announcements.",
    icon: (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="1.75"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
        />
      </svg>
    ),
  },
];

const getRoleLabel = (role) => {
  const normalized = (role || "").toUpperCase();
  if (normalized === "TEACHER") return "Faculty";
  if (normalized === "ADMIN") return "Administrator";
  return "Alumni";
};

const ToggleSwitch = ({ id, enabled, onChange, label, description }) => (
  <div className="flex items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4 transition-colors duration-200 hover:border-slate-300">
    <div className="min-w-0 flex-1">
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-900"
      >
        {label}
      </label>
      {description && (
        <p className="mt-1 text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      )}
    </div>
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      onClick={() => onChange(!enabled)}
      className={`settings-toggle ${enabled ? "is-on" : ""}`}
    >
      <span className="settings-toggle__thumb" />
    </button>
  </div>
);

const SaveButton = ({ onClick, disabled, saveStatus }) => {
  const isLoading = saveStatus === "loading";
  const isSuccess = saveStatus === "success";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      className="inline-flex min-w-[9.5rem] items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-700/20 transition-all duration-200 hover:bg-blue-800 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoading ? (
        <>
          <svg
            className="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          Saving...
        </>
      ) : isSuccess ? (
        <>
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          Saved
        </>
      ) : (
        "Save Changes"
      )}
    </button>
  );
};

const Settings = () => {
  const user = authService.getCurrentUser();
  const userId = user?.id;
  const token = localStorage.getItem("token");
  const [activeTab, setActiveTab] = useState("account");
  const [saveStatus, setSaveStatus] = useState("idle");
  const [loadingPreferences, setLoadingPreferences] = useState(true);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const activeTabMeta = useMemo(
    () => SETTINGS_TABS.find((tab) => tab.id === activeTab) || SETTINGS_TABS[0],
    [activeTab],
  );

  useEffect(() => {
    if (!userId) {
      setLoadingPreferences(false);
      return undefined;
    }

    let cancelled = false;

    const loadPreferences = async () => {
      if (!cancelled) {
        setNotificationsEnabled(areNotificationsEnabled(userId));
      }

      if (!cancelled) {
        setLoadingPreferences(false);
      }
    };

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, [token, user?.alumni?.id, user?.alumniId, userId]);

  const handleNotificationsToggle = (nextValue) => {
    setNotificationsEnabled(nextValue);
    if (userId) {
      setNotificationEnabled(userId, nextValue);
    }
  };

  useEffect(() => {
    if (saveStatus !== "success") return undefined;
    const timer = window.setTimeout(() => setSaveStatus("idle"), 2500);
    return () => window.clearTimeout(timer);
  }, [saveStatus]);

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const readResponseBody = async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return await response.json();
      } catch {
        return null;
      }
    }
    try {
      const text = await response.text();
      return text ? { message: text } : null;
    } catch {
      return null;
    }
  };

  const saveNotifications = async () => {
    const response = await fetch(
      `${API_BASE_URL}/auth/notification-preference`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          notificationEnabled: notificationsEnabled,
          promptShown: true,
        }),
      },
    );

    if (!response.ok) {
      const data = await readResponseBody(response);
      throw new Error(
        data?.error ||
          data?.message ||
          "Failed to update notification preferences",
      );
    }

    setNotificationEnabled(user.id, notificationsEnabled);
    localStorage.setItem(`notification_prompt_shown_${user.id}`, "true");
  };

  const saveSecurity = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      throw new Error("New passwords do not match");
    }
    if (passwordForm.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }

    const response = await fetch(
      `${API_BASE_URL}/auth/change-password/${user.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
          email: user.email,
        }),
      },
    );

    const data = await readResponseBody(response);
    if (!response.ok) {
      throw new Error(
        data?.error || data?.message || "Failed to change password",
      );
    }

    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  const handleSave = async () => {
    if (activeTab === "account") return;

    setSaveStatus("loading");

    try {
      if (activeTab === "notifications") {
        await saveNotifications();
        toast.success("Notification preferences saved");
      } else if (activeTab === "security") {
        await saveSecurity();
        toast.success("Password updated successfully");
      }

      setSaveStatus("success");
    } catch (error) {
      setSaveStatus("idle");
      toast.error(error.message || "Unable to save changes right now");
    }
  };

  const renderAccountPanel = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Account Settings</h2>
        <p className="mt-1 text-sm text-slate-500">
          Review your account identity and jump to your full alumni profile when
          you need to edit details.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Username
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {user?.username || "Not set"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Email
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900 break-all">
            {user?.email || "Not set"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Role
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {getRoleLabel(user?.role)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Account Status
          </p>
          <p className="mt-2 text-sm font-semibold text-emerald-700">
            {user?.is_blocked
              ? "Blocked"
              : user?.approval_status === "PENDING"
                ? "Pending Approval"
                : "Active"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-4">
        <p className="text-sm font-semibold text-slate-900">
          Need to update your profile details?
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Personal information, education history, and social links are managed
          on your profile page.
        </p>
        <Link
          to="/profile"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-semibold text-blue-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
        >
          Open My Profile
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
            />
          </svg>
        </Link>
      </div>
    </div>
  );

  const renderSecurityPanel = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Security</h2>
        <p className="mt-1 text-sm text-slate-500">
          Keep your alumni account secure by updating your password regularly.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium text-slate-700"
          >
            Current Password
          </label>
          <input
            id="currentPassword"
            type="password"
            name="currentPassword"
            value={passwordForm.currentPassword}
            onChange={handlePasswordChange}
            className="app-input"
            placeholder="Enter current password"
            autoComplete="current-password"
          />
        </div>
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium text-slate-700"
          >
            New Password
          </label>
          <input
            id="newPassword"
            type="password"
            name="newPassword"
            value={passwordForm.newPassword}
            onChange={handlePasswordChange}
            className="app-input"
            placeholder="Enter new password"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700"
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            value={passwordForm.confirmPassword}
            onChange={handlePasswordChange}
            className="app-input"
            placeholder="Confirm new password"
            autoComplete="new-password"
          />
        </div>
      </div>
    </div>
  );

  const renderNotificationsPanel = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Notification Preferences
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Control how you stay informed about activity across the alumni
          network.
        </p>
      </div>

      <ToggleSwitch
        id="system-alerts-toggle"
        enabled={notificationsEnabled}
        onChange={handleNotificationsToggle}
        label="System alerts"
        description="Receive real-time system alerts regarding new alumni events, directory updates, network announcements, and live donation toasts in the bottom-left corner when someone contributes."
      />
    </div>
  );

  const renderActivePanel = () => {
    if (
      loadingPreferences &&
      activeTab !== "account" &&
      activeTab !== "security" &&
      activeTab !== "notifications"
    ) {
      return (
        <div className="flex min-h-[16rem] items-center justify-center text-sm text-slate-500">
          Loading your preferences...
        </div>
      );
    }

    switch (activeTab) {
      case "security":
        return renderSecurityPanel();
      case "notifications":
        return renderNotificationsPanel();
      default:
        return renderAccountPanel();
    }
  };

  if (!user) {
    return (
      <UserLayout>
        <div className="flex min-h-[50vh] items-center justify-center text-slate-600">
          Loading settings...
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Settings
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
              Account Settings
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
              Manage your account, security, and notification preferences from
              one organized workspace.
            </p>
          </header>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <nav
              className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm lg:w-72 lg:shrink-0"
              aria-label="Settings sections"
            >
              <ul className="space-y-1">
                {SETTINGS_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <li key={tab.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab(tab.id);
                          setSaveStatus("idle");
                        }}
                        className={`settings-nav-btn ${isActive ? "is-active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span
                          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isActive ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}
                        >
                          {tab.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">
                            {tab.label}
                          </span>
                          <span className="mt-0.5 hidden truncate text-xs text-slate-500 lg:block">
                            {tab.description}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <section className="min-w-0 flex-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 border-b border-slate-100 pb-5 lg:hidden">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                  Current Section
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                  {activeTabMeta.label}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {activeTabMeta.description}
                </p>
              </div>

              {renderActivePanel()}

              {activeTab !== "account" && (
                <div className="mt-8 flex items-center justify-end border-t border-slate-100 pt-6">
                  <SaveButton onClick={handleSave} saveStatus={saveStatus} />
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </UserLayout>
  );
};

export default Settings;
