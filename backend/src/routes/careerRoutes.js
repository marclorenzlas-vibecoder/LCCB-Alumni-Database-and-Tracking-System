const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { broadcastUpdate } = require('../services/realtimeService');
const prisma = new PrismaClient();
const router = express.Router();

// Get all career entries
router.get('/', async (req, res) => {
  try {
    const careers = await prisma.career_entry.findMany({
      include: {
        alumni: {
          select: {
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: { start_date: 'desc' }
    });
    res.json(careers);
  } catch (error) {
    console.error('Error fetching all career entries:', error);
    res.status(500).json({ error: 'Failed to fetch career entries' });
  }
});

// Get all career entries for an alumni
router.get('/alumni/:alumniId', async (req, res) => {
  try {
    const { alumniId } = req.params;
    const careers = await prisma.career_entry.findMany({
      where: { alumni_id: Number(alumniId) },
      orderBy: { start_date: 'desc' }
    });
    res.json(careers);
  } catch (error) {
    console.error('Error fetching career entries:', error);
    res.status(500).json({ error: 'Failed to fetch career entries' });
  }
});

// Create new career entry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { alumni_id, company, job_title, start_date, end_date, description, is_current } = req.body;

    if (!alumni_id || !company || !job_title) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['alumni_id', 'company', 'job_title']
      });
    }

    const career = await prisma.career_entry.create({
      data: {
        alumni_id: Number(alumni_id),
        company: company.trim(),
        job_title: job_title.trim(),
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        description: description ? description.trim() : null,
        is_current: is_current || false
      }
    });

    broadcastUpdate('career.created', { careerId: career.id, alumniId: career.alumni_id });

    res.status(201).json(career);
  } catch (error) {
    console.error('Error creating career entry:', error);
    res.status(500).json({ 
      error: 'Failed to create career entry',
      details: error.message 
    });
  }
});

// Update career entry
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { company, job_title, start_date, end_date, description, is_current } = req.body;

    const updateData = {};
    if (company) updateData.company = company.trim();
    if (job_title) updateData.job_title = job_title.trim();
    if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (is_current !== undefined) updateData.is_current = is_current;

    const career = await prisma.career_entry.update({
      where: { id: Number(id) },
      data: updateData
    });

    broadcastUpdate('career.updated', { careerId: career.id, alumniId: career.alumni_id });

    res.json(career);
  } catch (error) {
    console.error('Error updating career entry:', error);
    res.status(500).json({ 
      error: 'Failed to update career entry',
      details: error.message 
    });
  }
});

// Delete career entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.career_entry.findUnique({ where: { id: Number(id) }, select: { alumni_id: true } });
    await prisma.career_entry.delete({
      where: { id: Number(id) }
    });

    broadcastUpdate('career.deleted', { careerId: Number(id), alumniId: existing?.alumni_id || null });

    res.json({ message: 'Career entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting career entry:', error);
    res.status(500).json({ 
      error: 'Failed to delete career entry',
      details: error.message 
    });
  }
});

module.exports = router;
