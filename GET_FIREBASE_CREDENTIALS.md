# How to Get Firebase Credentials

Complete step-by-step guide to download Service Account JSON and Web Config.

---

## 🔐 Part 1: Download Service Account JSON (Backend)

### Step 1: Open Firebase Console
1. Go to **https://console.firebase.google.com**
2. Sign in with your Google account
3. Click on your project (the one you created)

### Step 2: Open Project Settings
1. Look for the **⚙️ gear icon** in the top-left sidebar (next to your project name)
2. Click it
3. Select **Project Settings**

### Step 3: Navigate to Service Accounts
1. You're now in **Project Settings**
2. Look for tabs at the top: "General | Users and permissions | Service Accounts | Billing"
3. Click the **Service Accounts** tab

### Step 4: Generate Private Key
1. Scroll down to find **Firebase Admin SDK** section
2. You should see language options: Node.js, Python, Java, etc.
3. Make sure **Node.js** is selected
4. Click the blue button **"Generate New Private Key"**
5. A JSON file will download automatically (e.g., `lccb-alumni-xxxxx.json`)

### Step 5: Save the File
1. The JSON file downloaded to your **Downloads** folder
2. Copy it to your project: `backend/` folder (or keep it safe somewhere)
3. **⚠️ Important:** Never commit this to GitHub! Add to `.gitignore`

### ✅ You now have your Service Account JSON!

The file looks like:
```json
{
  "type": "service_account",
  "project_id": "lccb-alumni-xxxxx",
  "private_key_id": "xxxxxxxxxxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...",
  "client_email": "firebase-adminsdk-xxxxx@lccb-alumni-xxxxx.iam.gserviceaccount.com",
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/..."
}
```

---

## 🌐 Part 2: Copy Web Config (Frontend)

### Step 1: Go to Project Settings (Again)
1. **⚙️ gear icon** → **Project Settings**
2. Click the **General** tab (first one)

### Step 2: Find Your Apps Section
1. Scroll down on the **General** page
2. You'll see a section called **"Your apps"**
3. Look for your **Web app** (it might say something like "Web app" or show a `</>` icon)
   - If you don't see a web app, click the `</>` icon to create one

### Step 3: Copy the Firebase Config
1. If you already have a web app registered, click on it
2. You'll see a code snippet that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDOCAbC123dEf456GhI789jKl012mNoPQr",
  authDomain: "lccb-alumni-xxxxx.firebaseapp.com",
  projectId: "lccb-alumni-xxxxx",
  storageBucket: "lccb-alumni-xxxxx.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789jk0",
  databaseURL: "https://lccb-alumni-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app",
  measurementId: "G-ABC123DEFG"
};
```

### Step 4: Copy Each Value
Copy these values from the config:
- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`
- `databaseURL` (if not showing, add it manually)
- `measurementId`

### ✅ You now have your Web Config!

---

## 🔧 Part 3: Set Up Environment Variables

Now that you have both credentials, add them to your project.

### Backend Setup (.env)

1. Open your project folder: `backend/`
2. Create or edit the file `.env`
3. Add these lines (replace with YOUR actual values):

```bash
# Firebase Service Account Credentials
FIREBASE_PROJECT_ID=lccb-alumni-xxxxx
FIREBASE_PRIVATE_KEY_ID=xxxxxxxxxxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQE...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@lccb-alumni-xxxxx.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789

# Server Configuration
PORT=5001
FRONTEND_URL=http://localhost:3002
SESSION_SECRET=your-random-secret-key-here
NODE_ENV=development
```

**Where to get each value:**
- `FIREBASE_PROJECT_ID` → From Web Config: `projectId`
- `FIREBASE_PRIVATE_KEY_ID` → From Service Account JSON: `private_key_id`
- `FIREBASE_PRIVATE_KEY` → From Service Account JSON: `private_key` (copy exactly, keep the `\n` characters)
- `FIREBASE_CLIENT_EMAIL` → From Service Account JSON: `client_email`
- `FIREBASE_CLIENT_ID` → From Service Account JSON: `client_id`

### Frontend Setup (.env.local)

1. Open your project folder: `frontend/`
2. Create or edit the file `.env.local`
3. Add these lines (replace with YOUR actual values):

```bash
# Firebase Web Configuration
VITE_FIREBASE_API_KEY=AIzaSyDOCAbC123dEf456GhI789jKl012mNoPQr
VITE_FIREBASE_AUTH_DOMAIN=lccb-alumni-xxxxx.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=lccb-alumni-xxxxx
VITE_FIREBASE_STORAGE_BUCKET=lccb-alumni-xxxxx.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abc123def456ghi789jk0
VITE_FIREBASE_DATABASE_URL=https://lccb-alumni-xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_MEASUREMENT_ID=G-ABC123DEFG

# Backend API
VITE_API_BASE_URL=http://localhost:5001/api
```

**Where to get each value:**
All come from the Web Config you copied earlier.

---

## ✅ Verification Checklist

After adding credentials:

- [ ] `.env` file created in `/backend`
- [ ] `.env.local` file created in `/frontend`
- [ ] All values filled in (not blank)
- [ ] No extra spaces or quotes
- [ ] `.env` added to `.gitignore` (never commit credentials!)

### Check .gitignore

Make sure this is in your `.gitignore` file:

```
# Environment variables
.env
.env.local
.env.*.local
```

---

## 🧪 Test the Connection

Once your `.env` files are set up:

### Test Backend
```bash
cd backend
npm install
node -e "
const { db } = require('./src/config/firebase');
db.collection('test').get().then(s => {
  console.log('✅ SUCCESS: Firebase connected!');
  process.exit(0);
}).catch(e => {
  console.error('❌ ERROR:', e.message);
  process.exit(1);
});
"
```

**Should show:** `✅ SUCCESS: Firebase connected!`

If you get an error:
- Double-check your credentials are correct
- Make sure `FIREBASE_PRIVATE_KEY` includes `\n` characters
- Verify `FIREBASE_PROJECT_ID` matches in both files

---

## ⚠️ Security Tips

1. **Never share your credentials** with anyone
2. **Never commit `.env` to GitHub** - add to `.gitignore`
3. **Keep Service Account JSON safe** - don't upload to public repos
4. **Rotate keys regularly** in Firebase Console if needed
5. **Use different keys for dev/prod** when deploying

---

## 🆘 Troubleshooting

### "Can't find Service Accounts tab"
- Make sure you're in **Project Settings** (not Firestore)
- Click **Service Accounts** tab (should be 3rd tab)

### "Can't find Web Config"
- Go to **Project Settings** → **General** tab
- Scroll down to **"Your apps"** section
- If no web app exists, click `</>` icon to create one

### "Private key looks wrong"
- In the JSON file, the `private_key` will have `\n` in it
- When copying to `.env`, keep those `\n` characters exactly
- It should start with `-----BEGIN PRIVATE KEY-----`

### "Firebase not connecting"
- Verify all values in `.env` are correct
- Make sure `FIREBASE_PROJECT_ID` has no extra spaces
- Check that `FIREBASE_PRIVATE_KEY` includes the full key (it's very long!)

---

## 📸 Visual Guide

### Finding Service Account JSON
```
Firebase Console
    ↓
⚙️ Project Settings (gear icon)
    ↓
Service Accounts tab
    ↓
Firebase Admin SDK
    ↓
Click "Generate New Private Key"
    ↓
JSON file downloads ✅
```

### Finding Web Config
```
Firebase Console
    ↓
⚙️ Project Settings (gear icon)
    ↓
General tab
    ↓
Scroll down to "Your apps"
    ↓
Click on your Web app
    ↓
Copy firebaseConfig object ✅
```

---

## 📋 Quick Reference

| What | Where | Use For |
|------|-------|---------|
| Service Account JSON | Project Settings → Service Accounts → Generate Key | Backend (`.env`) |
| Web Config | Project Settings → General → Your apps | Frontend (`.env.local`) |
| Private Key | Service Account JSON → `private_key` field | `FIREBASE_PRIVATE_KEY` in `.env` |
| Project ID | Both places have it | `FIREBASE_PROJECT_ID` / `VITE_FIREBASE_PROJECT_ID` |

---

**Next Step:** Once credentials are added to `.env` files, run the test command above! 🚀
