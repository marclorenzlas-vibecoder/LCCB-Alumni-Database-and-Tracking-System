const dotenv = require('dotenv');
const path = require('path');

if (!process.env.VERCEL) {
  const backendDirectory = path.resolve(__dirname, '..');
  const envFile = process.env.NODE_ENV === 'production'
    ? '.env.production'
    : (require('fs').existsSync(path.join(backendDirectory, '.env')) ? '.env' : '.env.development');
  dotenv.config({ path: path.join(backendDirectory, envFile) });
}

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('./middleware/passport');
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
const prisma = require('./config/prisma');
const eventStatusService = require('./services/eventStatusService');
const birthdayNotificationService = require('./services/birthdayNotificationService');
const { initRealtime } = require('./services/realtimeService');
const { ensureActivityLogTable } = require('./services/activityLogService');
const { syncAllSequences } = require('./services/dbSequenceService');

// Debug environment variables loading
console.log('Environment variables loaded:', {
  dbConnected: !!process.env.DB_HOST,
  port: process.env.PORT,
  frontendUrl: process.env.FRONTEND_URL
});

const app = express();
const PORT = Number(process.env.PORT) || 5001;


// Flexible CORS setup for development (localhost, 127.0.0.1, LAN IPs) and production
const customOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

if (process.env.FRONTEND_URL) {
  customOrigins.push(process.env.FRONTEND_URL.trim().replace(/\/+$/, ''));
}

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  const cleanOrigin = origin.trim().replace(/\/+$/, '');
  // Allow localhost or 127.0.0.1 on any port (3000, 3002, 5173, etc.)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) return true;
  // Allow LAN IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port
  if (/^https?:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+)(:\d+)?$/.test(cleanOrigin)) return true;
  // Allow custom configured origins
  if (customOrigins.includes(cleanOrigin)) return true;
  return false;
};

const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      console.warn('[CORS] Blocked request from origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

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

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('Health check database connection failed:', error);
    res.status(503).json({ status: 'unavailable', database: 'disconnected' });
  }
});

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
    
    // Start HTTP server immediately so port 5001 is listening without delay
    startServer(PORT);

    // Run table initialization and sequence sync asynchronously in background
    ensureActivityLogTable()
      .then(() => console.log('Activity log table ready'))
      .catch(err => console.warn('Activity log table init:', err.message));

    
    // Start background checkers
    eventStatusService.startEventStatusChecker();
    birthdayNotificationService.startBirthdayNotificationChecker();
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = app;
