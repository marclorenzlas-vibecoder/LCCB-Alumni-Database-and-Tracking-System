#!/usr/bin/env node
/**
 * Hardcoded URL Replacements for Production Deployment
 * 
 * This script documents all the hardcoded 'http://localhost:5001' URLs
 * that need to be replaced with API_BASE_URL or IMAGE_BASE_URL
 * 
 * Each file has already imported { API_BASE_URL, IMAGE_BASE_URL } from '../config/apiBaseUrl'
 * 
 * Run this script to identify remaining hardcoded URLs:
 * node scripts/find-hardcoded-urls.js
 */

const fs = require('fs');
const path = require('path');

const PATTERNS = [
  /http:\/\/localhost:5001/g,
  /http:\/\/192\.168\.5\.248:5001/g,
  /http:\/\/192\.168\.5\.248:3002/g
];

const COMPONENT_DIR = path.join(__dirname, '../frontend/src/components');
const SERVICE_DIR = path.join(__dirname, '../frontend/src/services');

function searchFiles(directory) {
  const files = fs.readdirSync(directory);
  const hardcodedUrls = [];

  files.forEach(file => {
    const filePath = path.join(directory, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && (file.endsWith('.js') || file.endsWith('.jsx'))) {
      const content = fs.readFileSync(filePath, 'utf8');
      let hasMatch = false;

      PATTERNS.forEach(pattern => {
        if (pattern.test(content)) {
          hasMatch = true;
        }
      });

      if (hasMatch) {
        hardcodedUrls.push(filePath);
      }
    }
  });

  return hardcodedUrls;
}

console.log('🔍 Searching for hardcoded URLs...\n');

const componentFiles = searchFiles(COMPONENT_DIR);
const serviceFiles = searchFiles(SERVICE_DIR);

if (componentFiles.length > 0) {
  console.log('❌ Components with hardcoded URLs:');
  componentFiles.forEach(file => {
    console.log(`  - ${path.relative(process.cwd(), file)}`);
  });
}

if (serviceFiles.length > 0) {
  console.log('\n❌ Services with hardcoded URLs:');
  serviceFiles.forEach(file => {
    console.log(`  - ${path.relative(process.cwd(), file)}`);
  });
}

if (componentFiles.length === 0 && serviceFiles.length === 0) {
  console.log('✅ No hardcoded URLs found! Ready for production deployment.');
} else {
  console.log(`\n⚠️  Found ${componentFiles.length + serviceFiles.length} files with hardcoded URLs.`);
  console.log('\nReplace patterns:');
  console.log('  - Replace http://localhost:5001 with ${API_BASE_URL.replace(/\\/api$/, "")}');
  console.log('  - Replace image URLs like `http://localhost:5001${image}` with `${IMAGE_BASE_URL}${image}`');
}
