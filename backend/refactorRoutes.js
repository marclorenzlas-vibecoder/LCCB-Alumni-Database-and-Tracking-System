const fs = require('fs');
const path = require('path');

const routesPath = path.join(__dirname, 'src', 'routes');
const filesToProcess = ['donationRoutes.js', 'achievementRoutes.js'];

for (const file of filesToProcess) {
  const filepath = path.join(routesPath, file);
  if (!fs.existsSync(filepath)) continue;
  
  let content = fs.readFileSync(filepath, 'utf8');

  if (!content.includes('uploadToSupabase')) {
    content = content.replace(/(const {.*?} = require\('\.\.\/services\/.*?;\n)/, "$1const { uploadToSupabase } = require('../services/storageService');\n");
    if (!content.includes('uploadToSupabase')) {
      content = content.replace(/const router = express\.Router\(\);/, "const router = express.Router();\nconst { uploadToSupabase } = require('../services/storageService');");
    }
  }

  content = content.replace(/multer\.diskStorage\(\{[\s\S]*?\}\)/g, 'multer.memoryStorage()');

  if (file === 'donationRoutes.js') {
    content = content.replace(
      /const imagePath = imageFile \? `\/uploads\/donations\/\$\{imageFile\.filename\}` : null;/g,
      "const imagePath = imageFile ? await uploadToSupabase(imageFile, 'donations') : null;"
    );
    content = content.replace(
      /const paymentScreenshotPath = paymentScreenshotFile \? `\/uploads\/donations\/\$\{paymentScreenshotFile\.filename\}` : '';/g,
      "const paymentScreenshotPath = paymentScreenshotFile ? await uploadToSupabase(paymentScreenshotFile, 'donations') : '';"
    );
    content = content.replace(
      /mergedMeta\.qrImagePath = `\/uploads\/donations\/\$\{qrImageFile\.filename\}`;/g,
      "mergedMeta.qrImagePath = await uploadToSupabase(qrImageFile, 'donations');"
    );
    content = content.replace(
      /const paths = itemImageFiles\.map\(\(f\) => `\/uploads\/donations\/\$\{f\.filename\}`\);/g,
      "const paths = await Promise.all(itemImageFiles.map(async (f) => await uploadToSupabase(f, 'donations')));"
    );
    content = content.replace(
      /updateData\.image = `\/uploads\/donations\/\$\{imageFile\.filename\}`;/g,
      "updateData.image = await uploadToSupabase(imageFile, 'donations');"
    );
  }

  if (file === 'achievementRoutes.js') {
    content = content.replace(
      /const imagePath = req\.file \? `\/uploads\/achievements\/\$\{req\.file\.filename\}` : null;/g,
      "const imagePath = req.file ? await uploadToSupabase(req.file, 'achievements') : null;"
    );
    content = content.replace(
      /updateData\.image = `\/uploads\/achievements\/\$\{req\.file\.filename\}`;/g,
      "updateData.image = await uploadToSupabase(req.file, 'achievements');"
    );
    
    // For achievementRoutes, we also have mediaPath!
    content = content.replace(
      /const mediaPath = mediaFile\s*\?\s*`\/uploads\/achievements\/\$\{mediaFile\.filename\}`\s*: null;/g,
      "const mediaPath = mediaFile ? await uploadToSupabase(mediaFile, 'achievements') : null;"
    );
    content = content.replace(
      /updateData\.image = `\/uploads\/achievements\/\$\{mediaFile\.filename\}`;/g,
      "updateData.image = await uploadToSupabase(mediaFile, 'achievements');"
    );
  }

  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`Updated ${file}`);
}
