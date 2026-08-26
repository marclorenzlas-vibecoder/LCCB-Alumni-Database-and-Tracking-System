const prisma = require('../config/prisma');
const notificationService = require('./notificationService');
const { broadcastUpdate } = require('./realtimeService');



const normalizeBirthdayNotificationVisibility = (value) => {
  const normalized = String(value || 'PUBLIC').trim().toUpperCase();
  if (['PRIVATE', 'OFF'].includes(normalized)) return 'OFF';
  return 'PUBLIC';
};

const isBirthdayToday = (dateValue, today = new Date()) => {
  if (!dateValue) return false;
  const dob = new Date(dateValue);
  if (Number.isNaN(dob.getTime())) return false;

  return dob.getUTCDate() === today.getUTCDate() && dob.getUTCMonth() === today.getUTCMonth();
};

const buildBirthdayTitle = (alumni, isBirthdayAlumni = false) => (
  isBirthdayAlumni
    ? `Happy Birthday, ${alumni.first_name} ${alumni.last_name}!`
    : `Birthday today: ${alumni.first_name} ${alumni.last_name}`
);

const buildBirthdayMessage = (alumni, isBirthdayAlumni = false) => (
  isBirthdayAlumni
    ? `Wishing you a wonderful birthday, ${alumni.first_name} ${alumni.last_name}.`
    : `Today is ${alumni.first_name} ${alumni.last_name}'s birthday. Send them a greeting from the alumni community.`
);

async function sendBirthdayNotifications() {
  const today = new Date();
  const currentMonth = today.getUTCMonth() + 1;
  const currentDay = today.getUTCDate();

  const todaysBirthdays = await prisma.$queryRaw`
    SELECT
      a.id,
      a.user_id,
      a.first_name,
      a.last_name,
      a.email,
      a.date_of_birth,
      COALESCE(u.birthday_notification_visibility, 'PUBLIC') AS birthday_notification_visibility
    FROM alumni a
    LEFT JOIN "user" u ON a.user_id = u.id
    WHERE a.date_of_birth IS NOT NULL
      AND (a.status IS NULL OR a.status != 'DECEASED')
      AND EXTRACT(MONTH FROM a.date_of_birth) = ${currentMonth}
      AND EXTRACT(DAY FROM a.date_of_birth) = ${currentDay}
      AND COALESCE(u.birthday_notification_visibility, 'PUBLIC') NOT IN ('OFF', 'PRIVATE')
  `;
  const eligibleRecipients = await prisma.user.findMany({
    where: {
      notification_enabled: true,
      is_active: true,
      is_blocked: false
    },
    select: {
      id: true,
      email: true,
      alumni: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          date_of_birth: true
        }
      }
    }
  });

  let createdCount = 0;

  for (const alumni of todaysBirthdays) {
    const birthdayVisibility = normalizeBirthdayNotificationVisibility(alumni.birthday_notification_visibility);
    if (birthdayVisibility === 'OFF') {
      continue;
    }

    const link = `/alumni/profile/${alumni.id}`;

    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const nextDay = new Date(dayStart);
    nextDay.setDate(dayStart.getDate() + 1);

    for (const recipient of eligibleRecipients) {
      const isBirthdayAlumni = Number(recipient.alumni?.id) === Number(alumni.id);
      const title = buildBirthdayTitle(alumni, isBirthdayAlumni);
      const message = buildBirthdayMessage(alumni, isBirthdayAlumni);

      const existing = await prisma.notification.findFirst({
        where: {
          user_id: recipient.id,
          type: 'ANNOUNCEMENT',
          title,
          link,
          created_at: {
            gte: dayStart,
            lt: nextDay
          }
        },
        select: { id: true }
      });

      if (existing) {
        continue;
      }

      await notificationService.createUserNotification(recipient.id, {
        type: 'ANNOUNCEMENT',
        title,
        message,
        link
      });
      createdCount += 1;
    }
  }

  if (createdCount > 0) {
    broadcastUpdate('birthday.notifications.created', {
      count: createdCount,
      date: today.toISOString().slice(0, 10)
    });
  }

  return {
    totalBirthdays: todaysBirthdays.length,
    createdCount
  };
}

function startBirthdayNotificationChecker() {
  console.log('Birthday notification checker starting: scanning alumni date_of_birth values on boot');

  sendBirthdayNotifications().then((result) => {
    console.log('Birthday notification check complete:', result);
  }).catch((error) => {
    console.error('Initial birthday notification check failed:', error);
  });

  setInterval(async () => {
    try {
      const result = await sendBirthdayNotifications();
      console.log('Birthday notification check complete:', result);
    } catch (error) {
      console.error('Birthday notification check failed:', error);
    }
  }, 3600000);

  console.log('Birthday notification checker started - checking every hour');
}

module.exports = {
  sendBirthdayNotifications,
  startBirthdayNotificationChecker
};
