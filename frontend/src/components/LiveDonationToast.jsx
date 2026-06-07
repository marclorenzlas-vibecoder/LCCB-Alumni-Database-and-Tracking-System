import React, { useEffect, useState } from 'react';
import { realtimeClient } from '../services/realtimeClient';
import { authService } from '../services/authService';
import { IMAGE_BASE_URL } from '../config/apiBaseUrl';
const getInitials = (name) => {
  const parts = String(name || 'A')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
};

const stripDuplicatePrefix = (message, title) => {
  if (!message || !title) return message?.trim() || '';
  const msg = message.trim();
  const prefix = title.trim();
  if (msg.toLowerCase().startsWith(prefix.toLowerCase())) {
    return msg.slice(prefix.length).replace(/^[\s.:,-]+/, '').trim();
  }
  return msg;
};

const buildDonationCopy = ({ amountLabel, campaignName, donationKind, title, message }) => {
  const campaign = campaignName?.trim() || 'a campaign';
  const kind = String(donationKind || '').toLowerCase();

  let gift = 'a contribution';
  if (amountLabel && kind === 'items') {
    gift = `${amountLabel} and items`;
  } else if (kind === 'items') {
    gift = 'items';
  } else if (amountLabel) {
    gift = amountLabel;
  }

  const rawDetail = stripDuplicatePrefix(message, title);
  let detail = '';
  if (rawDetail) {
    const donationForMatch = rawDetail.match(/^(?:donation for|note|notes):\s*(.+)/i);
    detail = donationForMatch ? donationForMatch[1].trim() : rawDetail;
  }

  const fullLine = `${gift} to ${campaign}`.toLowerCase();
  if (detail && detail.toLowerCase() === fullLine) {
    detail = '';
  }

  return { gift, campaign, detail };
};

const LiveDonationToast = () => {
  const [toasts, setToasts] = useState([]);

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

  const dismissToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const role = authService.getRole?.() || null;
    if (!role || role.toUpperCase() !== 'ALUMNI') return;

    const handler = (payload) => {
      try {
        const type =
          payload?.type ||
          payload?.notification?.type ||
          (payload?.notification && payload.notification.type) ||
          null;

        if (!type || String(type).toUpperCase() !== 'DONATION') return;

        const title = payload?.title || payload?.notification?.title || '';
        const message = payload?.message || payload?.notification?.message || '';
        const senderName =
          payload?.senderName ||
          payload?.notification?.sender_name ||
          payload?.notification?.senderName ||
          'An alumnus';
        const senderProfileImage =
          payload?.senderProfileImage ||
          payload?.notification?.sender_profile_image ||
          payload?.notification?.senderProfileImage ||
          '';
        const amountLabel = payload?.amountLabel || payload?.notification?.amountLabel || '';
        const campaignName = payload?.campaignName || payload?.notification?.campaignName || '';
        const donationKind = payload?.donationKind || payload?.notification?.donationKind || '';

        const { gift, campaign, detail } = buildDonationCopy({
          amountLabel,
          campaignName,
          donationKind,
          title,
          message
        });

        const id =
          payload?.notification?.id || `don-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        const toastItem = {
          id,
          createdAt: Date.now(),
          senderName,
          senderProfileImage,
          gift,
          campaign,
          detail
        };

        setToasts((prev) => [toastItem, ...prev].slice(0, 3));

        setTimeout(() => dismissToast(id), 8000);
      } catch (e) {
        console.error('LiveDonationToast handler error', e);
      }
    };

    const unsub = realtimeClient.subscribe('notification.created', handler);
    return () => {
      try {
        unsub();
      } catch {
        /* ignore */
      }
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-6 left-6 z-50 flex max-w-[calc(100vw-3rem)] flex-col gap-3"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <article
          key={t.id}
          className="donation-toast-card w-[min(100%,22rem)] overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-xl shadow-emerald-900/10"
        >
          <div className="flex gap-3 border-l-4 border-emerald-500 p-4">
            <div className="h-11 w-11 shrink-0">
              {t.senderProfileImage ? (
                <img
                  src={
                    t.senderProfileImage.startsWith('/')
                      ? `${IMAGE_BASE_URL}${t.senderProfileImage}`
                      : t.senderProfileImage
                  }
                  alt=""
                  className="h-11 w-11 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                  {getInitials(t.senderName)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-semibold text-slate-900">{t.senderName}</p>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="text-[11px] font-medium text-slate-400">
                    {formatRelativeTime(t.createdAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => dismissToast(t.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    aria-label="Dismiss"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="mt-1 text-sm leading-snug text-slate-600">
                Donated{' '}
                <span className="font-semibold text-emerald-800">{t.gift}</span>
                {' '}to{' '}
                <span className="font-medium text-slate-900">{t.campaign}</span>
              </p>

              {t.detail ? (
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-500">{t.detail}</p>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
};

export default LiveDonationToast;
