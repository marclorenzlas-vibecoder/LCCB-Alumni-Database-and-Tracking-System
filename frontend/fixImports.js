const fs = require('fs');
const path = require('path');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (dirFile.endsWith('.jsx') || dirFile.endsWith('.js')) {
        filelist.push(dirFile);
      }
    }
  });
  return filelist;
}

const files = walkSync(path.join(__dirname, 'src'));

for (const file of files) {
  if (file.includes('apiBaseUrl.js')) continue;

  let content = fs.readFileSync(file, 'utf8');

  if (content.includes('getImageUrl') && !content.includes('import { getImageUrl }')) {
    let relPath = path.relative(path.dirname(file), path.join(__dirname, 'src', 'config', 'apiBaseUrl')).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;

    // Insert import after the first import statement
    content = content.replace(/(import .*?['"].*?['"];?)/, `$1\nimport { getImageUrl } from '${relPath}';`);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Added import to ${file}`);
  }
}
