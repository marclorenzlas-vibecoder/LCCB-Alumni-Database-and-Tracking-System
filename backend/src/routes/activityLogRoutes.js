const express = require('express');
const { teacherAuthMiddleware } = require('../middleware/auth');
const { listActivityLogs } = require('../services/activityLogService');

const router = express.Router();

router.get('/', teacherAuthMiddleware, async (req, res) => {
  try {
    const logs = await listActivityLogs({
      limit: req.query.limit,
      excludeSessionActivity: req.query.excludeSessionActivity === 'true'
    });
    res.json(logs);
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

module.exports = router;
