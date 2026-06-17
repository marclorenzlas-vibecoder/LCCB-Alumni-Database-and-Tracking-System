import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { authService } from '../services/authService';

const PRIMARY_BLUE = '#1d4ed8';

const getInitials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

const getRecipientFirstName = () => {
  const user = authService.getCurrentUser();
  const first =
    user?.alumni?.firstName ||
    user?.alumni?.first_name ||
    user?.firstName ||
    '';
  if (String(first).trim()) return String(first).trim();
  const full =
    [user?.alumni?.firstName, user?.alumni?.lastName].filter(Boolean).join(' ') ||
    user?.username ||
    '';
  const part = String(full).trim().split(/\s+/)[0];
  return part || 'Friend';
};

const parseGreetingBody = (senderName, rawMessage) => {
  const message = String(rawMessage || '').trim();
  if (!message) {
    return 'May your day be filled with joy, laughter, and unforgettable moments. Enjoy your special day!';
  }
  const escaped = senderName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withoutPrefix = message.replace(new RegExp(`^${escaped}\\s*:\\s*`, 'i'), '').trim();
  return withoutPrefix || message;
};

const BackdropDecor = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <span className="birthday-receipt-float absolute left-[8%] top-[18%] h-3 w-3 rounded-full bg-amber-300 opacity-20" />
    <span className="birthday-receipt-float absolute right-[10%] top-[22%] h-2 w-2 rounded-full bg-sky-300 opacity-25 animation-delay-300" />
    <span className="birthday-receipt-float absolute left-[15%] bottom-[28%] h-2 w-2 rounded-sm bg-amber-300 opacity-20 animation-delay-500" />
    <span className="birthday-receipt-float absolute right-[18%] bottom-[32%] h-1.5 w-1.5 rounded-full bg-sky-300 opacity-25 animation-delay-200" />
    <span className="birthday-receipt-float absolute left-[42%] top-[12%] h-2.5 w-2.5 rounded-full bg-blue-200 opacity-15 animation-delay-600" />
    <span className="birthday-receipt-float absolute right-[32%] bottom-[18%] h-2 w-3 rounded-sm bg-pink-300 opacity-15 rotate-12 animation-delay-400" />
  </div>
);

const BirthdayGreetingReceiptModal = ({
  isOpen,
  senderName = 'Someone',
  message = '',
  recipientName: recipientNameProp,
  onClose,
}) => {
  const displaySender = String(senderName || 'Someone').trim() || 'Someone';
  const recipientFirstName = useMemo(() => {
    if (recipientNameProp) {
      const part = String(recipientNameProp).trim().split(/\s+/)[0];
      if (part) return part;
    }
    return getRecipientFirstName();
  }, [recipientNameProp]);

  const greetingBody = useMemo(
    () => parseGreetingBody(displaySender, message),
    [displaySender, message]
  );

  if (!isOpen) return null;

  return createPortal(
    <div
      className="birthday-receipt-backdrop fixed inset-0 z-[121] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="birthday-receipt-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close greeting"
        onClick={onClose}
      />

      <BackdropDecor />
      <div className="birthday-receipt-spotlight pointer-events-none absolute left-1/2 top-1/2 h-[min(90vw,420px)] w-[min(90vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white opacity-[0.07] blur-3xl" aria-hidden="true" />

      <div className="birthday-receipt-modal-enter relative w-full max-w-[440px] overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_64px_rgba(15,23,42,0.22),0_4px_16px_rgba(15,23,42,0.08)]">
        {/* Header — solid blue, no gradients */}
        <header
          className="relative overflow-hidden px-8 pb-7 pt-8 text-center text-white"
          style={{ backgroundColor: PRIMARY_BLUE }}
        >
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden="true">
            <span className="absolute left-6 top-5 h-8 w-3 rounded-full bg-white" />
            <span className="absolute right-8 top-8 h-5 w-3 rounded-full bg-white" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25 active:scale-95"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-blue-100">
            Birthday Greeting
          </p>

          <h2
            id="birthday-receipt-title"
            className="mt-4 text-[1.65rem] font-extrabold leading-tight tracking-tight sm:text-[1.85rem]"
          >
            Happy Birthday, {recipientFirstName}!
          </h2>
          <p className="mx-auto mt-3 max-w-[320px] text-sm leading-relaxed text-blue-100">
            Wishing you happiness, success, and wonderful memories on your special day.
          </p>
        </header>

        {/* Body */}
        <div className="space-y-6 px-8 pb-8 pt-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-base font-bold text-white shadow-[0_4px_14px_rgba(29,78,216,0.35)]"
              style={{ backgroundColor: PRIMARY_BLUE }}
            >
              {getInitials(displaySender)}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">From</p>
              <p className="mt-0.5 truncate text-lg font-bold text-slate-900">{displaySender}</p>
            </div>
          </div>

          <article className="relative rounded-[18px] border border-slate-100 bg-slate-50 p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="mb-3 flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600"
                aria-hidden="true"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </span>
              <p className="text-sm font-semibold text-slate-800">Their message for you</p>
            </div>
            <p className="whitespace-pre-wrap break-words text-[15px] leading-[1.65] text-slate-700">
              {greetingBody}
            </p>
          </article>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default BirthdayGreetingReceiptModal;
