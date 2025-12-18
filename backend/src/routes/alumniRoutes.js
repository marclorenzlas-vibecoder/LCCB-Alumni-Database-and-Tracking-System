const express = require('express');
const { PrismaClient } = require('@prisma/client');
const upload = require('../middleware/upload');
const authMiddleware = require('../middleware/auth').authMiddleware;
const path = require('path');
const prisma = new PrismaClient();
const router = express.Router();

// Get all alumni
router.get('/', async (req, res) => {
  try {
    const alumni = await prisma.alumni.findMany({
      include: {
        user: {
          select: {
            email: true
          }
        },
        social_link: true
      }
    });
    res.json(alumni);
  } catch (error) {
    console.error('Error fetching alumni:', error);
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
});

// Helper to run multer for profile images and surface readable errors
const runProfileUpload = (req, res, next) => {
  upload.single('profileImage')(req, res, (err) => {
    if (err) {
      const isSize = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({
        error: isSize ? 'Profile image is too large. Max size is 15MB.' : (err.message || 'Invalid image upload')
      });
    }
    next();
  });
};

// Create new alumni
router.post('/', runProfileUpload, async (req, res) => {
  try {
    const { 
      email, 
      firstName, 
      lastName, 
      graduationYear, 
      course, 
      currentPosition, 
      company, 
      skills, 
      profileImage,
      contactNumber,
      level,
      batch
    } = req.body;
    // Be tolerant to casing differences coming from the client
    const location = (req.body.location ?? req.body.Location) || null;

    // Validate required fields
    if (!firstName || !lastName || !graduationYear || !course) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['firstName', 'lastName', 'graduationYear', 'course']
      });
    }

    // Only check for existing user if email is provided
    let user = null;
    if (email && email.trim()) {
      // Only look for existing users, don't create new ones
      user = await prisma.user.findUnique({ where: { email: email.trim() } });
      
      if (user) {
        // Check if user already has an alumni profile
        const existingAlumni = await prisma.alumni.findUnique({ 
          where: { user_id: user.id } 
        });
        if (existingAlumni) {
          return res.status(400).json({ 
            error: 'An alumni profile already exists for this email address' 
          });
        }
      }
    }

    // Prepare alumni data
    // Normalize level to enum values if provided
    const normalizeLevel = (val) => {
      if (!val) return null;
      const s = String(val).toLowerCase().replace(/\s+/g, '_');
      if (['college', 'col'].includes(s) || s.includes('college')) return 'COLLEGE';
      if (['high_school', 'highschool', 'hs', 'junior_high'].includes(s)) return 'HIGH_SCHOOL';
      if (['senior_high_school', 'senior_high', 'shs', 'seniorhigh'].includes(s)) return 'SENIOR_HIGH_SCHOOL';
      return null;
    };

    const alumniData = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email ? email.trim() : null,
      contact_number: contactNumber ? String(contactNumber).trim() : null,
      level: normalizeLevel(level),
      batch: batch ? parseInt(batch) : null,
      graduation_year: parseInt(graduationYear),
      course: course.trim(),
      current_position: currentPosition ? currentPosition.trim() : null,
      company: company ? company.trim() : null,
      location: location ? String(location).trim() : null,
      skills: Array.isArray(skills) ? skills.join(', ') : (skills ? String(skills) : null),
      profile_image: req.file ? `/uploads/profiles/${req.file.filename}` : (profileImage || null)
    };

    // Only add user_id if we found an existing user
    if (user) {
      alumniData.user_id = user.id;
    }

    let newAlumni;
    try {
      // Create alumni record
      newAlumni = await prisma.alumni.create({
        data: alumniData
      });
    } catch (err) {
      // Fallback if the DB/schema doesn't yet have contact_number
      const msg = String(err?.message || '');
      const badContact = msg.includes('Unknown arg `contact_number`') || msg.includes('Unknown column') || msg.includes('contact_number');
      const badLevel = msg.includes('Unknown arg `level`') || msg.includes('Unknown column') || msg.includes('level');
      const badBatch = msg.includes('Unknown arg `batch`') || msg.includes('Unknown column') || msg.includes('batch');

      if (badContact || badLevel || badBatch) {
        const { contact_number, level, batch, ...rest } = alumniData;
        newAlumni = await prisma.alumni.create({ data: rest });
      } else {
        throw err;
      }
    }

    res.status(201).json(newAlumni);
  } catch (error) {
    console.error('Error creating alumni:', error);
    res.status(500).json({ 
      error: 'Failed to create alumni record',
      details: error.message 
    });
  }
});

// Get alumni by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const alumni = await prisma.alumni.findUnique({
      where: { id: Number(id) },
      include: {
        user: {
          select: {
            email: true
          }
        },
        social_link: true
      }
    });

    if (!alumni) {
      return res.status(404).json({ error: 'Alumni not found' });
    }

    res.json(alumni);
  } catch (error) {
    console.error('Error fetching alumni:', error);
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
});

// Update alumni
router.put('/:id', runProfileUpload, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if alumni exists
    const existingAlumni = await prisma.alumni.findUnique({
      where: { id: Number(id) },
      include: { user: true }
    });

    if (!existingAlumni) {
      return res.status(404).json({ error: 'Alumni not found' });
    }

    // Build update data from request body
    const updateData = {};
    
    if (req.body.firstName && req.body.firstName.trim()) {
      updateData.first_name = req.body.firstName.trim();
    }
    if (req.body.lastName && req.body.lastName.trim()) {
      updateData.last_name = req.body.lastName.trim();
    }
    if (req.body.email !== undefined) {
      updateData.email = req.body.email && req.body.email.trim() ? req.body.email.trim() : null;
    }
    if (req.body.contactNumber !== undefined || req.body.phone !== undefined) {
      const num = req.body.contactNumber !== undefined ? req.body.contactNumber : req.body.phone;
      updateData.contact_number = num && String(num).trim() ? String(num).trim() : null;
    }
    if (req.body.graduationYear) {
      const year = parseInt(req.body.graduationYear);
      if (!isNaN(year)) {
        updateData.graduation_year = year;
      }
    }
    // Level normalization
    if (req.body.level !== undefined) {
      const raw = req.body.level;
      const s = raw ? String(raw).toLowerCase().replace(/\s+/g, '_') : '';
      let normalized = null;
      if (['college', 'col'].includes(s) || s.includes('college')) normalized = 'COLLEGE';
      else if (['high_school', 'highschool', 'hs', 'junior_high'].includes(s)) normalized = 'HIGH_SCHOOL';
      else if (['senior_high_school', 'senior_high', 'shs', 'seniorhigh'].includes(s)) normalized = 'SENIOR_HIGH_SCHOOL';
      updateData.level = normalized;
    }
    if (req.body.batch !== undefined) {
      const b = parseInt(req.body.batch);
      updateData.batch = isNaN(b) ? null : b;
    }
    if (req.body.course && req.body.course.trim()) {
      updateData.course = req.body.course.trim();
    }
    if (req.body.currentPosition !== undefined) {
      updateData.current_position = req.body.currentPosition && req.body.currentPosition.trim() ? req.body.currentPosition.trim() : null;
    }
    if (req.body.company !== undefined) {
      updateData.company = req.body.company && req.body.company.trim() ? req.body.company.trim() : null;
    }
    const locationIncoming = req.body.location !== undefined ? req.body.location : req.body.Location;
    if (locationIncoming !== undefined) {
      updateData.location = locationIncoming ? String(locationIncoming).trim() : null;
    }
    if (req.body.skills !== undefined) {
      if (Array.isArray(req.body.skills)) {
        updateData.skills = req.body.skills.length ? req.body.skills.join(', ') : null;
      } else {
        updateData.skills = req.body.skills ? String(req.body.skills).trim() : null;
      }
    }
    
    // Handle profile image upload
    if (req.file) {
      updateData.profile_image = `/uploads/profiles/${req.file.filename}`;
    } else if (req.body.profileImage && req.body.profileImage.includes('/uploads/')) {
      updateData.profile_image = req.body.profileImage;
    }

    // Log the update data for debugging
    console.log('Updating alumni ID:', id);
    console.log('Update data:', JSON.stringify(updateData, null, 2));
    console.log('Has file upload:', !!req.file);
    if (req.file) {
      console.log('File details:', {
        filename: req.file.filename,
        size: req.file.size,
        mimetype: req.file.mimetype
      });
    }

    // Validate that we have at least some data to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        error: 'No valid data provided for update' 
      });
    }

    let updatedAlumni;
    try {
      // Update alumni record
      updatedAlumni = await prisma.alumni.update({
        where: { id: Number(id) },
        data: updateData,
        include: {
          user: {
            select: {
              email: true
            }
          }
        }
      });
    } catch (err) {
      const msg = String(err?.message || '');
      const badContact = msg.includes('Unknown arg `contact_number`') || msg.includes('Unknown column') || msg.includes('contact_number');
      const badLevel = msg.includes('Unknown arg `level`') || msg.includes('Unknown column') || msg.includes('level');
      const badBatch = msg.includes('Unknown arg `batch`') || msg.includes('Unknown column') || msg.includes('batch');
      if (badContact || badLevel || badBatch) {
        const { contact_number, level, batch, ...rest } = updateData;
        updatedAlumni = await prisma.alumni.update({
          where: { id: Number(id) },
          data: rest,
          include: {
            user: { select: { email: true } }
          }
        });
      } else {
        throw err;
      }
    }

    console.log('Alumni updated successfully:', updatedAlumni.id);
    res.json(updatedAlumni);
  } catch (error) {
    console.error('=== ERROR UPDATING ALUMNI ===');
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    console.error('Request body keys:', Object.keys(req.body));
    console.error('============================');
    res.status(500).json({ 
      error: 'Failed to update alumni',
      details: error.message,
      code: error.code
    });
  }
});

// Delete alumni
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if alumni exists and get user_id
    const existingAlumni = await prisma.alumni.findUnique({
      where: { id: Number(id) }
    });

    if (!existingAlumni) {
      return res.status(404).json({ error: 'Alumni not found' });
    }

    const userId = existingAlumni.user_id;

    // Delete alumni record first (this will cascade to related records)
    await prisma.alumni.delete({
      where: { id: Number(id) }
    });

    // If alumni had a user_id, delete the user record too
    if (userId) {
      try {
        await prisma.user.delete({
          where: { id: userId }
        });
        console.log(`✅ Deleted user ${userId} along with alumni ${id}`);
      } catch (userDeleteError) {
        console.error('Error deleting associated user:', userDeleteError);
        // Continue even if user deletion fails (user might already be deleted)
      }
    }

    res.json({ message: 'Alumni and associated user deleted successfully' });
  } catch (error) {
    console.error('Error deleting alumni:', error);
    res.status(500).json({ 
      error: 'Failed to delete alumni',
      details: error.message 
    });
  }
});

// ===== Social Link Routes =====

// Helper function to detect platform from URL
function detectPlatform(url) {
  const urlLower = url.toLowerCase();
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.com')) return 'Facebook';
  if (urlLower.includes('linkedin.com')) return 'LinkedIn';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'Twitter';
  if (urlLower.includes('instagram.com')) return 'Instagram';
  if (urlLower.includes('github.com')) return 'GitHub';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'YouTube';
  if (urlLower.includes('tiktok.com')) return 'TikTok';
  return 'Other';
}

// Add social link
router.post('/:id/social-links', authMiddleware, async (req, res) => {
  try {
    const alumniId = Number(req.params.id);
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check if alumni exists and user owns this profile
    const alumni = await prisma.alumni.findUnique({
      where: { id: alumniId },
      include: { user: true }
    });

    if (!alumni) {
      return res.status(404).json({ error: 'Alumni not found' });
    }

    // Only allow the owner or admin to add social links
    if (req.user.id !== alumni.user_id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Auto-detect platform from URL
    const platform = detectPlatform(url);

    const socialLink = await prisma.social_link.create({
      data: {
        alumni_id: alumniId,
        platform,
        url
      }
    });

    res.status(201).json(socialLink);
  } catch (error) {
    console.error('Error adding social link:', error);
    res.status(500).json({ error: 'Failed to add social link' });
  }
});

// Update social link
router.put('/:id/social-links/:linkId', authMiddleware, async (req, res) => {
  try {
    const alumniId = Number(req.params.id);
    const linkId = Number(req.params.linkId);
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check if alumni exists and user owns this profile
    const alumni = await prisma.alumni.findUnique({
      where: { id: alumniId },
      include: { user: true }
    });

    if (!alumni) {
      return res.status(404).json({ error: 'Alumni not found' });
    }

    // Only allow the owner or admin to update social links
    if (req.user.id !== alumni.user_id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Auto-detect platform from URL
    const platform = detectPlatform(url);

    const socialLink = await prisma.social_link.update({
      where: { id: linkId },
      data: {
        platform,
        url
      }
    });

    res.json(socialLink);
  } catch (error) {
    console.error('Error updating social link:', error);
    res.status(500).json({ error: 'Failed to update social link' });
  }
});

// Delete social link
router.delete('/:id/social-links/:linkId', authMiddleware, async (req, res) => {
  try {
    const alumniId = Number(req.params.id);
    const linkId = Number(req.params.linkId);

    // Check if alumni exists and user owns this profile
    const alumni = await prisma.alumni.findUnique({
      where: { id: alumniId },
      include: { user: true }
    });

    if (!alumni) {
      return res.status(404).json({ error: 'Alumni not found' });
    }

    // Only allow the owner or admin to delete social links
    if (req.user.id !== alumni.user_id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.social_link.delete({
      where: { id: linkId }
    });

    res.json({ message: 'Social link deleted successfully' });
  } catch (error) {
    console.error('Error deleting social link:', error);
    res.status(500).json({ error: 'Failed to delete social link' });
  }
});

module.exports = router;