const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addSampleJobs() {
  try {
    console.log('Adding sample job postings...\n');

    // Get an alumni user to post these jobs
    const alumni = await prisma.alumni.findFirst({
      where: {
        email: { not: null }
      }
    });

    if (!alumni) {
      console.log('No alumni found. Please create an alumni first.');
      return;
    }

    console.log(`Posting jobs as: ${alumni.first_name} ${alumni.last_name} (ID: ${alumni.id})\n`);

    // Sample job postings with all required fields
    const jobPostings = [
      {
        posted_by_alumni_id: alumni.id,
        job_title: 'Senior Software Engineer',
        company: 'TechVision Philippines Inc.',
        location: 'Makati City',
        job_type: 'Full-time',
        salary_range: '₱80,000 - ₱120,000',
        requirements: 'Bachelor\'s degree in Computer Science\n5+ years experience in web development\nStrong knowledge of React and Node.js\nExperience with cloud platforms (AWS/Azure)\nExcellent problem-solving skills',
        description: 'We are seeking a talented Senior Software Engineer to join our growing team. You will be responsible for developing and maintaining high-quality web applications using modern technologies. Work on exciting projects for international clients in a collaborative and innovative environment. Opportunities for career growth and professional development.',
        application_deadline: new Date('2025-01-30')
      },
      {
        posted_by_alumni_id: alumni.id,
        job_title: 'Full Stack Developer',
        company: 'Manila Digital Solutions',
        location: 'Manila',
        job_type: 'Remote',
        salary_range: '₱60,000 - ₱90,000',
        requirements: 'Bachelor\'s degree in Computer Science or related field\nProficient in React, Node.js, and database management\nExperience with e-commerce platforms\nStrong understanding of RESTful APIs\nMobile application development experience is a plus',
        description: 'Join our dynamic team as a Full Stack Developer! We need someone who can work on cutting-edge e-commerce platforms and mobile applications. This is a remote position with flexible working hours. We offer competitive salary, HMO benefits for you and your dependents, annual performance bonuses, and opportunities to work with the latest technologies.',
        application_deadline: new Date('2025-02-15')
      },
      {
        posted_by_alumni_id: alumni.id,
        job_title: 'Data Analyst',
        company: 'Philippine Business Analytics Corp.',
        location: 'BGC, Taguig',
        job_type: 'Part-time',
        salary_range: '₱50,000 - ₱75,000',
        requirements: 'Bachelor\'s degree in Computer Science, Statistics, or related field\nStrong analytical and problem-solving skills\nProficiency in Python, SQL, and data visualization tools (Tableau, Power BI)\nExperience with machine learning algorithms\nExcellent communication and presentation skills',
        description: 'Exciting opportunity for a Data Analyst to work with one of the leading business intelligence firms in the Philippines. You will analyze complex datasets, create insightful visualizations, and help drive business decisions. Work with cross-functional teams to identify trends and patterns. Part-time schedule available (20 hours per week) with potential for full-time conversion.',
        application_deadline: new Date('2025-01-15')
      }
    ];

    console.log('Creating job postings...\n');

    for (const job of jobPostings) {
      const created = await prisma.job_posting.create({
        data: job
      });
      console.log(`✓ Added: ${created.job_title}`);
      console.log(`  Company: ${created.company}`);
      console.log(`  Location: ${created.location}`);
      console.log(`  Type: ${created.job_type}`);
      console.log(`  Salary: ${created.salary_range}`);
      console.log(`  Deadline: ${created.application_deadline.toLocaleDateString()}`);
      console.log('');
    }

    console.log('✅ Successfully added 3 job postings!\n');
    console.log('Job Summary:');
    console.log('1. Senior Software Engineer - TechVision Philippines Inc. (Full-time, Makati)');
    console.log('2. Full Stack Developer - Manila Digital Solutions (Remote)');
    console.log('3. Data Analyst - Philippine Business Analytics Corp. (Part-time, BGC)');

  } catch (error) {
    console.error('Error adding job postings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleJobs();
