const { PrismaClient } = require('@prisma/client');
const notificationService = require('./notificationService');
const { broadcastUpdate } = require('./realtimeService');

const prisma = new PrismaClient();

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
  const birthdays = await prisma.alumni.findMany({
    where: {
      date_of_birth: { not: null }
    },
    select: {
      id: true,
      user_id: true,
      first_name: true,
      last_name: true,
      email: true,
      date_of_birth: true
    }
  });

  const todaysBirthdays = birthdays.filter((alumni) => isBirthdayToday(alumni.date_of_birth, today));
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