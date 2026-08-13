const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

dotenv.config();

// Path to service account file
const serviceAccountPath = path.join(__dirname, '../../lccb-alumni-fb433-firebase-adminsdk-fbsvc-205be91877.json');

// Load service account configuration
let firebaseConfig;

if (fs.existsSync(serviceAccountPath)) {
  firebaseConfig = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  console.log('✓ Using service account file');
} else {
  // Build from env vars
  firebaseConfig = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  };
  console.log('✓ Using environment variables');
}

// Validate required Firebase config
if (!firebaseConfig.project_id || !firebaseConfig.private_key || !firebaseConfig.client_email) {
  console.error('❌ Firebase config incomplete. Missing required fields.');
  throw new Error('Firebase configuration is incomplete');
}

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    credential: admin.cert(firebaseConfig),
    projectId: firebaseConfig.project_id,
  });
  console.log('✓ Firebase Admin SDK initialized');
} catch (err) {
  // Already initialized, which is fine
  if (err.code !== 'app/duplicate-app') {
    throw err;
  }
  console.log('✓ Firebase already initialized');
}

// Get Firestore and Auth instances using the correct methods
const db = getFirestore();
const auth = getAuth();

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true,
});

console.log('✓ Firebase services ready');

module.exports = {
  admin,
  db,
  auth,
};
