const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function registerUser(userData) {
  const { username, email, password, level, course, batch, graduationYear } = userData;
  
  if (!username || !email || !password) {
    throw new Error('Missing required fields');
  }

  try {
    // Check if email already exists in user table or pending registrations
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('Email already exists');
    }

    const existingPending = await prisma.pending_registration.findUnique({ where: { email } });
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
    const pendingRegistration = await prisma.pending_registration.create({
      data: {
        email: email,
        username: username,
        password: hashedPassword,
        level: level || null,
        course: course || null,
        batch: batch ? parseInt(batch) : null,
        graduation_year: graduationYear ? parseInt(graduationYear) : null,
        status: 'PENDING'
      }
    });

    // Create notification for teachers/admins (optional - don't let it fail registration)
    try {
      // Find users with ADMIN role or create entries for teachers
      const adminUsers = await prisma.user.findMany({
        where: { 
          role: 'ADMIN'
        }
      });
      
      console.log(`📢 Found ${adminUsers.length} admin users for notifications`);
      
      // If no admin users exist, try to find/create user entries for teachers
      if (adminUsers.length === 0) {
        console.log('📢 No admin users found, checking for teachers in user table...');
        
        // Get all teachers
        const teachers = await prisma.teacher.findMany();
        console.log(`📢 Found ${teachers.length} teachers in teacher table`);
        
        // Create or find user entries for teachers
        for (const teacher of teachers) {
          let teacherUser = await prisma.user.findUnique({
            where: { email: teacher.email }
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
          }
          
          adminUsers.push(teacherUser);
        }
      }
      
      console.log(`📢 Creating notifications for ${adminUsers.length} admin users`);
      
      // Create notification for each admin/teacher
      for (const admin of adminUsers) {
        await prisma.notification.create({
          data: {
            user_id: admin.id,
            type: 'GENERAL',
            title: 'New Registration Request',
            message: `${username} (${email}) has submitted a registration request and is waiting for approval.`,
            link: '/admin'
          }
        });
        console.log(`📧 Notification created for user_id: ${admin.id} (${admin.email})`);
      }
      
      console.log('✅ Notifications created successfully');
    } catch (notifError) {
      // Log error but don't fail registration
      console.error('❌ Failed to create notification:', notifError);
    }

    // Return success but NO token (user can't login until approved)
    return {
      message: 'Registration submitted successfully! Please wait for admin approval.',
      status: 'PENDING',
      email: email
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
    // First check if user exists in user table
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        alumni: true
      }
    });

    // If not in user table, check pending_registration
    if (!user) {
      const pendingUser = await prisma.pending_registration.findUnique({
        where: { email }
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
      { id: user.id, email: user.email, role: user.role },
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
        alumni: user.alumni ? {
          id: user.alumni.id,
          firstName: user.alumni.first_name || user.alumni.firstName,
          lastName: user.alumni.last_name || user.alumni.lastName,
          level: user.alumni.level,
          course: user.alumni.course,
          batch: user.alumni.batch,
          graduationYear: user.alumni.graduation_year || user.alumni.graduationYear
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
      console.log('🔐 Teacher login attempt:', email);
      const teacher = await prisma.teacher.findUnique({ where: { email } });
      
      if (!teacher) {
        console.log('❌ Teacher not found:', email);
        throw new Error('Invalid credentials');
      }
      
      if (!teacher.password) {
        console.log('❌ Teacher has no password:', email);
        throw new Error('Invalid credentials');
      }
      
      console.log('✅ Teacher found, checking password...');
      const isValid = await bcrypt.compare(password, teacher.password);
      
      if (!isValid) {
        console.log('❌ Invalid password for:', email);
        throw new Error('Invalid credentials');
      }
      
      console.log('✅ Teacher login successful:', email);

      const token = jwt.sign(
        { id: teacher.id, email: teacher.email, role: 'TEACHER' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '24h' }
      );
      return {
        token,
        user: {
          id: teacher.id,
          email: teacher.email,
          username: teacher.username,
          department: teacher.department,
          profile_image: teacher.profile_image,
          role: 'TEACHER',
          approval_status: 'APPROVED',
          is_active: true
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

      // Split username into first and last name
      const nameParts = pending.username.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

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

      // Create alumni record
      const alumni = await prisma.alumni.create({
        data: {
          user_id: user.id,
          first_name: firstName,
          last_name: lastName,
          email: pending.email,
          level: pending.level,
          course: pending.course,
          batch: pending.batch,
          graduation_year: pending.graduation_year || pending.batch,
          is_public: true,
          is_verified: false
        }
      });

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
