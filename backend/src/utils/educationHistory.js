const VALID_LEVELS = new Set([
  'INTEGRATED_SCHOOL',
  'NIGHT_HIGH',
  'SENIOR_HIGH',
  'COLLEGE',
  'ETEEAP',
  'GRAD_SCHOOL'
]);

const LEGACY_LEVEL_MAP = {
  HIGH_SCHOOL: 'INTEGRATED_SCHOOL',
  SENIOR_HIGH_SCHOOL: 'SENIOR_HIGH'
};

function normalizeLevel(value) {
  if (!value) return null;
  const raw = String(value).trim().toUpperCase().replace(/\s+/g, '_');

  if (VALID_LEVELS.has(raw)) return raw;
  if (LEGACY_LEVEL_MAP[raw]) return LEGACY_LEVEL_MAP[raw];

  if (raw.includes('INTEGRATED')) return 'INTEGRATED_SCHOOL';
  if (raw.includes('NIGHT')) return 'NIGHT_HIGH';
  if (raw.includes('SENIOR')) return 'SENIOR_HIGH';
  if (raw.includes('COLLEGE')) return 'COLLEGE';
  if (raw.includes('ETEEAP')) return 'ETEEAP';
  if (raw.includes('GRAD')) return 'GRAD_SCHOOL';

  return null;
}

function parseEducationHistory(rawEducationHistory) {
  if (!rawEducationHistory) return [];

  let parsed = rawEducationHistory;
  if (typeof rawEducationHistory === 'string') {
    try {
      parsed = JSON.parse(rawEducationHistory);
    } catch (error) {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((entry) => {
      const normalizedLevel = normalizeLevel(entry?.level);
      const batch = Number.parseInt(entry?.batch, 10);
      const graduationYear = Number.parseInt(entry?.graduationYear ?? entry?.graduation_year, 10);

      if (!normalizedLevel) return null;

      return {
        level: normalizedLevel,
        batch: Number.isNaN(batch) ? null : batch,
        graduationYear: Number.isNaN(graduationYear) ? null : graduationYear
      };
    })
    .filter(Boolean);
}

function getEducationHistoryWithFallback(alumniLike, history = []) {
  if (Array.isArray(history) && history.length > 0) {
    return history;
  }

  if (!alumniLike) return [];

  const level = normalizeLevel(alumniLike.level);
  if (!level) return [];

  const batch = Number.parseInt(alumniLike.batch, 10);
  const graduationYear = Number.parseInt(
    alumniLike.graduation_year ?? alumniLike.graduationYear,
    10
  );

  return [{
    level,
    batch: Number.isNaN(batch) ? null : batch,
    graduationYear: Number.isNaN(graduationYear) ? null : graduationYear,
    graduation_year: Number.isNaN(graduationYear) ? null : graduationYear
  }];
}

async function ensureEducationHistoryTable(prisma) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS alumni_education_history (
      id INT NOT NULL AUTO_INCREMENT,
      alumni_id INT NOT NULL,
      level ENUM('INTEGRATED_SCHOOL','NIGHT_HIGH','SENIOR_HIGH','COLLEGE','ETEEAP','GRAD_SCHOOL') NOT NULL,
      batch INT NULL,
      graduation_year INT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_alumni_education_history_alumni_id (alumni_id),
      CONSTRAINT fk_alumni_education_history_alumni FOREIGN KEY (alumni_id) REFERENCES alumni(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

async function getEducationHistoryByAlumniIds(prisma, alumniIds) {
  if (!Array.isArray(alumniIds) || alumniIds.length === 0) return new Map();

  await ensureEducationHistoryTable(prisma);

  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT id, alumni_id, level, batch, graduation_year
      FROM alumni_education_history
      WHERE alumni_id IN (${alumniIds.map(() => '?').join(',')})
      ORDER BY alumni_id ASC, graduation_year ASC, batch ASC, id ASC
    `,
    ...alumniIds
  );

  const grouped = new Map();
  for (const row of rows) {
    const list = grouped.get(row.alumni_id) || [];
    list.push({
      id: row.id,
      level: row.level,
      batch: row.batch,
      graduationYear: row.graduation_year,
      graduation_year: row.graduation_year
    });
    grouped.set(row.alumni_id, list);
  }

  return grouped;
}

async function replaceEducationHistory(prisma, alumniId, entries) {
  await ensureEducationHistoryTable(prisma);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`DELETE FROM alumni_education_history WHERE alumni_id = ${alumniId}`;

    for (const entry of entries) {
      await tx.$executeRaw`
        INSERT INTO alumni_education_history (alumni_id, level, batch, graduation_year)
        VALUES (${alumniId}, ${entry.level}, ${entry.batch}, ${entry.graduationYear})
      `;
    }
  });
}

module.exports = {
  normalizeLevel,
  parseEducationHistory,
  getEducationHistoryWithFallback,
  getEducationHistoryByAlumniIds,
  replaceEducationHistory
};
