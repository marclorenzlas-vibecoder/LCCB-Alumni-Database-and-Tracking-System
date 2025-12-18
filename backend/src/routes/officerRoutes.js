const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, teacherAuthMiddleware } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Position hierarchy for ordering
const positionOrder = {
  'President': 1,
  'Vice President': 2,
  'Secretary': 3,
  'Treasurer': 4,
  'Auditor': 5,
  'Public Relations Officer': 6,
  'Business Manager': 7
};

// Get all officers for a specific batch
router.get('/batch/:batch', async (req, res) => {
  try {
    const batch = parseInt(req.params.batch);
    
    const officers = await prisma.batch_officer.findMany({
      where: { batch },
      include: {
        alumni: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true,
            course: true,
            current_position: true,
            company: true
          }
        }
      }
    });
    
    // Sort by position hierarchy
    officers.sort((a, b) => {
      const orderA = positionOrder[a.position] || 999;
      const orderB = positionOrder[b.position] || 999;
      return orderA - orderB;
    });
    
    res.json(officers);
  } catch (error) {
    console.error('Error fetching batch officers:', error);
    res.status(500).json({ message: 'Failed to fetch batch officers' });
  }
});

// Get all batches with their officers count
router.get('/summary', async (req, res) => {
  try {
    const summary = await prisma.batch_officer.groupBy({
      by: ['batch'],
      _count: {
        id: true
      },
      orderBy: {
        batch: 'desc'
      }
    });
    
    res.json(summary);
  } catch (error) {
    console.error('Error fetching officers summary:', error);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

// Get all officers (with optional filters)
router.get('/', async (req, res) => {
  try {
    const { batch, position } = req.query;
    
    const where = {};
    if (batch) where.batch = parseInt(batch);
    if (position) where.position = position;
    
    const officers = await prisma.batch_officer.findMany({
      where,
      include: {
        alumni: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true,
            course: true,
            batch: true
          }
        }
      },
      orderBy: [
        { batch: 'desc' },
        { position: 'asc' }
      ]
    });
    
    res.json(officers);
  } catch (error) {
    console.error('Error fetching officers:', error);
    res.status(500).json({ message: 'Failed to fetch officers' });
  }
});

// Create/Assign a new officer (Teacher only)
router.post('/', teacherAuthMiddleware, async (req, res) => {
  try {
    const { alumni_id, batch, position, term_start, term_end } = req.body;
    
    if (!alumni_id || !batch || !position) {
      return res.status(400).json({ message: 'Alumni ID, batch, and position are required' });
    }
    
    // Check if alumni exists and belongs to the batch
    const alumni = await prisma.alumni.findUnique({
      where: { id: parseInt(alumni_id) }
    });
    
    if (!alumni) {
      return res.status(404).json({ message: 'Alumni not found' });
    }
    
    if (alumni.batch !== parseInt(batch)) {
      return res.status(400).json({ message: 'Alumni does not belong to this batch' });
    }
    
    // Create officer assignment
    const officer = await prisma.batch_officer.create({
      data: {
        alumni_id: parseInt(alumni_id),
        batch: parseInt(batch),
        position,
        term_start: term_start ? parseInt(term_start) : null,
        term_end: term_end ? parseInt(term_end) : null
      },
      include: {
        alumni: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true
          }
        }
      }
    });
    
    res.status(201).json(officer);
  } catch (error) {
    console.error('Error creating officer:', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'This alumni already holds this position for this batch' });
    }
    
    res.status(500).json({ message: 'Failed to create officer' });
  }
});

// Update an officer (Teacher only)
router.put('/:id', teacherAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { position, term_start, term_end } = req.body;
    
    const data = {};
    if (position) data.position = position;
    if (term_start !== undefined) data.term_start = term_start ? parseInt(term_start) : null;
    if (term_end !== undefined) data.term_end = term_end ? parseInt(term_end) : null;
    
    const officer = await prisma.batch_officer.update({
      where: { id: parseInt(id) },
      data,
      include: {
        alumni: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_image: true
          }
        }
      }
    });
    
    res.json(officer);
  } catch (error) {
    console.error('Error updating officer:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Officer not found' });
    }
    
    res.status(500).json({ message: 'Failed to update officer' });
  }
});

// Delete an officer (Teacher only)
router.delete('/:id', teacherAuthMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.batch_officer.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({ message: 'Officer removed successfully' });
  } catch (error) {
    console.error('Error deleting officer:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Officer not found' });
    }
    
    res.status(500).json({ message: 'Failed to delete officer' });
  }
});

module.exports = router;
