const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// Get all achievements
router.get('/', async (req, res) => {
  try {
    const achievements = await prisma.achievement.findMany({
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
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching all achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Get all achievements for an alumni
router.get('/alumni/:alumniId', async (req, res) => {
  try {
    const { alumniId } = req.params;
    const achievements = await prisma.achievement.findMany({
      where: { alumni_id: Number(alumniId) },
      orderBy: { date: 'desc' }
    });
    res.json(achievements);
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

// Create new achievement (with optional image upload)
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ensure uploads/achievements exists
const achievementsDir = path.join(__dirname, '../../uploads/achievements');
if (!fs.existsSync(achievementsDir)) {
  fs.mkdirSync(achievementsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, achievementsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'achievement-' + uniqueSuffix + path.extname(file.originalname));
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

router.post('/', upload.single('image'), async (req, res) => {
  try {
    // fields come from multipart/form-data
    const { alumni_id, title, description, date } = req.body;

    if (!alumni_id || !title) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['alumni_id', 'title']
      });
    }

    const imagePath = req.file ? `/uploads/achievements/${req.file.filename}` : null;

    const achievement = await prisma.achievement.create({
      data: {
        alumni_id: Number(alumni_id),
        title: title.trim(),
        image: imagePath,
        description: description ? description.trim() : null,
        date: date ? new Date(date) : null
      }
    });

    res.status(201).json(achievement);
  } catch (error) {
    console.error('Error creating achievement:', error);
    res.status(500).json({ 
      error: 'Failed to create achievement',
      details: error.message 
    });
  }
});

// Update achievement
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date } = req.body;

    const updateData = {};
    if (title) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (date !== undefined) updateData.date = date ? new Date(date) : null;

    // Add image path if uploaded
    if (req.file) {
      updateData.image = `/uploads/achievements/${req.file.filename}`;
      
      // Delete old image if exists
      const oldAchievement = await prisma.achievement.findUnique({ where: { id: Number(id) } });
      if (oldAchievement?.image) {
        const oldImagePath = path.join(__dirname, '../../', oldAchievement.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    const achievement = await prisma.achievement.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json(achievement);
  } catch (error) {
    console.error('Error updating achievement:', error);
    res.status(500).json({ 
      error: 'Failed to update achievement',
      details: error.message 
    });
  }
});

// Delete an achievement
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get the achievement to find its image
    const achievementToDelete = await prisma.achievement.findUnique({
      where: { id: parseInt(id) }
    });

    if (!achievementToDelete) {
      return res.status(404).json({ error: 'Achievement not found' });
    }

    // Delete the achievement
    await prisma.achievement.delete({
      where: { id: parseInt(id) }
    });

    // Delete the image file if it exists
    if (achievementToDelete.image) {
      const imagePath = path.join(__dirname, '../../', achievementToDelete.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ message: 'Achievement deleted successfully' });
  } catch (error) {
    console.error('Error deleting achievement:', error);
    res.status(500).json({ error: 'Failed to delete achievement' });
  }
});

module.exports = router;
