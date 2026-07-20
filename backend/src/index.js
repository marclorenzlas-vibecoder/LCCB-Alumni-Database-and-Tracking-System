const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const path = require('path');
const authRoutes = require('./routes/authRoutes');
const alumniRoutes = require('./routes/alumniRoutes');
const testRoutes = require('./routes/testRoutes');
const achievementRoutes = require('./routes/achievementRoutes');
const careerRoutes = require('./routes/careerRoutes');
const donationRoutes = require('./routes/donationRoutes');
const eventRoutes = require('./routes/eventRoutes');
const jobRoutes = require('./routes/jobRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const officerRoutes = require('./routes/officerRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const alumniListRoutes = require('./routes/alumniListRoutes');
const statsRoutes = require('./routes/statsRoutes');
const configRoutes = require('./routes/configRoutes');
const activityLogRoutes = require('./routes/activityLogRoutes');
const { PrismaClient } = require('@prisma/client');
const eventStatusService = require('./services/eventStatusService');
const birthdayNotificationService = require('./services/birthdayNotificationService');
const { initRealtime } = require('./services/realtimeService');
const { ensureActivityLogTable } = require('./services/activityLogService');

// Load environment variables
dotenv.config();

// Debug environment variables loading
console.log('Environment variables loaded:', {
  dbConnected: !!process.env.DB_HOST,
  port: process.env.PORT,
  frontendUrl: process.env.FRONTEND_URL
});

const app = express();
const PORT = Number(process.env.PORT) || 5001;
const prisma = new PrismaClient();

// Restore strict CORS for credentialed requests from frontend
// Support both development (localhost) and production (custom domain)
const parseAllowedOrigins = () => {
  const envOrigins = process.env.ALLOWED_ORIGINS || '';
  const defaultOrigins = [
    'http://localhost:3002', 
    'http://localhost:5001',
    'http://192.168.5.248:3002'  // Allow access from network IP (for phone scanning)
  ];
  
  if (envOrigins.trim()) {
    // Parse comma-separated origins from env var
    return [...defaultOrigins, ...envOrigins.split(',').map(o => o.trim())];
  }
  
  return defaultOrigins;
};

const allowedOrigins = parseAllowedOrigins();
console.log('CORS Allowed Origins:', allowedOrigins);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Only send credentials header if coming from an allowed frontend origin
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve public static files (like teacher registration page)
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration - supports both development and production
const getSessionConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieDomain = process.env.COOKIE_DOMAIN || 'localhost';
  
  return {
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: isProduction, // Use HTTPS in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? 'strict' : 'lax',
      path: '/',
      domain: cookieDomain === 'localhost' ? undefined : cookieDomain // Don't set domain for localhost
    },
    name: 'alumni_session'
  };
};

app.use(session(getSessionConfig()));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

// Initialize passport strategies
require('./middleware/passport');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/test', testRoutes);
app.use('/api/achievements', achievementRoutes);
app.use('/api/careers', careerRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/officers', officerRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/alumni-list', alumniListRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/config', configRoutes);
app.use('/api/activity-logs', activityLogRoutes);

// Default route redirects to frontend login
app.get(['/', '/login', '/Login'], (req, res) => {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3002';
  res.redirect(`${frontendBase}/login`);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// Start server with auto port-retry
function startServer(port, attempt = 0, maxAttempts = 10) {
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${port}`);
    console.log(`Network access: http://192.168.5.248:${port}`);
    initRealtime(server);
    console.log(`Realtime WebSocket available at ws://0.0.0.0:${port}/realtime`);
  });

  server.on('error', (err) => {
    if (err && err.code === 'EADDRINUSE') {
      if (attempt < maxAttempts) {
        const nextPort = port + 1;
        console.warn(`Port ${port} is in use. Trying ${nextPort}... (${attempt + 1}/${maxAttempts})`);
        setTimeout(() => startServer(nextPort, attempt + 1, maxAttempts), 100);
        return;
      }
      console.error(`Unable to bind after ${maxAttempts + 1} attempts starting at ${PORT}.`);
      console.error('Free a port or set the PORT env var to a known free port and restart.');
      process.exit(1);
    }
    throw err;
  });

  return server;
}

// Connect to the database and start the server
async function main() {
  try {
    await prisma.$connect();
    console.log('Database connection successful');
    await ensureActivityLogTable();
    console.log('Activity log table ready');
    
    // Start event status checker
    eventStatusService.startEventStatusChecker();
    birthdayNotificationService.startBirthdayNotificationChecker();
    
    startServer(PORT);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

main();
