const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create notifications for users who have enabled notifications
 * @param {string} type - Notification type (EVENT, ACHIEVEMENT, ANNOUNCEMENT, GENERAL)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} link - Link to the relevant content (e.g., /events/123)
 * @param {number} eventId - Optional event ID to associate with notification
 * @param {number} batch - Optional batch number to filter alumni (null = all alumni)
 * @returns {Promise<number>} Number of notifications created
 */
async function createNotifications({ type, title, message, link, eventId = null, batch = null }) {
  try {
    // Build query to get users with notifications enabled
    const userQuery = {
      notification_enabled: true,
      is_active: true,
      is_blocked: false
    };

    // If batch is specified, filter by batch
    let usersToNotify;
    if (batch) {
      // Get users through their alumni profile with specific batch
      usersToNotify = await prisma.user.findMany({
        where: {
          ...userQuery,
          alumni: {
            batch: batch
          }
        },
        select: {
          id: true
        }
      });
    } else {
      // Get all users with notifications enabled
      usersToNotify = await prisma.user.findMany({
        where: userQuery,
        select: {
          id: true
        }
      });
    }

    if (usersToNotify.length === 0) {
      console.log('No users to notify');
      return 0;
    }

    // Create notifications for all users
    const notifications = usersToNotify.map(user => ({
      user_id: user.id,
      event_id: eventId,
      type: type,
      title: title,
      message: message,
      link: link,
      is_read: false
    }));

    const result = await prisma.notification.createMany({
      data: notifications
    });

    console.log(`Created ${result.count} notifications for type: ${type}${batch ? ` (Batch ${batch})` : ' (All alumni)'}`);
    return result.count;
  } catch (error) {
    console.error('Error creating notifications:', error);
    throw error;
  }
}

/**
 * Get all notifications for a user
 * @param {number} userId - User ID
 * @param {boolean} unreadOnly - Only return unread notifications
 * @returns {Promise<Array>} Array of notifications
 */
async function getUserNotifications(userId, unreadOnly = false) {
  try {
    const where = { user_id: userId };
    if (unreadOnly) {
      where.is_read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      },
      take: 50 // Limit to 50 most recent notifications
    });

    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 * @param {number} notificationId - Notification ID
 * @returns {Promise<Object>} Updated notification
 */
async function markAsRead(notificationId) {
  try {
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true }
    });
    return notification;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of notifications updated
 */
async function markAllAsRead(userId) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        user_id: userId,
        is_read: false
      },
      data: {
        is_read: true
      }
    });
    return result.count;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Delete a notification
 * @param {number} notificationId - Notification ID
 * @returns {Promise<Object>} Deleted notification
 */
async function deleteNotification(notificationId) {
  try {
    const notification = await prisma.notification.delete({
      where: { id: notificationId }
    });
    return notification;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
}

/**
 * Create notification for a specific user
 * @param {number} userId - User ID to notify
 * @param {string} type - Notification type (EVENT, ACHIEVEMENT, ANNOUNCEMENT, GENERAL, JOB_APPLICATION)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {string} link - Link to the relevant content
 * @returns {Promise<Object>} Created notification
 */
async function createUserNotification(userId, { type, title, message, link }) {
  try {
    console.log(`📬 Creating notification for user ${userId}:`, { type, title, message, link });
    
    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, notification_enabled: true }
    });
    
    if (!user) {
      console.error(`❌ User ${userId} not found`);
      throw new Error(`User ${userId} not found`);
    }
    
    console.log(`✅ User found:`, user);
    
    const notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type: type,
        title: title,
        message: message,
        link: link,
        is_read: false
      }
    });
    console.log(`✅ Notification created successfully:`, notification);
    return notification;
  } catch (error) {
    console.error('❌ Error creating user notification:', error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Count of unread notifications
 */
async function getUnreadCount(userId) {
  try {
    const count = await prisma.notification.count({
      where: {
        user_id: userId,
        is_read: false
      }
    });
    return count;
  } catch (error) {
    console.error('Error getting unread count:', error);
    throw error;
  }
}

/**
 * Delete all notifications for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Count of deleted notifications
 */
async function deleteAllNotifications(userId) {
  try {
    const result = await prisma.notification.deleteMany({
      where: { user_id: userId }
    });
    return result.count;
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    throw error;
  }
}

module.exports = {
  createNotifications,
  createUserNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount
};
