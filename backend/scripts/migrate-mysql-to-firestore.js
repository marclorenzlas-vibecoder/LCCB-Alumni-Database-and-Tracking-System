/**
 * Data Migration Script: MySQL to Firestore
 * Usage: node migrate-mysql-to-firestore.js
 * 
 * Prerequisites:
 * 1. Set up .env with Firebase credentials
 * 2. Ensure both MySQL and Firebase are accessible
 * 3. Backup your data before running
 */

const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const { db, admin } = require('./src/config/firebase');
const { fileToBase64, compressBase64Image, validateBase64Size } = require('./src/utils/base64ImageUtils');
const fs = require('fs');
const path = require('path');

dotenv.config();

const prisma = new PrismaClient();

// Batch size for operations
const BATCH_SIZE = 100;
const MAX_IMAGE_SIZE_KB = 200;

class FirestoreMigration {
  constructor() {
    this.stats = {
      users: 0,
      alumni: 0,
      achievements: 0,
      donations: 0,
      events: 0,
      jobs: 0,
      applications: 0,
      errors: [],
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
  }

  async migrateUsers() {
    this.log('Starting user migration...');
    try {
      const users = await prisma.user.findMany();
      const batch = db.batch();
      let batchCount = 0;

      for (const user of users) {
        const userRef = db.collection('users').doc(user.id.toString());
        
        batch.set(userRef, {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          profileImage: user.profile_image || null,
          isActive: user.is_active,
          isBlocked: user.is_blocked,
          createdAt: user.created_at || new Date(),
          updatedAt: user.updated_at || new Date(),
        });

        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          this.stats.users += batchCount;
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        this.stats.users += batchCount;
      }

      this.log(`✓ Migrated ${this.stats.users} users`);
    } catch (error) {
      this.log(`✗ User migration failed: ${error.message}`, 'error');
      this.stats.errors.push({ entity: 'users', error: error.message });
    }
  }

  async migrateAlumni() {
    this.log('Starting alumni migration...');
    try {
      const alumni = await prisma.alumni.findMany();
      const batch = db.batch();
      let batchCount = 0;

      for (const alumnus of alumni) {
        // Handle profile image - convert to base64 if exists
        let profileImage = null;
        if (alumnus.profile_image) {
          try {
            const imagePath = path.join(__dirname, '../uploads', alumnus.profile_image);
            if (fs.existsSync(imagePath)) {
              profileImage = fileToBase64(imagePath);
              const sizeCheck = validateBase64Size(profileImage, MAX_IMAGE_SIZE_KB);
              if (!sizeCheck.isValid) {
                this.log(`Image too large for alumni ${alumnus.id}: ${sizeCheck.sizeKB}KB`, 'warn');
                profileImage = null; // Skip oversized images
              }
            }
          } catch (imgError) {
            this.log(`Could not convert image for alumni ${alumnus.id}`, 'warn');
          }
        }

        const alumniRef = db.collection('alumni').doc(alumnus.id.toString());
        batch.set(alumniRef, {
          userId: alumnus.user_id ? alumnus.user_id.toString() : null,
          studentId: alumnus.student_id,
          firstName: alumnus.first_name,
          lastName: alumnus.last_name,
          middleName: alumnus.middle_name || null,
          email: alumnus.email,
          dateOfBirth: alumnus.date_of_birth,
          contactNumber: alumnus.contact_number,
          level: alumnus.level,
          batch: alumnus.batch,
          graduationYear: alumnus.graduation_year,
          course: alumnus.course,
          currentPosition: alumnus.current_position,
          company: alumnus.company,
          location: alumnus.location,
          profileImage,
          skills: alumnus.skills,
          bio: alumnus.bio,
          isPublic: alumnus.is_public ?? true,
          isVerified: alumnus.is_verified ?? false,
          status: alumnus.status || 'LIVING',
          createdAt: alumnus.created_at || new Date(),
          updatedAt: alumnus.updated_at || new Date(),
        });

        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          this.stats.alumni += batchCount;
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        this.stats.alumni += batchCount;
      }

      this.log(`✓ Migrated ${this.stats.alumni} alumni`);
    } catch (error) {
      this.log(`✗ Alumni migration failed: ${error.message}`, 'error');
      this.stats.errors.push({ entity: 'alumni', error: error.message });
    }
  }

  async migrateAchievements() {
    this.log('Starting achievements migration...');
    try {
      const achievements = await prisma.achievement.findMany();
      const batch = db.batch();
      let batchCount = 0;

      for (const achievement of achievements) {
        let image = null;
        if (achievement.image) {
          try {
            const imagePath = path.join(__dirname, '../uploads', achievement.image);
            if (fs.existsSync(imagePath)) {
              image = fileToBase64(imagePath);
              const sizeCheck = validateBase64Size(image, MAX_IMAGE_SIZE_KB);
              if (!sizeCheck.isValid) {
                image = null;
              }
            }
          } catch (imgError) {
            this.log(`Could not convert image for achievement ${achievement.id}`, 'warn');
          }
        }

        const achievementRef = db.collection('achievements').doc(achievement.id.toString());
        batch.set(achievementRef, {
          alumniId: achievement.alumni_id ? achievement.alumni_id.toString() : null,
          title: achievement.title,
          category: achievement.category,
          image,
          description: achievement.description,
          date: achievement.date,
          createdAt: new Date(),
        });

        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          this.stats.achievements += batchCount;
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        this.stats.achievements += batchCount;
      }

      this.log(`✓ Migrated ${this.stats.achievements} achievements`);
    } catch (error) {
      this.log(`✗ Achievements migration failed: ${error.message}`, 'error');
      this.stats.errors.push({ entity: 'achievements', error: error.message });
    }
  }

  async migrateDonations() {
    this.log('Starting donations migration...');
    try {
      const donations = await prisma.donation.findMany();
      const batch = db.batch();
      let batchCount = 0;

      for (const donation of donations) {
        const donationRef = db.collection('donations').doc(donation.id.toString());
        batch.set(donationRef, {
          alumniId: donation.alumni_id ? donation.alumni_id.toString() : null,
          amount: parseFloat(donation.amount),
          date: donation.date,
          purpose: donation.purpose,
          description: donation.description,
          category: donation.category,
          donationType: donation.donation_type || 'both',
          acceptsMoney: donation.accepts_money ?? true,
          acceptsItems: donation.accepts_items ?? true,
          createdAt: donation.createdAt || new Date(),
        });

        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          this.stats.donations += batchCount;
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        this.stats.donations += batchCount;
      }

      this.log(`✓ Migrated ${this.stats.donations} donations`);
    } catch (error) {
      this.log(`✗ Donations migration failed: ${error.message}`, 'error');
      this.stats.errors.push({ entity: 'donations', error: error.message });
    }
  }

  async migrateEvents() {
    this.log('Starting events migration...');
    try {
      const events = await prisma.event.findMany();
      const batch = db.batch();
      let batchCount = 0;

      for (const event of events) {
        let image = null;
        if (event.image) {
          try {
            const imagePath = path.join(__dirname, '../uploads', event.image);
            if (fs.existsSync(imagePath)) {
              image = fileToBase64(imagePath);
            }
          } catch (imgError) {
            this.log(`Could not convert image for event ${event.id}`, 'warn');
          }
        }

        const eventRef = db.collection('events').doc(event.id.toString());
        batch.set(eventRef, {
          name: event.name,
          description: event.description,
          date: event.date,
          endDate: event.end_date,
          location: event.location,
          image,
          status: event.status || 'UPCOMING',
          targetBatch: event.target_batch,
          createdAt: event.created_at || new Date(),
          updatedAt: event.updated_at || new Date(),
        });

        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          this.stats.events += batchCount;
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        this.stats.events += batchCount;
      }

      this.log(`✓ Migrated ${this.stats.events} events`);
    } catch (error) {
      this.log(`✗ Events migration failed: ${error.message}`, 'error');
      this.stats.errors.push({ entity: 'events', error: error.message });
    }
  }

  async migrateJobPostings() {
    this.log('Starting job postings migration...');
    try {
      const jobs = await prisma.job_posting.findMany();
      const batch = db.batch();
      let batchCount = 0;

      for (const job of jobs) {
        const jobRef = db.collection('job_postings').doc(job.id.toString());
        batch.set(jobRef, {
          postedByAlumniId: job.posted_by_alumni_id ? job.posted_by_alumni_id.toString() : null,
          jobTitle: job.job_title,
          company: job.company,
          location: job.location,
          department: job.department,
          jobType: job.job_type,
          salaryRange: job.salary_range,
          requirements: job.requirements,
          benefits: job.benefits,
          description: job.description,
          applicationUrl: job.application_url,
          applicationDeadline: job.application_deadline,
          createdAt: job.created_at || new Date(),
          updatedAt: job.updated_at || new Date(),
        });

        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          this.stats.jobs += batchCount;
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        this.stats.jobs += batchCount;
      }

      this.log(`✓ Migrated ${this.stats.jobs} job postings`);
    } catch (error) {
      this.log(`✗ Job postings migration failed: ${error.message}`, 'error');
      this.stats.errors.push({ entity: 'job_postings', error: error.message });
    }
  }

  async migrateJobApplications() {
    this.log('Starting job applications migration...');
    try {
      const applications = await prisma.job_application.findMany();
      const batch = db.batch();
      let batchCount = 0;

      for (const app of applications) {
        const appRef = db.collection('job_applications').doc(app.id.toString());
        batch.set(appRef, {
          jobPostingId: app.job_posting_id.toString(),
          applicantId: app.applicant_id.toString(),
          coverLetter: app.cover_letter,
          resumeUrl: app.resume_url,
          status: app.status || 'PENDING',
          appliedAt: app.applied_at || new Date(),
          reviewedAt: app.reviewed_at,
          notes: app.notes,
          createdAt: new Date(),
        });

        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          this.stats.applications += batchCount;
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        this.stats.applications += batchCount;
      }

      this.log(`✓ Migrated ${this.stats.applications} job applications`);
    } catch (error) {
      this.log(`✗ Job applications migration failed: ${error.message}`, 'error');
      this.stats.errors.push({ entity: 'job_applications', error: error.message });
    }
  }

  async run() {
    this.log('====== FIREBASE MIGRATION STARTED ======');
    this.log('This will migrate all data from MySQL to Firestore');
    this.log('Backup your data before proceeding!\n');

    try {
      await this.migrateUsers();
      await this.migrateAlumni();
      await this.migrateAchievements();
      await this.migrateDonations();
      await this.migrateEvents();
      await this.migrateJobPostings();
      await this.migrateJobApplications();

      this.log('\n====== MIGRATION COMPLETE ======');
      this.log(`Users: ${this.stats.users}`);
      this.log(`Alumni: ${this.stats.alumni}`);
      this.log(`Achievements: ${this.stats.achievements}`);
      this.log(`Donations: ${this.stats.donations}`);
      this.log(`Events: ${this.stats.events}`);
      this.log(`Job Postings: ${this.stats.jobs}`);
      this.log(`Job Applications: ${this.stats.applications}`);

      if (this.stats.errors.length > 0) {
        this.log('\n⚠️ ERRORS ENCOUNTERED:', 'warn');
        this.stats.errors.forEach((err) => {
          this.log(`  - ${err.entity}: ${err.error}`, 'error');
        });
      }
    } catch (error) {
      this.log(`MIGRATION FAILED: ${error.message}`, 'error');
    } finally {
      await prisma.$disconnect();
    }
  }
}

// Run migration
const migration = new FirestoreMigration();
migration.run();
