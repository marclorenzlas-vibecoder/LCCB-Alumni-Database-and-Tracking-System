const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { broadcastUpdate } = require('../services/realtimeService');

const prisma = new PrismaClient();

const getSenderName = async (user) => {
  if (!user?.id) return 'Someone';

  if (user.role && user.role.toUpperCase() === 'TEACHER') {
    const teacher = await prisma.teacher.findUnique({
      where: { id: user.id },
      select: { username: true, email: true }
    });
    return teacher?.username || teacher?.email || 'A teacher';
  }

  const alumniUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { username: true, email: true }
  });

  return alumniUser?.username || alumniUser?.email || 'An alumni';
};

const extractAlumniIdFromLink = (link) => {
  if (typeof link !== 'string') return null;
  const match = link.match(/\/alumni\/profile\/(\d+)/i);
  return match ? Number(match[1]) : null;
};

const createBirthdayNotification = async (userId, payload) => {
  const targetUserId = Number(userId);
  if (!Number.isFinite(targetUserId)) {
    throw new Error('Invalid notification recipient');
  }

  try {
    return await notificationService.createUserNotification(targetUserId, payload);
  } catch (serviceError) {
    console.warn('Birthday greeting notification service fallback:', serviceError.message);

    const notification = await prisma.notification.create({
      data: {
        user_id: targetUserId,
        type: payload.type || 'GENERAL',
        title: payload.title,
        message: payload.message,
        link: payload.link || null,
        is_read: false
      }
    });

    broadcastUpdate('notification.created', {
      userId: targetUserId,
      notification
    });

    return notification;
  }
};

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

// Resolve the sender's user-table ID.  Teachers may log in with a JWT whose
// `id` comes from the separate `teacher` table, which is NOT referenced by the
// `notification.user_id` foreign key.  This helper maps any JWT identity back
// to the `user` table so notification FK constraints are satisfied.
const resolveSenderUserTableId = async (jwtUser) => {
  if (!jwtUser?.id) return null;

  const role = String(jwtUser.role || '').toUpperCase();

  // Alumni / regular users – the JWT id already points to the user table.
  if (role !== 'TEACHER') {
    return Number(jwtUser.id);
  }

  // Teacher – look up or create a corresponding row in the user table.
  const teacherEmail = jwtUser.email;
  if (!teacherEmail) return null;

  const existing = await prisma.user.findFirst({
    where: { email: teacherEmail },
    select: { id: true }
  });

  return existing ? existing.id : null;
};

// Send a birthday greeting to the alumni who owns the birthday notification
router.post('/birthday-greetings', authenticateToken, async (req, res) => {
  try {
    const birthdayAlumniId = Number(req.body.birthdayAlumniId);
    const greetingText = typeof req.body.greetingText === 'string' ? req.body.greetingText.trim() : '';

    if (!birthdayAlumniId || !greetingText) {
      return res.status(400).json({ error: 'birthdayAlumniId and greetingText are required' });
    }

    console.log(`📨 Birthday greeting attempt by user ${req.user?.id || 'unknown'} -> alumni ${birthdayAlumniId}`);

    const birthdayAlumni = await prisma.alumni.findUnique({
      where: { id: birthdayAlumniId },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        user_id: true,
        email: true,
        date_of_birth: true
      }
    });

    if (!birthdayAlumni) {
      console.log(`❌ Birthday alumni ${birthdayAlumniId} not found`);
      return res.status(404).json({ error: 'Birthday alumni not found' });
    }

    const recipientUser = birthdayAlumni.user_id
      ? await prisma.user.findUnique({
          where: { id: birthdayAlumni.user_id },
          select: { id: true, notification_enabled: true, is_active: true, is_blocked: true }
        })
      : birthdayAlumni.email
        ? await prisma.user.findFirst({
            where: { email: birthdayAlumni.email },
            select: { id: true, notification_enabled: true, is_active: true, is_blocked: true }
          })
        : null;

    // Resolve the sender's display name (works for both teacher and alumni JWTs).
    const senderName = await getSenderName(req.user);

    if (!recipientUser) {
      console.log(`⚠️ Recipient user record not found for alumni ${birthdayAlumniId} (email: ${birthdayAlumni.email}) — will record sender confirmation instead.`);

      // Try to create a confirmation notification for the sender.
      // This requires a valid user-table ID; teachers may only exist in the
      // teacher table, so we resolve via email lookup.
      const senderUserTableId = await resolveSenderUserTableId(req.user);

      if (senderUserTableId) {
        const confirmTitle = `Greeting queued for ${birthdayAlumni.first_name} ${birthdayAlumni.last_name}`;
        const confirmMessage = `${senderName} sent a birthday greeting to ${birthdayAlumni.first_name} ${birthdayAlumni.last_name}. The alumnus does not have an in-app account, so the greeting could not be delivered as an in-app notification.`;

        await createBirthdayNotification(senderUserTableId, {
          type: 'GENERAL',
          title: confirmTitle,
          message: confirmMessage,
          link: `/alumni/profile/${birthdayAlumni.id}`
        });
      } else {
        console.log(`⚠️ Could not resolve sender user-table ID for teacher ${req.user?.email} — skipping sender confirmation notification.`);
      }

      return res.status(201).json({
        message: 'Recipient does not have an in-app account. Greeting recorded.',
        birthdayAlumniId: birthdayAlumni.id,
        birthdayAlumniName: `${birthdayAlumni.first_name} ${birthdayAlumni.last_name}`.trim(),
        senderName
      });
    }

    if (!recipientUser.notification_enabled) {
      console.log(`⚠️ Recipient user ${recipientUser.id} has notifications disabled — delivering anyway.`);
    }

    if (!recipientUser.is_active || recipientUser.is_blocked) {
      console.log(`⚠️ Recipient user ${recipientUser.id} inactive/blocked: active=${recipientUser.is_active} blocked=${recipientUser.is_blocked} — delivering anyway.`);
    }

    const title = `${senderName} sent you a birthday greeting`;
    const message = `${senderName}: ${greetingText}`;

    const notification = await createBirthdayNotification(recipientUser.id, {
      type: 'GENERAL',
      title,
      message,
      link: null
    });

    res.status(201).json({
      message: 'Birthday greeting sent successfully',
      notification,
      birthdayAlumniId: birthdayAlumni.id,
      birthdayAlumniName: `${birthdayAlumni.first_name} ${birthdayAlumni.last_name}`.trim(),
      senderName
    });
  } catch (error) {
    console.error('Error sending birthday greeting:', error);
    res.status(500).json({ error: 'Failed to send birthday greeting' });
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
