const fs = require('fs');
const path = require('path');

const filepath = path.join(__dirname, 'src', 'routes', 'authRoutes.js');
let content = fs.readFileSync(filepath, 'utf8');

if (!content.includes('uploadToSupabase')) {
  content = content.replace(/(const fs = require\('fs'\);\n)/, "$1const { uploadToSupabase } = require('../services/storageService');\n");
}

// Change memoryStorage if diskStorage is used
content = content.replace(/multer\.diskStorage\(\{[\s\S]*?\}\)/g, 'multer.memoryStorage()');

content = content.replace(
  /updateData\.profile_image = `\/uploads\/profiles\/\$\{req\.file\.filename\}`;/g,
  "updateData.profile_image = await uploadToSupabase(req.file, 'profiles');"
);

// We need to also change `alumniUpdateData.profile_image = updateData.profile_image` 
// or `alumniUpdateData.profile_image = \`/uploads/profiles/\${req.file.filename}\``
content = content.replace(
  /alumniUpdateData\.profile_image = `\/uploads\/profiles\/\$\{req\.file\.filename\}`;/g,
  "alumniUpdateData.profile_image = updateData.profile_image;"
);

fs.writeFileSync(filepath, content, 'utf8');
console.log('Fixed authRoutes.js');
