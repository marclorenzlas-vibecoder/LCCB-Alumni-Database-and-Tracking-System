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
const { PrismaClient } = require('@prisma/client');
const eventStatusService = require('./services/eventStatusService');

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

// Restore strict CORS for credentialed requests from frontend (port 3002)
const allowedOrigins = ['http://localhost:3002', 'http://localhost:5001'];
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin || '*');
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // Only send credentials header if coming from our frontend
  if (origin === 'http://localhost:3002') {
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

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
    path: '/',
    domain: 'localhost'
  },
  name: 'alumni_session'
}));

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
  const server = app.listen(port, () => {
    console.log(`Server running on port ${port}`);
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
    
    // Start event status checker
    eventStatusService.startEventStatusChecker();
    
    startServer(PORT);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
}

main();
