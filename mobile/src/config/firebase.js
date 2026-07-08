import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCYIEN9izlnqWzWbSK9XwbDystYjB2fLs8',
  authDomain: 'lccb-alumni-fb433.firebaseapp.com',
  projectId: 'lccb-alumni-fb433',
  storageBucket: 'lccb-alumni-fb433.firebasestorage.app',
  messagingSenderId: '1080765342661',
  appId: '1:1080765342661:web:6473b1ce0d108cf72561ac',
  measurementId: 'G-HT2CKFM97Z',
  databaseURL: 'https://lccb-alumni-fb433-default-rtdb.asia-southeast1.firebasedatabase.app/'
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const firebaseDatabase = getDatabase(firebaseApp);
