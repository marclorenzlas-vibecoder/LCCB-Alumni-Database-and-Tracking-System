/**
 * Firebase Frontend Configuration (Updated for Firestore + Realtime)
 * Initialize Firebase, Firestore, Authentication, and Realtime Database
 */

import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCYIEN9izlnqWzWbSK9XwbDystYjB2fLs8',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'lccb-alumni-fb433.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://lccb-alumni-fb433-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'lccb-alumni-fb433',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'lccb-alumni-fb433.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1080765342661',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1080765342661:web:6473b1ce0d108cf72561ac',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-HT2CKFM97Z'
};

// Initialize Firebase
const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export const firebaseDatabase = getDatabase(firebaseApp);

// Enable emulators only if explicitly configured via VITE_USE_FIREBASE_EMULATOR
const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true';

if (useEmulator && !window.FIREBASE_EMULATOR_CONNECTED) {
  window.FIREBASE_EMULATOR_CONNECTED = true;
  
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  } catch (e) {
    // Already connected
  }

  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (e) {
    // Already connected
  }

  try {
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch (e) {
    // Already connected
  }

  try {
    connectDatabaseEmulator(firebaseDatabase, 'localhost', 9000);
  } catch (e) {
    // Already connected
  }
}

// Legacy export for backward compatibility
export { firebaseApp };
