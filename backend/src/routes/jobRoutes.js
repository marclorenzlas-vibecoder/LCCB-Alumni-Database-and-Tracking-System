const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();

// Get all job postings
router.get('/', async (req, res) => {
  try {
    const jobs = await prisma.job_posting.findMany({
      include: {
        alumni: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching job postings:', error);
    res.status(500).json({ error: 'Failed to fetch job postings' });
  }
});

// Get job posting by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await prisma.job_posting.findUnique({
      where: { id: Number(id) },
      include: {
        alumni: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true
          }
        }
      }
    });

    if (!job) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job posting:', error);
    res.status(500).json({ error: 'Failed to fetch job posting' });
  }
});

// Create new job posting
router.post('/', async (req, res) => {
  try {
    const {
      posted_by_alumni_id,
      job_title,
      company,
      location,
      job_type,
      salary_range,
      requirements,
      description,
      application_deadline
    } = req.body;

    if (!job_title || !company) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['job_title', 'company']
      });
    }

    const job = await prisma.job_posting.create({
      data: {
        posted_by_alumni_id: posted_by_alumni_id ? Number(posted_by_alumni_id) : null,
        job_title,
        company,
        location,
        job_type,
        salary_range,
        requirements,
        description,
        application_deadline: application_deadline ? new Date(application_deadline) : null
      }
    });

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job posting:', error);
    res.status(500).json({
      error: 'Failed to create job posting',
      details: error.message
    });
  }
});

// Update job posting
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      job_title,
      company,
      location,
      job_type,
      salary_range,
      requirements,
      description,
      application_deadline
    } = req.body;

    const updateData = {};
    if (job_title) updateData.job_title = job_title;
    if (company) updateData.company = company;
    if (location !== undefined) updateData.location = location;
    if (job_type !== undefined) updateData.job_type = job_type;
    if (salary_range !== undefined) updateData.salary_range = salary_range;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (description !== undefined) updateData.description = description;
    if (application_deadline !== undefined) {
      updateData.application_deadline = application_deadline ? new Date(application_deadline) : null;
    }

    const job = await prisma.job_posting.update({
      where: { id: Number(id) },
      data: updateData
    });

    res.json(job);
  } catch (error) {
    console.error('Error updating job posting:', error);
    res.status(500).json({
      error: 'Failed to update job posting',
      details: error.message
    });
  }
});

// Delete job posting
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.job_posting.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Job posting deleted successfully' });
  } catch (error) {
    console.error('Error deleting job posting:', error);
    res.status(500).json({
      error: 'Failed to delete job posting',
      details: error.message
    });
  }
});

module.exports = router;
