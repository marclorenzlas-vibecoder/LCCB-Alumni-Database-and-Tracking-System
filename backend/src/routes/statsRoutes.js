const express = require('express');
const { PrismaClient, event_status } = require('@prisma/client');
const { getLimiterStatus } = require('../services/activeUserLimiter');

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
      approvedRows
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
      })
    ]);

    const monthlyActivity = buildMonthlyActivity(submittedRows, approvedRows);
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
      monthlyActivity
    });
  } catch (error) {
    console.error('Error loading admin stats:', error);
    res.status(500).json({ error: 'Failed to load admin stats' });
  }
});

module.exports = router;
