import React from 'react';
import { createPortal } from 'react-dom';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  confirmLoadingText,
  cancelText = "Cancel",
  type = "danger", // danger, warning, info, success
  isLoading = false
}) => {
  const [internalLoading, setInternalLoading] = React.useState(false);

  React.useEffect(() => {
    if (!isOpen) {
      setInternalLoading(false);
    }
  }, [isOpen]);

  const isConfirming = Boolean(isLoading || internalLoading);

  if (!isOpen) return null;

  const iconColors = {
    danger: "bg-red-100 text-red-600",
    warning: "bg-yellow-100 text-yellow-600",
    info: "bg-blue-100 text-blue-600",
    success: "bg-emerald-100 text-emerald-600"
  };

  const buttonColors = {
    danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
    warning: "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500",
    info: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
    success: "bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
  };

  const titleColors = {
    danger: 'text-red-700',
    warning: 'text-yellow-700',
    info: 'text-blue-700',
    success: 'text-emerald-700'
  };

  const accents = {
    danger: 'from-red-50 to-white',
    warning: 'from-yellow-50 to-white',
    info: 'from-blue-50 to-white',
    success: 'from-emerald-50 to-white'
  };

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className={`relative w-full max-w-md rounded-2xl bg-gradient-to-b ${accents[type] || accents.danger} text-left overflow-hidden shadow-2xl border border-gray-100 transform transition-all`}>
        <div className="px-5 pt-5 pb-4">
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full ${iconColors[type] || iconColors.danger} ring-4 ring-white shadow-sm`}>
              {type === 'success' && (
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {type === 'danger' && (
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {type === 'warning' && (
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {type === 'info' && (
                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <h3 className={`text-lg font-semibold leading-6 ${titleColors[type] || titleColors.danger}`} id="modal-title">
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-6 text-gray-600">
                {message}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 bg-white/80 backdrop-blur px-5 py-4 flex justify-start gap-3">
          <button
            type="button"
            disabled={isConfirming}
            onClick={async () => {
              if (isConfirming) return;
              setInternalLoading(true);
              try {
                if (onConfirm) await onConfirm();
                if (onClose) onClose();
              } catch (e) {
                console.error('Confirm action failed', e);
              } finally {
                setInternalLoading(false);
              }
            }}
            className={`inline-flex items-center justify-center rounded-lg border border-transparent shadow-sm px-4 py-2.5 ${buttonColors[type] || buttonColors.danger} text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isConfirming && (
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
            )}
            {isConfirming ? (confirmLoadingText || (type === 'danger' ? 'Deleting...' : 'Processing...')) : confirmText}
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={onClose}
            className="inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
