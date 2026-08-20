const supabase = require('../config/supabase');
const path = require('path');

/**
 * Uploads a file buffer to Supabase Storage.
 * @param {Object} file - The file object from Multer (must be memoryStorage, so it has file.buffer and file.originalname)
 * @param {string} folder - The folder prefix (e.g., 'profiles', 'events')
 * @returns {Promise<string>} - The public URL of the uploaded file.
 */
const uploadToSupabase = async (file, folder) => {
  if (!file || !file.buffer) {
    throw new Error('File buffer is required. Make sure Multer is configured with memoryStorage.');
  }

  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const ext = path.extname(file.originalname);
  const filename = `${folder}-${uniqueSuffix}${ext}`;
  const fullPath = `${folder}/${filename}`;

  const { data, error } = await supabase
    .storage
    .from('alumni-uploads')
    .upload(fullPath, file.buffer, {
      contentType: file.mimetype,
      upsert: true
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Failed to upload to Supabase: ${error.message}`);
  }

  // Get public URL
  const { data: publicUrlData } = supabase
    .storage
    .from('alumni-uploads')
    .getPublicUrl(fullPath);

  return publicUrlData.publicUrl;
};

module.exports = {
  uploadToSupabase
};
