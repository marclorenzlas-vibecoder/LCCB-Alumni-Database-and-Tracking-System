const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const notificationService = require('../services/notificationService');

// ensure uploads/events exists
const eventsDir = path.join(__dirname, '../../uploads/events');
if (!fs.existsSync(eventsDir)) {
  fs.mkdirSync(eventsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, eventsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'event-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  // Increase default limit to accommodate large photos (e.g., wallpapers)
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: 'desc' }
    });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id: Number(id) },
      include: {
        event_attendance: {
          include: {
            alumni: true
          }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Helper to run multer and surface readable errors
const runUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const isSize = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({
        error: isSize ? 'Image is too large. Max size is 15MB.' : (err.message || 'Invalid image upload')
      });
    }
    next();
  });
};

// Create new event
router.post('/', runUpload, async (req, res) => {
  try {
    const { name, description, date, location, sendNotification } = req.body;

    if (!name) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['name']
      });
    }

    const imagePath = req.file ? `/uploads/events/${req.file.filename}` : null;
    const shouldNotify = sendNotification === 'true' || sendNotification === true;

    const event = await prisma.event.create({
      data: {
        name: name.trim(),
        description: description ? description.trim() : null,
        date: date ? new Date(date) : null,
        location: location ? location.trim() : null,
        image: imagePath,
        send_notification: shouldNotify
      }
    });

    // Send notifications if checkbox was checked
    if (shouldNotify) {
      try {
        await notificationService.createNotifications({
          type: 'EVENT',
          title: `New Event: ${event.name}`,
          message: `${event.description || 'A new event has been added!'} ${event.date ? `on ${new Date(event.date).toLocaleDateString()}` : ''}`,
          link: `/events/${event.id}`,
          eventId: event.id
        });
        console.log(`Notifications sent for event: ${event.name}`);
      } catch (notifError) {
        console.error('Error sending notifications:', notifError);
        // Don't fail the event creation if notifications fail
      }
    }

    res.status(201).json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ 
      error: 'Failed to create event',
      details: error.message 
    });
  }
});

// Update event
router.put('/:id', runUpload, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, date, location } = req.body;

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (date !== undefined) updateData.date = date ? new Date(date) : null;
    if (location !== undefined) updateData.location = location ? location.trim() : null;
    
    // Add image path if uploaded
    if (req.file) {
      updateData.image = `/uploads/events/${req.file.filename}`;
      
      // Delete old image if exists
      const oldEvent = await prisma.event.findUnique({ where: { id: Number(id) } });
      if (oldEvent?.image) {
        const oldImagePath = path.join(__dirname, '../../', oldEvent.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    const event = await prisma.event.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json(event);
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ 
      error: 'Failed to update event',
      details: error.message 
    });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the event to find its image
    const eventToDelete = await prisma.event.findUnique({
      where: { id: Number(id) }
    });

    if (!eventToDelete) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Delete the event
    await prisma.event.delete({
      where: { id: Number(id) }
    });

    // Delete the image file if it exists
    if (eventToDelete.image) {
      const imagePath = path.join(__dirname, '../../', eventToDelete.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ 
      error: 'Failed to delete event',
      details: error.message 
    });
  }
});

// Join event (register attendance)
router.post('/:id/join', async (req, res) => {
  try {
    const { id } = req.params;
    const { alumni_id } = req.body;

    if (!alumni_id) {
      return res.status(400).json({ error: 'Alumni ID is required' });
    }

    // Check if already registered
    const existing = await prisma.event_attendance.findFirst({
      where: {
        event_id: Number(id),
        alumni_id: Number(alumni_id)
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }

    // Create attendance record
    const attendance = await prisma.event_attendance.create({
      data: {
        event_id: Number(id),
        alumni_id: Number(alumni_id),
        attended: false
      }
    });

    res.json({ message: 'Successfully joined event', attendance });
  } catch (error) {
    console.error('Error joining event:', error);
    res.status(500).json({ error: 'Failed to join event' });
  }
});

// Leave event (unregister attendance)
router.post('/:id/leave', async (req, res) => {
  try {
    const { id } = req.params;
    const { alumni_id } = req.body;

    const attendance = await prisma.event_attendance.findFirst({
      where: {
        event_id: Number(id),
        alumni_id: Number(alumni_id)
      }
    });

    if (!attendance) {
      return res.status(404).json({ error: 'Not registered for this event' });
    }

    await prisma.event_attendance.delete({
      where: { id: attendance.id }
    });

    res.json({ message: 'Successfully left event' });
  } catch (error) {
    console.error('Error leaving event:', error);
    res.status(500).json({ error: 'Failed to leave event' });
  }
});

// Get event attendees
router.get('/:id/attendees', async (req, res) => {
  try {
    const { id } = req.params;
    
    const attendees = await prisma.event_attendance.findMany({
      where: { event_id: Number(id) },
      include: {
        alumni: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            profile_image: true,
            course: true,
            graduation_year: true
          }
        }
      }
    });

    res.json(attendees);
  } catch (error) {
    console.error('Error fetching attendees:', error);
    res.status(500).json({ error: 'Failed to fetch attendees' });
  }
});

// Check if user is attending
router.get('/:id/check-attendance/:alumniId', async (req, res) => {
  try {
    const { id, alumniId } = req.params;
    
    const attendance = await prisma.event_attendance.findFirst({
      where: {
        event_id: Number(id),
        alumni_id: Number(alumniId)
      }
    });

    res.json({ isAttending: !!attendance });
  } catch (error) {
    console.error('Error checking attendance:', error);
    res.status(500).json({ error: 'Failed to check attendance' });
  }
});

// ===== EVENT GALLERY ROUTES =====

// Setup multer for gallery photos
const galleryStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const galleryDir = path.join(__dirname, '../../uploads/events/gallery');
    if (!fs.existsSync(galleryDir)) {
      fs.mkdirSync(galleryDir, { recursive: true });
    }
    cb(null, galleryDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const galleryUpload = multer({
  storage: galleryStorage,
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// Get event gallery photos
router.get('/:id/gallery', async (req, res) => {
  try {
    const { id } = req.params;
    const gallery = await prisma.event_gallery.findMany({
      where: { event_id: Number(id) },
      orderBy: { created_at: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true
          }
        }
      }
    });
    res.json(gallery);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    res.status(500).json({ error: 'Failed to fetch gallery photos' });
  }
});

// Add photos to event gallery (admin/teacher only)
router.post('/:id/gallery', galleryUpload.array('images', 20), async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    const galleryPhotos = await Promise.all(
      req.files.map(file => 
        prisma.event_gallery.create({
          data: {
            event_id: Number(id),
            image: `/uploads/events/gallery/${file.filename}`,
            caption: null,
            uploaded_by: null  // Set to null to avoid foreign key constraint error
          }
        })
      )
    );

    res.status(201).json(galleryPhotos);
  } catch (error) {
    console.error('Error adding gallery photos:', error);
    res.status(500).json({ error: 'Failed to add gallery photos' });
  }
});

// Delete gallery photo (admin/teacher only)
router.delete('/:eventId/gallery/:photoId', async (req, res) => {
  try {
    const { eventId, photoId } = req.params;
    
    const photo = await prisma.event_gallery.findUnique({
      where: { id: Number(photoId) }
    });

    if (!photo || photo.event_id !== Number(eventId)) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Delete from database
    await prisma.event_gallery.delete({
      where: { id: Number(photoId) }
    });

    // Delete file
    if (photo.image) {
      const imagePath = path.join(__dirname, '../../', photo.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery photo:', error);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;
