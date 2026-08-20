import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getImageUrl } from '../config/apiBaseUrl';
import { createPortal } from 'react-dom';
import { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl';
import { authService } from '../services/authService';

const MAX_MESSAGE_LENGTH = 500;
const ICON_STROKE = 1.75;

const getInitials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'A';

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return '';
  return String(imagePath).startsWith('http') ? imagePath : getImageUrl(imagePath);
};

const formatBirthdayDate = (dateValue) => {
  if (!dateValue) return 'Today';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
};

const buildTemplates = (name) => [
  {
    id: 'classic',
    label: 'Classic',
    text: `Happy Birthday, ${name}! Wishing you a wonderful day filled with joy and success.`,
  },
  {
    id: 'festive',
    label: 'Festive',
    text: `🎉 Happy Birthday, ${name}! Hope your special day is as amazing as you are!`,
  },
  {
    id: 'warm',
    label: 'Warm',
    text: `Sending warm birthday wishes your way, ${name}. May this year bring you happiness and new adventures!`,
  },
  {
    id: 'professional',
    label: 'Professional',
    text: `Happy Birthday, ${name}! Wishing you continued success and fulfillment in the year ahead.`,
  },
];

/* Unified outline icon set — stroke 1.75, 24×24 viewBox */
const IconBase = ({ className = 'h-5 w-5', children }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={ICON_STROKE}
    aria-hidden="true"
  >
    {children}
  </svg>
);

const CakeIcon = (props) => (
  <IconBase {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.84 6 9.653 6 10.66V21h12v-10.34c0-1.007-.845-1.82-1.976-1.994A48.27 48.27 0 0012 8.25zm0 0V6a2.25 2.25 0 00-2.25-2.25 2.25 2.25 0 00-2.25 2.25v2.25m6 0V6a2.25 2.25 0 00-2.25-2.25 2.25 2.25 0 00-2.25 2.25v2.25" />
  </IconBase>
);

const UserCircleIcon = (props) => (
  <IconBase {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.964 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
  </IconBase>
);

const SparklesIcon = (props) => (
  <IconBase {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
  </IconBase>
);

const EyeIcon = (props) => (
  <IconBase {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </IconBase>
);

const PaperPlaneSendIcon = (props) => (
  <IconBase {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </IconBase>
);

const CheckCircleIcon = (props) => (
  <IconBase {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </IconBase>
);

const InformationCircleIcon = (props) => (
  <IconBase {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
  </IconBase>
);

const XMarkIcon = (props) => (
  <IconBase {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </IconBase>
);

const SectionLabel = ({ icon: Icon, children }) => (
  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
    <Icon className="h-4 w-4 text-blue-600" />
    {children}
  </div>
);

const EmptyRecipientsIllustration = () => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-amber-50/50 px-6 py-12 text-center">
    <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-white shadow-md ring-1 ring-indigo-100">
      <CakeIcon className="h-10 w-10 text-indigo-400" />
      <span className="absolute -right-1 -top-1 text-lg" aria-hidden="true">
        🎂
      </span>
    </div>
    <h4 className="text-lg font-bold text-slate-800">No recipient selected</h4>
    <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
      Open a birthday notification from the bell menu, or choose someone celebrating today from your
      dashboard, to send a greeting.
    </p>
    <p className="mt-4 text-sm font-medium text-slate-400">No birthdays today? Check back later 🎈</p>
  </div>
);

const BirthdayGreetingComposer = ({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  message,
  onMessageChange,
  authToken,
  onSubmit,
  sending = false,
  sendSuccess = false,
}) => {
  const [recipientProfile, setRecipientProfile] = useState(null);
  const [loadingRecipient, setLoadingRecipient] = useState(false);
  const textareaRef = useRef(null);

  const sender = authService.getCurrentUser();
  const senderName =
    sender?.username ||
    [sender?.alumni?.firstName, sender?.alumni?.lastName].filter(Boolean).join(' ') ||
    'You';

  const trimmedMessage = (message || '').trim();
  const displayMessage =
    trimmedMessage ||
    (recipientName
      ? `Happy Birthday, ${recipientName}! Wishing you a wonderful day filled with joy and success.`
      : '');

  const charCount = message?.length || 0;
  const isNearLimit = charCount >= MAX_MESSAGE_LENGTH * 0.85;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;

  const recipientDisplayName = useMemo(() => {
    if (recipientProfile?.first_name || recipientProfile?.last_name) {
      return `${recipientProfile.first_name || ''} ${recipientProfile.last_name || ''}`.trim();
    }
    return recipientName || 'Alumni';
  }, [recipientProfile, recipientName]);

  const recipientAvatar = resolveImageUrl(
    recipientProfile?.profile_image || recipientProfile?.profileImage
  );

  const birthdayDateLabel = formatBirthdayDate(
    recipientProfile?.date_of_birth || recipientProfile?.dateOfBirth
  );

  const templates = useMemo(
    () => buildTemplates(recipientDisplayName),
    [recipientDisplayName]
  );

  useEffect(() => {
    if (!isOpen || !recipientId) {
      setRecipientProfile(null);
      return undefined;
    }

    let cancelled = false;

    const loadRecipient = async () => {
      setLoadingRecipient(true);
      try {
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
        const response = await fetch(`${API_BASE_URL}/alumni/${recipientId}`, { headers });
        if (!response.ok) throw new Error('Failed to load recipient');
        const data = await response.json();
        if (!cancelled) setRecipientProfile(data);
      } catch {
        if (!cancelled) setRecipientProfile(null);
      } finally {
        if (!cancelled) setLoadingRecipient(false);
      }
    };

    loadRecipient();
    return () => {
      cancelled = true;
    };
  }, [isOpen, recipientId, authToken]);

  if (!isOpen) return null;

  const handleMessageChange = (event) => {
    const next = event.target.value;
    if (next.length <= MAX_MESSAGE_LENGTH) {
      onMessageChange(next);
    }
  };

  const applyTemplate = (text) => {
    if (text.length <= MAX_MESSAGE_LENGTH) {
      onMessageChange(text);
      textareaRef.current?.focus();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[121] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="greeting-composer-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close greeting composer"
        onClick={onClose}
      />

      <div className="greeting-modal-enter relative flex max-h-[96vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-white shadow-[0_28px_80px_rgba(15,23,42,0.28)] sm:rounded-3xl">
        {/* Header — solid system blue */}
        <div className="border-b border-blue-800/30 bg-blue-700 px-5 py-5 text-white sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-100">
                Birthday Greeting
              </p>
              <h2 id="greeting-composer-title" className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                Send a heartfelt message
              </h2>
              <p className="mt-1.5 text-sm text-blue-100">
                Your greeting will be delivered as a personal notification.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white/90 transition hover:bg-white/20"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {!recipientId ? (
          <div className="p-6 sm:p-8">
            <EmptyRecipientsIllustration />
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1fr] sm:p-7">
              {/* Compose column */}
              <div className="space-y-5">
                <section>
                  <SectionLabel icon={UserCircleIcon}>Recipient</SectionLabel>
                  <div className="birthday-recipient-today flex items-center gap-4 rounded-2xl border-2 border-amber-200/80 bg-gradient-to-br from-amber-50/80 via-white to-indigo-50/40 p-4 shadow-sm transition hover:shadow-md">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 shadow-md ring-2 ring-white">
                      {loadingRecipient ? (
                        <div className="h-full w-full animate-pulse bg-white/20" />
                      ) : recipientAvatar ? (
                        <img
                          src={recipientAvatar}
                          alt={recipientDisplayName}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-bold text-white">
                          {getInitials(recipientDisplayName)}
                        </div>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-sm shadow-md ring-2 ring-white">
                        🎂
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-base font-bold text-slate-900">
                          {recipientDisplayName}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
                          Today 🎉
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium text-indigo-600">{birthdayDateLabel}</p>
                      {recipientProfile?.course && (
                        <p className="mt-0.5 truncate text-sm text-slate-500">{recipientProfile.course}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <SectionLabel icon={SparklesIcon}>Your message</SectionLabel>
                    <span
                      className={`text-xs font-semibold tabular-nums ${
                        isOverLimit
                          ? 'text-rose-600'
                          : isNearLimit
                            ? 'text-amber-600'
                            : 'text-slate-400'
                      }`}
                    >
                      {charCount}/{MAX_MESSAGE_LENGTH}
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-2">
                    {templates.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        disabled={sending || sendSuccess}
                        onClick={() => applyTemplate(tpl.text)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:opacity-50"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={handleMessageChange}
                    rows={6}
                    disabled={sending || sendSuccess}
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder={`Happy Birthday, ${recipientDisplayName}! Share a warm, personal message…`}
                  />
                  <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
                    <InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                    Keep it friendly and sincere. The recipient will receive this in their notifications.
                  </p>
                </section>
              </div>

              {/* Preview column */}
              <section className="flex flex-col">
                <SectionLabel icon={EyeIcon}>Live preview</SectionLabel>
                <div className="flex flex-1 flex-col rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-indigo-50/30 p-4 shadow-inner">
                  <p className="mb-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Notification preview
                  </p>
                  <div className="mx-auto w-full max-w-sm flex-1 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-md ring-1 ring-slate-100/80 transition-all duration-300">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-sm font-bold text-white shadow-sm">
                        {getInitials(senderName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-900">
                          {senderName}{' '}
                          <span className="font-medium text-slate-500">
                            sent you a birthday greeting
                          </span>
                        </p>
                        <div className="mt-3 rounded-xl border border-amber-100 bg-gradient-to-br from-amber-50/90 to-orange-50/50 px-3.5 py-3">
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">
                            {displayMessage}
                          </p>
                        </div>
                        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                          <SparklesIcon className="h-3.5 w-3.5 text-amber-500" />
                          Just now · Birthday
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="mt-4 text-center text-xs text-slate-500">
                    Preview updates as you type or pick a template
                  </p>
                </div>
              </section>
            </div>

            {/* Footer */}
            <div className="mt-auto border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:px-7">
              {sendSuccess && (
                <div className="greeting-success-banner mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                  <CheckCircleIcon className="h-5 w-5 shrink-0 text-emerald-600" />
                  Greeting sent successfully! {recipientDisplayName} will be notified shortly.
                </div>
              )}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || sendSuccess || isOverLimit || !recipientId}
                  className={`inline-flex min-h-[46px] min-w-[180px] items-center justify-center gap-2.5 rounded-xl px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                    sendSuccess
                      ? 'bg-emerald-600 shadow-emerald-600/20'
                      : 'bg-blue-700 shadow-blue-700/20 hover:bg-blue-800 hover:shadow-lg'
                  }`}
                >
                  {sending ? (
                    <>
                      <span
                        className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                        aria-hidden="true"
                      />
                      Sending…
                    </>
                  ) : sendSuccess ? (
                    <>
                      <CheckCircleIcon className="h-5 w-5" />
                      Sent!
                    </>
                  ) : (
                    <>
                      <PaperPlaneSendIcon className="h-5 w-5 shrink-0" />
                      Send Greeting
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default BirthdayGreetingComposer;
