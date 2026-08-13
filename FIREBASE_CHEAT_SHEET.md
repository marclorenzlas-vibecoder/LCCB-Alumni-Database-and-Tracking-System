# Firebase Conversion Cheat Sheet

Quick reference for converting from MySQL/Prisma to Firebase.

---

## Database Operations

### Get Single Item

**MySQL (Prisma):**
```js
const alumni = await prisma.alumni.findUnique({
  where: { id: 5 }
});
```

**Firebase (Firestore):**
```js
const { getAlumni } = require('./services/firestoreService');
const alumni = await getAlumni('5'); // Pass as string
```

---

### Get All Items

**MySQL (Prisma):**
```js
const alumni = await prisma.alumni.findMany({
  take: 50,
  orderBy: { createdAt: 'desc' }
});
```

**Firebase (Firestore):**
```js
const { getAllAlumni } = require('./services/firestoreService');
const alumni = await getAllAlumni(50);
```

---

### Get with Conditions (WHERE)

**MySQL (Prisma):**
```js
const alumni = await prisma.alumni.findMany({
  where: {
    graduationYear: 2023,
    company: 'Google'
  }
});
```

**Firebase (Firestore):**
```js
const { queryDocuments } = require('./services/firestoreService');
const alumni = await queryDocuments('alumni', [
  { field: 'graduationYear', operator: '==', value: 2023 },
  { field: 'company', operator: '==', value: 'Google' }
]);
```

---

### Insert New Item

**MySQL (Prisma):**
```js
const newAlumnus = await prisma.alumni.create({
  data: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    graduationYear: 2023
  }
});
```

**Firebase (Firestore):**
```js
const { addDocument } = require('./services/firestoreService');
const alumniId = await addDocument('alumni', {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  graduationYear: 2023
});
```

---

### Update Item

**MySQL (Prisma):**
```js
const updated = await prisma.alumni.update({
  where: { id: 5 },
  data: {
    company: 'Microsoft'
  }
});
```

**Firebase (Firestore):**
```js
const { updateAlumni } = require('./services/firestoreService');
const updated = await updateAlumni('5', {
  company: 'Microsoft'
});
```

---

### Delete Item

**MySQL (Prisma):**
```js
await prisma.alumni.delete({
  where: { id: 5 }
});
```

**Firebase (Firestore):**
```js
const { deleteAlumni } = require('./services/firestoreService');
await deleteAlumni('5');
```

---

## Search Operations

### Search by Partial Text

**MySQL (Prisma):**
```js
const results = await prisma.alumni.findMany({
  where: {
    firstName: {
      contains: 'john',
      mode: 'insensitive'
    }
  }
});
```

**Firebase (Firestore):**
```js
// Note: Firestore requires specific implementation for full-text search
// Option 1: Client-side filtering
const { getAllAlumni } = require('./services/firestoreService');
const all = await getAllAlumni(1000);
const results = all.data.filter(a => 
  a.firstName.toLowerCase().includes('john')
);

// Option 2: Use >= and <= for range queries
const { queryDocuments } = require('./services/firestoreService');
const results = await queryDocuments('alumni', [
  { field: 'firstName', operator: '>=', value: 'john' },
  { field: 'firstName', operator: '<', value: 'johno' }
]);
```

---

### Search Function

**MySQL (Prisma):**
```js
const { searchAlumni } = require('./services/alumniService');
const results = await searchAlumni('John');
```

**Firebase (Firestore):**
```js
const { searchAlumni } = require('./services/firestoreService');
const results = await searchAlumni('John');
```

---

## Relationships (Foreign Keys)

### Get Related Data

**MySQL (Prisma):**
```js
const alumni = await prisma.alumni.findUnique({
  where: { id: 5 },
  include: {
    achievements: true,
    careerEntries: true,
    donations: true
  }
});
```

**Firebase (Firestore):**
```js
// In Firestore, manually fetch related data
const { getAlumni, queryDocuments } = require('./services/firestoreService');
const alumni = await getAlumni('5');
const achievements = await queryDocuments('achievements', [
  { field: 'alumniId', operator: '==', value: '5' }
]);
const donations = await queryDocuments('donations', [
  { field: 'alumniId', operator: '==', value: '5' }
]);

const result = {
  ...alumni,
  achievements,
  donations
};
```

---

## Authentication

### Current User Check

**Old (Passport/JWT):**
```js
const { authenticateToken } = require('./middleware/auth');
router.get('/profile', authenticateToken, (req, res) => {
  res.json(req.user);
});
```

**Firebase:**
```js
const { authenticateFirebaseToken } = require('./middleware/firebaseAuth');
router.get('/profile', authenticateFirebaseToken, (req, res) => {
  res.json(req.user); // Firebase user data
});
```

---

### Role-Based Access

**Old (Custom):**
```js
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
};
```

**Firebase:**
```js
const { requireAdmin } = require('./middleware/firebaseAuth');
router.delete('/users/:id', requireAdmin, async (req, res) => {
  // Admin-only endpoint
});
```

---

## Real-Time Updates

### Subscribe to Changes

**Old (WebSocket):**
```js
const { broadcastUpdate } = require('./services/realtimeService');

// Listen for updates on client
socket.on('alumni.updated', (data) => {
  console.log('Alumni updated:', data);
});

// Broadcast on server
broadcastUpdate('alumni.updated', { id: 5, name: 'John' });
```

**Firebase:**
```js
const { subscribeToDocument } = require('./services/firestoreRealtimeService');

// Subscribe to specific document changes
const unsubscribe = subscribeToDocument('alumni', '5', (data) => {
  console.log('Alumni updated:', data);
});

// Or subscribe to collection changes
const unsub = subscribeToCollection('alumni', (docs) => {
  console.log('Alumni list updated:', docs);
});
```

---

## Image Handling

### Upload Image

**Old (File System):**
```js
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/alumni/:id/image', upload.single('image'), async (req, res) => {
  const imagePath = req.file.path;
  await prisma.alumni.update({
    where: { id },
    data: { profileImage: imagePath }
  });
});
```

**Firebase (Base64):**
```js
const { compressBase64Image, validateBase64Size } = require('./utils/base64ImageUtils');

router.post('/alumni/:id/image', async (req, res) => {
  const { base64Image } = req.body;
  
  // Validate size
  const sizeCheck = validateBase64Size(base64Image, 200);
  if (!sizeCheck.isValid) {
    return res.status(400).json({ error: 'Image too large' });
  }
  
  // Optionally compress
  const compressed = await compressBase64Image(base64Image);
  
  // Save to Firestore
  await updateDocument('alumni', id, {
    profileImage: compressed
  });
  
  res.json({ success: true });
});
```

---

### Display Image

**Old (File Path):**
```js
<img src={`/uploads/${alumni.profileImage}`} alt="Profile" />
```

**Firebase (Base64 Data URI):**
```js
<img src={alumni.profileImage} alt="Profile" />
```

---

## Batch Operations

### Update Multiple Items

**MySQL (Prisma):**
```js
await prisma.alumni.updateMany({
  where: { batch: 2023 },
  data: { graduationYear: 2023 }
});
```

**Firebase (Firestore):**
```js
const { batchWrite } = require('./services/firestoreService');

const alumni = await queryDocuments('alumni', [
  { field: 'batch', operator: '==', value: 2023 }
]);

const operations = alumni.map(a => ({
  type: 'update',
  collection: 'alumni',
  docId: a.id,
  data: { graduationYear: 2023 }
}));

await batchWrite(operations);
```

---

## Transactions

### Atomic Operations

**MySQL (Prisma):**
```js
await prisma.$transaction([
  prisma.alumni.update({ where: { id: 1 }, data: { balance: -10 } }),
  prisma.donation.create({ data: { amount: 10, alumniId: 1 } })
]);
```

**Firebase (Firestore):**
```js
const { admin } = require('./config/firebase');

await admin.firestore().runTransaction(async (transaction) => {
  const alumniRef = db.collection('alumni').doc('1');
  const alumniDoc = await transaction.get(alumniRef);
  
  transaction.update(alumniRef, { balance: alumniDoc.data().balance - 10 });
  transaction.set(db.collection('donations').doc(), {
    amount: 10,
    alumniId: '1',
    createdAt: new Date()
  });
});
```

---

## Pagination

### Paginated Results

**MySQL (Prisma):**
```js
const page = req.query.page || 1;
const limit = 20;
const skip = (page - 1) * limit;

const alumni = await prisma.alumni.findMany({
  skip,
  take: limit,
  orderBy: { createdAt: 'desc' }
});
```

**Firebase (Firestore):**
```js
const { getAllAlumni } = require('./services/firestoreService');

const limit = 20;
let startAfter = null;
const page1 = await getAllAlumni(limit);
startAfter = page1.lastDoc;

const page2 = await getAllAlumni(limit, startAfter);
```

---

## Timestamps

### Handle Dates

**MySQL (Prisma):**
```js
const createdAt = new Date(); // JavaScript Date
await prisma.alumni.create({
  data: { createdAt }
});
```

**Firebase (Firestore):**
```js
const { Timestamp } = require('firebase-admin/firestore');

await db.collection('alumni').add({
  createdAt: Timestamp.now()
  // Or: new Date() (Firestore converts automatically)
});
```

---

## Common Helper Functions

### Firestore Service Functions

```js
// Import all utilities
const firestore = require('./services/firestoreService');

firestore.createAlumni(data)              // Create new alumni
firestore.getAlumni(id)                   // Get one
firestore.getAllAlumni(limit)             // Get many
firestore.searchAlumni(term)              // Search
firestore.updateAlumni(id, data)          // Update
firestore.deleteAlumni(id)                // Delete
firestore.queryDocuments(collection, conditions) // Custom query
firestore.batchWrite(operations)          // Batch operations
firestore.subscribeToDocument(col, id, cb) // Real-time one
firestore.subscribeToCollection(col, cb)   // Real-time many
```

### Base64 Image Utilities

```js
const images = require('./utils/base64ImageUtils');

images.fileToBase64(path)                  // File → Base64
images.base64ToFile(base64, path)         // Base64 → File
images.compressBase64Image(base64)        // Compress
images.validateBase64Size(base64, maxKB)  // Check size
images.createThumbnail(base64, w, h)      // Create thumbnail
```

---

## Summary Table

| Operation | Prisma | Firestore Service | Frontend Utils |
|-----------|--------|-------------------|-----------------|
| Get one | `findUnique` | `getAlumni` | `getDocument` |
| Get many | `findMany` | `getAllAlumni` | `getCollection` |
| Search | `findMany` + where | `searchAlumni` | Client-side filter |
| Create | `create` | `createAlumni` | `addDocument` |
| Update | `update` | `updateAlumni` | `updateDocument` |
| Delete | `delete` | `deleteAlumni` | `deleteDocument` |
| Real-time | WebSocket | Firestore listeners | Subscribe functions |
| Images | File paths | Base64 strings | Base64 utils |

---

**Last Updated:** August 2026
