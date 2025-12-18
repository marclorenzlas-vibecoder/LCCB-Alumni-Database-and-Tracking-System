const router = require('express').Router();

// Test route to check environment variables
router.get('/env-test', (req, res) => {
  // Don't send sensitive information, just confirmation of values
  res.json({
    database: {
      host: !!process.env.DB_HOST,
      user: !!process.env.DB_USER,
      dbName: !!process.env.DB_NAME,
      port: process.env.DB_PORT
    },
    server: {
      port: process.env.PORT,
      frontendUrl: process.env.FRONTEND_URL
    },
    auth: {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasSessionSecret: !!process.env.SESSION_SECRET
    },
    oauth: {
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL
    }
  });
});

module.exports = router;