# Firebase Migration Setup Guide

## 🚀 Complete Firebase Conversion Guide
Your Alumni Tracking System is now ready for Firebase with **base64 image storage** (budget-friendly).

---

## 📋 Quick Setup Checklist

- [ ] Create Firebase project at https://console.firebase.google.com
- [ ] Enable Firestore, Authentication, Realtime Database
- [ ] Download Service Account JSON
- [ ] Install dependencies (`npm install firebase-admin firebase`)
- [ ] Configure environment variables
- [ ] Run data migration script
- [ ] Test authentication
- [ ] Update API routes to use Firestore
- [ ] Test realtime features
- [ ] Deploy

---

## 1️⃣ Firebase Project Setup

### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a new project"
3. Name it: `lccb-alumni` (or your choice)
4. Accept Firebase terms
5. Wait for setup to complete

### Enable Required Services

#### Firestore Database
1. Go to **Firestore Database**
2. Click **Create Database**
3. Select **Start in production mode**
4. Choose region (default is fine)
5. Click **Enable**

#### Authentication
1. Go to **Authentication**
2. Click **Get Started**
3. Enable **Email/Password**
4. Enable **Google** (for OAuth)

#### Realtime Database (Optional, for WebSocket backup)
1. Go to **Realtime Database**
2. Click **Create Database**
3. Select **United States** (or your region)
4. Start in **locked mode**

---

## 2️⃣ Get Firebase Credentials

### Service Account (Backend)
1. Go to **Project Settings** (gear icon)
2. Click **Service Accounts**
3. Click **Generate New Private Key** (JSON)
4. Save the JSON file

### Web Configuration (Frontend)
1. In **Project Settings**, under **General** tab
2. Scroll to **Your apps** section
3. Click **Web** icon (or `<>`)
4. Copy the Firebase config object
5. Use these values for `VITE_FIREBASE_*` env vars

---

## 3️⃣ Install Dependencies

### Backend
```bash
cd backend
npm install firebase-admin sharp
```

### Frontend
```bash
cd ../frontend
npm install firebase
```

---

## 4️⃣ Configure Environment Variables

### Backend (.env)
```bash
# Copy from Firebase Service Account JSON
FIREBASE_PROJECT_ID=xxxx
FIREBASE_PRIVATE_KEY_ID=xxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
FIREBASE_CLIENT_EMAIL=xxxx@xxxx.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=xxxx

# Server config
PORT=5001
FRONTEND_URL=http://localhost:3002
SESSION_SECRET=random-secret-key-here
```

### Frontend (.env.local)
```bash
# Copy from Firebase Web Config
VITE_FIREBASE_API_KEY=xxxx
VITE_FIREBASE_AUTH_DOMAIN=xxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=xxxx
VITE_FIREBASE_STORAGE_BUCKET=xxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=xxxx
VITE_FIREBASE_APP_ID=xxxx
VITE_FIREBASE_DATABASE_URL=https://xxxx-default-rtdb.xxx.firebasedatabase.app

VITE_API_BASE_URL=http://localhost:5001/api
```

---

## 5️⃣ Migrate Data from MySQL to Firestore

### Run Migration Script
```bash
cd backend
node scripts/migrate-mysql-to-firestore.js
```

### What Gets Migrated
- ✅ Users (with roles and metadata)
- ✅ Alumni profiles (with base64 images)
- ✅ Achievements (with base64 images)
- ✅ Donations (with image arrays)
- ✅ Events (with base64 images)
- ✅ Job postings & applications
- ⚠️ Images converted to base64 (~200KB max per image)

### Image Size Limits
- **Firestore Document Limit**: 1MB per document
- **Recommended Image Size**: ~150KB (base64)
- **Strategy**: Compress large images before upload
  ```js
  import { compressBase64Image } from '@/utils/firebaseUtils';
  const compressed = await compressBase64Image(base64String, 800, 600, 0.8);
  ```

---

## 6️⃣ Update Backend Code

### Replace Prisma with Firestore

**Before (Prisma/MySQL):**
```js
const alumni = await prisma.alumni.findUnique({
  where: { id: alumniId }
});
```

**After (Firestore):**
```js
import { getAlumni } from './services/firestoreService';
const alumni = await getAlumni(alumniId);
```

### Update Routes Example
```js
// Old: Using Prisma
router.get('/:id', async (req, res) => {
  const alumni = await prisma.alumni.findUnique({
    where: { id: parseInt(req.params.id) }
  });
  res.json(alumni);
});

// New: Using Firestore
const { getDocument } = require('../services/firestoreService');

router.get('/:id', async (req, res) => {
  const alumni = await getDocument('alumni', req.params.id);
  res.json(alumni);
});
```

### Update Authentication Middleware
```js
// Old: JWT only
const { authenticateToken } = require('../middleware/auth');

// New: Firebase Auth
const { authenticateFirebaseToken } = require('../middleware/firebaseAuth');
router.get('/profile', authenticateFirebaseToken, async (req, res) => {
  res.json(req.user); // Firebase user data
});
```

### Update Realtime Service
```js
// Old: WebSocket
const { broadcastUpdate } = require('./realtimeService');

// New: Firestore Listeners
const { publishUpdate, subscribeToCollection } = require('./firestoreRealtimeService');

// Subscribe to changes
subscribeToCollection('alumni', (alumni) => {
  console.log('Alumni updated:', alumni);
});
```

---

## 7️⃣ Update Frontend Code

### Firebase Authentication
```js
import { auth } from '@/config/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';

// Sign in
const user = await signInWithEmailAndPassword(auth, email, password);

// Sign out
await signOut(auth);

// Get current user
auth.onAuthStateChanged((user) => {
  if (user) console.log('Logged in:', user.email);
});
```

### Firestore Queries
```js
import { getCollection, subscribeToCollection } from '@/utils/firebaseUtils';

// Get all alumni
const alumni = await getCollection('alumni', {
  limit: 100,
  orderBy: [{ field: 'createdAt', direction: 'desc' }]
});

// Subscribe to real-time updates
const unsubscribe = subscribeToCollection('alumni', (data) => {
  console.log('Alumni updated:', data);
});
```

### Base64 Image Upload
```js
import { fileToBase64, compressBase64Image } from '@/utils/firebaseUtils';

// Convert file to base64
const file = event.target.files[0];
const base64 = await fileToBase64(file);

// Compress if needed
const compressed = await compressBase64Image(base64);

// Upload to Firestore
await updateDocument('alumni', alumniId, {
  profileImage: compressed
});

// Display image
<img src={alumni.profileImage} alt="Profile" />
```

---

## 8️⃣ Test the Migration

### Backend Health Check
```bash
curl http://localhost:5001/api/health
```

### Test Firestore Connection
```bash
cd backend
node -e "
const { db } = require('./src/config/firebase');
db.collection('users').get().then(s => {
  console.log('✓ Firestore connected, docs:', s.size);
}).catch(e => console.error('✗ Error:', e.message));
"
```

### Test Authentication
```bash
# Create user
curl -X POST http://localhost:5001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## 9️⃣ Firestore Security Rules

### Set Rules in Firestore Console

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default: deny all
    match /{document=**} {
      allow read, write: if false;
    }
    
    // Users can read/write their own data
    match /users/{userId} {
      allow read: if request.auth.uid == userId;
      allow write: if request.auth.uid == userId;
    }
    
    // Alumni profiles are publicly readable
    match /alumni/{alumniId} {
      allow read: if true;
      allow write: if request.auth.uid != null && request.auth.uid == resource.data.userId;
    }
    
    // Admins can do everything
    match /{document=**} {
      allow read, write: if request.auth.token.role == 'ADMIN';
    }
  }
}
```

---

## 🔟 Deploy to Production

### Firebase Hosting (Frontend)
```bash
cd frontend
npm run build
firebase deploy --only hosting
```

### Cloud Functions or Cloud Run (Backend)
```bash
# Using Cloud Functions (recommended for small backends)
firebase deploy --only functions

# Or use Cloud Run for Docker deployment
```

---

## ⚠️ Important Notes

### Base64 Image Trade-offs
✅ **Pros:**
- No additional storage costs
- Images embedded with data
- Works offline
- Simpler implementation

❌ **Cons:**
- 1MB document size limit (Firestore)
- Higher bandwidth
- Not ideal for high-quality images
- Compression recommended

### Migration Considerations
- MySQL data is NOT automatically deleted after migration
- Keep MySQL backup until you verify Firestore has all data
- Test thoroughly before switching production traffic
- Set up proper Firestore security rules BEFORE going live

### Costs
**Free tier includes:**
- 50K reads/day
- 20K writes/day
- 20K deletes/day
- 1GB storage

Perfect for small to medium projects!

---

## 📚 Useful Files

| File | Purpose |
|------|---------|
| `backend/src/config/firebase.js` | Firebase Admin SDK initialization |
| `backend/src/services/firestoreService.js` | Firestore CRUD operations |
| `backend/src/services/firestoreRealtimeService.js` | Real-time listeners |
| `backend/src/middleware/firebaseAuth.js` | Firebase authentication middleware |
| `backend/src/utils/base64ImageUtils.js` | Base64 image handling |
| `backend/scripts/migrate-mysql-to-firestore.js` | Data migration script |
| `frontend/src/config/firebase.js` | Firebase client initialization |
| `frontend/src/utils/firebaseUtils.js` | Firestore & base64 utilities |

---

## 🆘 Troubleshooting

### "Firebase is not initialized"
- Check `.env` variables are set correctly
- Verify Service Account JSON is valid
- Clear node_modules: `npm install`

### "Firestore document too large"
- Compress images before storing
- Split large documents into subcollections
- Use `compressBase64Image()` utility

### "Authentication failed"
- Verify Firebase Authentication is enabled
- Check ID token is valid
- Ensure user exists in Firestore

### "Images not displaying"
- Verify base64 string starts with `data:image/`
- Check browser console for decoding errors
- Use `validateBase64Size()` before saving

---

## 📞 Support Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Query Reference](https://firebase.google.com/docs/firestore/query-data/queries)
- [Firebase Auth Docs](https://firebase.google.com/docs/auth)
- [Firebase Admin SDK](https://firebase.google.com/docs/database/admin/start)

---

**Last Updated:** August 2026
**Version:** 1.0.0
