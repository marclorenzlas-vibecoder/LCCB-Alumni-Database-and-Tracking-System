const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { broadcastUpdate } = require('./realtimeService');

const prisma = new PrismaClient();

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

async function registerUser(userData) {
  const { 
    username, email, password, level, course, batch, graduationYear,
    firstName, lastName, studentId, contactNumber
  } = userData;
  const normalizedEmail = normalizeEmail(email);
  
  if (!username || !normalizedEmail || !password) {
    throw new Error('Missing required fields');
  }

  try {
    // Check if email already exists in user table or pending registrations
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const existingPending = await prisma.pending_registration.findUnique({ where: { email: normalizedEmail } });
    if (existingPending) {
      if (existingPending.status === 'PENDING') {
        throw new Error('Registration already submitted and pending approval');
      }
      if (existingPending.status === 'REJECTED') {
        throw new Error('Your registration was rejected. Please contact admin.');
      }
    }

    // Create pending registration (NOT in user table yet)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    console.log('💾 Creating pending registration with data:', {
      username, 
      email: normalizedEmail,
      firstName,
      lastName,
      studentId,
      contactNumber,
      level,
      course,
      batch,
      graduationYear
    });
    
    const pendingRegistration = await prisma.pending_registration.create({
      data: {
        email: normalizedEmail,
        username: username,
        password: hashedPassword,
        first_name: firstName || null,
        last_name: lastName || null,
        student_id: studentId || null,
        contact_number: contactNumber || null,
        level: level || null,
        course: course || null,
        batch: batch ? parseInt(batch) : null,
        graduation_year: graduationYear ? parseInt(graduationYear) : null,
        status: 'PENDING'
      }
    });
    
    console.log('✅ Pending registration created with ID:', pendingRegistration.id);

    // Create notification for admins and faculty coordinators (optional - don't let it fail registration)
    try {
      // Find all users with ADMIN role
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          is_active: true,
          is_blocked: false,
          notification_enabled: true,
          notify_pending_registrations: true
        },
        select: { id: true, email: true }
      });

      console.log(`📢 Found ${adminUsers.length} admin users for notifications`);

      // Also find teachers (faculty coordinators) and ensure they have user entries
      const teachers = await prisma.teacher.findMany({
        select: { id: true, email: true, username: true, password: true }
      });
      console.log(`📢 Found ${teachers.length} teachers in teacher table`);

      for (const teacher of teachers) {
        // Skip if this teacher email already has a user entry (avoids duplicates)
        const alreadyExists = adminUsers.some(u => u.email === teacher.email);
        if (alreadyExists) continue;

        let teacherUser = await prisma.user.findUnique({
          where: { email: teacher.email },
          select: {
            id: true,
            email: true,
            notification_enabled: true,
            notify_pending_registrations: true
          }
        });

        if (!teacherUser) {
          console.log(`📢 Creating user entry for teacher: ${teacher.email}`);
          teacherUser = await prisma.user.create({
            data: {
              email: teacher.email,
              username: teacher.username || teacher.email.split('@')[0],
              role: 'ADMIN',
              approval_status: 'APPROVED',
              is_active: true,
              password: teacher.password
            }
          });
        } else {
          // Skip if teacher user disabled notifications or registrations alerts
          if (teacherUser.notification_enabled === false || teacherUser.notify_pending_registrations === false) {
            continue;
          }
        }

        adminUsers.push(teacherUser);
      }

      console.log(`📢 Creating notifications for ${adminUsers.length} admin/faculty users`);

      // Standardized notification metadata per specification
      const notifTitle = 'New Account Registration';
      const notifMessage = 'A new alumni has registered and needs your approval.';
      const notifLink = '/pending-approval';

      // Create a notification record for each admin/faculty coordinator
      for (const admin of adminUsers) {
        const notification = await prisma.notification.create({
          data: {
            user_id: admin.id,
            type: 'GENERAL',
            title: notifTitle,
            message: notifMessage,
            link: notifLink,
            is_read: false
          }
        });
        console.log(`📧 Notification created for user_id: ${admin.id} (${admin.email})`);
      }

      // Push real-time update so connected admin/faculty clients see it instantly
      broadcastUpdate('notification.created', {
        type: 'GENERAL',
        title: notifTitle,
        message: notifMessage,
        link: notifLink,
        count: adminUsers.length
      });

      console.log('✅ Notifications created and broadcast successfully');
    } catch (notifError) {
      // Log error but don't fail registration
      console.error('❌ Failed to create notification:', notifError);
    }

    // Return success but NO token (user can't login until approved)
    return {
      message: 'Registration submitted successfully! Please wait for admin approval.',
      status: 'PENDING',
      email: normalizedEmail
    };

  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 'P2002') {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

async function loginUser(email, password) {
  try {
    const normalizedEmail = normalizeEmail(email);
    // First check if user exists in user table
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        alumni: true
      }
    });

    // If not in user table, check pending_registration
    if (!user) {
      const pendingUser = await prisma.pending_registration.findUnique({
        where: { email: normalizedEmail }
      });

      if (pendingUser) {
        // Verify password first
        const isValidPassword = await bcrypt.compare(password, pendingUser.password);
        if (!isValidPassword) {
          throw new Error('Invalid credentials');
        }

        // Check if account was rejected - allow ONE login to see rejection message
        if (pendingUser.status === 'REJECTED') {
          // Allow login but mark as rejected
          const token = jwt.sign(
            { id: pendingUser.id, email: pendingUser.email, role: 'ALUMNI', rejected: true },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
          );

          return {
            token,
            user: {
              id: pendingUser.id,
              email: pendingUser.email,
              username: pendingUser.username,
              role: 'ALUMNI',
              profile_image: pendingUser.profile_image,
              approval_status: 'REJECTED',
              rejected_reason: pendingUser.rejected_reason || 'Your registration request has been rejected by the administrator.',
              is_active: false,
              alumni: null
            }
          };
        }

        // Account is still pending approval
        if (pendingUser.status === 'PENDING') {
          // Allow login but with PENDING status
          const token = jwt.sign(
            { id: pendingUser.id, email: pendingUser.email, role: 'ALUMNI', pending: true },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
          );

          return {
            token,
            user: {
              id: pendingUser.id,
              email: pendingUser.email,
              username: pendingUser.username,
              role: 'ALUMNI',
              profile_image: pendingUser.profile_image,
              approval_status: 'PENDING',
              is_active: false,
              alumni: null
            }
          };
        }
      }
      
      throw new Error('Invalid credentials');
    }

    // Check if user is blocked
    if (user.is_blocked) {
      throw new Error('Your account has been blocked by the administrator. Please contact support for more information.');
    }

    if (!user.password) {
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Allow login with approval status
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, alumniId: user.alumni?.id || null },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        profile_image: user.profile_image,
        approval_status: user.approval_status,
        is_active: user.is_active,
        is_blocked: user.is_blocked,
        alumniId: user.alumni?.id || null,
        alumni: user.alumni ? {
          id: user.alumni.id,
          firstName: user.alumni.first_name || user.alumni.firstName,
          middleName: user.alumni.middle_name || user.alumni.middleName,
          lastName: user.alumni.last_name || user.alumni.lastName,
          dateOfBirth: user.alumni.date_of_birth || null,
          date_of_birth: user.alumni.date_of_birth || null,
          level: user.alumni.level,
          course: user.alumni.course,
          batch: user.alumni.batch,
          graduationYear: user.alumni.graduation_year || user.alumni.graduationYear,
          currentPosition: user.alumni.current_position,
          current_position: user.alumni.current_position,
          company: user.alumni.company,
          location: user.alumni.location,
          skills: user.alumni.skills
        } : null
      }
    };
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

module.exports = {
  registerUser,
  loginUser,
  // Teacher auth using dedicated teacher table
  registerTeacher: async (userData) => {
    const { username, email, password, department } = userData;
    if (!username || !email || !password) {
      throw new Error('Missing required fields');
    }
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const teacher = await prisma.teacher.create({
        data: {
          email,
          username,
          department,
          password: hashedPassword
        }
      });

      return {
        teacher: {
          id: teacher.id,
          email: teacher.email,
          username: teacher.username,
          department: teacher.department,
          role: 'TEACHER'
        }
      };
    } catch (error) {
      console.error('Teacher registration error:', error);
      if (error.code === 'P2002') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  },
  loginTeacher: async (email, password) => {
    try {
      const normalizedEmail = normalizeEmail(email);
      console.log('🔐 Teacher login attempt:', normalizedEmail);

      const teacherRecord = await prisma.teacher.findUnique({ where: { email: normalizedEmail } });
      const adminUserRecord = await prisma.user.findFirst({
        where: { email: normalizedEmail },
        include: { alumni: true }
      });

      const candidates = [
        teacherRecord ? { kind: 'teacher', record: teacherRecord } : null,
        adminUserRecord ? { kind: 'user', record: adminUserRecord } : null
      ].filter(Boolean);

      let matched = null;
      for (const candidate of candidates) {
        if (!candidate.record.password) {
          continue;
        }

        const isValid = await bcrypt.compare(password, candidate.record.password);
        if (isValid) {
          matched = candidate;
          break;
        }
      }

      if (!matched) {
        console.log('❌ No matching teacher/admin credentials for:', normalizedEmail);
        throw new Error('Invalid credentials');
      }

      const activeRecord = matched.record;
      console.log(`✅ Teacher login successful via ${matched.kind} record:`, normalizedEmail);

      const teacherAlumni = await prisma.alumni.findFirst({
        where: { email: activeRecord.email }
      });

      const role = activeRecord.role && activeRecord.role.toUpperCase() === 'ADMIN' ? 'TEACHER' : (activeRecord.role || 'TEACHER');

      const token = jwt.sign(
        { id: activeRecord.id, email: activeRecord.email, role },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      return {
        token,
        user: {
          id: activeRecord.id,
          email: activeRecord.email,
          username: activeRecord.username,
          department: activeRecord.department,
          profile_image: activeRecord.profile_image,
          role,
          approval_status: 'APPROVED',
          is_active: true,
          alumni: teacherAlumni ? {
            id: teacherAlumni.id,
            firstName: teacherAlumni.first_name,
            middleName: teacherAlumni.middle_name,
            lastName: teacherAlumni.last_name,
            dateOfBirth: teacherAlumni.date_of_birth || null,
            date_of_birth: teacherAlumni.date_of_birth || null,
            level: teacherAlumni.level,
            course: teacherAlumni.course,
            batch: teacherAlumni.batch,
            graduationYear: teacherAlumni.graduation_year,
            currentPosition: teacherAlumni.current_position,
            current_position: teacherAlumni.current_position,
            company: teacherAlumni.company,
            location: teacherAlumni.location,
            skills: teacherAlumni.skills
          } : null
        }
      };
    } catch (error) {
      console.error('Teacher login error:', error.message);
      throw error;
    }
  },

  // Admin: Get all pending registrations
  getPendingRegistrations: async () => {
    try {
      const pending = await prisma.pending_registration.findMany({
        where: { status: 'PENDING' },
        orderBy: { created_at: 'desc' }
      });
      
      console.log(`📋 Fetched ${pending.length} pending registrations`);
      if (pending.length > 0) {
        console.log('Sample data (first record):', {
          id: pending[0].id,
          username: pending[0].username,
          email: pending[0].email,
          student_id: pending[0].student_id,
          first_name: pending[0].first_name,
          last_name: pending[0].last_name
        });
      }
      
      return pending;
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      throw error;
    }
  },

  // Admin: Approve registration - moves to user table
  approveRegistration: async (pendingId) => {
    try {
      const pending = await prisma.pending_registration.findUnique({
        where: { id: pendingId }
      });

      if (!pending) {
        throw new Error('Pending registration not found');
      }

      if (pending.status !== 'PENDING') {
        throw new Error('Registration already processed');
      }

      // Use provided first and last name, or split username as fallback
      let firstName = pending.first_name;
      let lastName = pending.last_name;
      
      if (!firstName && !lastName) {
        const nameParts = pending.username.trim().split(' ');
        firstName = nameParts[0] || '';
        lastName = nameParts.slice(1).join(' ') || '';
      }

      // Create user in the user table
      const user = await prisma.user.create({
        data: {
          email: pending.email,
          username: pending.username,
          password: pending.password,
          profile_image: pending.profile_image,
          role: 'ALUMNI',
          approval_status: 'APPROVED',
          is_active: true
        }
      });

      // Create alumni record with verification data
      const alumni = await prisma.alumni.create({
        data: {
          user_id: user.id,
          student_id: pending.student_id, // Transfer School ID from registration
          first_name: firstName,
          last_name: lastName,
          email: pending.email,
          contact_number: pending.contact_number,
          level: pending.level,
          course: pending.course,
          batch: pending.batch,
          graduation_year: pending.graduation_year || pending.batch,
          is_public: true,
          is_verified: true // Mark as verified since admin approved it
        }
      });

      // Also create alumni_list entry so the alumni directory shows this user
      try {
        await prisma.alumni_list.create({
          data: {
            student_id: pending.student_id,
            first_name: firstName,
            last_name: lastName,
            level: pending.level,
            course: pending.course,
            batch: pending.batch,
            graduation_year: pending.graduation_year || pending.batch
          }
        });
      } catch (listErr) {
        console.error('Warning: Failed to create alumni_list entry:', listErr.message);
      }

      // DELETE from pending_registration after successful move to user table
      await prisma.pending_registration.delete({
        where: { id: pendingId }
      });

      // Create notification for the user
      await prisma.notification.create({
        data: {
          user_id: user.id,
          type: 'GENERAL',
          title: 'Registration Approved',
          message: 'Your registration has been approved! You can now login to your account.'
        }
      });

      return { success: true, user, alumni };
    } catch (error) {
      console.error('Error approving registration:', error);
      throw error;
    }
  },

  // Admin: Reject registration - DELETE from pending_registration
  rejectRegistration: async (pendingId, reason) => {
    try {
      const pending = await prisma.pending_registration.findUnique({
        where: { id: pendingId }
      });

      if (!pending) {
        throw new Error('Pending registration not found');
      }

      if (pending.status !== 'PENDING') {
        throw new Error('Registration already processed');
      }

      // DELETE from pending_registration (no need to keep rejected records)
      await prisma.pending_registration.delete({
        where: { id: pendingId }
      });
      
      console.log(`❌ Registration rejected and deleted: ${pending.email}`);

      return { success: true, message: 'Registration rejected and deleted' };
    } catch (error) {
      console.error('Error rejecting registration:', error);
      throw error;
    }
  }
};
