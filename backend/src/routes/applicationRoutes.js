const express = require('express');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const notificationService = require('../services/notificationService');

// Submit a job application (Alumni applies to a job)
router.post('/', async (req, res) => {
  try {
    const {
      job_posting_id,
      applicant_id,
      cover_letter,
      resume_url
    } = req.body;

    console.log('📝 Application submission request:', {
      job_posting_id,
      applicant_id,
      has_cover_letter: !!cover_letter,
      has_resume: !!resume_url
    });

    if (!job_posting_id || !applicant_id) {
      console.error('❌ Missing required fields');
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['job_posting_id', 'applicant_id']
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
        cover_letter,
        resume_url,
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
    } catch (notifError) {
      console.error('❌ Failed to create notification:', notifError.message);
      console.error('Error details:', notifError);
      // Don't fail the application if notification fails
    }

    res.status(201).json({
      message: 'Application submitted successfully',
      application
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

    res.json(applications);
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

    res.json(applications);
  } catch (error) {
    console.error('Error fetching alumni applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
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

    res.json(application);
  } catch (error) {
    console.error('Error fetching application:', error);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Update application status (for employer/job poster)
router.patch('/:id/status', async (req, res) => {
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

    const updateData = {};
    if (status) {
      updateData.status = status;
      updateData.reviewed_at = new Date();
    }
    if (notes !== undefined) {
      updateData.notes = notes;
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
            location: true
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
          const newCareerEntry = await prisma.career_entry.create({
            data: {
              alumni_id: application.applicant.id,
              job_title: application.job_posting.job_title,
              company: application.job_posting.company,
              start_date: new Date(), // Set to current date when accepted
              is_current: true, // Mark as current position
              description: `Position obtained through LCCB Alumni job posting`
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
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

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
