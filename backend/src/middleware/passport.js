const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
require('dotenv').config();

// OAuth credentials from environment variables
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5001/api/auth/google/callback';

// Debug OAuth configuration
console.log('Initializing OAuth with:', {
  clientIdPrefix: GOOGLE_CLIENT_ID ? `${GOOGLE_CLIENT_ID.substring(0, 15)}...` : 'missing',
  hasSecret: !!GOOGLE_CLIENT_SECRET,
  callbackUrl: GOOGLE_CALLBACK_URL
});

// Validate required OAuth configuration
if (!GOOGLE_CLIENT_ID?.trim() || !GOOGLE_CLIENT_SECRET?.trim() || !GOOGLE_CALLBACK_URL?.trim()) {
  console.error('Missing or invalid OAuth configuration:');
  if (!GOOGLE_CLIENT_ID?.trim()) console.error('- GOOGLE_CLIENT_ID is missing or empty');
  if (!GOOGLE_CLIENT_SECRET?.trim()) console.error('- GOOGLE_CLIENT_SECRET is missing or empty');
  if (!GOOGLE_CALLBACK_URL?.trim()) console.error('- GOOGLE_CALLBACK_URL is missing or empty');
  throw new Error('Invalid OAuth configuration. Check your .env file and Google Cloud Console settings.');
}

// Verify that client ID is in the correct format
if (!GOOGLE_CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
  console.error('Invalid GOOGLE_CLIENT_ID format. It should end with .apps.googleusercontent.com');
  throw new Error('Invalid OAuth client ID format');
}

const pool = require('../config/database');

async function findOrCreateUser(profile) {
  try {
    // Check if Google account already exists in google_accounts table
    const [existingUser] = await pool.execute(
      'SELECT * FROM google_accounts WHERE google_id = ?',
      [profile.id]
    );

    if (existingUser.length > 0) {
      // Update the existing account's information
      await pool.execute(
        `UPDATE google_accounts 
         SET name = ?, picture = ?, email = ?, updated_at = NOW()
         WHERE id = ?`,
        [
          profile.displayName,
          profile.photos?.[0]?.value || null,
          profile.emails[0].value,
          existingUser[0].id
        ]
      );
      // Return fresh row
      const [updated] = await pool.execute('SELECT * FROM google_accounts WHERE id = ?', [existingUser[0].id]);
      return updated[0];
    }

    // If not, create new google account
    const [result] = await pool.execute(
      `INSERT INTO google_accounts (
        google_id, email, name, picture
      ) VALUES (?, ?, ?, ?)`,
      [
        profile.id,
        profile.emails[0].value,
        profile.displayName,
        profile.photos?.[0]?.value || null
      ]
    );

    const [newUser] = await pool.execute('SELECT * FROM google_accounts WHERE id = ?', [result.insertId]);
    return newUser[0];
  } catch (error) {
    console.error('Error in findOrCreateUser:', error);
    throw error;
  }
}

console.log('Initializing Google OAuth strategy with config:', {
  clientIdPrefix: GOOGLE_CLIENT_ID ? GOOGLE_CLIENT_ID.substring(0,10) + '...' : 'missing',
  callbackURL: GOOGLE_CALLBACK_URL,
  scopes: process.env.GOOGLE_SCOPES
});

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    passReqToCallback: true,
    scope: ['profile', 'email']
  },
  async function(request, accessToken, refreshToken, profile, done) {
    try {
      console.log('GoogleStrategy callback - profile:', { id: profile.id, emails: profile.emails, name: profile.name });
      const user = await findOrCreateUser(profile);
      // attach tokens and profile info for downstream use
      const resultUser = Object.assign({}, user, {
        oauth_profile: {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails,
          photos: profile.photos
        },
        accessToken,
        refreshToken
      });
      return done(null, resultUser);
    } catch (error) {
      console.error('Error in GoogleStrategy callback:', error);
      // If this error is from OAuth token exchange, try to log more details
      if (error && error.data) {
        console.error('OAuth error data:', error.data.toString());
      }
      return done(error, null);
    }
  }
));

// Session serialization: store only google_accounts.id in session
passport.serializeUser(function(user, done) {
  try {
    const id = user.id || (user && user.id);
    done(null, id);
  } catch (err) {
    done(err, null);
  }
});

// Deserialize by fetching the google_accounts row from DB
passport.deserializeUser(async function(id, done) {
  try {
    const [rows] = await pool.execute('SELECT * FROM google_accounts WHERE id = ?', [id]);
    if (rows && rows.length > 0) {
      done(null, rows[0]);
    } else {
      done(null, false);
    }
  } catch (err) {
    done(err, null);
  }
});

async function findOrCreateOAuthUser(profile, provider) {
  const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
  const username = profile.username || profile.displayName || (email ? email.split('@')[0] : `${provider}_${profile.id}`);

  // Try to find user by provider id or email
  const [byProvider] = await pool.execute(
    'SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ?',
    [provider, profile.id]
  );
  if (byProvider.length > 0) return byProvider[0];

  if (email) {
    const [byEmail] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (byEmail.length > 0) return byEmail[0];
  }

  const [result] = await pool.execute(
    'INSERT INTO users (username, email, oauth_provider, oauth_id) VALUES (?, ?, ?, ?)',
    [username, email, provider, profile.id]
  );
  const insertedId = result.insertId;
  const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [insertedId]);
  return rows[0];
}

module.exports = passport;


