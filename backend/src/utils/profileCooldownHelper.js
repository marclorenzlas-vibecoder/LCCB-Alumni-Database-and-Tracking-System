const prisma = require('../config/prisma');
const cooldownConfig = require('../config/profileCooldowns');

/**
 * Gets the profile change cooldown status for all fields for a user.
 * @param {number} userId 
 * @param {boolean} isBypass Admin/Staff bypass
 */
async function getProfileCooldownStatus(userId, isBypass = false) {
  const status = {};
  
  if (isBypass) {
    // If the requester is an admin/staff, bypass cooldowns entirely
    for (const field of Object.keys(cooldownConfig)) {
      status[field] = {
        editable: true,
        availableAt: null,
        lastChangedAt: null
      };
    }
    return status;
  }

  // Fetch all change logs for this user, ordered by creation date descending
  const logs = await prisma.profile_change_log.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' }
  });

  // Map each field to its most recent change log entry
  const lastChangeMap = {};
  for (const log of logs) {
    if (!lastChangeMap[log.field_name]) {
      lastChangeMap[log.field_name] = log;
    }
  }

  const now = new Date();

  for (const field of Object.keys(cooldownConfig)) {
    const cooldownDays = cooldownConfig[field];
    const lastChange = lastChangeMap[field];

    if (!lastChange || cooldownDays <= 0) {
      status[field] = {
        editable: true,
        availableAt: null,
        lastChangedAt: lastChange ? lastChange.created_at.toISOString() : null
      };
    } else {
      const changeDate = new Date(lastChange.created_at);
      const availableAt = new Date(changeDate.getTime() + cooldownDays * 24 * 60 * 60 * 1000);
      const editable = now.getTime() >= availableAt.getTime();

      status[field] = {
        editable,
        availableAt: editable ? null : availableAt.toISOString(),
        lastChangedAt: lastChange.created_at.toISOString()
      };
    }
  }

  return status;
}

module.exports = {
  getProfileCooldownStatus
};
