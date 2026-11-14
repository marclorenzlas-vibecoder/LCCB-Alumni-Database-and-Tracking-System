const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const { authenticateToken } = require('../middleware/auth');
const { uploadToSupabase } = require('../services/storageService');

// Configure multer memory storage with 50MB limit for chat files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
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
 * Upload images, videos, or any files to Supabase Storage for chat (supports single or multiple files)
 */
router.post('/upload', authenticateToken, handleUpload, async (req, res) => {
  try {
    const rawFiles = req.files || (req.file ? [req.file] : []);
    if (!rawFiles || rawFiles.length === 0) {
      return res.status(400).json({ error: 'No file provided.' });
    }

    const uploaded = await Promise.all(
      rawFiles.map(async (file) => {
        const mime = String(file.mimetype || '').toLowerCase();
        const isImage = mime.startsWith('image/');
        const isVideo = mime.startsWith('video/');
        const mediaType = isImage ? 'image' : isVideo ? 'video' : 'file';
        const folder = isImage ? 'chat/images' : isVideo ? 'chat/videos' : 'chat/files';

        const publicUrl = await uploadToSupabase(file, folder);

        return {
          url: publicUrl,
          mediaType,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype || 'application/octet-stream'
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

// In-memory cache for link previews (URL -> { data, expiresAt })
const previewCache = new Map();
const PREVIEW_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const isPrivateHostname = (hostname) => {
  if (!hostname) return true;
  const clean = hostname.toLowerCase().trim();
  return (
    clean === 'localhost' ||
    clean === '127.0.0.1' ||
    clean === '0.0.0.0' ||
    clean.startsWith('10.') ||
    clean.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(clean) ||
    clean.endsWith('.local') ||
    clean.endsWith('.internal')
  );
};

/**
 * GET /api/chat/link-preview
 * Fetches Open Graph / Rich metadata for URLs sent in chat
 */
router.get('/link-preview', authenticateToken, async (req, res) => {
  try {
    const rawUrl = String(req.query.url || '').trim();
    if (!rawUrl) {
      return res.status(400).json({ error: 'URL parameter is required.' });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(
        rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
          ? rawUrl
          : `https://${rawUrl}`
      );
    } catch {
      return res.status(400).json({ error: 'Invalid URL format.' });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS protocols are allowed.' });
    }

    if (isPrivateHostname(parsedUrl.hostname)) {
      return res.status(403).json({ error: 'Access to private hostnames is restricted.' });
    }

    const cleanUrl = parsedUrl.href;

    // Check cache
    const cached = previewCache.get(cleanUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, ...cached.data });
    }

    // Special handler for YouTube
    const ytMatch = cleanUrl.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
    );
    if (ytMatch) {
      const videoId = ytMatch[1];
      try {
        const oembedRes = await axios.get(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`,
          { timeout: 4500 }
        );
        const oembed = oembedRes.data || {};
        const result = {
          url: cleanUrl,
          title: oembed.title || 'YouTube Video',
          description: oembed.author_name || 'YouTube',
          image: oembed.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          siteName: 'YouTube'
        };
        previewCache.set(cleanUrl, { data: result, expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS });
        return res.json({ success: true, ...result });
      } catch {
        const result = {
          url: cleanUrl,
          title: 'YouTube Video',
          description: 'Watch on YouTube',
          image: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          siteName: 'YouTube'
        };
        previewCache.set(cleanUrl, { data: result, expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS });
        return res.json({ success: true, ...result });
      }
    }

    // General website scraper
    const response = await axios.get(cleanUrl, {
      timeout: 5000,
      maxContentLength: 2 * 1024 * 1024,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    const contentType = String(response.headers['content-type'] || '');
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return res.status(400).json({ error: 'URL does not return HTML.' });
    }

    const $ = cheerio.load(response.data);

    const title = (
      $('meta[property="og:title"]').attr('content') ||
      $('meta[name="twitter:title"]').attr('content') ||
      $('title').text() ||
      parsedUrl.hostname
    ).trim();

    const description = (
      $('meta[property="og:description"]').attr('content') ||
      $('meta[name="twitter:description"]').attr('content') ||
      $('meta[name="description"]').attr('content') ||
      ''
    ).trim();

    let image = (
      $('meta[property="og:image"]').attr('content') ||
      $('meta[property="og:image:url"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content') ||
      $('meta[name="twitter:image:src"]').attr('content') ||
      ''
    ).trim();

    if (image && !image.startsWith('http://') && !image.startsWith('https://')) {
      try {
        image = new URL(image, cleanUrl).href;
      } catch {
        image = '';
      }
    }

    const siteName = (
      $('meta[property="og:site_name"]').attr('content') ||
      parsedUrl.hostname.replace(/^www\./i, '')
    ).trim();

    const result = {
      url: cleanUrl,
      title: title.slice(0, 200),
      description: description.slice(0, 300),
      image,
      siteName: siteName.slice(0, 80)
    };

    previewCache.set(cleanUrl, { data: result, expiresAt: Date.now() + PREVIEW_CACHE_TTL_MS });
    return res.json({ success: true, ...result });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Failed to fetch link preview.'
    });
  }
});

module.exports = router;

