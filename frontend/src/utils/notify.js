import React from 'react';
import { toast } from 'react-toastify';

const makeContent = (title, message) => (
  <div>
    <strong>{title}</strong>
    <div style={{ marginTop: 4 }}>{message}</div>
  </div>
);

export const notifySuccess = (message, title = 'Success') => {
  toast.success(makeContent(title, message));
};

export const notifyInfo = (message, title = 'Info') => {
  toast.info(makeContent(title, message));
};

export const notifyWarning = (message, title = 'Warning') => {
  toast.warning(makeContent(title, message));
};

export const notifyError = (message, title = 'Error') => {
  toast.error(makeContent(title, message));
};

export default {
  success: notifySuccess,
  info: notifyInfo,
  warning: notifyWarning,
  error: notifyError
};
