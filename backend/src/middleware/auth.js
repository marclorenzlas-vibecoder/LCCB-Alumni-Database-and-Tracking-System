const jwt = require('jsonwebtoken');
const { tryEnter } = require('../services/activeUserLimiter');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const EXPIRED_TOKEN_GRACE_SECONDS = Number(process.env.JWT_EXPIRED_GRACE_SECONDS || 7 * 24 * 60 * 60);

const rejectWhenAtCapacity = (res, limiterState) => {
  return res.status(503).json({
    error: 'Server is full right now. Please try again in a few minutes.',
    code: 'SERVER_AT_CAPACITY'
  });
};

const normalizeToken = (value) => {
  if (!value || typeof value !== 'string') return null;

  let token = value.trim();
  token = token.replace(/^Bearer\s+/i, '').trim();
  token = token.replace(/^Bearer\s+/i, '').trim();
  token = token.replace(/^['\"]+|['\"]+$/g, '').trim();

  if (!token || token.toLowerCase() === 'undefined' || token.toLowerCase() === 'null') {
    return null;
  }

  return token;
};

const extractToken = (req) => {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  const fromAuthHeader = normalizeToken(authHeader);
  if (fromAuthHeader) return fromAuthHeader;

  return normalizeToken(req.headers['x-access-token']);
};

const verifyTokenWithGrace = (token, onSuccess, onFailure) => {
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (!err) {
      onSuccess(user, false);
      return;
    }

    if (err.name !== 'TokenExpiredError') {
      onFailure(err);
      return;
    }

    jwt.verify(token, JWT_SECRET, { ignoreExpiration: true }, (ignoreExpErr, expiredUser) => {
      if (ignoreExpErr || !expiredUser) {
        onFailure(err);
        return;
      }

      const nowSeconds = Math.floor(Date.now() / 1000);
      const expiredAt = Number(expiredUser.exp || 0);
      const secondsSinceExpiry = expiredAt > 0 ? nowSeconds - expiredAt : Number.MAX_SAFE_INTEGER;

      if (secondsSinceExpiry > EXPIRED_TOKEN_GRACE_SECONDS) {
        onFailure(err);
        return;
      }

      onSuccess(expiredUser, true);
    });
  });
};

const authenticateToken = (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    verifyTokenWithGrace(token, (user, usedGrace) => {
      const limiterState = tryEnter({ token, user });
      if (!limiterState.allowed) {
        return rejectWhenAtCapacity(res, limiterState);
      }

      if (usedGrace) {
        req.tokenNeedsRefresh = true;
      }
      req.authToken = token;
      req.user = user;
      next();
    }, (err) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is authenticated (alias for authenticateToken)
const authMiddleware = authenticateToken;

// Middleware to check if user is a teacher
const teacherAuthMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req);

    console.log('🔐 Teacher Auth - Token received:', token ? 'Yes' : 'No');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    verifyTokenWithGrace(token, (user, usedGrace) => {
      const limiterState = tryEnter({ token, user });
      if (!limiterState.allowed) {
        return rejectWhenAtCapacity(res, limiterState);
      }

      if (usedGrace) {
        req.tokenNeedsRefresh = true;
      }
      
      console.log('✅ Token verified. User role:', user.role);
      
      // Check if user is a teacher or admin (case-insensitive)
      const roleUpper = String(user.role || '').toUpperCase();
      if (roleUpper !== 'TEACHER' && roleUpper !== 'ADMIN') {
        console.log('❌ Not a teacher or admin. Role:', user.role);
        return res.status(403).json({ error: 'Access denied. Teacher or admin privileges required.' });
      }
      
      console.log('✅ Teacher/Admin access granted');
      req.authToken = token;
      req.user = user;
      next();
    }, (err) => {
      if (err) {
        console.log('❌ Token verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
    });
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is an alumni
const alumniAuthMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req);

    console.log('🔐 Alumni Auth - Token received:', token ? 'Yes' : 'No');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Access token required. Please log in to donate.' });
    }

    verifyTokenWithGrace(token, (user, usedGrace) => {
      const limiterState = tryEnter({ token, user });
      if (!limiterState.allowed) {
        return rejectWhenAtCapacity(res, limiterState);
      }

      if (usedGrace) {
        req.tokenNeedsRefresh = true;
      }
      
      console.log('✅ Token verified. User role:', user.role);
      
      // Check if user is an alumni
      if (!user.role || user.role.toUpperCase() !== 'ALUMNI') {
        console.log('❌ Not an alumni. Role:', user.role);
        return res.status(403).json({ error: 'Only verified alumni can make donations.' });
      }
      
      console.log('✅ Alumni access granted. Alumni ID:', user.alumniId);
      req.authToken = token;
      req.user = user;
      next();
    }, (err) => {
      if (err) {
        console.log('❌ Token verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
      }
    });
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Middleware to check if user is authenticated (alumni or teacher)
const flexibleAuthMiddleware = (req, res, next) => {
  try {
    const token = extractToken(req);

    console.log('🔐 Flexible Auth - Token received:', token ? 'Yes' : 'No');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Access token required. Please log in.' });
    }

    verifyTokenWithGrace(token, (user, usedGrace) => {
      const limiterState = tryEnter({ token, user });
      if (!limiterState.allowed) {
        return rejectWhenAtCapacity(res, limiterState);
      }

      if (usedGrace) {
        req.tokenNeedsRefresh = true;
      }
      
      console.log('✅ Token verified. User role:', user.role);
      req.authToken = token;
      req.user = user;
      next();
    }, (err) => {
      if (err) {
        console.log(' Token verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token. Please log in again.' });
      }
    });
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticateToken, authMiddleware, teacherAuthMiddleware, alumniAuthMiddleware, flexibleAuthMiddleware };
