import React from 'react';
import { createPortal } from 'react-dom';

const AuthStatusOverlay = ({
  status = 'processing',
  processingTitle,
  processingMessage,
  successTitle,
  successMessage
}) => {
  const isSuccess = status === 'success';

  const overlay = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white">
      <div className="flex min-w-[23rem] flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-xl" role="status" aria-live="polite">
        {isSuccess ? (
          <div className="login-success-icon flex h-12 w-12 items-center justify-center rounded-full bg-blue-900 text-white shadow-lg shadow-blue-900/25">
            <svg className="block h-7 w-7" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path className="login-success-check" pathLength="1" d="M7 12.4l3.3 3.3L17.2 8.8" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        ) : (
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-900" />
        )}
        <div className="text-lg font-semibold text-slate-900">
          {isSuccess ? successTitle : processingTitle}
        </div>
        <div className="text-sm text-slate-500">
          {isSuccess ? successMessage : processingMessage}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return overlay;

  return createPortal(overlay, document.body);
};

export default AuthStatusOverlay;
