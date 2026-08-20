const fs = require('fs');
const path = require('path');

// 1. Add getImageUrl to apiBaseUrl.js
const apiBaseUrlPath = path.join(__dirname, 'src', 'config', 'apiBaseUrl.js');
let apiBaseUrlContent = fs.readFileSync(apiBaseUrlPath, 'utf8');

if (!apiBaseUrlContent.includes('export const getImageUrl')) {
  apiBaseUrlContent += `\n
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  if (path.startsWith('data:')) return path; // for base64
  if (path.startsWith('/')) return \`\${IMAGE_BASE_URL}\${path}\`;
  return \`\${IMAGE_BASE_URL}/\${path}\`;
};
`;
  fs.writeFileSync(apiBaseUrlPath, apiBaseUrlContent, 'utf8');
  console.log('Updated apiBaseUrl.js with getImageUrl');
}

// 2. Scan all .js and .jsx files in src and replace IMAGE_BASE_URL + path with getImageUrl(path)
function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    try {
      filelist = walkSync(dirFile, filelist);
    } catch (err) {
      if (err.code === 'ENOTDIR' || err.code === 'EBADF') {
        if (dirFile.endsWith('.jsx') || dirFile.endsWith('.js')) {
          filelist.push(dirFile);
        }
      }
    }
  });
  return filelist;
}

const files = walkSync(path.join(__dirname, 'src'));

for (const file of files) {
  if (file.includes('apiBaseUrl.js')) continue;

  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  // Replace `${IMAGE_BASE_URL}${var}` or `${IMAGE_BASE_URL}/path`
  // Regex looks for `${IMAGE_BASE_URL}${...}` or similar template strings.
  // Actually, string replacement is safer with specific regexes.
  
  const backtickRegex1 = /\`\$\{IMAGE_BASE_URL\}\$\{([a-zA-Z0-9_.\?\:\[\]]+)\}\`/g;
  if (backtickRegex1.test(content)) {
    content = content.replace(backtickRegex1, 'getImageUrl($1)');
    changed = true;
  }

  const backtickRegex2 = /\`\$\{IMAGE_BASE_URL\}\/([a-zA-Z0-9_.\?\:\[\]\/]+)\`/g;
  if (backtickRegex2.test(content)) {
    content = content.replace(backtickRegex2, "getImageUrl('/$1')");
    changed = true;
  }
  
  const plusRegex1 = /IMAGE_BASE_URL \+ ([a-zA-Z0-9_.\?\:\[\]]+)/g;
  if (plusRegex1.test(content)) {
    content = content.replace(plusRegex1, 'getImageUrl($1)');
    changed = true;
  }

  if (changed && !content.includes('getImageUrl')) {
    // Add import statement at top if missing
    // Need to figure out relative path to apiBaseUrl.js
    let relPath = path.relative(path.dirname(file), apiBaseUrlPath).replace(/\\/g, '/');
    if (!relPath.startsWith('.')) relPath = './' + relPath;
    relPath = relPath.replace(/\.js$/, '');
    
    // Find first import
    content = content.replace(/(import .*?;?\n)/, `$1import { getImageUrl } from '${relPath}';\n`);
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
