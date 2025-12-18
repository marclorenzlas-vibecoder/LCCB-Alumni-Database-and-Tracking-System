const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetAllTeacherPasswords() {
  try {
    const defaultPassword = 'Teacher@123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    
    const result = await prisma.teacher.updateMany({
      data: { password: hashedPassword }
    });
    
    console.log(`✅ Updated ${result.count} teacher accounts`);
    console.log(`📝 Default password: ${defaultPassword}`);
    console.log('\nTeacher accounts:');
    
    const teachers = await prisma.teacher.findMany({
      select: { email: true, username: true, department: true }
    });
    
    teachers.forEach(t => {
      console.log(`  - ${t.email} (${t.username}) - ${t.department}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

resetAllTeacherPasswords();
