const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTeacherLogin(email, password) {
  try {
    console.log(`\n🔍 Testing login for: ${email}`);
    console.log(`📝 Password: ${password}`);
    console.log('---');
    
    // Check if teacher exists
    const teacher = await prisma.teacher.findUnique({ 
      where: { email } 
    });
    
    if (!teacher) {
      console.log('❌ Teacher not found in database');
      return;
    }
    
    console.log('✅ Teacher found:', {
      id: teacher.id,
      email: teacher.email,
      username: teacher.username,
      department: teacher.department,
      hasPassword: !!teacher.password
    });
    
    if (!teacher.password) {
      console.log('❌ Teacher has no password set');
      return;
    }
    
    // Test password
    const isValid = await bcrypt.compare(password, teacher.password);
    
    if (isValid) {
      console.log('✅ Password is correct!');
      console.log('✅ Login should work');
    } else {
      console.log('❌ Password is incorrect');
      console.log('Stored hash:', teacher.password.substring(0, 20) + '...');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Test with command line args or default
const email = process.argv[2] || 'zora@lccbonline.com';
const password = process.argv[3] || 'Teacher@123';

testTeacherLogin(email, password);
