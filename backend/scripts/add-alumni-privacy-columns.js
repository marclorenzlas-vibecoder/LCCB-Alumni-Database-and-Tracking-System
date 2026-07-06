const mysql = require('mysql2/promise');
require('dotenv').config();

const columns = [
  ['is_student_id_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_date_of_birth_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_course_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_graduation_year_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_education_history_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_email_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_phone_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_position_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_company_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_employment_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_location_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_social_links_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
  ['is_skills_public', 'BOOLEAN NOT NULL DEFAULT TRUE'],
];

const getDbConfig = () => {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL.replace(/^"|"$/g, ''));
    return {
      host: url.hostname || 'localhost',
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username || 'root'),
      password: decodeURIComponent(url.password || ''),
      database: url.pathname.replace(/^\//, '') || process.env.DB_NAME || 'alumni',
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'alumni',
  };
};

async function main() {
  const config = getDbConfig();
  const connection = await mysql.createConnection(config);

  try {
    const [existingRows] = await connection.execute(
      `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'alumni'
      `,
      [config.database],
    );
    const existing = new Set(existingRows.map((row) => row.COLUMN_NAME));
    const missing = columns.filter(([name]) => !existing.has(name));

    if (missing.length === 0) {
      console.log('All alumni privacy columns already exist.');
      return;
    }

    const clauses = missing.map(([name, definition]) => `ADD COLUMN \`${name}\` ${definition}`);
    await connection.query(`ALTER TABLE \`alumni\` ${clauses.join(', ')}`);

    console.log(`Added ${missing.length} alumni privacy column(s):`);
    missing.forEach(([name]) => console.log(`- ${name}`));
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('Failed to add alumni privacy columns:', error);
  process.exit(1);
});
