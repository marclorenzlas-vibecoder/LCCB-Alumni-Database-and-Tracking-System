const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

let ensureTablePromise = null;

const ensureActivityLogTable = () => {
  if (!ensureTablePromise) {
    ensureTablePromise = prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS activity_log (
        id INT NOT NULL AUTO_INCREMENT,
        actor_id INT NULL,
        actor_name VARCHAR(255) NULL,
        actor_role VARCHAR(100) NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100) NOT NULL,
        entity_id INT NULL,
        entity_label VARCHAR(255) NULL,
        summary TEXT NOT NULL,
        details TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_activity_log_created_at (created_at),
        INDEX idx_activity_log_actor_id (actor_id),
        INDEX idx_activity_log_entity (entity_type, action)
      )
    `).catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  return ensureTablePromise;
};

const normalizeActor = (req) => {
  const user = req?.user || {};
  const actorId = Number(user.id);
  const actorName = user.username || user.name || user.email || 'System';
  const actorRole = String(user.role || 'SYSTEM').toUpperCase();

  return {
    actorId: Number.isFinite(actorId) && actorId > 0 ? actorId : null,
    actorName,
    actorRole
  };
};

const safeString = (value, fallback = null) => {
  if (value === undefined || value === null) return fallback;
  const text = String(value).trim();
  return text || fallback;
};

const normalizeDetailValue = (value) => {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && typeof value.toString === 'function') {
    const text = value.toString();
    return text === '[object Object]' ? JSON.stringify(value) : text;
  }
  return value;
};

const valuesAreDifferent = (left, right) => {
  const normalizedLeft = normalizeDetailValue(left);
  const normalizedRight = normalizeDetailValue(right);
  return String(normalizedLeft ?? '') !== String(normalizedRight ?? '');
};

const buildChangeSet = (before = {}, after = {}, fields = []) => fields
  .map((field) => {
    const key = typeof field === 'string' ? field : field.key;
    const label = typeof field === 'string' ? field : field.label || field.key;
    return {
      field: label,
      from: normalizeDetailValue(before?.[key]),
      to: normalizeDetailValue(after?.[key])
    };
  })
  .filter((change) => valuesAreDifferent(change.from, change.to));

const recordActivity = async ({
  req,
  action,
  entityType,
  entityId = null,
  entityLabel = null,
  summary,
  details = null
}) => {
  try {
    await ensureActivityLogTable();
    const actor = normalizeActor(req);
    const numericEntityId = Number(entityId);
    const detailsText = details ? JSON.stringify(details) : null;

    await prisma.$executeRaw`
      INSERT INTO activity_log (
        actor_id,
        actor_name,
        actor_role,
        action,
        entity_type,
        entity_id,
        entity_label,
        summary,
        details
      )
      VALUES (
        ${actor.actorId},
        ${safeString(actor.actorName, 'System')},
        ${safeString(actor.actorRole, 'SYSTEM')},
        ${safeString(action, 'ACTION')},
        ${safeString(entityType, 'system')},
        ${Number.isFinite(numericEntityId) && numericEntityId > 0 ? numericEntityId : null},
        ${safeString(entityLabel)},
        ${safeString(summary, 'Recorded admin activity')},
        ${detailsText}
      )
    `;
  } catch (error) {
    console.error('Activity log write failed:', {
      message: error.message,
      action,
      entityType,
      entityId
    });
  }
};

const listActivityLogs = async ({ limit = 30, excludeSessionActivity = false } = {}) => {
  await ensureActivityLogTable();
  const safeLimit = Math.min(Math.max(Number(limit) || 30, 1), 100);
  const whereClause = excludeSessionActivity
    ? "WHERE action NOT IN ('LOGIN', 'LOGOUT')"
    : '';

  return prisma.$queryRawUnsafe(`
    SELECT
      id,
      actor_id AS actorId,
      actor_name AS actorName,
      actor_role AS actorRole,
      action,
      entity_type AS entityType,
      entity_id AS entityId,
      entity_label AS entityLabel,
      summary,
      details,
      created_at AS createdAt
    FROM activity_log
    ${whereClause}
    ORDER BY created_at DESC, id DESC
    LIMIT ${safeLimit}
  `);
};

const deleteSessionActivityLogs = async () => {
  await ensureActivityLogTable();
  const result = await prisma.$executeRaw`
    DELETE FROM activity_log
    WHERE action IN ('LOGIN', 'LOGOUT')
  `;
  return Number(result) || 0;
};

module.exports = {
  buildChangeSet,
  deleteSessionActivityLogs,
  ensureActivityLogTable,
  listActivityLogs,
  recordActivity
};
