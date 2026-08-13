/**
 * Firestore Realtime Service
 * Replaces WebSocket implementation with Firestore listeners
 */

const { db } = require('../config/firebase');

// Track all active subscriptions
const subscriptions = new Map();

/**
 * Subscribe to realtime updates for a specific collection
 * @param {string} collection - Collection name
 * @param {function} callback - Function to call on updates (receives array of docs)
 * @param {Object} options - Query options { where: [], limit, orderBy }
 * @returns {function} Unsubscribe function
 */
function subscribeToCollection(collection, callback, options = {}) {
  try {
    let query = db.collection(collection);

    // Apply where conditions
    if (options.where) {
      options.where.forEach(({ field, operator, value }) => {
        query = query.where(field, operator, value);
      });
    }

    // Apply ordering
    if (options.orderBy) {
      options.orderBy.forEach(({ field, direction }) => {
        query = query.orderBy(field, direction || 'asc');
      });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Subscribe to changes
    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const docs = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() });
        });
        callback(docs);
      },
      (error) => {
        console.error(`Firestore subscription error (${collection}):`, error);
      }
    );

    // Store subscription for cleanup
    const subscriptionKey = `${collection}_${Date.now()}`;
    subscriptions.set(subscriptionKey, unsubscribe);

    return () => {
      unsubscribe();
      subscriptions.delete(subscriptionKey);
    };
  } catch (error) {
    console.error('Error subscribing to collection:', error);
    throw error;
  }
}

/**
 * Subscribe to realtime updates for a single document
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {function} callback - Function to call on updates (receives document)
 * @returns {function} Unsubscribe function
 */
function subscribeToDocument(collection, docId, callback) {
  try {
    const unsubscribe = db.collection(collection).doc(docId)
      .onSnapshot(
        (doc) => {
          if (doc.exists) {
            callback({ id: doc.id, ...doc.data() });
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error(`Firestore subscription error (${collection}/${docId}):`, error);
        }
      );

    const subscriptionKey = `${collection}_${docId}_${Date.now()}`;
    subscriptions.set(subscriptionKey, unsubscribe);

    return () => {
      unsubscribe();
      subscriptions.delete(subscriptionKey);
    };
  } catch (error) {
    console.error('Error subscribing to document:', error);
    throw error;
  }
}

/**
 * Publish update to Firestore (triggers subscriptions)
 * @param {string} collection - Collection name
 * @param {string} docId - Document ID
 * @param {Object} data - Data to update
 * @param {boolean} merge - Whether to merge or replace (default: merge)
 */
async function publishUpdate(collection, docId, data, merge = true) {
  try {
    const docRef = db.collection(collection).doc(docId);
    
    if (merge) {
      await docRef.update({
        ...data,
        updatedAt: new Date(),
      });
    } else {
      await docRef.set({
        ...data,
        updatedAt: new Date(),
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error publishing update:', error);
    throw error;
  }
}

/**
 * Publish to activity log (for audit trail)
 * @param {Object} activityData - Activity data { action, entityType, entityId, summary, details, actorId, actorRole }
 */
async function logActivity(activityData) {
  try {
    await db.collection('activity_logs').add({
      ...activityData,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
}

/**
 * Subscribe to activity logs (for monitoring)
 * @param {function} callback - Callback function
 * @param {number} limit - Number of recent logs to track
 * @returns {function} Unsubscribe function
 */
function subscribeToActivityLogs(callback, limit = 50) {
  return subscribeToCollection('activity_logs', callback, {
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit,
  });
}

/**
 * Broadcast notification to all users (or specific user)
 * @param {Object} notification - Notification data { type, message, userId (optional), relatedId }
 */
async function broadcastNotification(notification) {
  try {
    const docRef = await db.collection('notifications').add({
      ...notification,
      read: false,
      createdAt: new Date(),
    });
    
    // If userId specified, can set user-specific notification doc
    if (notification.userId) {
      await db.collection('users').doc(notification.userId)
        .collection('notifications').doc(docRef.id).set({
          ...notification,
          read: false,
          createdAt: new Date(),
        });
    }
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    throw error;
  }
}

/**
 * Subscribe to user notifications
 * @param {string} userId - User ID
 * @param {function} callback - Callback function
 * @returns {function} Unsubscribe function
 */
function subscribeToUserNotifications(userId, callback) {
  return subscribeToCollection('notifications', callback, {
    where: [{ field: 'userId', operator: '==', value: userId }],
    orderBy: [{ field: 'createdAt', direction: 'desc' }],
    limit: 50,
  });
}

/**
 * Clean up all subscriptions (for server shutdown)
 */
function unsubscribeAll() {
  subscriptions.forEach((unsubscribe) => {
    try {
      unsubscribe();
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  });
  subscriptions.clear();
  console.log('All Firestore subscriptions cleaned up');
}

/**
 * Get subscription count (for monitoring)
 */
function getSubscriptionCount() {
  return subscriptions.size;
}

module.exports = {
  subscribeToCollection,
  subscribeToDocument,
  publishUpdate,
  logActivity,
  subscribeToActivityLogs,
  broadcastNotification,
  subscribeToUserNotifications,
  unsubscribeAll,
  getSubscriptionCount,
};
