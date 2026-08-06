const express = require('express');
const { PrismaClient, event_status } = require('@prisma/client');
const { getLimiterStatus } = require('../services/activeUserLimiter');
const { groupSectionDefinitions } = require('../config/groupSections.json');

const router = express.Router();
const prisma = new PrismaClient();

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
  return program === 'SBIT' ? 'BSIT' : program;
};

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

const buildProgramUsageInCareer = (careers = []) => {
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
      notUsing: []
    }])
  );

  latestCareerByAlumni.forEach((career) => {
    const alignment = String(career.program_alignment || '').toUpperCase();
    if (alignment !== 'ALIGNED' && alignment !== 'NOT_ALIGNED') return;
    if (!shouldIncludeProgramUsageAlumni(career.alumni)) return;

    const program = normalizeProgramUsageProgram(career.alumni?.course);

    const row = programs.get(program);
    const alumnus = {
      id: career.alumni?.id || career.alumni_id,
      name: getAlumniDisplayName(career.alumni),
      program,
      jobPosition: career.job_title || career.alumni?.current_position || 'Not provided',
      company: career.company || career.alumni?.company || 'Not provided',
      profileImage: career.alumni?.profile_image || null
    };

    if (alignment === 'ALIGNED') {
      row.using.push(alumnus);
    } else {
      row.notUsing.push(alumnus);
    }
  });

  return Array.from(programs.values())
    .map((row) => {
      const usingCount = row.using.length;
      const notUsingCount = row.notUsing.length;
      const total = usingCount + notUsingCount;
      const usageRate = total > 0 ? Math.round((usingCount / total) * 100) : 0;

      return {
        ...row,
        usingCount,
        notUsingCount,
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
      prisma.job_posting.count()
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
      prisma.job_posting.count(),
      
      // Top 3 events
      prisma.event.findMany({
        orderBy: { date: 'desc' },
        take: 3
      }),
      
      // Top 3 achievements
      prisma.achievement.findMany({
        include: {
          alumni: {
            select: {
              first_name: true,
              last_name: true,
              email: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 3
      }),
      
      // Top 3 jobs
      prisma.job_posting.findMany({
        include: {
          alumni: {
            select: {
              id: true,
              first_name: true,
              last_name: true,
              email: true
            }
          }
        },
        orderBy: { created_at: 'desc' },
        take: 3
      }),
      
      // Top 3 donations
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
        orderBy: { date: 'desc' },
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
      careerRows
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
      prisma.job_posting.count(),
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
      })
    ]);

    const monthlyActivity = buildMonthlyActivity(submittedRows, approvedRows);
    const programUsageInCareer = buildProgramUsageInCareer(careerRows);
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
      programUsageInCareer
    });
  } catch (error) {
    console.error('Error loading admin stats:', error);
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

module.exports = router;
