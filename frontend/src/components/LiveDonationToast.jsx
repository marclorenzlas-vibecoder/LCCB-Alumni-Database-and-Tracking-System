import React, { useEffect, useState } from 'react';
import { realtimeClient } from '../services/realtimeClient';
import { authService } from '../services/authService';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { useNavigate } from 'react-router-dom';

const LiveDonationToast = () => {
  const [toasts, setToasts] = useState([]);
  const navigate = useNavigate();

  const formatRelativeTime = (timestamp) => {
    const diffMs = Date.now() - timestamp;
    if (diffMs < 10_000) return 'Just now';
    const diffSeconds = Math.floor(diffMs / 1000);
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  useEffect(() => {
    const role = authService.getRole?.() || null;
    // Only show these live donation popups to alumni users
    if (!role || role.toUpperCase() !== 'ALUMNI') return;

    const handler = (payload) => {
      try {
        // payload can come in two shapes from backend broadcasts
        // createNotifications -> { type, title, message, link, senderName, senderProfileImage }
        // createUserNotification -> { userId, senderName, senderProfileImage, notification }

        let type = payload?.type || payload?.notification?.type || (payload?.notification && payload.notification.type) || null;
        let title = payload?.title || payload?.notification?.title || '';
        let message = payload?.message || payload?.notification?.message || '';
        let link = payload?.link || payload?.notification?.link || '';
        let senderName = payload?.senderName || payload?.notification?.sender_name || payload?.notification?.senderName || 'Alumnus';
        let senderProfileImage = payload?.senderProfileImage || payload?.notification?.sender_profile_image || payload?.notification?.senderProfileImage || '';
        let amountLabel = payload?.amountLabel || payload?.notification?.amountLabel || '';
        let campaignName = payload?.campaignName || payload?.notification?.campaignName || '';

        if (!type) return;
        if (String(type).toUpperCase() !== 'DONATION') return;

        const id = payload?.notification?.id || `don-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

        const toastItem = {
          id,
          createdAt: Date.now(),
          title: title || `${senderName} donated ${amountLabel || ''} to ${campaignName || 'a donation'}`.trim(),
          message,
          link,
          senderName,
          senderProfileImage,
          amountLabel,
          campaignName
        };

        setToasts((prev) => {
          const next = [toastItem, ...prev].slice(0, 3);
          return next;
        });

        // Auto-remove after 6 seconds
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 6000);
      } catch (e) {
        console.error('LiveDonationToast handler error', e);
      }
    };

    const unsub = realtimeClient.subscribe('notification.created', handler);

    return () => {
      try { unsub(); } catch {};
    };
  }, [navigate]);

  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed left-6 bottom-6 z-50 flex flex-col items-end gap-3">
      {toasts.map((t) => (
        <div key={t.id} className="w-80 rounded-2xl bg-white shadow-lg border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-2 bg-slate-50/80">
            <div className="flex items-center gap-2 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.28em] text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </div>
            <div className="ml-auto text-[11px] font-medium text-slate-500">
              {formatRelativeTime(t.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3">
            <div className="h-12 w-12 flex-shrink-0">
              {t.senderProfileImage ? (
                <img src={t.senderProfileImage.startsWith('/') ? `${IMAGE_BASE_URL}${t.senderProfileImage}` : t.senderProfileImage} alt={t.senderName} className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-semibold">{(t.senderName || 'A').split(' ').map(s => s[0]).slice(0,2).join('')}</div>
              )}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-900">{t.senderName}</div>
              <div className="text-xs text-slate-600">{t.title}</div>
              {t.message ? <div className="mt-1 text-[11px] leading-4 text-slate-500 line-clamp-2">{t.message}</div> : null}
            </div>
            <div className="pl-2">
              <button
                onClick={() => {
                  if (t.link) {
                    navigate(t.link);
                  }
                  setToasts((prev) => prev.filter((x) => x.id !== t.id));
                }}
                className="text-xs text-emerald-700 font-semibold"
              >
                View
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default LiveDonationToast;
