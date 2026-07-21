const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const notificationService = require('../services/notificationService');
const { authenticateToken } = require('../middleware/auth');
const { buildChangeSet, recordActivity } = require('../services/activityLogService');
const { inferProgramAlignment } = require('../utils/programAlignment');

const applicationsDir = path.join(__dirname, '../../uploads/applications');
if (!fs.existsSync(applicationsDir)) {
  fs.mkdirSync(applicationsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, applicationsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExt = /pdf|doc|docx/;
    const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document/.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }

    cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
  }
});

const runResumeUpload = (req, res, next) => {
  upload.single('resume_file')(req, res, (err) => {
    if (err) {
      const isSize = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({
        error: isSize ? 'Resume file is too large. Max size is 10MB.' : (err.message || 'Invalid resume upload')
      });
    }
    next();
  });
};

const APPLICATION_META_PREFIX = '[APPLICATION_META]';

const buildApplicationMeta = (payload = {}) => {
  const contactMethod = String(payload.contact_method || '').trim().toLowerCase();
  const contactEmail = String(payload.contact_email || '').trim();
  const contactNumber = String(payload.contact_number || '').trim();

  const meta = {};
  if (contactMethod === 'email' || contactMethod === 'phone') meta.contact_method = contactMethod;
  if (contactEmail) meta.contact_email = contactEmail;
  if (contactNumber) meta.contact_number = contactNumber;

  return Object.keys(meta).length > 0 ? meta : null;
};

const parseApplicationMeta = (notes) => {
  if (!notes || typeof notes !== 'string') return {};
  if (!notes.startsWith(APPLICATION_META_PREFIX)) return {};

  try {
    const rawFull = notes.slice(APPLICATION_META_PREFIX.length);
    const firstLine = rawFull.split('\n')[0].trim();
    const raw = firstLine || rawFull;
    const parsed = JSON.parse(raw);
    return {
      contact_method: parsed.contact_method || null,
      contact_email: parsed.contact_email || null,
      contact_number: parsed.contact_number || null
    };
  } catch (error) {
    return {};
  }
};

const attachApplicationMeta = (application) => {
  const meta = parseApplicationMeta(application?.notes);
  return {
    ...application,
    ...meta
  };
};

// Submit a job application (Alumni applies to a job)
router.post('/', runResumeUpload, async (req, res) => {
  try {
    const {
      job_posting_id,
      applicant_id,
      cover_letter,
      resume_url,
      contact_method,
      contact_email,
      contact_number
    } = req.body;

    const uploadedResumeUrl = req.file ? `/uploads/applications/${req.file.filename}` : null;
    const finalResumeUrl = uploadedResumeUrl || resume_url || null;
    const applicationMeta = buildApplicationMeta({ contact_method, contact_email, contact_number });

    console.log('📝 Application submission request:', {
      job_posting_id,
      applicant_id,
      has_cover_letter: !!cover_letter,
      has_resume: !!finalResumeUrl
    });

    if (!job_posting_id || !applicant_id) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['job_posting_id', 'applicant_id']
      });
    }

    if (!cover_letter || !String(cover_letter).trim()) {
      return res.status(400).json({
        error: 'Cover letter is required'
      });
    }

    // Check if job posting exists
    const jobPosting = await prisma.job_posting.findUnique({
      where: { id: Number(job_posting_id) }
    });

    if (!jobPosting) {
      console.error('❌ Job posting not found:', job_posting_id);
      return res.status(404).json({ error: 'Job posting not found' });
    }

    // Check if alumni exists
    const alumni = await prisma.alumni.findUnique({
      where: { id: Number(applicant_id) }
    });

    if (!alumni) {
      console.error('❌ Alumni not found:', applicant_id);
      return res.status(404).json({ error: 'Alumni not found' });
    }

    console.log('✅ Job and alumni found, checking for existing application...');

    // Check if already applied
    const existingApplication = await prisma.job_application.findUnique({
      where: {
        job_posting_id_applicant_id: {
          job_posting_id: Number(job_posting_id),
          applicant_id: Number(applicant_id)
        }
      }
    });

    if (existingApplication) {
      console.log('⚠️ Duplicate application detected');
      return res.status(400).json({ 
        error: 'You have already applied to this job posting' 
      });
    }

    console.log('✅ Creating new application...');

    // Create the application
    const application = await prisma.job_application.create({
      data: {
        job_posting_id: Number(job_posting_id),
        applicant_id: Number(applicant_id),
        cover_letter: String(cover_letter).trim(),
        resume_url: finalResumeUrl,
        notes: applicationMeta ? `${APPLICATION_META_PREFIX}${JSON.stringify(applicationMeta)}` : null,
        status: 'PENDING'
      },
      include: {
        applicant: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            contact_number: true,
            current_position: true,
            company: true,
            skills: true,
            bio: true
          }
        },
        job_posting: {
          select: {
            id: true,
            job_title: true,
            company: true,
            posted_by_alumni_id: true
          }
        }
      }
    });

    console.log('✅ Application created successfully:', application.id);

    // Create notification for the job poster (employer/teacher)
    try {
      console.log('📬 Attempting to notify job poster, posted_by_alumni_id:', application.job_posting.posted_by_alumni_id);
      
      if (!application.job_posting.posted_by_alumni_id) {
        console.warn('⚠️ No posted_by_alumni_id found for job posting');
        throw new Error('Job posting has no posted_by_alumni_id');
      }
      
      const jobPoster = await prisma.alumni.findUnique({
        where: { id: application.job_posting.posted_by_alumni_id },
        include: { 
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              notification_enabled: true
            }
          }
        }
      });

      console.log('📬 Job poster query result:', {
        found: !!jobPoster,
        alumni_id: jobPoster?.id,
        alumni_name: jobPoster ? `${jobPoster.first_name} ${jobPoster.last_name}` : null,
        has_user: !!jobPoster?.user,
        user_id: jobPoster?.user?.id,
        user_email: jobPoster?.user?.email,
        notification_enabled: jobPoster?.user?.notification_enabled
      });

      if (!jobPoster) {
        console.error('❌ Job poster alumni not found with ID:', application.job_posting.posted_by_alumni_id);
        throw new Error('Job poster alumni not found');
      }

      if (!jobPoster.user) {
        console.error('❌ Job poster alumni has no user account linked. Alumni:', {
          id: jobPoster.id,
          name: `${jobPoster.first_name} ${jobPoster.last_name}`,
          email: jobPoster.email,
          user_id: jobPoster.user_id
        });
        throw new Error('Job poster has no user account');
      }

      console.log('📧 Creating notification for user:', jobPoster.user.id);
      const notification = await notificationService.createUserNotification(jobPoster.user.id, {
        type: 'JOB_APPLICATION',
        title: 'New Job Application Received',
        message: `${application.applicant.first_name} ${application.applicant.last_name} applied for ${application.job_posting.job_title}`,
        link: `/job-applications/${application.job_posting_id}`
      });
      console.log('✅ Notification created successfully:', notification.id);

      // Also create notification for Admins who have notify_job_applications enabled
      try {
        const adminsToNotify = await prisma.user.findMany({
          where: {
            role: 'ADMIN',
            is_active: true,
            is_blocked: false,
            notification_enabled: true,
            notify_job_applications: true
          },
          select: { id: true }
        });

        console.log(`📧 Notifying ${adminsToNotify.length} admins about job application`);

        for (const admin of adminsToNotify) {
          // Skip if the admin is also the job poster to avoid duplicate alerts
          if (admin.id === jobPoster.user.id) continue;

          await notificationService.createUserNotification(admin.id, {
            type: 'JOB_APPLICATION',
            title: 'Alumni Job Application Alert (Admin)',
            message: `${application.applicant.first_name} ${application.applicant.last_name} applied for the job "${application.job_posting.job_title}" at "${application.job_posting.company}"`,
            link: `/job-applications/${application.job_posting_id}`
          });
        }
      } catch (adminNotifError) {
        console.error('❌ Failed to notify admins about job application:', adminNotifError.message);
      }
    } catch (notifError) {
      console.error('❌ Failed to create notification:', notifError.message);
      console.error('Error details:', notifError);
      // Don't fail the application if notification fails
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application: attachApplicationMeta(application)
    });
  } catch (error) {
    console.error('❌ Error submitting application:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
    res.status(500).json({
      error: 'Failed to submit application',
      details: error.message
    });
  }
});

// Get all applications for a specific job posting (for employer/job poster)
router.get('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;

    const applications = await prisma.job_application.findMany({
      where: { job_posting_id: Number(jobId) },
      include: {
        applicant: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            contact_number: true,
            current_position: true,
            company: true,
            location: true,
            skills: true,
            bio: true,
            graduation_year: true,
            course: true,
            level: true,
            profile_image: true
          }
        }
      },
      orderBy: { applied_at: 'desc' }
    });

    res.json(applications.map(attachApplicationMeta));
  } catch (error) {
    console.error('Error fetching job applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get all applications by a specific alumni (for alumni to see their applications)
router.get('/alumni/:alumniId', async (req, res) => {
  try {
    const { alumniId } = req.params;

    const applications = await prisma.job_application.findMany({
      where: { applicant_id: Number(alumniId) },
      include: {
        job_posting: {
          select: {
            id: true,
            job_title: true,
            company: true,
            location: true,
            job_type: true,
            salary_range: true,
            application_deadline: true,
            posted_by_alumni_id: true
          }
        }
      },
      orderBy: { applied_at: 'desc' }
    });

    res.json(applications.map(attachApplicationMeta));
  } catch (error) {
    console.error('Error fetching alumni applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// Get resume file for a specific application
router.get('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.job_application.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        resume_url: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (!application.resume_url) {
      return res.status(404).json({ error: 'Resume not found for this application' });
    }

    const normalizedRelativePath = String(application.resume_url).replace(/^\/+/, '');
    const absolutePath = path.join(__dirname, '../../', normalizedRelativePath);
    const normalizedAbsolute = path.normalize(absolutePath);
    const normalizedBase = path.normalize(applicationsDir + path.sep);

    // Prevent path traversal and ensure files only come from uploads/applications
    if (!normalizedAbsolute.startsWith(normalizedBase)) {
      return res.status(400).json({ error: 'Invalid resume path' });
    }

    if (!fs.existsSync(normalizedAbsolute)) {
      return res.status(404).json({ error: 'Resume file is missing on server' });
    }

    const ext = path.extname(normalizedAbsolute).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const fileName = path.basename(normalizedAbsolute);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    return res.sendFile(normalizedAbsolute);
  } catch (error) {
    console.error('Error fetching application resume:', error);
    return res.status(500).json({ error: 'Failed to fetch resume file' });
  }
});

// Get a specific application by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const application = await prisma.job_application.findUnique({
      where: { id: Number(id) },
      include: {
        applicant: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            contact_number: true,
            current_position: true,
            company: true,
            location: true,
            skills: true,
            bio: true,
            graduation_year: true,
            course: true,
            level: true,
            profile_image: true
          }
        },
        job_posting: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(attachApplicationMeta(application));
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Update application status (for employer/job poster)
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'ACCEPTED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        validStatuses 
      });
    }

    const existingApplication = await prisma.job_application.findUnique({
      where: { id: Number(id) },
      select: { id: true, notes: true, status: true }
    });

    if (!existingApplication) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const updateData = {};
    if (status) {
      updateData.status = status;
      updateData.reviewed_at = new Date();
    }
    if (notes !== undefined) {
      const meta = parseApplicationMeta(existingApplication.notes);
      const hasMeta = Object.keys(meta).length > 0;
      const reviewerNotes = String(notes || '').trim();
      updateData.notes = hasMeta
        ? `${APPLICATION_META_PREFIX}${JSON.stringify(meta)}${reviewerNotes ? `\n\n${reviewerNotes}` : ''}`
        : reviewerNotes;
    }

    const application = await prisma.job_application.update({
      where: { id: Number(id) },
      data: updateData,
      include: {
        applicant: {
          include: {
            user: true
          }
        },
        job_posting: {
          select: {
            id: true,
            job_title: true,
            company: true,
            location: true,
            description: true
          }
        }
      }
    });
    
    console.log('📝 Application updated:', {
      id: application.id,
      status: application.status,
      hasUser: !!application.applicant.user,
      userId: application.applicant.user?.id
    });

    // If status is ACCEPTED, automatically create a career/employment history record
    if (status === 'ACCEPTED') {
      try {
        console.log('🏢 Creating employment history record for accepted application...');
        console.log('📋 Application data:', {
          applicantId: application.applicant.id,
          jobTitle: application.job_posting.job_title,
          company: application.job_posting.company
        });
        
        // Check if career record already exists for this job application
        const existingCareer = await prisma.career_entry.findFirst({
          where: {
            alumni_id: application.applicant.id,
            job_title: application.job_posting.job_title,
            company: application.job_posting.company
          }
        });

        if (!existingCareer) {
          const inferredAlignment = inferProgramAlignment({
            course: application.applicant.course,
            jobTitle: application.job_posting.job_title,
            company: application.job_posting.company,
            description: application.job_posting.description
          });
          const newCareerEntry = await prisma.career_entry.create({
            data: {
              alumni_id: application.applicant.id,
              job_title: application.job_posting.job_title,
              company: application.job_posting.company,
              start_date: new Date(), // Set to current date when accepted
              is_current: true, // Mark as current position
              description: `Position obtained through LCCB Alumni job posting`,
              program_alignment: inferredAlignment.status,
              alignment_notes: inferredAlignment.notes
            }
          });
          console.log('✅ Employment history record created successfully:', newCareerEntry);
        } else {
          console.log('ℹ️ Employment history record already exists:', existingCareer);
        }
      } catch (careerError) {
        console.error('❌ Failed to create employment history record:', careerError);
        console.error('❌ Error details:', {
          message: careerError.message,
          code: careerError.code,
          meta: careerError.meta
        });
        // Don't fail the whole request if career creation fails
      }
    }

    // Create notification for the applicant about status change
    if (status) {
      try {
        console.log('📬 Attempting to notify applicant about status change:', {
          status,
          applicantId: application.applicant.id,
          hasUser: !!application.applicant.user,
          userId: application.applicant.user?.id
        });
        
        if (!application.applicant.user) {
          console.warn('⚠️ Applicant user not found, cannot send notification');
        } else {
          const statusNotifications = {
            PENDING: {
              title: `Application Submitted: ${application.job_posting.job_title}`,
              message: `Your application for ${application.job_posting.job_title} at ${application.job_posting.company} has been submitted successfully. The employer will review your qualifications.`
            },
            REVIEWED: {
              title: `Application Being Reviewed: ${application.job_posting.job_title}`,
              message: `Good news! Your application for ${application.job_posting.job_title} at ${application.job_posting.company} is currently being reviewed by the employer.`
            },
            SHORTLISTED: {
              title: `You've Been Shortlisted: ${application.job_posting.job_title}`,
              message: `Congratulations! You have been shortlisted for ${application.job_posting.job_title} at ${application.job_posting.company}. The employer may contact you soon.`
            },
            ACCEPTED: {
              title: `Application Accepted: ${application.job_posting.job_title}`,
              message: `Congratulations! Your application for ${application.job_posting.job_title} at ${application.job_posting.company} has been ACCEPTED. The employer will contact you with next steps.`
            },
            REJECTED: {
              title: `Application Update: ${application.job_posting.job_title}`,
              message: `Thank you for your interest in ${application.job_posting.job_title} at ${application.job_posting.company}. Unfortunately, they have decided to move forward with other candidates. Keep applying - new opportunities are posted regularly!`
            }
          };

          const notificationConfig = statusNotifications[status] || {
            title: `Application Update: ${application.job_posting.job_title}`,
            message: `Your application status for ${application.job_posting.job_title} at ${application.job_posting.company} has been updated.`
          };
          
          await notificationService.createUserNotification(application.applicant.user.id, {
            type: 'JOB_APPLICATION',
            title: notificationConfig.title,
            message: notificationConfig.message,
            link: `/employment`
          });
          console.log(`✅ Notification sent to applicant about ${status} status`);
        }
      } catch (notifError) {
        console.error('❌ Failed to create applicant notification:', notifError);
        console.error('Error stack:', notifError.stack);
      }
    }

    if (status) {
      const applicantName = [
        application.applicant?.first_name,
        application.applicant?.last_name
      ].filter(Boolean).join(' ') || application.applicant?.email || 'applicant';

      await recordActivity({
        req,
        action: 'STATUS_CHANGE',
        entityType: 'job_application',
        entityId: application.id,
        entityLabel: application.job_posting?.job_title,
        summary: `Changed ${applicantName}'s application for "${application.job_posting?.job_title}" to ${status}`,
        details: {
          changes: buildChangeSet(existingApplication, application, [
            { key: 'status', label: 'Application Status' }
          ]),
          jobPostingId: application.job_posting?.id || null,
          applicantId: application.applicant?.id || null
        }
      });
    }

    res.json({
      message: 'Application status updated successfully',
      application
    });
  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
});

// Delete/withdraw an application
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.user || !req.user.role || String(req.user.role).toUpperCase() !== 'ALUMNI') {
      return res.status(403).json({ error: 'Only alumni can withdraw applications' });
    }

    let alumniId = req.user.alumniId || req.user.alumni_id || null;

    if (!alumniId && req.user.id) {
      const applicantUser = await prisma.user.findUnique({
        where: { id: Number(req.user.id) },
        select: {
          id: true,
          email: true,
          alumni: {
            select: { id: true }
          }
        }
      });

      alumniId = applicantUser?.alumni?.id || null;

      if (!alumniId && applicantUser?.email) {
        const emailMatch = await prisma.user.findUnique({
          where: { email: applicantUser.email },
          select: {
            alumni: {
              select: { id: true }
            }
          }
        });

        alumniId = emailMatch?.alumni?.id || null;
      }
    }

    if (!alumniId && req.user.email) {
      const emailUser = await prisma.user.findUnique({
        where: { email: req.user.email },
        select: {
          alumni: {
            select: { id: true }
          }
        }
      });

      alumniId = emailUser?.alumni?.id || null;
    }

    if (!alumniId) {
      return res.status(403).json({ error: 'Alumni profile not found for this account' });
    }

    const application = await prisma.job_application.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        applicant_id: true,
        status: true
      }
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    if (application.applicant_id !== alumniId) {
      return res.status(403).json({ error: 'You can only withdraw your own application' });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({ error: 'Only pending applications can be withdrawn' });
    }

    await prisma.job_application.delete({
      where: { id: Number(id) }
    });

    res.json({ message: 'Application withdrawn successfully' });
  } catch (error) {
    console.error('Error deleting application:', error);
    res.status(500).json({ error: 'Failed to withdraw application' });
  }
});

// Check if an alumni has applied to a specific job
router.get('/check/:jobId/:alumniId', async (req, res) => {
  try {
    const { jobId, alumniId } = req.params;

    const application = await prisma.job_application.findUnique({
      where: {
        job_posting_id_applicant_id: {
          job_posting_id: Number(jobId),
          applicant_id: Number(alumniId)
        }
      }
    });

    res.json({ 
      hasApplied: !!application,
      application: application || null
    });
  } catch (error) {
    console.error('Error checking application:', error);
    res.status(500).json({ error: 'Failed to check application status' });
  }
});

module.exports = router;
