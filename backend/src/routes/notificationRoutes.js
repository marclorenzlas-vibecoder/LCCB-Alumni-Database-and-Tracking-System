const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');

// Get all notifications for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const unreadOnly = req.query.unreadOnly === 'true';
    
    const notifications = await notificationService.getUserNotifications(userId, unreadOnly);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get unread notification count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const notification = await notificationService.markAsRead(notificationId);
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Mark all notifications as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.markAllAsRead(userId);
    res.json({ message: 'All notifications marked as read', count });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    await notificationService.deleteNotification(notificationId);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// Clear all notifications
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await notificationService.deleteAllNotifications(userId);
    res.json({ message: 'All notifications cleared', count });
  } catch (error) {
    console.error('Error clearing all notifications:', error);
    res.status(500).json({ error: 'Failed to clear notifications' });
  }
});

module.exports = router;
