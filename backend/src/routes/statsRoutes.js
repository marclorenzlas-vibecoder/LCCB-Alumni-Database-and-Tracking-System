const express = require('express');
const { event_status } = require('@prisma/client');
const { getLimiterStatus } = require('../services/activeUserLimiter');
const { groupSectionDefinitions } = require('../config/groupSections.json');

const router = express.Router();
const prisma = require('../config/prisma');

const createMonthlyBuckets = (monthsBack = 6) => {
  const buckets = [];
  const bucketMap = new Map();
  const cursor = new Date();
  cursor.setDate(1);
  cursor.setHours(0, 0, 0, 0);
  cursor.setMonth(cursor.getMonth() - (monthsBack - 1));

  for (let index = 0; index < monthsBack; index += 1) {
    const key = `${cursor.getFullYear()}-${cursor.getMonth()}`;
    const bucket = {
      key,
      label: cursor.toLocaleString('en-US', { month: 'short' }),
      submitted: 0,
      approved: 0
    };

    buckets.push(bucket);
    bucketMap.set(key, bucket);
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return { buckets, bucketMap };
};

const buildMonthlyActivity = (submittedRows, approvedRows, monthsBack = 6) => {
  const { buckets, bucketMap } = createMonthlyBuckets(monthsBack);

  const addRowsToBuckets = (rows, targetKey) => {
    rows.forEach((row) => {
      if (!row.created_at) return;

      const date = new Date(row.created_at);
      const bucketKey = `${date.getFullYear()}-${date.getMonth()}`;
      const bucket = bucketMap.get(bucketKey);

      if (bucket) {
        bucket[targetKey] += 1;
      }
    });
  };

  addRowsToBuckets(submittedRows, 'submitted');
  addRowsToBuckets(approvedRows, 'approved');

  return buckets;
};

const normalizeProgramName = (value) => {
  const text = String(value || '').trim();
  return text || 'Not specified';
};

const normalizeProgramUsageProgram = (value) => {
  const program = normalizeProgramName(value);
  if (program === 'SBIT') return 'BSIT';
  if (program === 'SARFRAID') return 'SARFAID';
  if (program === 'Master of Business Administration') return 'Master in Business Administration';
  return program;
};

const programToLevelMap = new Map();
groupSectionDefinitions.forEach((sec) => {
  sec.items.forEach((item) => {
    const norm = normalizeProgramUsageProgram(item.value);
    programToLevelMap.set(norm, sec.key);
  });
});

const PROGRAM_USAGE_LEVELS = new Set(['COLLEGE', 'ETEEAP', 'GRAD_SCHOOL']);
const seenProgramUsagePrograms = new Set();
const PROGRAM_USAGE_PROGRAM_ROWS = groupSectionDefinitions
  .filter((section) => PROGRAM_USAGE_LEVELS.has(section.key))
  .flatMap((section) => section.items)
  .reduce((rows, item) => {
    const program = normalizeProgramUsageProgram(item.value);
    if (seenProgramUsagePrograms.has(program)) return rows;

    seenProgramUsagePrograms.add(program);
    rows.push(program);
    return rows;
  }, []);
const PROGRAM_USAGE_PROGRAMS = new Set(PROGRAM_USAGE_PROGRAM_ROWS);

const getAlumniDisplayName = (alumni = {}) => (
  [alumni.first_name, alumni.last_name].filter(Boolean).join(' ').trim() || 'Unnamed Alumni'
);

const shouldIncludeProgramUsageAlumni = (alumni = {}) => {
  return PROGRAM_USAGE_PROGRAMS.has(normalizeProgramUsageProgram(alumni.course));
};

const buildProgramUsageInCareer = (careers = [], allAlumni = []) => {
  const latestCareerByAlumni = new Map();

  careers.forEach((career) => {
    const alumniId = career.alumni_id;
    if (!alumniId || latestCareerByAlumni.has(alumniId)) return;
    latestCareerByAlumni.set(alumniId, career);
  });

  const programs = new Map(
    PROGRAM_USAGE_PROGRAM_ROWS.map((program) => [program, {
      program,
      using: [],
      notUsing: [],
      needsChecking: []
    }])
  );

  const sourceAlumni = allAlumni.length > 0
    ? allAlumni
    : Array.from(latestCareerByAlumni.values()).map((c) => c.alumni).filter(Boolean);

  sourceAlumni.forEach((alumniRecord) => {
    if (!alumniRecord || !shouldIncludeProgramUsageAlumni(alumniRecord)) return;

    const career = latestCareerByAlumni.get(alumniRecord.id);
    const alignment = String(career?.program_alignment || '').toUpperCase();
    const program = normalizeProgramUsageProgram(alumniRecord.course);

    const row = programs.get(program);
    if (!row) return;

    const alumnus = {
      id: alumniRecord.id,
      name: getAlumniDisplayName(alumniRecord),
      program,
      jobPosition: career?.job_title || alumniRecord.current_position || 'Not provided',
      company: career?.company || alumniRecord.company || 'Not provided',
      profileImage: alumniRecord.profile_image || null
    };

    if (alignment === 'ALIGNED') {
      row.using.push(alumnus);
    } else if (alignment === 'NOT_ALIGNED') {
      row.notUsing.push(alumnus);
    } else {
      row.needsChecking.push(alumnus);
    }
  });

  return Array.from(programs.values())
    .map((row) => {
      const usingCount = row.using.length;
      const notUsingCount = row.notUsing.length;
      const needsCheckingCount = row.needsChecking.length;
      const total = usingCount + notUsingCount + needsCheckingCount;
      const usageRate = total > 0 ? Math.round((usingCount / total) * 100) : 0;

      return {
        ...row,
        usingCount,
        notUsingCount,
        needsCheckingCount,
        total,
        usageRate
      };
    });
};

router.get('/home', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alumniDirectoryWhere = {
      NOT: {
        OR: [
          { email: { endsWith: '@lccbonline.com' } },
          { user: { is: { email: { endsWith: '@lccbonline.com' } } } }
        ]
      }
    };

    const [
      alumniCount,
      upcomingEventsCount,
      openJobsCount
    ] = await Promise.all([
      prisma.alumni.count({ where: alumniDirectoryWhere }),
      prisma.event.count({
        where: {
          OR: [
            { date: { gte: today } },
            { status: { in: [event_status.UPCOMING, event_status.CURRENT] } }
          ]
        }
      }),
      prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM job_posting WHERE approval_status = 'APPROVED'`).then((r) => r?.[0]?.count || 0)
    ]);

    const totalAlumni = alumniCount;
    const activeMembers = getLimiterStatus().activeAlumniUsers;

    res.json({
      totalAlumni,
      activeMembers,
      upcomingEvents: upcomingEventsCount,
      jobOpportunities: openJobsCount
    });
  } catch (error) {
    console.error('Error loading home stats:', error);
    res.status(500).json({ error: 'Failed to load home stats' });
  }
});

router.get('/home-snapshot', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const alumniDirectoryWhere = {
      NOT: {
        OR: [
          { email: { endsWith: '@lccbonline.com' } },
          { user: { is: { email: { endsWith: '@lccbonline.com' } } } }
        ]
      }
    };

    const [
      alumniCount,
      upcomingEventsCount,
      openJobsCount,
      events,
      achievements,
      jobs,
      donations
    ] = await Promise.all([
      prisma.alumni.count({ where: alumniDirectoryWhere }),
      prisma.event.count({
        where: {
          OR: [
            { date: { gte: today } },
            { status: { in: [event_status.UPCOMING, event_status.CURRENT] } }
          ]
        }
      }),
      prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM job_posting WHERE approval_status = 'APPROVED'`).then((r) => r?.[0]?.count || 0),
      
      // Top 3 events (newest first)
      prisma.event.findMany({
        orderBy: [{ id: 'desc' }],
        take: 3
      }),
      
      // Top 3 approved public achievements (excluding profile-only and pending/rejected)
      prisma.$queryRawUnsafe(`
        SELECT ach.id, ach.alumni_id, ach.title, ach.category, ach.image, ach.description, ach.date,
               ach.approval_status::text AS approval_status,
               ach.posted_by_name,
               a.first_name, a.last_name, a.email
        FROM achievement ach
        LEFT JOIN alumni a ON a.id = ach.alumni_id
        WHERE ach.approval_status = 'APPROVED'
          AND COALESCE(ach.is_profile_only, false) = false
        ORDER BY ach.id DESC
        LIMIT 3
      `).then((rows) =>
        rows.map((row) => ({
          id: row.id,
          alumni_id: row.alumni_id,
          title: row.title,
          category: row.category,
          image: row.image,
          description: row.description,
          date: row.date,
          approval_status: row.approval_status,
          posted_by_name: row.posted_by_name || null,
          alumni: row.first_name || row.last_name || row.email
            ? { first_name: row.first_name, last_name: row.last_name, email: row.email }
            : null
        }))
      ),
      
      // Top 3 approved job postings (excluding pending/rejected)
      prisma.$queryRawUnsafe(`
        SELECT jp.id, jp.posted_by_alumni_id, jp.posted_by_user_id, jp.job_title, jp.company,
               jp.location, jp.department, jp.job_type, jp.salary_range, jp.description,
               jp.application_url, jp.application_deadline, jp.created_at,
               jp.approval_status::text AS approval_status,
               a.id AS alumni_ref_id, a.first_name, a.last_name, a.email
        FROM job_posting jp
        LEFT JOIN alumni a ON a.id = jp.posted_by_alumni_id
        WHERE jp.approval_status = 'APPROVED'
        ORDER BY jp.created_at DESC NULLS LAST, jp.id DESC
        LIMIT 3
      `).then((rows) =>
        rows.map((row) => ({
          id: row.id,
          posted_by_alumni_id: row.posted_by_alumni_id,
          posted_by_user_id: row.posted_by_user_id,
          job_title: row.job_title,
          company: row.company,
          location: row.location,
          department: row.department,
          job_type: row.job_type,
          salary_range: row.salary_range,
          description: row.description,
          application_url: row.application_url,
          application_deadline: row.application_deadline,
          created_at: row.created_at,
          approval_status: row.approval_status,
          alumni: row.alumni_ref_id
            ? { id: row.alumni_ref_id, first_name: row.first_name, last_name: row.last_name, email: row.email }
            : null
        }))
      ),
      
      // Top 3 donations (newest first)
      prisma.donation.findMany({
        include: {
          alumni: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          }
        },
        orderBy: [{ id: 'desc' }],
        take: 3
      })
    ]);

    const activeMembers = getLimiterStatus().activeAlumniUsers;

    res.json({
      events,
      achievements,
      jobs,
      donations,
      stats: {
        totalAlumni: alumniCount,
        activeMembers,
        upcomingEvents: upcomingEventsCount,
        jobOpportunities: openJobsCount
      }
    });
  } catch (error) {
    console.error('Error fetching home snapshot:', error);
    res.status(500).json({ error: 'Failed to fetch home snapshot' });
  }
});

const LEVEL_CONFIG = [
  { key: 'COLLEGE', label: 'College' },
  { key: 'SENIOR_HIGH', label: 'Senior High' },
  { key: 'ETEEAP', label: 'ETEEAP' },
  { key: 'GRAD_SCHOOL', label: 'Grad School' },
  { key: 'INTEGRATED_SCHOOL', label: 'Integrated School' }
];

const buildAlumniByLevelAndProgram = (alumniRows = []) => {
  const levelMap = new Map();

  groupSectionDefinitions.forEach((sec) => {
    const programCounts = new Map();
    sec.items.forEach((item) => {
      const norm = normalizeProgramUsageProgram(item.value);
      programCounts.set(norm, 0);
    });

    const cfg = LEVEL_CONFIG.find((c) => c.key === sec.key);
    levelMap.set(sec.key, {
      key: sec.key,
      label: cfg ? cfg.label : sec.title,
      totalAlumni: 0,
      programCounts
    });
  });

  const unspecifiedKey = 'UNSPECIFIED';
  levelMap.set(unspecifiedKey, {
    key: unspecifiedKey,
    label: 'Other / Unspecified',
    totalAlumni: 0,
    programCounts: new Map()
  });

  alumniRows.forEach((row) => {
    const normCourse = normalizeProgramUsageProgram(row.course);
    let levelKey = row.level ? String(row.level).toUpperCase() : unspecifiedKey;
    if (levelKey === 'NIGHT_HIGH') levelKey = 'INTEGRATED_SCHOOL';

    if (programToLevelMap.has(normCourse)) {
      levelKey = programToLevelMap.get(normCourse);
    }
    if (!levelMap.has(levelKey)) levelKey = unspecifiedKey;

    const targetGroup = levelMap.get(levelKey);
    targetGroup.totalAlumni += 1;
    const currentCount = targetGroup.programCounts.get(normCourse) || 0;
    targetGroup.programCounts.set(normCourse, currentCount + 1);
  });

  const result = [];
  levelMap.forEach((group) => {
    if (group.totalAlumni === 0 && group.key === unspecifiedKey) return;

    const programs = Array.from(group.programCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    result.push({
      key: group.key,
      label: group.label,
      totalAlumni: group.totalAlumni,
      programs
    });
  });

  return result;
};

const buildAlumniPerCourse = (alumniRows = []) => {
  const courseMap = new Map();
  alumniRows.forEach((row) => {
    const course = normalizeProgramUsageProgram(row.course);
    courseMap.set(course, (courseMap.get(course) || 0) + 1);
  });
  return Array.from(courseMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
};

router.get('/admin', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activityStartDate = new Date();
    activityStartDate.setDate(1);
    activityStartDate.setHours(0, 0, 0, 0);
    activityStartDate.setMonth(activityStartDate.getMonth() - 5);

    const alumniDirectoryWhere = {
      NOT: {
        OR: [
          { email: { endsWith: '@lccbonline.com' } },
          { user: { is: { email: { endsWith: '@lccbonline.com' } } } }
        ]
      }
    };

    const [
      totalAlumni,
      pendingRegistrations,
      approvedAlumni,
      teachers,
      upcomingEvents,
      openJobs,
      pendingDeceasedReports,
      submittedRows,
      approvedRows,
      careerRows,
      alumniLevelCourseRows
    ] = await Promise.all([
      prisma.alumni.count({ where: alumniDirectoryWhere }),
      prisma.pending_registration.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { role: 'ALUMNI', approval_status: 'APPROVED' } }),
      prisma.teacher.count(),
      prisma.event.count({
        where: {
          OR: [
            { date: { gte: today } },
            { status: { in: [event_status.UPCOMING, event_status.CURRENT] } }
          ]
        }
      }),
      prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM job_posting WHERE approval_status = 'APPROVED'`).then((r) => r?.[0]?.count || 0),
      Promise.resolve(0),
      prisma.pending_registration.findMany({
        where: {
          created_at: {
            gte: activityStartDate
          }
        },
        select: {
          created_at: true
        }
      }),
      prisma.user.findMany({
        where: {
          role: 'ALUMNI',
          approval_status: 'APPROVED',
          created_at: {
            gte: activityStartDate
          }
        },
        select: {
          created_at: true
        }
      }),
      prisma.career_entry.findMany({
        where: {
          alumni: {
            is: alumniDirectoryWhere
          }
        },
        include: {
          alumni: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              course: true,
              current_position: true,
              company: true,
              profile_image: true,
              email: true,
              user: {
                select: {
                  email: true
                }
              }
            }
          }
        },
        orderBy: [
          { is_current: 'desc' },
          { start_date: 'desc' },
          { end_date: 'desc' },
          { id: 'desc' }
        ]
      }),
      prisma.alumni.findMany({
        where: alumniDirectoryWhere,
        select: {
          id: true,
          first_name: true,
          last_name: true,
          level: true,
          course: true,
          current_position: true,
          company: true,
          profile_image: true
        }
      })
    ]);

    const monthlyActivity = buildMonthlyActivity(submittedRows, approvedRows);
    const programUsageInCareer = buildProgramUsageInCareer(careerRows, alumniLevelCourseRows);
    const alumniByLevelAndProgram = buildAlumniByLevelAndProgram(alumniLevelCourseRows);
    const alumniPerCourse = buildAlumniPerCourse(alumniLevelCourseRows);
    const activeMembers = getLimiterStatus().activeAlumniUsers;

    res.json({
      totalAlumni,
      pendingRegistrations,
      approvedAlumni,
      teachers,
      activeMembers,
      upcomingEvents,
      openJobs,
      pendingDeceasedReports,
      monthlyActivity,
      programUsageInCareer,
      alumniByLevelAndProgram,
      alumniPerCourse
    });
  } catch (error) {
    console.error('Error loading admin stats:', error);
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

module.exports = router;
