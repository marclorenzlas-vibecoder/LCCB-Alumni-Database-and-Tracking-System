const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function hashTeacherPassword(email, plainPassword) {
  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    await prisma.teacher.update({
      where: { email },
      data: { password: hashedPassword }
    });
    
    console.log(`✅ Password hashed successfully for ${email}`);
    console.log(`Hash: ${hashedPassword}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email and password from command line arguments
const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node hash-password.js <email> <password>');
  console.error('Example: node hash-password.js zora@lccbonline.com zora12345*');
  process.exit(1);
}

hashTeacherPassword(email, password);
