const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { buildChangeSet, recordActivity } = require('../services/activityLogService');
const { broadcastUpdate } = require('../services/realtimeService');
const { syncTableSequence } = require('../services/dbSequenceService');

const prisma = require('../config/prisma');
const multer = require('multer');
const jobParserService = require('../services/jobParserService');
const { cleanHtmlToFormattedText } = require('../utils/cleanText');
const router = express.Router();

const isStaffRequest = (req) => {
  const role = String(req.user?.role || '').toUpperCase();
  const email = String(req.user?.email || '').toLowerCase();
  return role === 'TEACHER' || role === 'ADMIN' || email.endsWith('@lccbonline.com');
};

const getAuthenticatedAlumniId = async (req) => {
  const tokenAlumniId = Number(req.user?.alumniId || req.user?.alumni_id || 0);
  if (Number.isFinite(tokenAlumniId) && tokenAlumniId > 0) {
    return tokenAlumniId;
  }

  const userId = Number(req.user?.id || 0);
  if (Number.isFinite(userId) && userId > 0) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { alumni: { select: { id: true } } }
    });
    if (user?.alumni?.id) return Number(user.alumni.id);
  }

  const email = typeof req.user?.email === 'string' ? req.user.email : '';
  if (email) {
    const alumni = await prisma.alumni.findFirst({
      where: { email },
      select: { id: true }
    });
    if (alumni?.id) return Number(alumni.id);
  }

  return null;
};

const normalizeJobRow = (row) => {
  if (!row) return null;

  return {
    id: row.id,
    posted_by_alumni_id: row.posted_by_alumni_id,
    job_title: row.job_title,
    company: row.company,
    location: row.location,
    department: row.department,
    job_type: row.job_type,
    salary_range: row.salary_range,
    requirements: row.requirements,
    benefits: row.benefits,
    description: row.description,
    application_url: row.application_url,
    application_deadline: row.application_deadline,
    created_at: row.created_at,
    updated_at: row.updated_at,
    alumni: row.alumni_id
      ? {
          id: row.alumni_id,
          user_id: row.alumni_user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          profile_image: row.profile_image
        }
      : null
  };
};

const normalizeApplicationUrl = (value, { required = false } = {}) => {
  const raw = String(value || '').trim();
  if (!raw) {
    if (required) {
      const error = new Error('Application Link is required');
      error.statusCode = 400;
      throw error;
    }
    return null;
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    const error = new Error('Application Link must be a valid URL');
    error.statusCode = 400;
    throw error;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    const error = new Error('Application Link must use http or https');
    error.statusCode = 400;
    throw error;
  }

  return parsed.toString();
};

const selectJobSql = `
  SELECT
    jp.id,
    jp.posted_by_alumni_id,
    jp.job_title,
    jp.company,
    jp.location,
    jp.department,
    jp.job_type,
    jp.salary_range,
    jp.requirements,
    jp.benefits,
    jp.description,
    jp.application_url,
    jp.application_deadline,
    jp.created_at,
    jp.updated_at,
    a.id AS alumni_id,
    a.user_id AS alumni_user_id,
    a.first_name,
    a.last_name,
    a.email,
    a.profile_image
  FROM job_posting jp
  LEFT JOIN alumni a ON a.id = jp.posted_by_alumni_id
`;

const getJobById = async (client, id) => {
  const rows = await client.$queryRawUnsafe(
    `${selectJobSql} WHERE jp.id = $1 LIMIT 1`,
    Number(id)
  );
  return normalizeJobRow(rows[0]);
};

// Get all job postings
router.get('/', async (req, res) => {
  try {
    const rows = await prisma.$queryRawUnsafe(`${selectJobSql} ORDER BY jp.created_at DESC`);
    res.json(rows.map(normalizeJobRow));
  } catch (error) {
    console.error('Error fetching job postings:', error);
    res.status(500).json({ error: 'Failed to fetch job postings' });
  }
});

// Get job posting by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await getJobById(prisma, req.params.id);

    if (!job) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    res.json(job);
  } catch (error) {
    console.error('Error fetching job posting:', error);
    res.status(500).json({ error: 'Failed to fetch job posting' });
  }
});

const scanStorage = multer.memoryStorage();
const scanUpload = multer({
  storage: scanStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(pdf|txt|text|doc|docx)$/i;
    if (allowed.test(file.originalname) || file.mimetype === 'application/pdf' || file.mimetype.startsWith('text/')) {
      return cb(null, true);
    }
    cb(new Error('Unsupported file type. Please upload a PDF, DOC, DOCX, or TXT document.'));
  }
});

const handleScanUpload = (req, res, next) => {
  scanUpload.single('file')(req, res, (err) => {
    if (err) {
      const isSize = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({
        error: isSize ? 'File exceeds 10MB limit.' : (err.message || 'File upload error')
      });
    }
    next();
  });
};

// Scan / parse job details from URL, uploaded document, or text
router.post('/parse-job', authenticateToken, handleScanUpload, async (req, res) => {
  try {
    let result = null;

    if (req.file) {
      result = await jobParserService.parseFile(req.file.buffer, req.file.mimetype, req.file.originalname);
    } else if (req.body.url && typeof req.body.url === 'string' && req.body.url.trim()) {
      result = await jobParserService.parseUrl(req.body.url.trim());
    } else if (req.body.text && typeof req.body.text === 'string' && req.body.text.trim()) {
      result = await jobParserService.parseText(req.body.text.trim());
    } else {
      return res.status(400).json({
        error: 'Please provide a job URL, upload a file (PDF/Doc/Image), or paste job details text.'
      });
    }

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error parsing job posting content:', error);
    return res.status(400).json({
      error: error.message || 'Failed to scan and extract job details'
    });
  }
});

// Create new external job posting
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      posted_by_alumni_id,
      job_title,
      company,
      location,
      department,
      job_type,
      salary_range,
      requirements,
      benefits,
      description,
      application_url,
      application_deadline
    } = req.body;

    const normalizedApplicationUrl = normalizeApplicationUrl(application_url, { required: true });

    if (!job_title || !company) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['job_title', 'company', 'application_url']
      });
    }

    const authenticatedAlumniId = await getAuthenticatedAlumniId(req);
    let posterId = null;
    if (isStaffRequest(req)) {
      posterId = posted_by_alumni_id ? Number(posted_by_alumni_id) : authenticatedAlumniId;
    } else {
      if (!authenticatedAlumniId) {
        return res.status(403).json({ error: 'You must have an alumni profile to post jobs' });
      }
      posterId = authenticatedAlumniId;
    }

    const sanitizedDescription = description ? cleanHtmlToFormattedText(description) : null;

    const job = await prisma.$transaction(async (tx) => {
      const inserted = await tx.$queryRaw`
        INSERT INTO job_posting (
          posted_by_alumni_id,
          job_title,
          company,
          location,
          department,
          job_type,
          salary_range,
          requirements,
          benefits,
          description,
          application_url,
          application_deadline
        ) VALUES (
          ${posterId},
          ${job_title},
          ${company},
          ${location || null},
          ${department || null},
          ${job_type || null},
          ${salary_range || null},
          ${requirements || null},
          ${benefits || null},
          ${sanitizedDescription},
          ${normalizedApplicationUrl},
          ${application_deadline ? new Date(application_deadline) : null}
        ) RETURNING id
      `;

      const createdId = Number(inserted?.[0]?.id);
      return getJobById(tx, createdId);
    });

    await recordActivity({
      req,
      action: 'CREATE',
      entityType: 'job_posting',
      entityId: job.id,
      entityLabel: job.job_title,
      summary: `Created job posting "${job.job_title}"`,
      details: { company: job.company, location: job.location }
    });

    broadcastUpdate('job.created', { jobId: job.id });

    res.status(201).json(job);
  } catch (error) {
    console.error('Error creating job posting:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Failed to create job posting',
      details: error.statusCode ? undefined : error.message
    });
  }
});

// Update job posting
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const oldJob = await getJobById(prisma, id);

    if (!oldJob) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    const isStaff = isStaffRequest(req);
    const authenticatedAlumniId = await getAuthenticatedAlumniId(req);

    if (!isStaff) {
      if (!authenticatedAlumniId || Number(oldJob.posted_by_alumni_id) !== Number(authenticatedAlumniId)) {
        return res.status(403).json({ error: 'You can only update your own job posts' });
      }
    }

    const {
      posted_by_alumni_id,
      job_title,
      company,
      location,
      department,
      job_type,
      salary_range,
      requirements,
      benefits,
      description,
      application_url,
      application_deadline
    } = req.body;

    const updateData = {};
    if (job_title !== undefined) updateData.job_title = String(job_title || '').trim();
    if (company !== undefined) updateData.company = String(company || '').trim();
    if (location !== undefined) updateData.location = location ? String(location).trim() : null;
    if (department !== undefined) updateData.department = department ? String(department).trim() : null;
    if (job_type !== undefined) updateData.job_type = job_type ? String(job_type).trim() : null;
    if (salary_range !== undefined) updateData.salary_range = salary_range || null;
    if (requirements !== undefined) updateData.requirements = requirements || null;
    if (benefits !== undefined) updateData.benefits = benefits || null;
    if (description !== undefined) updateData.description = description ? cleanHtmlToFormattedText(description) : null;
    if (application_url !== undefined) {
      updateData.application_url = normalizeApplicationUrl(application_url, { required: true });
    }
    if (application_deadline !== undefined) {
      updateData.application_deadline = application_deadline && !isNaN(new Date(application_deadline).getTime())
        ? new Date(application_deadline)
        : null;
    }
    if (posted_by_alumni_id !== undefined && isStaffRequest(req)) {
      const parsedAlumniId = Number.parseInt(posted_by_alumni_id, 10);
      updateData.posted_by_alumni_id = Number.isInteger(parsedAlumniId) && parsedAlumniId > 0 ? parsedAlumniId : null;
    }

    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date();
      await prisma.job_posting.update({
        where: { id: Number(id) },
        data: updateData
      });
    }

    const job = await getJobById(prisma, id);
    if (!job) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    await recordActivity({
      req,
      action: 'UPDATE',
      entityType: 'job_posting',
      entityId: job.id,
      entityLabel: job.job_title,
      summary: `Updated job posting "${job.job_title}"`,
      details: {
        changes: buildChangeSet(oldJob, job, [
          { key: 'job_title', label: 'Job Title' },
          { key: 'company', label: 'Company' },
          { key: 'location', label: 'Location' },
          { key: 'department', label: 'Department' },
          { key: 'job_type', label: 'Job Type' },
          { key: 'salary_range', label: 'Salary Range' },
          { key: 'requirements', label: 'Requirements' },
          { key: 'benefits', label: 'Benefits' },
          { key: 'description', label: 'Description' },
          { key: 'application_url', label: 'Application URL' },
          { key: 'application_deadline', label: 'Application Deadline' }
        ])
      }
    });

    broadcastUpdate('job.updated', { jobId: job.id });

    res.json(job);
  } catch (error) {
    console.error('Error updating job posting:', error);
    res.status(error.statusCode || 500).json({
      error: error.statusCode ? error.message : 'Failed to update job posting',
      details: error.statusCode ? undefined : error.message
    });
  }
});

// Delete job posting
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const job = await getJobById(prisma, id);

    if (!job) {
      return res.status(404).json({ error: 'Job posting not found' });
    }

    const isStaff = isStaffRequest(req);
    const authenticatedAlumniId = await getAuthenticatedAlumniId(req);

    if (!isStaff) {
      if (!authenticatedAlumniId || Number(job.posted_by_alumni_id) !== Number(authenticatedAlumniId)) {
        return res.status(403).json({ error: 'You can only delete your own job posts' });
      }
    }

    await prisma.job_posting.delete({
      where: { id: Number(id) }
    });

    await recordActivity({
      req,
      action: 'DELETE',
      entityType: 'job_posting',
      entityId: Number(id),
      entityLabel: job.job_title,
      summary: `Deleted job posting "${job.job_title}"`,
      details: {
        deletedRecord: {
          jobTitle: job.job_title,
          company: job.company,
          location: job.location,
          department: job.department,
          applicationDeadline: job.application_deadline
        }
      }
    });

    broadcastUpdate('job.deleted', { jobId: Number(id) });

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
