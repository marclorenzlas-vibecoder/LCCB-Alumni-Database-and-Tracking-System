const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here', (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
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
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('🔐 Teacher Auth - Token received:', token ? 'Yes' : 'No');

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here', (err, user) => {
      if (err) {
        console.log('❌ Token verification failed:', err.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      
      console.log('✅ Token verified. User role:', user.role);
      
      // Check if user is a teacher (case-insensitive)
      if (!user.role || user.role.toUpperCase() !== 'TEACHER') {
        console.log('❌ Not a teacher. Role:', user.role);
        return res.status(403).json({ error: 'Access denied. Teacher privileges required.' });
      }
      
      console.log('✅ Teacher access granted');
      req.user = user;
      next();
    });
  } catch (error) {
    console.error('❌ Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

module.exports = { authenticateToken, authMiddleware, teacherAuthMiddleware };
