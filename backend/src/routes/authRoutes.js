const express = require('express');
const { registerUser, loginUser, registerTeacher, loginTeacher } = require('../services/authService');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Initialize router and prisma
const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for profile image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profiles/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// Register route (Alumni/Students only - Gmail)
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, level, course, batch, graduationYear } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide username, email, and password' });
    }
    
    // Validate email domain - only allow gmail.com for self-registration
    const emailDomain = email.split('@')[1];
    if (emailDomain !== 'gmail.com') {
      return res.status(400).json({ error: 'Alumni registration is only available for Gmail accounts. Contact admin for teacher accounts.' });
    }
    
    const result = await registerUser({ username, email, password, level, course, batch, graduationYear });
    // Returns message and status (no token until approved)
    res.status(201).json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Login route (Unified for both teachers and alumni)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password' });
    }

    const emailDomain = email.split('@')[1];
    if (emailDomain !== 'gmail.com' && emailDomain !== 'lccbonline.com') {
      return res.status(400).json({ error: 'Invalid email domain. Use @gmail.com or @lccbonline.com' });
    }

    let result;
    if (emailDomain === 'lccbonline.com') {
      // Teacher login against teacher table
      result = await loginTeacher(email, password);
    } else {
      // Alumni login
      result = await loginUser(email, password);
    }
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Teacher (Admin) register route - Admin only
router.post('/register-teacher', async (req, res) => {
  try {
    // Support both JSON and form-urlencoded submissions
    const username = req.body.username || req.body.fullName;
    const email = req.body.email;
    const password = req.body.password;
    const department = req.body.department || null;

    if (!username || !email || !password) {
      // If request expects HTML (came from form), return simple HTML
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.status(400).send('<p style="font-family:sans-serif;color:#c00">Missing required fields.</p>');
      }
      return res.status(400).json({ error: 'Please provide username, email, and password' });
    }

    const emailDomain = String(email).split('@')[1];
    if (emailDomain !== 'lccbonline.com') {
      if (req.headers.accept && req.headers.accept.includes('text/html')) {
        return res.status(400).send('<p style="font-family:sans-serif;color:#c00">Email must end with @lccbonline.com</p>');
      }
      return res.status(400).json({ error: 'Teacher accounts must use @lccbonline.com domain' });
    }

    const { teacher } = await registerTeacher({ username, email, password, department });

    // Respond appropriately depending on requester
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.status(201).send('<p style="font-family:sans-serif;color:#090">Account created. <a href="http://localhost:3002/login">Login</a></p>');
    }
    res.status(201).json({ message: 'Teacher account created successfully', teacher });
  } catch (error) {
    console.error('Teacher registration error:', error);
    if (req.headers.accept && req.headers.accept.includes('text/html')) {
      return res.status(500).send('<p style="font-family:sans-serif;color:#c00">Registration failed.</p>');
    }
    res.status(500).json({ error: error.message || 'Teacher registration failed' });
  }
});

// Get all teachers - Admin only
router.get('/teachers', async (req, res) => {
  try {
    const teachers = await prisma.teacher.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        department: true,
        created_at: true
      }
    });
    // Map created_at to createdAt for frontend consistency
    res.json(teachers.map(t => ({
      id: t.id,
      email: t.email,
      username: t.username,
      department: t.department,
      createdAt: t.created_at
    })));
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Delete teacher - Admin only
router.delete('/teachers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.teacher.delete({
      where: { id: parseInt(id) }
    });
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

// Get pending registrations - Admin only
router.get('/pending-registrations', async (req, res) => {
  try {
    const { getPendingRegistrations } = require('../services/authService');
    const pending = await getPendingRegistrations();
    res.json(pending);
  } catch (error) {
    console.error('Error fetching pending registrations:', error);
    res.status(500).json({ error: 'Failed to fetch pending registrations' });
  }
});

// Approve registration - Admin only
router.post('/approve-registration/:id', async (req, res) => {
  try {
    const { approveRegistration } = require('../services/authService');
    const result = await approveRegistration(parseInt(req.params.id));
    res.json(result);
  } catch (error) {
    console.error('Error approving registration:', error);
    res.status(500).json({ error: error.message || 'Failed to approve registration' });
  }
});

// Reject registration - Admin only
router.post('/reject-registration/:id', async (req, res) => {
  try {
    const { rejectRegistration } = require('../services/authService');
    const { reason } = req.body;
    const result = await rejectRegistration(parseInt(req.params.id), reason);
    res.json(result);
  } catch (error) {
    console.error('Error rejecting registration:', error);
    res.status(500).json({ error: error.message || 'Failed to reject registration' });
  }
});

// Delete rejected account after user acknowledges rejection
router.post('/delete-rejected-account', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find and delete rejected pending registration
    const pending = await prisma.pending_registration.findUnique({
      where: { email }
    });

    if (pending && pending.status === 'REJECTED') {
      await prisma.pending_registration.delete({
        where: { id: pending.id }
      });
      res.json({ success: true, message: 'Rejected account deleted' });
    } else {
      res.status(404).json({ error: 'Rejected account not found' });
    }
  } catch (error) {
    console.error('Error deleting rejected account:', error);
    res.status(500).json({ error: 'Failed to delete rejected account' });
  }
});

// Google OAuth routes
router.get('/google', (req, res, next) => {
  console.log('Starting Google OAuth flow...');
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
    state: Math.random().toString(36).substring(7)
  })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  console.log('Google callback received:', {
    hasCode: !!req.query.code,
    hasState: !!req.query.state,
  });

  passport.authenticate('google', function(err, user, info) {
    if (err) {
      console.error('Passport Google auth error:', {
        message: err.message,
        code: err.code,
        statusCode: err.statusCode
      });
      return res.status(500).json({
        message: 'OAuth authentication failed',
        error: err.message,
        code: err.code || 'unknown_error'
      });
    }
    
    if (!user) {
      console.error('No user from Google auth:', info);
      return res.status(401).json({
        message: 'Authentication failed',
        error: 'No user data received'
      });
    }

    req.logIn(user, function(err) {
      if (err) {
        console.error('Session login error:', err);
        return res.status(500).json({
          message: 'Session login failed',
          error: err.message
        });
      }

      console.log('Successfully authenticated user:', user.email);
      
      // Generate JWT token for the OAuth user
      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email,
          googleId: user.google_id || user.googleId,
          name: user.name,
          role: 'ALUMNI' // Google OAuth users are always alumni
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );

      // Prepare user data for frontend with all required fields
      const userData = {
        id: user.id,
        email: user.email,
        username: user.name,
        name: user.name,
        picture: user.picture,
        profile_image: user.picture,
        role: 'ALUMNI',
        approval_status: 'APPROVED', // Google OAuth users are auto-approved
        is_active: true
      };

      // Redirect to frontend OAuth callback with token and user data
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
      const redirectUrl = `${frontendUrl}/oauth-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userData))}`;
      return res.redirect(redirectUrl);
    });
  })(req, res, next);
});

// Update user profile (username and profile image)
router.put('/profile/:id', upload.single('profileImage'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, firstName, lastName, level, course, batch, graduationYear, currentPosition, company, location, skills } = req.body;
    
    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (req.file) {
      updateData.profile_image = `/uploads/profiles/${req.file.filename}`;
    }

    // Check if user is teacher or regular user
    const emailDomain = email ? email.split('@')[1] : null;
    
    let updatedUser;
    let updatedAlumni = null;
    let role;
    
    if (emailDomain === 'lccbonline.com') {
      // Update teacher table
      updatedUser = await prisma.teacher.update({
        where: { id: userId },
        data: updateData
      });
      role = 'TEACHER';
    } else {
      // Update user table
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
      role = updatedUser.role || 'ALUMNI';
      
      // Update alumni information if provided
      if (firstName || lastName || level || course || batch || graduationYear || currentPosition || company || location || skills || req.file) {
        const alumniUpdateData = {};
        if (firstName) alumniUpdateData.first_name = firstName;
        if (lastName) alumniUpdateData.last_name = lastName;
        if (level) alumniUpdateData.level = level;
        if (course) alumniUpdateData.course = course;
        if (batch) alumniUpdateData.batch = parseInt(batch);
        if (graduationYear) alumniUpdateData.graduation_year = parseInt(graduationYear);
        if (currentPosition) alumniUpdateData.current_position = currentPosition;
        if (company) alumniUpdateData.company = company;
        if (location) alumniUpdateData.location = location;
        if (skills) alumniUpdateData.skills = skills;
        // Also update profile_image in alumni table when user uploads new image
        if (req.file) {
          alumniUpdateData.profile_image = `/uploads/profiles/${req.file.filename}`;
        }
        
        // Find existing alumni record or create new one
        const existingAlumni = await prisma.alumni.findUnique({
          where: { user_id: userId }
        });
        
        if (existingAlumni) {
          updatedAlumni = await prisma.alumni.update({
            where: { user_id: userId },
            data: alumniUpdateData
          });
        } else {
          // Create alumni record if it doesn't exist
          updatedAlumni = await prisma.alumni.create({
            data: {
              user_id: userId,
              email: email || updatedUser.email,
              ...alumniUpdateData
            }
          });
        }
        
        // Format alumni data for response
        updatedAlumni = {
          id: updatedAlumni.id,
          firstName: updatedAlumni.first_name,
          lastName: updatedAlumni.last_name,
          level: updatedAlumni.level,
          course: updatedAlumni.course,
          batch: updatedAlumni.batch,
          graduationYear: updatedAlumni.graduation_year,
          currentPosition: updatedAlumni.current_position,
          current_position: updatedAlumni.current_position,
          company: updatedAlumni.company,
          location: updatedAlumni.location,
          skills: updatedAlumni.skills
        };
      }
    }

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        profile_image: updatedUser.profile_image,
        role: role
      },
      alumni: updatedAlumni
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { currentPassword, newPassword, email } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const emailDomain = email.split('@')[1];
    let user;
    
    if (emailDomain === 'lccbonline.com') {
      user = await prisma.teacher.findUnique({ where: { id: userId } });
    } else {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }

    if (!user || !user.password) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    if (emailDomain === 'lccbonline.com') {
      await prisma.teacher.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
    }

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: error.message || 'Failed to change password' });
  }
});

// Get pending user accounts (Admin only)
router.get('/pending-users', async (req, res) => {
  try {
    const pendingUsers = await prisma.pending_registration.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        email: true,
        username: true,
        created_at: true,
        status: true
      },
      orderBy: { created_at: 'desc' }
    });
    // Add role field for frontend compatibility
    const usersWithRole = pendingUsers.map(user => ({
      ...user,
      role: 'ALUMNI'
    }));
    res.json(usersWithRole);
  } catch (error) {
    console.error('Error fetching pending users:', error);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// Approve or reject user account (Admin only)
router.put('/approve-user/:id', async (req, res) => {
  try {
    const pendingId = parseInt(req.params.id);
    const { action } = req.body; // 'approve' or 'reject'

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const { approveRegistration, rejectRegistration } = require('../services/authService');

    if (action === 'approve') {
      const result = await approveRegistration(pendingId);
      res.json({ 
        message: 'User approved successfully',
        user: {
          id: result.user.id,
          email: result.user.email,
          approval_status: result.user.approval_status
        }
      });
    } else {
      const result = await rejectRegistration(pendingId, 'Registration rejected by admin');
      res.json({ 
        message: 'User rejected successfully'
      });
    }
  } catch (error) {
    console.error('Error updating user approval:', error);
    res.status(500).json({ error: error.message || 'Failed to update user approval' });
  }
});

// Get user notifications
router.get('/notifications/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const notifications = await prisma.notification.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: 20
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Get admin notifications (pending registrations)
// Deprecated - using new notification system
router.get('/admin-notifications', async (req, res) => {
  try {
    // Return empty array for backward compatibility
    res.json([]);
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    await prisma.notification.update({
      where: { id: notificationId },
      data: { is_read: true }
    });
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// Get all users (Admin only)
router.get('/all-users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        username: true,
        profile_image: true,
        role: true,
        approval_status: true,
        is_active: true,
        is_blocked: true,
        created_at: true
      },
      orderBy: {
        created_at: 'desc'
      }
    });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Block/Unblock user (Admin only)
router.put('/users/:userId/block', async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_blocked } = req.body;

    // Prevent blocking teachers/admins
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (user.role === 'TEACHER' || user.role === 'ADMIN') {
      return res.status(403).json({ error: 'Cannot block admin or teacher accounts' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { is_blocked: is_blocked }
    });

    res.json({
      message: `User ${is_blocked ? 'blocked' : 'unblocked'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user block status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Update notification preference
router.put('/notification-preference', async (req, res) => {
  try {
    const { userId, notificationEnabled, promptShown } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const updateData = {};
    if (typeof notificationEnabled !== 'undefined') {
      updateData.notification_enabled = notificationEnabled;
    }
    if (typeof promptShown !== 'undefined') {
      updateData.notification_prompt_shown = promptShown;
    }

    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData
    });

    res.json({
      message: 'Notification preference updated successfully',
      user: {
        id: updatedUser.id,
        notification_enabled: updatedUser.notification_enabled,
        notification_prompt_shown: updatedUser.notification_prompt_shown
      }
    });
  } catch (error) {
    console.error('Error updating notification preference:', error);
    res.status(500).json({ 
      error: 'Failed to update notification preference',
      details: error.message 
    });
  }
});

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;