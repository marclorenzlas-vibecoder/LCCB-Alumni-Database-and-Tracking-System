const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { alumniAuthMiddleware, teacherAuthMiddleware, flexibleAuthMiddleware } = require('../middleware/auth');

// ensure uploads/donations exists
const donationsDir = path.join(__dirname, '../../uploads/donations');
if (!fs.existsSync(donationsDir)) {
  fs.mkdirSync(donationsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, donationsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'donation-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype);
    if (ok) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  }
});

// Get all donations
router.get('/', async (req, res) => {
  try {
    const donations = await prisma.donation.findMany({
      include: {
        alumni: {
          select: {
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: { date: 'desc' }
    });
    res.json(donations);
  } catch (error) {
    console.error('Error fetching all donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// Get all donations for an alumni
router.get('/alumni/:alumniId', async (req, res) => {
  try {
    const { alumniId } = req.params;
    const donations = await prisma.donation.findMany({
      where: { alumni_id: Number(alumniId) },
      orderBy: { date: 'desc' }
    });
    res.json(donations);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// Check weekly donation limit status for an alumni
router.get('/alumni/:alumniId/weekly-status', async (req, res) => {
  try {
    const { alumniId } = req.params;
    const alumniIdNum = Number(alumniId);

    // Calculate start of current week (Sunday)
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    // Count donations from this alumni this week
    const weeklyDonationCount = await prisma.donation.count({
      where: {
        alumni_id: alumniIdNum,
        date: {
          gte: startOfWeek
        }
      }
    });

    const limit = 3;
    const remaining = Math.max(0, limit - weeklyDonationCount);
    const nextResetDate = new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000);

    res.json({
      alumniId: alumniIdNum,
      weeklyLimit: limit,
      donationsThisWeek: weeklyDonationCount,
      remaining: remaining,
      canDonate: remaining > 0,
      weekStartDate: startOfWeek.toISOString().split('T')[0],
      nextResetDate: nextResetDate.toISOString().split('T')[0]
    });
  } catch (error) {
    console.error('Error checking weekly status:', error);
    res.status(500).json({ error: 'Failed to check donation status' });
  }
});

// Create new donation (Requires authentication: Alumni for personal donations, Teachers for campaigns)
router.post('/', flexibleAuthMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { amount, date, purpose, description, category, goal } = req.body;

    if (!amount || !purpose) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['amount', 'purpose']
      });
    }

    const userRole = req.user.role?.toUpperCase();
    let alumniIdNum = null;

    // Handle based on user role
    if (userRole === 'ALUMNI') {
      // Alumni making a personal donation
      alumniIdNum = req.user.alumniId;

      if (!alumniIdNum) {
        return res.status(400).json({
          error: 'Alumni ID not found',
          message: 'Your account is not linked to an alumni profile. Please contact support.'
        });
      }

      // Verify alumni exists
      const alumni = await prisma.alumni.findUnique({
        where: { id: alumniIdNum }
      });

      if (!alumni) {
        return res.status(404).json({
          error: 'Alumni not found',
          message: 'Your alumni profile could not be found. Please contact support.'
        });
      }

      // Check if alumni is verified
      if (!alumni.is_verified) {
        return res.status(403).json({
          error: 'Account not verified',
          message: 'Only verified alumni can make donations. Please wait for your account to be verified.'
        });
      }

      // Check weekly donation limit (3 donations per week per alumni)
      // Check weekly donation limit (3 donations per week per alumni)
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Count donations from this alumni this week
      const weeklyDonationCount = await prisma.donation.count({
        where: {
          alumni_id: alumniIdNum,
          date: {
            gte: startOfWeek
          }
        }
      });

      // Limit: 3 donations per week
      if (weeklyDonationCount >= 3) {
        return res.status(429).json({
          error: 'Weekly donation limit reached',
          message: 'You can only make 3 donations per week. Please try again next week.',
          limit: 3,
          current: weeklyDonationCount,
          resetDate: new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        });
      }

      console.log('✅ Creating donation for authenticated alumni ID:', alumniIdNum);
    } else if (userRole === 'TEACHER') {
      // Teacher creating a donation campaign (no alumni_id linkage)
      console.log('✅ Teacher creating donation campaign');
    } else {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Only alumni and teachers can create donations.'
      });
    }

    const imagePath = req.file ? `/uploads/donations/${req.file.filename}` : null;

    const donation = await prisma.donation.create({
      data: {
        alumni_id: alumniIdNum, // Will be null for teacher-created campaigns
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        purpose: purpose.trim(),
        description: description ? description.trim() : null,
        image: imagePath,
        category: category ? category.trim() : null,
        goal: goal ? parseFloat(goal) : null
      }
    });

    res.status(201).json(donation);
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({ 
      error: 'Failed to create donation',
      details: error.message 
    });
  }
});

// Update donation (Teacher only)
router.put('/:id', teacherAuthMiddleware, upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, date, purpose, description, category, goal } = req.body;

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (date !== undefined) updateData.date = date ? new Date(date) : null;
    if (purpose !== undefined) updateData.purpose = purpose ? purpose.trim() : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (category !== undefined) updateData.category = category ? category.trim() : null;
    if (goal !== undefined) updateData.goal = goal ? parseFloat(goal) : null;

    // Add image path if uploaded
    if (req.file) {
      updateData.image = `/uploads/donations/${req.file.filename}`;
      
      // Delete old image if exists
      const oldDonation = await prisma.donation.findUnique({ where: { id: Number(id) } });
      if (oldDonation?.image) {
        const oldImagePath = path.join(__dirname, '../../', oldDonation.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    const donation = await prisma.donation.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json(donation);
  } catch (error) {
    console.error('Error updating donation:', error);
    res.status(500).json({ 
      error: 'Failed to update donation',
      details: error.message 
    });
  }
});

// Delete donation (Teacher only)
router.delete('/:id', teacherAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the donation to find its image
    const donationToDelete = await prisma.donation.findUnique({
      where: { id: Number(id) }
    });

    if (!donationToDelete) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    // Delete the donation
    await prisma.donation.delete({
      where: { id: Number(id) }
    });

    // Delete the image file if it exists
    if (donationToDelete.image) {
      const imagePath = path.join(__dirname, '../../', donationToDelete.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: 'Donation deleted successfully' });
  } catch (error) {
    console.error('Error deleting donation:', error);
    res.status(500).json({ 
      error: 'Failed to delete donation',
      details: error.message 
    });
  }
});

module.exports = router;
