const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addMoreTodayEvents() {
  try {
    console.log('Adding additional today events...\n');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEvents = [
      {
        name: 'Alumni Mentorship Hour',
        description: 'A focused mentoring session where alumni share career advice, job search tips, and practical guidance with fellow graduates and students.',
        date: today,
        location: 'Guidance Center, Room 204',
        image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop'
      },
      {
        name: 'Campus Tech Talk Live',
        description: 'Join a live discussion on emerging tech trends, career paths in software and data, and how alumni are building their careers in tech.',
        date: today,
        location: 'Audio Visual Room 1',
        image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=600&fit=crop'
      },
      {
        name: 'Networking Coffee Meetup',
        description: 'An informal networking meetup for alumni to reconnect, exchange opportunities, and build stronger professional relationships.',
        date: today,
        location: 'Campus Cafe',
        image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=600&fit=crop'
      }
    ];

    for (const event of todayEvents) {
      const created = await prisma.event.create({ data: event });
      console.log(`✓ Added: ${created.name}`);
    }

    console.log(`\n✅ Successfully added ${todayEvents.length} additional today events!`);
    console.log(`Today: ${today.toLocaleDateString()}`);
  } catch (error) {
    console.error('Error adding today events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addMoreTodayEvents();
