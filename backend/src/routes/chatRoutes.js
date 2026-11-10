const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { uploadToSupabase } = require('../services/storageService');

// Configure multer memory storage with 50MB limit for photos/videos
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const isImage = file.mimetype.startsWith('image/');
    const isVideo = file.mimetype.startsWith('video/');
    if (isImage || isVideo) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are supported.'));
    }
  }
});

// Helper to run multer and catch size/format errors
const handleUpload = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      const isSize = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({
        error: isSize
          ? 'File is too large. Maximum allowed size is 50MB per file.'
          : err.message || 'File upload error.'
      });
    }
    next();
  });
};

/**
 * POST /api/chat/upload
 * Upload image or video to Supabase Storage for chat (supports single or multiple files)
 */
router.post('/upload', authenticateToken, handleUpload, async (req, res) => {
  try {
    const rawFiles = req.files || (req.file ? [req.file] : []);
    if (!rawFiles || rawFiles.length === 0) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const uploaded = await Promise.all(
      rawFiles.map(async (file) => {
        const isVideo = file.mimetype.startsWith('video/');
        const mediaType = isVideo ? 'video' : 'image';
        const folder = isVideo ? 'chat/videos' : 'chat/images';

        const publicUrl = await uploadToSupabase(file, folder);

        return {
          url: publicUrl,
          mediaType,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype
        };
      })
    );

    const first = uploaded[0];
    return res.status(200).json({
      success: true,
      ...first,
      files: uploaded
    });
  } catch (error) {
    console.error('Chat file upload failed:', error);
    return res.status(500).json({
      error: error.message || 'Failed to upload chat attachment.'
    });
  }
});

module.exports = router;

