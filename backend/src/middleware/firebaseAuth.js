/**
 * Firebase Authentication Middleware
 * Replaces JWT/Session-based auth with Firebase Auth
 */

const { auth } = require('../config/firebase');
const { getUser } = require('../services/firestoreService');

/**
 * Verify Firebase ID Token
 * Middleware to authenticate requests using Firebase tokens
 */
const authenticateFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const idToken = authHeader.slice(7); // Remove 'Bearer ' prefix

    // Verify the token with Firebase
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Get user data from Firestore
    const user = await getUser(uid);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user is blocked/inactive
    if (user.isBlocked || !user.isActive) {
      return res.status(403).json({ error: 'User account is inactive or blocked' });
    }

    // Attach user info to request
    req.user = {
      uid,
      email: user.email,
      role: user.role,
      ...user,
    };

    next();
  } catch (error) {
    console.error('Firebase authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Require specific user role
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
const requireAdmin = requireRole(['ADMIN']);

/**
 * Staff-only middleware
 */
const requireStaff = requireRole(['ADMIN', 'STAFF']);

/**
 * Alumni-only middleware
 */
const requireAlumni = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ALUMNI' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Alumni access required' });
  }

  next();
};

/**
 * Optional authentication (doesn't fail if no token, but verifies if present)
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.slice(7);
      const decodedToken = await auth.verifyIdToken(idToken);
      const user = await getUser(decodedToken.uid);
      
      if (user) {
        req.user = {
          uid: decodedToken.uid,
          email: user.email,
          role: user.role,
          ...user,
        };
      }
    }

    next();
  } catch (error) {
    console.warn('Optional auth failed, continuing without authentication');
    next();
  }
};

/**
 * Extract user from token without strict validation
 * (for public endpoints that want to track authenticated users)
 */
const softAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers['x-access-token'];
    
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      const decodedToken = await auth.verifyIdToken(token);
      const user = await getUser(decodedToken.uid);
      
      if (user) {
        req.user = {
          uid: decodedToken.uid,
          email: user.email,
          role: user.role,
          ...user,
        };
      }
    }

    next();
  } catch (error) {
    // Don't fail on soft auth
    next();
  }
};

/**
 * Create custom claims for user (for role-based access control)
 * Note: Must be called from backend with admin SDK
 */
const setCustomUserClaims = async (uid, claims) => {
  try {
    await auth.setCustomUserClaims(uid, claims);
    return { success: true };
  } catch (error) {
    console.error('Error setting custom claims:', error);
    throw error;
  }
};

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return null;
    }
    throw error;
  }
};

/**
 * Create user with email and password
 */
const createUserWithPassword = async (email, password) => {
  try {
    return await auth.createUser({
      email,
      password,
      emailVerified: false,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

/**
 * Delete user account
 */
const deleteUserAccount = async (uid) => {
  try {
    await auth.deleteUser(uid);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

module.exports = {
  authenticateFirebaseToken,
  requireRole,
  requireAdmin,
  requireStaff,
  requireAlumni,
  optionalAuth,
  softAuth,
  setCustomUserClaims,
  getUserByEmail,
  createUserWithPassword,
  deleteUserAccount,
};
