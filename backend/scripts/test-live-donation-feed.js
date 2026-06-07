const path = require('path');

const donationRoutes = require(path.join(__dirname, '..', 'src', 'routes', 'donationRoutes'));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function run() {
  const feedBuilder = donationRoutes.buildLiveDonationActivityFeed;

  assert(typeof feedBuilder === 'function', 'Live donation feed builder is not exported');

  const feed = feedBuilder({
    notifications: [],
    donations: [
      {
        id: 101,
        amount: '2500.00',
        date: new Date('2026-05-31T08:15:00Z'),
        purpose: 'Scholarship Fund',
        category: 'Education',
        description: 'Donation submitted through alumni portal',
        alumni: {
          first_name: 'Ana',
          last_name: 'Reyes',
          profile_image: '/uploads/profiles/ana-reyes.jpg'
        }
      }
    ]
  });

  assert(Array.isArray(feed), 'Feed builder did not return an array');
  assert(feed.length === 1, `Expected 1 live donation activity item, got ${feed.length}`);

  const item = feed[0];
  assert(item.senderName === 'Ana Reyes', `Expected donor name to be "Ana Reyes", got "${item.senderName}"`);
  assert(item.senderProfileImage === '/uploads/profiles/ana-reyes.jpg', 'Expected donor profile image to be preserved');
  assert(item.campaignName === 'Scholarship Fund', `Expected campaign name to be "Scholarship Fund", got "${item.campaignName}"`);
  assert(String(item.amountLabel || '').includes('₱') || String(item.amountLabel || '').includes('2500'), 'Expected amount label to be derived from the donation record');
  assert(String(item.title || '').toLowerCase().includes('submitted a donation') || String(item.title || '').toLowerCase().includes('donated'), 'Expected a visible donation activity title');
  assert(item.createdAt, 'Expected a createdAt timestamp');

  console.log('✅ Live donation feed regression passed');
}

try {
  run();
} catch (error) {
  console.error('❌ Live donation feed regression failed');
  console.error(error.message);
  process.exitCode = 1;
}
