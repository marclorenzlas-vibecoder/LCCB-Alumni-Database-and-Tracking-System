const prisma = require('../config/prisma');
const cooldownConfig = require('../config/profileCooldowns');

/**
 * Gets the profile change cooldown status for all fields for a user.
 * @param {number} userId 
 * @param {boolean} isBypass Admin/Staff bypass
 */
async function getProfileCooldownStatus(userId, isBypass = false) {
  const status = {};

  // Profile field edit locking/cooldown is disabled; all fields remain editable.
  for (const field of Object.keys(cooldownConfig)) {
    status[field] = {
      editable: true,
      availableAt: null,
      lastChangedAt: null
    };
  }
  return status;
}

module.exports = {
  getProfileCooldownStatus
};
