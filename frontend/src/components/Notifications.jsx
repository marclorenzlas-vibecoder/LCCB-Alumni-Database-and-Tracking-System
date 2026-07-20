import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import UserLayout from './UserLayout';
import BirthdayGreetingComposer from './BirthdayGreetingComposer';
import { API_BASE_URL } from '../config/apiBaseUrl';

const getRelativeTime = (value) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 10) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

const TYPE_CONFIG = {
  EVENT:        { color: 'from-purple-500 to-indigo-600', label: 'Event',       icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  ACHIEVEMENT:  { color: 'from-amber-400 to-orange-500',  label: 'Achievement', icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z' },
  ANNOUNCEMENT: { color: 'from-sky-500 to-cyan-600',      label: 'Notice',     icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
  DONATION:     { color: 'from-emerald-500 to-teal-600',  label: 'Donation',   icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
  JOB_APPLICATION: { color: 'from-rose-500 to-red-600',   label: 'Job Application', icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  REGISTRATION: { color: 'from-red-500 to-rose-600',      label: 'Registration', icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8' },
  GENERAL:      { color: 'from-blue-500 to-blue-700',      label: 'System',    icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
};

const isPendingRegistrationNotification = (notification) => {
  const title = String(notification?.title || '').toLowerCase();
  const message = String(notification?.message || '').toLowerCase();
  const link = String(notification?.link || '').toLowerCase();
  return link === '/pending-approval' ||
    title.includes('registration') ||
    message.includes('needs your approval');
};

const getEffectiveType = (notification) => {
  const type = String(notification?.type || 'GENERAL').toUpperCase();
  if (type === 'JOB_APPLICATION') return 'JOB_APPLICATION';
  if (isPendingRegistrationNotification(notification)) return 'REGISTRATION';
  return type;
};

const getConfig = (notification) => TYPE_CONFIG[getEffectiveType(notification)] || TYPE_CONFIG.GENERAL;

const getDateGroup = (value) => {
  if (!value) return 'Older';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Older';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  return 'Earlier';
};

const isUrgentNotification = (notification) => (
  !notification?.is_read &&
  ['REGISTRATION', 'JOB_APPLICATION'].includes(getEffectiveType(notification))
);

const getNotificationRank = (notification) => {
  if (isUrgentNotification(notification)) return 0;
  if (!notification?.is_read) return 1;
  return 2;
};

const sortNotifications = (notifications) => (
  [...notifications].sort((a, b) => {
    const rankDiff = getNotificationRank(a) - getNotificationRank(b);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  })
);

const groupNotifications = (notifications) => {
  const sections = [];
  const sectionMap = new Map();

  for (const notification of sortNotifications(notifications)) {
    const cfg = getConfig(notification);
    const sectionLabel = isUrgentNotification(notification)
      ? 'Urgent'
      : `${getDateGroup(notification.created_at)} · ${cfg.label}`;

    if (!sectionMap.has(sectionLabel)) {
      const section = { label: sectionLabel, items: [] };
      sectionMap.set(sectionLabel, section);
      sections.push(section);
    }

    sectionMap.get(sectionLabel).items.push(notification);
  }

  return sections;
};

const formatNotificationPreview = (message = '') => String(message || '')
  .replace(/\s+/g, ' ')
  .trim();

const Notifications = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [pageFilter, setPageFilter] = useState('all');

  // Birthday greeting composer state
  const [birthdayComposer, setBirthdayComposer] = useState({
    isOpen: false,
    birthdayAlumniId: null,
    birthdayAlumniName: '',
    message: '',
  });
  const [sendingGreeting, setSendingGreeting] = useState(false);
  const [greetingSuccess, setGreetingSuccess] = useState(false);

  const unreadCount = useMemo(
    () => (Array.isArray(notifications) ? notifications.filter((n) => !n.is_read).length : 0),
    [notifications]
  );

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to load notifications');
      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    const poll = setInterval(fetchNotifications, 15000);
    return () => clearInterval(poll);
  }, [fetchNotifications]);

  const isBirthdayNotification = (notification) => {
    const title = String(notification?.title || '').toLowerCase();
    const type = String(notification?.type || '').toUpperCase();
    if (title.includes('sent you a birthday greeting')) return false;
    if (type === 'ANNOUNCEMENT') {
      return title.includes('birthday') || String(notification?.message || '').toLowerCase().includes('birthday');
    }
    return /^happy birthday,|^birthday today:/i.test(title);
  };

  const getBirthdayAlumniId = (notification) => {
    const link = String(notification?.link || '');
    const match = link.match(/\/alumni\/profile\/(\d+)/i);
    return match ? Number(match[1]) : null;
  };

  const getBirthdayAlumniName = (notification) => {
    const title = String(notification?.title || '');
    return title
      .replace(/^happy birthday,\s*/i, '')
      .replace(/^birthday today:\s*/i, '')
      .replace(/\s*sent you a birthday greeting.*$/i, '')
      .replace(/!$/, '')
      .trim();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification) return;

    try {
      if (!notification.is_read) {
        await fetch(`${API_BASE_URL}/notifications/${notification.id}/read`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item
          )
        );
      }

      // Birthday notifications open the greeting composer directly
      if (isBirthdayNotification(notification)) {
        const alumniId = getBirthdayAlumniId(notification);
        const alumniName = getBirthdayAlumniName(notification) || 'Alumni';
        if (alumniId) {
          setGreetingSuccess(false);
          setBirthdayComposer({
            isOpen: true,
            birthdayAlumniId: alumniId,
            birthdayAlumniName: alumniName,
            message: `Happy Birthday, ${alumniName}! Wishing you a wonderful day.`,
          });
        }
        return;
      }

      if (!notification.link && getEffectiveType(notification) === 'JOB_APPLICATION') {
        navigate('/employment');
        return;
      }

      if (!notification.link && getEffectiveType(notification) === 'REGISTRATION') {
        navigate('/pending-approval');
        return;
      }

      if (notification.link) {
        navigate(notification.link);
      }
    } catch (error) {
      console.error('Error opening notification:', error);
    }
  };

  const handleSendBirthdayGreeting = async (event) => {
    event.preventDefault();

    if (!birthdayComposer.birthdayAlumniId) {
      toast.error('Unable to determine recipient for the greeting.');
      return;
    }

    const messageToSend =
      birthdayComposer.message && birthdayComposer.message.trim()
        ? birthdayComposer.message.trim()
        : `Happy Birthday, ${birthdayComposer.birthdayAlumniName}! Wishing you a wonderful day.`;

    try {
      setSendingGreeting(true);
      const response = await fetch(`${API_BASE_URL}/notifications/birthday-greetings`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          birthdayAlumniId: birthdayComposer.birthdayAlumniId,
          greetingText: messageToSend,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Server returned ${response.status}`);
      }

      setGreetingSuccess(true);
      toast.success(`Greeting sent to ${birthdayComposer.birthdayAlumniName}!`);
      fetchNotifications();
      window.setTimeout(() => {
        setGreetingSuccess(false);
        setBirthdayComposer({ isOpen: false, birthdayAlumniId: null, birthdayAlumniName: '', message: '' });
      }, 1800);
    } catch (error) {
      toast.error(error.message || 'Failed to send birthday greeting');
    } finally {
      setSendingGreeting(false);
    }
  };

  const markAllAsRead = async () => {
    if (!notifications.length) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    } finally {
      setBusy(false);
    }
  };

  const clearAll = async () => {
    if (!notifications.length) return;
    setBusy(true);
    try {
      await fetch(`${API_BASE_URL}/notifications`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      setNotifications([]);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <UserLayout>
      <BirthdayGreetingComposer
        isOpen={birthdayComposer.isOpen}
        onClose={() => {
          setGreetingSuccess(false);
          setBirthdayComposer({ isOpen: false, birthdayAlumniId: null, birthdayAlumniName: '', message: '' });
        }}
        recipientId={birthdayComposer.birthdayAlumniId}
        recipientName={birthdayComposer.birthdayAlumniName}
        message={birthdayComposer.message}
        onMessageChange={(value) => setBirthdayComposer((prev) => ({ ...prev, message: value }))}
        authToken={token}
        onSubmit={handleSendBirthdayGreeting}
        sending={sendingGreeting}
        sendSuccess={greetingSuccess}
      />

      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500">Stay updated with events, approvals, and activity.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={busy || !unreadCount}
              className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-100 hover:border-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all as read
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={busy || !notifications.length}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-100 hover:border-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear all
            </button>
          </div>
        </div>

        {/* Notification List Card */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm overflow-hidden">
          {/* Inbox Header */}
          <div className="border-b border-gray-100 bg-gray-50/50">
            {/* All / Unread filter tabs */}
            <div className="flex px-5">
              {[
                { key: 'all', label: 'All' },
                { key: 'unread', label: 'Unread' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setPageFilter(tab.key)}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors relative ${
                    pageFilter === tab.key
                      ? 'text-blue-600'
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                  {tab.key === 'unread' && unreadCount > 0 && (
                    <span className="ml-1 text-xs">({unreadCount})</span>
                  )}
                  {pageFilter === tab.key && (
                    <div className="absolute bottom-0 left-4 right-4 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="inline-flex items-center gap-2 text-gray-400">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <span className="text-sm font-medium">Loading notifications...</span>
              </div>
            </div>
          ) : (() => {
            const filteredNotifications = pageFilter === 'unread'
              ? notifications.filter((n) => !n.is_read)
              : notifications;
            return filteredNotifications.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-600">
                {pageFilter === 'unread' ? 'No unread notifications' : "You're all caught up!"}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {pageFilter === 'unread' ? 'You\'ve read all your notifications' : 'No new notifications at this time.'}
              </p>
            </div>
          ) : (
            <div>
              {groupNotifications(filteredNotifications).map((section) => (
                <div key={section.label}>
                  <div className="px-5 py-2 bg-gray-50/80 border-b border-gray-100">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{section.label}</span>
                  </div>
                  <div className="divide-y divide-gray-100/80">
                    {section.items.map((notification) => {
                      const cfg = getConfig(notification);
                      const isUnread = !notification.is_read;
                      const isBirthday = isBirthdayNotification(notification);
                      const isUrgent = isUrgentNotification(notification);

                      return (
                        <button
                          type="button"
                          key={notification.id}
                          onClick={() => handleNotificationClick(notification)}
                          className={`w-full px-5 py-4 text-left transition-all duration-200 group cursor-pointer ${
                            isUrgent
                              ? 'bg-red-50/80 hover:bg-red-100/80'
                              : isUnread
                              ? 'bg-blue-50/50 hover:bg-blue-100/60'
                              : 'bg-white hover:bg-gray-50/80'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="relative mt-0.5 flex-shrink-0">
                              <div className={`flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br ${cfg.color} text-white shadow-sm`}>
                                {isBirthday ? (
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                                  </svg>
                                ) : (
                                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d={cfg.icon} />
                                  </svg>
                                )}
                              </div>
                              {isUnread && (
                                <span className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${isUrgent ? 'bg-red-600' : 'bg-blue-500'}`} />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <p className={`text-sm leading-snug line-clamp-1 ${
                                  isUnread ? 'font-bold text-gray-900' : 'font-semibold text-gray-700'
                                } group-hover:text-blue-900 transition-colors`}>
                                  {notification.title || 'Notification'}
                                </p>
                                <span className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                                  isUrgent
                                    ? 'bg-red-100 text-red-700'
                                    : isUnread ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                                }`}>
                                  {isBirthday ? 'Birthday' : cfg.label}
                                </span>
                              </div>
                              <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">
                                {formatNotificationPreview(notification.message) || 'No details available.'}
                              </p>
                              <div className="mt-1.5 flex items-center gap-2">
                                <p className="text-xs text-gray-400 font-medium">{getRelativeTime(notification.created_at)}</p>
                                {notification.link && !isBirthday && (
                                  <span className="text-[11px] text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Click to view &rarr;
                                  </span>
                                )}
                                {isBirthday && (
                                  <span className="text-[11px] text-pink-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    Send greeting &rarr;
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          );
          })()}
        </div>
      </div>
    </UserLayout>
  );
};

export default Notifications;
