/**
 * Frontend Firebase Utilities
 * Handle Firestore operations, authentication, and base64 images
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  Query,
  Timestamp,
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  getIdToken,
} from 'firebase/auth';
import { db, auth } from '../config/firebase';

/**
 * BASE64 IMAGE UTILITIES
 */

// Convert file to base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Convert base64 to Blob
export const base64ToBlob = (base64String, mimeType = 'image/jpeg') => {
  const [headerInfo, data] = base64String.includes(',')
    ? base64String.split(',')
    : ['', base64String];
  const bstr = atob(data);
  const bytes = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) {
    bytes[i] = bstr.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
};

// Compress base64 image (browser-side)
export const compressBase64Image = async (
  base64String,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = maxWidth;
          height = maxWidth / aspectRatio;
        } else {
          height = maxHeight;
          width = maxHeight * aspectRatio;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.src = base64String;
  });
};

// Validate base64 image size
export const validateBase64Size = (base64String, maxSizeKB = 200) => {
  const sizeBytes = Buffer ? Buffer.byteLength(base64String, 'utf8') : base64String.length * 2;
  const sizeKB = sizeBytes / 1024;
  return sizeKB <= maxSizeKB;
};

/**
 * FIRESTORE OPERATIONS
 */

// Get single document
export const getDocument = async (collectionName, docId) => {
  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

// Get all documents
export const getCollection = async (collectionName, constraints = {}) => {
  try {
    let q = collection(db, collectionName);

    // Build query with constraints
    const queryConstraints = [];
    if (constraints.where) {
      constraints.where.forEach(({ field, operator, value }) => {
        queryConstraints.push(where(field, operator, value));
      });
    }
    if (constraints.orderBy) {
      constraints.orderBy.forEach(({ field, direction }) => {
        queryConstraints.push(orderBy(field, direction || 'asc'));
      });
    }
    if (constraints.limit) {
      queryConstraints.push(limit(constraints.limit));
    }

    if (queryConstraints.length > 0) {
      q = query(q, ...queryConstraints);
    }

    const snapshot = await getDocs(q);
    const docs = [];
    snapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  } catch (error) {
    console.error('Error getting collection:', error);
    throw error;
  }
};

// Add document
export const addDocument = async (collectionName, data) => {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding document:', error);
    throw error;
  }
};

// Update document
export const updateDocument = async (collectionName, docId, data) => {
  try {
    const docRef = doc(db, collectionName, docId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: Timestamp.now(),
    });
    return await getDocument(collectionName, docId);
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

// Delete document
export const deleteDocument = async (collectionName, docId) => {
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Subscribe to document (real-time)
export const subscribeToDocument = (collectionName, docId, callback) => {
  try {
    const docRef = doc(db, collectionName, docId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      } else {
        callback(null);
      }
    });
  } catch (error) {
    console.error('Error subscribing to document:', error);
    throw error;
  }
};

// Subscribe to collection (real-time)
export const subscribeToCollection = (
  collectionName,
  callback,
  constraints = {}
) => {
  try {
    const queryConstraints = [];

    if (constraints.where) {
      constraints.where.forEach(({ field, operator, value }) => {
        queryConstraints.push(where(field, operator, value));
      });
    }
    if (constraints.orderBy) {
      constraints.orderBy.forEach(({ field, direction }) => {
        queryConstraints.push(orderBy(field, direction || 'asc'));
      });
    }
    if (constraints.limit) {
      queryConstraints.push(limit(constraints.limit));
    }

    let q = query(collection(db, collectionName), ...queryConstraints);

    return onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      callback(docs);
    });
  } catch (error) {
    console.error('Error subscribing to collection:', error);
    throw error;
  }
};

/**
 * AUTHENTICATION
 */

// Sign up with email and password
export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

// Sign in with email and password
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

// Google OAuth sign in
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

// Sign out
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Get ID token for API calls
export const getAuthToken = async () => {
  try {
    if (!auth.currentUser) return null;
    return await getIdToken(auth.currentUser);
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Watch auth state
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};

export default {
  // Base64 utilities
  fileToBase64,
  base64ToBlob,
  compressBase64Image,
  validateBase64Size,

  // Firestore operations
  getDocument,
  getCollection,
  addDocument,
  updateDocument,
  deleteDocument,
  subscribeToDocument,
  subscribeToCollection,

  // Authentication
  signUp,
  signIn,
  signInWithGoogle,
  logOut,
  getAuthToken,
  onAuthStateChange,
};
