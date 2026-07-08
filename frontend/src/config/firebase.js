import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

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

const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const firebaseDatabase = getDatabase(firebaseApp);

export { firebaseApp, firebaseDatabase };
