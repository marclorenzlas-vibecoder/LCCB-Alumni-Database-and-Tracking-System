const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addSampleEvents() {
  try {
    console.log('Adding sample events...\n');

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calculate dates for upcoming events
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const twoWeeks = new Date(today);
    twoWeeks.setDate(twoWeeks.getDate() + 14);

    // Current Events (Today)
    const currentEvents = [
      {
        name: 'STEM Career Fair 2025',
        description: 'Connect with top tech companies and explore exciting career opportunities in Science, Technology, Engineering, and Mathematics. Representatives from leading Philippine tech firms will be present for on-the-spot interviews.',
        date: today,
        location: 'LCCB Main Gymnasium',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop'
      },
      {
        name: 'Leadership Summit: Empowering Tomorrow\'s Leaders',
        description: 'Join successful alumni and industry leaders as they share insights on effective leadership, entrepreneurship, and making a positive impact in your community. Includes interactive workshops and networking sessions.',
        date: today,
        location: 'Conference Hall, Building A',
        image: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&h=600&fit=crop'
      },
      {
        name: 'Alumni Basketball Tournament Finals',
        description: 'Cheer for your batch as we crown this year\'s basketball champions! The final match promises to be an exciting showdown. Food stalls and raffle draws throughout the day.',
        date: today,
        location: 'LCCB Sports Complex',
        image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop'
      }
    ];

    // Upcoming Events
    const upcomingEvents = [
      {
        name: 'Digital Marketing Workshop for Entrepreneurs',
        description: 'Learn the latest digital marketing strategies and social media techniques to grow your business online. Hands-on training includes SEO, content marketing, Facebook Ads, and Google Analytics. Perfect for startups and small business owners.',
        date: tomorrow,
        location: 'Innovation Lab, Building C',
        image: 'https://images.unsplash.com/photo-1533750516457-a7f992034fec?w=800&h=600&fit=crop'
      },
      {
        name: 'Education Technology Conference 2025',
        description: 'Explore the future of education with EdTech innovations transforming Philippine classrooms. Topics include AI in education, online learning platforms, and gamification. Featuring guest speakers from DepEd and top universities.',
        date: nextWeek,
        location: 'Manila Convention Center',
        image: 'https://images.unsplash.com/photo-1540317580384-e5d43616b9aa?w=800&h=600&fit=crop'
      },
      {
        name: 'Grand Alumni Homecoming 2025',
        description: 'Reconnect with old friends and celebrate school pride! This year\'s homecoming features cultural performances, batch reunions, campus tours, awarding ceremonies, and a special dinner gala. All batches welcome!',
        date: twoWeeks,
        location: 'LCCB Campus Grounds',
        image: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&h=600&fit=crop'
      }
    ];

    // Insert current events
    console.log('Adding current events (today)...');
    for (const event of currentEvents) {
      const created = await prisma.event.create({
        data: event
      });
      console.log(`✓ Added: ${created.name}`);
    }

    // Insert upcoming events
    console.log('\nAdding upcoming events...');
    for (const event of upcomingEvents) {
      const created = await prisma.event.create({
        data: event
      });
      console.log(`✓ Added: ${created.name}`);
    }

    console.log('\n✅ Successfully added 6 sample events (3 current, 3 upcoming)!');
    console.log(`\nEvent dates:`);
    console.log(`- Current events: ${today.toLocaleDateString()}`);
    console.log(`- Upcoming event 1: ${tomorrow.toLocaleDateString()}`);
    console.log(`- Upcoming event 2: ${nextWeek.toLocaleDateString()}`);
    console.log(`- Upcoming event 3: ${twoWeeks.toLocaleDateString()}`);

  } catch (error) {
    console.error('Error adding sample events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleEvents();
