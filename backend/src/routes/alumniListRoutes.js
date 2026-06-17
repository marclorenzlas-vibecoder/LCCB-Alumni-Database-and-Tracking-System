const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get all alumni from alumni_list
router.get('/', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.set('Pragma', 'no-cache');
    const { search, graduation_year, batch, level } = req.query;
    
    const where = {};
    
    // Search by student_id, first_name, or last_name
    if (search) {
      where.OR = [
        { student_id: { contains: search } },
        { first_name: { contains: search } },
        { last_name: { contains: search } }
      ];
    }
    
    if (graduation_year) {
      where.graduation_year = parseInt(graduation_year);
    }
    
    if (batch) {
      where.batch = parseInt(batch);
    }
    
    if (level) {
      where.level = level;
    }
    
    const alumniList = await prisma.alumni_list.findMany({
      where,
      orderBy: [
        { graduation_year: 'desc' },
        { last_name: 'asc' }
      ]
    });
    
    res.json(alumniList);
  } catch (error) {
    console.error('Error fetching alumni list:', error);
    res.status(500).json({ error: 'Failed to fetch alumni list' });
  }
});

// Search by student ID specifically
router.get('/search/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const alumni = await prisma.alumni_list.findUnique({
      where: { student_id: studentId }
    });
    
    if (alumni) {
      res.json({
        found: true,
        alumni
      });
    } else {
      res.json({
        found: false,
        message: 'Student ID not found in alumni list'
      });
    }
  } catch (error) {
    console.error('Error searching student ID:', error);
    res.status(500).json({ error: 'Failed to search student ID' });
  }
});

// Get statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await prisma.alumni_list.count();
    
    const byYear = await prisma.alumni_list.groupBy({
      by: ['graduation_year'],
      _count: true,
      orderBy: { graduation_year: 'desc' }
    });
    
    const byCourse = await prisma.alumni_list.groupBy({
      by: ['course'],
      _count: true,
      orderBy: { _count: { course: 'desc' } }
    });
    
    res.json({
      total,
      by_year: byYear.map(y => ({ year: y.graduation_year, count: y._count })),
      by_course: byCourse.map(c => ({ course: c.course, count: c._count }))
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Add new alumni to list (admin only)
router.post('/', async (req, res) => {
  try {
    const { student_id, first_name, last_name, middle_name, course, level, batch, graduation_year } = req.body;
    
    if (!student_id || !first_name || !last_name) {
      return res.status(400).json({ error: 'Student ID, first name, and last name are required' });
    }
    
    const alumni = await prisma.alumni_list.create({
      data: {
        student_id,
        first_name,
        last_name,
        middle_name: middle_name || null,
        course: course || null,
        level: level || null,
        batch: batch ? parseInt(batch) : null,
        graduation_year: graduation_year ? parseInt(graduation_year) : null,
        status: 'GRADUATED'
      }
    });
    
    res.json({ success: true, alumni });
  } catch (error) {
    console.error('Error adding alumni:', error);
    if (error.code === 'P2002') {
      res.status(400).json({ error: 'Student ID already exists' });
    } else {
      res.status(500).json({ error: 'Failed to add alumni' });
    }
  }
});

// Update alumni record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { student_id, first_name, last_name, middle_name, course, level, batch, graduation_year, status } = req.body;
    
    const alumni = await prisma.alumni_list.update({
      where: { id: parseInt(id) },
      data: {
        student_id,
        first_name,
        last_name,
        middle_name,
        course,
        level,
        batch: batch ? parseInt(batch) : null,
        graduation_year: graduation_year ? parseInt(graduation_year) : null,
        status: status || 'GRADUATED'
      }
    });
    
    res.json({ success: true, alumni });
  } catch (error) {
    console.error('Error updating alumni:', error);
    res.status(500).json({ error: 'Failed to update alumni' });
  }
});

// Delete alumni record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.alumni_list.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ success: true, message: 'Alumni deleted successfully' });
  } catch (error) {
    console.error('Error deleting alumni:', error);
    res.status(500).json({ error: 'Failed to delete alumni' });
  }
});

module.exports = router;
