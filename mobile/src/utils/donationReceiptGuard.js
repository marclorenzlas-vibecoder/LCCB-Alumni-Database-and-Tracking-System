import { Alert } from 'react-native';

const MESSAGE = 'Please submit your receipt first. Your receipt is your proof of donation.';

let pendingReceipt = false;
const listeners = new Set();

export const showPendingReceiptAlert = () => {
  Alert.alert('Submit receipt first', MESSAGE);
};

export const setPendingDonationReceipt = (value) => {
  const nextValue = Boolean(value);
  if (pendingReceipt === nextValue) return;

  pendingReceipt = nextValue;
  listeners.forEach((listener) => listener(pendingReceipt));
};

export const hasPendingDonationReceipt = () => pendingReceipt;

export const subscribePendingDonationReceipt = (listener) => {
  listeners.add(listener);
  listener(pendingReceipt);
  return () => {
    listeners.delete(listener);
  };
};
