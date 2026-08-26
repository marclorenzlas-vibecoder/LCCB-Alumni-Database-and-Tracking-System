import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserLayout from './UserLayout';
import { API_BASE_URL } from '../config/apiBaseUrl';

const formatTimestamp = (value) => {
  if (!value) return 'Unknown time';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString();
};

const Notifications = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const unreadCount = useMemo(
    () => (Array.isArray(notifications) ? notifications.filter((n) => !n.is_read).length : 0),
    [notifications]
  );

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load notifications');
      }

      const data = await response.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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

      if (notification.link) {
        navigate(notification.link);
      }
    } catch (error) {
      console.error('Error opening notification:', error);
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

  const getTypeColor = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('event')) return 'bg-gradient-to-br from-purple-500 to-indigo-600';
    if (t.includes('donat')) return 'bg-gradient-to-br from-emerald-500 to-teal-600';
    if (t.includes('birthday')) return 'bg-gradient-to-br from-amber-400 to-orange-500';
    if (t.includes('approval') || t.includes('account')) return 'bg-gradient-to-br from-sky-500 to-cyan-600';
    return 'bg-gradient-to-br from-blue-500 to-blue-700';
  };

  const getTypeLabel = (type) => {
    const t = (type || '').toLowerCase();
    if (t.includes('event')) return 'Event';
    if (t.includes('donat')) return 'Donation';
    if (t.includes('birthday')) return 'Birthday';
    if (t.includes('approval')) return 'Approval';
    return 'System';
  };

  return (
    <UserLayout>
      <div className="bg-gray-50 min-h-screen p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-600/20">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
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
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 bg-gray-50/50">
            <span className="text-sm font-bold text-gray-800">Inbox</span>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                  {unreadCount} unread
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
                {notifications.length} total
              </span>
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
          ) : notifications.length === 0 ? (
            <div className="px-8 py-20 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <p className="text-base font-semibold text-gray-600">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No notifications yet. We'll let you know when something arrives.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100/80">
              {notifications.map((notification) => (
                <button
                  type="button"
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full px-5 py-4 text-left transition-all duration-200 group ${
                    notification.is_read
                      ? 'bg-white hover:bg-gray-50/80'
                      : 'bg-blue-50/50 hover:bg-blue-100/60'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Type indicator dot + Icon */}
                    <div className="relative mt-0.5 flex-shrink-0">
                      <div className={`flex h-11 w-11 items-center justify-center rounded-xl text-white text-sm font-bold shadow-sm ${getTypeColor(notification.type)}`}>
                        {(notification.title || 'N').charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-white ${
                          notification.is_read ? 'bg-gray-300' : 'bg-blue-500'
                        }`}
                      />
                    </div>

                    {/* Text content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm leading-snug ${notification.is_read ? 'font-semibold text-gray-700' : 'font-bold text-gray-900'} group-hover:text-blue-900 transition-colors line-clamp-1`}>
                          {notification.title || 'Notification'}
                        </p>
                        <span className={`flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          notification.is_read ? 'bg-gray-100 text-gray-400' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {getTypeLabel(notification.type)}
                        </span>
                      </div>
                      <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-2">{notification.message || 'No details available.'}</p>
                      <p className="mt-1.5 text-xs text-gray-400 font-medium">{formatTimestamp(notification.created_at)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
};

export default Notifications;
