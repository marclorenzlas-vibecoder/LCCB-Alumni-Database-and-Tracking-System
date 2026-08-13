const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { broadcastUpdate } = require('../services/realtimeService');
const { buildChangeSet, recordActivity } = require('../services/activityLogService');
const { inferProgramAlignment, normalizeProgramAlignment } = require('../utils/programAlignment');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const softAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization || req.headers['x-access-token'] || '';
    const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
    req.user = token ? jwt.verify(token, JWT_SECRET) : null;
  } catch {
    req.user = null;
  }
  next();
};

const isStaffRequest = (req) => {
  const role = String(req.user?.role || '').toUpperCase();
  return role === 'TEACHER' || role === 'ADMIN';
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

const canViewCareerForAlumni = (req, alumni) => {
  if (!alumni) return false;
  if (isStaffRequest(req)) return true;

  const viewerId = Number(req.user?.id);
  const viewerAlumniId = Number(req.user?.alumniId || req.user?.alumni_id);
  const viewerEmail = String(req.user?.email || '').toLowerCase();
  const alumniEmail = String(alumni.email || '').toLowerCase();

  if (viewerId && Number(alumni.user_id) === viewerId) return true;
  if (viewerAlumniId && Number(alumni.id) === viewerAlumniId) return true;
  if (viewerEmail && alumniEmail && viewerEmail === alumniEmail) return true;

  return alumni.is_employment_public === true;
};

const canUpdateCareerMatch = (req, career, authenticatedAlumniId) => {
  if (!career || isStaffRequest(req)) return false;
  if (authenticatedAlumniId && Number(authenticatedAlumniId) === Number(career.alumni_id)) return true;

  const viewerId = Number(req.user?.id || 0);
  if (viewerId && Number(career.alumni?.user_id || 0) === viewerId) return true;

  const viewerEmail = String(req.user?.email || '').trim().toLowerCase();
  const alumniEmail = String(career.alumni?.email || '').trim().toLowerCase();
  return Boolean(viewerEmail && alumniEmail && viewerEmail === alumniEmail);
};

// Get all career entries
router.get('/', softAuth, async (req, res) => {
  try {
    const careers = await prisma.career_entry.findMany({
      include: {
        alumni: {
          select: {
            id: true,
            user_id: true,
            first_name: true,
            last_name: true,
            email: true,
            is_position_public: true,
            is_employment_public: true
          }
        }
      },
      orderBy: { start_date: 'desc' }
    });
    res.json(careers.filter((career) => canViewCareerForAlumni(req, career.alumni)));
  } catch (error) {
    console.error('Error fetching all career entries:', error);
    res.status(500).json({ error: 'Failed to fetch career entries' });
  }
});

// Get all career entries for an alumni
router.get('/alumni/:alumniId', softAuth, async (req, res) => {
  try {
    const { alumniId } = req.params;
    const alumni = await prisma.alumni.findUnique({
      where: { id: Number(alumniId) },
      select: {
        id: true,
        user_id: true,
        email: true,
        is_position_public: true,
        is_employment_public: true
      }
    });

    if (!canViewCareerForAlumni(req, alumni)) {
      return res.json([]);
    }

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
    const {
      alumni_id,
      company,
      job_title,
      start_date,
      end_date,
      description,
      is_current,
      program_alignment,
      alignment_notes
    } = req.body;

    if (!alumni_id || !company || !job_title) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['alumni_id', 'company', 'job_title']
      });
    }

    const requestedAlumniId = Number(alumni_id);
    const authenticatedAlumniId = await getAuthenticatedAlumniId(req);
    if (!isStaffRequest(req) && authenticatedAlumniId !== requestedAlumniId) {
      return res.status(403).json({ error: 'You can only create career entries for your own profile' });
    }

    const alumni = await prisma.alumni.findUnique({
      where: { id: requestedAlumniId },
      select: { course: true }
    });
    const inferredAlignment = inferProgramAlignment({
      course: alumni?.course,
      jobTitle: job_title,
      company,
      description
    });
    const isOwnerAlumni = !isStaffRequest(req) && authenticatedAlumniId === requestedAlumniId;
    const manualAlignment = isOwnerAlumni && program_alignment !== undefined
      ? normalizeProgramAlignment(program_alignment)
      : null;

    if (isOwnerAlumni && program_alignment && !manualAlignment) {
      return res.status(400).json({
        error: 'Program match must be Related, Not Related, or Needs Checking',
        allowed: ['ALIGNED', 'NOT_ALIGNED', 'NEEDS_REVIEW']
      });
    }

    const career = await prisma.career_entry.create({
      data: {
        alumni_id: requestedAlumniId,
        company: company.trim(),
        job_title: job_title.trim(),
        start_date: start_date ? new Date(start_date) : null,
        end_date: end_date ? new Date(end_date) : null,
        description: description ? description.trim() : null,
        is_current: is_current || false,
        program_alignment: manualAlignment || inferredAlignment.status,
        alignment_notes: manualAlignment && alignment_notes ? alignment_notes.trim() : inferredAlignment.notes
      }
    });

    broadcastUpdate('career.created', { careerId: career.id, alumniId: career.alumni_id });

    await recordActivity({
      req,
      action: 'CREATE',
      entityType: 'career_entry',
      entityId: career.id,
      entityLabel: `${career.job_title} at ${career.company}`,
      summary: `Created employment record "${career.job_title} at ${career.company}"`,
      details: {
        alumniId: career.alumni_id,
        programAlignment: career.program_alignment
      }
    });

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
    const {
      company,
      job_title,
      start_date,
      end_date,
      description,
      is_current,
      program_alignment,
      alignment_notes
    } = req.body;
    const oldCareer = await prisma.career_entry.findUnique({
      where: { id: Number(id) },
      include: {
        alumni: {
          select: {
            course: true,
            email: true,
            user_id: true
          }
        }
      }
    });

    if (!oldCareer) {
      return res.status(404).json({ error: 'Career entry not found' });
    }

    const authenticatedAlumniId = await getAuthenticatedAlumniId(req);
    if (!isStaffRequest(req) && authenticatedAlumniId !== oldCareer.alumni_id) {
      return res.status(403).json({ error: 'You can only update your own career entries' });
    }

    const updateData = {};
    if (company) updateData.company = company.trim();
    if (job_title) updateData.job_title = job_title.trim();
    if (start_date !== undefined) updateData.start_date = start_date ? new Date(start_date) : null;
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (is_current !== undefined) updateData.is_current = is_current;
    const isOwnerAlumni = canUpdateCareerMatch(req, oldCareer, authenticatedAlumniId);

    if (isStaffRequest(req) && program_alignment !== undefined) {
      return res.status(403).json({ error: 'Only the alumni can update the program match for their employment record' });
    }

    if (isOwnerAlumni && program_alignment !== undefined) {
      const manualAlignment = normalizeProgramAlignment(program_alignment);
      if (!manualAlignment) {
        return res.status(400).json({
          error: 'Program match must be Related, Not Related, or Needs Checking',
          allowed: ['ALIGNED', 'NOT_ALIGNED', 'NEEDS_REVIEW']
        });
      }
      updateData.program_alignment = manualAlignment;
    }
    if (isOwnerAlumni && alignment_notes !== undefined) {
      updateData.alignment_notes = alignment_notes ? alignment_notes.trim() : null;
    }

    if (!oldCareer.program_alignment && program_alignment === undefined) {
      const inferredAlignment = inferProgramAlignment({
        course: oldCareer.alumni?.course,
        jobTitle: updateData.job_title || oldCareer.job_title,
        company: updateData.company || oldCareer.company,
        description: updateData.description !== undefined ? updateData.description : oldCareer.description
      });
      updateData.program_alignment = inferredAlignment.status;
      if (alignment_notes === undefined) updateData.alignment_notes = inferredAlignment.notes;
    }

    const career = await prisma.career_entry.update({
      where: { id: Number(id) },
      data: updateData
    });

    broadcastUpdate('career.updated', { careerId: career.id, alumniId: career.alumni_id });

    await recordActivity({
      req,
      action: 'UPDATE',
      entityType: 'career_entry',
      entityId: career.id,
      entityLabel: `${career.job_title} at ${career.company}`,
      summary: `Updated employment record "${career.job_title} at ${career.company}"`,
      details: {
        changes: buildChangeSet(oldCareer, career, [
          { key: 'company', label: 'Company' },
          { key: 'job_title', label: 'Job Title' },
          { key: 'start_date', label: 'Start Date' },
          { key: 'end_date', label: 'End Date' },
          { key: 'description', label: 'Description' },
          { key: 'is_current', label: 'Current Job' },
          { key: 'program_alignment', label: 'Program Alignment' },
          { key: 'alignment_notes', label: 'Alignment Notes' }
        ])
      }
    });

    res.json(career);
  } catch (error) {
    console.error('Error updating career entry:', error);
    res.status(500).json({ 
      error: 'Failed to update career entry',
      details: error.message 
    });
  }
});

// Update course/program match for an employment record (alumni owner only)
router.patch('/:id/program-match', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { program_alignment, alignment_notes } = req.body;
    const normalizedAlignment = normalizeProgramAlignment(program_alignment);

    if (!normalizedAlignment) {
      return res.status(400).json({
        error: 'Program match is required',
        allowed: ['ALIGNED', 'NOT_ALIGNED', 'NEEDS_REVIEW']
      });
    }

    const oldCareer = await prisma.career_entry.findUnique({
      where: { id: Number(id) },
      include: {
        alumni: {
          select: {
            email: true,
            user_id: true
          }
        }
      }
    });

    if (!oldCareer) {
      return res.status(404).json({ error: 'Career entry not found' });
    }

    const authenticatedAlumniId = await getAuthenticatedAlumniId(req);
    if (!canUpdateCareerMatch(req, oldCareer, authenticatedAlumniId)) {
      return res.status(403).json({ error: 'Only the alumni can update the program match for their employment record' });
    }

    const career = await prisma.career_entry.update({
      where: { id: Number(id) },
      data: {
        program_alignment: normalizedAlignment,
        alignment_notes: alignment_notes ? String(alignment_notes).trim() : null
      }
    });

    broadcastUpdate('career.updated', { careerId: career.id, alumniId: career.alumni_id });

    await recordActivity({
      req,
      action: 'UPDATE',
      entityType: 'career_entry',
      entityId: career.id,
      entityLabel: `${career.job_title} at ${career.company}`,
      summary: `Updated employment match for "${career.job_title} at ${career.company}"`,
      details: {
        changes: buildChangeSet(oldCareer, career, [
          { key: 'program_alignment', label: 'Program Match' },
          { key: 'alignment_notes', label: 'Review Notes' }
        ])
      }
    });

    res.json(career);
  } catch (error) {
    console.error('Error updating career program match:', error);
    res.status(500).json({
      error: 'Failed to update career program match',
      details: error.message
    });
  }
});

// Update course/program match for an employment record (alumni owner only)
router.patch('/:id/review', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { program_alignment, alignment_notes } = req.body;
    const normalizedAlignment = normalizeProgramAlignment(program_alignment);

    if (!normalizedAlignment) {
      return res.status(400).json({
        error: 'Program match is required',
        allowed: ['ALIGNED', 'NOT_ALIGNED', 'NEEDS_REVIEW']
      });
    }

    const oldCareer = await prisma.career_entry.findUnique({
      where: { id: Number(id) },
      include: {
        alumni: {
          select: {
            email: true,
            user_id: true
          }
        }
      }
    });

    if (!oldCareer) {
      return res.status(404).json({ error: 'Career entry not found' });
    }

    const authenticatedAlumniId = await getAuthenticatedAlumniId(req);
    if (!canUpdateCareerMatch(req, oldCareer, authenticatedAlumniId)) {
      return res.status(403).json({ error: 'Only the alumni can update the program match for their employment record' });
    }

    const career = await prisma.career_entry.update({
      where: { id: Number(id) },
      data: {
        program_alignment: normalizedAlignment,
        alignment_notes: alignment_notes ? String(alignment_notes).trim() : null
      }
    });

    broadcastUpdate('career.updated', { careerId: career.id, alumniId: career.alumni_id });

    await recordActivity({
      req,
      action: 'UPDATE',
      entityType: 'career_entry',
      entityId: career.id,
      entityLabel: `${career.job_title} at ${career.company}`,
      summary: `Updated employment match for "${career.job_title} at ${career.company}"`,
      details: {
        changes: buildChangeSet(oldCareer, career, [
          { key: 'program_alignment', label: 'Program Match' },
          { key: 'alignment_notes', label: 'Review Notes' }
        ])
      }
    });

    res.json(career);
  } catch (error) {
    console.error('Error reviewing career entry:', error);
    res.status(500).json({
      error: 'Failed to review career entry',
      details: error.message
    });
  }
});

// Delete career entry
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.career_entry.findUnique({ where: { id: Number(id) } });

    if (!existing) {
      return res.status(404).json({ error: 'Career entry not found' });
    }

    const authenticatedAlumniId = await getAuthenticatedAlumniId(req);
    if (!isStaffRequest(req) && authenticatedAlumniId !== existing.alumni_id) {
      return res.status(403).json({ error: 'You can only delete your own career entries' });
    }

    await prisma.career_entry.delete({
      where: { id: Number(id) }
    });

    broadcastUpdate('career.deleted', { careerId: Number(id), alumniId: existing?.alumni_id || null });

    await recordActivity({
      req,
      action: 'DELETE',
      entityType: 'career_entry',
      entityId: Number(id),
      entityLabel: existing ? `${existing.job_title} at ${existing.company}` : `Career #${id}`,
      summary: `Deleted employment record "${existing ? `${existing.job_title} at ${existing.company}` : `#${id}`}"`,
      details: {
        deletedRecord: existing ? {
          jobTitle: existing.job_title,
          company: existing.company,
          startDate: existing.start_date,
          endDate: existing.end_date,
          alumniId: existing.alumni_id
        } : null
      }
    });

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
