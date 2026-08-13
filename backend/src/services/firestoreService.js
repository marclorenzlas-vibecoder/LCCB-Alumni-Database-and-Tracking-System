/**
 * Firestore Database Services
 * Replacement for Prisma ORM with Firebase
 */

const { db, auth } = require('../config/firebase');

/**
 * USER SERVICES
 */

// Create or update user
async function createUser(uid, userData) {
  try {
    await db.collection('users').doc(uid).set({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }, { merge: true });
    return uid;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// Get user by ID
async function getUser(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}

// Get user by email
async function getUserByEmail(email) {
  try {
    const snapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get();
    
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting user by email:', error);
    throw error;
  }
}

// Update user
async function updateUser(uid, updateData) {
  try {
    await db.collection('users').doc(uid).update({
      ...updateData,
      updatedAt: new Date(),
    });
    return await getUser(uid);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

// Delete user
async function deleteUser(uid) {
  try {
    await db.collection('users').doc(uid).delete();
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

/**
 * ALUMNI SERVICES
 */

// Create alumni profile
async function createAlumni(alumniData) {
  try {
    const docRef = await db.collection('alumni').add({
      ...alumniData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating alumni:', error);
    throw error;
  }
}

// Get alumni by ID
async function getAlumni(alumniId) {
  try {
    const doc = await db.collection('alumni').doc(alumniId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Error getting alumni:', error);
    throw error;
  }
}

// Get all alumni (with pagination)
async function getAllAlumni(limit = 100, startAfter = null) {
  try {
    let query = db.collection('alumni').limit(limit);
    
    if (startAfter) {
      query = query.startAfter(startAfter);
    }
    
    const snapshot = await query.get();
    const alumni = [];
    let lastDoc = null;
    
    snapshot.forEach((doc) => {
      alumni.push({ id: doc.id, ...doc.data() });
      lastDoc = doc;
    });
    
    return { data: alumni, lastDoc };
  } catch (error) {
    console.error('Error getting all alumni:', error);
    throw error;
  }
}

// Search alumni
async function searchAlumni(searchTerm) {
  try {
    const snapshot = await db.collection('alumni')
      .where('firstName', '>=', searchTerm)
      .where('firstName', '<=', searchTerm + '\uf8ff')
      .get();
    
    const results = [];
    snapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() });
    });
    return results;
  } catch (error) {
    console.error('Error searching alumni:', error);
    throw error;
  }
}

// Update alumni
async function updateAlumni(alumniId, updateData) {
  try {
    await db.collection('alumni').doc(alumniId).update({
      ...updateData,
      updatedAt: new Date(),
    });
    return await getAlumni(alumniId);
  } catch (error) {
    console.error('Error updating alumni:', error);
    throw error;
  }
}

// Delete alumni
async function deleteAlumni(alumniId) {
  try {
    await db.collection('alumni').doc(alumniId).delete();
  } catch (error) {
    console.error('Error deleting alumni:', error);
    throw error;
  }
}

/**
 * GENERIC CRUD OPERATIONS
 */

// Create document
async function createDocument(collection, data) {
  try {
    const docRef = await db.collection(collection).add({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return docRef.id;
  } catch (error) {
    console.error(`Error creating document in ${collection}:`, error);
    throw error;
  }
}

// Get document
async function getDocument(collection, docId) {
  try {
    const doc = await db.collection(collection).doc(docId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (error) {
    console.error(`Error getting document from ${collection}:`, error);
    throw error;
  }
}

// Get all documents
async function getAllDocuments(collection, limit = 100) {
  try {
    const snapshot = await db.collection(collection).limit(limit).get();
    const docs = [];
    snapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  } catch (error) {
    console.error(`Error getting all documents from ${collection}:`, error);
    throw error;
  }
}

// Update document
async function updateDocument(collection, docId, updateData) {
  try {
    await db.collection(collection).doc(docId).update({
      ...updateData,
      updatedAt: new Date(),
    });
    return await getDocument(collection, docId);
  } catch (error) {
    console.error(`Error updating document in ${collection}:`, error);
    throw error;
  }
}

// Delete document
async function deleteDocument(collection, docId) {
  try {
    await db.collection(collection).doc(docId).delete();
  } catch (error) {
    console.error(`Error deleting document from ${collection}:`, error);
    throw error;
  }
}

// Query documents
async function queryDocuments(collection, conditions = []) {
  try {
    let query = db.collection(collection);
    
    conditions.forEach((condition) => {
      const { field, operator, value } = condition;
      query = query.where(field, operator, value);
    });
    
    const snapshot = await query.get();
    const docs = [];
    snapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });
    return docs;
  } catch (error) {
    console.error(`Error querying ${collection}:`, error);
    throw error;
  }
}

/**
 * BATCH OPERATIONS
 */

// Batch write documents
async function batchWrite(operations) {
  try {
    const batch = db.batch();
    
    operations.forEach(({ type, collection, docId, data }) => {
      const docRef = db.collection(collection).doc(docId);
      
      if (type === 'set') {
        batch.set(docRef, data, { merge: true });
      } else if (type === 'update') {
        batch.update(docRef, { ...data, updatedAt: new Date() });
      } else if (type === 'delete') {
        batch.delete(docRef);
      }
    });
    
    await batch.commit();
  } catch (error) {
    console.error('Error in batch write:', error);
    throw error;
  }
}

/**
 * REALTIME LISTENERS
 */

// Subscribe to document changes
function subscribeToDocument(collection, docId, callback) {
  try {
    const unsubscribe = db.collection(collection).doc(docId)
      .onSnapshot((doc) => {
        if (doc.exists) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Subscription error:', error);
      });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to document:', error);
    throw error;
  }
}

// Subscribe to collection changes
function subscribeToCollection(collection, callback, limit = 100) {
  try {
    const unsubscribe = db.collection(collection)
      .limit(limit)
      .onSnapshot((snapshot) => {
        const docs = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        callback(docs);
      }, (error) => {
        console.error('Subscription error:', error);
      });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error subscribing to collection:', error);
    throw error;
  }
}

module.exports = {
  // User operations
  createUser,
  getUser,
  getUserByEmail,
  updateUser,
  deleteUser,
  
  // Alumni operations
  createAlumni,
  getAlumni,
  getAllAlumni,
  searchAlumni,
  updateAlumni,
  deleteAlumni,
  
  // Generic CRUD
  createDocument,
  getDocument,
  getAllDocuments,
  updateDocument,
  deleteDocument,
  queryDocuments,
  
  // Batch operations
  batchWrite,
  
  // Realtime listeners
  subscribeToDocument,
  subscribeToCollection,
};
