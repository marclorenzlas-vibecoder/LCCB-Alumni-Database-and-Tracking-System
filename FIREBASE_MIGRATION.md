# Firebase Migration Guide (Base64 Images)

## Overview
Migrate from MySQL + Prisma to Firebase with Firestore and base64 image storage.

## Prerequisites
1. Firebase project created at https://console.firebase.google.com
2. Enable: Firestore, Authentication, Realtime Database
3. Download Service Account JSON from Firebase Console → Project Settings

## Setup Steps

### 1. Install Firebase SDK
```bash
cd backend
npm install firebase-admin
cd ../frontend
npm install firebase
```

### 2. Environment Variables (.env)
```
# Backend (.env in /backend)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
GOOGLE_OAUTH_CLIENT_ID=your-client-id
GOOGLE_OAUTH_CLIENT_SECRET=your-client-secret
NODE_ENV=development
PORT=5001
```

```
# Frontend (.env in /frontend - .env.local)
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

### 3. Firestore Collections Structure
```
users/
├── {userId}
│   ├── email: string
│   ├── username: string
│   ├── role: "ALUMNI" | "ADMIN" | "STAFF"
│   ├── profileImage: string (base64)
│   ├── createdAt: timestamp
│   └── updatedAt: timestamp

alumni/
├── {alumniId}
│   ├── userId: string (foreign key)
│   ├── firstName: string
│   ├── lastName: string
│   ├── email: string
│   ├── profileImage: string (base64)
│   ├── graduationYear: number
│   ├── company: string
│   ├── createdAt: timestamp
│   └── [other fields...]

achievements/
├── {achievementId}
│   ├── alumniId: string
│   ├── title: string
│   ├── image: string (base64)
│   ├── description: string
│   └── createdAt: timestamp

donations/
├── {donationId}
│   ├── alumniId: string
│   ├── amount: number
│   ├── images: string[] (array of base64 strings)
│   └── createdAt: timestamp

events/
├── {eventId}
│   ├── name: string
│   ├── image: string (base64)
│   └── createdAt: timestamp

job_postings/
├── {jobId}
│   ├── title: string
│   ├── company: string
│   └── createdAt: timestamp

notifications/
├── {notificationId}
│   ├── userId: string
│   ├── message: string
│   └── createdAt: timestamp

activity_logs/
├── {logId}
│   ├── actorId: string
│   ├── action: string
│   └── createdAt: timestamp
```

### 4. Base64 Image Limits
- **Firestore Document Limit**: 1MB per document
- **Recommended Max Image Size**: 200KB base64 (~150KB actual)
- **Strategy**: Store larger images in separate documents or split across multiple documents

## Key Advantages
✅ No additional storage costs
✅ Images embedded with data (easier queries)
✅ Simple implementation
✅ Works offline with Firebase caching

## Trade-offs
⚠️ Document size limits (1MB)
⚠️ Higher bandwidth for image downloads
⚠️ Not suitable for high-quality images
