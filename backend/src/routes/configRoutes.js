const express = require('express');
const path = require('path');
const router = express.Router();

// Serve canonical group/course/level definitions
router.get('/groups', (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'config', 'groupSections.json');
    // Use require to load JSON sync and benefit from node caching
    const data = require(filePath);
    res.json({ success: true, data });
  } catch (err) {
    console.error('Failed to load groupSections.json', err);
    res.status(500).json({ success: false, error: 'Failed to load groups configuration' });
  }
});

module.exports = router;
