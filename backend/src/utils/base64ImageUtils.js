/**
 * Base64 Image Utilities for Firebase
 * Handles conversion between files and base64 strings for Firestore storage
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert file to base64 string
 * @param {string} filePath - Path to the file
 * @returns {string} Base64 encoded string with data URI prefix
 */
function fileToBase64(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const fileBuffer = fs.readFileSync(filePath);
    const base64String = fileBuffer.toString('base64');
    
    // Detect MIME type from file extension
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = getMimeType(ext);
    
    return `data:${mimeType};base64,${base64String}`;
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw error;
  }
}

/**
 * Convert base64 data URI to file
 * @param {string} base64String - Data URI string (data:image/jpeg;base64,...)
 * @param {string} outputPath - Where to save the file
 * @returns {string} Path to saved file
 */
function base64ToFile(base64String, outputPath) {
  try {
    // Remove data URI prefix if present
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Create directory if it doesn't exist
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
    return outputPath;
  } catch (error) {
    console.error('Error converting base64 to file:', error);
    throw error;
  }
}

/**
 * Compress base64 image (reduce quality for storage savings)
 * Note: Requires sharp library - install with: npm install sharp
 * @param {string} base64String - Base64 image string
 * @param {number} quality - Quality 0-100 (default 80)
 * @returns {Promise<string>} Compressed base64 string
 */
async function compressBase64Image(base64String, quality = 80) {
  try {
    const sharp = require('sharp');
    
    // Remove data URI prefix
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    
    // Compress using sharp
    const compressed = await sharp(Buffer.from(base64Data, 'base64'))
      .resize(1920, 1080, { // Max resolution
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality, progressive: true })
      .toBuffer();

    return `data:image/jpeg;base64,${compressed.toString('base64')}`;
  } catch (error) {
    console.warn('Sharp not available, returning original base64');
    return base64String;
  }
}

/**
 * Get MIME type from file extension
 * @param {string} ext - File extension (e.g., '.jpg')
 * @returns {string} MIME type
 */
function getMimeType(ext) {
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  };
  return mimeTypes[ext.toLowerCase()] || 'image/jpeg';
}

/**
 * Get file extension from MIME type
 * @param {string} mimeType - MIME type (e.g., 'image/jpeg')
 * @returns {string} File extension
 */
function getExtensionFromMimeType(mimeType) {
  const extensions = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
    'image/svg+xml': '.svg',
  };
  return extensions[mimeType] || '.jpg';
}

/**
 * Check if base64 string size is within Firestore limits
 * Firestore document limit: 1MB per document
 * Recommended max per image: 200KB base64
 * @param {string} base64String - Base64 string to check
 * @param {number} maxSizeKB - Maximum size in KB (default 200)
 * @returns {Object} { isValid: boolean, sizeKB: number, message: string }
 */
function validateBase64Size(base64String, maxSizeKB = 200) {
  const sizeBytes = Buffer.byteLength(base64String, 'utf8');
  const sizeKB = sizeBytes / 1024;
  const isValid = sizeKB <= maxSizeKB;

  return {
    isValid,
    sizeKB: sizeKB.toFixed(2),
    sizeBytes,
    message: isValid 
      ? `✓ Size OK: ${sizeKB.toFixed(2)}KB (max: ${maxSizeKB}KB)`
      : `✗ Size exceeds limit: ${sizeKB.toFixed(2)}KB (max: ${maxSizeKB}KB)`,
  };
}

/**
 * Create a thumbnail from base64 image
 * @param {string} base64String - Base64 image string
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @param {number} quality - Quality 0-100
 * @returns {Promise<string>} Thumbnail base64 string
 */
async function createThumbnail(base64String, width = 200, height = 200, quality = 60) {
  try {
    const sharp = require('sharp');
    
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');
    
    const thumbnail = await sharp(Buffer.from(base64Data, 'base64'))
      .resize(width, height, {
        fit: 'cover',
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toBuffer();

    return `data:image/jpeg;base64,${thumbnail.toString('base64')}`;
  } catch (error) {
    console.warn('Thumbnail creation failed:', error.message);
    return base64String; // Return original if compression fails
  }
}

module.exports = {
  fileToBase64,
  base64ToFile,
  compressBase64Image,
  getMimeType,
  getExtensionFromMimeType,
  validateBase64Size,
  createThumbnail,
};
