const mysql = require('mysql2/promise');
require('dotenv').config();

async function runMigration() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'lccb_alumni'
  });

  try {
    console.log('Running job_application table migration...');

    // Create job_application table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS job_application (
        id INT AUTO_INCREMENT PRIMARY KEY,
        job_posting_id INT NOT NULL,
        applicant_id INT NOT NULL,
        cover_letter TEXT,
        resume_url VARCHAR(255),
        status ENUM('PENDING', 'REVIEWED', 'SHORTLISTED', 'REJECTED', 'ACCEPTED') DEFAULT 'PENDING',
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        reviewed_at DATETIME,
        notes TEXT,
        CONSTRAINT unique_job_application UNIQUE (job_posting_id, applicant_id),
        CONSTRAINT fk_job_application_job_posting FOREIGN KEY (job_posting_id) REFERENCES job_posting(id) ON DELETE CASCADE,
        CONSTRAINT fk_job_application_applicant FOREIGN KEY (applicant_id) REFERENCES alumni(id) ON DELETE CASCADE,
        INDEX idx_job_posting (job_posting_id),
        INDEX idx_applicant (applicant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    console.log('✓ job_application table created successfully');
    console.log('Migration completed!');

  } catch (error) {
    console.error('Error running migration:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

runMigration()
  .then(() => {
    console.log('Migration finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
