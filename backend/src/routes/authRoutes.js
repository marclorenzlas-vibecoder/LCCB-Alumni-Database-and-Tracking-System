const express = require('express');
const { registerUser, loginUser, registerTeacher, loginTeacher } = require('../services/authService');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadToSupabase } = require('../services/storageService');
const { authMiddleware, invalidateUserBlockCache, teacherAuthMiddleware } = require('../middleware/auth');
const { broadcastUpdate } = require('../services/realtimeService');
const { buildChangeSet, recordActivity } = require('../services/activityLogService');
const { tryEnter, leave, getLimiterStatus } = require('../services/activeUserLimiter');
const {
  normalizeLevel,
  parseEducationHistory,
  getEducationHistoryWithFallback,
  getEducationHistoryByAlumniIds,
  replaceEducationHistory
} = require('../utils/educationHistory');

const router = express.Router();
const prisma = require('../config/prisma');

const uploadsDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

const PRIVACY_FIELD_MAP = [
  { bodyKeys: ['isStudentIdPublic', 'is_student_id_public'], dbKey: 'is_student_id_public' },
  { bodyKeys: ['isDateOfBirthPublic', 'is_date_of_birth_public'], dbKey: 'is_date_of_birth_public' },
  { bodyKeys: ['isCoursePublic', 'is_course_public'], dbKey: 'is_course_public' },
  { bodyKeys: ['isGraduationYearPublic', 'is_graduation_year_public'], dbKey: 'is_graduation_year_public' },
  { bodyKeys: ['isEducationHistoryPublic', 'is_education_history_public'], dbKey: 'is_education_history_public' },
  { bodyKeys: ['isEmailPublic', 'is_email_public'], dbKey: 'is_email_public' },
  { bodyKeys: ['isPhonePublic', 'is_phone_public'], dbKey: 'is_phone_public' },
  { bodyKeys: ['isPositionPublic', 'is_position_public'], dbKey: 'is_position_public' },
  { bodyKeys: ['isEmploymentPublic', 'is_employment_public'], dbKey: 'is_employment_public' },
  { bodyKeys: ['isCompanyPublic', 'is_company_public'], dbKey: 'is_company_public' },
  { bodyKeys: ['isLocationPublic', 'is_location_public'], dbKey: 'is_location_public' },
  { bodyKeys: ['isSocialLinksPublic', 'is_social_links_public'], dbKey: 'is_social_links_public' },
  { bodyKeys: ['isSkillsPublic', 'is_skills_public'], dbKey: 'is_skills_public' }
];

const parseBooleanFlag = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 1 || value === '1') return true;
  if (value === false || value === 0 || value === '0') return false;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 'yes', 'public'].includes(normalized)) return true;
    if (['false', 'no', 'private'].includes(normalized)) return false;
  }
  return undefined;
};

const BIRTHDAY_NOTIFICATION_VISIBILITY = new Set(['PUBLIC', 'OFF']);

const normalizeBirthdayNotificationVisibility = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 1 || value === '1') return 'PUBLIC';
  if (value === false || value === 0 || value === '0') return 'OFF';
  const normalized = String(value).trim().toUpperCase();
  if (['DISABLED', 'DISABLE', 'NONE', 'PRIVATE'].includes(normalized)) return 'OFF';
  return BIRTHDAY_NOTIFICATION_VISIBILITY.has(normalized) ? normalized : null;
};

const parseRequiredConsent = (value) =>
  value === true || value === 1 || value === '1' || (typeof value === 'string' && value.toLowerCase() === 'true');

const appendPrivacyUpdates = (body, target) => {
  PRIVACY_FIELD_MAP.forEach(({ bodyKeys, dbKey }) => {
    const foundKey = bodyKeys.find((key) => body[key] !== undefined);
    if (!foundKey) return;
    const parsed = parseBooleanFlag(body[foundKey]);
    if (parsed !== undefined) target[dbKey] = parsed;
  });
};

const hasPrivacyInput = (body) =>
  PRIVACY_FIELD_MAP.some(({ bodyKeys }) => bodyKeys.some((key) => body[key] !== undefined));

const PRIVACY_DEFAULTS = {
  is_student_id_public: false,
  is_date_of_birth_public: false,
  is_course_public: true,
  is_graduation_year_public: true,
  is_education_history_public: true,
  is_email_public: false,
  is_phone_public: false,
  is_position_public: false,
  is_company_public: false,
  is_employment_public: false,
  is_location_public: false,
  is_social_links_public: false,
  is_skills_public: false
};

const readPrivacyFlag = (alumni = {}, key) => {
  const raw = alumni[key];
  const parsed = parseBooleanFlag(raw);
  if (parsed !== undefined) return parsed;
  return PRIVACY_DEFAULTS[key] === true;
};

const alumniPrivacyPayload = (alumni = {}) => ({
  isStudentIdPublic: readPrivacyFlag(alumni, 'is_student_id_public'),
  is_student_id_public: readPrivacyFlag(alumni, 'is_student_id_public'),
  isDateOfBirthPublic: readPrivacyFlag(alumni, 'is_date_of_birth_public'),
  is_date_of_birth_public: readPrivacyFlag(alumni, 'is_date_of_birth_public'),
  isCoursePublic: readPrivacyFlag(alumni, 'is_course_public'),
  is_course_public: readPrivacyFlag(alumni, 'is_course_public'),
  isGraduationYearPublic: readPrivacyFlag(alumni, 'is_graduation_year_public'),
  is_graduation_year_public: readPrivacyFlag(alumni, 'is_graduation_year_public'),
  isEducationHistoryPublic: readPrivacyFlag(alumni, 'is_education_history_public'),
  is_education_history_public: readPrivacyFlag(alumni, 'is_education_history_public'),
  isEmailPublic: readPrivacyFlag(alumni, 'is_email_public'),
  is_email_public: readPrivacyFlag(alumni, 'is_email_public'),
  isPhonePublic: readPrivacyFlag(alumni, 'is_phone_public'),
  is_phone_public: readPrivacyFlag(alumni, 'is_phone_public'),
  isPositionPublic: readPrivacyFlag(alumni, 'is_position_public'),
  is_position_public: readPrivacyFlag(alumni, 'is_position_public'),
  isEmploymentPublic: readPrivacyFlag(alumni, 'is_employment_public'),
  is_employment_public: readPrivacyFlag(alumni, 'is_employment_public'),
  isCompanyPublic: readPrivacyFlag(alumni, 'is_company_public'),
  is_company_public: readPrivacyFlag(alumni, 'is_company_public'),
  isLocationPublic: readPrivacyFlag(alumni, 'is_location_public'),
  is_location_public: readPrivacyFlag(alumni, 'is_location_public'),
  isSocialLinksPublic: readPrivacyFlag(alumni, 'is_social_links_public'),
  is_social_links_public: readPrivacyFlag(alumni, 'is_social_links_public'),
  isSkillsPublic: readPrivacyFlag(alumni, 'is_skills_public'),
  is_skills_public: readPrivacyFlag(alumni, 'is_skills_public')
});

// Register route (Alumni/Students only - Gmail)
router.post('/register', async (req, res) => {
  try {
    const { 
      username, email, password, level, course, batch, graduationYear,
      firstName, lastName, studentId, contactNumber,
      consent_core, consentCore, consent_timestamp, consentTimestamp,
      privacy_notice_version, privacyNoticeVersion, profile_visibility
    } = req.body;
    
    console.log('📥 Registration request received:', {
      username, email, firstName, lastName, studentId, contactNumber, level, course, batch, graduationYear
    });
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Please provide username, email, and password' });
    }

    if (!parseRequiredConsent(consent_core ?? consentCore)) {
      return res.status(400).json({ error: 'Data privacy consent is required to create an account' });
    }
    
    // Validate email domain - only allow gmail.com for self-registration
    const emailDomain = email.split('@')[1];
    if (emailDomain !== 'gmail.com') {
      return res.status(400).json({ error: 'Alumni registration is only available for Gmail accounts. Contact admin for teacher accounts.' });
    }
    
    const result = await registerUser({ 
      username, email, password, level, course, batch, graduationYear,
      firstName, lastName, studentId, contactNumber,
      consent_core: consent_core ?? consentCore,
      consent_timestamp: consent_timestamp ?? consentTimestamp,
      privacy_notice_version: privacy_notice_version ?? privacyNoticeVersion,
      profile_visibility
    });
    
    console.log('✅ Registration successful, pending approval');
    // Returns message and status (no token until approved)
    res.status(201).json(result);
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
});

// Login route (Unified for both teachers and alumni)
router.post('/login', async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : req.body.email;
    const { password } = req.body;
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

    const limiterState = tryEnter({ token: result?.token, user: result?.user });
    if (!limiterState.allowed) {
      return res.status(503).json({
        error: 'Server is full right now. Please try again in a few minutes.',
        code: 'SERVER_AT_CAPACITY'
      });
    }

    res.json(result);
  } catch (error) {
    // Check if error message indicates blocked account
    if (error.message && error.message.includes('blocked')) {
      return res.status(403).json({ error: error.message, isBlocked: true });
    }
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Teacher (Admin) register route - Admin only
router.post('/register-teacher', teacherAuthMiddleware, async (req, res) => {
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
router.get('/teachers', teacherAuthMiddleware, async (req, res) => {
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
      createdAt: t.created_at,
      role: 'ADMIN'
    })));
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
});

// Update teacher - Admin only
router.put('/teachers/:id', teacherAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const department = typeof req.body.department === 'string' ? req.body.department.trim() : null;
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    if (!email.endsWith('@lccbonline.com')) {
      return res.status(400).json({ error: 'Teacher email must use @lccbonline.com domain' });
    }

    const oldTeacher = await prisma.teacher.findUnique({
      where: { id: parseInt(id, 10) }
    });

    if (!oldTeacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const updateData = {
      username,
      email,
      department: department || null
    };

    if (password && password.trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const teacher = await prisma.teacher.update({
      where: { id: parseInt(id, 10) },
      data: updateData
    });

    await recordActivity({
      req,
      action: 'UPDATE',
      entityType: 'teacher',
      entityId: teacher.id,
      entityLabel: teacher.email,
      summary: `Updated teacher account "${teacher.email}"`,
      details: {
        changes: buildChangeSet(oldTeacher, teacher, [
          { key: 'username', label: 'Username' },
          { key: 'email', label: 'Email' },
          { key: 'department', label: 'Department' }
        ]).concat(password && password.trim() ? [{ field: 'Password', from: 'Unchanged', to: 'Changed' }] : [])
      }
    });

    res.json({
      id: teacher.id,
      email: teacher.email,
      username: teacher.username,
      department: teacher.department,
      createdAt: teacher.created_at,
      role: 'ADMIN'
    });
  } catch (error) {
    console.error('Error updating teacher:', error);
    res.status(500).json({ error: error.message || 'Failed to update teacher' });
  }
});

// Delete teacher - Admin only
router.delete('/teachers/:id', teacherAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await prisma.teacher.findUnique({
      where: { id: parseInt(id) }
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    await prisma.teacher.delete({
      where: { id: parseInt(id) }
    });
    await recordActivity({
      req,
      action: 'DELETE',
      entityType: 'teacher',
      entityId: Number(id),
      entityLabel: teacher.email,
      summary: `Deleted teacher account "${teacher.email}"`,
      details: {
        deletedRecord: {
          username: teacher.username,
          email: teacher.email,
          department: teacher.department
        }
      }
    });
    res.json({ message: 'Teacher deleted successfully' });
  } catch (error) {
    console.error('Error deleting teacher:', error);
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
});

// Verify School ID - Check if it exists in alumni database
router.get('/verify-student-id/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('🔍 Verifying School ID:', studentId);
    
    // Search for alumni with this student_id
    const alumniRecord = await prisma.alumni.findUnique({
      where: { student_id: studentId },
      select: {
        student_id: true,
        first_name: true,
        last_name: true,
        graduation_year: true,
        course: true,
        batch: true,
        level: true
      }
    });
    
    if (alumniRecord) {
      console.log('✅ School ID found in alumni database:', alumniRecord);
      res.json({
        verified: true,
        message: 'School ID found in alumni records',
        alumni: alumniRecord
      });
    } else {
      console.log('⚠️ School ID not found in alumni database');
      res.json({
        verified: false,
        message: 'School ID not found in alumni records'
      });
    }
  } catch (error) {
    console.error('❌ Error verifying School ID:', error);
    res.status(500).json({ error: 'Failed to verify School ID' });
  }
});

// Get pending registrations - Admin only
router.get('/pending-registrations', teacherAuthMiddleware, async (req, res) => {
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
router.post('/approve-registration/:id', teacherAuthMiddleware, async (req, res) => {
  try {
    const { approveRegistration } = require('../services/authService');
    const result = await approveRegistration(parseInt(req.params.id));
    await recordActivity({
      req,
      action: 'APPROVE',
      entityType: 'registration',
      entityId: result.user?.id,
      entityLabel: result.user?.email || result.alumni?.email || `Registration #${req.params.id}`,
      summary: `Approved registration for ${result.user?.email || result.alumni?.email || `request #${req.params.id}`}`,
      details: {
        pendingRegistrationId: Number(req.params.id),
        alumniId: result.alumni?.id || null,
        userId: result.user?.id || null
      }
    });
    res.json(result);
  } catch (error) {
    console.error('Error approving registration:', error);
    res.status(500).json({ error: error.message || 'Failed to approve registration' });
  }
});

// Reject registration - Admin only
router.post('/reject-registration/:id', teacherAuthMiddleware, async (req, res) => {
  try {
    console.log('📥 Reject registration request received:', req.params.id);
    console.log('Rejection reason:', req.body.reason);
    
    const { rejectRegistration } = require('../services/authService');
    const { reason } = req.body;
    
    if (!reason || !reason.trim()) {
      console.log('❌ Rejection failed: No reason provided');
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const pendingRegistration = await prisma.pending_registration.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, email: true, username: true }
    });

    const result = await rejectRegistration(parseInt(req.params.id), reason);
    await recordActivity({
      req,
      action: 'REJECT',
      entityType: 'registration',
      entityId: pendingRegistration?.id || Number(req.params.id),
      entityLabel: pendingRegistration?.email || pendingRegistration?.username || `Registration #${req.params.id}`,
      summary: `Rejected registration for ${pendingRegistration?.email || pendingRegistration?.username || `request #${req.params.id}`}`,
      details: {
        reason,
        pendingRegistrationId: Number(req.params.id)
      }
    });
    console.log('✅ Registration rejected successfully');
    res.json(result);
  } catch (error) {
    console.error('❌ Error rejecting registration:', error);
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

      const limiterState = tryEnter({ token, user: { id: user.id, role: 'ALUMNI' } });
      if (!limiterState.allowed) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3002';
        const redirectUrl = `${frontendUrl}/login?error=server_capacity`;
        return res.redirect(redirectUrl);
      }

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

// Lightweight session validation for active clients (enforces block status via authMiddleware).
router.get('/session-status', authMiddleware, async (req, res) => {
  try {
    const userId = Number(req.user?.id);
    const tokenRole = String(req.user?.role || '').toUpperCase();

    if (!userId || !Number.isFinite(userId)) {
      return res.status(401).json({ error: 'Invalid session' });
    }

    const teacher = await prisma.teacher.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        profile_image: true
      }
    });

    if (teacher) {
      return res.json({
        ok: true,
        is_blocked: false,
        user: {
          id: teacher.id,
          email: teacher.email,
          username: teacher.username,
          role: tokenRole === 'ADMIN' ? 'ADMIN' : 'TEACHER',
          profile_image: teacher.profile_image,
          approval_status: 'APPROVED',
          is_active: true,
          is_blocked: false
        }
      });
    }

    const pendingUser = await prisma.pending_registration.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        profile_image: true,
        status: true
      }
    });

    if (pendingUser) {
      return res.json({
        ok: true,
        is_blocked: false,
        user: {
          id: pendingUser.id,
          email: pendingUser.email,
          username: pendingUser.username,
          role: 'ALUMNI',
          profile_image: pendingUser.profile_image,
          approval_status: pendingUser.status || 'PENDING',
          is_active: pendingUser.status === 'APPROVED',
          is_blocked: false
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        profile_image: true,
        approval_status: true,
        is_active: true,
        is_blocked: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.is_blocked) {
      return res.status(403).json({
        error: 'Your account has been blocked. Please contact the administrator for assistance.',
        code: 'ACCOUNT_BLOCKED'
      });
    }

    res.json({
      ok: true,
      is_blocked: false,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile_image: user.profile_image,
        approval_status: user.approval_status,
        is_active: user.is_active,
        is_blocked: user.is_blocked
      }
    });
  } catch (error) {
    console.error('Session status error:', error);
    res.status(500).json({ error: 'Failed to validate session' });
  }
});

router.post('/logout', authMiddleware, async (req, res) => {
  leave({ token: req.authToken, user: req.user });

  // JWT clients (web/mobile) may not have an express-session object.
  if (!req.session) {
    return res.json({ success: true, message: 'Logged out successfully' });
  }

  req.logout?.((logoutError) => {
    if (logoutError) {
      console.error('Passport logout error:', logoutError);
    }

    req.session.destroy((destroyError) => {
      if (destroyError) {
        console.error('Session destroy error:', destroyError);
      }

      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
});

router.get('/active-users', authMiddleware, (req, res) => {
  if (!req.user?.role || req.user.role.toUpperCase() !== 'TEACHER') {
    return res.status(403).json({ error: 'Access denied. Teacher privileges required.' });
  }

  res.json(getLimiterStatus());
});
const canAccessAccountRecord = (req, userId) => {
  const requesterId = Number(req.user?.id);
  const requesterRole = String(req.user?.role || '').toUpperCase();
  const isStaff = requesterRole === 'TEACHER' || requesterRole === 'ADMIN';
  return isStaff || requesterId === Number(userId);
};

// Get user profile with alumni data
router.get('/profile/:id', authMiddleware, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    const userId = parseInt(req.params.id);

    if (!canAccessAccountRecord(req, userId)) {
      return res.status(403).json({ error: 'You can only view your own profile' });
    }
    
    // Check if user is a teacher or regular user
    const teacher = await prisma.teacher.findUnique({
      where: { id: userId }
    });
    
    const user = teacher || await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Fetch alumni data if user has one
    let alumni = null;
    if (user.id) {
      alumni = await prisma.alumni.findFirst({
        where: { 
          OR: [
            { user_id: user.id },
            { email: user.email }
          ]
        }
      });

      if (alumni) {
        const historyByAlumniId = await getEducationHistoryByAlumniIds(prisma, [alumni.id]);
        const history = getEducationHistoryWithFallback(alumni, historyByAlumniId.get(alumni.id) || []);
        alumni = {
          ...alumni,
          education_history: history,
          educationHistory: history
        };
      }
    }
    
    const role = teacher ? 'TEACHER' : (user.role || 'ALUMNI');
    
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      department: user.department || null,
      profile_image: user.profile_image,
      role: role,
      teacherRole: teacher ? (teacher.role || 'TEACHER') : null,
      approval_status: user.approval_status || 'APPROVED',
      is_active: typeof user.is_active === 'boolean' ? user.is_active : true,
      is_blocked: typeof user.is_blocked === 'boolean' ? user.is_blocked : false,
      alumni: alumni ? {
        id: alumni.id,
        studentId: alumni.student_id,
        student_id: alumni.student_id,
        firstName: alumni.first_name,
        first_name: alumni.first_name,
        middleName: alumni.middle_name,
        middle_name: alumni.middle_name,
        lastName: alumni.last_name,
        last_name: alumni.last_name,
        level: alumni.level,
        course: alumni.course,
        batch: alumni.batch,
        graduationYear: alumni.graduation_year,
        graduation_year: alumni.graduation_year,
        currentPosition: alumni.current_position,
        current_position: alumni.current_position,
        company: alumni.company,
        location: alumni.location,
        contactNumber: alumni.contact_number,
        contact_number: alumni.contact_number,
        skills: alumni.skills,
        ...alumniPrivacyPayload(alumni),
        dateOfBirth: alumni.date_of_birth || null,
        date_of_birth: alumni.date_of_birth || null,
        educationHistory: alumni.educationHistory || [],
        education_history: alumni.education_history || []
      } : null
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});
// Update user profile (username and profile image)
router.put('/profile/:id', authMiddleware, upload.single('profileImage'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, department, firstName, middleName, lastName, studentId, level, course, batch, graduationYear, currentPosition, company, location, contactNumber, skills, dateOfBirth, date_of_birth } = req.body;
    const parsedEducationHistory = parseEducationHistory(
      req.body.educationHistory ?? req.body.education_history
    );
    const hasEducationHistoryInput =
      req.body.educationHistory !== undefined || req.body.education_history !== undefined;
    const primaryEducation = parsedEducationHistory.length > 0
      ? parsedEducationHistory[parsedEducationHistory.length - 1]
      : null;
    const normalizedUsername = typeof username === 'string' ? username.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    const hasPrivacyUpdate = hasPrivacyInput(req.body);
    
    const updateData = {};
    if (normalizedUsername) updateData.username = normalizedUsername;
    if (normalizedEmail) updateData.email = normalizedEmail;
    if (req.file) {
      updateData.profile_image = await uploadToSupabase(req.file, 'profiles');
    }

    // Check if user is teacher or regular user
    const emailDomain = normalizedEmail ? normalizedEmail.split('@')[1] : null;
    const isTeacherProfile = emailDomain === 'lccbonline.com';
    const oldPrimaryRecord = isTeacherProfile
      ? await prisma.teacher.findUnique({ where: { id: userId } })
      : await prisma.user.findUnique({ where: { id: userId } });
    
    let updatedUser;
    let updatedAlumni = null;
    let role;
    
    if (emailDomain === 'lccbonline.com') {
      // Update teacher table
      const teacherUpdateData = { ...updateData };
      if (department !== undefined) {
        teacherUpdateData.department = department && department.trim() ? department.trim() : null;
      }

      updatedUser = await prisma.teacher.update({
        where: { id: userId },
        data: teacherUpdateData
      });
      role = 'TEACHER';
      
      // Also sync alumni information for teachers if profile fields, username/email, or image changed
      if (firstName || lastName || middleName || level || course || batch || graduationYear || currentPosition || company || location || contactNumber !== undefined || skills || dateOfBirth !== undefined || date_of_birth !== undefined || normalizedUsername || normalizedEmail || req.file || hasEducationHistoryInput || hasPrivacyUpdate) {
        const alumniUpdateData = {};
        if (firstName && firstName.trim()) alumniUpdateData.first_name = firstName.trim();
        if (middleName !== undefined) alumniUpdateData.middle_name = middleName && middleName.trim() ? middleName.trim() : null;
        if (lastName && lastName.trim()) alumniUpdateData.last_name = lastName.trim();
        if (level !== undefined) alumniUpdateData.level = normalizeLevel(level);
        else if (hasEducationHistoryInput) alumniUpdateData.level = primaryEducation?.level ?? null;
        if (course !== undefined) alumniUpdateData.course = course && course.trim() ? course.trim() : null;
        if (batch !== undefined) {
          const parsedBatch = parseInt(batch, 10);
          alumniUpdateData.batch = Number.isNaN(parsedBatch) ? null : parsedBatch;
        } else if (hasEducationHistoryInput) {
          alumniUpdateData.batch = primaryEducation?.batch ?? null;
        }
        if (graduationYear !== undefined) {
          const parsedYear = parseInt(graduationYear, 10);
          alumniUpdateData.graduation_year = Number.isNaN(parsedYear) ? null : parsedYear;
        } else if (hasEducationHistoryInput) {
          alumniUpdateData.graduation_year = primaryEducation?.graduationYear ?? null;
        }
        if (currentPosition !== undefined) alumniUpdateData.current_position = currentPosition && currentPosition.trim() ? currentPosition.trim() : null;
        if (company !== undefined) alumniUpdateData.company = company && company.trim() ? company.trim() : null;
        if (contactNumber !== undefined) alumniUpdateData.contact_number = contactNumber && String(contactNumber).trim() ? String(contactNumber).trim() : null;
        if (dateOfBirth !== undefined || date_of_birth !== undefined) {
          const dobValue = dateOfBirth !== undefined ? dateOfBirth : date_of_birth;
          const parsedDob = dobValue ? new Date(dobValue) : null;
          alumniUpdateData.date_of_birth = parsedDob instanceof Date && !Number.isNaN(parsedDob.getTime()) ? parsedDob : null;
        }
        if (location !== undefined) alumniUpdateData.location = location && location.trim() ? location.trim() : null;
        if (skills !== undefined) alumniUpdateData.skills = skills && skills.trim() ? skills.trim() : null;
        if (normalizedEmail) alumniUpdateData.email = normalizedEmail;
        appendPrivacyUpdates(req.body, alumniUpdateData);
        
        // If username changed and firstName/lastName were not provided, split username for display
        if (normalizedUsername && !alumniUpdateData.first_name && !alumniUpdateData.last_name) {
          const parts = normalizedUsername.split(/\s+/).filter(Boolean);
          if (parts.length) {
            alumniUpdateData.first_name = parts[0];
            if (parts.slice(1).join(' ')) {
              alumniUpdateData.last_name = parts.slice(1).join(' ');
            }
          }
        }
        if (req.file) {
          alumniUpdateData.profile_image = updateData.profile_image;
        }

        const teacherEmail = normalizedEmail || updatedUser.email;
        
        // First, try to find alumni linked to THIS user
        let existingAlumni = await prisma.alumni.findFirst({
          where: { user_id: userId }
        });

        // If not found by user_id, try to find by email (but only if it has no user_id)
        if (!existingAlumni) {
          const alumniByEmail = await prisma.alumni.findFirst({
            where: { email: teacherEmail }
          });
          
          // Only use the email-based alumni if it's not linked to another user
          if (alumniByEmail && !alumniByEmail.user_id) {
            existingAlumni = alumniByEmail;
          }
        }

        if (existingAlumni) {
          // Only set user_id if it's not already set
          const updateData = {
            ...alumniUpdateData,
            email: teacherEmail,
            user_id: null
          };
          
          updatedAlumni = await prisma.alumni.update({
            where: { id: existingAlumni.id },
            data: updateData
          });
        } else {
          // alumni.first_name and alumni.last_name are required in schema
          const nameParts = (updatedUser.username || '').trim().split(/\s+/).filter(Boolean);
          const fallbackFirstName = nameParts[0] || 'Teacher';
          const fallbackLastName = nameParts.slice(1).join(' ') || 'Account';

          updatedAlumni = await prisma.alumni.create({
            data: {
              email: teacherEmail,
              first_name: alumniUpdateData.first_name || fallbackFirstName,
              last_name: alumniUpdateData.last_name || fallbackLastName,
              middle_name: alumniUpdateData.middle_name ?? null,
              level: alumniUpdateData.level,
              batch: alumniUpdateData.batch,
              graduation_year: alumniUpdateData.graduation_year,
              course: alumniUpdateData.course,
              current_position: alumniUpdateData.current_position,
              company: alumniUpdateData.company,
              location: alumniUpdateData.location,
              contact_number: alumniUpdateData.contact_number,
              ...PRIVACY_DEFAULTS,
              ...PRIVACY_FIELD_MAP.reduce((acc, { dbKey }) => {
                if (alumniUpdateData[dbKey] !== undefined) acc[dbKey] = alumniUpdateData[dbKey];
                return acc;
              }, {}),
              ...(alumniUpdateData.is_employment_public !== undefined && { is_employment_public: alumniUpdateData.is_employment_public }),
              skills: alumniUpdateData.skills,
              profile_image: alumniUpdateData.profile_image,
              date_of_birth: alumniUpdateData.date_of_birth ?? null
            }
          });
        }
        
        updatedAlumni = {
          id: updatedAlumni.id,
          studentId: updatedAlumni.student_id,
          student_id: updatedAlumni.student_id,
          firstName: updatedAlumni.first_name,
          middleName: updatedAlumni.middle_name,
          lastName: updatedAlumni.last_name,
          level: updatedAlumni.level,
          course: updatedAlumni.course,
          batch: updatedAlumni.batch,
          graduationYear: updatedAlumni.graduation_year,
          currentPosition: updatedAlumni.current_position,
          current_position: updatedAlumni.current_position,
          company: updatedAlumni.company,
          location: updatedAlumni.location,
          contactNumber: updatedAlumni.contact_number,
          contact_number: updatedAlumni.contact_number,
          dateOfBirth: updatedAlumni.date_of_birth || null,
          date_of_birth: updatedAlumni.date_of_birth || null,
          ...alumniPrivacyPayload(updatedAlumni),
          skills: updatedAlumni.skills
        };
      }
    } else {
      // Update user table
      updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
      role = updatedUser.role || 'ALUMNI';
      
      // Sync alumni information when any profile, username/email, or image changed
      if (firstName || lastName || middleName || studentId !== undefined || level || course || batch || graduationYear || currentPosition || company || location || contactNumber !== undefined || skills || normalizedUsername || normalizedEmail || req.file || hasEducationHistoryInput || hasPrivacyUpdate) {
        const alumniUpdateData = {};
        if (firstName && firstName.trim()) alumniUpdateData.first_name = firstName.trim();
        if (middleName !== undefined) alumniUpdateData.middle_name = middleName && middleName.trim() ? middleName.trim() : null;
        if (lastName && lastName.trim()) alumniUpdateData.last_name = lastName.trim();
        if (studentId !== undefined) alumniUpdateData.student_id = studentId && String(studentId).trim() ? String(studentId).trim() : null;
        if (level !== undefined) alumniUpdateData.level = normalizeLevel(level);
        else if (hasEducationHistoryInput) alumniUpdateData.level = primaryEducation?.level ?? null;
        if (course !== undefined) alumniUpdateData.course = course && course.trim() ? course.trim() : null;
        if (batch !== undefined) {
          const parsedBatch = parseInt(batch, 10);
          alumniUpdateData.batch = Number.isNaN(parsedBatch) ? null : parsedBatch;
        } else if (hasEducationHistoryInput) {
          alumniUpdateData.batch = primaryEducation?.batch ?? null;
        }
        if (graduationYear !== undefined) {
          const parsedYear = parseInt(graduationYear, 10);
          alumniUpdateData.graduation_year = Number.isNaN(parsedYear) ? null : parsedYear;
        } else if (hasEducationHistoryInput) {
          alumniUpdateData.graduation_year = primaryEducation?.graduationYear ?? null;
        }
        if (currentPosition !== undefined) alumniUpdateData.current_position = currentPosition && currentPosition.trim() ? currentPosition.trim() : null;
        if (company !== undefined) alumniUpdateData.company = company && company.trim() ? company.trim() : null;
        if (contactNumber !== undefined) alumniUpdateData.contact_number = contactNumber && String(contactNumber).trim() ? String(contactNumber).trim() : null;
        if (dateOfBirth !== undefined || date_of_birth !== undefined) {
          const dobValue = dateOfBirth !== undefined ? dateOfBirth : date_of_birth;
          const parsedDob = dobValue ? new Date(dobValue) : null;
          alumniUpdateData.date_of_birth = parsedDob instanceof Date && !Number.isNaN(parsedDob.getTime()) ? parsedDob : null;
        }
        if (location !== undefined) alumniUpdateData.location = location && location.trim() ? location.trim() : null;
        if (skills !== undefined) alumniUpdateData.skills = skills && skills.trim() ? skills.trim() : null;
        if (normalizedEmail) alumniUpdateData.email = normalizedEmail;
        appendPrivacyUpdates(req.body, alumniUpdateData);
        
        // If username changed and firstName/lastName were not provided, split username for display
        if (normalizedUsername && !alumniUpdateData.first_name && !alumniUpdateData.last_name) {
          const parts = normalizedUsername.split(/\s+/).filter(Boolean);
          if (parts.length) {
            alumniUpdateData.first_name = parts[0];
            if (parts.slice(1).join(' ')) {
              alumniUpdateData.last_name = parts.slice(1).join(' ');
            }
          }
        }
        // Also update profile_image in alumni table when user uploads new image
        if (req.file) {
          alumniUpdateData.profile_image = updateData.profile_image;
        }
        
        // Find existing alumni record by user_id or email (user_id is preferred but may not exist)
        let existingAlumni = await prisma.alumni.findUnique({
          where: { user_id: userId }
        });
        
        // If not found by user_id, try looking up by email
        if (!existingAlumni && (normalizedEmail || updatedUser.email)) {
          const lookupEmail = normalizedEmail || updatedUser.email;
          existingAlumni = await prisma.alumni.findFirst({
            where: { email: lookupEmail }
          });
        }
        
        if (existingAlumni) {
          // Update existing alumni record
          const updatePayload = {
            ...alumniUpdateData
          };

          if (!existingAlumni.user_id) {
            updatePayload.user_id = userId;
          }

          updatedAlumni = await prisma.alumni.update({
            where: { id: existingAlumni.id },
            data: updatePayload
          });
        } else {
          // Create alumni record if it doesn't exist
          updatedAlumni = await prisma.alumni.create({
            data: {
              user_id: userId,
              email: normalizedEmail || updatedUser.email,
              ...PRIVACY_DEFAULTS,
              ...alumniUpdateData
            }
          });
        }
        updatedAlumni = {
          id: updatedAlumni.id,
          studentId: updatedAlumni.student_id,
          student_id: updatedAlumni.student_id,
          firstName: updatedAlumni.first_name,
          middleName: updatedAlumni.middle_name,
          lastName: updatedAlumni.last_name,
          level: updatedAlumni.level,
          course: updatedAlumni.course,
          batch: updatedAlumni.batch,
          graduationYear: updatedAlumni.graduation_year,
          currentPosition: updatedAlumni.current_position,
          current_position: updatedAlumni.current_position,
          company: updatedAlumni.company,
          location: updatedAlumni.location,
          contactNumber: updatedAlumni.contact_number,
          contact_number: updatedAlumni.contact_number,
          dateOfBirth: updatedAlumni.date_of_birth || null,
          date_of_birth: updatedAlumni.date_of_birth || null,
          ...alumniPrivacyPayload(updatedAlumni),
          skills: updatedAlumni.skills
        };

        // Sync alumni_list table so the alumni directory reflects name changes
        try {
          const syncData = {};
          if (updatedAlumni.firstName) syncData.first_name = updatedAlumni.firstName;
          if (updatedAlumni.lastName) syncData.last_name = updatedAlumni.lastName;
          if (updatedAlumni.studentId) syncData.student_id = updatedAlumni.studentId;
          if (updatedAlumni.level) syncData.level = updatedAlumni.level;
          if (updatedAlumni.course) syncData.course = updatedAlumni.course;
          if (updatedAlumni.batch) syncData.batch = updatedAlumni.batch;
          if (updatedAlumni.graduationYear) syncData.graduation_year = updatedAlumni.graduationYear;

          if (Object.keys(syncData).length > 0) {
            const existingList = await prisma.alumni_list.findFirst({
              where: { student_id: updatedAlumni.studentId }
            });
            if (existingList) {
              await prisma.alumni_list.update({
                where: { id: existingList.id },
                data: syncData
              });
            }
          }
        } catch (syncErr) {
          console.warn('Failed to sync alumni_list:', syncErr?.message || syncErr);
        }
      }
    }

    if (updatedAlumni?.id && hasEducationHistoryInput && parsedEducationHistory.length > 0) {
      await replaceEducationHistory(prisma, updatedAlumni.id, parsedEducationHistory);
    }

    if (updatedAlumni?.id) {
      const historyByAlumniId = await getEducationHistoryByAlumniIds(prisma, [updatedAlumni.id]);
      const history = getEducationHistoryWithFallback(updatedAlumni, historyByAlumniId.get(updatedAlumni.id) || []);
      updatedAlumni = {
        ...updatedAlumni,
        educationHistory: history,
        education_history: history
      };
    }

    broadcastUpdate('profile.updated', {
      userId: updatedUser.id,
      alumniId: updatedAlumni?.id || null,
      username: updatedUser.username,
      email: updatedUser.email
    });

    if (updatedAlumni?.id) {
      broadcastUpdate('alumni.updated', {
        alumniId: updatedAlumni.id,
        userId: updatedUser.id
      });
    }

    await recordActivity({
      req,
      action: 'UPDATE',
      entityType: role === 'TEACHER' ? 'teacher_profile' : 'user_profile',
      entityId: updatedUser.id,
      entityLabel: updatedUser.email || updatedUser.username,
      summary: `Updated ${role === 'TEACHER' ? 'teacher' : 'user'} profile "${updatedUser.email || updatedUser.username}"`,
      details: {
        changes: buildChangeSet(oldPrimaryRecord, updatedUser, [
          { key: 'username', label: 'Username' },
          { key: 'email', label: 'Email' },
          { key: 'department', label: 'Department' },
          { key: 'profile_image', label: 'Profile Image' }
        ])
      }
    });

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        profile_image: updatedUser.profile_image,
        role: role,
        approval_status: updatedUser.approval_status || 'APPROVED',
        is_active: typeof updatedUser.is_active === 'boolean' ? updatedUser.is_active : true
      },
      alumni: updatedAlumni
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

// Change password
router.put('/change-password/:id', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { currentPassword, newPassword, email } = req.body;

    if (!canAccessAccountRecord(req, userId)) {
      return res.status(403).json({ error: 'You can only change your own password' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    const emailDomain = String(email || req.user?.email || '').split('@')[1];
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
router.get('/pending-users', teacherAuthMiddleware, async (req, res) => {
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
router.put('/approve-user/:id', teacherAuthMiddleware, async (req, res) => {
  try {
    const pendingId = parseInt(req.params.id);
    const { action } = req.body; // 'approve' or 'reject'

    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const { approveRegistration, rejectRegistration } = require('../services/authService');
    const pendingRegistration = await prisma.pending_registration.findUnique({
      where: { id: pendingId },
      select: { id: true, email: true, username: true }
    });

    if (action === 'approve') {
      const result = await approveRegistration(pendingId);
      await recordActivity({
        req,
        action: 'APPROVE',
        entityType: 'registration',
        entityId: result.user?.id,
        entityLabel: result.user?.email || pendingRegistration?.email || `Registration #${pendingId}`,
        summary: `Approved registration for ${result.user?.email || pendingRegistration?.email || `request #${pendingId}`}`,
        details: {
          pendingRegistrationId: pendingId,
          alumniId: result.alumni?.id || null,
          userId: result.user?.id || null
        }
      });
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
      await recordActivity({
        req,
        action: 'REJECT',
        entityType: 'registration',
        entityId: pendingRegistration?.id || pendingId,
        entityLabel: pendingRegistration?.email || pendingRegistration?.username || `Registration #${pendingId}`,
        summary: `Rejected registration for ${pendingRegistration?.email || pendingRegistration?.username || `request #${pendingId}`}`,
        details: {
          reason: 'Registration rejected by admin',
          pendingRegistrationId: pendingId
        }
      });
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
router.get('/notifications/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const requesterId = Number(req.user?.id);
    const requesterRole = String(req.user?.role || '').toUpperCase();
    const isStaff = requesterRole === 'TEACHER' || requesterRole === 'ADMIN';

    if (!isStaff && requesterId !== userId) {
      return res.status(403).json({ error: 'You can only view your own notifications' });
    }

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
router.get('/admin-notifications', teacherAuthMiddleware, async (req, res) => {
  try {
    // Return empty array for backward compatibility
    res.json([]);
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// Mark notification as read
router.put('/notifications/:id/read', authMiddleware, async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId },
      select: { user_id: true }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    const requesterId = Number(req.user?.id);
    const requesterRole = String(req.user?.role || '').toUpperCase();
    const isStaff = requesterRole === 'TEACHER' || requesterRole === 'ADMIN';

    if (!isStaff && requesterId !== notification.user_id) {
      return res.status(403).json({ error: 'You can only update your own notifications' });
    }

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
router.get('/all-users', teacherAuthMiddleware, async (req, res) => {
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
router.put('/users/:userId/block', teacherAuthMiddleware, async (req, res) => {
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

    const parsedUserId = parseInt(userId, 10);
    const updatedUser = await prisma.user.update({
      where: { id: parsedUserId },
      data: { is_blocked: is_blocked }
    });

    invalidateUserBlockCache(parsedUserId);

    // Notify connected clients to refresh / force logout immediately if needed.
    broadcastUpdate('user.blocked', {
      userId: updatedUser.id,
      is_blocked: Boolean(updatedUser.is_blocked)
    });
    broadcastUpdate('profile.updated', { userId: updatedUser.id });

    await recordActivity({
      req,
      action: is_blocked ? 'BLOCK' : 'UNBLOCK',
      entityType: 'user',
      entityId: updatedUser.id,
      entityLabel: updatedUser.email || updatedUser.username,
      summary: `${is_blocked ? 'Blocked' : 'Unblocked'} user "${updatedUser.email || updatedUser.username}"`,
      details: {
        changes: buildChangeSet(user, updatedUser, [
          { key: 'is_blocked', label: 'Blocked Status' }
        ])
      }
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

// Get notification preferences
router.get('/notification-preference/:userId', authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Valid User ID is required' });
    }

    const requesterId = Number(req.user?.id);
    const requesterRole = String(req.user?.role || '').toUpperCase();
    const isStaff = requesterRole === 'TEACHER' || requesterRole === 'ADMIN';

    if (!isStaff && requesterId !== userId) {
      return res.status(403).json({ error: 'You can only view your own notification preferences' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        notification_enabled: true,
        notification_prompt_shown: true,
        notify_events: true,
        notify_achievements: true,
        notify_donations: true,
        notify_jobs: true,
        show_donation_toasts: true,
        notify_pending_registrations: true,
        notify_job_applications: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let birthdayNotificationVisibility = 'PUBLIC';
    try {
      const birthdayRows = await prisma.$queryRaw`
        SELECT birthday_notification_visibility
        FROM "user"
        WHERE id = ${userId}
        LIMIT 1
      `;
      birthdayNotificationVisibility =
        normalizeBirthdayNotificationVisibility(birthdayRows?.[0]?.birthday_notification_visibility) || 'PUBLIC';
    } catch (visibilityError) {
      console.warn('Birthday notification visibility column not available yet:', visibilityError.message);
    }

    res.json({
      ...user,
      birthday_notification_visibility: birthdayNotificationVisibility
    });
  } catch (error) {
    console.error('Error fetching notification preference:', error);
    res.status(500).json({ error: 'Failed to fetch notification preference' });
  }
});

// Update notification preference
router.put('/notification-preference', authMiddleware, async (req, res) => {
  try {
    const {
      userId,
      notificationEnabled,
      promptShown,
      notifyEvents,
      notifyAchievements,
      notifyDonations,
      notifyJobs,
      showDonationToasts,
      birthdayNotificationVisibility,
      birthday_notification_visibility,
      notifyPendingRegistrations,
      notifyJobApplications
    } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const parsedUserId = parseInt(userId);
    const requesterId = Number(req.user?.id);
    const requesterRole = String(req.user?.role || '').toUpperCase();
    const isStaff = requesterRole === 'TEACHER' || requesterRole === 'ADMIN';

    if (!isStaff && requesterId !== parsedUserId) {
      return res.status(403).json({ error: 'You can only update your own notification preferences' });
    }

    const normalizedBirthdayVisibility = normalizeBirthdayNotificationVisibility(
      birthdayNotificationVisibility !== undefined
        ? birthdayNotificationVisibility
        : birthday_notification_visibility
    );
    if (normalizedBirthdayVisibility === null) {
      return res.status(400).json({ error: 'Birthday notification must be On or Off' });
    }

    const updateData = {};
    if (typeof notificationEnabled !== 'undefined') {
      updateData.notification_enabled = notificationEnabled;
    }
    if (typeof promptShown !== 'undefined') {
      updateData.notification_prompt_shown = promptShown;
    }
    if (typeof notifyEvents !== 'undefined') {
      updateData.notify_events = notifyEvents;
    }
    if (typeof notifyAchievements !== 'undefined') {
      updateData.notify_achievements = notifyAchievements;
    }
    if (typeof notifyDonations !== 'undefined') {
      updateData.notify_donations = notifyDonations;
    }
    if (typeof notifyJobs !== 'undefined') {
      updateData.notify_jobs = notifyJobs;
    }
    if (typeof showDonationToasts !== 'undefined') {
      updateData.show_donation_toasts = showDonationToasts;
    }
    if (typeof notifyPendingRegistrations !== 'undefined') {
      updateData.notify_pending_registrations = notifyPendingRegistrations;
    }
    if (typeof notifyJobApplications !== 'undefined') {
      updateData.notify_job_applications = notifyJobApplications;
    }

    // Check if user exists first
    const existingUser = await prisma.user.findUnique({
      where: { id: parsedUserId }
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: parsedUserId },
      data: updateData
    });

    if (normalizedBirthdayVisibility !== undefined) {
      try {
        await prisma.$executeRaw`
          UPDATE "user"
          SET birthday_notification_visibility = ${normalizedBirthdayVisibility}
          WHERE id = ${parsedUserId}
        `;
      } catch (visibilityError) {
        console.error('Error updating birthday notification visibility:', visibilityError);
        return res.status(500).json({
          error: 'Failed to update birthday notification visibility. Please run backend/prisma/add_birthday_notification_visibility.sql first.'
        });
      }
    }

    let savedBirthdayNotificationVisibility = normalizedBirthdayVisibility;
    if (savedBirthdayNotificationVisibility === undefined) {
      try {
        const savedRows = await prisma.$queryRaw`
          SELECT birthday_notification_visibility
          FROM "user"
          WHERE id = ${parsedUserId}
          LIMIT 1
        `;
        savedBirthdayNotificationVisibility =
          normalizeBirthdayNotificationVisibility(savedRows?.[0]?.birthday_notification_visibility) || 'PUBLIC';
      } catch {
        savedBirthdayNotificationVisibility = 'PUBLIC';
      }
    }

    res.json({
      message: 'Notification preference updated successfully',
      user: {
        ...updatedUser,
        birthday_notification_visibility: savedBirthdayNotificationVisibility || 'PUBLIC'
      }
    });
  } catch (error) {
    console.error('Error updating notification preference:', error);
    res.status(500).json({ error: 'Failed to update notification preference' });
  }
});

// Health check route
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
