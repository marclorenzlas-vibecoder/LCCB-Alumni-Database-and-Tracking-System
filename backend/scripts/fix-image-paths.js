const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function fixImagePaths() {
  try {
    console.log('🔧 Fixing image paths in database...\n');

    // Get all alumni
    const allAlumni = await prisma.alumni.findMany();
    
    const uploadsDir = path.join(__dirname, '../uploads/profiles');
    const existingFiles = fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : [];
    
    console.log(`Found ${allAlumni.length} alumni records`);
    console.log(`Found ${existingFiles.length} image files in uploads folder\n`);

    let fixed = 0;
    let cleared = 0;

    for (const alumni of allAlumni) {
      if (alumni.profile_image) {
        // Extract filename from path
        const filename = alumni.profile_image.split('/').pop();
        
        // Check if file exists
        if (!existingFiles.includes(filename)) {
          console.log(`❌ Alumni ${alumni.id} (${alumni.first_name} ${alumni.last_name}): Image not found - ${filename}`);
          
          // Clear the invalid path
          await prisma.alumni.update({
            where: { id: alumni.id },
            data: { profile_image: null }
          });
          cleared++;
          console.log(`   ✅ Cleared invalid path\n`);
        } else {
          console.log(`✅ Alumni ${alumni.id} (${alumni.first_name} ${alumni.last_name}): Image OK - ${filename}`);
          fixed++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Valid images: ${fixed}`);
    console.log(`   🗑️  Cleared invalid paths: ${cleared}`);
    console.log(`   📁 Total alumni: ${allAlumni.length}`);

  } catch (error) {
    console.error('Error fixing image paths:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixImagePaths();
